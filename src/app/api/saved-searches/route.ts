import { NextRequest, NextResponse } from "next/server";
import { db, savedSearches, withRetry, generateId } from "@/lib/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createSavedSearchSchema, validateRequest } from "@/lib/validations";

const DEFAULT_USER_ID = "default";

const uuidSchema = z.string().uuid();

export async function GET() {
  try {
    const results = await withRetry(
      () => db.select().from(savedSearches).where(eq(savedSearches.userId, DEFAULT_USER_ID)),
      { operationName: "list saved searches" }
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error listing saved searches:", error);
    return NextResponse.json({ error: "Error al listar búsquedas guardadas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(createSavedSearchSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const { name, query, filters } = validation.data;

    const [created] = await withRetry(
      () => db.insert(savedSearches).values({
        id: generateId(),
        userId: DEFAULT_USER_ID,
        name,
        query,
        filters: filters ?? null,
        createdAt: new Date(),
      }).returning(),
      { operationName: "create saved search" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating saved search:", error);
    return NextResponse.json({ error: "Error al crear búsqueda guardada" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id es obligatorio" }, { status: 400 });
    }

    // Validate UUID format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await withRetry(
      () => db.delete(savedSearches).where(eq(savedSearches.id, id)),
      { operationName: "delete saved search" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting saved search:", error);
    return NextResponse.json({ error: "Error al eliminar búsqueda guardada" }, { status: 500 });
  }
}
