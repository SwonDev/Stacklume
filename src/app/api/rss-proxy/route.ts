import { NextRequest, NextResponse } from "next/server";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

// Caché simple en memoria (no persiste entre invocaciones serverless, pero ayuda en dev)
const feedCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutos

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const feedUrl = searchParams.get("url");

  if (!feedUrl) {
    return NextResponse.json({ error: "URL requerida" }, { status: 400 });
  }

  // Validar URL con protección SSRF
  const ssrfResult = await validateUrlForSSRF(feedUrl);
  if (!ssrfResult.safe) {
    return NextResponse.json({ error: "URL no permitida" }, { status: 403 });
  }

  // Verificar caché
  const cached = feedCache.get(feedUrl);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new NextResponse(cached.data, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Cache": "HIT",
      },
    });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: {
        "User-Agent": "Stacklume RSS Reader/1.0",
        Accept:
          "application/rss+xml, application/atom+xml, text/xml, */*",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Error del feed: ${response.status}` },
        { status: 502 }
      );
    }

    const data = await response.text();
    feedCache.set(feedUrl, { data, timestamp: Date.now() });

    return new NextResponse(data, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "X-Cache": "MISS",
      },
    });
  } catch (error) {
    console.error("Error al obtener el feed RSS:", error);
    return NextResponse.json(
      { error: "No se pudo obtener el feed" },
      { status: 502 }
    );
  }
}
