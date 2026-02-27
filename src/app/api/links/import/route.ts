import { NextRequest, NextResponse } from "next/server";
import { db, links, categories, tags, linkTags, withRetry, type NewLink, type NewCategory, type NewTag, generateId } from "@/lib/db";
import { importDataSchema, validateRequest, IMPORT_LIMITS } from "@/lib/validations";

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

// TODO: Add rate limiting middleware to prevent abuse
// Consider using @upstash/ratelimit or similar for production

// POST - Import JSON backup
export async function POST(request: NextRequest) {
  try {
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
    const categoryIdMap = new Map<string, string>(); // old id -> new id
    const tagIdMap = new Map<string, string>(); // old id -> new id

    // Import categories first
    if (validatedData.categories && validatedData.categories.length > 0) {
      for (const cat of validatedData.categories) {
        // Sanitize category data
        const sanitizedName = sanitizeText(cat.name);
        if (!sanitizedName) {
          skipped.push(`Category skipped: invalid name`);
          continue;
        }

        // Check if category with same name exists
        const existing = await withRetry(
          () => db.query.categories.findFirst({
            where: (c, { eq }) => eq(c.name, sanitizedName),
          }),
          { operationName: "check existing category" }
        );

        if (existing) {
          // Use the ID from the original data if available, otherwise use the name
          const originalId = (cat as { id?: string }).id;
          if (originalId) {
            categoryIdMap.set(originalId, existing.id);
          }
          categoryIdMap.set(sanitizedName, existing.id);
        } else {
          const newCat: NewCategory = {
            id: generateId(),
            name: sanitizedName,
            description: sanitizeText(cat.description),
            icon: sanitizeText(cat.icon),
            color: sanitizeText(cat.color),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          const [created] = await withRetry(
            () => db.insert(categories).values(newCat).returning(),
            { operationName: "import category" }
          );
          const originalId = (cat as { id?: string }).id;
          if (originalId) {
            categoryIdMap.set(originalId, created.id);
          }
          categoryIdMap.set(sanitizedName, created.id);
        }
      }
    }

    // Import tags
    if (validatedData.tags && validatedData.tags.length > 0) {
      for (const tag of validatedData.tags) {
        // Sanitize tag data
        const sanitizedName = sanitizeText(tag.name);
        if (!sanitizedName) {
          skipped.push(`Tag skipped: invalid name`);
          continue;
        }

        // Check if tag with same name exists
        const existing = await withRetry(
          () => db.query.tags.findFirst({
            where: (t, { eq }) => eq(t.name, sanitizedName),
          }),
          { operationName: "check existing tag" }
        );

        if (existing) {
          const originalId = (tag as { id?: string }).id;
          if (originalId) {
            tagIdMap.set(originalId, existing.id);
          }
          tagIdMap.set(sanitizedName, existing.id);
        } else {
          const newTag: NewTag = {
            id: generateId(),
            name: sanitizedName,
            color: sanitizeText(tag.color),
            createdAt: new Date(),
          };
          const [created] = await withRetry(
            () => db.insert(tags).values(newTag).returning(),
            { operationName: "import tag" }
          );
          const originalId = (tag as { id?: string }).id;
          if (originalId) {
            tagIdMap.set(originalId, created.id);
          }
          tagIdMap.set(sanitizedName, created.id);
        }
      }
    }

    // Import links
    if (validatedData.links && validatedData.links.length > 0) {
      for (const link of validatedData.links) {
        // Sanitize URL - this is critical for security
        const sanitizedUrl = sanitizeUrl(link.url);
        if (!sanitizedUrl) {
          skipped.push(`Link skipped: invalid URL "${link.url?.substring(0, 50)}..."`);
          continue;
        }

        // Sanitize title
        const sanitizedTitle = sanitizeText(link.title);
        if (!sanitizedTitle) {
          skipped.push(`Link skipped: invalid title for URL "${sanitizedUrl.substring(0, 50)}..."`);
          continue;
        }

        // Check for duplicate URL
        const existing = await withRetry(
          () => db.query.links.findFirst({
            where: (l, { eq }) => eq(l.url, sanitizedUrl),
          }),
          { operationName: "check existing link" }
        );

        if (existing) {
          skipped.push(`Link skipped: duplicate URL "${sanitizedUrl.substring(0, 50)}..."`);
          continue;
        }

        // Resolve category ID
        let resolvedCategoryId: string | null = null;
        if (link.categoryId) {
          resolvedCategoryId = categoryIdMap.get(link.categoryId) || null;
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
          () => db.insert(links).values(newLink).returning(),
          { operationName: "import link" }
        );
        imported++;

        // Import link-tag associations
        const originalLinkId = (link as { id?: string }).id;
        if (validatedData.linkTags && Array.isArray(validatedData.linkTags) && originalLinkId) {
          const linkTagAssocs = validatedData.linkTags.filter((lt) => lt.linkId === originalLinkId);
          for (const assoc of linkTagAssocs) {
            const newTagId = tagIdMap.get(assoc.tagId);
            if (newTagId) {
              await withRetry(
                () => db.insert(linkTags).values({
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
