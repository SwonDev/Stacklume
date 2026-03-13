import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { db, withRetry, linkSessions, links } from "@/lib/db";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/link-sessions/[id]/launch");

/**
 * POST /api/link-sessions/[id]/launch
 *
 * Devuelve los links completos de la sesión para que el frontend
 * los abra en el navegador. La acción de abrir las URLs sucede
 * en el cliente; esta ruta solo resuelve los datos.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    // 1. Recuperar la sesión
    const [session] = await withRetry(
      () =>
        db
          .select()
          .from(linkSessions)
          .where(and(eq(linkSessions.id, id), isNull(linkSessions.deletedAt))),
      { operationName: "get link session for launch" }
    );

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const linkIds: string[] = Array.isArray(session.linkIds) ? session.linkIds : [];

    if (linkIds.length === 0) {
      return NextResponse.json({ session, links: [] });
    }

    // 2. Recuperar los links activos (no eliminados) de la sesión
    const sessionLinks = await withRetry(
      () =>
        db
          .select()
          .from(links)
          .where(and(inArray(links.id, linkIds), isNull(links.deletedAt))),
      { operationName: "fetch links for session launch" }
    );

    // 3. Preservar el orden definido en linkIds
    const linkMap = new Map(sessionLinks.map((l) => [l.id, l]));
    const orderedLinks = linkIds.flatMap((lid) => {
      const link = linkMap.get(lid);
      return link ? [link] : [];
    });

    log.info({ sessionId: id, linkCount: orderedLinks.length }, "Link session launched");
    return NextResponse.json({ session, links: orderedLinks });
  } catch (error) {
    log.error({ error, sessionId: id }, "Error launching link session");
    return NextResponse.json({ error: "Error al lanzar sesión" }, { status: 500 });
  }
}
