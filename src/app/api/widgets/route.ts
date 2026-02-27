import { NextRequest, NextResponse } from "next/server";
import { db, widgets, withRetry, type NewWidget, generateId } from "@/lib/db";
import { desc, eq, and, isNull } from "drizzle-orm";
import { createWidgetSchema, updateWidgetSchema, validateRequest } from "@/lib/validations";

const DEFAULT_USER_ID = "default";

// Helper to normalize tags array - handles corrupted data where Tag objects were stored instead of IDs
function normalizeTags(tags: unknown): string[] | null {
  if (!tags || !Array.isArray(tags)) return null;
  if (tags.length === 0) return null;

  return tags.map((tag) => {
    // If it's already a string ID, return as-is
    if (typeof tag === 'string') return tag;
    // If it's an object with an id property (corrupted Tag object), extract the id
    if (tag && typeof tag === 'object' && 'id' in tag && typeof tag.id === 'string') {
      return tag.id;
    }
    // Unknown format - skip
    return null;
  }).filter((id): id is string => id !== null);
}

// GET all widgets
export async function GET() {
  try {
    // Filter out soft-deleted records
    const allWidgets = await withRetry(
      () => db.select().from(widgets).where(
        and(eq(widgets.userId, DEFAULT_USER_ID), isNull(widgets.deletedAt))
      ).orderBy(desc(widgets.createdAt)),
      { operationName: "fetch widgets" }
    );

    // Transform DB format to frontend format
    const transformedWidgets = allWidgets.map((w) => ({
      id: w.id,
      type: w.type,
      title: w.title,
      size: w.size,
      projectId: w.projectId, // Include projectId for multi-workspace support
      categoryId: w.categoryId,
      tagId: w.tagId,
      tags: normalizeTags(w.tags), // Normalize tags to handle corrupted data
      config: w.config,
      layout: {
        x: w.layoutX,
        y: w.layoutY,
        w: w.layoutW,
        h: w.layoutH,
      },
    }));

    return NextResponse.json(transformedWidgets);
  } catch (error) {
    console.error("Error fetching widgets:", error);
    return NextResponse.json(
      { error: "Error al obtener widgets" },
      { status: 500 }
    );
  }
}

// POST new widget
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input data using the existing createWidgetSchema
    // Transform the request body to match the schema format
    const validationInput = {
      type: body.type,
      title: body.title,
      size: body.size || "medium",
      projectId: body.projectId || null,
      categoryId: body.categoryId || null,
      tagId: body.tagId || null,
      tags: body.tags || undefined,
      config: body.config || undefined,
      layoutX: body.layout?.x ?? 0,
      layoutY: body.layout?.y ?? 0,
      layoutW: body.layout?.w ?? 2,
      layoutH: body.layout?.h ?? 2,
    };

    const validationResult = validateRequest(createWidgetSchema, validationInput);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validationResult.errors },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    const newWidget: NewWidget = {
      id: generateId(),
      userId: DEFAULT_USER_ID,
      type: validatedData.type,
      title: validatedData.title || null,
      size: validatedData.size,
      projectId: validatedData.projectId || null,
      categoryId: validatedData.categoryId || null,
      tagId: validatedData.tagId || null,
      tags: normalizeTags(validatedData.tags), // Normalize to prevent storing corrupted data
      config: validatedData.config || null,
      layoutX: validatedData.layoutX,
      layoutY: validatedData.layoutY,
      layoutW: validatedData.layoutW,
      layoutH: validatedData.layoutH,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [created] = await withRetry(
      () => db.insert(widgets).values(newWidget).returning(),
      { operationName: "create widget" }
    );

    // Transform to frontend format
    const transformedWidget = {
      id: created.id,
      type: created.type,
      title: created.title,
      size: created.size,
      projectId: created.projectId,
      categoryId: created.categoryId,
      tagId: created.tagId,
      tags: normalizeTags(created.tags), // Normalize tags on return
      config: created.config,
      layout: {
        x: created.layoutX,
        y: created.layoutY,
        w: created.layoutW,
        h: created.layoutH,
      },
    };

    return NextResponse.json(transformedWidget, { status: 201 });
  } catch (error) {
    console.error("Error creating widget:", error);
    return NextResponse.json(
      { error: "Error al crear widget" },
      { status: 500 }
    );
  }
}

// PATCH update widget
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type, title, size, projectId, categoryId, tagId, tags, config, layout } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de widget requerido" },
        { status: 400 }
      );
    }

    // Validate ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        { error: "Invalid widget ID format" },
        { status: 400 }
      );
    }

    // Validate request body using Zod schema (excluding id which is handled separately)
    const validationInput: Record<string, unknown> = {};
    if (type !== undefined) validationInput.type = type;
    if (title !== undefined) validationInput.title = title;
    if (size !== undefined) validationInput.size = size;
    if (projectId !== undefined) validationInput.projectId = projectId;
    if (categoryId !== undefined) validationInput.categoryId = categoryId;
    if (tagId !== undefined) validationInput.tagId = tagId;
    if (tags !== undefined) validationInput.tags = tags;
    if (config !== undefined) validationInput.config = config;
    if (layout !== undefined) {
      if (layout.x !== undefined) validationInput.layoutX = layout.x;
      if (layout.y !== undefined) validationInput.layoutY = layout.y;
      if (layout.w !== undefined) validationInput.layoutW = layout.w;
      if (layout.h !== undefined) validationInput.layoutH = layout.h;
    }

    // Only validate if there are fields to update (besides id)
    if (Object.keys(validationInput).length > 0) {
      const validationResult = validateRequest(updateWidgetSchema, validationInput);
      if (!validationResult.success) {
        return NextResponse.json(
          { error: "Validation failed", details: validationResult.errors },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<NewWidget> = {
      updatedAt: new Date(),
    };

    if (type !== undefined) updateData.type = type;
    if (title !== undefined) updateData.title = title;
    if (size !== undefined) updateData.size = size;
    if (projectId !== undefined) updateData.projectId = projectId || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (tagId !== undefined) updateData.tagId = tagId || null;
    if (tags !== undefined) updateData.tags = normalizeTags(tags); // Normalize to prevent storing corrupted data
    if (config !== undefined) updateData.config = config;
    if (layout !== undefined) {
      if (layout.x !== undefined) updateData.layoutX = layout.x;
      if (layout.y !== undefined) updateData.layoutY = layout.y;
      if (layout.w !== undefined) updateData.layoutW = layout.w;
      if (layout.h !== undefined) updateData.layoutH = layout.h;
    }

    const [updated] = await withRetry(
      () => db.update(widgets).set(updateData).where(eq(widgets.id, id)).returning(),
      { operationName: "update widget" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Widget no encontrado" },
        { status: 404 }
      );
    }

    // Transform to frontend format
    const transformedWidget = {
      id: updated.id,
      type: updated.type,
      title: updated.title,
      size: updated.size,
      projectId: updated.projectId,
      categoryId: updated.categoryId,
      tagId: updated.tagId,
      tags: normalizeTags(updated.tags), // Normalize tags on return
      config: updated.config,
      layout: {
        x: updated.layoutX,
        y: updated.layoutY,
        w: updated.layoutW,
        h: updated.layoutH,
      },
    };

    return NextResponse.json(transformedWidget);
  } catch (error) {
    console.error("Error updating widget:", error);
    return NextResponse.json(
      { error: "Error al actualizar widget" },
      { status: 500 }
    );
  }
}

// DELETE widget (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de widget requerido" },
        { status: 400 }
      );
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    const [deleted] = await withRetry(
      () => db.update(widgets)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(widgets.id, id))
        .returning(),
      { operationName: "soft delete widget" }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Widget no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting widget:", error);
    return NextResponse.json(
      { error: "Error al eliminar widget" },
      { status: 500 }
    );
  }
}
