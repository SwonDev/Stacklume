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

  // Buscar puerto LLM: 1) del cliente, 2) env LLAMA_PORT, 3) buscar en puertos comunes
  let llamaPort = clientPort && clientPort > 0
    ? clientPort.toString()
    : (process.env.LLAMA_PORT || "");

  // Si no hay puerto, intentar encontrar llama-server escuchando en puertos recientes
  if (!llamaPort || llamaPort === "0") {
    // En producción Tauri, LLAMA_PORT siempre está seteado. En dev, el frontend
    // debe pasar el puerto. Si ninguno funciona, probar los puertos más comunes.
    for (const testPort of [8080, 8099]) {
      try {
        const probe = await fetch(`http://127.0.0.1:${testPort}/health`, { signal: AbortSignal.timeout(500) });
        if (probe.ok) { llamaPort = String(testPort); break; }
      } catch { /* */ }
    }
  }

  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json({ error: "LLM local no disponible. Abre el chat de IA primero." }, { status: 503 });
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
      systemPrompt = "Output ONLY a short title. No quotes, no explanation, no reasoning, no bullet points. Maximum 60 characters. Just the title text.";
      userPrompt = `Generate a title for this link:\n${context}`;
      break;

    case "description":
      systemPrompt = "Output ONLY a brief description. No quotes, no explanation, no reasoning, no bullet points. Maximum 150 characters. Just the description text.";
      userPrompt = `Generate a description for this link:\n${context}`;
      break;

    case "tags":
      systemPrompt = "Output ONLY comma-separated tags. No explanation. Example output: React, Tutorial, Frontend";
      userPrompt = `Generate tags for this link:\n${context}`;
      break;

    default:
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  // Thinking DESACTIVADO para generación de campos cortos.
  // Qwen3 con thinking mezcla razonamiento en content ("Wait, let me...").
  // Para tareas de 1 línea, non-thinking produce resultados limpios y rápidos.
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
        temperature: 1.0,
        top_p: 1.0,
        presence_penalty: 2.0,
        max_tokens: 200,
        chat_template_kwargs: { enable_thinking: false, thinking_budget: 0 },
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!resp.ok) {
      return NextResponse.json(
        { error: `Error del LLM: HTTP ${resp.status}` },
        { status: 502 }
      );
    }

    const data = await resp.json() as {
      choices?: Array<{ message?: { content?: string; reasoning_content?: string } }>;
    };

    const msg = data.choices?.[0]?.message;
    let result = msg?.content?.trim() ?? "";

    // Limpiar artefactos del LLM — thinking leaks, markdown, etc.
    result = result
      .replace(/<think>[\s\S]*?<\/think>/g, "")
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
      // Eliminar líneas de razonamiento interno
      .replace(/^[\s*-]*(?:Wait|Let me|Hmm|Ok|Okay|So,?\s|Now|I (?:need|should|think|see|will|can)|The user|Looking at|First|Actually|Let's|Maybe|Perhaps|Alright|Since|Because|Given|Based on|Here|This)[^\n]*$/gim, "")
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/^\*\*(.+)\*\*$/gm, "$1") // **bold** → bold
      .replace(/^\*\s+/gm, "") // bullet points
      .replace(/^#+\s*/gm, "")  // headers markdown
      .replace(/\n{2,}/g, "\n")
      .trim();

    // Si el resultado todavía parece razonamiento (muy largo o tiene múltiples líneas con puntuación),
    // tomar solo la última línea limpia como respuesta final
    if (result.length > 200 && type !== "description") {
      const lines = result.split("\n").map(l => l.trim()).filter(l => l.length > 2);
      if (lines.length > 0) {
        result = lines[lines.length - 1]; // Última línea = respuesta final
      }
    }

    // Para título: tomar solo la primera línea
    if (type === "title") {
      result = result.split("\n")[0]?.trim() ?? result;
      if (result.length > 80) result = result.slice(0, 77) + "...";
    }
    // Para descripción: limitar a 200 chars
    if (type === "description" && result.length > 200) {
      result = result.slice(0, 197) + "...";
    }

    // Si el contenido está vacío pero hay reasoning_content, intentar extraer de ahí
    if (!result && msg?.reasoning_content) {
      // A veces el modelo pone la respuesta dentro del bloque de razonamiento
      const lastLine = msg.reasoning_content.trim().split("\n").pop()?.trim() ?? "";
      if (lastLine.length > 5 && lastLine.length < 300) {
        result = lastLine;
      }
    }

    // Fallback: devolver un resultado genérico en vez de error 500
    if (!result) {
      if (type === "tags") {
        return NextResponse.json({ tags: ["General"] });
      }
      return NextResponse.json({ result: type === "title" ? url.split("/").pop() || url : "Sin descripción disponible" });
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
