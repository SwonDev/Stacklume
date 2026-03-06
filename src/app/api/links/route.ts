import { NextRequest, NextResponse } from "next/server";
import { db, links, linkTags, withRetry, type NewLink, createPaginatedResponse, generateId, getCurrentDatabaseType } from "@/lib/db";
import { desc, asc, count, isNull, eq, and, inArray, like, ilike, or, gte, lte } from "drizzle-orm";
import { paginationSchema, createLinkSchema, validateRequest, linkFilterSchema, sortSchema, type TagLogic } from "@/lib/validations";
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
 * Obtiene enlaces con paginación, filtros y orden.
 *
 * Parámetros de consulta:
 * - categoryId: Filtra por UUID de categoría
 * - tagId: Filtra por UUID de etiqueta (una sola, compatible con versiones anteriores)
 * - tagIds: IDs de etiquetas separados por coma: "id1,id2,id3"
 * - tagLogic: "AND" (todos) | "OR" (alguno) — defecto "OR"
 * - isFavorite: Filtra por estado favorito (true/false)
 * - platform: Filtra por plataforma
 * - contentType: Filtra por tipo de contenido
 * - search: Búsqueda de texto en título/descripción
 * - dateFrom: Fecha de inicio ISO 8601 (ej: 2024-01-01T00:00:00Z)
 * - dateTo: Fecha de fin ISO 8601
 * - sortBy: Campo de orden (createdAt, updatedAt, title, order)
 * - sortOrder: Dirección (asc, desc)
 * - page: Número de página (defecto: 1)
 * - limit: Resultados por página (defecto: 50, máx: 100)
 *
 * Nota de compatibilidad: cuando no hay parámetros de paginación ni filtros,
 * devuelve todos los enlaces sin envoltorio de paginación (compatibilidad con
 * el fetch inicial de page.tsx). En cualquier otro caso siempre pagina.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Detectar si hay parámetros de consulta (compatibilidad hacia atrás)
    const hasPageParam = searchParams.has("page");
    const hasLimitParam = searchParams.has("limit");
    const hasFilterParams =
      searchParams.has("categoryId") ||
      searchParams.has("tagId") ||
      searchParams.has("tagIds") ||
      searchParams.has("isFavorite") ||
      searchParams.has("platform") ||
      searchParams.has("contentType") ||
      searchParams.has("search") ||
      searchParams.has("sortBy") ||
      searchParams.has("sortOrder") ||
      searchParams.has("dateFrom") ||
      searchParams.has("dateTo");

    const useAdvancedQuery = hasPageParam || hasLimitParam || hasFilterParams;

    if (!useAdvancedQuery) {
      // Compatibilidad hacia atrás: devuelve todos los enlaces sin paginación
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

    // Construir objeto de parámetros brutos
    const rawParams = {
      categoryId: searchParams.get("categoryId") || undefined,
      tagId: searchParams.get("tagId") || undefined,
      tagIds: searchParams.get("tagIds") || undefined,
      tagLogic: searchParams.get("tagLogic") || undefined,
      isFavorite: searchParams.get("isFavorite") || undefined,
      platform: searchParams.get("platform") || undefined,
      contentType: searchParams.get("contentType") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      dateFrom: searchParams.get("dateFrom") || undefined,
      dateTo: searchParams.get("dateTo") || undefined,
    };

    // Validar parámetros
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
      dateFrom,
      dateTo,
    } = params;

    // Parsear tagIds y tagLogic directamente del schema validado
    const tagIdsRaw = params.tagIds;
    const tagLogic: TagLogic = (params.tagLogic as TagLogic) ?? "OR";
    const tagIds = tagIdsRaw ? tagIdsRaw.split(",").filter(Boolean) : [];

    const offset = (page - 1) * limit;

    // Construir condiciones — siempre excluir registros soft-deleted
    const conditions: ReturnType<typeof eq>[] = [];
    conditions.push(isNull(links.deletedAt));

    // Filtros opcionales
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

    // Filtro por etiqueta única (tagId — compatibilidad)
    if (tagId && tagIds.length === 0) {
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
        return NextResponse.json(createPaginatedResponse([], page, limit, 0));
      }

      conditions.push(inArray(links.id, linkIds));
    }

    // Filtro por múltiples etiquetas (tagIds)
    if (tagIds.length > 0) {
      if (tagLogic === "OR") {
        // OR: enlaces que tengan AL MENOS UNA de las etiquetas
        const taggedRows = await withRetry(
          () =>
            db
              .selectDistinct({ linkId: linkTags.linkId })
              .from(linkTags)
              .where(inArray(linkTags.tagId, tagIds)),
          { operationName: "fetch multi-tag link IDs (OR)" }
        );
        const linkIds = taggedRows.map((r) => r.linkId);
        if (linkIds.length === 0) {
          return NextResponse.json(createPaginatedResponse([], page, limit, 0));
        }
        conditions.push(inArray(links.id, linkIds));
      } else {
        // AND: enlaces que tengan TODAS las etiquetas
        // Estrategia: obtener links para cada tag y calcular la intersección
        const setsOfIds: string[][] = await Promise.all(
          tagIds.map(async (tid) => {
            const rows = await withRetry(
              () =>
                db
                  .select({ linkId: linkTags.linkId })
                  .from(linkTags)
                  .where(eq(linkTags.tagId, tid)),
              { operationName: "fetch tag link IDs (AND)" }
            );
            return rows.map((r) => r.linkId);
          })
        );
        // Intersección de todos los conjuntos
        const intersection = setsOfIds.reduce((acc, set) => {
          const setB = new Set(set);
          return acc.filter((id) => setB.has(id));
        });
        if (intersection.length === 0) {
          return NextResponse.json(createPaginatedResponse([], page, limit, 0));
        }
        conditions.push(inArray(links.id, intersection));
      }
    }

    // Filtro de búsqueda de texto
    // ilike es solo PostgreSQL; en SQLite usamos like (case-insensitive para ASCII)
    if (search) {
      const searchPattern = `%${search}%`;
      if (getCurrentDatabaseType() === "sqlite") {
        conditions.push(
          or(
            like(links.title, searchPattern),
            like(links.description, searchPattern)
          )!
        );
      } else {
        conditions.push(
          or(
            ilike(links.title, searchPattern),
            ilike(links.description, searchPattern)
          )!
        );
      }
    }

    // Filtros de rango de fecha
    if (dateFrom) {
      const parsedFrom = new Date(dateFrom);
      if (!isNaN(parsedFrom.getTime())) {
        conditions.push(gte(links.createdAt, parsedFrom));
      }
    }
    if (dateTo) {
      const parsedTo = new Date(dateTo);
      if (!isNaN(parsedTo.getTime())) {
        conditions.push(lte(links.createdAt, parsedTo));
      }
    }

    // Columna y dirección de orden
    const sortColumn = {
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
      title: links.title,
      order: links.order,
    }[sortBy];

    const orderFn = sortOrder === "asc" ? asc : desc;

    // Cláusula WHERE
    const whereClause = and(...conditions);

    // Datos paginados y total en paralelo
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
        filters: { categoryId, tagId, tagIds, tagLogic, isFavorite, platform, contentType, search, dateFrom, dateTo },
        sorting: { sortBy, sortOrder },
        pagination: { page, limit, offset },
        resultsCount: paginatedLinks.length,
        total,
      },
      "Links fetched with filters"
    );

    return NextResponse.json(createPaginatedResponse(paginatedLinks, page, limit, total));
  } catch (error) {
    log.error({ error, operation: "GET" }, "Error fetching enlaces");
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

    // Check for duplicate URL before inserting
    const existingLink = await withRetry(
      () =>
        db
          .select({ id: links.id, url: links.url, title: links.title })
          .from(links)
          .where(and(eq(links.url, validatedData.url), isNull(links.deletedAt)))
          .limit(1),
      { operationName: "check duplicate URL" }
    );

    if (existingLink.length > 0) {
      log.warn({ url: validatedData.url, existingId: existingLink[0].id }, "Duplicate URL detected");
      return NextResponse.json({
        error: "URL duplicada",
        details: `Este enlace ya existe: "${existingLink[0].title}"`,
        existingLink: existingLink[0]
      }, { status: 409 }); // 409 Conflict
    }

    const newLink: NewLink = {
      id: generateId(), // Necesario para SQLite; PostgreSQL acepta IDs externos
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
      createdAt: new Date(),
      updatedAt: new Date(),
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

    // Check for unique constraint violation (PostgreSQL error code 23505)
    if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint') || errorMessage.includes('23505')) {
      return NextResponse.json({
        error: "URL duplicada",
        details: "Este enlace ya existe en tu colección"
      }, { status: 409 });
    }

    // Sanitize error for other cases
    const sanitizedError = errorMessage
      .replace(/postgresql:\/\/[^@]+@/gi, 'postgresql://***@') // Hide DB credentials
      .replace(/password[=:]["']?[^"'\s]+/gi, 'password=***'); // Hide passwords
    return NextResponse.json({
      error: "Error al crear enlace",
      details: sanitizedError
    }, { status: 500 });
  }
}
