import { NextResponse } from "next/server";
import { db, widgets, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";

const DEFAULT_USER_ID = "default";

// DELETE - Clear all widgets for a user
export async function DELETE() {
  try {
    const deleted = await withRetry(
      () => db.delete(widgets).where(eq(widgets.userId, DEFAULT_USER_ID)).returning(),
      { operationName: "clear all widgets" }
    );

    return NextResponse.json({ success: true, deleted: deleted.length });
  } catch (error) {
    console.error("Error clearing widgets:", error);
    return NextResponse.json(
      { error: "Error al eliminar todos los widgets" },
      { status: 500 }
    );
  }
}
