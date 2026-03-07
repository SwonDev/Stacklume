import { NextRequest, NextResponse } from "next/server";
import { db, sharedCollections, withRetry, generateId } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { z } from "zod";
import { createSharedCollectionSchema, validateRequest } from "@/lib/validations";

const DEFAULT_USER_ID = "default";

const uuidSchema = z.string().uuid();

function generateShareToken(): string {
  return randomBytes(16).toString("hex");
}

export async function GET() {
  try {
    const results = await withRetry(
      () => db.select().from(sharedCollections).where(eq(sharedCollections.userId, DEFAULT_USER_ID)),
      { operationName: "list shared collections" }
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error listing shared collections:", error);
    return NextResponse.json({ error: "Error al listar colecciones compartidas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(createSharedCollectionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const { type, referenceId, expiresAt } = validation.data;

    const shareToken = generateShareToken();

    const [created] = await withRetry(
      () => db.insert(sharedCollections).values({
        id: generateId(),
        userId: DEFAULT_USER_ID,
        type,
        referenceId,
        shareToken,
        isActive: true,
        createdAt: new Date(),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      }).returning(),
      { operationName: "create shared collection" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating shared collection:", error);
    return NextResponse.json({ error: "Error al crear colección compartida" }, { status: 500 });
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
      () => db.update(sharedCollections)
        .set({ isActive: false })
        .where(and(eq(sharedCollections.id, id), eq(sharedCollections.userId, DEFAULT_USER_ID))),
      { operationName: "deactivate shared collection" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deactivating shared collection:", error);
    return NextResponse.json({ error: "Error al desactivar colección compartida" }, { status: 500 });
  }
}
