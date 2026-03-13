import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, links } from "@/lib/db";
import { validateRequest, updateReadingStatusSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/links/[id]/reading-status");

// PUT — actualiza el estado de lectura de un enlace
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

    const validation = validateRequest(updateReadingStatusSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const { readingStatus, reviewAt } = validation.data;

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
      readingStatus,
    };
    if (reviewAt !== undefined) {
      updates.reviewAt = reviewAt ? new Date(reviewAt) : null;
    }

    const [updated] = await withRetry(
      () =>
        db
          .update(links)
          .set(updates)
          .where(eq(links.id, id))
          .returning(),
      { operationName: "update reading status" }
    );

    if (!updated) {
      return NextResponse.json({ error: "Enlace no encontrado" }, { status: 404 });
    }

    log.info({ linkId: id, readingStatus }, "Reading status updated");
    return NextResponse.json(updated);
  } catch (error) {
    log.error({ error, linkId: id }, "Error updating reading status");
    return NextResponse.json({ error: "Error al actualizar estado de lectura" }, { status: 500 });
  }
}
