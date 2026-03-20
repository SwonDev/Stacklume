import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, generateId, pageArchives } from "@/lib/db";
import { validateRequest, createArchiveSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

const log = createModuleLogger("api/archives");

/**
 * Extrae HTML limpio del contenido de una página para la vista de lectura.
 * Intenta encontrar el contenido principal (<article>, <main>, o <body>),
 * elimina elementos no deseados y conserva la estructura semántica.
 */
function extractCleanHtml(rawHtml: string): string {
  // Eliminar bloques que nunca aportan contenido de lectura
  let cleaned = rawHtml
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, "")
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, "")
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, "")
    .replace(/<aside\b[^>]*>[\s\S]*?<\/aside>/gi, "")
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "")
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, "")
    // Eliminar comentarios HTML
    .replace(/<!--[\s\S]*?-->/g, "")
    // Eliminar atributos peligrosos (on*, style, class, data-*)
    .replace(/\s(on\w+|style|class|data-[\w-]+)="[^"]*"/gi, "")
    .replace(/\s(on\w+|style|class|data-[\w-]+)='[^']*'/gi, "");

  // Intentar extraer el contenido principal: <article> > <main> > <body>
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      cleaned = mainMatch[1];
    } else {
      // Último recurso: extraer el body
      const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        cleaned = bodyMatch[1];
      }
    }
  }

  // Conservar solo tags semánticos seguros para la vista de lectura
  const allowedTags = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "a", "br", "hr",
    "figure", "figcaption", "img", "table", "thead",
    "tbody", "tr", "th", "td", "sup", "sub", "mark",
    "del", "ins", "abbr", "time", "details", "summary",
  ]);

  // Eliminar tags no permitidos pero conservar su contenido
  cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (allowedTags.has(tag)) {
      // Para <a>, conservar solo href; para <img>, conservar src y alt
      if (tag === "a") {
        const hrefMatch = match.match(/href="([^"]*)"/i) || match.match(/href='([^']*)'/i);
        if (match.startsWith("</")) return "</a>";
        return hrefMatch ? `<a href="${hrefMatch[1]}" target="_blank" rel="noopener noreferrer">` : "<a>";
      }
      if (tag === "img") {
        const srcMatch = match.match(/src="([^"]*)"/i) || match.match(/src='([^']*)'/i);
        const altMatch = match.match(/alt="([^"]*)"/i) || match.match(/alt='([^']*)'/i);
        if (!srcMatch) return "";
        return `<img src="${srcMatch[1]}" alt="${altMatch?.[1] ?? ""}" loading="lazy" />`;
      }
      // Para el resto, devolver tag limpio sin atributos
      if (match.startsWith("</")) return `</${tag}>`;
      if (match.endsWith("/>")) return `<${tag} />`;
      return `<${tag}>`;
    }
    // Tag no permitido: eliminar pero conservar contenido
    return "";
  });

  // Limpiar espacios excesivos entre tags
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 1_000_000); // máximo ~1 MB de HTML

  return cleaned;
}

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

    // ── Extraer HTML limpio para vista de lectura ──
    const htmlContent = extractCleanHtml(html);

    // Extraer texto plano preservando estructura de párrafos
    const textContent = htmlContent
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
    const sizeText = Buffer.byteLength(textContent, "utf8");
    const sizeHtml = Buffer.byteLength(htmlContent, "utf8");
    const size = sizeText + sizeHtml;
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
            htmlContent: htmlContent || undefined,
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
