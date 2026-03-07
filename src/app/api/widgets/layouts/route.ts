import { NextRequest, NextResponse } from "next/server";
import { db, widgets, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";
import { widgetLayoutsUpdateSchema, validateRequest } from "@/lib/validations";

// PATCH - Bulk update widget layouts (for drag and drop)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validation = validateRequest(widgetLayoutsUpdateSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const { layouts } = validation.data;

    // Update each widget's layout with retry logic
    const updatePromises = layouts.map(async (layout) => {
      return withRetry(
        () => db.update(widgets).set({
          layoutX: layout.x,
          layoutY: layout.y,
          layoutW: layout.w,
          layoutH: layout.h,
          updatedAt: new Date(),
        }).where(eq(widgets.id, layout.i)),
        { operationName: `update widget layout ${layout.i}` }
      );
    });

    await Promise.all(updatePromises);

    return NextResponse.json({ success: true, updated: layouts.length });
  } catch (error) {
    console.error("Error updating widget layouts:", error);
    return NextResponse.json(
      { error: "Error al actualizar layouts" },
      { status: 500 }
    );
  }
}
