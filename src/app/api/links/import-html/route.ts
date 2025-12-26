import { NextRequest, NextResponse } from "next/server";
import { db, links, categories, withRetry, type NewLink, type NewCategory } from "@/lib/db";
import { htmlImportSchema, validateRequest, IMPORT_LIMITS } from "@/lib/validations";

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

// Simple HTML bookmark parser with improved error handling
function parseBookmarksHtml(html: string): {
  bookmarks: Array<{
    title: string;
    url: string;
    addDate?: number;
    category?: string;
  }>;
  errors: string[];
} {
  const bookmarks: Array<{
    title: string;
    url: string;
    addDate?: number;
    category?: string;
  }> = [];
  const errors: string[] = [];

  // Match folder names (H3 tags)
  let currentCategory: string | undefined;

  // Split by lines for simpler parsing
  const lines = html.split("\n");

  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];

    try {
      // Check for folder/category (H3 tag)
      const folderMatch = line.match(/<H3[^>]*>([^<]+)<\/H3>/i);
      if (folderMatch) {
        const rawCategory = folderMatch[1].trim();
        // Sanitize category name
        const sanitizedCategory = sanitizeText(rawCategory);
        if (sanitizedCategory && sanitizedCategory.length <= 100) {
          currentCategory = sanitizedCategory;
        } else if (sanitizedCategory && sanitizedCategory.length > 100) {
          currentCategory = sanitizedCategory.substring(0, 100);
          errors.push(`Line ${lineNum + 1}: Category name truncated to 100 characters`);
        }
        continue;
      }

      // Check for bookmark (A tag) - more robust regex
      const linkMatch = line.match(/<A\s+[^>]*HREF="([^"]+)"[^>]*>([^<]*)<\/A>/i);
      if (linkMatch) {
        const rawUrl = linkMatch[1];
        const rawTitle = linkMatch[2].trim();

        // Extract ADD_DATE if present
        const addDateMatch = line.match(/ADD_DATE="(\d+)"/i);
        const addDateStr = addDateMatch ? addDateMatch[1] : undefined;

        // Sanitize and validate URL
        const sanitizedUrl = sanitizeUrl(rawUrl);
        if (!sanitizedUrl) {
          // Skip javascript:, about:, file:, and other non-http URLs
          continue;
        }

        // Sanitize title
        let sanitizedTitle = sanitizeText(rawTitle);
        if (!sanitizedTitle) {
          // Use URL as title if title is empty
          sanitizedTitle = sanitizedUrl.substring(0, 255);
        } else if (sanitizedTitle.length > 255) {
          sanitizedTitle = sanitizedTitle.substring(0, 255);
          errors.push(`Line ${lineNum + 1}: Title truncated to 255 characters`);
        }

        bookmarks.push({
          title: sanitizedTitle,
          url: sanitizedUrl,
          addDate: addDateStr ? parseInt(addDateStr, 10) : undefined,
          category: currentCategory,
        });
      }

      // Reset category when closing a folder
      if (line.includes("</DL>")) {
        // Go back to parent category (simplified - just reset for now)
        currentCategory = undefined;
      }
    } catch {
      errors.push(`Line ${lineNum + 1}: Failed to parse line`);
    }
  }

  return { bookmarks, errors };
}

// TODO: Add rate limiting middleware to prevent abuse
// Consider using @upstash/ratelimit or similar for production

// POST - Import HTML bookmarks
export async function POST(request: NextRequest) {
  try {
    // Get raw HTML content
    let html: string;
    try {
      html = await request.text();
    } catch {
      return NextResponse.json(
        {
          error: "Failed to read request body",
          details: ["Could not read HTML content from request"]
        },
        { status: 400 }
      );
    }

    // Validate HTML input
    const validation = validateRequest(htmlImportSchema, { html });

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Parse bookmarks from HTML
    const { bookmarks, errors: parseErrors } = parseBookmarksHtml(validation.data.html);

    // Check if any bookmarks were found
    if (bookmarks.length === 0) {
      return NextResponse.json(
        {
          error: "No valid bookmarks found",
          details: [
            "The HTML content does not contain any valid bookmarks",
            "Make sure to export bookmarks from your browser in HTML format",
            ...parseErrors.slice(0, 5) // Include first 5 parse errors
          ]
        },
        { status: 400 }
      );
    }

    // Check import limit
    if (bookmarks.length > IMPORT_LIMITS.MAX_LINKS_PER_IMPORT) {
      return NextResponse.json(
        {
          error: "Too many bookmarks",
          details: [
            `Found ${bookmarks.length} bookmarks, but maximum allowed is ${IMPORT_LIMITS.MAX_LINKS_PER_IMPORT}`,
            "Please split your bookmarks file into smaller chunks"
          ]
        },
        { status: 400 }
      );
    }

    let imported = 0;
    const skipped: string[] = [];
    const categoryCache = new Map<string, string>(); // name -> id

    for (const bookmark of bookmarks) {
      // Check for duplicate URL
      const existing = await withRetry(
        () => db.query.links.findFirst({
          where: (l, { eq }) => eq(l.url, bookmark.url),
        }),
        { operationName: "check existing link" }
      );

      if (existing) {
        skipped.push(`Duplicate: ${bookmark.url.substring(0, 50)}...`);
        continue; // Skip duplicates
      }

      // Handle category
      let categoryId: string | null = null;
      if (bookmark.category) {
        // Check cache first
        if (categoryCache.has(bookmark.category)) {
          categoryId = categoryCache.get(bookmark.category)!;
        } else {
          // Check if category exists
          const existingCat = await withRetry(
            () => db.query.categories.findFirst({
              where: (c, { eq }) => eq(c.name, bookmark.category!),
            }),
            { operationName: "check existing category" }
          );

          if (existingCat) {
            categoryId = existingCat.id;
            categoryCache.set(bookmark.category, existingCat.id);
          } else {
            // Create new category
            const newCat: NewCategory = {
              name: bookmark.category,
            };
            const [created] = await withRetry(
              () => db.insert(categories).values(newCat).returning(),
              { operationName: "create category" }
            );
            categoryId = created.id;
            categoryCache.set(bookmark.category, created.id);
          }
        }
      }

      // Create the link
      const newLink: NewLink = {
        url: bookmark.url,
        title: bookmark.title,
        categoryId,
        source: "import-html",
        isFavorite: false,
      };

      await withRetry(
        () => db.insert(links).values(newLink),
        { operationName: "import html link" }
      );
      imported++;
    }

    return NextResponse.json({
      success: true,
      imported,
      total: bookmarks.length,
      skipped: skipped.length,
      skippedDetails: skipped.slice(0, 10), // Only return first 10 skipped items
      parseWarnings: parseErrors.slice(0, 5), // Return first 5 parse warnings
      limits: {
        maxLinksPerImport: IMPORT_LIMITS.MAX_LINKS_PER_IMPORT,
        maxHtmlSizeBytes: IMPORT_LIMITS.MAX_HTML_SIZE_BYTES,
      }
    });
  } catch (error) {
    console.error("Error importing HTML bookmarks:", error);
    return NextResponse.json(
      { error: "Error al importar marcadores HTML" },
      { status: 500 }
    );
  }
}
