/**
 * Next.js Middleware for Authentication, CSRF Protection, CORS, and Rate Limiting
 *
 * This middleware implements:
 * 1. Authentication protection (JWT cookie verification)
 * 2. Double Submit Cookie pattern for CSRF protection
 * 3. Explicit CORS headers for API security
 * 4. Rate limiting using Upstash Redis (when configured)
 *
 * The middleware runs on the Edge runtime for optimal performance.
 *
 * IMPORTANT: Read operations (GETs) are NEVER blocked by rate limiting
 * to ensure widget content is always visible to users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import {
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  generateCsrfToken,
  validateCsrfToken,
  getCsrfCookieOptions,
  requiresCsrfProtection,
  isCsrfExempt,
} from '@/lib/security/csrf';
import {
  checkRateLimit,
  checkReadRateLimit,
  getRateLimitHeaders,
  getRateLimitType,
  getClientIdentifier,
  isRateLimitExempt,
  isRateLimitEnabled,
  type RateLimitType,
} from '@/lib/rate-limit';

/**
 * Routes that should be protected by CSRF (API routes)
 */
const API_ROUTE_PREFIX = '/api/';

/**
 * Authentication Configuration
 */
const AUTH_COOKIE_NAME = 'stacklume-auth';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];
const PUBLIC_API_ROUTES = ['/api/auth/login', '/api/auth/logout', '/api/auth/session'];

/**
 * Check if a route is public (doesn't require auth)
 */
function isPublicRoute(pathname: string): boolean {
  // Check exact matches for public routes
  if (PUBLIC_ROUTES.includes(pathname)) return true;
  if (PUBLIC_API_ROUTES.includes(pathname)) return true;

  // Allow static files and Next.js internals
  if (pathname.startsWith('/_next/')) return true;
  if (pathname.startsWith('/favicon')) return true;
  if (pathname.endsWith('.svg')) return true;
  if (pathname.endsWith('.png')) return true;
  if (pathname.endsWith('.ico')) return true;

  return false;
}

/**
 * Verify JWT token using jose (Edge-compatible)
 */
async function verifyAuthToken(token: string): Promise<boolean> {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;

  try {
    const secretKey = new TextEncoder().encode(secret);
    await jwtVerify(token, secretKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * CORS Configuration
 * Configure allowed origins for production security
 */
const CORS_CONFIG = {
  // In production, set this to your actual domain(s)
  // Example: ['https://stacklume.com', 'https://www.stacklume.com']
  // Use '*' only for development or public APIs
  // Note: localhost:3456 is for Electron app in production mode
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://localhost:3000',
    'http://localhost:3456',
    'https://localhost:3456',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Accept-Language',
    'Cache-Control',
  ],
  // Whether to include credentials (cookies, authorization headers)
  allowCredentials: true,
  // Max age for preflight cache (in seconds)
  maxAge: 86400, // 24 hours
};

/**
 * Check if the request is to an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith(API_ROUTE_PREFIX);
}

/**
 * Check if an origin is allowed
 */
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  // Allow all origins if explicitly configured (development only)
  if (CORS_CONFIG.allowedOrigins.includes('*')) {
    return true;
  }

  return CORS_CONFIG.allowedOrigins.includes(origin);
}

/**
 * Add CORS headers to a response
 */
function addCorsHeaders(response: NextResponse, origin: string | null): NextResponse {
  // Only add CORS headers if origin is provided and allowed
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  } else if (CORS_CONFIG.allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Origin', '*');
  }

  response.headers.set(
    'Access-Control-Allow-Methods',
    CORS_CONFIG.allowedMethods.join(', ')
  );

  response.headers.set(
    'Access-Control-Allow-Headers',
    CORS_CONFIG.allowedHeaders.join(', ')
  );

  if (CORS_CONFIG.allowCredentials && !CORS_CONFIG.allowedOrigins.includes('*')) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  response.headers.set(
    'Access-Control-Max-Age',
    CORS_CONFIG.maxAge.toString()
  );

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests
 */
function handlePreflightRequest(origin: string | null): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return addCorsHeaders(response, origin);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const origin = request.headers.get('origin');

  // =========================================================================
  // Authentication Check (runs in both dev and production)
  // =========================================================================

  // Check if AUTH_SECRET is configured (auth is enabled)
  const authEnabled = !!process.env.AUTH_SECRET;

  if (authEnabled && !isPublicRoute(pathname)) {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const isAuthenticated = authCookie ? await verifyAuthToken(authCookie) : false;

    if (!isAuthenticated) {
      // For API routes, return 401
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Authentication required' },
          { status: 401 }
        );
      }
      // For other routes, redirect to login
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // If authenticated user tries to access login page, redirect to home
  if (authEnabled && pathname === '/login') {
    const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    const isAuthenticated = authCookie ? await verifyAuthToken(authCookie) : false;

    if (isAuthenticated) {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  // In development mode, bypass all CORS and CSRF checks for API routes
  if (process.env.NODE_ENV !== 'production') {
    // Handle OPTIONS preflight in dev mode
    if (method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 204 });
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', '*');
      return response;
    }
    // Allow all other requests through in development
    return NextResponse.next();
  }

  // Only process API routes for CSRF protection and CORS
  if (!isApiRoute(pathname)) {
    return NextResponse.next();
  }

  // Handle CORS preflight (OPTIONS) requests first
  if (method === 'OPTIONS') {
    return handlePreflightRequest(origin);
  }

  // Check if origin is allowed for cross-origin requests
  if (origin && !isOriginAllowed(origin)) {
    return NextResponse.json(
      {
        error: 'CORS error',
        message: 'Origin not allowed',
      },
      { status: 403 }
    );
  }

  // =========================================================================
  // Rate Limiting (production only, when Redis is configured)
  // IMPORTANT: Read operations are NEVER blocked, only monitored
  // =========================================================================
  if (isRateLimitEnabled() && !isRateLimitExempt(pathname)) {
    const clientId = getClientIdentifier(request);
    const rateLimitType = getRateLimitType(method, pathname);

    // For read operations, just monitor (never block)
    if (rateLimitType === 'read') {
      // Fire and forget - don't await, don't block
      checkReadRateLimit(clientId).catch(() => {
        // Silently ignore errors - reads must never be blocked
      });
    } else {
      // For write/external/import operations, enforce rate limits
      const rateLimitResult = await checkRateLimit(clientId, rateLimitType);

      if (!rateLimitResult.success) {
        const errorResponse = NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: getRateLimitMessage(rateLimitType),
            retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000),
          },
          { status: 429 }
        );

        // Add rate limit headers
        const rateLimitHeaders = getRateLimitHeaders(rateLimitResult);
        Object.entries(rateLimitHeaders).forEach(([key, value]) => {
          errorResponse.headers.set(key, value);
        });
        errorResponse.headers.set(
          'Retry-After',
          String(Math.ceil((rateLimitResult.reset - Date.now()) / 1000))
        );

        addCorsHeaders(errorResponse, origin);
        return errorResponse;
      }
    }
  }

  // Create response with CORS headers
  const response = NextResponse.next();
  addCorsHeaders(response, origin);

  // Check if this route is exempt from CSRF protection
  if (isCsrfExempt(pathname)) {
    return response;
  }

  const existingToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // For safe methods (GET, HEAD, OPTIONS), ensure a token exists
  if (!requiresCsrfProtection(method)) {
    // If no token exists, generate one and set it
    if (!existingToken) {
      const newToken = generateCsrfToken();
      const options = getCsrfCookieOptions();

      response.cookies.set(CSRF_COOKIE_NAME, newToken, {
        httpOnly: options.httpOnly,
        secure: options.secure,
        sameSite: options.sameSite,
        path: options.path,
        maxAge: options.maxAge,
      });
    }

    return response;
  }

  // For mutating methods, validate the CSRF token
  const headerToken = request.headers.get(CSRF_HEADER_NAME);
  const cookieToken = existingToken ?? null;

  // Validate the tokens match
  if (!validateCsrfToken(headerToken, cookieToken)) {
    const errorResponse = NextResponse.json(
      {
        error: 'CSRF validation failed',
        message: 'Invalid or missing CSRF token. Please refresh the page and try again.',
      },
      { status: 403 }
    );
    addCorsHeaders(errorResponse, origin);
    return errorResponse;
  }

  // Token is valid, allow the request to proceed
  return response;
}

/**
 * Get user-friendly rate limit message based on operation type
 */
function getRateLimitMessage(type: RateLimitType): string {
  switch (type) {
    case 'import':
      return 'Demasiadas importaciones. Por favor, espera antes de importar más datos.';
    case 'external':
      return 'Demasiadas solicitudes a APIs externas. Por favor, espera un momento.';
    case 'auth':
      return 'Demasiados intentos de autenticación. Por favor, espera antes de intentar de nuevo.';
    case 'write':
      return 'Demasiadas solicitudes. Por favor, reduce la frecuencia de tus acciones.';
    default:
      return 'Has excedido el límite de solicitudes. Por favor, espera un momento.';
  }
}

/**
 * Configure which routes the middleware should run on
 * We apply it to all routes for authentication and API routes for security
 */
export const config = {
  matcher: [
    /*
     * Match all routes except:
     * - Static files (_next/static)
     * - Image optimization files (_next/image)
     * - Favicon and manifest files
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.svg$|.*\\.png$|.*\\.ico$).*)',
  ],
};
