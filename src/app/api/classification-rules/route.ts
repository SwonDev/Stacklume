import { NextRequest, NextResponse } from "next/server";

import { db, withRetry, generateId, classificationRules } from "@/lib/db";
import { validateRequest, createClassificationRuleSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/classification-rules");

// GET — devuelve todas las reglas ordenadas
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.json([]);
  try {
    const rules = await withRetry(
      () =>
        db
          .select()
          .from(classificationRules)
          .orderBy(classificationRules.order),
      { operationName: "list classification rules" }
    );
    return NextResponse.json(rules);
  } catch (error) {
    log.error({ error }, "Error listing classification rules");
    return NextResponse.json({ error: "Error al obtener reglas" }, { status: 500 });
  }
}

// POST — crea una nueva regla
export async function POST(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    const validation = validateRequest(createClassificationRuleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const data = validation.data;
    const [created] = await withRetry(
      () =>
        db
          .insert(classificationRules)
          .values({
            id: generateId(),
            name: data.name,
            conditionType: data.conditionType,
            conditionValue: data.conditionValue,
            actionType: data.actionType,
            actionValue: data.actionValue,
            order: data.order ?? 0,
            isActive: data.isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning(),
      { operationName: "create classification rule" }
    );

    log.info({ ruleId: created.id }, "Classification rule created");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error({ error }, "Error creating classification rule");
    return NextResponse.json({ error: "Error al crear regla" }, { status: 500 });
  }
}

// DELETE (bulk) — elimina todas las reglas (para reset)
export async function DELETE() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  try {
    await withRetry(
      () => db.delete(classificationRules),
      { operationName: "delete all classification rules" }
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error }, "Error deleting classification rules");
    return NextResponse.json({ error: "Error al eliminar reglas" }, { status: 500 });
  }
}
