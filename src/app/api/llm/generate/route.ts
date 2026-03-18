import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/llm/generate
 * Genera título, descripción o etiquetas para un enlace usando el LLM local.
 * Body: { url: string, currentTitle?: string, currentDescription?: string, type: "title" | "description" | "tags", llamaPort?: number }
 */
export async function POST(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en la app de escritorio" }, { status: 403 });
  }

  let body: {
    url: string;
    currentTitle?: string;
    currentDescription?: string;
    type: "title" | "description" | "tags";
    llamaPort?: number;
    enableThinking?: boolean;
    modelFamily?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
  }

  const { url, currentTitle, currentDescription, type, llamaPort: clientPort, enableThinking = false, modelFamily = "qwen3" } = body;
  if (!url || !type) {
    return NextResponse.json({ error: "url y type son obligatorios" }, { status: 400 });
  }

  const llamaPort = clientPort && clientPort > 0
    ? clientPort.toString()
    : (process.env.LLAMA_PORT || "0");

  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json({ error: "LLM local no disponible" }, { status: 503 });
  }

  const llamaUrl = `http://127.0.0.1:${llamaPort}/v1/chat/completions`;

  // Construir prompt según el tipo de generación
  let systemPrompt: string;
  let userPrompt: string;

  const context = [
    `URL: ${url}`,
    currentTitle ? `Título actual: ${currentTitle}` : "",
    currentDescription ? `Descripción actual: ${currentDescription}` : "",
  ].filter(Boolean).join("\n");

  switch (type) {
    case "title":
      systemPrompt = "Eres un experto en SEO y copywriting. Genera un título conciso y descriptivo para un enlace web. Responde SOLO con el título, sin comillas, sin explicaciones, sin formato adicional. Máximo 80 caracteres.";
      userPrompt = `Genera un título para este enlace:\n${context}`;
      break;

    case "description":
      systemPrompt = "Eres un experto en redacción web. Genera una descripción breve y útil para un enlace. Responde SOLO con la descripción, sin comillas, sin formato adicional. Máximo 200 caracteres. Describe qué es la página y para qué sirve.";
      userPrompt = `Genera una descripción para este enlace:\n${context}`;
      break;

    case "tags":
      systemPrompt = "Eres un experto en categorización de contenido web. Genera entre 2 y 5 etiquetas relevantes para clasificar este enlace. Responde SOLO con las etiquetas separadas por comas, sin explicaciones. Ejemplo: Desarrollo Web, React, Tutorial";
      userPrompt = `Genera etiquetas para este enlace:\n${context}`;
      break;

    default:
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  // Thinking: solo para modelos que lo soportan (qwen3, deepseek)
  const thinkingFamilies = ["qwen3", "deepseek"];
  const useThinking = enableThinking && thinkingFamilies.includes(modelFamily);

  try {
    const resp = await fetch(llamaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local-model",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
        // Con thinking: el modelo razona internamente antes de responder → mejor calidad
        temperature: useThinking ? 1.0 : 0.7,
        top_p: useThinking ? 0.95 : 0.9,
        presence_penalty: useThinking ? 1.5 : 0,
        max_tokens: useThinking ? 1024 : 256,
        chat_template_kwargs: {
          enable_thinking: useThinking,
          ...(useThinking ? {} : { thinking_budget: 0 }),
        },
        ...(useThinking ? { reasoning_format: "deepseek" } : {}),
      }),
      signal: AbortSignal.timeout(useThinking ? 60_000 : 30_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Error del LLM: HTTP ${resp.status}` },
        { status: 502 }
      );
    }

    const data = await resp.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    let result = data.choices?.[0]?.message?.content?.trim() ?? "";

    // Limpiar artefactos del LLM
    result = result
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/^["']|["']$/g, "") // Quitar comillas envolventes
      .replace(/^\*\*|\*\*$/g, "") // Quitar negritas
      .trim();

    if (!result) {
      return NextResponse.json({ error: "El modelo no generó contenido" }, { status: 500 });
    }

    // Para tags, devolver como array
    if (type === "tags") {
      const tags = result
        .split(/[,\n]+/)
        .map((t: string) => t.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter((t: string) => t.length > 0 && t.length < 50);
      return NextResponse.json({ tags });
    }

    return NextResponse.json({ result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
