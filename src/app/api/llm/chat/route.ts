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
  function: { name: string; arguments: string };
}

interface LlmMessage {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

type JobResult =
  | { status: "pending" }
  | { status: "done"; content: string }
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
      } catch {
        return JSON.stringify({ error: `"${url}" ya existe o no se pudo añadir.` });
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
// Arquitectura: operaciones deterministas primero (sin LLM), Q&A libre al final.
// Esto garantiza rapidez y fiabilidad para acciones concretas (guardar, buscar,
// añadir resultados previos), y solo usa el LLM para conversación libre.

async function runLlmJob(
  jobId: string,
  llamaPort: string,
  userMessage: string,
  history: ConversationMessage[]
): Promise<void> {
  const llamaUrl = `http://127.0.0.1:${llamaPort}/v1/chat/completions`;

  try {
    // ── Detección de intención ────────────────────────────────────────────────
    const msgNorm = norm(userMessage);
    const msgNFC = userMessage.normalize("NFC");
    const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
    const hasRecentSearch = (g.__llmLastSearch?.length ?? 0) > 0;

    // \bbusca\b = imperativo claro "busca X" → siempre wantsSearch
    // \bbuscar\b solo cuando NO es una pregunta sobre la app ("buscar en el buscador de Stacklume")
    //   y NO es una pregunta de "cómo..." ("cómo se llama la función para buscar")
    // \brecomienda(?:me)?\b excluye "recomiendas" (2ª persona) — solo imperativo/reflexivo
    const wantsSearch =
      /\bbusca\b|search|en internet|en la web|\bencuentra|\brecomienda(?:me)?\b|googlea|\bfind\b|look for|show me resources|get me links/i.test(msgNorm) ||
      (/\bbuscar\b/i.test(msgNorm) &&
        !/\bbuscar en (la app|stacklume|mi biblioteca|el buscador|mis links?)\b/i.test(msgNorm) &&
        !/^(como|que|para que|por que|cuando|donde|cual|cuales)\b/.test(msgNorm));
    // Preguntas de "¿cómo...?" → CASO 5 Q&A, nunca wantsAdd ni wantsLibrarySearch.
    // "como puedo anadir", "como importo", "how to add" etc.
    const isHowToQuestion =
      /^como (importo|exporto|uso|configuro|instalo|creo|hago|cambio|elimino|borro|edito|accedo|activo|desactivo|personalizo|actualizo)\b/.test(msgNorm) ||
      /^como (puedo |podria |se puede |se |podemos )?(anadir|agregar|guardar|importar|exportar|usar|crear|instalar|configurar|editar|eliminar|borrar)\b/.test(msgNorm) ||
      // "cómo se llama / funciona / usa X" — pregunta sobre la app, no acción de guardar
      /^como (se (llama|usa|activa|abre|cierra|encuentra|hace|crea|elimina|edita)|funciona|sirve)\b/.test(msgNorm) ||
      /^how (to|do i|can i) (import|export|use|configure|install|create|delete|add|edit|access|enable|disable|update)\b/.test(msgNorm);
    // Solo las formas imperativas/infinitivo de "añadir": "anade" (añade), "anadir" (añadir).
    // Evita falsos positivos de conjugación:
    //   - "anado" (yo añado), "anadi" (yo añadí), "anadio" (él añadió)
    //   - "anadiendo" (gerundio), "anadimos" (nosotros), "anaden" (ellos)
    //   - Antes: \banad(?!id) solo bloqueaba el participio "anadido"
    // isHowToQuestion: "como puedo anadir widgets?" no debe guardar nada
    const wantsAdd =
      !isHowToQuestion && (
        // \banade(?!s\b): excluye "añades" (2ª persona "¿añades tú?") — solo imperativo/infinitivo
        /\banade(?!s\b)|\banadir\b/i.test(msgNorm) ||
        // guarda(?!\w): imperativo "guarda URL" (excluye "guardado/s", "guardan")
        // guardar\b / guarde[s]?\b: infinitivo/subjuntivo presente "quiero que guardes URL", "necesito guardar URL"
        // guardar[ao][s]?\b: subjuntivo imperfecto "me gustaría que guardaras URL", "ojala guardaras"
        /guarda(?!\w)|\bguardar\b|\bguarde[s]?\b|\bguardar[ao][s]?\b|agrega(?!d)|add link|save link|\bpon\b|mete |integra(?!d|ci)|incluy/i.test(msgNorm) ||
        // EN: "save/add/bookmark URL" al inicio del mensaje
        /^\s*(save|add|bookmark)\s+\S/i.test(userMessage)
      );
    // Detectar dominio sin esquema: "añade react.dev", "guarda svelte.dev"
    // Solo cuando NO hay búsqueda explícita (wantsSearch desactiva esto para no confundir
    // "busca Node.js y guarda" con "Node.js" como dominio).
    // TLD whitelist: excluye extensiones de archivo (.js, .ts, .css, .py, etc.)
    const VALID_TLDS = /^(com|org|net|dev|io|app|sh|ai|co|me|tv|ly|is|to|pm|gg|tech|info|blog|wiki|live|site|web|zone|cloud|store|studio|design|tools|codes|run|works|world|pro|one|fun|xyz|biz|edu|gov|cc|be|uk|es|fr|it|jp|cn|ru|br|ca|au|de|eu|us|nz|sg|mx|ar|cl|pe|in|ng|za|build|team|page|new|link|land|city|guide|tips|help|plus|next|now|today|social|media|news|space|network|systems|software|services|solutions|academy|school|online|digital|work|jobs|career|agency|company|group|global|international|foundation|institute|community|center|hub|lab|labs|studio|media|press|report|review|blog|news|wiki|docs|api|sdk|cli|ui|ux|dev)$/i;
    const domainMatch = !urlMatch && !wantsSearch && wantsAdd
      ? (() => {
          // Soporta subdominios: docs.astro.build, pkg.go.dev, etc.
          // (?:[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.)+ = una o más partes "nombre."
          // ([a-zA-Z]{2,6}) = TLD final puramente alfabético
          const m = userMessage.match(/\b((?:[a-zA-Z0-9][-a-zA-Z0-9]{0,62}\.)+([a-zA-Z]{2,6})(?:\/[^\s]*)?)\b/);
          return m && VALID_TLDS.test(m[2]) ? m : null;
        })()
      : null;
    const resolvedUrl = urlMatch ? urlMatch[0] : (domainMatch ? `https://${domainMatch[1]}` : null);
    const resolvedUrlMatch = urlMatch ?? domainMatch;
    // Si el mensaje es básicamente solo una URL (sin texto de acción), también guardar.
    // "https://astro.build" → CASO 2. La URL enviada sola implica intención de guardar.
    const messageIsJustUrl = urlMatch !== null &&
      userMessage.replace(urlMatch[0], "").replace(/[!?.,¡¿\s]/g, "").length < 8;
    // "inclúyelos" / "añade los 3 primeros" = añadir resultado de búsqueda previa.
    // Requiere referencia explícita a los resultados previos para evitar falsos positivos
    // como "guarda el momento" o "¿añades tú?" que no se refieren a búsquedas anteriores.
    const wantsAddPrev = wantsAdd && !resolvedUrlMatch && !wantsSearch && hasRecentSearch && (
      /\b(todos?|esos?|estos?|los anteriores?|los de (arriba|antes))\b/i.test(msgNorm) ||
      /\b(all|those|these|previous|above)\b/i.test(msgNorm) ||
      /incluy|añadelos?|guardalos?|agrega(los?)?/i.test(msgNorm) ||
      /\blos primeros?\b|\bel primer(o)?\b|\b\d+\s+primeros?\b/i.test(msgNorm)
    );
    // "¿qué links tengo de X?", "¿tienes algo de Y?", "mis links de Z", "cuántos links de X"
    // También: "links de X", "recursos de X", "tengo algo con la etiqueta X"
    // "cuantos links tengo?" sin tema específico va a Q&A (no aquí)
    // isHowToQuestion ya se calcula antes (también guarda wantsAdd)
    const wantsLibrarySearch =
      !wantsSearch && !wantsAdd && !urlMatch && !isHowToQuestion &&
      /cuantos? (links?|enlaces?|recursos?) (tengo )?(de|sobre) |que (links?|enlaces?|recursos?|cosas?|paginas?|frameworks?) .{0,25}?tengo|que tengo (guardado )?(de|sobre|con|en)|tienes algo (de|sobre|en|con)|tengo algo (guardado )?(de|sobre|en|con)|mis links? (de|sobre)|mis enlaces? (de|sobre)|mis (bookmarks?|favoritos?) |tengo (links?|enlaces?|recursos?) (de|sobre)|\blinks? (de|sobre) \w|\benlaces? (de|sobre) \w|\brecursos? (de|sobre) \w|\bbookmarks?\b|\betiqueta\b|how many (links?|resources?)|do i have (?:any )?(?:\w+\s+)?(links?|resources?|bookmarks?)|my (saved )?(links?|resources?|bookmarks?) ?(about|on|for|de|sobre)|my (saved )?(links?|resources?|bookmarks?)(?:\s|$)|what (links?|resources?|bookmarks?) (do i have)? ?(about|on|for)?|what .{1,25} (links?|resources?|bookmarks?)( do i have)?|do you have (any(thing)?|something)? ?(about|on|for)|do you have any \w+ (links?|resources?|bookmarks?)|any (links?|resources?|bookmarks?) (about|on|for)|show me (my )?(saved )?(links?|resources?|bookmarks?)|list (my )?(saved )?(links?|resources?|bookmarks?)|give me (my )?(saved )?(links?|resources?|bookmarks?)|my \w+ (links?|resources?|bookmarks?)|show me what (i have|i.ve) saved|(muestrame|mostrame) (todo )?(de|sobre) |hay algo (de|sobre|con) \w|(tengo|tienes?|hay) (recursos?|links?|enlaces?|bookmarks?) (de|sobre|con|para) \w|tengo algun(a|os|as)? (link|enlace|recurso)(s)? (de|sobre|relacionado[s]? con)|algun (link|enlace|recurso) (de|sobre|relacionado|guardado)/i.test(msgNorm);

    // ── CASO 1: Añadir resultados de búsqueda previa ──────────────────────────
    // "inclúyelos", "añade los 3 primeros", "guárdalos todos"
    if (wantsAddPrev && g.__llmLastSearch?.length) {
      // Parsear cantidad pedida: "los 3 primeros" → 3, "todos" → todos, default → 3
      const numMatch = userMessage.match(/(\d+)/);
      const allOf = /todos|todas|all/i.test(userMessage);
      const count = allOf
        ? g.__llmLastSearch.length
        : numMatch
        ? Math.min(parseInt(numMatch[1]), 5)
        : 3;
      const prevResults = g.__llmLastSearch.slice(0, count);

      const linkList = prevResults
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
        .join("\n\n");

      const added: string[] = [];
      const skipped: string[] = [];
      for (const r of prevResults) {
        const res = await executeTool("save_link", { url: r.url, title: r.title });
        const parsed = JSON.parse(res) as {
          success?: boolean;
          added?: { title: string; url: string };
          error?: string;
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

    // ── CASO 2: Guardar URL directa o dominio sin esquema ─────────────────────
    // "guarda https://deno.com", "añade https://bun.sh", "añade react.dev"
    // También: mensaje que es solo una URL ("https://astro.build") sin otra intención
    if ((wantsAdd && resolvedUrlMatch) || messageIsJustUrl) {
      const url = (resolvedUrl ?? resolvedUrlMatch?.[0] ?? urlMatch?.[0] ?? "").replace(/[.,;)]+$/, "");
      let title: string;
      try {
        const parsed = new URL(url);
        const hostname = parsed.hostname.replace(/^www\./, "");
        // Intentar extraer un título descriptivo del path (ej: /docs/getting-started → "docs/getting started")
        const pathTitle = parsed.pathname
          .replace(/\/$/, "")
          .split("/")
          .filter(Boolean)
          .join(" / ")
          .replace(/-/g, " ")
          .replace(/_/g, " ")
          .slice(0, 60);
        title = pathTitle ? `${hostname} — ${pathTitle}` : hostname;
      } catch {
        title = url;
      }
      const addRes = await executeTool("save_link", { url, title });
      const addData = JSON.parse(addRes) as {
        success?: boolean;
        added?: { title: string; url: string };
        error?: string;
      };
      if (addData.success && addData.added) {
        jobs.set(jobId, {
          status: "done",
          content: `✅ Añadido a tu biblioteca:\n${addData.added.title}\n${addData.added.url}`,
        });
      } else if (addData.error?.includes("ya existe")) {
        jobs.set(jobId, {
          status: "done",
          content: `ℹ️ Ya existía en tu biblioteca: ${resolvedUrl}`,
        });
      } else {
        jobs.set(jobId, {
          status: "done",
          content: `⚠️ No se pudo añadir: ${addData.error ?? "error desconocido"}`,
        });
      }
      return;
    }

    // ── CASO 3: Buscar en la biblioteca del usuario ───────────────────────────
    // "¿qué links tengo de React?", "mis enlaces de CSS", "¿tienes algo de Python?"
    if (wantsLibrarySearch) {
      const keyword = msgNorm
        .replace(
          /cuantos? (links?|enlaces?|recursos?) (tengo )?(de|sobre) ?|que (links?|enlaces?|recursos?|cosas?|paginas?) tengo (de|sobre)?|que tengo (guardado )?(de|sobre|con|en)|tienes algo (de|sobre|en|con)|tengo algo (guardado )?(de|sobre|en|con)|hay algo (de|sobre|en|con) ?|mis links? (de|sobre)?|mis enlaces? (de|sobre)?|mis (bookmarks?|favoritos?) ?|tengo (links?|enlaces?|recursos?) (de|sobre) ?|links? (de|sobre) ?|enlaces? (de|sobre) ?|recursos? (de|sobre) ?|bookmarks? (de|sobre|about)? ?/gi,
          ""
        )
        // S7: "show me what I have saved about X" / "what I've saved about X" → extraer solo el tema
        .replace(/^(?:show me )?what (?:i have|i.ve) saved\s*(?:about|on|for)?\s*/gi, "")
        // Eliminar artículos y palabras de categoría sueltas tras el reemplazo
        .replace(/\bla (categoria|seccion|carpeta)\b|\ben la (categoria|seccion)\b/gi, "")
        // Eliminar ruido de ubicación, "etiqueta X" → solo X, y participios ES
        .replace(/\ben mi biblioteca\b|\ben la app\b|\ben stacklume\b|\ben mi coleccion\b|\bde mi biblioteca\b/gi, "")
        .replace(/\bguardados?\b|\balmacenados?\b|\bsaved\b|\bstored\b/gi, "")
        .replace(/\bcon la etiqueta\b|\bcon etiqueta\b|\bla etiqueta\b|\btagged?\b/gi, "")
        // Ruido verbal al inicio (ES+EN)
        .replace(/^(dame|dime|muestrame|mostrame|listame|necesito|quiero|puedes|podrias|show me|give me|list)\s+(una? )?(lista(do)?|coleccion|listado)?\s*(de\s+)?/gi, "")
        // Prefijos EN para búsqueda en biblioteca: "how many links do i have about X"
        .replace(/^how many links( do i have)?( about| on| for)?/gi, "")
        // "do I have any TypeScript resources" → extrae solo el tema
        .replace(/^do i have (?:any )?(\w+\s+)?(links?|resources?)( about| on| for| with)?\s?/gi, "$1")
        // "do you have any Vue links?" / "do you have any resources about Docker?" → "Vue" / "Docker"
        .replace(/^do you have (?:any )?(?:(\w+)\s+)?(?:links?|resources?|bookmarks?)\s*(?:about|on|for)?\s*/gi, "$1 ")
        // S6: "my react links", "my JavaScript resources" → extraer solo el tema
        .replace(/^my\s+(?!saved\s+)(\w+)\s+(?:links?|resources?|bookmarks?)\s*/gi, "$1 ")
        .replace(/^my\s+(saved\s+)?(links?|resources?|bookmarks?)\s*(about|on|for|de|sobre)?\s*/gi, "")
        // "what links/resources do I have about X?" → extrae solo el tema
        .replace(/^what (links?|resources?|bookmarks?) ?(do i have)? ?(about|on|for)?\s?/gi, "")
        // "what TypeScript resources do I have?" → captura el tema entre "what" y "links/resources"
        .replace(/^what (.{1,25}?) (?:links?|resources?|bookmarks?)(?:\s*do i have)?(?:\s*about|\s*on|\s*for|\s*with)?\s?/gi, "$1 ")
        // "do you have any resources about X" / "do you have any Vue links?" → extrae solo el tema
        .replace(/^do you have (?:any )?(?:links?|resources?|bookmarks?) ?(about|on|for|on)?\s*/gi, "")
        .replace(/^do you have (any(thing)?|something)? ?(about|on|for)\s?/gi, "")
        .replace(/^any (?:links?|resources?) (about|on|for)\s?/gi, "")
        // Residuo tras eliminar "show me/list/give me": "links about X" → "X"
        .replace(/^(links?|resources?) (about|on|for)\s?/gi, "")
        .replace(/^(de|sobre|con|en|tengo|una?|mis|sus|los|las|todos?|lo|la|my|about|on|for)\s+/i, "")
        // "y qué otros links de X" → eliminar "y que otros"
        .replace(/^y\s+(que|qué)\s+(otros?|mas|más|hay|también|tambien)?\s*/gi, "")
        // "también tengo/hay X" → eliminar "también"
        .replace(/^tambi[eé]n\s+(tengo\s+|hay\s+)?/gi, "")
        // Segunda pasada: eliminar un segundo prefijo residual (ej: "todo lo X" → "lo X" → "X")
        .replace(/^(de|sobre|con|en|tengo|una?|mis|sus|los|las|todos?|lo|la|y|que|otros?|my|about|on|for)\s+/i, "")
        // Ruido al final en inglés y en español: "...do I have?", "...que tengo", "...tengo?"
        .replace(/\s*(do i have|that i have|i have|do you have)[?!.\s]*$/i, "")
        .replace(/\s*(que tengo|que tienes?|tengo|que hay)[?!.,\s]*$/i, "")
        .replace(/[¿?¡!,;:]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      const libRes = await executeTool("search_library", {
        query: keyword || msgNorm.slice(0, 60),
      });
      const libData = JSON.parse(libRes) as {
        results?: Array<{ title: string; url: string }>;
        message?: string;
        count?: number;
      };
      if (libData.results?.length) {
        const list = libData.results
          .slice(0, 8)
          .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
          .join("\n\n");
        jobs.set(jobId, {
          status: "done",
          content: `📚 Tienes ${libData.count} enlace${libData.count === 1 ? "" : "s"}:\n\n${list}`,
        });
      } else {
        // Auto-fallback: si no hay nada en la biblioteca, buscar en la web automáticamente
        const topic = keyword || msgNorm.slice(0, 40);
        const isValidTopic = topic.length > 2 && !/^(de|el|la|los|las|un|una|en|sobre|que|si)$/.test(topic.trim());
        if (isValidTopic) {
          const webRes = await executeTool("web_search", { query: topic });
          const webData = JSON.parse(webRes) as { results?: SearchResult[]; message?: string; error?: string };
          if (webData.results?.length) {
            const list = webData.results
              .slice(0, 5)
              .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
              .join("\n\n");
            jobs.set(jobId, {
              status: "done",
              content: `📚 No tenías enlaces de "${topic}" guardados, pero encontré esto en la web:\n\n${list}`,
            });
            return;
          }
        }
        const notFoundMsg = libData.message ?? `No encontré enlaces sobre "${topic}" en tu biblioteca.`;
        jobs.set(jobId, {
          status: "done",
          content: `📚 ${notFoundMsg}${isValidTopic ? `\n💡 Prueba "busca ${topic}" para buscar en la web.` : ""}`,
        });
      }
      return;
    }

    // ── CASO 4: Búsqueda web ──────────────────────────────────────────────────
    // "busca los mejores gestores de paquetes", "encuentra tutoriales de Next.js"
    // "busca React y guárdalo"
    // NOTA: ya no se activa con (wantsAdd && !resolvedUrlMatch) para evitar falsos
    // positivos como "guarda el momento" o "añade una tarea" sin URL.
    if (wantsSearch) {
      const query = userMessage
        .normalize("NFC")
        .replace(
          /busca(r)?|en internet|en la web|en google|googlea(r)?|encuentra(r)?|recomienda(r)?|dame|muéstrame|lista(r)?|\bfind\b|look for|show me|get me/gi,
          ""
        )
        .replace(/añade(lo)?|guarda(r)?|incluy[a-záéíóú]*/gi, "")
        .replace(/en mi(s)? (biblioteca|favoritos?|coleccion|links?|enlaces?)|en la (app|biblioteca)|en stacklume|mi(s)? (coleccion|favoritos?|links?|enlaces?)/gi, "")
        .replace(/en mi biblioteca|en la app|en stacklume|mi colección/gi, "")
        .replace(/por favor|porfavor|please/gi, "")
        .replace(/[¿?¡!,;:]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);

      const searchRes = await executeTool("web_search", {
        query: query || userMessage.slice(0, 80),
      });
      const searchData = JSON.parse(searchRes) as {
        results?: SearchResult[];
        message?: string;
        error?: string;
      };

      if (!searchData.results?.length) {
        // Limpiar búsqueda previa para que "añade los primeros" no use resultados obsoletos
        g.__llmLastSearch = [];
        const msg = searchData.error?.includes("no disponible")
          ? "🔍 El buscador no está disponible ahora mismo. Inténtalo de nuevo en unos segundos."
          : (searchData.message ?? "No encontré resultados. Prueba con otros términos.");
        jobs.set(jobId, { status: "done", content: msg });
        return;
      }

      const resultsList = searchData.results
        .slice(0, 5)
        .map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`)
        .join("\n\n");

      let reply = `Aquí tienes los resultados:\n\n${resultsList}`;

      // Si pidió guardar también, guardar el primer resultado
      if (wantsAdd && searchData.results.length > 0) {
        const top = searchData.results[0];
        const addRes = await executeTool("save_link", { url: top.url, title: top.title });
        const addData = JSON.parse(addRes) as {
          success?: boolean;
          added?: { title: string; url: string };
          error?: string;
        };
        if (addData.success && addData.added) {
          reply += `\n\n✅ Añadido: ${addData.added.title}\n${addData.added.url}`;
        } else if (addData.error) {
          reply += `\n\n⚠️ ${addData.error}`;
        }
      }

      jobs.set(jobId, { status: "done", content: reply });
      return;
    }

    // ── CASO: Saludo inicial ────────────────────────────────────────────────────
    // "hola", "hey", "buenos días", "hi", "hello"
    if (/^(hola|hey|buenas|buenos dias|buenas tardes|buenas noches|hi|hello|saludos|ey|ola)[\s!.,¡]*$/i.test(msgNorm)) {
      const libText = await loadLibrary();
      const totalMatch = libText.match(/Total:\s*(\d+)\s*enlaces/);
      const total = totalMatch?.[1];
      jobs.set(jobId, {
        status: "done",
        content: total && Number(total) > 0
          ? `¡Hola! 👋 Soy el asistente de Stacklume. Tienes ${total} enlaces guardados.\n¿En qué puedo ayudarte? Puedes pedirme que busque recursos, guarde enlaces o preguntarme sobre la app.`
          : "¡Hola! 👋 Soy el asistente de Stacklume. ¿En qué puedo ayudarte?\nPuedo buscar recursos en la web, guardar enlaces, o explicarte las funcionalidades de la app.",
      });
      return;
    }

    // ── CASO: ¿Qué puedes hacer? / Ayuda ──────────────────────────────────────
    // "¿qué puedes hacer?", "ayuda", "help", "capacidades", "¿para qué sirves?"
    if (/^(ayuda|help|socorro|auxilio)[\s!.,¡?¿]*$|que (puedes?|sabes?) (hacer|decirme|ofrecerme)|para que (sirves?|eres?)|como (te uso|puedo usarte|funciona[s]? el chat|hablo contigo)|what can you do|how (do i use you|can you help)/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "Soy el asistente IA de Stacklume. Aquí lo que puedo hacer:\n\n🔍 Buscar recursos: \"busca tutoriales de React\"\n📚 Ver tu biblioteca: \"mis links de Python\" o \"¿tienes algo de CSS?\"\n💾 Guardar enlaces: \"guarda https://...\"\n➕ Añadir resultados: \"añade los 3 primeros\" (tras una búsqueda)\n🧠 Responder preguntas: sobre tecnologías, frameworks, la propia app Stacklume\n\nEjemplos rápidos:\n• \"busca las mejores librerías de animación para React\"\n• \"¿qué links de JavaScript tengo guardados?\"\n• \"añade https://astro.build\"\n• \"¿cuántos enlaces tengo en total?\"",
      });
      return;
    }

    // ── CASO: ¿Quién eres? / ¿Qué eres? ──────────────────────────────────────
    if (/^(quien|que) (eres?|es esto|soy yo hablando con|es el asistente)|are you (an? )?(ai|bot|assistant|llm)|what are you|who are you/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "Soy Stacklume AI, un asistente local que corre en tu ordenador usando un modelo de lenguaje pequeño (Qwen). Puedo ayudarte a gestionar tu biblioteca de enlaces, buscar recursos en la web y responder preguntas sobre tecnología y la app Stacklume.\n\nAl ser un modelo local y pequeño, tengo algunas limitaciones en razonamiento complejo, pero funciono sin enviar tus datos a ningún servidor externo.",
      });
      return;
    }

    // ── CASO: Gracias / Despedida ──────────────────────────────────────────────
    if (/^(gracias|thanks?|thank you|perfecto|genial|ok|vale|de acuerdo|excelente|bien|aok|thx|ty)[\s!.,¡?¿]*$/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "¡De nada! 😊 Si necesitas algo más, aquí estoy.",
      });
      return;
    }

    // ── CASO 5a: Conteo general de la biblioteca (respuesta determinista) ────────
    // "¿cuántos links tengo en total?", "cuántos enlaces guardados", "how many links do i have?" etc.
    // Evita que el LLM devuelva solo "137" (< 10 chars) y quede ambiguo.
    if (/cuantos? (links?|enlaces?|recursos?|marcadores?|bookmarks?) (tengo|hay|guardados?)/i.test(msgNorm) ||
        /how many (links?|resources?|bookmarks?) (do i have|are there|in total|in my library)/i.test(msgNorm)) {
      const libText = await loadLibrary();
      const totalMatch = libText.match(/Total:\s*(\d+)\s*enlaces/);
      const catMatch = libText.match(/Categorías:\s*(.+)/);
      const total = totalMatch?.[1] ?? "?";
      const cats = catMatch?.[1] ?? "";
      jobs.set(jobId, {
        status: "done",
        content: cats
          ? `Tienes ${total} enlaces en tu biblioteca.\n📂 Categorías: ${cats}`
          : `Tienes ${total} enlaces en tu biblioteca.`,
      });
      return;
    }

    // ── CASO 5b: Consultas sobre features de Stacklume (respuesta determinista) ─
    // "¿cuántos temas tiene Stacklume?", "how many visual themes?" etc.
    // El LLM pequeño tiende a devolver solo "23" (<10 chars) para esta pregunta.
    if (/cuantos? temas? (visuales? )?(tiene|hay|disponibles?|tiene stacklume|tiene la app)?/i.test(msgNorm) ||
        /how many (visual\s+)?themes? ?(does (it|stacklume) have|are there|available)?/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "🎨 Stacklume tiene 23 temas visuales: 14 oscuros (Dark, Nordic, Catppuccin, Tokyo Night, Rosé Pine, Gruvbox, Solar Dark, Vampire, Midnight, Ocean, Forest, Slate, Crimson, Aurora), 6 claros (Light, Solarized, Arctic, Sakura, Lavender, Mint) y 3 grises (Cement, Stone, Steel). Puedes cambiarlos desde el botón de configuración en la barra superior.",
      });
      return;
    }

    // ── CASO 5d: Conteo de etiquetas / categorías (respuesta determinista) ──────
    // "¿cuántas etiquetas tengo?", "cuántas categorías?", "how many tags?"
    // El LLM devuelve solo un número (<10 chars). Handler determinista.
    if (/cuantas? (etiquetas?|tags?|categorias?|carpetas?)/i.test(msgNorm) ||
        /how many (tags?|categories?|labels?|folders?) (do i have|are there)?/i.test(msgNorm)) {
      const libText = await loadLibrary();
      const catMatch = libText.match(/Total:\s*\d+\s*enlaces,\s*(\d+)\s*categorías/);
      const tagMatch = libText.match(/Etiquetas:\s*(.+)/);
      const numCats = catMatch?.[1] ?? "?";
      const tags = tagMatch?.[1] ?? "";
      const numTags = tags ? tags.split(",").length : 0;
      let reply = `📂 Tienes ${numCats} categorías`;
      if (tags) reply += ` y ${numTags} etiqueta${numTags === 1 ? "" : "s"}: ${tags.split(",").map(t => t.trim()).slice(0, 10).join(", ")}`;
      reply += ".";
      jobs.set(jobId, { status: "done", content: reply });
      return;
    }

    // ── CASO 5e: Últimos links añadidos (respuesta determinista) ─────────────
    // "qué links he guardado últimamente?", "mis últimos links", "recently added" etc.
    if (/ultimos? (links?|enlaces?|recursos?|a.adidos?|guardados?)|links? (recientes?|a.adidos? recientemente)|recently (added|saved)|last (links?|saved|added)|(que|que) (guarde|anadi|guarde) (ultimamente|hoy|ayer|esta semana)/i.test(msgNorm)) {
      const libText = await loadLibrary();
      const lines = libText.split("\n");
      const ultimosIdx = lines.findIndex(l => l.includes("Últimos añadidos"));
      if (ultimosIdx !== -1) {
        const recents = lines.slice(ultimosIdx + 1).filter(l => l.startsWith("- ")).slice(0, 5);
        if (recents.length > 0) {
          jobs.set(jobId, {
            status: "done",
            content: `🕐 Tus últimos enlaces añadidos:\n${recents.join("\n")}`,
          });
          return;
        }
      }
      // fallback si no hay datos
      jobs.set(jobId, { status: "done", content: "No tengo información sobre cuándo guardaste los enlaces." });
      return;
    }

    // ── Guard: Comandos destructivos — rechazar explícitamente ──────────────────
    // "borra todos mis links", "elimina todos mis datos", "resetea la app"
    // El LLM pequeño tiende a inventar que lo ejecutó. Interceptar antes de llegar al modelo.
    const isDestructiveCmd =
      (/\b(borrar?|borra|eliminar?|elimina)\b/i.test(msgNorm) &&
        /\b(todos?|mis|mi|all|datos?|biblioteca|enlaces?|links?|everything|informacion)\b/i.test(msgNorm)) ||
      /\bdelete all\b|\bclear (all|my) (links?|data|everything)\b/i.test(msgNorm) ||
      /\b(reset(ear?|ea|a)|reiniciar)\b.{0,30}\b(app|stacklume|datos?|biblioteca)\b/i.test(msgNorm);
    if (isDestructiveCmd) {
      jobs.set(jobId, {
        status: "done",
        content: "Para eliminar o gestionar tus enlaces, usa la interfaz de Stacklume directamente. No puedo modificar tu biblioteca desde el chat.",
      });
      return;
    }

    // ── CASO 5c: Atajos de teclado (respuesta determinista) ──────────────────
    // "¿cuál es el atajo para crear un link?", "what's the keyboard shortcut?" etc.
    // El LLM devuelve solo "Ctrl+N" (<10 chars), necesita respuesta completa.
    if (/\b(atajo|atajos|shortcut|shortcuts|teclas? de teclado|hotkey|keybind|teclado)\b/i.test(msgNorm) &&
        !/busca|search|find/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "⌨️ Atajos de Stacklume:\n• Ctrl+K — buscar en tu biblioteca\n• Ctrl+N — crear un nuevo enlace\n• Escape — limpiar búsqueda o salir del modo edición\n\nPuedes usarlos desde cualquier parte de la app.",
      });
      return;
    }

    // ── CASO 5f: Cómo buscar / encontrar un link en Stacklume (determinista) ──
    // "cómo puedo encontrar un link específico", "cómo busco en Stacklume"
    if (/\b(como|how)\b.{0,40}\b(encontrar|buscar|hallar|localizar|find)\b.{0,40}\b(link|enlace|recurso|bookmark)\b/i.test(msgNorm) ||
        /\bcomo (puedo )?(encontrar|buscar|hallar) (un )?(link|enlace|recurso) (rapido|especifico|concreto)/i.test(msgNorm) ||
        /buscar en (la app|stacklume|mi biblioteca|el buscador)/i.test(msgNorm)) {
      jobs.set(jobId, {
        status: "done",
        content: "🔍 La forma más rápida de encontrar un enlace en Stacklume:\n• Ctrl+K — abre el buscador instantáneo desde cualquier parte\n• Barra de filtros lateral — filtra por categoría, etiqueta o texto\n• En modo Lista puedes ordenar y buscar fácilmente",
      });
      return;
    }

    // ── Guard: wantsAdd sin URL → buscar la URL si hay término claro ────────────
    // "guarda la documentación de Vue" sin URL → intentar buscar para encontrar la URL
    if (wantsAdd && !resolvedUrlMatch && !wantsAddPrev) {
      // Extraer el tema que el usuario quiere guardar
      const addTopic = msgNorm
        .replace(/\b(guarda|guardar|guarde[s]?|anade|anadir|agregar|agrega|add|save|bookmark|pon|mete)\b/gi, "")
        .replace(/\b(la documentacion|el sitio|la pagina|la web|el link|el enlace|esto|este|esta|lo|la)\b/gi, "")
        .replace(/\b(de|del|para|sobre)\b/gi, " ")
        .replace(/[¿?¡!,;:]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60);
      if (addTopic.length > 3) {
        // Buscar en web para encontrar la URL oficial
        const searchRes = await executeTool("web_search", { query: `${addTopic} official site` });
        const searchData = JSON.parse(searchRes) as { results?: SearchResult[]; error?: string };
        if (searchData.results?.length) {
          const top = searchData.results[0];
          const list = searchData.results.slice(0, 3).map((r, i) => `${i + 1}. ${r.title}\n   ${r.url}`).join("\n\n");
          g.__llmLastSearch = searchData.results.slice(0, 5);
          jobs.set(jobId, {
            status: "done",
            content: `¿Cuál de estos quieres guardar?\n\n${list}\n\nDi "guarda el 1" o pega directamente la URL completa.`,
          });
          return;
        }
      }
      jobs.set(jobId, {
        status: "done",
        content: "Para guardar un enlace necesito la URL completa 🔗\nEjemplo: guarda https://vuejs.org\nO bien: añade https://docs.astro.build",
      });
      return;
    }

    // ── CASO 5: Q&A libre con LLM + tool calling agéntico ─────────────────────
    // El LLM puede decidir llamar herramientas (search_library, web_search) según
    // el contexto. Máximo 1 ronda de tool calling para mantener latencia controlada.
    // Usamos un resumen COMPACTO de la biblioteca para no saturar el context window del modelo.
    const libraryText = await loadLibrarySummary();

    const systemPrompt = `Eres Stacklume AI, asistente de gestión de enlaces web. Responde en español, en texto plano sin asteriscos ni #. Sé breve, útil y directo. Emojis solo cuando aporten valor.

CAPACIDADES:
- Responder preguntas sobre tecnologías, frameworks, desarrollo web y la app Stacklume
- Dar recomendaciones sin necesitar URLs (solo di los nombres, el usuario las buscará)
- Usar search_library si el usuario pregunta por sus links guardados
- Usar web_search si el usuario pide buscar en internet

STACKLUME: Gestión de bookmarks con modo Bento/Kanban/Lista, 120+ widgets (notas, tareas, clima, GitHub, etc.), 23 temas, importar/exportar, Ctrl+K buscar, Ctrl+N nuevo.

BIBLIOTECA DEL USUARIO: ${libraryText}

REGLAS CRÍTICAS:
1. NUNCA escribas URLs inventadas. Solo menciona nombres de herramientas/frameworks.
2. Para URLs reales, usa SOLO las de la biblioteca del usuario o resultados de herramientas.
3. NUNCA digas que guardaste o borraste algo que no hayas hecho.
4. Si no sabes algo, dilo honestamente. No inventes datos.`;

    // Herramientas disponibles para el LLM en Q&A libre
    const toolDefinitions = [
      {
        type: "function" as const,
        function: {
          name: "search_library",
          description: "Busca en la biblioteca personal del usuario. Úsala cuando pregunte si tiene links sobre algo, o para enriquecer tu respuesta con sus recursos guardados.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Tema, tecnología o herramienta a buscar" },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "function" as const,
        function: {
          name: "web_search",
          description: "Busca en internet recursos, artículos y documentación actualizados. Úsala cuando el usuario pida buscar algo o quiera descubrir recursos online.",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Consulta de búsqueda" },
            },
            required: ["query"],
          },
        },
      },
    ];

    // Limpiar historial antes de pasarlo al LLM:
    // - Quitar emojis de sistema (📚, ✅, ⚠️, 🔍) que confunden al modelo pequeño
    // - Truncar respuestas largas del asistente a los primeros 200 chars
    // - Solo mensajes user/assistant, últimos 8
    const cleanHistoryMsg = (content: string, role: string): string => {
      if (role !== "assistant") return content;
      // Simplificar listas numeradas "1. Título\n   URL" → solo los títulos
      const simplified = content
        .replace(/^\d+\.\s+(.+)\n\s+https?:\/\/[^\n]+/gm, "• $1")
        .replace(/^[📚✅⚠️🔍🕐📂⌨️🎨💡]\s*/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return simplified.slice(0, 300) + (simplified.length > 300 ? "…" : "");
    };

    const messages: LlmMessage[] = [
      { role: "system", content: systemPrompt },
      ...history
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-8)
        .map((m) => ({ role: m.role as string, content: cleanHistoryMsg(m.content, m.role) })),
      { role: "user", content: userMessage },
    ];

    // URLs reales de herramientas (para filtro anti-alucinación)
    const allowedToolUrls = new Set<string>();
    let formattedToolContent: string | null = null;

    // Primera llamada — el LLM puede usar herramientas o responder directamente
    const resp1 = await fetch(llamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages,
        tools: toolDefinitions,
        tool_choice: "auto",
        stream: false,
        temperature: 0.3,
        max_tokens: 512,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!resp1.ok) throw new Error(`LLM HTTP ${resp1.status}`);
    const data1 = (await resp1.json()) as {
      choices?: Array<{ message?: LlmMessage; finish_reason?: string }>;
      error?: string;
    };
    if (data1.error) throw new Error(String(data1.error));

    const firstMsg = data1.choices?.[0]?.message;
    const toolCalls = firstMsg?.tool_calls;
    let llmContent: string;

    if (toolCalls && toolCalls.length > 0) {
      // ── El LLM decidió llamar herramientas ────────────────────────────────
      messages.push({
        role: "assistant",
        content: firstMsg?.content ?? null,
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments ?? "{}");
        } catch {
          args = {};
        }
        const toolResult = await executeTool(tc.function.name, args);

        // Recoger URLs reales para el filtro anti-alucinación
        try {
          const parsed = JSON.parse(toolResult) as {
            results?: Array<{ title?: string; url?: string; description?: string }>;
            count?: number;
          };
          if (parsed.results && parsed.results.length > 0) {
            for (const r of parsed.results) {
              if (r.url) allowedToolUrls.add(r.url.toLowerCase().replace(/\/+$/, ""));
            }
            // Formatear resultados de biblioteca en el formato 📚
            if (tc.function.name === "search_library") {
              const list = parsed.results
                .slice(0, 8)
                .map((r, i) => `${i + 1}. ${r.title ?? r.url}\n   ${r.url}`)
                .join("\n\n");
              formattedToolContent = `📚 Encontré ${parsed.results.length} enlace${parsed.results.length === 1 ? "" : "s"} en tu biblioteca:\n\n${list}`;
            }
            // Formatear resultados de búsqueda web en el formato numerado
            if (tc.function.name === "web_search") {
              const list = parsed.results
                .slice(0, 5)
                .map((r, i) => `${i + 1}. ${r.title ?? r.url}\n   ${r.url}`)
                .join("\n\n");
              // Guardar para follow-up CASO 1 ("añade los primeros")
              g.__llmLastSearch = parsed.results.slice(0, 5).map((r) => ({
                title: r.title ?? "",
                url: r.url ?? "",
                description: r.description ?? "",
              }));
              formattedToolContent = `Aquí tienes los resultados:\n\n${list}`;
            }
          }
        } catch {
          /* ignore parse errors */
        }

        messages.push({ role: "tool", content: toolResult, tool_call_id: tc.id });
      }

      // Segunda llamada con los resultados de las herramientas
      let secondRawContent = "";
      try {
        const resp2 = await fetch(llamaUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "local-model",
            messages,
            stream: false,
            temperature: 0.3,
            max_tokens: 512,
            chat_template_kwargs: { enable_thinking: false },
          }),
          signal: AbortSignal.timeout(90_000),
        });
        if (resp2.ok) {
          const data2 = (await resp2.json()) as {
            choices?: Array<{ message?: { content?: string | null } }>;
            error?: string;
          };
          secondRawContent = data2.error ? "" : (data2.choices?.[0]?.message?.content ?? "");
        }
      } catch {
        /* fall through to formattedToolContent fallback */
      }

      const cleaned2 = cleanLlmText(secondRawContent);

      // Combinar: resultados formateados + comentario del LLM (si es útil y no repetitivo)
      if (formattedToolContent) {
        const commentaryIsUseful =
          cleaned2.length > 30 &&
          !cleaned2.startsWith("Aquí tienes") &&
          !cleaned2.startsWith("📚");
        llmContent = commentaryIsUseful
          ? `${formattedToolContent}\n\n${cleaned2}`
          : formattedToolContent;
      } else {
        llmContent =
          cleaned2.length > 10
            ? cleaned2
            : "No pude obtener información sobre eso. Intenta reformular tu pregunta.";
      }
    } else {
      // ── Sin tool calls — respuesta directa ───────────────────────────────
      llmContent = cleanLlmText(firstMsg?.content ?? "Sin respuesta.");
    }

    // ── Post-processing ───────────────────────────────────────────────────────

    // Detectar eco del system prompt (el modelo pequeño a veces repite sus propias instrucciones).
    const firstLineRaw = llmContent.split("\n")[0].trim();
    const looksLikeSystemPromptLeak =
      /SIEMPRE EN TEXTO PLANO|Eres Stacklume AI|NUNCA inventes|REGLAS CR.TICAS|BIBLIOTECA DEL USUARIO/i.test(llmContent) ||
      /^SIEMPRE\s+(EN\s+TEXTO|BUSCA\s|USA\s+EMOJIS|SE\s+BREVE|SIN\s+(MARKDOWN|ASTERISCOS))/i.test(firstLineRaw);
    if (looksLikeSystemPromptLeak) {
      llmContent = "Lo siento, no entendí eso. Prueba a reformular tu pregunta.";
    }

    // Filtro anti-alucinación: eliminar líneas con URLs inventadas.
    // Se permiten URLs de la biblioteca del usuario Y URLs reales de herramientas.
    const urlsInLibrary = new Set(
      (await withRetry(
        () => db.select({ url: links.url }).from(links).where(isNull(links.deletedAt)),
        { operationName: "llm url validation" }
      )).map((l) => l.url.toLowerCase())
    );
    const filteredLines = llmContent.split("\n").filter((line) => {
      const urlsInLine = line.match(/https?:\/\/[^\s)>]+/g);
      if (!urlsInLine) return true;
      return urlsInLine.every((u) => {
        const normalized = u.toLowerCase().replace(/\/+$/, "");
        return urlsInLibrary.has(normalized) || allowedToolUrls.has(normalized);
      });
    });
    llmContent = filteredLines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
      || "No encontré información relevante en tu biblioteca. Prueba con 'busca [tema]' para buscar en internet.";

    // Strip del preamble defensivo "No puedo inventar URLs..." cuando va seguido de contenido útil.
    const defensivePreamble = /^(no puedo inventar url[^\n]*|no puedo mencionar url[^\n]*|no hay [^\n]*(biblioteca|lista)[^\n]*|no tengo acceso[^\n]*)\n+/gi;
    const stripped = llmContent.replace(defensivePreamble, "").trim();
    if (stripped.length >= 10) llmContent = stripped;

    // Fallback para respuestas demasiado cortas (eco de emoji, número suelto, etc.)
    if (llmContent.trim().length < 10) {
      llmContent = "No entendí del todo esa pregunta 😅 Puedes decirme: 'busca [tema]' para buscar en la web, 'guarda URL' para añadir un enlace, o pregúntame sobre cómo funciona Stacklume.";
    }

    jobs.set(jobId, {
      status: "done",
      content: llmContent,
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
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { userMessage, history = [], llamaPort: clientPort } = body;
  if (!userMessage?.trim())
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
  runLlmJob(jobId, resolvedPort, userMessage.trim(), history);
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
