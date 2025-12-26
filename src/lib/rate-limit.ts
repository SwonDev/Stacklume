import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, isRedisAvailable } from "./redis";

/**
 * Rate limit configuration
 *
 * IMPORTANT: Read operations (GETs) are NEVER blocked to ensure widget content
 * is always visible. Rate limiting on reads is only for monitoring/logging.
 *
 * Only write operations, external API calls, and imports are strictly rate limited.
 */

// Rate limiter instances (lazy initialized)
let rateLimiters: {
  read: Ratelimit | null;
  write: Ratelimit | null;
  external: Ratelimit | null;
  import: Ratelimit | null;
  auth: Ratelimit | null;
} | null = null;

/**
 * Initialize rate limiters
 * Returns null if Redis is not configured
 */
function initRateLimiters() {
  if (rateLimiters) return rateLimiters;

  const redis = getRedis();
  if (!redis) {
    rateLimiters = {
      read: null,
      write: null,
      external: null,
      import: null,
      auth: null,
    };
    return rateLimiters;
  }

  rateLimiters = {
    // Read operations - very generous, for monitoring only (never blocks)
    // 1000 requests per minute
    read: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(1000, "1 m"),
      analytics: true,
      prefix: "rl:read",
    }),

    // Write operations (POST/PUT/PATCH/DELETE) - moderate limits
    // 100 requests per minute
    write: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "1 m"),
      analytics: true,
      prefix: "rl:write",
    }),

    // External API calls (scrape, github, steam) - strict limits
    // 30 requests per minute
    external: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "rl:external",
    }),

    // Import operations - very strict limits
    // 10 requests per hour
    import: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"),
      analytics: true,
      prefix: "rl:import",
    }),

    // Auth operations (login attempts) - strict to prevent brute force
    // 10 requests per minute, 50 per hour
    auth: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "rl:auth",
    }),
  };

  return rateLimiters;
}

export type RateLimitType = "read" | "write" | "external" | "import" | "auth";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier and type
 *
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @param type - Type of rate limit to apply
 * @returns Rate limit result or success if Redis is not configured
 */
export async function checkRateLimit(
  identifier: string,
  type: RateLimitType
): Promise<RateLimitResult> {
  const limiters = initRateLimiters();
  const limiter = limiters[type];

  // If Redis is not configured, allow all requests
  if (!limiter) {
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    // On Redis error, allow the request but log the error
    console.error(`Rate limit check failed for ${type}:`, error);
    return {
      success: true,
      limit: Infinity,
      remaining: Infinity,
      reset: 0,
    };
  }
}

/**
 * Check rate limit for read operations (monitoring only, never blocks)
 * This logs excessive read requests but never returns failure
 *
 * @param identifier - Unique identifier
 */
export async function checkReadRateLimit(identifier: string): Promise<void> {
  const result = await checkRateLimit(identifier, "read");

  if (!result.success) {
    // Log but don't block - widget content must always be visible
    console.warn(
      `Read rate limit exceeded for ${identifier}. ` +
      `Remaining: ${result.remaining}/${result.limit}. ` +
      `Reset: ${new Date(result.reset).toISOString()}`
    );
  }
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(result.reset),
  };
}

/**
 * Determine rate limit type from HTTP method and path
 */
export function getRateLimitType(method: string, pathname: string): RateLimitType {
  // Import routes - very strict
  if (pathname.includes("/import")) {
    return "import";
  }

  // External API routes - strict
  if (
    pathname.includes("/scrape") ||
    pathname.includes("/github") ||
    pathname.includes("/steam") ||
    pathname.includes("/nintendo")
  ) {
    return "external";
  }

  // Auth routes - strict (prevent brute force)
  if (pathname.includes("/auth")) {
    return "auth";
  }

  // GET requests - read (monitoring only)
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return "read";
  }

  // All other mutating requests - write
  return "write";
}

/**
 * Extract client identifier from request
 * Uses IP address, falling back to a default for development
 */
export function getClientIdentifier(request: Request): string {
  // Try various headers for IP address
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Get the first IP in the chain
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelIp = request.headers.get("x-vercel-forwarded-for");
  if (vercelIp) {
    return vercelIp.split(",")[0].trim();
  }

  // Fallback for development
  return "127.0.0.1";
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitEnabled(): boolean {
  return isRedisAvailable();
}

/**
 * Routes that should be exempt from rate limiting
 */
export const RATE_LIMIT_EXEMPT_ROUTES = [
  "/api/health",
  "/api/csrf",
  "/_next",
  "/favicon",
  "/manifest",
];

/**
 * Check if a route should be exempt from rate limiting
 */
export function isRateLimitExempt(pathname: string): boolean {
  return RATE_LIMIT_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}
