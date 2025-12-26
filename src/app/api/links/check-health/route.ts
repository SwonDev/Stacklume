import { NextRequest, NextResponse } from "next/server";
import { db, links, withRetry } from "@/lib/db";
import { eq, inArray, isNull, and } from "drizzle-orm";
import { createModuleLogger } from "@/lib/logger";
import { validateUrlForSSRF } from "@/lib/security/ssrf-protection";

// Create a module-specific logger
const log = createModuleLogger("api/links/check-health");

// Health status types
type HealthStatus = "ok" | "redirect" | "broken" | "timeout" | "error";

interface LinkHealthResult {
  id: string;
  url: string;
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  checkedAt: string;
  error?: string;
}

// Request timeout in milliseconds
const REQUEST_TIMEOUT = 5000;

/**
 * Check a single URL's health status
 * Includes SSRF protection to prevent requests to internal/private networks
 */
async function checkUrlHealth(url: string): Promise<{
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  error?: string;
}> {
  const startTime = Date.now();

  // SSRF Protection: Validate URL before making the request
  const ssrfValidation = await validateUrlForSSRF(url);
  if (!ssrfValidation.safe) {
    return {
      status: "error",
      responseTimeMs: Date.now() - startTime,
      error: `SSRF protection blocked request: ${ssrfValidation.reason}`,
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "manual", // Don't follow redirects automatically
      headers: {
        "User-Agent": "Stacklume-LinkChecker/1.0",
      },
    });

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    // Handle redirects (3xx status codes)
    if (response.status >= 300 && response.status < 400) {
      const redirectUrl = response.headers.get("location") || undefined;
      return {
        status: "redirect",
        statusCode: response.status,
        redirectUrl,
        responseTimeMs,
      };
    }

    // Handle success (2xx status codes)
    if (response.status >= 200 && response.status < 300) {
      return {
        status: "ok",
        statusCode: response.status,
        responseTimeMs,
      };
    }

    // Handle client/server errors (4xx, 5xx)
    return {
      status: "broken",
      statusCode: response.status,
      responseTimeMs,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    // Check if it was an abort (timeout)
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "timeout",
        responseTimeMs,
        error: `Request timed out after ${REQUEST_TIMEOUT}ms`,
      };
    }

    // Other errors (network issues, DNS failures, etc.)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return {
      status: "error",
      responseTimeMs,
      error: errorMessage,
    };
  }
}

// POST check health of multiple links
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { linkIds } = body as { linkIds: string[] };

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json(
        { error: "linkIds array is required" },
        { status: 400 }
      );
    }

    // Limit the number of links that can be checked at once
    const MAX_LINKS = 50;
    if (linkIds.length > MAX_LINKS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LINKS} links can be checked at once` },
        { status: 400 }
      );
    }

    log.info({ linkCount: linkIds.length }, "Starting link health check");

    // Fetch the links from the database
    const linksToCheck = await withRetry(
      () => db.select({ id: links.id, url: links.url })
        .from(links)
        .where(and(inArray(links.id, linkIds), isNull(links.deletedAt))),
      { operationName: "fetch links for health check" }
    );

    if (linksToCheck.length === 0) {
      return NextResponse.json(
        { error: "No valid links found" },
        { status: 404 }
      );
    }

    // Check health of all links in parallel
    const healthResults: LinkHealthResult[] = await Promise.all(
      linksToCheck.map(async (link) => {
        const healthCheck = await checkUrlHealth(link.url);
        return {
          id: link.id,
          url: link.url,
          status: healthCheck.status,
          statusCode: healthCheck.statusCode,
          redirectUrl: healthCheck.redirectUrl,
          responseTimeMs: healthCheck.responseTimeMs,
          checkedAt: new Date().toISOString(),
          error: healthCheck.error,
        };
      })
    );

    // Update the links in the database with health status
    const updatePromises = healthResults.map((result) =>
      withRetry(
        () => db.update(links)
          .set({
            lastCheckedAt: new Date(),
            healthStatus: result.status,
            updatedAt: new Date(),
          })
          .where(eq(links.id, result.id)),
        { operationName: `update link health: ${result.id}` }
      )
    );

    await Promise.all(updatePromises);

    // Calculate summary statistics
    const summary = {
      total: healthResults.length,
      ok: healthResults.filter((r) => r.status === "ok").length,
      redirect: healthResults.filter((r) => r.status === "redirect").length,
      broken: healthResults.filter((r) => r.status === "broken").length,
      timeout: healthResults.filter((r) => r.status === "timeout").length,
      error: healthResults.filter((r) => r.status === "error").length,
    };

    log.info(
      { summary },
      `Link health check completed: ${summary.ok} ok, ${summary.broken} broken, ${summary.timeout} timeout`
    );

    return NextResponse.json({
      results: healthResults,
      summary,
    });
  } catch (error) {
    log.error({ error }, "Error checking link health");
    return NextResponse.json(
      { error: "Error al verificar estado de enlaces" },
      { status: 500 }
    );
  }
}

// GET check health of all links (convenience endpoint)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

    // Get links that haven't been checked recently or never checked
    const linksToCheck = await withRetry(
      () => db.select({ id: links.id, url: links.url })
        .from(links)
        .where(isNull(links.deletedAt))
        .limit(limit),
      { operationName: "fetch links for health check" }
    );

    if (linksToCheck.length === 0) {
      return NextResponse.json({
        results: [],
        summary: { total: 0, ok: 0, redirect: 0, broken: 0, timeout: 0, error: 0 },
        message: "No links to check",
      });
    }

    // Check health of all links in parallel
    const healthResults: LinkHealthResult[] = await Promise.all(
      linksToCheck.map(async (link) => {
        const healthCheck = await checkUrlHealth(link.url);
        return {
          id: link.id,
          url: link.url,
          status: healthCheck.status,
          statusCode: healthCheck.statusCode,
          redirectUrl: healthCheck.redirectUrl,
          responseTimeMs: healthCheck.responseTimeMs,
          checkedAt: new Date().toISOString(),
          error: healthCheck.error,
        };
      })
    );

    // Update the links in the database with health status
    const updatePromises = healthResults.map((result) =>
      withRetry(
        () => db.update(links)
          .set({
            lastCheckedAt: new Date(),
            healthStatus: result.status,
            updatedAt: new Date(),
          })
          .where(eq(links.id, result.id)),
        { operationName: `update link health: ${result.id}` }
      )
    );

    await Promise.all(updatePromises);

    // Calculate summary statistics
    const summary = {
      total: healthResults.length,
      ok: healthResults.filter((r) => r.status === "ok").length,
      redirect: healthResults.filter((r) => r.status === "redirect").length,
      broken: healthResults.filter((r) => r.status === "broken").length,
      timeout: healthResults.filter((r) => r.status === "timeout").length,
      error: healthResults.filter((r) => r.status === "error").length,
    };

    return NextResponse.json({
      results: healthResults,
      summary,
    });
  } catch (error) {
    log.error({ error }, "Error checking link health");
    return NextResponse.json(
      { error: "Error al verificar estado de enlaces" },
      { status: 500 }
    );
  }
}
