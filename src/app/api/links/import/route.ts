import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, links, categories, tags, linkTags, withRetry, type NewLink, type NewCategory, type NewTag, generateId } from "@/lib/db";
import { importDataSchema, validateRequest, IMPORT_LIMITS } from "@/lib/validations";
import { checkRateLimit, getClientIdentifier } from "@/lib/rate-limit";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

/**
 * Sanitizes a string by removing potentially dangerous HTML/scripts
 * Returns the sanitized text content
 */
function sanitizeText(input: string | null | undefined): string | null {
  if (!input) return null;

  // Remove HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');

  // Decode common HTML entities
  sanitized = sanitized
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // Remove any remaining HTML entities
  sanitized = sanitized.replace(/&[#a-zA-Z0-9]+;/g, '');

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized || null;
}

/**
 * Sanitizes a URL by validating its format and protocol
 * Returns null if the URL is invalid or uses a disallowed protocol
 */
function sanitizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;

  try {
    const url = new URL(input);
    // Only allow http and https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      return null;
    }
    // Block javascript: in any part of the URL
    if (url.href.toLowerCase().includes('javascript:')) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

// POST - Import JSON backup
export async function POST(request: NextRequest) {
  try {
    // Verificar Content-Length si está disponible
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Archivo demasiado grande (máx 5MB)" }, { status: 413 });
    }

    // Rate limiting por IP
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await checkRateLimit(identifier, "import");
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes de importación. Inténtalo más tarde." },
        { status: 429 }
      );
    }

    // Parse request body
    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid JSON in request body",
          details: ["Request body must be valid JSON"]
        },
        { status: 400 }
      );
    }

    // Validate the import data against schema
    const validation = validateRequest(importDataSchema, data);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;

    let imported = 0;
    const skipped: string[] = [];
    const categoryIdMap = new Map<string, string>(); // old id/name -> new id
    const tagIdMap = new Map<string, string>();       // old id/name -> new id

    // Envolver toda la lógica de inserción en una transacción atómica
    type TxDb = Parameters<Parameters<NeonHttpDatabase["transaction"]>[0]>[0];

    await (db as unknown as NeonHttpDatabase).transaction(async (tx: TxDb) => {
      // ── 1. Importar categorías ────────────────────────────────────────────────
      if (validatedData.categories && validatedData.categories.length > 0) {
        for (const cat of validatedData.categories) {
          const sanitizedName = sanitizeText(cat.name);
          if (!sanitizedName) {
            skipped.push(`Category skipped: invalid name`);
            continue;
          }

          const sanitizedColor = sanitizeText(cat.color);
          const sanitizedIcon  = sanitizeText(cat.icon);
          const sanitizedDesc  = sanitizeText(cat.description);

          // Buscar categoría existente por nombre
          const existing = await withRetry(
            () => (tx as unknown as typeof db).query.categories.findFirst({
              where: (c, { eq: ceq }) => ceq(c.name, sanitizedName),
            }),
            { operationName: "check existing category" }
          );

          if (existing) {
            // Mapear el ID original → ID existente
            if (cat.id) categoryIdMap.set(cat.id, existing.id);
            categoryIdMap.set(sanitizedName, existing.id);

            // Actualizar color/icono/descripción si el export los trae
            // (restaura fielmente los datos exportados)
            const updates: Record<string, unknown> = { updatedAt: new Date() };
            if (sanitizedColor) updates.color = sanitizedColor;
            if (sanitizedIcon)  updates.icon  = sanitizedIcon;
            if (sanitizedDesc)  updates.description = sanitizedDesc;

            if (Object.keys(updates).length > 1) {
              await withRetry(
                () => tx.update(categories).set(updates).where(eq(categories.id, existing.id)),
                { operationName: "update category from import" }
              );
            }
          } else {
            // Crear categoría nueva con todos sus datos
            const newCat: NewCategory = {
              id: generateId(),
              name: sanitizedName,
              description: sanitizedDesc,
              icon: sanitizedIcon,
              color: sanitizedColor,
              createdAt: new Date(),
              updatedAt: new Date(),
            };
            const [created] = await withRetry(
              () => tx.insert(categories).values(newCat).returning(),
              { operationName: "import category" }
            );
            if (cat.id) categoryIdMap.set(cat.id, created.id);
            categoryIdMap.set(sanitizedName, created.id);
          }
        }
      }

      // ── 2. Importar tags ──────────────────────────────────────────────────────
      if (validatedData.tags && validatedData.tags.length > 0) {
        for (const tag of validatedData.tags) {
          const sanitizedName = sanitizeText(tag.name);
          if (!sanitizedName) {
            skipped.push(`Tag skipped: invalid name`);
            continue;
          }

          const sanitizedColor = sanitizeText(tag.color);

          const existing = await withRetry(
            () => (tx as unknown as typeof db).query.tags.findFirst({
              where: (t, { eq: teq }) => teq(t.name, sanitizedName),
            }),
            { operationName: "check existing tag" }
          );

          if (existing) {
            if (tag.id) tagIdMap.set(tag.id, existing.id);
            tagIdMap.set(sanitizedName, existing.id);

            // Actualizar color si el export lo trae
            if (sanitizedColor) {
              await withRetry(
                () => tx.update(tags)
                  .set({ color: sanitizedColor })
                  .where(eq(tags.id, existing.id)),
                { operationName: "update tag color from import" }
              );
            }
          } else {
            const newTag: NewTag = {
              id: generateId(),
              name: sanitizedName,
              color: sanitizedColor,
              createdAt: new Date(),
            };
            const [created] = await withRetry(
              () => tx.insert(tags).values(newTag).returning(),
              { operationName: "import tag" }
            );
            if (tag.id) tagIdMap.set(tag.id, created.id);
            tagIdMap.set(sanitizedName, created.id);
          }
        }
      }

      // ── 3. Importar links ─────────────────────────────────────────────────────
      if (validatedData.links && validatedData.links.length > 0) {
        for (const link of validatedData.links) {
          // Sanitizar URL — crítico para seguridad
          const sanitizedUrl = sanitizeUrl(link.url);
          if (!sanitizedUrl) {
            skipped.push(`Link skipped: invalid URL "${link.url?.substring(0, 50)}..."`);
            continue;
          }

          // Sanitizar título
          const sanitizedTitle = sanitizeText(link.title);
          if (!sanitizedTitle) {
            skipped.push(`Link skipped: invalid title for URL "${sanitizedUrl.substring(0, 50)}..."`);
            continue;
          }

          // Comprobar duplicado por URL
          const existing = await withRetry(
            () => (tx as unknown as typeof db).query.links.findFirst({
              where: (l, { eq: leq }) => leq(l.url, sanitizedUrl),
            }),
            { operationName: "check existing link" }
          );

          if (existing) {
            skipped.push(`Link skipped: duplicate URL "${sanitizedUrl.substring(0, 50)}..."`);
            continue;
          }

          // Resolver categoryId: primero por UUID original, luego por nombre
          let resolvedCategoryId: string | null = null;
          if (link.categoryId) {
            resolvedCategoryId =
              categoryIdMap.get(link.categoryId) ??
              null;
          }

          const newLink: NewLink = {
            id: generateId(),
            url: sanitizedUrl,
            title: sanitizedTitle,
            description: sanitizeText(link.description),
            imageUrl: sanitizeUrl(link.imageUrl),
            faviconUrl: sanitizeUrl(link.faviconUrl),
            categoryId: resolvedCategoryId,
            isFavorite: link.isFavorite || false,
            siteName: sanitizeText(link.siteName),
            author: sanitizeText(link.author),
            source: sanitizeText(link.source) || "import",
            platform: sanitizeText(link.platform),
            contentType: sanitizeText(link.contentType),
            platformColor: sanitizeText(link.platformColor),
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          const [created] = await withRetry(
            () => tx.insert(links).values(newLink).returning(),
            { operationName: "import link" }
          );
          imported++;

          // Importar asociaciones link-tag usando el ID original del link
          const originalLinkId = link.id; // Ahora accesible directamente (id en schema)
          if (validatedData.linkTags && Array.isArray(validatedData.linkTags) && originalLinkId) {
            const linkTagAssocs = validatedData.linkTags.filter((lt) => lt.linkId === originalLinkId);
            for (const assoc of linkTagAssocs) {
              const newTagId = tagIdMap.get(assoc.tagId);
              if (newTagId) {
                await withRetry(
                  () => tx.insert(linkTags).values({
                    linkId: created.id,
                    tagId: newTagId,
                  }).onConflictDoNothing(),
                  { operationName: "import link-tag association" }
                );
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      imported,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 10), // Only return first 10 skipped items
      limits: {
        maxLinksPerImport: IMPORT_LIMITS.MAX_LINKS_PER_IMPORT,
        maxCategoriesPerImport: IMPORT_LIMITS.MAX_CATEGORIES_PER_IMPORT,
        maxTagsPerImport: IMPORT_LIMITS.MAX_TAGS_PER_IMPORT,
      }
    });
  } catch (error) {
    console.error("Error importing links:", error);
    return NextResponse.json(
      { error: "Error al importar enlaces" },
      { status: 500 }
    );
  }
}
