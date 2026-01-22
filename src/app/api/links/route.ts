import { NextRequest, NextResponse } from "next/server";
import { db, links, linkTags, withRetry, type NewLink, createPaginatedResponse } from "@/lib/db";
import { desc, asc, count, isNull, eq, and, inArray } from "drizzle-orm";
import { paginationSchema, createLinkSchema, validateRequest, linkFilterSchema, sortSchema } from "@/lib/validations";
import { createModuleLogger } from "@/lib/logger";
import { z } from "zod";

// Create a module-specific logger
const log = createModuleLogger("api/links");

// Extended sort schema for links (includes 'order' field)
const linksSortSchema = sortSchema.extend({
  sortBy: z.enum(["createdAt", "updatedAt", "title", "order"]).default("createdAt"),
});

// Combined query params schema for GET with filtering and sorting
const getLinksQuerySchema = paginationSchema
  .merge(linkFilterSchema)
  .merge(linksSortSchema);


/**
 * GET /api/links
 *
 * Fetch links with optional pagination, filtering, and sorting.
 *
 * Query Parameters:
 * - categoryId: Filter by category UUID
 * - tagId: Filter by tag UUID (joins with linkTags)
 * - isFavorite: Filter by favorite status (true/false)
 * - platform: Filter by platform type
 * - contentType: Filter by content type
 * - search: Simple text search in title/description
 * - sortBy: Field to sort by (createdAt, updatedAt, title, order)
 * - sortOrder: Sort direction (asc, desc)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 20, max: 100)
 *
 * For backwards compatibility, if no pagination params are provided,
 * returns all links without pagination wrapper.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Check if any query params are provided (for backwards compatibility)
    const hasPageParam = searchParams.has("page");
    const hasLimitParam = searchParams.has("limit");
    const hasFilterParams =
      searchParams.has("categoryId") ||
      searchParams.has("tagId") ||
      searchParams.has("isFavorite") ||
      searchParams.has("platform") ||
      searchParams.has("contentType") ||
      searchParams.has("search") ||
      searchParams.has("sortBy") ||
      searchParams.has("sortOrder");

    const useAdvancedQuery = hasPageParam || hasLimitParam || hasFilterParams;

    if (!useAdvancedQuery) {
      // Backwards compatibility: return all links if no query params
      const allLinks = await withRetry(
        () =>
          db
            .select()
            .from(links)
            .where(isNull(links.deletedAt))
            .orderBy(desc(links.createdAt)),
        { operationName: "fetch links" }
      );
      return NextResponse.json(allLinks);
    }

    // Parse query parameters
    const rawParams = {
      categoryId: searchParams.get("categoryId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      isFavorite: searchParams.get("isFavorite") || undefined,
      platform: searchParams.get("platform") || undefined,
      contentType: searchParams.get("contentType") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
    };

    // Validate parameters
    const validation = validateRequest(getLinksQuerySchema, rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.errors.join(", ") },
        { status: 400 }
      );
    }

    const params = validation.data;
    const {
      categoryId,
      tagId,
      isFavorite,
      platform,
      contentType,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    } = params;
    const offset = (page - 1) * limit;

    // Build conditions array - always exclude soft-deleted
    const conditions: ReturnType<typeof eq>[] = [];
    conditions.push(isNull(links.deletedAt));

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

    if (contentType) {
      conditions.push(eq(links.contentType, contentType));
    }

    // Handle tag filtering - requires join with linkTags
    if (tagId) {
      const taggedLinkIds = await withRetry(
        () =>
          db
            .select({ linkId: linkTags.linkId })
            .from(linkTags)
            .where(eq(linkTags.tagId, tagId)),
        { operationName: "fetch tagged link IDs" }
      );

      const linkIds = taggedLinkIds.map((lt) => lt.linkId);

      if (linkIds.length === 0) {
        // No links have this tag, return empty result
        return NextResponse.json(createPaginatedResponse([], page, limit, 0));
      }

      conditions.push(inArray(links.id, linkIds));
    }

    // Handle simple search (for full-text search, use /api/links/search)
    // This is a lightweight filter, not full search
    if (search) {
      const { ilike, or } = await import("drizzle-orm");
      const searchPattern = `%${search}%`;
      conditions.push(
        or(
          ilike(links.title, searchPattern),
          ilike(links.description, searchPattern)
        )!
      );
    }

    // Determine sort column and order
    const sortColumn = {
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
      title: links.title,
      order: links.order,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Build the where clause
    const whereClause = and(...conditions);

    // Fetch paginated data and total count in parallel
    const [paginatedLinks, [{ value: total }]] = await Promise.all([
      withRetry(
        () =>
          db
            .select()
            .from(links)
            .where(whereClause)
            .orderBy(orderFn(sortColumn))
            .limit(limit)
            .offset(offset),
        { operationName: "fetch paginated links with filters" }
      ),
      withRetry(
        () => db.select({ value: count() }).from(links).where(whereClause),
        { operationName: "count filtered links" }
      ),
    ]);

    log.debug(
      {
        filters: { categoryId, tagId, isFavorite, platform, contentType, search },
        sorting: { sortBy, sortOrder },
        pagination: { page, limit, offset },
        resultsCount: paginatedLinks.length,
        total,
      },
      "Links fetched with filters"
    );

    return NextResponse.json(createPaginatedResponse(paginatedLinks, page, limit, total));
  } catch (error) {
    log.error({ error, operation: "GET" }, "Error fetching links");
    return NextResponse.json({ error: "Error al obtener enlaces" }, { status: 500 });
  }
}

// POST new link
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      log.error({ error: parseError }, "Failed to parse request body");
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    log.debug({ body }, "Received POST request to create link");

    // Validate request body with Zod schema
    const validation = validateRequest(createLinkSchema, body);
    if (!validation.success) {
      log.warn({ errors: validation.errors, body }, "Validation failed for create link");
      return NextResponse.json({ error: validation.errors.join(", ") }, { status: 400 });
    }

    const validatedData = validation.data;

    const newLink: NewLink = {
      url: validatedData.url,
      title: validatedData.title,
      description: validatedData.description || null,
      imageUrl: validatedData.imageUrl || null,
      faviconUrl: validatedData.faviconUrl || null,
      categoryId: validatedData.categoryId || null,
      isFavorite: validatedData.isFavorite,
      siteName: validatedData.siteName || null,
      author: validatedData.author || null,
      source: validatedData.source || "manual",
      // Platform detection info
      platform: validatedData.platform || null,
      contentType: validatedData.contentType || null,
      platformColor: validatedData.platformColor || null,
    };

    log.debug({ newLink }, "Attempting to insert link into database");

    const [created] = await withRetry(
      () => db.insert(links).values(newLink).returning(),
      { operationName: "create link" }
    );

    log.info({ linkId: created.id, url: created.url }, "Link created successfully");
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    log.error({ error: errorMessage, stack: errorStack, operation: "POST" }, "Error creating link");
    return NextResponse.json({
      error: "Error al crear enlace",
      details: process.env.NODE_ENV !== "production" ? errorMessage : undefined
    }, { status: 500 });
  }
}
