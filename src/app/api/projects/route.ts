import { NextRequest, NextResponse } from "next/server";
import { db, projects, withRetry, type NewProject, generateId } from "@/lib/db";
import { asc, eq, isNull } from "drizzle-orm";
import { createProjectSchema, validateRequest } from "@/lib/validations";

// GET all projects - sorted by order
export async function GET() {
  try {
    // Filter out soft-deleted records
    const allProjects = await withRetry(
      () => db.select().from(projects)
        .where(isNull(projects.deletedAt))
        .orderBy(asc(projects.order)),
      { operationName: "fetch projects" }
    );

    return NextResponse.json(allProjects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Error al obtener proyectos" },
      { status: 500 }
    );
  }
}

// POST new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(createProjectSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    // Check if there are any existing projects
    const existingProjects = await withRetry(
      () => db.select().from(projects),
      { operationName: "check existing projects" }
    );
    const isFirstProject = existingProjects.length === 0;

    // Get the highest order value to add the new project at the end
    const maxOrder = existingProjects.length > 0
      ? Math.max(...existingProjects.map(p => p.order || 0))
      : -1;

    const newProject: NewProject = {
      id: generateId(),
      userId: "default",
      name: validatedData.name,
      description: validatedData.description || null,
      icon: validatedData.icon,
      color: validatedData.color,
      order: validatedData.order !== undefined ? validatedData.order : maxOrder + 1,
      isDefault: isFirstProject ? true : validatedData.isDefault,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If setting this project as default, unset all other defaults
    if (newProject.isDefault && !isFirstProject) {
      await withRetry(
        () => db.update(projects).set({ isDefault: false }).where(eq(projects.isDefault, true)),
        { operationName: "unset default projects" }
      );
    }

    const [created] = await withRetry(
      () => db.insert(projects).values(newProject).returning(),
      { operationName: "create project" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { error: "Error al crear proyecto" },
      { status: 500 }
    );
  }
}
