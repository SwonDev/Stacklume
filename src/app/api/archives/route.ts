import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, generateId, pageArchives } from "@/lib/db";
import { validateRequest, createArchiveSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

const log = createModuleLogger("api/archives");

// GET — lista archivos del usuario, con filtro opcional por linkId
export async function GET(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.json([]);
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    const rows = await withRetry(
      () => {
        const query = db.select().from(pageArchives);
        if (linkId) {
          return query.where(eq(pageArchives.linkId, linkId));
        }
        return query;
      },
      { operationName: "list page archives" }
    );

    return NextResponse.json(rows);
  } catch (error) {
    log.error({ error }, "Error listing page archives");
    return NextResponse.json({ error: "Error al obtener archivos" }, { status: 500 });
  }
}

// POST — descarga la página en servidor, extrae texto y guarda en DB
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    const validation = validateRequest(createArchiveSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const { linkId, url } = validation.data;

    // Validar URL contra SSRF antes de descargar
    const ssrfCheck = await validateUrlForSSRF(url);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: ssrfCheck.reason ?? "URL no permitida" },
        { status: 422 }
      );
    }

    // Descargar la página desde el servidor
    let html: string;
    try {
      const fetchResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        // Limitar tiempo de espera a 15 segundos
        signal: AbortSignal.timeout(15_000),
      });

      if (!fetchResponse.ok) {
        return NextResponse.json(
          { error: `No se pudo acceder a la URL: HTTP ${fetchResponse.status}` },
          { status: 422 }
        );
      }

      html = await fetchResponse.text();
    } catch (fetchError) {
      log.warn({ fetchError, url }, "Failed to fetch URL for archiving");
      return NextResponse.json(
        { error: "No se pudo descargar la página. Verifica la URL e inténtalo de nuevo." },
        { status: 422 }
      );
    }

    // Extraer título de la página
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch
      ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
      : null;

    // Extraer texto plano preservando estructura de párrafos
    const textContent = html
      // Eliminar bloques completos que no aportan contenido
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, "")
      // Convertir elementos de bloque en dobles saltos de línea ANTES de quitar tags
      .replace(/<\/?(p|div|h[1-6]|li|br|tr|blockquote|article|section|pre|hr)[^>]*>/gi, "\n\n")
      // Quitar todos los tags restantes
      .replace(/<[^>]+>/g, " ")
      // Decodificar entidades HTML habituales
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
      // Limpiar espacios horizontales dentro de cada línea
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      // Normalizar saltos de línea (máx 2 consecutivos = 1 separador de párrafo)
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 500_000); // máximo 500 KB de texto

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const size = Buffer.byteLength(textContent, "utf8");
    const now = new Date();

    const [created] = await withRetry(
      () =>
        db
          .insert(pageArchives)
          .values({
            id: generateId(),
            linkId,
            title: pageTitle ?? undefined,
            textContent,
            archivedAt: now,
            wordCount,
            size,
          })
          .returning(),
      { operationName: "create page archive" }
    );

    log.info({ archiveId: created.id, linkId, wordCount, size }, "Page archived");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error({ error }, "Error creating page archive");
    return NextResponse.json({ error: "Error al archivar página" }, { status: 500 });
  }
}
