import { NextRequest, NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { llmChats } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PATCH /api/llm/sessions/[id] — actualizar título
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const title = (body.title as string | undefined)?.slice(0, 500);
    if (!title) {
      return NextResponse.json({ error: "title requerido" }, { status: 400 });
    }

    await withRetry(
      () =>
        db
          .update(llmChats)
          .set({ title, updatedAt: new Date() })
          .where(eq(llmChats.id, id)),
      { operationName: "update llm_chat title" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[llm/sessions/[id] PATCH]", err);
    return NextResponse.json({ error: "Error al actualizar sesión" }, { status: 500 });
  }
}

// DELETE /api/llm/sessions/[id] — eliminar chat (mensajes se borran en cascada)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await withRetry(
      () => db.delete(llmChats).where(eq(llmChats.id, id)),
      { operationName: "delete llm_chat" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[llm/sessions/[id] DELETE]", err);
    return NextResponse.json({ error: "Error al eliminar sesión" }, { status: 500 });
  }
}
