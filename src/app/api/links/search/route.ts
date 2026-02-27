import { NextRequest, NextResponse } from "next/server";
import { db, links, linkTags, withRetry, createPaginatedResponse, getCurrentDatabaseType } from "@/lib/db";
import { eq, and, isNull, ilike, like, or, count, desc, asc, inArray } from "drizzle-orm";
import { paginationSchema, linkFilterSchema, sortSchema, validateRequest } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";
import { z } from "zod";

// Create a module-specific logger
const log = createModuleLogger("api/links/search");

// Search query schema
const searchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required").max(200, "Search query too long"),
});

// Combined search params schema
const searchParamsSchema = paginationSchema
  .merge(linkFilterSchema)
  .merge(sortSchema.extend({
    sortBy: z.enum(["createdAt", "updatedAt", "title", "order"]).default("createdAt"),
  }))
  .merge(searchQuerySchema);

export type SearchParamsInput = z.infer<typeof searchParamsSchema>;

/**
 * GET /api/links/search
 *
 * Search links across title, description, url, and siteName fields.
 * Supports additional filtering by categoryId, tagId, isFavorite, and platform.
 * Returns paginated results.
 *
 * Query Parameters:
 * - q: Search term (required)
 * - categoryId: Filter by category UUID
 * - tagId: Filter by tag UUID
 * - isFavorite: Filter by favorite status (true/false)
 * - platform: Filter by platform type
 * - sortBy: Field to sort by (createdAt, updatedAt, title, order)
 * - sortOrder: Sort direction (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const rawParams = {
      q: searchParams.get("q"),
      categoryId: searchParams.get("categoryId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      isFavorite: searchParams.get("isFavorite") || undefined,
      platform: searchParams.get("platform") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    // Validate parameters
    const validation = validateRequest(searchParamsSchema, rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const params = validation.data;
    const { q, categoryId, tagId, isFavorite, platform, sortBy, sortOrder, page, limit } = params;
    const offset = (page - 1) * limit;

    // Build search pattern para ILIKE (PG) o LIKE (SQLite)
    const searchPattern = `%${q}%`;
    const isDesktop = getCurrentDatabaseType() === "sqlite";

    // Build base conditions array
    const conditions = [
      isNull(links.deletedAt),
      isDesktop
        ? or(
            like(links.title, searchPattern),
            like(links.description, searchPattern),
            like(links.url, searchPattern),
            like(links.siteName, searchPattern)
          )
        : or(
            ilike(links.title, searchPattern),
            ilike(links.description, searchPattern),
            ilike(links.url, searchPattern),
            ilike(links.siteName, searchPattern)
          ),
    ];

    // Add optional filters
    if (categoryId) {
      conditions.push(eq(links.categoryId, categoryId));
    }

    if (isFavorite !== undefined) {
      conditions.push(eq(links.isFavorite, isFavorite));
    }

    if (platform) {
      conditions.push(eq(links.platform, platform));
    }

    // Determine sort column and order
    const sortColumn = {
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
      title: links.title,
      order: links.order,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Handle tag filtering - requires join with linkTags
    if (tagId) {
      // Get link IDs that have the specified tag
      const taggedLinkIds = await withRetry(
        () => db
          .select({ linkId: linkTags.linkId })
          .from(linkTags)
          .where(eq(linkTags.tagId, tagId)),
        { operationName: "fetch tagged link IDs for search" }
      );

      const linkIds = taggedLinkIds.map((lt) => lt.linkId);

      if (linkIds.length === 0) {
        // No links have this tag, return empty result
        return NextResponse.json(
          createPaginatedResponse([], page, limit, 0)
        );
      }

      // Add tag filter condition
      conditions.push(inArray(links.id, linkIds));
    }

    // Build the where clause
    const whereClause = and(...conditions);

    // Execute query and count in parallel
    const [searchResults, [{ value: total }]] = await Promise.all([
      withRetry(
        () => db
          .select()
          .from(links)
          .where(whereClause)
          .orderBy(orderFn(sortColumn))
          .limit(limit)
          .offset(offset),
        { operationName: "search links" }
      ),
      withRetry(
        () => db.select({ value: count() }).from(links).where(whereClause),
        { operationName: "count search results" }
      ),
    ]);

    log.info(
      { query: q, resultsCount: searchResults.length, total, page },
      "Search completed successfully"
    );

    return NextResponse.json(
      createPaginatedResponse(searchResults, page, limit, total)
    );
  } catch (error) {
    log.error({ error, operation: "GET" }, "Error searching links");
    return NextResponse.json(
      { error: "Error al buscar enlaces" },
      { status: 500 }
    );
  }
}
