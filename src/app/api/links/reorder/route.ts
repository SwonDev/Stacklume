import { NextRequest, NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";
import { reorderSchema, validateRequest } from "@/lib/validations";

// PUT reorder links within a category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod - UUID format + array length limit
    const validation = validateRequest(reorderSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const { orderedIds } = validation.data;

    // Update each link's order based on array index with retry logic
    const updatePromises = orderedIds.map((id: string, index: number) =>
      withRetry(
        () => db.update(links).set({
          order: index,
          updatedAt: new Date()
        }).where(eq(links.id, id)).returning(),
        { operationName: `update link order ${index}` }
      )
    );

    const results = await Promise.all(updatePromises);

    // Filter out any null results (links that weren't found)
    const updated = results.map(([result]) => result).filter(Boolean);

    // Sort by order before returning
    const sortedLinks = updated.sort((a, b) => a.order - b.order);

    return NextResponse.json(sortedLinks);
  } catch (error) {
    console.error("Error reordering links:", error);
    return NextResponse.json(
      { error: "Error al reordenar enlaces" },
      { status: 500 }
    );
  }
}
