import { NextRequest, NextResponse } from "next/server";

// GET /api/llm/models/search?q=qwen+gguf&sort=downloads&limit=20
// Proxy a la API de HuggingFace para buscar modelos GGUF compatibles con llama.cpp
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "gguf";
    const sort = searchParams.get("sort") || "downloads";
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);

    const hfUrl = `https://huggingface.co/api/models?search=${encodeURIComponent(q)}&filter=gguf&sort=${sort}&direction=-1&limit=${limit}`;
    const res = await fetch(hfUrl, { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `HuggingFace API error: ${res.status}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as Array<{
      id: string;
      downloads?: number;
      likes?: number;
      tags?: string[];
      lastModified?: string;
    }>;

    const models = data.map((m) => ({
      id: m.id,
      name: m.id.split("/").pop() ?? m.id,
      author: m.id.split("/")[0] ?? "",
      downloads: m.downloads ?? 0,
      likes: m.likes ?? 0,
      tags: (m.tags ?? []).filter((t) =>
        ["gguf", "llama-cpp", "text-generation", "chat", "conversational"].includes(t)
      ),
      lastModified: m.lastModified,
    }));

    return NextResponse.json({ models });
  } catch (err) {
    console.error("[llm/models/search]", err);
    return NextResponse.json(
      { error: "Error al buscar modelos" },
      { status: 500 }
    );
  }
}
