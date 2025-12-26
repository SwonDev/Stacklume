import { NextRequest, NextResponse } from "next/server";
import { db, projects, widgets, withRetry } from "@/lib/db";
import { eq, and, isNull } from "drizzle-orm";
import { updateProjectSchema, validateRequest } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET single project
export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Filter out soft-deleted records
    const [project] = await withRetry(
      () => db.select().from(projects).where(
        and(eq(projects.id, id), isNull(projects.deletedAt))
      ),
      { operationName: "fetch single project" }
    );

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      { error: "Error al obtener proyecto" },
      { status: 500 }
    );
  }
}

// PUT update project
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Validate update fields with Zod schema
    const validation = validateRequest(updateProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // If setting this project as default, unset all other defaults
    if (validatedData.isDefault === true) {
      await withRetry(
        () => db.update(projects).set({ isDefault: false }).where(eq(projects.isDefault, true)),
        { operationName: "unset default projects" }
      );
    }

    // Build update object with only defined fields
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;
    if (validatedData.order !== undefined) updateData.order = validatedData.order;
    if (validatedData.isDefault !== undefined) updateData.isDefault = validatedData.isDefault;

    const [updated] = await withRetry(
      () => db.update(projects).set(updateData).where(eq(projects.id, id)).returning(),
      { operationName: "update project" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json(
      { error: "Error al actualizar proyecto" },
      { status: 500 }
    );
  }
}

// DELETE project (soft delete)
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    // Check if project exists and is not the default
    const [project] = await withRetry(
      () => db.select().from(projects).where(eq(projects.id, id)),
      { operationName: "check project exists" }
    );

    if (!project) {
      return NextResponse.json(
        { error: "Proyecto no encontrado" },
        { status: 404 }
      );
    }

    // Count widgets that will be affected (soft deleted as well)
    const projectWidgets = await withRetry(
      () => db.select().from(widgets).where(eq(widgets.projectId, id)),
      { operationName: "fetch project widgets" }
    );

    // Soft delete the project and its widgets
    // First, soft delete all widgets in this project
    if (projectWidgets.length > 0) {
      await withRetry(
        () => db.update(widgets)
          .set({ deletedAt: new Date(), updatedAt: new Date() })
          .where(eq(widgets.projectId, id)),
        { operationName: "soft delete project widgets" }
      );
    }

    // Soft delete the project
    const [deleted] = await withRetry(
      () => db.update(projects)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(projects.id, id))
        .returning(),
      { operationName: "soft delete project" }
    );

    return NextResponse.json({
      success: true,
      deleted,
      widgetsAffected: projectWidgets.length
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: "Error al eliminar proyecto" },
      { status: 500 }
    );
  }
}
