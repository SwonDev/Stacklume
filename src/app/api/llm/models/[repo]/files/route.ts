import { NextRequest, NextResponse } from "next/server";

// GET /api/llm/models/{repo}/files
// Lista los archivos .gguf disponibles en un repositorio de HuggingFace
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ repo: string }> }
) {
  try {
    const { repo } = await params;
    const decodedRepo = decodeURIComponent(repo);

    // Validar formato del repo (author/name)
    if (!decodedRepo.includes("/") || decodedRepo.split("/").length !== 2) {
      return NextResponse.json(
        { error: "Formato de repositorio inválido (esperado: author/name)" },
        { status: 400 }
      );
    }

    // Usar endpoint /tree que incluye tamaños de archivo (siblings no los incluye)
    const hfUrl = `https://huggingface.co/api/models/${decodedRepo}/tree/main`;
    const res = await fetch(hfUrl, { next: { revalidate: 300 } });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Repositorio no encontrado: ${res.status}` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const data = (await res.json()) as Array<{
      type: string;
      path: string;
      size?: number;
    }>;

    const files = data
      .filter((f) => f.type === "file" && f.path?.endsWith(".gguf") && !f.path.includes("mmproj"))
      .map((f) => {
        const filename = f.path;
        const size = f.size ?? 0;
        // Extraer cuantización del nombre (Q4_K_M, Q5_K_S, Q8_0, etc.)
        const quantMatch = filename.match(/(Q\d[^.]*|IQ\d[^.]*|F\d+|FP\d+)/i);
        return {
          filename,
          size,
          downloadUrl: `https://huggingface.co/${decodedRepo}/resolve/main/${filename}`,
          quantization: quantMatch?.[1] ?? "unknown",
        };
      })
      // Ordenar por tamaño ascendente
      .sort((a, b) => a.size - b.size);

    return NextResponse.json({ repo: decodedRepo, files });
  } catch (err) {
    console.error("[llm/models/[repo]/files]", err);
    return NextResponse.json(
      { error: "Error al listar archivos" },
      { status: 500 }
    );
  }
}
