import { NextRequest, NextResponse } from "next/server";
import { eq, and, isNull } from "drizzle-orm";
import { db, withRetry, linkSessions } from "@/lib/db";
import { validateRequest, updateLinkSessionSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/link-sessions/[id]");

// GET — obtiene una sesión por ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  const { id } = await params;
  try {
    const [session] = await withRetry(
      () =>
        db
          .select()
          .from(linkSessions)
          .where(and(eq(linkSessions.id, id), isNull(linkSessions.deletedAt))),
      { operationName: "get link session" }
    );

    if (!session) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    return NextResponse.json(session);
  } catch (error) {
    log.error({ error, sessionId: id }, "Error getting link session");
    return NextResponse.json({ error: "Error al obtener sesión" }, { status: 500 });
  }
}

// PUT — actualiza una sesión existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    const validation = validateRequest(updateLinkSessionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const data = validation.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.linkIds !== undefined) updates.linkIds = data.linkIds;
    if (data.order !== undefined) updates.order = data.order;

    const [updated] = await withRetry(
      () =>
        db
          .update(linkSessions)
          .set(updates)
          .where(and(eq(linkSessions.id, id), isNull(linkSessions.deletedAt)))
          .returning(),
      { operationName: "update link session" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    log.info({ sessionId: id }, "Link session updated");
    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error, sessionId: id }, "Error updating link session");
    return NextResponse.json({ error: "Error al actualizar sesión" }, { status: 500 });
  }
}

// PATCH — alias de PUT (para compatibilidad con clientes que usen PATCH para renombrar)
export const PATCH = PUT;

// DELETE — soft delete de la sesión
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    const [deleted] = await withRetry(
      () =>
        db
          .update(linkSessions)
          .set({ deletedAt: new Date() })
          .where(and(eq(linkSessions.id, id), isNull(linkSessions.deletedAt)))
          .returning(),
      { operationName: "delete link session" }
    );

    if (!deleted) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    log.info({ sessionId: id }, "Link session deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error, sessionId: id }, "Error deleting link session");
    return NextResponse.json({ error: "Error al eliminar sesión" }, { status: 500 });
  }
}
