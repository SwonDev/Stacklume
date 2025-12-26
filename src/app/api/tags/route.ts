import { NextRequest, NextResponse } from "next/server";
import { db, tags, withRetry, type NewTag, createPaginatedResponse } from "@/lib/db";
import { asc, eq, count, isNull } from "drizzle-orm";
import { paginationSchema, createTagSchema, updateTagSchema, validateRequest } from "@/lib/validations";

// GET all tags with optional pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if pagination params are provided
    const hasPageParam = searchParams.has("page");
    const hasLimitParam = searchParams.has("limit");
    const usePagination = hasPageParam || hasLimitParam;

    if (!usePagination) {
      // Backwards compatibility: return all tags if no pagination params
      // Filter out soft-deleted records
      const allTags = await withRetry(
        () => db.select().from(tags)
          .where(isNull(tags.deletedAt))
          .orderBy(asc(tags.name)),
        { operationName: "fetch tags" }
      );
      return NextResponse.json(allTags, {
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
    const [paginatedTags, [{ value: total }]] = await Promise.all([
      withRetry(
        () => db
          .select()
          .from(tags)
          .where(isNull(tags.deletedAt))
          .orderBy(asc(tags.name))
          .limit(limit)
          .offset(offset),
        { operationName: "fetch paginated tags" }
      ),
      withRetry(
        () => db.select({ value: count() }).from(tags).where(isNull(tags.deletedAt)),
        { operationName: "count tags" }
      ),
    ]);

    return NextResponse.json(
      createPaginatedResponse(paginatedTags, page, limit, total),
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Error al obtener etiquetas" },
      { status: 500 }
    );
  }
}

// POST new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod schema
    const validation = validateRequest(createTagSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const newTag: NewTag = {
      name: validatedData.name,
      color: validatedData.color || null,
    };

    const [created] = await withRetry(
      () => db.insert(tags).values(newTag).returning(),
      { operationName: "create tag" }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Error al crear etiqueta" },
      { status: 500 }
    );
  }
}

// PUT update tag
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID de etiqueta requerido" },
        { status: 400 }
      );
    }

    // Validate update fields with Zod schema
    const validation = validateRequest(updateTagSchema, body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    const updateData: Partial<NewTag> = {};
    if (validatedData.name !== undefined) updateData.name = validatedData.name;
    if (validatedData.color !== undefined) updateData.color = validatedData.color;

    const [updated] = await withRetry(
      () => db.update(tags).set(updateData).where(eq(tags.id, id)).returning(),
      { operationName: "update tag" }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Error al actualizar etiqueta" },
      { status: 500 }
    );
  }
}

// DELETE tag (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ID de etiqueta requerido" },
        { status: 400 }
      );
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    const [deleted] = await withRetry(
      () => db.update(tags)
        .set({ deletedAt: new Date() })
        .where(eq(tags.id, id))
        .returning(),
      { operationName: "soft delete tag" }
    );

    if (!deleted) {
      return NextResponse.json(
        { error: "Etiqueta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Error al eliminar etiqueta" },
      { status: 500 }
    );
  }
}
