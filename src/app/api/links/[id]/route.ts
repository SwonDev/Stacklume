import { NextRequest, NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { updateLinkSchema, validateRequest } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET single link
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Filter out soft-deleted records
    const [link] = await withRetry(
      () => db.select().from(links).where(
        and(eq(links.id, id), isNull(links.deletedAt))
      ),
      { operationName: "fetch single link" }
    );

    if (!link) {
      return NextResponse.json(
        { error: "Enlace no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(link);
  } catch (error) {
    console.error("Error fetching link:", error);
    return NextResponse.json(
      { error: "Error al obtener enlace" },
      { status: 500 }
    );
  }
}

// PATCH update link
export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(updateLinkSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.url !== undefined) updateData.url = validatedData.url;
    if (validatedData.title !== undefined) updateData.title = validatedData.title;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.imageUrl !== undefined) updateData.imageUrl = validatedData.imageUrl;
    if (validatedData.faviconUrl !== undefined) updateData.faviconUrl = validatedData.faviconUrl;
    if (validatedData.categoryId !== undefined) updateData.categoryId = validatedData.categoryId;
    if (validatedData.isFavorite !== undefined) updateData.isFavorite = validatedData.isFavorite;
    if (validatedData.siteName !== undefined) updateData.siteName = validatedData.siteName;
    if (validatedData.author !== undefined) updateData.author = validatedData.author;
    if (validatedData.publishedAt !== undefined) updateData.publishedAt = validatedData.publishedAt;
    if (validatedData.source !== undefined) updateData.source = validatedData.source;
    if (validatedData.sourceId !== undefined) updateData.sourceId = validatedData.sourceId;
    if (validatedData.platform !== undefined) updateData.platform = validatedData.platform;
    if (validatedData.contentType !== undefined) updateData.contentType = validatedData.contentType;
    if (validatedData.platformColor !== undefined) updateData.platformColor = validatedData.platformColor;

    const [updated] = await withRetry(
      () => db.update(links).set(updateData).where(eq(links.id, id)).returning(),
      { operationName: "update link" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Enlace no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "Error al actualizar enlace" },
      { status: 500 }
    );
  }
}

// DELETE link (soft delete)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Soft delete: set deletedAt timestamp instead of actually deleting
    const [deleted] = await withRetry(
      () => db.update(links)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(links.id, id))
        .returning(),
      { operationName: "soft delete link" }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Enlace no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting link:", error);
    return NextResponse.json(
      { error: "Error al eliminar enlace" },
      { status: 500 }
    );
  }
}
