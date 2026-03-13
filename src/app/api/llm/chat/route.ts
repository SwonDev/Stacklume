import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db, links, categories, tags, withRetry, generateId } from "@/lib/db";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ConversationMessage {
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

type JobResult =
  | { status: "pending" }
  | { status: "done"; content: string }
  | { status: "error"; error: string };

// ─── Job store en globalThis (sobrevive HMR en dev) ───────────────────────────

const g = globalThis as unknown as { __llmJobs?: Map<string, JobResult> };
if (!g.__llmJobs) g.__llmJobs = new Map();
const jobs = g.__llmJobs;

// ─── Herramientas disponibles para el modelo ──────────────────────────────────

const LLM_TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "search_links",
      description:
        "Busca enlaces en la biblioteca del usuario por título, descripción o URL. Úsalo cuando el usuario pregunte qué tiene guardado, busque algo concreto o quiera ver sus enlaces.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Término de búsqueda (título, URL o descripción)",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_links_by_category",
      description:
        "Obtiene todos los enlaces de una categoría específica. Úsalo cuando el usuario mencione una categoría concreta.",
      parameters: {
        type: "object",
        properties: {
          category_name: {
            type: "string",
            description: "Nombre de la categoría",
          },
        },
        required: ["category_name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_stats",
      description:
        "Obtiene estadísticas de la biblioteca: total de enlaces, categorías y etiquetas. Úsalo cuando el usuario pregunte cuánto tiene guardado.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "add_link",
      description:
        "Añade un nuevo enlace a la biblioteca del usuario. Úsalo solo cuando el usuario pida explícitamente guardar o añadir un enlace.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "URL completa del enlace" },
          title: { type: "string", description: "Título del enlace" },
          description: {
            type: "string",
            description: "Descripción breve (opcional)",
          },
          category_name: {
            type: "string",
            description: "Nombre de categoría existente (opcional)",
          },
        },
        required: ["url"],
      },
    },
  },
];

// ─── Ejecución de herramientas ─────────────────────────────────────────────────

async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<string> {
  try {
    switch (name) {
      case "search_links": {
        const query = String(args.query || "").trim();
        if (!query) return JSON.stringify({ error: "query vacía" });
        const results = await withRetry(
          () =>
            db
              .select({
                id: links.id,
                title: links.title,
                url: links.url,
                description: links.description,
              })
              .from(links)
              .where(
                isNull(links.deletedAt)
              )
              .limit(10),
          { operationName: "llm search_links" }
        );
        // Filtrar en JS (compatible con SQLite y PostgreSQL sin ilike)
        const q = query.toLowerCase();
        const filtered = results.filter(
          (l) =>
            (l.title?.toLowerCase().includes(q) ?? false) ||
            (l.url?.toLowerCase().includes(q) ?? false) ||
            (l.description?.toLowerCase().includes(q) ?? false)
        );
        return JSON.stringify(
          filtered.length > 0
            ? { links: filtered }
            : { message: `No se encontraron enlaces para "${query}"` }
        );
      }

      case "get_links_by_category": {
        const categoryName = String(args.category_name || "").trim();
        if (!categoryName)
          return JSON.stringify({ error: "category_name vacío" });
        const allCategories = await withRetry(
          () =>
            db
              .select({ id: categories.id, name: categories.name })
              .from(categories)
              .where(isNull(categories.deletedAt)),
          { operationName: "llm get categories" }
        );
        const cat = allCategories.find((c) =>
          c.name.toLowerCase().includes(categoryName.toLowerCase())
        );
        if (!cat)
          return JSON.stringify({
            message: `Categoría "${categoryName}" no encontrada`,
          });
        const catLinks = await withRetry(
          () =>
            db
              .select({
                id: links.id,
                title: links.title,
                url: links.url,
                description: links.description,
              })
              .from(links)
              .where(isNull(links.deletedAt))
              .limit(20),
          { operationName: "llm links by category" }
        );
        const filtered = catLinks.filter(
          (l) =>
            (l as unknown as { categoryId: string | null }).categoryId ===
            cat.id
        );
        return JSON.stringify({
          category: cat.name,
          links: filtered,
          total: filtered.length,
        });
      }

      case "get_stats": {
        const [linkCount, catCount, tagCount] = await Promise.all([
          withRetry(
            () =>
              db.select({ id: links.id }).from(links).where(isNull(links.deletedAt)),
            { operationName: "llm stats links" }
          ),
          withRetry(
            () =>
              db
                .select({ id: categories.id })
                .from(categories)
                .where(isNull(categories.deletedAt)),
            { operationName: "llm stats categories" }
          ),
          withRetry(
            () =>
              db
                .select({ id: tags.id })
                .from(tags)
                .where(isNull(tags.deletedAt)),
            { operationName: "llm stats tags" }
          ),
        ]);
        return JSON.stringify({
          total_links: linkCount.length,
          total_categories: catCount.length,
          total_tags: tagCount.length,
        });
      }

      case "add_link": {
        const url = String(args.url || "").trim();
        if (!url || !url.startsWith("http"))
          return JSON.stringify({ error: "URL inválida" });
        const title = String(args.title || url).trim();
        const description = args.description ? String(args.description) : null;
        const categoryName = args.category_name
          ? String(args.category_name)
          : null;

        let categoryId: string | null = null;
        if (categoryName) {
          const allCats = await withRetry(
            () =>
              db
                .select({ id: categories.id, name: categories.name })
                .from(categories)
                .where(isNull(categories.deletedAt)),
            { operationName: "llm add_link find cat" }
          );
          const cat = allCats.find((c) =>
            c.name.toLowerCase().includes(categoryName.toLowerCase())
          );
          if (cat) categoryId = cat.id;
        }

        const [created] = await withRetry(
          () =>
            db
              .insert(links)
              .values({
                id: generateId(),
                url,
                title,
                description,
                categoryId,
              })
              .returning({ id: links.id, url: links.url, title: links.title }),
          { operationName: "llm add_link" }
        );
        return JSON.stringify({
          success: true,
          link: created,
          message: `Enlace "${title}" añadido correctamente`,
        });
      }

      default:
        return JSON.stringify({ error: `Herramienta desconocida: ${name}` });
    }
  } catch (err) {
    return JSON.stringify({
      error: err instanceof Error ? err.message : "Error ejecutando herramienta",
    });
  }
}

// ─── Sistema de prompt ─────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  return `Eres un asistente personal de gestión de enlaces integrado en Stacklume, una aplicación de escritorio.
Tu objetivo es ayudar al usuario a gestionar, buscar y organizar sus enlaces guardados.

REGLAS IMPORTANTES:
- Responde SIEMPRE en el mismo idioma que el usuario (español o inglés según corresponda)
- Usa las herramientas disponibles cuando el usuario pregunte sobre sus enlaces o quiera añadir uno
- Sé conciso y útil — no añadas texto innecesario
- Cuando uses search_links, muestra los resultados de forma clara con título y URL
- NO inventes información — si no sabes algo, usa las herramientas para consultarlo
- Si el usuario pide añadir un enlace, usa add_link y confirma que se añadió

CAPACIDADES:
- Buscar en la biblioteca de enlaces del usuario
- Filtrar por categorías
- Ver estadísticas de la biblioteca
- Añadir nuevos enlaces directamente desde el chat`;
}

// ─── Lógica principal del job ──────────────────────────────────────────────────

async function runLlmJob(
  jobId: string,
  llamaPort: string,
  userMessage: string,
  history: ConversationMessage[]
): Promise<void> {
  const llamaUrl = `http://127.0.0.1:${llamaPort}/v1/chat/completions`;

  const messages: Array<ConversationMessage | { role: "system"; content: string }> = [
    { role: "system" as const, content: buildSystemPrompt() },
    ...history,
    { role: "user" as const, content: userMessage },
  ];

  // Bucle de tool calling (máximo 5 iteraciones para evitar bucles infinitos)
  let iterations = 0;
  const MAX_ITERATIONS = 5;

  try {
    while (iterations < MAX_ITERATIONS) {
      iterations++;

      const reqBody = {
        model: "local-model", // llama-server ignora el nombre del modelo
        messages,
        tools: LLM_TOOLS,
        tool_choice: "auto",
        stream: false,
        temperature: 0.7,
        max_tokens: 1024,
      };

      const response = await fetch(llamaUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
        signal: AbortSignal.timeout(120_000), // 120s máximo por llamada
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => `HTTP ${response.status}`);
        jobs.set(jobId, { status: "error", error: `Error del servidor LLM: ${errText}` });
        return;
      }

      const data = (await response.json()) as {
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: ToolCall[];
            role?: string;
          };
          finish_reason?: string;
        }>;
        error?: string;
      };

      if (data.error) {
        jobs.set(jobId, { status: "error", error: data.error });
        return;
      }

      const choice = data.choices?.[0];
      if (!choice?.message) {
        jobs.set(jobId, { status: "error", error: "Respuesta vacía del modelo" });
        return;
      }

      const msg = choice.message;

      // Si hay tool_calls, ejecutarlos y continuar el bucle
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Añadir la respuesta del asistente al historial
        messages.push({
          role: "assistant",
          content: msg.content ?? "",
          tool_calls: msg.tool_calls,
        });

        // Ejecutar cada tool call
        for (const tc of msg.tool_calls) {
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(tc.function.arguments || "{}");
          } catch {
            toolArgs = {};
          }

          const toolResult = await executeTool(tc.function.name, toolArgs);

          messages.push({
            role: "tool",
            content: toolResult,
            tool_call_id: tc.id,
          });
        }

        // Continuar el bucle para obtener la respuesta final
        continue;
      }

      // Respuesta final sin tool calls
      let content = msg.content ?? "";
      // Eliminar bloques <think>...</think> de modelos razonadores
      content = content.replace(/<think>[\s\S]*?<\/think>\n?/g, "").trim();

      jobs.set(jobId, { status: "done", content });
      return;
    }

    // Máximo de iteraciones alcanzado
    jobs.set(jobId, {
      status: "error",
      error: "Se alcanzó el límite de llamadas a herramientas",
    });
  } catch (err) {
    const error =
      err instanceof Error
        ? err.name === "TimeoutError"
          ? "Tiempo de espera agotado (120s). El modelo puede estar cargándose."
          : err.message
        : "Error desconocido al conectar con el LLM local";
    jobs.set(jobId, { status: "error", error });
  } finally {
    setTimeout(() => jobs.delete(jobId), 10 * 60 * 1000);
  }
}

// ─── Handlers HTTP ─────────────────────────────────────────────────────────────

/**
 * POST /api/llm/chat
 * Inicia un job de chat con el LLM local y devuelve { jobId } inmediatamente.
 */
export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { error: "Solo disponible en la app de escritorio" },
      { status: 403 }
    );
  }

  const llamaPort = process.env.LLAMA_PORT;
  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json(
      { error: "LLM local no configurado. Instala el modelo primero." },
      { status: 503 }
    );
  }

  let body: {
    userMessage: string;
    history?: ConversationMessage[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
  }

  const { userMessage, history = [] } = body;

  if (!userMessage?.trim()) {
    return NextResponse.json({ error: "userMessage es obligatorio" }, { status: 400 });
  }

  const jobId = crypto.randomUUID();
  jobs.set(jobId, { status: "pending" });

  // Ejecutar en background sin await
  runLlmJob(jobId, llamaPort, userMessage.trim(), history);

  return NextResponse.json({ jobId });
}

/**
 * GET /api/llm/chat?jobId=xxx
 * Consulta el estado de un job en curso.
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
