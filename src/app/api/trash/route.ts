import { NextRequest, NextResponse } from "next/server";
import { db, links, categories, tags, widgets, withRetry } from "@/lib/db";
import { isNotNull, eq } from "drizzle-orm";

// Valid item types for trash operations
type TrashItemType = "link" | "category" | "tag" | "widget";

// GET all soft-deleted items
export async function GET() {
  try {
    // Fetch all soft-deleted items from each table in parallel
    const [deletedLinks, deletedCategories, deletedTags, deletedWidgets] = await Promise.all([
      withRetry(
        () => db.select().from(links).where(isNotNull(links.deletedAt)),
        { operationName: "fetch deleted links" }
      ),
      withRetry(
        () => db.select().from(categories).where(isNotNull(categories.deletedAt)),
        { operationName: "fetch deleted categories" }
      ),
      withRetry(
        () => db.select().from(tags).where(isNotNull(tags.deletedAt)),
        { operationName: "fetch deleted tags" }
      ),
      withRetry(
        () => db.select().from(widgets).where(isNotNull(widgets.deletedAt)),
        { operationName: "fetch deleted widgets" }
      ),
    ]);

    // Return all deleted items organized by type
    return NextResponse.json({
      links: deletedLinks.map((item) => ({
        ...item,
        type: "link" as const,
      })),
      categories: deletedCategories.map((item) => ({
        ...item,
        type: "category" as const,
      })),
      tags: deletedTags.map((item) => ({
        ...item,
        type: "tag" as const,
      })),
      widgets: deletedWidgets.map((item) => ({
        ...item,
        type: "widget" as const,
      })),
      totals: {
        links: deletedLinks.length,
        categories: deletedCategories.length,
        tags: deletedTags.length,
        widgets: deletedWidgets.length,
        total: deletedLinks.length + deletedCategories.length + deletedTags.length + deletedWidgets.length,
      },
    });
  } catch (error) {
    console.error("Error fetching trash items:", error);
    return NextResponse.json(
      { error: "Error al obtener elementos eliminados" },
      { status: 500 }
    );
  }
}

// POST restore item from trash
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, type } = body as { id: string; type: TrashItemType };

    if (!id || !type) {
      return NextResponse.json(
        { error: "ID y tipo son requeridos" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: TrashItemType[] = ["link", "category", "tag", "widget"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo invalido. Debe ser uno de: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    let restored: unknown = null;

    // Restore the item by setting deletedAt to null
    switch (type) {
      case "link": {
        const [restoredLink] = await withRetry(
          () => db.update(links)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(links.id, id))
            .returning(),
          { operationName: "restore link" }
        );
        restored = restoredLink;
        break;
      }
      case "category": {
        const [restoredCategory] = await withRetry(
          () => db.update(categories)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(categories.id, id))
            .returning(),
          { operationName: "restore category" }
        );
        restored = restoredCategory;
        break;
      }
      case "tag": {
        const [restoredTag] = await withRetry(
          () => db.update(tags)
            .set({ deletedAt: null })
            .where(eq(tags.id, id))
            .returning(),
          { operationName: "restore tag" }
        );
        restored = restoredTag;
        break;
      }
      case "widget": {
        const [restoredWidget] = await withRetry(
          () => db.update(widgets)
            .set({ deletedAt: null, updatedAt: new Date() })
            .where(eq(widgets.id, id))
            .returning(),
          { operationName: "restore widget" }
        );
        restored = restoredWidget;
        break;
      }
    }

    if (!restored) {
      return NextResponse.json(
        { error: "Elemento no encontrado en la papelera" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Elemento restaurado exitosamente",
      restored,
    });
  } catch (error) {
    console.error("Error restoring item:", error);
    return NextResponse.json(
      { error: "Error al restaurar elemento" },
      { status: 500 }
    );
  }
}

// DELETE permanently delete item (hard delete)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const type = searchParams.get("type") as TrashItemType | null;

    if (!id || !type) {
      return NextResponse.json(
        { error: "ID y tipo son requeridos" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes: TrashItemType[] = ["link", "category", "tag", "widget"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Tipo invalido. Debe ser uno de: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    let deleted: unknown = null;

    // Permanently delete the item
    switch (type) {
      case "link": {
        const [deletedLink] = await withRetry(
          () => db.delete(links).where(eq(links.id, id)).returning(),
          { operationName: "hard delete link" }
        );
        deleted = deletedLink;
        break;
      }
      case "category": {
        const [deletedCategory] = await withRetry(
          () => db.delete(categories).where(eq(categories.id, id)).returning(),
          { operationName: "hard delete category" }
        );
        deleted = deletedCategory;
        break;
      }
      case "tag": {
        const [deletedTag] = await withRetry(
          () => db.delete(tags).where(eq(tags.id, id)).returning(),
          { operationName: "hard delete tag" }
        );
        deleted = deletedTag;
        break;
      }
      case "widget": {
        const [deletedWidget] = await withRetry(
          () => db.delete(widgets).where(eq(widgets.id, id)).returning(),
          { operationName: "hard delete widget" }
        );
        deleted = deletedWidget;
        break;
      }
    }

    if (!deleted) {
      return NextResponse.json(
        { error: "Elemento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Elemento eliminado permanentemente",
      deleted,
    });
  } catch (error) {
    console.error("Error permanently deleting item:", error);
    return NextResponse.json(
      { error: "Error al eliminar elemento permanentemente" },
      { status: 500 }
    );
  }
}
