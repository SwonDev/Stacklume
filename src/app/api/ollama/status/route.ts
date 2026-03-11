import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  if (process.env.DESKTOP_MODE !== "true") {
    return NextResponse.json({ error: "Solo disponible en la app de escritorio" }, { status: 403 });
  }
  const url = req.nextUrl.searchParams.get("url") ?? "http://localhost:11434";
  try {
    const res = await fetch(`${url}/api/tags`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { models?: { name: string }[] };
    return NextResponse.json({ ok: true, modelCount: data.models?.length ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error de conexión";
    return NextResponse.json({ ok: false, error: message });
  }
}
