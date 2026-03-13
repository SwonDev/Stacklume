import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db, links, categories, tags, linkTags, withRetry } from "@/lib/db";
import { buildOllamaSystemPrompt } from "@/lib/ollama";

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

type JobResult =
  | { status: "pending" }
  | { status: "done"; content: string }
  | { status: "error"; error: string };

/**
 * Store de jobs en memoria — usa globalThis para sobrevivir HMR en Next.js dev
 * y persistir entre requests en el mismo proceso Node.js (producción standalone).
 * Se limpia automáticamente a los 10 minutos por job.
 */
const g = globalThis as unknown as { __ollamaJobs?: Map<string, JobResult> };
if (!g.__ollamaJobs) g.__ollamaJobs = new Map();
const jobs = g.__ollamaJobs;

/**
 * Ejecuta el job de Ollama en segundo plano (no bloqueante para WebView2).
 * Se llama sin await desde el handler POST, por lo que la respuesta HTTP
 * se envía de inmediato y esta función continúa en el event loop de Node.js.
 */
async function runOllamaJob(
  jobId: string,
  model: string,
  ollamaUrl: string,
  userMessage: string,
  history: ConversationMessage[]
): Promise<void> {
  try {
    // 1. Cargar datos de la BD secuencialmente (evitar problemas de concurrencia SQLite)
    const allLinks = await withRetry(
      () =>
        db
          .select({
            id: links.id,
            title: links.title,
            url: links.url,
            description: links.description,
            categoryId: links.categoryId,
            isFavorite: links.isFavorite,
          })
          .from(links)
          .where(isNull(links.deletedAt)),
      { operationName: "ollama links" }
    );

    const allCategories = await withRetry(
      () =>
        db
          .select({ id: categories.id, name: categories.name })
          .from(categories)
          .where(isNull(categories.deletedAt)),
      { operationName: "ollama categories" }
    );

    const allTags = await withRetry(
      () =>
        db
          .select({ id: tags.id, name: tags.name })
          .from(tags)
          .where(isNull(tags.deletedAt)),
      { operationName: "ollama tags" }
    );

    const allLinkTags = await withRetry(
      () =>
        db
          .select({ linkId: linkTags.linkId, tagId: linkTags.tagId })
          .from(linkTags),
      { operationName: "ollama linkTags" }
    );

    // 2. Mapear tags a links
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

    // 3. Construir system prompt
    const systemPrompt = buildOllamaSystemPrompt({
      links: linksWithTags,
      categories: allCategories,
      tags: allTags,
      userQuery: userMessage,
    });

    // 4. Llamar a Ollama con stream:false (respuesta completa, sin streaming)
    const ollamaMessages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const ollamaRes = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: false,
        think: false, // deshabilitar chain-of-thought en qwen3.5, deepseek-r1, etc.
        options: {
          temperature: 0.7,
          num_predict: 1200, // límite para evitar respuestas infinitas y congelamiento
        },
      }),
      signal: AbortSignal.timeout(90_000), // 90s máximo (eran 120s)
    });

    if (!ollamaRes.ok) {
      const errText = await ollamaRes.text().catch(() => `HTTP ${ollamaRes.status}`);
      jobs.set(jobId, { status: "error", error: errText });
      return;
    }

    const data = (await ollamaRes.json()) as {
      message?: { content?: string };
      error?: string;
    };

    // Eliminar bloques <think>...</think> de modelos razonadores (qwen3, deepseek-r1, etc.)
    let content = data.message?.content ?? "";
    content = content.replace(/<think>[\s\S]*?<\/think>\n?/g, "").trim();

    jobs.set(jobId, { status: "done", content });
  } catch (err) {
    const error =
      err instanceof Error
        ? err.name === "TimeoutError"
          ? "Tiempo de espera agotado (120s). Prueba con un modelo más ligero."
          : err.message
        : "Error desconocido al conectar con Ollama";
    jobs.set(jobId, { status: "error", error });
  } finally {
    // Limpiar el job 10 minutos después de completarse
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
}

/**
 * POST /api/ollama/chat
 * Inicia un job de chat con Ollama y devuelve { jobId } de inmediato.
 * El procesamiento real ocurre en segundo plano para no bloquear WebView2.
 */
export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { error: "Solo disponible en la app de escritorio" },
      { status: 403 }
    );
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
    return NextResponse.json(
      { error: "model y userMessage son obligatorios" },
      { status: 400 }
    );
  }

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "pending" });

  // Iniciar procesamiento en background — responde inmediatamente sin esperar a Ollama
  runOllamaJob(jobId, model, ollamaUrl, userMessage, history);

  return NextResponse.json({ jobId });
}

/**
 * GET /api/ollama/chat?jobId=xxx
 * Consulta el estado de un job de chat.
 * Respuestas: { status: "pending" } | { status: "done", content } | { status: "error", error }
 */
export async function GET(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { error: "Solo disponible en la app de escritorio" },
      { status: 403 }
    );
  }

  const jobId = req.nextUrl.searchParams.get("jobId");
  if (!jobId) {
    return NextResponse.json({ error: "jobId requerido" }, { status: 400 });
  }

  const result = jobs.get(jobId);
  if (!result) {
    return NextResponse.json(
      { error: "Job no encontrado o expirado" },
      { status: 404 }
    );
  }

  return NextResponse.json(result);
}
