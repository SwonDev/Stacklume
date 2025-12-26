import { NextRequest, NextResponse } from "next/server";
import { db, tags, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";

// PUT reorder tags
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body;

    // Validate input - accept array of tag IDs
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds debe ser un array" },
        { status: 400 }
      );
    }

    // Update each tag's order based on array index with retry logic
    const updatePromises = orderedIds.map((id: string, index: number) =>
      withRetry(
        () => db.update(tags).set({ order: index }).where(eq(tags.id, id)).returning(),
        { operationName: `update tag order ${index}` }
      )
    );

    const results = await Promise.all(updatePromises);

    // Filter out any null results (tags that weren't found)
    const updated = results.map(([result]) => result).filter(Boolean);

    // Sort by order before returning
    const sortedTags = updated.sort((a, b) => a.order - b.order);

    return NextResponse.json(sortedTags);
  } catch (error) {
    console.error("Error reordering tags:", error);
    return NextResponse.json(
      { error: "Error al reordenar etiquetas" },
      { status: 500 }
    );
  }
}
