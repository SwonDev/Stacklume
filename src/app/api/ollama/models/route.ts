import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en la app de escritorio" }, { status: 403 });
  }
  const url = req.nextUrl.searchParams.get("url") ?? "http://localhost:11434";
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { models?: { name: string; size: number; modified_at: string }[] };
    return NextResponse.json({ models: data.models ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión";
    return NextResponse.json({ models: [], error: message }, { status: 200 });
  }
}
