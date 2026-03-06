import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") ?? "wallpaper";
  const count = Math.min(parseInt(searchParams.get("count") ?? "1"), 30);
  const orientation = searchParams.get("orientation") ?? "";

  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey || accessKey === "demo") {
    // Fallback: devolver imágenes de Picsum Photos (sin API key)
    const photos = Array.from({ length: count }, (_, i) => ({
      id: `picsum-${i}`,
      urls: {
        regular: `https://picsum.photos/seed/${query}-${i}/800/600`,
        small: `https://picsum.photos/seed/${query}-${i}/400/300`,
        thumb: `https://picsum.photos/seed/${query}-${i}/200/150`,
      },
      user: { name: "Picsum Photos", links: { html: "https://picsum.photos" } },
      links: { html: "https://picsum.photos" },
      alt_description: `Imagen de ${query}`,
    }));
    return NextResponse.json(count === 1 ? photos[0] : photos);
  }

  try {
    const orientationParam = orientation ? `&orientation=${orientation}` : "";
    const endpoint =
      count > 1
        ? `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&count=${count}${orientationParam}&client_id=${accessKey}`
        : `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}${orientationParam}&client_id=${accessKey}`;

    const response = await fetch(endpoint, {
      headers: { "Accept-Version": "v1" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      // Si falla (cuota, rate limit, etc.), usar fallback
      const photos = Array.from({ length: count }, (_, i) => ({
        id: `picsum-fallback-${i}`,
        urls: {
          regular: `https://picsum.photos/seed/${query}-${i}/800/600`,
          small: `https://picsum.photos/seed/${query}-${i}/400/300`,
          thumb: `https://picsum.photos/seed/${query}-${i}/200/150`,
        },
        user: { name: "Picsum Photos", links: { html: "https://picsum.photos" } },
        links: { html: "https://picsum.photos" },
        alt_description: `Imagen de ${query}`,
      }));
      return NextResponse.json(count === 1 ? photos[0] : photos);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "No se pudo obtener imágenes" },
      { status: 502 }
    );
  }
}
