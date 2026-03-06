import { NextRequest, NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { eq, isNull, and, inArray } from "drizzle-orm";
import { createModuleLogger } from "@/lib/logger";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";

const log = createModuleLogger("api/links/health-check");

// Estado de salud posible para un enlace
type HealthStatus = "ok" | "redirect" | "broken" | "timeout" | "error";

interface HealthResult {
  linkId: string;
  url: string;
  title: string | null;
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  error?: string;
}

// Timeout por petici\u00F3n individual: 10 segundos
const REQUEST_TIMEOUT_MS = 10_000;

// M\u00E1ximo de enlaces verificables en una sola petici\u00F3n
const MAX_LINKS_PER_REQUEST = 200;

// Tama\u00F1o de cada lote de peticiones concurrentes
const BATCH_SIZE = 5;

/**
 * Verifica la salud de una URL individual.
 * Incluye protecci\u00F3n SSRF para evitar peticiones a redes internas.
 */
async function checkUrlHealth(url: string): Promise<{
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  // Protecci\u00F3n SSRF: validar la URL antes de realizar la petici\u00F3n
  const ssrfValidation = await validateUrlForSSRF(url);
  if (!ssrfValidation.safe) {
    return {
      status: "error",
      responseTimeMs: Date.now() - startTime,
      error: `Protecci\u00F3n SSRF bloque\u00F3 la petici\u00F3n: ${ssrfValidation.reason}`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual", // No seguir redirecciones autom\u00E1ticamente
      headers: {
        "User-Agent": "Stacklume-HealthCheck/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    if (response.status >= 200 && response.status < 300) {
      return { status: "ok", statusCode: response.status, responseTimeMs };
    }

    if (response.status >= 300 && response.status < 400) {
      return {
        status: "redirect",
        statusCode: response.status,
        redirectUrl: response.headers.get("location") || undefined,
        responseTimeMs,
      };
    }

    // 4xx o 5xx
    return { status: "broken", statusCode: response.status, responseTimeMs };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "timeout",
        responseTimeMs,
        error: `Tiempo de espera agotado despu\u00E9s de ${REQUEST_TIMEOUT_MS}ms`,
      };
    }

    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    return { status: "broken", responseTimeMs, error: errorMessage };
  }
}

/**
 * POST /api/links/health-check
 *
 * Verificaci\u00F3n de salud por lotes para enlaces.
 * Acepta un body opcional: { linkIds?: string[] }.
 * Si no se proporcionan linkIds, verifica todos los enlaces activos.
 *
 * Respuesta:
 * - results: Array de resultados individuales
 * - summary: Resumen estad\u00EDstico (total, ok, redirect, broken, timeout, error)
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — usa límite "external" (más restrictivo: 30 req/min)
    const identifier = getClientIdentifier(request);
    const rateLimit = await checkRateLimit(identifier, "external");
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Espera antes de verificar más enlaces." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const body = await request.json().catch(() => ({}));
    const linkIds = body.linkIds as string[] | undefined;

    // Limitar máximo de enlaces por verificación a 50
    if (linkIds && Array.isArray(linkIds) && linkIds.length > 50) {
      return NextResponse.json(
        { error: "Máximo 50 enlaces por verificación" },
        { status: 400 }
      );
    }

    // Obtener enlaces a verificar
    let linksToCheck;
    if (linkIds && Array.isArray(linkIds) && linkIds.length > 0) {
      // Limitar la cantidad de IDs recibidos
      const limitedIds = linkIds.slice(0, MAX_LINKS_PER_REQUEST);

      linksToCheck = await withRetry(
        () =>
          db
            .select({ id: links.id, url: links.url, title: links.title })
            .from(links)
            .where(and(isNull(links.deletedAt), inArray(links.id, limitedIds))),
        { operationName: "fetch links for health check" }
      );
    } else {
      linksToCheck = await withRetry(
        () =>
          db
            .select({ id: links.id, url: links.url, title: links.title })
            .from(links)
            .where(isNull(links.deletedAt)),
        { operationName: "fetch all links for health check" }
      );

      // Limitar si hay demasiados enlaces
      if (linksToCheck.length > MAX_LINKS_PER_REQUEST) {
        linksToCheck = linksToCheck.slice(0, MAX_LINKS_PER_REQUEST);
      }
    }

    if (linksToCheck.length === 0) {
      return NextResponse.json({
        results: [],
        summary: { total: 0, ok: 0, redirect: 0, broken: 0, timeout: 0, error: 0 },
        message: "No hay enlaces para verificar",
      });
    }

    log.info(
      { linkCount: linksToCheck.length },
      `Iniciando verificaci\u00F3n de salud de ${linksToCheck.length} enlaces`
    );

    // Procesar en lotes para no saturar la red
    const results: HealthResult[] = [];

    for (let i = 0; i < linksToCheck.length; i += BATCH_SIZE) {
      const batch = linksToCheck.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (link) => {
          const health = await checkUrlHealth(link.url);

          // Actualizar el estado en la base de datos
          await withRetry(
            () =>
              db
                .update(links)
                .set({
                  healthStatus: health.status,
                  lastCheckedAt: new Date(),
                  updatedAt: new Date(),
                })
                .where(eq(links.id, link.id)),
            { operationName: `update health for ${link.id}` }
          );

          return {
            linkId: link.id,
            url: link.url,
            title: link.title,
            status: health.status,
            statusCode: health.statusCode,
            redirectUrl: health.redirectUrl,
            responseTimeMs: health.responseTimeMs,
            error: health.error,
          };
        })
      );
      results.push(...batchResults);
    }

    const summary = {
      total: results.length,
      ok: results.filter((r) => r.status === "ok").length,
      redirect: results.filter((r) => r.status === "redirect").length,
      broken: results.filter((r) => r.status === "broken").length,
      timeout: results.filter((r) => r.status === "timeout").length,
      error: results.filter((r) => r.status === "error").length,
    };

    log.info(
      { summary },
      `Verificaci\u00F3n completada: ${summary.ok} ok, ${summary.broken} rotos, ${summary.timeout} timeout`
    );

    return NextResponse.json({ results, summary });
  } catch (error) {
    log.error({ error }, "Error en la verificaci\u00F3n de salud de enlaces");
    return NextResponse.json(
      { error: "Error al verificar enlaces" },
      { status: 500 }
    );
  }
}
