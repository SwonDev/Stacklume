import { NextRequest, NextResponse } from "next/server";
import { db, withRetry, generateId } from "@/lib/db";
import { customWidgetTypes } from "@/lib/db/schema";
import { isNull, eq, desc } from "drizzle-orm";
import { createModuleLogger } from "@/lib/logger";
import { z } from "zod";
import { validateRequest } from "@/lib/validations";

const log = createModuleLogger("api/custom-widget-types");

const DEFAULT_USER_ID = "default";

const createCustomWidgetTypeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).default("custom"),
  icon: z.string().max(50).default("Puzzle"),
  htmlTemplate: z.string().min(1).max(200000, "Template demasiado grande (máx 200KB)"),
  configSchema: z.record(z.string(), z.unknown()).optional(),
  defaultConfig: z.record(z.string(), z.unknown()).optional(),
  defaultWidth: z.number().int().min(1).max(12).default(2),
  defaultHeight: z.number().int().min(1).max(12).default(2),
});

// GET /api/custom-widget-types — list all custom widget types
export async function GET() {
  try {
    const types = await withRetry(
      () =>
        db
          .select()
          .from(customWidgetTypes)
          .where(isNull(customWidgetTypes.deletedAt))
          .orderBy(desc(customWidgetTypes.createdAt)),
      { operationName: "list custom widget types" }
    );
    return NextResponse.json(types);
  } catch (error) {
    log.error({ error }, "Error listing custom widget types");
    return NextResponse.json({ error: "Error al obtener tipos de widget" }, { status: 500 });
  }
}

// POST /api/custom-widget-types — create a new custom widget type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateRequest(createCustomWidgetTypeSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const data = validation.data;
    const [created] = await withRetry(
      () =>
        db
          .insert(customWidgetTypes)
          .values({
            id: generateId(),
            userId: DEFAULT_USER_ID,
            name: data.name,
            description: data.description ?? null,
            category: data.category,
            icon: data.icon,
            htmlTemplate: data.htmlTemplate,
            configSchema: data.configSchema ?? null,
            defaultConfig: data.defaultConfig ?? null,
            defaultWidth: data.defaultWidth,
            defaultHeight: data.defaultHeight,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning(),
      { operationName: "create custom widget type" }
    );

    log.info({ id: created.id, name: created.name }, "Custom widget type created");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error({ error }, "Error creating custom widget type");
    return NextResponse.json({ error: "Error al crear tipo de widget" }, { status: 500 });
  }
}
