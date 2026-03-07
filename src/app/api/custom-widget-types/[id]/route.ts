import { NextRequest, NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { customWidgetTypes } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { createModuleLogger } from "@/lib/logger";
import { z } from "zod";
import { validateRequest } from "@/lib/validations";

const log = createModuleLogger("api/custom-widget-types/[id]");

const uuidSchema = z.string().uuid();

const updateCustomWidgetTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  category: z.string().max(50).optional(),
  icon: z.string().max(50).optional(),
  htmlTemplate: z.string().min(1).max(500_000, "HTML template must be 500KB or less").optional(),
  configSchema: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultConfig: z.record(z.string(), z.unknown()).nullable().optional(),
  defaultWidth: z.number().int().min(1).max(12).optional(),
  defaultHeight: z.number().int().min(1).max(12).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/custom-widget-types/[id]
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Validate UUID format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const [type] = await withRetry(
      () =>
        db
          .select()
          .from(customWidgetTypes)
          .where(and(eq(customWidgetTypes.id, id), isNull(customWidgetTypes.deletedAt)))
          .limit(1),
      { operationName: "get custom widget type" }
    );
    if (!type) {
      return NextResponse.json({ error: "Tipo de widget no encontrado" }, { status: 404 });
    }
    return NextResponse.json(type);
  } catch (error) {
    log.error({ error }, "Error fetching custom widget type");
    return NextResponse.json({ error: "Error al obtener tipo de widget" }, { status: 500 });
  }
}

// PUT /api/custom-widget-types/[id]
export async function PUT(request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Validate UUID format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const validation = validateRequest(updateCustomWidgetTypeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const updates: Record<string, unknown> = { ...validation.data, updatedAt: new Date() };
    // Remove undefined keys
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const [updated] = await withRetry(
      () =>
        db
          .update(customWidgetTypes)
          .set(updates)
          .where(and(eq(customWidgetTypes.id, id), isNull(customWidgetTypes.deletedAt)))
          .returning(),
      { operationName: "update custom widget type" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Tipo de widget no encontrado" }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error }, "Error updating custom widget type");
    return NextResponse.json({ error: "Error al actualizar tipo de widget" }, { status: 500 });
  }
}

// DELETE /api/custom-widget-types/[id]
export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;

    // Validate UUID format
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await withRetry(
      () =>
        db
          .update(customWidgetTypes)
          .set({ deletedAt: new Date() })
          .where(eq(customWidgetTypes.id, id)),
      { operationName: "delete custom widget type" }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Error deleting custom widget type");
    return NextResponse.json({ error: "Error al eliminar tipo de widget" }, { status: 500 });
  }
}
