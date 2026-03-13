import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, withRetry, pageArchives } from "@/lib/db";
import { createModuleLogger } from "@/lib/logger";

const log = createModuleLogger("api/archives/[id]");

// GET — devuelve un archivo por ID (incluye textContent)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
  const { id } = await params;
  try {
    const [archive] = await withRetry(
      () =>
        db
          .select()
          .from(pageArchives)
          .where(eq(pageArchives.id, id)),
      { operationName: "get page archive" }
    );

    if (!archive) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    return NextResponse.json(archive);
  } catch (error) {
    log.error({ error, archiveId: id }, "Error getting page archive");
    return NextResponse.json({ error: "Error al obtener archivo" }, { status: 500 });
  }
}

// DELETE — elimina un archivo permanentemente (no hay soft-delete en archivos)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true")
    return NextResponse.json({ error: "No disponible en modo demo" }, { status: 403 });
  const { id } = await params;
  try {
    const [deleted] = await withRetry(
      () =>
        db
          .delete(pageArchives)
          .where(eq(pageArchives.id, id))
          .returning(),
      { operationName: "delete page archive" }
    );

    if (!deleted) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    log.info({ archiveId: id }, "Page archive deleted");
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error({ error, archiveId: id }, "Error deleting page archive");
    return NextResponse.json({ error: "Error al eliminar archivo" }, { status: 500 });
  }
}
