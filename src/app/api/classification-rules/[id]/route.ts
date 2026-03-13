import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, classificationRules } from "@/lib/db";
import { validateRequest, updateClassificationRuleSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/classification-rules/[id]");

// PUT — actualiza una regla existente
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de solicitud inválido" }, { status: 400 });
    }

    const validation = validateRequest(updateClassificationRuleSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const data = validation.data;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) updates.name = data.name;
    if (data.conditionType !== undefined) updates.conditionType = data.conditionType;
    if (data.conditionValue !== undefined) updates.conditionValue = data.conditionValue;
    if (data.actionType !== undefined) updates.actionType = data.actionType;
    if (data.actionValue !== undefined) updates.actionValue = data.actionValue;
    if (data.order !== undefined) updates.order = data.order;
    if (data.isActive !== undefined) updates.isActive = data.isActive;

    const [updated] = await withRetry(
      () =>
        db
          .update(classificationRules)
          .set(updates)
          .where(eq(classificationRules.id, id))
          .returning(),
      { operationName: "update classification rule" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Regla no encontrada" }, { status: 404 });
    }

    log.info({ ruleId: id }, "Classification rule updated");
    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error, ruleId: id }, "Error updating classification rule");
    return NextResponse.json({ error: "Error al actualizar regla" }, { status: 500 });
  }
}

// DELETE — elimina una regla por ID
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    await withRetry(
      () =>
        db
          .delete(classificationRules)
          .where(eq(classificationRules.id, id)),
      { operationName: "delete classification rule" }
    );

    log.info({ ruleId: id }, "Classification rule deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error, ruleId: id }, "Error deleting classification rule");
    return NextResponse.json({ error: "Error al eliminar regla" }, { status: 500 });
  }
}
