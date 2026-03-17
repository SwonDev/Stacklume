import { NextRequest, NextResponse } from "next/server";
import { db, generateId, withRetry } from "@/lib/db";
import { llmChats, llmMessages } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

// GET /api/llm/sessions/[id]/messages — mensajes de una sesión
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const msgs = await withRetry(
      () =>
        db
          .select()
          .from(llmMessages)
          .where(eq(llmMessages.chatId, id))
          .orderBy(asc(llmMessages.createdAt)),
      { operationName: "list llm_messages" }
    );

    return NextResponse.json({ messages: msgs });
  } catch (err) {
    console.error("[llm/sessions/[id]/messages GET]", err);
    return NextResponse.json({ error: "Error al listar mensajes" }, { status: 500 });
  }
}

// POST /api/llm/sessions/[id]/messages — añadir mensaje y actualizar updatedAt del chat
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { role, content, reasoningContent, isError, id: msgId } = body as {
      id?: string;
      role: string;
      content: string;
      reasoningContent?: string | null;
      isError?: boolean;
    };

    if (!role || content === undefined) {
      return NextResponse.json({ error: "role y content requeridos" }, { status: 400 });
    }

    const now = new Date();

    const [msg] = await withRetry(
      () =>
        db
          .insert(llmMessages)
          .values({
            id: msgId ?? generateId(),
            chatId: id,
            role,
            content,
            reasoningContent: reasoningContent ?? null,
            isError: isError ?? false,
            createdAt: now,
          })
          .returning(),
      { operationName: "insert llm_message" }
    );

    // Actualizar updatedAt del chat padre
    await withRetry(
      () =>
        db
          .update(llmChats)
          .set({ updatedAt: now })
          .where(eq(llmChats.id, id)),
      { operationName: "touch llm_chat updatedAt" }
    );

    return NextResponse.json({ message: msg }, { status: 201 });
  } catch (err) {
    console.error("[llm/sessions/[id]/messages POST]", err);
    return NextResponse.json({ error: "Error al guardar mensaje" }, { status: 500 });
  }
}
