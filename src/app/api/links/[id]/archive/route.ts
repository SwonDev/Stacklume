import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, generateId, pageArchives, links } from "@/lib/db";
import { createModuleLogger } from "@/lib/logger";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

const log = createModuleLogger("api/links/[id]/archive");

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET — devuelve el archivo de un enlace específico (si existe)
export async function GET(_request: NextRequest, context: RouteContext) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.json(null);
  const { id } = await context.params;

  try {
    const rows = await withRetry(
      () => db.select().from(pageArchives).where(eq(pageArchives.linkId, id)),
      { operationName: "get archive by linkId" }
    );

    if (rows.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    log.error({ error, linkId: id }, "Error fetching archive for link");
    return NextResponse.json({ error: "Error al obtener archivo" }, { status: 500 });
  }
}

// POST — archiva la página del enlace (descarga, extrae contenido, guarda en DB)
export async function POST(_request: NextRequest, context: RouteContext) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });

  const { id } = await context.params;

  try {
    // Obtener el enlace para tener la URL
    const [link] = await withRetry(
      () => db.select().from(links).where(eq(links.id, id)),
      { operationName: "fetch link for archiving" }
    );

    if (!link) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });
    }

    const url = link.url;

    // Validar URL contra SSRF
    const ssrfCheck = await validateUrlForSSRF(url);
    if (!ssrfCheck.safe) {
      return NextResponse.json(
        { error: ssrfCheck.reason ?? "URL no permitida" },
        { status: 422 }
      );
    }

    // Descargar la página
    let html: string;
    try {
      const fetchResponse = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
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

    // Extraer título
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch
      ? titleMatch[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim()
      : null;

    // Extraer HTML limpio
    const htmlContent = extractCleanHtml(html);

    // Extraer texto plano desde el HTML limpio
    const textContent = htmlContent
      .replace(/<\/?(p|div|h[1-6]|li|br|tr|blockquote|article|section|pre|hr)[^>]*>/gi, "\n\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\n[ \t]+/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 500_000);

    const wordCount = textContent.split(/\s+/).filter(Boolean).length;
    const sizeText = Buffer.byteLength(textContent, "utf8");
    const sizeHtml = Buffer.byteLength(htmlContent, "utf8");
    const size = sizeText + sizeHtml;
    const now = new Date();

    // Eliminar archivo anterior si existe (upsert semántico)
    await withRetry(
      () => db.delete(pageArchives).where(eq(pageArchives.linkId, id)),
      { operationName: "delete previous archive" }
    );

    const [created] = await withRetry(
      () =>
        db
          .insert(pageArchives)
          .values({
            id: generateId(),
            linkId: id,
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

    log.info({ archiveId: created.id, linkId: id, wordCount, size }, "Page archived via link route");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error({ error, linkId: id }, "Error archiving page");
    return NextResponse.json({ error: "Error al archivar página" }, { status: 500 });
  }
}

/**
 * Extrae HTML limpio del contenido de una página para la vista de lectura.
 */
function extractCleanHtml(rawHtml: string): string {
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
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s(on\w+|style|class|data-[\w-]+)="[^"]*"/gi, "")
    .replace(/\s(on\w+|style|class|data-[\w-]+)='[^']*'/gi, "");

  // Intentar extraer contenido principal
  const articleMatch = cleaned.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    cleaned = articleMatch[1];
  } else {
    const mainMatch = cleaned.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
      cleaned = mainMatch[1];
    } else {
      const bodyMatch = cleaned.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
      if (bodyMatch) {
        cleaned = bodyMatch[1];
      }
    }
  }

  const allowedTags = new Set([
    "p", "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "a", "br", "hr",
    "figure", "figcaption", "img", "table", "thead",
    "tbody", "tr", "th", "td", "sup", "sub", "mark",
    "del", "ins", "abbr", "time", "details", "summary",
  ]);

  cleaned = cleaned.replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/?>/g, (match, tagName: string) => {
    const tag = tagName.toLowerCase();
    if (allowedTags.has(tag)) {
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
      if (match.startsWith("</")) return `</${tag}>`;
      if (match.endsWith("/>")) return `<${tag} />`;
      return `<${tag}>`;
    }
    return "";
  });

  return cleaned.replace(/\n{3,}/g, "\n\n").trim().slice(0, 1_000_000);
}
