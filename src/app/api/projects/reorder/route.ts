import { NextRequest, NextResponse } from "next/server";
import { db, projects, withRetry } from "@/lib/db";
import { eq } from "drizzle-orm";

// PUT reorder projects
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderedIds } = body;

    // Validate input - accept array of project IDs
    if (!Array.isArray(orderedIds)) {
      return NextResponse.json(
        { error: "orderedIds debe ser un array" },
        { status: 400 }
      );
    }

    // Update each project's order based on array index with retry logic
    const updatePromises = orderedIds.map((id: string, index: number) =>
      withRetry(
        () => db.update(projects).set({
          order: index,
          updatedAt: new Date()
        }).where(eq(projects.id, id)).returning(),
        { operationName: `update project order ${index}` }
      )
    );

    const results = await Promise.all(updatePromises);

    // Filter out any null results (projects that weren't found)
    const updated = results.map(([result]) => result).filter(Boolean);

    // Sort by order before returning
    const sortedProjects = updated.sort((a, b) => a.order - b.order);

    return NextResponse.json(sortedProjects);
  } catch (error) {
    console.error("Error reordering projects:", error);
    return NextResponse.json(
      { error: "Error al reordenar proyectos" },
      { status: 500 }
    );
  }
}
