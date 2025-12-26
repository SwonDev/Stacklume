import { NextRequest, NextResponse } from "next/server";
import { db, categories, links, withRetry, type NewCategory, createPaginatedResponse } from "@/lib/db";
import { desc, eq, count, isNull } from "drizzle-orm";
import { paginationSchema, createCategorySchema, updateCategorySchema, validateRequest } from "@/lib/validations";

// GET all categories with optional pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if pagination params are provided
    const hasPageParam = searchParams.has("page");
    const hasLimitParam = searchParams.has("limit");
    const usePagination = hasPageParam || hasLimitParam;

    if (!usePagination) {
      // Backwards compatibility: return all categories if no pagination params
      // Filter out soft-deleted records
      const allCategories = await withRetry(
        () => db.select().from(categories)
          .where(isNull(categories.deletedAt))
          .orderBy(desc(categories.createdAt)),
        { operationName: "fetch categories" }
      );
      return NextResponse.json(allCategories, {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      });
    }

    // Validate pagination params
    const paginationParams = paginationSchema.parse({
      page: searchParams.get("page"),
      limit: searchParams.get("limit"),
    });

    const { page, limit } = paginationParams;
    const offset = (page - 1) * limit;

    // Fetch paginated data and total count in parallel
    // Filter out soft-deleted records
    const [paginatedCategories, [{ value: total }]] = await Promise.all([
      withRetry(
        () => db
          .select()
          .from(categories)
          .where(isNull(categories.deletedAt))
          .orderBy(desc(categories.createdAt))
          .limit(limit)
          .offset(offset),
        { operationName: "fetch paginated categories" }
      ),
      withRetry(
        () => db.select({ value: count() }).from(categories).where(isNull(categories.deletedAt)),
        { operationName: "count categories" }
      ),
    ]);

    return NextResponse.json(
      createPaginatedResponse(paginatedCategories, page, limit, total),
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Error al obtener categorías" },
      { status: 500 }
    );
  }
}

// POST new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(createCategorySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const newCategory: NewCategory = {
      name: validatedData.name,
      description: validatedData.description || null,
      icon: validatedData.icon || "folder",
      color: validatedData.color || "gold",
    };

    const [created] = await withRetry(
      () => db.insert(categories).values(newCategory).returning(),
      { operationName: "create category" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Error al crear categoría" },
      { status: 500 }
    );
  }
}

// PATCH update category
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de categoría requerido" },
        { status: 400 }
      );
    }

    // Validate update fields with Zod schema
    const validation = validateRequest(updateCategorySchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const updateData: Partial<NewCategory> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.description !== undefined) updateData.description = validatedData.description;
    if (validatedData.icon !== undefined) updateData.icon = validatedData.icon;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;

    const [updated] = await withRetry(
      () => db.update(categories).set(updateData).where(eq(categories.id, id)).returning(),
      { operationName: "update category" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Error al actualizar categoría" },
      { status: 500 }
    );
  }
}

// DELETE category (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de categoría requerido" },
        { status: 400 }
      );
    }

    // Set categoryId to null for all links in this category
    await withRetry(
      () => db.update(links).set({ categoryId: null }).where(eq(links.categoryId, id)),
      { operationName: "unset links category" }
    );

    // Soft delete: set deletedAt timestamp instead of actually deleting
    const [deleted] = await withRetry(
      () => db.update(categories)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning(),
      { operationName: "soft delete category" }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Categoría no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Error al eliminar categoría" },
      { status: 500 }
    );
  }
}
