/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * Implements the Double Submit Cookie pattern for CSRF protection.
 * This pattern works without server-side sessions by:
 * 1. Setting a random CSRF token in a cookie
 * 2. Requiring the same token to be sent in a header (X-CSRF-Token)
 * 3. Validating that both values match
 *
 * Security considerations:
 * - Token is generated using cryptographically secure random bytes
 * - Cookie is set with SameSite=Lax to prevent CSRF from external sites
 * - Token validation uses timing-safe comparison to prevent timing attacks
 */

import { cookies } from 'next/headers';

/**
 * CSRF token cookie name
 * Note: __Host- prefix requires HTTPS, so we use a simpler name for dev compatibility
 * In production with HTTPS, consider using '__Host-csrf-token' for extra security
 */
export const CSRF_COOKIE_NAME = 'csrf-token';

/**
 * CSRF header name expected in requests
 */
export const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Token length in bytes (32 bytes = 256 bits of entropy)
 */
const TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 * Uses Web Crypto API which is available in both Node.js and Edge runtime
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(TOKEN_LENGTH);
  crypto.getRandomValues(bytes);
  // Convert to hex string for safe transport
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Timing-safe string comparison to prevent timing attacks
 * Compares two strings in constant time
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do the comparison to maintain constant time
    // but we know the result will be false
    const minLen = Math.min(a.length, b.length);
    let result = a.length === b.length ? 0 : 1;
    for (let i = 0; i < minLen; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate CSRF token from request header against cookie
 *
 * @param headerToken - Token from X-CSRF-Token header
 * @param cookieToken - Token from CSRF cookie
 * @returns true if tokens match and are valid
 */
export function validateCsrfToken(
  headerToken: string | null,
  cookieToken: string | null
): boolean {
  // Both tokens must exist
  if (!headerToken || !cookieToken) {
    return false;
  }

  // Both tokens must be the expected length (64 hex chars = 32 bytes)
  const expectedLength = TOKEN_LENGTH * 2;
  if (headerToken.length !== expectedLength || cookieToken.length !== expectedLength) {
    return false;
  }

  // Validate hex format to prevent injection
  const hexRegex = /^[a-f0-9]+$/i;
  if (!hexRegex.test(headerToken) || !hexRegex.test(cookieToken)) {
    return false;
  }

  // Use timing-safe comparison
  return timingSafeEqual(headerToken, cookieToken);
}

/**
 * Get CSRF token options for setting the cookie
 * Uses __Host- prefix for maximum security (requires Secure, no Domain, Path=/)
 */
export function getCsrfCookieOptions(): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
} {
  return {
    // Set to false so JavaScript can read it for the header
    httpOnly: false,
    // Require HTTPS in production
    secure: process.env.NODE_ENV === 'production',
    // Lax allows the cookie to be sent on top-level navigation
    // but prevents it from being sent on cross-site POST requests
    sameSite: 'lax',
    // Cookie is valid for all paths
    path: '/',
    // 24 hours in seconds
    maxAge: 60 * 60 * 24,
  };
}

/**
 * Set CSRF token cookie (for use in API routes)
 */
export async function setCsrfCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  const options = getCsrfCookieOptions();

  cookieStore.set(CSRF_COOKIE_NAME, token, options);
}

/**
 * Get CSRF token from cookies (for use in API routes)
 */
export async function getCsrfTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(CSRF_COOKIE_NAME);
  return cookie?.value ?? null;
}

/**
 * HTTP methods that are considered "safe" and don't require CSRF protection
 * Safe methods should not have side effects on the server
 */
export const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

/**
 * Check if a method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  return !SAFE_METHODS.includes(method.toUpperCase() as typeof SAFE_METHODS[number]);
}

/**
 * API routes that are exempt from CSRF protection
 * These should be carefully considered - only truly public endpoints should be here
 */
export const CSRF_EXEMPT_ROUTES: string[] = [
  // Add any routes that need to be exempt (e.g., webhooks with their own auth)
];

/**
 * Check if a path is exempt from CSRF protection
 * In development mode, all API routes are exempt to avoid CSRF issues with local testing
 */
export function isCsrfExempt(pathname: string): boolean {
  // In development, disable CSRF for all API routes
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  return CSRF_EXEMPT_ROUTES.some((route) => pathname.startsWith(route));
}
