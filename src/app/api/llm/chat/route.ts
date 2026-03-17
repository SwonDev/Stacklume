import { NextRequest, NextResponse } from "next/server";
import { isNull, like, and, or, eq } from "drizzle-orm";
import { db, links, categories, tags, linkTags, withRetry, generateId } from "@/lib/db";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  // llama-server puede devolver arguments como string o como objeto ya parseado
  function: { name: string; arguments: string | Record<string, unknown> };
}

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface LlmMessage {
  role: string;
  content: string | ContentPart[] | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  reasoning_content?: string;
}

type JobResult =
  | { status: "pending" }
  | { status: "done"; content: string; reasoningContent?: string }
  | { status: "error"; error: string };

interface SearchResult {
  title: string;
  url: string;
  description: string;
}

// ─── Estado global (sobrevive HMR) ───────────────────────────────────────────

const g = globalThis as unknown as {
  __llmJobs?: Map<string, JobResult>;
  __llmLastSearch?: SearchResult[];
};
if (!g.__llmJobs) g.__llmJobs = new Map();
const jobs = g.__llmJobs;

// ─── Utilidades ───────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function cleanLlmText(raw: string): string {
  // Eliminar bloques de thinking y tool_call (modelos que los emiten en content)
  let t = raw
    .replace(/<think>[\s\S]*?<\/think>\n?/g, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>\n?/gi, "")
    .replace(/<function=[^>]*>[\s\S]*?<\/function>\n?/gi, "")
    .trim();
  t = t.replace(/```[\s\S]*?```/g, "").replace(/``[\s\S]*?``/g, "");
  t = t
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\s+/g, "• ")
    .replace(/`([^`]+)`/g, "$1");
  const lines = t.split("\n");
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { deduped.push(line); continue; }
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    deduped.push(line);
  }
  const finalText = deduped.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  // Detectar spam de caracteres repetidos (emoji loops del modelo pequeño).
  // Si hay < 3 palabras reales y el texto es largo, es spam.
  const alphanumWordCount = (finalText.match(/[a-zA-ZáéíóúñÁÉÍÓÚÑ]{3,}/g) ?? []).length;
  if (alphanumWordCount < 3 && finalText.length > 20) {
    return "No entendí del todo esa pregunta 😅 Puedes decirme: 'busca [tema]' para buscar en la web, 'guarda URL' para añadir un enlace, o pregúntame sobre cómo funciona Stacklume.";
  }
  return finalText || "No pude generar una respuesta. Intenta reformular tu pregunta.";
}

// ─── Ejecución de herramientas ────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    // ── web_search ──────────────────────────────────────────────────────────
    if (name === "web_search") {
      const query = String(args.query || "").trim();
      if (!query) return JSON.stringify({ error: "query vacía" });

      // DuckDuckGo requiere Referer para no devolver página de challenge (202).
      // Accept-Language garantiza resultados más relevantes al idioma del usuario.
      const ddgHeaders = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://duckduckgo.com/",
      };
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

      let res = await fetch(ddgUrl, { headers: ddgHeaders, signal: AbortSignal.timeout(12_000) });
      // 202 = challenge (rate-limit / bot detection). Reintentar hasta 2 veces con backoff.
      for (const wait of [3000, 8000]) {
        if (res.status !== 202) break;
        await new Promise((r) => setTimeout(r, wait));
        res = await fetch(ddgUrl, { headers: ddgHeaders, signal: AbortSignal.timeout(12_000) });
      }
      if (!res.ok || res.status === 202)
        return JSON.stringify({ error: `DuckDuckGo no disponible (${res.status})` });

      const html = await res.text();
      const titleRe =
        /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const snippetRe =
        /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

      const rawLinks: Array<{ href: string; title: string }> = [];
      const snippets: string[] = [];

      let m: RegExpExecArray | null;
      // Recoger más candidatos (8) para poder descartar ads y quedarnos con 5 orgánicos
      while ((m = titleRe.exec(html)) !== null && rawLinks.length < 8)
        rawLinks.push({
          href: m[1],
          title: m[2].replace(/<[^>]+>/g, "").trim(),
        });
      while ((m = snippetRe.exec(html)) !== null && snippets.length < 8)
        snippets.push(
          m[1]
            .replace(/<[^>]+>/g, "")
            .trim()
            .slice(0, 200)
        );

      const results: SearchResult[] = rawLinks
        .map((r, i) => {
          let url = r.href;
          // Filtrar anuncios: DDG usa /y.js? como tracker de clicks en ads
          if (url.includes("/y.js?")) return null;
          const uddg = url.match(/uddg=([^&]+)/)?.[1];
          if (uddg) url = decodeURIComponent(uddg);
          else if (url.startsWith("//")) url = "https:" + url;
          const title = r.title
            .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
            .replace(/&#x27;/g, "'").replace(/&#39;/g, "'");
          return { title, url, description: snippets[i] ?? "" };
        })
        .filter((r): r is SearchResult =>
          r !== null && r.url.startsWith("http") && !r.url.includes("duckduckgo.com")
        );

      if (results.length === 0)
        return JSON.stringify({
          message: `No hay resultados para "${query}". Prueba con otros términos.`,
        });

      // Filtro de relevancia: DuckDuckGo a veces devuelve sitios genéricos (Bing, YouTube)
      // cuando no encuentra resultados reales. Verificar que al menos un resultado
      // contiene alguna palabra clave de la consulta.
      const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      if (queryWords.length > 0) {
        const hasRelevant = results.some((r) => {
          const text = `${r.title} ${r.url} ${r.description}`.toLowerCase();
          return queryWords.some((word) => text.includes(word));
        });
        if (!hasRelevant)
          return JSON.stringify({
            message: `No encontré resultados relevantes para "${query}". Prueba con otros términos.`,
          });
      }

      // Guardar para posibles referencias futuras ("inclúyelos")
      g.__llmLastSearch = results.slice(0, 5);
      return JSON.stringify({ results: results.slice(0, 5) });
    }

    // ── save_link ───────────────────────────────────────────────────────────
    if (name === "save_link") {
      let url = String(args.url || "").trim().replace(/\/+$/, "");
      if (!url.includes("://")) url = "https://" + url;
      if (!url.startsWith("http"))
        return JSON.stringify({ error: "URL inválida" });
      const title = String(args.title || url).trim();
      try {
        const now = new Date();
        const [created] = await withRetry(
          () =>
            db
              .insert(links)
              .values({
                id: generateId(),
                url,
                title,
                description: null,
                categoryId: null,
                isFavorite: false,
                source: "manual" as const,
                createdAt: now,
                updatedAt: now,
              })
              .returning({ id: links.id, url: links.url, title: links.title }),
          { operationName: "llm save_link" }
        );
        return JSON.stringify({
          success: true,
          added: { title: created.title, url: created.url },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : "";
        // Distinguir error de duplicado de otros errores (DB init, constraint, etc.)
        const isDuplicate = msg.includes("unique") || msg.includes("duplicate") || msg.includes("already exists");
        return JSON.stringify({
          error: isDuplicate
            ? `"${url}" ya existe en tu biblioteca.`
            : `No se pudo guardar "${url}": ${err instanceof Error ? err.message : "error desconocido"}`,
          isDuplicate,
        });
      }
    }

    // ── search_library ──────────────────────────────────────────────────────
    if (name === "search_library") {
      const query = norm(String(args.query || "").trim());
      if (!query) return JSON.stringify({ message: "Query vacía." });

      const pattern = `%${query}%`;
      const allCats = await withRetry(
        () =>
          db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(isNull(categories.deletedAt)),
        { operationName: "llm search cats" }
      );
      const catMap = new Map(allCats.map((c) => [c.id, c.name]));

      // Buscar por título/URL
      const byContent = await withRetry(
        () =>
          db
            .select({
              title: links.title,
              url: links.url,
              categoryId: links.categoryId,
            })
            .from(links)
            .where(
              and(
                isNull(links.deletedAt),
                or(like(links.title, pattern), like(links.url, pattern))
              )
            )
            .limit(10),
        { operationName: "llm search_library" }
      );

      // Buscar por nombre de categoría
      const byCat: typeof byContent = [];
      for (const [catId, catName] of catMap.entries()) {
        if (norm(catName).includes(query) || query.includes(norm(catName))) {
          const catLinks = await withRetry(
            () =>
              db
                .select({
                  title: links.title,
                  url: links.url,
                  categoryId: links.categoryId,
                })
                .from(links)
                .where(
                  and(isNull(links.deletedAt), eq(links.categoryId, catId))
                )
                .limit(10),
            { operationName: "llm search_library_cat" }
          );
          byCat.push(...catLinks);
        }
      }

      // Buscar por nombre de etiqueta (tag)
      const allTagsDb = await withRetry(
        () =>
          db
            .select({ id: tags.id, name: tags.name })
            .from(tags)
            .where(isNull(tags.deletedAt)),
        { operationName: "llm search tags" }
      );
      const byTag: typeof byContent = [];
      for (const tag of allTagsDb) {
        if (norm(tag.name).includes(query) || query.includes(norm(tag.name))) {
          const tagLinks = await withRetry(
            () =>
              db
                .select({
                  title: links.title,
                  url: links.url,
                  categoryId: links.categoryId,
                })
                .from(links)
                .innerJoin(linkTags, eq(links.id, linkTags.linkId))
                .where(
                  and(isNull(links.deletedAt), eq(linkTags.tagId, tag.id))
                )
                .limit(10),
            { operationName: "llm search_library_tag" }
          );
          byTag.push(...tagLinks);
        }
      }

      const unique = new Map<string, (typeof byContent)[0]>();
      for (const l of [...byContent, ...byCat, ...byTag]) unique.set(l.url, l);
      const results = [...unique.values()].slice(0, 10);

      if (results.length === 0)
        return JSON.stringify({
          message: `No encontré enlaces sobre "${args.query}" en tu biblioteca.`,
        });

      const formatted = results
        .map((l, i) => {
          const cat = l.categoryId
            ? (catMap.get(l.categoryId) ?? "Sin categoría")
            : "Sin categoría";
          return `${i + 1}. ${l.title ?? l.url} [${cat}]\n   ${l.url}`;
        })
        .join("\n\n");

      return JSON.stringify({
        results: results.map((l) => ({ title: l.title ?? l.url, url: l.url })),
        formatted,
        count: results.length,
      });
    }

    // ── delete_link ──────────────────────────────────────────────────────────
    if (name === "delete_link") {
      let url = String(args.url || "").trim().replace(/\/+$/, "");
      if (!url.includes("://")) url = "https://" + url;
      if (!url.startsWith("http")) return JSON.stringify({ error: "URL inválida" });
      try {
        const found = await withRetry(
          () =>
            db
              .select({ id: links.id, title: links.title, url: links.url })
              .from(links)
              .where(and(isNull(links.deletedAt), eq(links.url, url)))
              .limit(1),
          { operationName: "llm delete_link find" }
        );
        if (!found.length)
          return JSON.stringify({ error: `No encontré "${url}" en tu biblioteca.` });
        const [link] = found;
        await withRetry(
          () => db.update(links).set({ deletedAt: new Date() }).where(eq(links.id, link.id)),
          { operationName: "llm delete_link" }
        );
        return JSON.stringify({ success: true, deleted: { title: link.title ?? url, url: link.url } });
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Error al eliminar" });
      }
    }

    // ── mark_favorite ─────────────────────────────────────────────────────────
    if (name === "mark_favorite") {
      let url = String(args.url || "").trim().replace(/\/+$/, "");
      if (!url.includes("://")) url = "https://" + url;
      if (!url.startsWith("http")) return JSON.stringify({ error: "URL inválida" });
      const favorite = args.favorite !== false;
      try {
        const found = await withRetry(
          () =>
            db
              .select({ id: links.id, title: links.title })
              .from(links)
              .where(and(isNull(links.deletedAt), eq(links.url, url)))
              .limit(1),
          { operationName: "llm mark_favorite find" }
        );
        if (!found.length)
          return JSON.stringify({ error: `No encontré "${url}" en tu biblioteca.` });
        await withRetry(
          () =>
            db
              .update(links)
              .set({ isFavorite: favorite, updatedAt: new Date() })
              .where(eq(links.id, found[0].id)),
          { operationName: "llm mark_favorite" }
        );
        return JSON.stringify({ success: true, title: found[0].title ?? url, url, isFavorite: favorite });
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Error" });
      }
    }

    // ── move_to_category ──────────────────────────────────────────────────────
    if (name === "move_to_category") {
      let url = String(args.url || "").trim().replace(/\/+$/, "");
      if (!url.includes("://")) url = "https://" + url;
      if (!url.startsWith("http")) return JSON.stringify({ error: "URL inválida" });
      const catQuery = norm(String(args.category || "").trim());
      if (!catQuery) return JSON.stringify({ error: "Categoría no especificada" });
      try {
        const allCats = await withRetry(
          () =>
            db
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(isNull(categories.deletedAt)),
          { operationName: "llm move cats" }
        );
        const cat = allCats.find(
          (c) =>
            norm(c.name) === catQuery ||
            norm(c.name).includes(catQuery) ||
            catQuery.includes(norm(c.name))
        );
        if (!cat)
          return JSON.stringify({
            error: `No encontré la categoría "${args.category}". Disponibles: ${allCats.map((c) => c.name).join(", ")}`,
          });
        const found = await withRetry(
          () =>
            db
              .select({ id: links.id, title: links.title })
              .from(links)
              .where(and(isNull(links.deletedAt), eq(links.url, url)))
              .limit(1),
          { operationName: "llm move link find" }
        );
        if (!found.length)
          return JSON.stringify({ error: `No encontré "${url}" en tu biblioteca.` });
        await withRetry(
          () =>
            db
              .update(links)
              .set({ categoryId: cat.id, updatedAt: new Date() })
              .where(eq(links.id, found[0].id)),
          { operationName: "llm move_to_category" }
        );
        return JSON.stringify({ success: true, title: found[0].title ?? url, url, category: cat.name });
      } catch (err) {
        return JSON.stringify({ error: err instanceof Error ? err.message : "Error" });
      }
    }

    return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "Error ejecutando herramienta",
    });
  }
}

// ─── Resumen de biblioteca ────────────────────────────────────────────────────

async function loadLibrary(): Promise<string> {
  try {
    const [allLinks, allCats, allTags] = await Promise.all([
      withRetry(
        () =>
          db
            .select({
              title: links.title,
              url: links.url,
              categoryId: links.categoryId,
            })
            .from(links)
            .where(isNull(links.deletedAt)),
        { operationName: "llm load links" }
      ),
      withRetry(
        () =>
          db
            .select({ id: categories.id, name: categories.name })
            .from(categories)
            .where(isNull(categories.deletedAt)),
        { operationName: "llm load cats" }
      ),
      withRetry(
        () =>
          db.select({ name: tags.name }).from(tags).where(isNull(tags.deletedAt)),
        { operationName: "llm load tags" }
      ),
    ]);

    const catMap = new Map(allCats.map((c) => [c.id, c.name]));
    const total = allLinks.length;
    if (total === 0) return "Biblioteca vacía.";

    const catCounts = new Map<string, number>();
    for (const l of allLinks) {
      const name = l.categoryId
        ? (catMap.get(l.categoryId) ?? "Sin categoría")
        : "Sin categoría";
      catCounts.set(name, (catCounts.get(name) ?? 0) + 1);
    }
    const catSummary = [...catCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([n, c]) => `${n}(${c})`)
      .join(", ");
    const sample = allLinks
      .slice(-20)
      .reverse()
      .map(
        (l) =>
          `- ${l.title ?? l.url} [${l.categoryId ? (catMap.get(l.categoryId) ?? "Sin categoría") : "Sin categoría"}]`
      );
    const parts = [
      `Total: ${total} enlaces, ${catMap.size} categorías.`,
      `Categorías: ${catSummary}`,
      `\nÚltimos añadidos:`,
      sample.join("\n"),
    ];
    if (allTags.length > 0)
      parts.push(`\nEtiquetas: ${allTags.map((t) => t.name).join(", ")}`);
    return parts.join("\n");
  } catch {
    return "Error cargando biblioteca.";
  }
}

// ─── Resumen compacto para system prompt ──────────────────────────────────────
// Solo totales y nombres — nunca links individuales.
// Así el LLM no "adivina" desde datos parciales y usa search_library correctamente.

async function loadLibrarySummary(): Promise<string> {
  try {
    const [countRes, allCats, allTags] = await Promise.all([
      withRetry(
        () => db.select({ id: links.id }).from(links).where(isNull(links.deletedAt)),
        { operationName: "llm summary count" }
      ),
      withRetry(
        () => db.select({ name: categories.name }).from(categories).where(isNull(categories.deletedAt)),
        { operationName: "llm summary cats" }
      ),
      withRetry(
        () => db.select({ name: tags.name }).from(tags).where(isNull(tags.deletedAt)),
        { operationName: "llm summary tags" }
      ),
    ]);
    const total = countRes.length;
    if (total === 0) return "Biblioteca vacía.";
    const parts = [`${total} enlaces guardados.`];
    if (allCats.length > 0)
      parts.push(`Categorías (${allCats.length}): ${allCats.map(c => c.name).join(", ")}.`);
    if (allTags.length > 0)
      parts.push(`Etiquetas: ${allTags.map(t => t.name).slice(0, 15).join(", ")}.`);
    parts.push("Usa search_library(query) para buscar enlaces concretos.");
    return parts.join(" ");
  } catch {
    return "Biblioteca disponible (usa search_library para consultar).";
  }
}

// ─── Lógica principal ────────────────────────────────────────────────────────
//
// Arquitectura: 3 fast-paths mínimos → todo lo demás pasa por el LLM agéntico.
// El modelo razona autónomamente y decide qué herramientas usar (hasta 5 rondas).

async function runLlmJob(
  jobId: string,
  llamaPort: string,
  userMessage: string,
  history: ConversationMessage[],
  enableThinking = false,
  imageBase64?: string
): Promise<void> {
  const llamaUrl = `http://127.0.0.1:${llamaPort}/v1/chat/completions`;
  // Modo visión: cuando hay imagen adjunta, el modelo solo debe describir/analizar.
  // No pasar herramientas — el modelo pequeño no puede razonar sobre imagen Y decidir
  // cuándo no usar herramientas simultáneamente, lo que provoca tool calls alucinados.
  const hasImage = !!imageBase64;

  try {
    const msgNorm = norm(userMessage);
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
    const hasRecentSearch = (g.__llmLastSearch?.length ?? 0) > 0;

    // ── Fast-path A: URL sola → guardar directamente ──────────────────────────
    // "https://astro.build" sin texto adicional → intención clara de guardar
    const messageIsJustUrl =
      !hasImage &&
      urlMatch !== null &&
      userMessage.replace(urlMatch[0], "").replace(/[!?.,¡¿\s]/g, "").length < 8;

    if (messageIsJustUrl) {
      const url = urlMatch[0].replace(/[.,;)]+$/, "");
      let title = url;
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace(/^www\./, "");
        const pathTitle = parsed.pathname
          .replace(/\/$/, "")
          .split("/")
          .filter(Boolean)
          .join(" / ")
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .slice(0, 60);
        title = pathTitle ? `${hostname} — ${pathTitle}` : hostname;
      } catch { /* usar url como título */ }
      const res = await executeTool("save_link", { url, title });
      const data = JSON.parse(res) as {
        success?: boolean;
        added?: { title: string; url: string };
        error?: string;
        isDuplicate?: boolean;
      };
      if (data.success && data.added) {
        jobs.set(jobId, {
          status: "done",
          content: `✅ Añadido a tu biblioteca:\n${data.added.title}\n${data.added.url}`,
        });
      } else if (data.isDuplicate || data.error?.includes("ya existe")) {
        jobs.set(jobId, { status: "done", content: `ℹ️ Ya existía en tu biblioteca: ${url}` });
      } else {
        jobs.set(jobId, {
          status: "done",
          content: `⚠️ No se pudo añadir: ${data.error ?? "error desconocido"}`,
        });
      }
      return;
    }

    // ── Fast-path B: Añadir resultados de búsqueda previa ─────────────────────
    // "inclúyelos", "añade los 3 primeros", "guárdalos todos", "guarda el 2"
    const isHowToQuestion =
      /^como (importo|exporto|uso|configuro|instalo|creo|hago|cambio|elimino|borro|edito|accedo|activo|desactivo|personalizo|actualizo)\b/.test(msgNorm) ||
      /^como (puedo |podria |se puede |se |podemos )?(anadir|agregar|guardar|importar|exportar|usar|crear|instalar|configurar|editar|eliminar|borrar)\b/.test(msgNorm) ||
      /^how (to|do i|can i) (import|export|use|configure|install|create|delete|add|edit|access|enable|disable|update)\b/.test(msgNorm);
    const wantsAdd =
      !isHowToQuestion &&
      (
        /\banade(?!s\b)|\banadir\b/i.test(msgNorm) ||
        /guarda(?!d|r|n|s\b)|\bguardar\b|\bguarde[s]?\b|\bguardar[ao][s]?\b|agrega(?!d)|add link|save link|\bpon\b|incluy/i.test(msgNorm) ||
        /^\s*(save|add|bookmark)\s+\S/i.test(userMessage)
      );
    const wantsAddPrev =
      !hasImage && wantsAdd && !urlMatch && hasRecentSearch &&
      (
        /\b(todos?|esos?|estos?|los anteriores?|los de (arriba|antes))\b/i.test(msgNorm) ||
        /incluy|añadelos?|guardalos?|agrega(los?)?/i.test(msgNorm) ||
        /\blos primeros?\b|\bel primer(o)?\b|\b\d+\s+primeros?\b/i.test(msgNorm) ||
        // "el 1", "el 2" ... "el 5" (número directo, no solo ordinales en letras)
        /\bel [1-5]\b/i.test(msgNorm) ||
        /\bel (segundo|tercero|cuarto|quinto|2|3|4|5)(\s*[.°]?)?\b/i.test(msgNorm) ||
        /\bthe (second|third|fourth|fifth|2nd|3rd|4th|5th|first|1st)\b/i.test(msgNorm) ||
        /\bese\b|\baquel\b|\bese link\b|\bese resultado\b/i.test(msgNorm)
      );

    if (wantsAddPrev && g.__llmLastSearch?.length) {
      const ordinalMap: Record<string, number> = {
        segundo: 2, tercero: 3, cuarto: 4, quinto: 5,
        second: 2, third: 3, fourth: 4, fifth: 5,
        "2nd": 2, "3rd": 3, "4th": 4, "5th": 5,
      };
      const ordinalMatch =
        msgNorm.match(/\bel (segundo|tercero|cuarto|quinto|second|third|fourth|fifth)\b/i) ||
        userMessage.match(/the (second|third|fourth|fifth|2nd|3rd|4th|5th)\b/i);
      const directIdxMatch = !ordinalMatch ? msgNorm.match(/\bel (\d)\b/) : null;
      const specificIdx = ordinalMatch
        ? (ordinalMap[ordinalMatch[1].toLowerCase()] ?? null)
        : directIdxMatch
        ? Math.min(parseInt(directIdxMatch[1]), 5)
        : null;
      const numMatch = userMessage.match(/(\d+)/);
      const allOf = /todos|todas|all/i.test(userMessage);
      const count = specificIdx !== null
        ? 1
        : allOf
        ? g.__llmLastSearch.length
        : numMatch
        ? Math.min(parseInt(numMatch[1]), 5)
        : 3;
      const startIdx = specificIdx !== null ? specificIdx - 1 : 0;
      const prevResults = g.__llmLastSearch.slice(startIdx, startIdx + count);
      const linkList = prevResults
        .map((r, i) => `${startIdx + i + 1}. ${r.title}\n   ${r.url}`)
        .join("\n\n");
      const added: string[] = [];
      const skipped: string[] = [];
      for (const r of prevResults) {
        const res = await executeTool("save_link", { url: r.url, title: r.title });
        const parsed = JSON.parse(res) as {
          success?: boolean;
          added?: { title: string; url: string };
          error?: string;
          isDuplicate?: boolean;
        };
        if (parsed.success && parsed.added) added.push(parsed.added.title);
        else skipped.push(r.title);
      }
      g.__llmLastSearch = [];
      let reply = `Aquí están los enlaces:\n\n${linkList}`;
      if (added.length > 0)
        reply += `\n\n✅ Añadidos a tu biblioteca (${added.length}): ${added.join(", ")}`;
      if (skipped.length > 0)
        reply += `\n⚠️ Ya estaban en tu biblioteca: ${skipped.join(", ")}`;
      jobs.set(jobId, { status: "done", content: reply });
      return;
    }

    // ── Modo visión: saltar guards de texto y pasar directo al LLM ───────────
    // Cuando hay imagen, no tiene sentido evaluar intenciones de texto ni usar herramientas.
    // El modelo describe la imagen. Cualquier acción (guardar, buscar) se hace en el siguiente turno.
    if (hasImage) {
      const visionSystemPrompt = `Eres Stacklume AI, asistente visual inteligente. El usuario ha adjuntado una imagen.

INSTRUCCIONES DE VISIÓN:
• Analiza la imagen con detalle: personas, objetos, colores, texto visible, contexto, escena
• Responde directamente a lo que el usuario pregunta sobre la imagen
• Sé descriptivo y preciso
• Responde en español, texto claro y natural — sin asteriscos ni markdown
• NO inventes URLs, NO guardes enlaces, NO uses herramientas
• Si el usuario pide guardar algo, indícale que lo haga en el siguiente mensaje`;

      const visionMessages: LlmMessage[] = [
        { role: "system", content: visionSystemPrompt },
        ...history
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-6)
          .map((m) => ({ role: m.role as string, content: m.content })),
        {
          role: "user",
          content: imageBase64
            ? [
                { type: "text" as const, text: userMessage.trim() || "Describe esta imagen" },
                { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
              ]
            : userMessage,
        },
      ];

      // VL non-thinking: temp=0.7, top_k desactivado, presence_penalty=1.5
      // VL thinking:     temp=0.6, top_k=20, presence_penalty=0.0 (razonamiento preciso sobre imagen)
      const visionParams = enableThinking
        ? { temperature: 0.6, top_k: 20, top_p: 0.95, min_p: 0, presence_penalty: 0.0, max_tokens: 2048 }
        : { temperature: 0.7, top_k:  0, top_p: 0.8,  min_p: 0, presence_penalty: 1.5, max_tokens: 1024 };

      const resp = await fetch(llamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          messages: visionMessages,
          stream: false,
          ...visionParams,
          chat_template_kwargs: {
            enable_thinking: enableThinking,
            ...(enableThinking ? {} : { thinking_budget: 0 }),
          },
          ...(enableThinking ? { reasoning_format: "deepseek" } : {}),
        }),
        signal: AbortSignal.timeout(120_000),
      });

      if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        choices?: Array<{ message?: LlmMessage }>;
        error?: string;
      };
      if (data.error) throw new Error(String(data.error));

      const msg = data.choices?.[0]?.message;
      const rawContent = Array.isArray(msg?.content)
        ? (msg.content as ContentPart[]).filter((p) => p.type === "text").map((p) => (p as { type: "text"; text: string }).text).join("\n")
        : (msg?.content ?? "");

      const rawReasoning = msg?.reasoning_content?.trim();
      let content = cleanLlmText(rawContent);
      if (content.trim().length < 5)
        content = "No pude analizar la imagen. Asegúrate de que el soporte de visión esté activo (mmproj descargado) y prueba con thinking activado.";

      jobs.set(jobId, { status: "done", content, reasoningContent: rawReasoning || undefined });
      return;
    }

    // ── Fast-path C: Recomendación sobre resultados recientes ─────────────────
    // "cuál de esos me recomiendas?", "cuál es mejor?", "which one should I use?"
    const isRecommendQuery =
      !hasImage &&
      hasRecentSearch &&
      (
        /\b(cual|cuales?)\b.{0,30}\b(recomiend|mejor(es)?|usar(ia)?|elegiria?|prefer(iria)?)\b/i.test(msgNorm) ||
        /\b(cual|cuales?|which)\b.{0,20}\b(de|of)\b.{0,15}\b(esos?|estos?|ellos|ellas|them)\b/i.test(msgNorm) ||
        /\b(which one|cual me recomiend|que me recomiend|cual(es)? son mejores?)\b/i.test(msgNorm) ||
        /\b(que|cual).{0,20}(recomiend|sugieres?|aconsejas?)\b/i.test(msgNorm) ||
        /\b(recommend|suggest|which (should|would))\b.{0,30}\b(use|choose|pick|start)\b/i.test(msgNorm)
      );

    if (isRecommendQuery && g.__llmLastSearch?.length) {
      const items = g.__llmLastSearch
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}${r.description ? "\n   " + r.description.slice(0, 120) : ""}`)
        .join("\n\n");

      const recSystemPrompt = `Eres Stacklume AI. El usuario pregunta cuál de estos recursos recomiendar.

RECURSOS DISPONIBLES:
${items}

INSTRUCCIONES:
- Recomienda 1 o 2 recursos específicos de la lista de arriba
- Explica brevemente POR QUÉ los recomiendas (qué los hace especiales)
- SOLO menciona URLs que estén en la lista de RECURSOS DISPONIBLES — NUNCA inventes URLs
- Responde en 2-4 frases, directo y útil`;

      const recMessages: LlmMessage[] = [
        { role: "system", content: recSystemPrompt },
        { role: "user", content: userMessage },
      ];

      const recResp = await fetch(llamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          messages: recMessages,
          stream: false,
          temperature: 1.0,
          top_k: 20,
          top_p: 1.0,
          min_p: 0,
          presence_penalty: 2.0,
          max_tokens: 512,
          chat_template_kwargs: { enable_thinking: false },
        }),
        signal: AbortSignal.timeout(60_000),
      });

      if (recResp.ok) {
        const recData = (await recResp.json()) as { choices?: Array<{ message?: LlmMessage }>; error?: string };
        const recMsg = recData.choices?.[0]?.message;
        const rawRec = Array.isArray(recMsg?.content)
          ? (recMsg.content as ContentPart[]).filter((p) => p.type === "text").map((p) => (p as { type: "text"; text: string }).text).join("\n")
          : (recMsg?.content ?? "");

        let recContent = cleanLlmText(rawRec);
        if (recContent.trim().length < 5)
          recContent = `De los recursos anteriores, te recomendaría el primero: **${g.__llmLastSearch[0].title}** — ${g.__llmLastSearch[0].url}`;

        // Anti-hallucination: remove any URL not in the allowed set
        const allowedRecUrls = new Set(g.__llmLastSearch.map((r) => r.url));
        recContent = recContent.replace(/https?:\/\/[^\s)>\]"]+/g, (url) => {
          const clean = url.replace(/[.,;:!?]+$/, "");
          return allowedRecUrls.has(clean) ? url : "";
        });

        jobs.set(jobId, { status: "done", content: recContent.trim() });
        return;
      }
      // Si falla el LLM, caer al path normal
    }

    // ── Safety guard: Comandos destructivos masivos ───────────────────────────
    const isDestructiveCmd =
      (/\b(borrar?|borra|eliminar?|elimina)\b/i.test(msgNorm) &&
        /\b(todos?|mis|mi|all|datos?|biblioteca|enlaces?|links?|everything|informacion)\b/i.test(msgNorm)) ||
      /\bdelete all\b|\bclear (all|my) (links?|data|everything)\b/i.test(msgNorm) ||
      /\b(reset(ear?|ea|a)|reiniciar)\b.{0,30}\b(app|stacklume|datos?|biblioteca)\b/i.test(msgNorm);
    if (isDestructiveCmd) {
      jobs.set(jobId, {
        status: "done",
        content: "Para eliminar o gestionar tus enlaces en masa, usa la interfaz de Stacklume directamente.",
      });
      return;
    }

    // ── AGENTIC LLM ───────────────────────────────────────────────────────────
    // El modelo razona autónomamente y decide cuándo usar cada herramienta.
    const libraryText = await loadLibrarySummary();

    const lastSearchCtx =
      g.__llmLastSearch?.length
        ? `\nRESULTADOS RECIENTES (úsalos cuando el usuario diga "el primero", "ése", "inclúyelos", "guárdalos", etc.):\n${g.__llmLastSearch
            .slice(0, 5)
            .map((r, i) => `${i + 1}. ${r.title} — ${r.url}`)
            .join("\n")}`
        : "";

    const systemPrompt = `Eres Stacklume AI, el asistente inteligente de Stacklume. Tu misión: ayudar al usuario a gestionar su colección de enlaces y descubrir nuevos recursos de forma natural y conversacional.

STACKLUME: Dashboard de bookmarks con modos Bento/Kanban/Lista. 120+ widgets (notas, clima, GitHub, tareas, estadísticas...). 23 temas visuales. Ctrl+K busca, Ctrl+N nuevo enlace. Importar/exportar HTML, etiquetas y categorías.

BIBLIOTECA DEL USUARIO:
${libraryText}${lastSearchCtx}

HERRAMIENTAS — razona libremente y úsalas cuando tenga sentido:
• search_library(query) — busca en la biblioteca del usuario por título, URL, categoría o etiqueta
• web_search(query) — busca recursos en internet: documentación, tutoriales, proyectos, herramientas
• save_link(url, title?) — guarda un enlace (requiere URL explícita que el usuario haya dado)
• delete_link(url) — elimina un enlace (usa search_library antes si no tienes la URL exacta)
• mark_favorite(url, favorite?) — favorite=true para marcar, false para desmarcar
• move_to_category(url, category) — mueve un enlace a otra categoría

CÓMO ACTUAR:
• Eres un LLM inteligente — razona, interpreta el contexto y actúa de forma autónoma
• Puedes encadenar herramientas (buscar → guardar, buscar → eliminar, etc.) si el contexto lo pide
• Cuando el usuario diga "el primero", "ése", "inclúyelos" → usa los RESULTADOS RECIENTES
• Si la intención no está clara, pregunta brevemente en lugar de asumir
• Puedes recomendar tecnologías, frameworks y herramientas por nombre — es útil
• Responde en español, texto plano, directo y conversacional — sin asteriscos ni #
• Solo usa URLs reales provenientes de herramientas o de la biblioteca — nunca inventes
• Solo afirma haber ejecutado una acción si realmente llamaste la herramienta`;

    const toolDefinitions = [
      {
        type: "function" as const,
        function: {
          name: "search_library",
          description: "Busca en la biblioteca del usuario. Úsala para: '¿qué links tengo de X?', 'muéstrame mis recursos de Y', 'tengo algo de Z?', 'mis favoritos', 'links de categoría X'.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Tema o texto a buscar" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description: "Busca en internet. Úsala para: 'busca X', 'recomiéndame Y', 'encuentra Z en la web', 'documentación de X', 'mejores herramientas para Y'.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Consulta de búsqueda" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "save_link",
          description: "Guarda un enlace en la biblioteca. Úsala cuando el usuario dé una URL explícita y pida guardarla. NO la uses si no hay URL.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL completa del enlace" },
              title: { type: "string", description: "Título descriptivo (opcional)" },
            },
            required: ["url"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "delete_link",
          description: "Elimina un enlace de la biblioteca. Si el usuario no da la URL exacta, usa search_library primero para encontrarla.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL exacta del enlace a eliminar" },
            },
            required: ["url"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "mark_favorite",
          description: "Marca o desmarca un enlace como favorito.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL del enlace" },
              favorite: { type: "boolean", description: "true para marcar favorito, false para desmarcar" },
            },
            required: ["url"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "move_to_category",
          description: "Mueve un enlace a una categoría diferente.",
          parameters: {
            type: "object",
            properties: {
              url: { type: "string", description: "URL del enlace" },
              category: { type: "string", description: "Nombre de la categoría destino" },
            },
            required: ["url", "category"],
          },
        },
      },
    ];

    const cleanHistoryMsg = (content: string, role: string): string => {
      if (role !== "assistant") return content;
      // Qwen3 best practice: excluir thinking content del historial multi-turno
      const noThink = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
      // Mantener URLs para resolución de referencias pero limpiar emojis de prefijo
      const simplified = noThink
        .replace(/^[📚✅⚠️🔍🕐📂⌨️🎨💡ℹ️🗑️]\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return simplified.slice(0, 600) + (simplified.length > 600 ? "…" : "");
    };

    // Si hay imagen adjunta, usar formato multimodal (vision)
    const userContent: string | ContentPart[] = imageBase64
      ? [
          { type: "text" as const, text: userMessage },
          { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
        ]
      : userMessage;

    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10)
        .map((m) => ({
          role: m.role as string,
          content: cleanHistoryMsg(m.content, m.role),
        })),
      { role: "user", content: userContent },
    ];

    const allowedToolUrls = new Set<string>();
    let formattedContent: string | null = null;
    let terminalReasoningContent: string | undefined;
    const MAX_ROUNDS = 5;

    // Parámetros oficiales Qwen3.5-2B: https://huggingface.co/unsloth/Qwen3.5-2B-GGUF
    // Non-thinking: temp=1.0, top_k desactivado (0), top_p=1.0, presence_penalty=2.0
    // Thinking:     temp=1.0, top_k=20,             top_p=0.95, presence_penalty=1.5
    const samplingParams = enableThinking
      ? { temperature: 1.0, top_k: 20, top_p: 0.95, min_p: 0, presence_penalty: 1.5, max_tokens: 4096 }
      : { temperature: 1.0, top_k:  0, top_p: 1.0,  min_p: 0, presence_penalty: 2.0, max_tokens: 1024 };

    for (let round = 0; round < MAX_ROUNDS; round++) {
      const resp = await fetch(llamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "local-model",
          messages,
          tools: toolDefinitions,
          tool_choice: "auto",
          stream: false,
          ...samplingParams,
          // Control de thinking per-request.
          // El servidor arranca con --reasoning auto, que respeta este parámetro.
          // Thinking mode:     temp=1.0, top_p=0.95, presence_penalty=1.5 + reasoning_format "deepseek"
          // Non-thinking mode: temp=1.0, top_p=1.0,  presence_penalty=2.0 + thinking_budget:0
          chat_template_kwargs: {
            enable_thinking: enableThinking,
            ...(enableThinking ? {} : { thinking_budget: 0 }),
          },
          ...(enableThinking ? { reasoning_format: "deepseek" } : {}),
        }),
        signal: AbortSignal.timeout(enableThinking ? 120_000 : 90_000),
      });

      if (!resp.ok) throw new Error(`LLM HTTP ${resp.status}`);
      const data = (await resp.json()) as {
        choices?: Array<{ message?: LlmMessage; finish_reason?: string }>;
        error?: string;
      };
      if (data.error) throw new Error(String(data.error));

      const msg = data.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls;

      if (!toolCalls || toolCalls.length === 0) {
        // Terminal: el modelo terminó de razonar
        // Capturar reasoning_content solo del paso terminal (no de rounds intermedios con tool_calls)
        const rawReasoning = msg?.reasoning_content?.trim();
        if (rawReasoning) terminalReasoningContent = rawReasoning;

        const rawContent = Array.isArray(msg?.content)
          ? (msg.content as ContentPart[]).filter((p) => p.type === "text").map((p) => (p as { type: "text"; text: string }).text).join("\n")
          : (msg?.content ?? "");
        let content = cleanLlmText(rawContent);

        // Si hay resultados de herramientas, combinar con el comentario del LLM
        if (formattedContent) {
          // Detectar si el LLM solo repite el encabezado de la lista (preamble sin valor añadido)
          const normContent = norm(content);
          const isJustIntro =
            /^(aqui tienes|te (muestro|presento)|encontre|aqui estan|estos son|he (buscado|encontrado)|aqui hay)/.test(normContent) &&
            content.length < 80;
          const commentIsUseful = content.length > 50 && !isJustIntro;
          content = commentIsUseful
            ? `${formattedContent}\n\n${content}`
            : formattedContent;
        }

        // Detectar eco del system prompt
        const firstLine = content.split("\n")[0].trim();
        const isSystemLeak =
          /SIEMPRE EN TEXTO PLANO|Eres Stacklume AI|NUNCA inventes|REGLAS CR.TICAS|BIBLIOTECA DEL USUARIO/i.test(content) ||
          /^SIEMPRE\s+(EN\s+TEXTO|BUSCA\s|USA\s+EMOJIS|SE\s+BREVE|SIN\s+(MARKDOWN|ASTERISCOS))/i.test(firstLine);
        if (isSystemLeak)
          content = "Lo siento, no entendí eso. Prueba a reformular tu pregunta.";

        // Filtro anti-alucinación: eliminar líneas con URLs inventadas
        const urlsInLibrary = new Set(
          (
            await withRetry(
              () =>
                db
                  .select({ url: links.url })
                  .from(links)
                  .where(isNull(links.deletedAt)),
              { operationName: "llm url validation" }
            )
          ).map((l) => l.url.toLowerCase())
        );
        const filteredLines = content.split("\n").filter((line) => {
          const urlsInLine = line.match(/https?:\/\/[^\s)>]+/g);
          if (!urlsInLine) return true;
          return urlsInLine.every((u) => {
            const normalized = u.toLowerCase().replace(/\/+$/, "");
            return urlsInLibrary.has(normalized) || allowedToolUrls.has(normalized);
          });
        });
        content = filteredLines
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
        if (!content)
          content = formattedContent ?? "No encontré información relevante. Prueba con 'busca [tema]' para buscar en internet.";

        // Eliminar preamble defensivo innecesario que el modelo pequeño a veces genera
        const defensivePreamble =
          /^(no puedo inventar url[^\n]*|no puedo mencionar url[^\n]*|no hay [^\n]*(biblioteca|lista)[^\n]*|no tengo acceso[^\n]*|como asistente de (ia|inteligencia artificial)[^\n]*|como modelo de (lenguaje|ia)[^\n]*|lo siento pero no puedo[^\n]*|lamentablemente no (puedo|tengo)[^\n]*)\n+/gi;
        const stripped = content.replace(defensivePreamble, "").trim();
        if (stripped.length >= 10) content = stripped;

        // Fallback para respuestas demasiado cortas
        if (content.trim().length < 10) {
          content =
            "No entendí del todo esa pregunta 😅 Puedes decirme: 'busca [tema]' para buscar en la web, 'guarda URL' para añadir un enlace, o pregúntame sobre Stacklume.";
        }

        jobs.set(jobId, { status: "done", content, reasoningContent: terminalReasoningContent });
        return;
      }

      // Ejecutar tool calls
      messages.push({
        role: "assistant",
        content: msg?.content ?? null,
        tool_calls: toolCalls,
      });

      for (let tcIdx = 0; tcIdx < toolCalls.length; tcIdx++) {
        const tc = toolCalls[tcIdx];
        // Guard: llama-server puede omitir el nombre en algún tool_call
        if (!tc.function?.name) continue;

        let args: Record<string, unknown> = {};
        try {
          // llama-server puede devolver arguments como string O como objeto ya parseado
          const raw = tc.function.arguments;
          args = typeof raw === "string"
            ? JSON.parse(raw || "{}")
            : (raw as Record<string, unknown>) ?? {};
        } catch {
          args = {};
        }

        const result = await executeTool(tc.function.name, args);

        // Procesar resultados para formateo y recolección de URLs reales
        try {
          const parsed = JSON.parse(result) as {
            results?: Array<{ title?: string; url?: string; description?: string }>;
            success?: boolean;
            added?: { title: string; url: string };
            deleted?: { title: string; url: string };
            isDuplicate?: boolean;
            error?: string;
            count?: number;
            message?: string;
            title?: string;
            isFavorite?: boolean;
            category?: string;
          };

          // Recoger URLs reales para el filtro anti-alucinación
          if (parsed.results) {
            for (const r of parsed.results) {
              if (r.url) allowedToolUrls.add(r.url.toLowerCase().replace(/\/+$/, ""));
            }
          }

          if (tc.function.name === "search_library") {
            if (parsed.results?.length) {
              // Usar formatted directamente — incluye categoría [Cat] para cada enlace
              const list = (parsed as { formatted?: string }).formatted
                ?? parsed.results.slice(0, 8).map((r, i) => `${i + 1}. ${r.title ?? r.url}\n   ${r.url}`).join("\n\n");
              formattedContent = `📚 Encontré ${parsed.results.length} enlace${parsed.results.length === 1 ? "" : "s"}:\n\n${list}`;
            } else {
              formattedContent = `📚 ${parsed.message ?? "No encontré enlaces sobre ese tema."}\n💡 Prueba "busca [tema]" para buscar en internet.`;
            }
          } else if (tc.function.name === "web_search") {
            if (parsed.results?.length) {
              const list = parsed.results
                .slice(0, 5)
                .map((r, i) => `${i + 1}. ${r.title ?? r.url}\n   ${r.url}`)
                .join("\n\n");
              g.__llmLastSearch = parsed.results.slice(0, 5).map((r) => ({
                title: r.title ?? "",
                url: r.url ?? "",
                description: r.description ?? "",
              }));
              formattedContent = `Aquí tienes los resultados:\n\n${list}`;
            } else {
              formattedContent =
                parsed.message ?? "No encontré resultados. Prueba con otros términos.";
            }
          } else if (tc.function.name === "save_link") {
            if (parsed.success && parsed.added) {
              formattedContent = `✅ Añadido a tu biblioteca:\n${parsed.added.title}\n${parsed.added.url}`;
            } else if (parsed.isDuplicate) {
              formattedContent = `ℹ️ Ya existía en tu biblioteca: ${args.url ?? ""}`;
            } else if (parsed.error) {
              formattedContent = `⚠️ No se pudo guardar: ${parsed.error}`;
            }
          } else if (tc.function.name === "delete_link") {
            if (parsed.success && parsed.deleted) {
              formattedContent = `🗑️ Eliminado de tu biblioteca:\n${parsed.deleted.title}\n${parsed.deleted.url}`;
            } else if (parsed.error) {
              formattedContent = `⚠️ ${parsed.error}`;
            }
          } else if (tc.function.name === "mark_favorite") {
            if (parsed.success) {
              const action = parsed.isFavorite ? "añadido a favoritos ⭐" : "quitado de favoritos";
              formattedContent = `✅ ${parsed.title ?? args.url} — ${action}`;
            } else if (parsed.error) {
              formattedContent = `⚠️ ${parsed.error}`;
            }
          } else if (tc.function.name === "move_to_category") {
            if (parsed.success) {
              formattedContent = `✅ Movido a "${parsed.category}":\n${parsed.title ?? args.url}`;
            } else if (parsed.error) {
              formattedContent = `⚠️ ${parsed.error}`;
            }
          }
        } catch { /* ignorar errores de parseo */ }

        // Fallback si el servidor no devolvió id (algunos builds de llama-server lo omiten)
        messages.push({ role: "tool", content: result, tool_call_id: tc.id || `call_${round}_${tcIdx}` });
      }
    }

    // Máximo de rondas alcanzado
    jobs.set(jobId, {
      status: "done",
      content:
        formattedContent ?? "No pude completar la respuesta. Intenta reformular tu pregunta.",
    });
  } catch (err) {
    let error = "Error desconocido";
    if (err instanceof Error) {
      if (err.name === "TimeoutError")
        error = "El modelo tardó demasiado. Inténtalo de nuevo.";
      else if (
        err.message.includes("fetch failed") ||
        err.message.includes("ECONNREFUSED")
      )
        error = "El modelo LLM no está disponible. Verifica que está corriendo.";
      else error = err.message;
    }
    jobs.set(jobId, { status: "error", error });
  } finally {
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
}
// ─── Handlers HTTP ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { error: "Solo disponible en la app de escritorio" },
      { status: 403 }
    );
  }

  const llamaPort = process.env.LLAMA_PORT;
  let body: {
    userMessage: string;
    history?: ConversationMessage[];
    llamaPort?: number;
    enableThinking?: boolean;
    imageBase64?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { userMessage, history = [], llamaPort: clientPort, enableThinking = false, imageBase64 } = body;
  // Permitir userMessage vacío cuando hay imagen adjunta (el usuario solo pegó una imagen)
  if (!userMessage?.trim() && !imageBase64)
    return NextResponse.json(
      { error: "userMessage es obligatorio" },
      { status: 400 }
    );

  const resolvedPort =
    clientPort && clientPort > 0 ? clientPort.toString() : llamaPort;
  if (!resolvedPort || resolvedPort === "0") {
    return NextResponse.json(
      { error: "LLM local no configurado. Instala el modelo primero." },
      { status: 503 }
    );
  }

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "pending" });
  runLlmJob(jobId, resolvedPort, (userMessage ?? "").trim(), history, enableThinking, imageBase64);
  return NextResponse.json({ jobId });
}

export async function GET(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { error: "Solo disponible en la app de escritorio" },
      { status: 403 }
    );
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId)
    return NextResponse.json({ error: "jobId requerido" }, { status: 400 });

  const result = jobs.get(jobId);
  if (!result)
    return NextResponse.json(
      { error: "Job no encontrado o expirado" },
      { status: 404 }
    );

  return NextResponse.json(result);
}
