import { NextRequest, NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { eq, isNull, and, or } from "drizzle-orm";

/**
 * Normalizes a URL for duplicate detection.
 *
 * Normalization steps:
 * 1. Parse the URL
 * 2. Convert hostname to lowercase
 * 3. Remove trailing slashes from pathname
 * 4. Remove common tracking parameters (utm_*, ref, etc.)
 * 5. Normalize protocol (treat http and https as equivalent for comparison)
 * 6. Remove www. prefix for comparison
 * 7. Sort query parameters for consistent comparison
 */
function normalizeUrl(urlString: string): { normalized: string; variants: string[] } {
  try {
    const url = new URL(urlString);

    // Lowercase the hostname
    url.hostname = url.hostname.toLowerCase();

    // Remove www. prefix for normalization
    const hostnameWithoutWww = url.hostname.replace(/^www\./, "");

    // Remove trailing slashes from pathname (but keep root /)
    if (url.pathname !== "/" && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    // Remove common tracking parameters
    const trackingParams = [
      "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
      "ref", "ref_src", "ref_url", "referrer",
      "fbclid", "gclid", "msclkid", "twclid",
      "mc_cid", "mc_eid",
      "_ga", "_gl",
    ];

    trackingParams.forEach((param) => {
      url.searchParams.delete(param);
    });

    // Sort remaining query parameters for consistent comparison
    url.searchParams.sort();

    // Generate the normalized URL (using https as canonical)
    const normalizedHostname = hostnameWithoutWww;
    const normalizedPath = url.pathname + url.search + url.hash;
    const normalized = `https://${normalizedHostname}${normalizedPath}`;

    // Generate URL variants to check in database
    // These are different forms the same URL might be stored as
    const variants: string[] = [];

    // With and without www
    const hostnames = [hostnameWithoutWww, `www.${hostnameWithoutWww}`];
    const protocols = ["https://", "http://"];
    const pathVariants = [
      url.pathname + url.search + url.hash,
      url.pathname + "/" + url.search + url.hash, // With trailing slash
    ];

    // Generate all combinations
    for (const protocol of protocols) {
      for (const hostname of hostnames) {
        for (const path of pathVariants) {
          variants.push(`${protocol}${hostname}${path}`);
        }
      }
    }

    // Remove duplicates
    const uniqueVariants = [...new Set(variants)];

    return { normalized, variants: uniqueVariants };
  } catch {
    // If URL parsing fails, return the original string
    return { normalized: urlString.toLowerCase(), variants: [urlString] };
  }
}

/**
 * GET /api/links/check-duplicate
 *
 * Check if a URL already exists in the database.
 *
 * Query Parameters:
 * - url: The URL to check for duplicates (required)
 *
 * Returns:
 * - isDuplicate: boolean indicating if the URL exists
 * - existingLink: The existing link object if found (optional)
 * - normalizedUrl: The normalized form of the input URL
 *
 * Notes:
 * - Excludes soft-deleted links from the check
 * - Normalizes URLs to catch equivalent URLs stored differently
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    // Validate required parameter
    if (!url) {
      return NextResponse.json(
        { error: "URL es requerida" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "URL no valida" },
        { status: 400 }
      );
    }

    // Normalize the URL and get variants to check
    const { normalized, variants } = normalizeUrl(url);

    // Build OR conditions for all URL variants
    const urlConditions = variants.map((variant) => eq(links.url, variant));

    // Query database for any matching URL (excluding soft-deleted)
    const existingLinks = await withRetry(
      () =>
        db
          .select()
          .from(links)
          .where(
            and(
              isNull(links.deletedAt),
              or(...urlConditions)
            )
          )
          .limit(1),
      { operationName: "check duplicate URL" }
    );

    const existingLink = existingLinks[0] || null;
    const isDuplicate = existingLink !== null;

    return NextResponse.json({
      isDuplicate,
      existingLink: existingLink || undefined,
      normalizedUrl: normalized,
      checkedVariants: variants.length,
    });
  } catch (error) {
    console.error("Error checking duplicate URL:", error);
    return NextResponse.json(
      { error: "Error al verificar URL duplicada" },
      { status: 500 }
    );
  }
}
