import { NextRequest, NextResponse } from "next/server";
import { db, categories, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";

// PUT reorder categories
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body;

    // Validate input - accept array of category IDs
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds debe ser un array" },
        { status: 400 }
      );
    }

    // Update each category's order based on array index with retry logic
    const updatePromises = orderedIds.map((id: string, index: number) =>
      withRetry(
        () => db.update(categories).set({
          order: index,
          updatedAt: new Date()
        }).where(eq(categories.id, id)).returning(),
        { operationName: `update category order ${index}` }
      )
    );

    const results = await Promise.all(updatePromises);

    // Filter out any null results (categories that weren't found)
    const updated = results.map(([result]) => result).filter(Boolean);

    // Sort by order before returning
    const sortedCategories = updated.sort((a, b) => a.order - b.order);

    return NextResponse.json(sortedCategories);
  } catch (error) {
    console.error("Error reordering categories:", error);
    return NextResponse.json(
      { error: "Error al reordenar categorías" },
      { status: 500 }
    );
  }
}
