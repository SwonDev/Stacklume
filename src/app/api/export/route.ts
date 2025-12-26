import { NextRequest, NextResponse } from "next/server";
import { db, links, categories, tags, linkTags, withRetry } from "@/lib/db";
import { eq, isNull, and, type SQL } from "drizzle-orm";
import { generateVisualHTML, generateNetscapeHTML } from "@/lib/export-utils";

type ExportFormat = "json" | "html" | "netscape";

/**
 * GET /api/export
 *
 * Export links in various formats (JSON, HTML, Netscape).
 *
 * Query Parameters:
 * - format: "json" | "html" | "netscape" (default: "json")
 * - categoryId: (optional) Export only links from specific category
 * - includeDeleted: (optional) "true" to include soft-deleted items
 *
 * Returns:
 * - JSON: Application/json with complete export data
 * - HTML: Visual HTML document for viewing/printing
 * - Netscape: Browser-compatible bookmark HTML for import
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const format = (searchParams.get("format") || "json") as ExportFormat;
    const categoryId = searchParams.get("categoryId");
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    // Validate format parameter
    if (!["json", "html", "netscape"].includes(format)) {
      return NextResponse.json(
        { error: "Formato no valido. Use: json, html, o netscape" },
        { status: 400 }
      );
    }

    // Build filter conditions for links
    const linkConditions: SQL<unknown>[] = [];

    // Filter by soft delete status
    if (!includeDeleted) {
      linkConditions.push(isNull(links.deletedAt));
    }

    // Filter by category if specified
    if (categoryId) {
      linkConditions.push(eq(links.categoryId, categoryId));
    }

    // Build filter conditions for categories and tags
    const categoryConditions = includeDeleted ? [] : [isNull(categories.deletedAt)];
    const tagConditions = includeDeleted ? [] : [isNull(tags.deletedAt)];

    // Fetch all data in parallel
    const [allLinks, allCategories, allTags, allLinkTags] = await Promise.all([
      withRetry(
        () => {
          if (linkConditions.length === 0) {
            return db.select().from(links);
          } else if (linkConditions.length === 1) {
            return db.select().from(links).where(linkConditions[0]);
          } else {
            return db.select().from(links).where(and(...linkConditions));
          }
        },
        { operationName: "export fetch links" }
      ),
      withRetry(
        () => {
          if (categoryConditions.length === 0) {
            return db.select().from(categories);
          }
          return db.select().from(categories).where(categoryConditions[0]);
        },
        { operationName: "export fetch categories" }
      ),
      withRetry(
        () => {
          if (tagConditions.length === 0) {
            return db.select().from(tags);
          }
          return db.select().from(tags).where(tagConditions[0]);
        },
        { operationName: "export fetch tags" }
      ),
      withRetry(
        () => db.select().from(linkTags),
        { operationName: "export fetch linkTags" }
      ),
    ]);

    // Filter linkTags to only include relationships for exported links
    const exportedLinkIds = new Set(allLinks.map((l) => l.id));
    const filteredLinkTags = allLinkTags.filter((lt) => exportedLinkIds.has(lt.linkId));

    // Prepare export data object
    const exportData = {
      links: allLinks,
      categories: allCategories,
      tags: allTags,
      linkTags: filteredLinkTags,
    };

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const baseFilename = `stacklume-export-${timestamp}`;

    // Return response based on format
    switch (format) {
      case "json": {
        const jsonContent = JSON.stringify(exportData, null, 2);
        return new NextResponse(jsonContent, {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseFilename}.json"`,
            "Cache-Control": "no-cache",
          },
        });
      }

      case "html": {
        const htmlContent = generateVisualHTML(exportData);
        return new NextResponse(htmlContent, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseFilename}.html"`,
            "Cache-Control": "no-cache",
          },
        });
      }

      case "netscape": {
        const netscapeContent = generateNetscapeHTML(exportData);
        return new NextResponse(netscapeContent, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Disposition": `attachment; filename="${baseFilename}-bookmarks.html"`,
            "Cache-Control": "no-cache",
          },
        });
      }

      default:
        return NextResponse.json(
          { error: "Formato no soportado" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error exporting data:", error);
    return NextResponse.json(
      { error: "Error al exportar datos" },
      { status: 500 }
    );
  }
}
