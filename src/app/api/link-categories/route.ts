import { NextRequest, NextResponse } from "next/server";
import { db, linkCategories, withRetry } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { validateRequest } from "@/lib/validations";

// Zod schema for link-categories POST body
const linkCategoriesSchema = z.object({
  linkId: z.string().uuid("linkId debe ser un UUID válido"),
  categoryIds: z.array(z.string().uuid("Cada categoryId debe ser un UUID válido")).optional(),
  categoryId: z.string().uuid("categoryId debe ser un UUID válido").optional(),
}).refine(
  (data) => (data.categoryIds && data.categoryIds.length > 0) || data.categoryId,
  { message: "categoryIds o categoryId son obligatorios" }
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");

    const query = linkId
      ? db.select().from(linkCategories).where(eq(linkCategories.linkId, linkId))
      : db.select().from(linkCategories);

    const results = await withRetry(
      () => query,
      { operationName: "list link-categories" }
    );
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error listing link-categories:", error);
    return NextResponse.json({ error: "Error al listar link-categories" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = validateRequest(linkCategoriesSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const { linkId, categoryIds, categoryId } = validation.data;

    // Support both array (categoryIds) and single (categoryId) for backwards compat
    const ids: string[] = categoryIds ?? (categoryId ? [categoryId] : []);

    // Delete existing associations for this link and replace with new ones
    await withRetry(
      () => db.delete(linkCategories).where(eq(linkCategories.linkId, linkId)),
      { operationName: "clear link-categories" }
    );

    if (ids.length > 0) {
      await withRetry(
        () => db.insert(linkCategories).values(ids.map((cid) => ({ linkId, categoryId: cid }))),
        { operationName: "create link-categories" }
      );
    }

    const created = ids.map((cid) => ({ linkId, categoryId: cid }));
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating link-categories:", error);
    return NextResponse.json({ error: "Error al crear link-categories" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const categoryId = searchParams.get("categoryId");

    if (!linkId || !categoryId) {
      return NextResponse.json({ error: "linkId y categoryId son obligatorios" }, { status: 400 });
    }

    await withRetry(
      () => db.delete(linkCategories).where(
        and(eq(linkCategories.linkId, linkId), eq(linkCategories.categoryId, categoryId))
      ),
      { operationName: "delete link-category" }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link-category:", error);
    return NextResponse.json({ error: "Error al eliminar link-category" }, { status: 500 });
  }
}
