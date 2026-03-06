import { NextResponse } from "next/server";
import { db, withRetry } from "@/lib/db";
import { links, categories, tags, widgets } from "@/lib/db/schema";
import { count, isNull, eq, and } from "drizzle-orm";
import { InMemoryCache } from "@/lib/cache";

const statsCache = new InMemoryCache<object>({ defaultTTL: 5 * 60 * 1000, maxEntries: 10 });

export async function GET() {
  const cached = statsCache.get("stats");
  if (cached) return NextResponse.json(cached);

  try {
    const [
      [{ totalLinks }],
      [{ totalCategories }],
      [{ totalTags }],
      [{ totalWidgets }],
    ] = await withRetry(
      () =>
        Promise.all([
          db.select({ totalLinks: count() }).from(links).where(isNull(links.deletedAt)),
          db
            .select({ totalCategories: count() })
            .from(categories)
            .where(isNull(categories.deletedAt)),
          db.select({ totalTags: count() }).from(tags).where(isNull(tags.deletedAt)),
          db.select({ totalWidgets: count() }).from(widgets).where(isNull(widgets.deletedAt)),
        ]),
      { operationName: "fetch stats" }
    );

    // Conteo de links favoritos
    const [{ favorites }] = await withRetry(
      () =>
        db
          .select({ favorites: count() })
          .from(links)
          .where(and(isNull(links.deletedAt), eq(links.isFavorite, true))),
      { operationName: "fetch favorites count" }
    );

    const stats = { totalLinks, totalCategories, totalTags, totalWidgets, favorites };
    statsCache.set("stats", stats);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}
