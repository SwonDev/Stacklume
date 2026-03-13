import { NextResponse } from "next/server";

/**
 * GET /api/llm/status
 * Verifica si el servidor llama-server local está respondiendo.
 * Solo disponible en modo desktop (DESKTOP_MODE=true).
 */
export async function GET() {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json(
      { ready: false, error: "Solo disponible en desktop" },
      { status: 403 }
    );
  }

  const llamaPort = process.env.LLAMA_PORT;
  if (!llamaPort || llamaPort === "0") {
    return NextResponse.json({ ready: false, reason: "no_port" });
  }

  try {
    const res = await fetch(`http://127.0.0.1:${llamaPort}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        ready: true,
        port: Number(llamaPort),
        status: (data as Record<string, unknown>).status ?? "ok",
      });
    }
    return NextResponse.json({ ready: false, reason: "server_error" });
  } catch {
    return NextResponse.json({ ready: false, reason: "unreachable" });
  }
}
