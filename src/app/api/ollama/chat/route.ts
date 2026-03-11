import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db, links, categories, tags, linkTags, withRetry } from "@/lib/db";
import { buildOllamaSystemPrompt } from "@/lib/ollama";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en la app de escritorio" }, { status: 403 });
  }

  let body: {
    model: string;
    ollamaUrl?: string;
    userMessage: string;
    history?: ConversationMessage[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const { model, ollamaUrl = "http://localhost:11434", userMessage, history = [] } = body;

  if (!model || !userMessage?.trim()) {
    return NextResponse.json({ error: "model y userMessage son obligatorios" }, { status: 400 });
  }

  try {
    // Cargar datos de la BD en el servidor (no en el cliente)
    const [allLinks, allCategories, allTags, allLinkTags] = await Promise.all([
      withRetry(
        () => db.select({
          id: links.id,
          title: links.title,
          url: links.url,
          description: links.description,
          categoryId: links.categoryId,
          isFavorite: links.isFavorite,
        }).from(links).where(isNull(links.deletedAt)),
        { operationName: "ollama links" }
      ),
      withRetry(
        () => db.select({ id: categories.id, name: categories.name })
          .from(categories).where(isNull(categories.deletedAt)),
        { operationName: "ollama categories" }
      ),
      withRetry(
        () => db.select({ id: tags.id, name: tags.name })
          .from(tags).where(isNull(tags.deletedAt)),
        { operationName: "ollama tags" }
      ),
      withRetry(
        () => db.select({ linkId: linkTags.linkId, tagId: linkTags.tagId }).from(linkTags),
        { operationName: "ollama linkTags" }
      ),
    ]);

    // Construir mapa tagId → nombre para asociar tags a links
    const tagNameById = new Map(allTags.map((t) => [t.id, t.name]));
    const linkTagsMap = new Map<string, { name: string }[]>();
    for (const lt of allLinkTags) {
      const tagName = tagNameById.get(lt.tagId);
      if (tagName) {
        const existing = linkTagsMap.get(lt.linkId) ?? [];
        existing.push({ name: tagName });
        linkTagsMap.set(lt.linkId, existing);
      }
    }

    const linksWithTags = allLinks.map((l) => ({
      ...l,
      isFavorite: l.isFavorite ?? false,
      tags: linkTagsMap.get(l.id) ?? [],
    }));

    // Construir el system prompt en el servidor
    const systemPrompt = buildOllamaSystemPrompt({
      links: linksWithTags,
      categories: allCategories,
      tags: allTags,
      userQuery: userMessage,
    });

    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => `HTTP ${ollamaRes.status}`);
      return NextResponse.json({ error: errText }, { status: ollamaRes.status });
    }

    const data = await ollamaRes.json() as {
      message?: { content?: string; thinking?: string };
      error?: string;
    };

    // Eliminar bloques <think>...</think> que generan modelos de razonamiento (qwen3, deepseek-r1, etc.)
    let content = data.message?.content ?? "";
    content = content.replace(/<think>[\s\S]*?<\/think>\n?/g, "").trim();

    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      return NextResponse.json(
        { error: "Tiempo de espera agotado (120s). Prueba con un modelo más ligero." },
        { status: 408 }
      );
    }
    const message = err instanceof Error ? err.message : "Error de conexión con Ollama";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
