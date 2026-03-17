import { NextRequest, NextResponse } from "next/server";
import { db, generateId, withRetry } from "@/lib/db";
import { llmChats, llmMessages } from "@/lib/db/schema";
import { desc, eq, isNull, sql } from "drizzle-orm";

// GET /api/llm/sessions — lista de chats ordenados por updatedAt desc
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);

    const chats = await withRetry(
      () =>
        db
          .select({
            id: llmChats.id,
            title: llmChats.title,
            createdAt: llmChats.createdAt,
            updatedAt: llmChats.updatedAt,
          })
          .from(llmChats)
          .orderBy(desc(llmChats.updatedAt))
          .limit(limit),
      { operationName: "list llm_chats" }
    );

    return NextResponse.json({ sessions: chats });
  } catch (err) {
    console.error("[llm/sessions GET]", err);
    return NextResponse.json({ error: "Error al listar sesiones" }, { status: 500 });
  }
}

// POST /api/llm/sessions — crear nueva sesión
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body.title as string | undefined)?.slice(0, 500) ?? "Nueva conversación";
    const now = new Date();

    const [chat] = await withRetry(
      () =>
        db
          .insert(llmChats)
          .values({
            id: generateId(),
            title,
            createdAt: now,
            updatedAt: now,
          })
          .returning(),
      { operationName: "create llm_chat" }
    );

    return NextResponse.json({ session: chat }, { status: 201 });
  } catch (err) {
    console.error("[llm/sessions POST]", err);
    return NextResponse.json({ error: "Error al crear sesión" }, { status: 500 });
  }
}
