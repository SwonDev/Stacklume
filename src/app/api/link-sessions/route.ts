import { NextRequest, NextResponse } from "next/server";
import { isNull } from "drizzle-orm";
import { db, withRetry, generateId, linkSessions } from "@/lib/db";
import { validateRequest, createLinkSessionSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/link-sessions");

// GET — devuelve todas las sesiones no eliminadas, ordenadas por order
export async function GET() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return NextResponse.json([]);
  try {
    const sessions = await withRetry(
      () =>
        db
          .select()
          .from(linkSessions)
          .where(isNull(linkSessions.deletedAt))
          .orderBy(linkSessions.order),
      { operationName: "list link sessions" }
    );
    return NextResponse.json(sessions);
  } catch (error) {
    log.error({ error }, "Error listing link sessions");
    return NextResponse.json({ error: "Error al obtener sesiones" }, { status: 500 });
  }
}

// POST — crea una nueva sesión
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

    const validation = validateRequest(createLinkSessionSchema, body);
    if (!validation.success) {
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const data = validation.data;
    const now = new Date();

    const [created] = await withRetry(
      () =>
        db
          .insert(linkSessions)
          .values({
            id: generateId(),
            name: data.name,
            description: data.description ?? null,
            linkIds: data.linkIds ?? [],
            order: data.order ?? 0,
            createdAt: now,
            updatedAt: now,
          })
          .returning(),
      { operationName: "create link session" }
    );

    log.info({ sessionId: created.id }, "Link session created");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    log.error({ error }, "Error creating link session");
    return NextResponse.json({ error: "Error al crear sesión" }, { status: 500 });
  }
}
