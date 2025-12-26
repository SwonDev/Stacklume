"use client";

/**
 * useCsrf Hook
 *
 * React hook for accessing the CSRF token from cookies.
 * Used to include the token in API requests via the X-CSRF-Token header.
 *
 * Usage:
 * ```tsx
 * const { csrfToken, getCsrfHeaders } = useCsrf();
 *
 * // Include in fetch requests
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     ...getCsrfHeaders(),
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */

import { useCallback, useMemo, useSyncExternalStore } from 'react';

// Define constants here to avoid importing from server-only module
// These must match the values in @/lib/security/csrf.ts
const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * Parse a cookie value from document.cookie
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

// Subscription function for useSyncExternalStore
// Cookie changes are typically initiated by our own code or server responses,
// so we use a simple polling approach for rare cases where cookie changes externally
let listeners: Array<() => void> = [];

function subscribe(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): string | null {
  return getCookie(CSRF_COOKIE_NAME);
}

function getServerSnapshot(): string | null {
  return null;
}

// Notify all listeners when token should be refreshed
function notifyListeners(): void {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * Hook return type
 */
interface UseCsrfReturn {
  /**
   * The current CSRF token, or null if not available
   */
  csrfToken: string | null;

  /**
   * Get headers object with the CSRF token included
   * Useful for spreading into fetch headers
   */
  getCsrfHeaders: () => Record<string, string>;

  /**
   * Refresh the token from cookies (useful after a new token is set)
   */
  refreshToken: () => void;

  /**
   * Whether the token is available
   */
  hasToken: boolean;
}

/**
 * Hook to access and manage CSRF tokens
 * Uses useSyncExternalStore for React 18+ compatible external state synchronization
 */
export function useCsrf(): UseCsrfReturn {
  // Use useSyncExternalStore to read cookie value without triggering cascading renders
  const csrfToken = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Generate headers object with CSRF token
  const getCsrfHeaders = useCallback((): Record<string, string> => {
    // Read fresh token directly from cookies to ensure we have the latest
    const token = getCookie(CSRF_COOKIE_NAME);
    if (!token) {
      return {};
    }
    return {
      [CSRF_HEADER_NAME]: token,
    };
  }, []);

  // Memoized return value
  return useMemo(
    () => ({
      csrfToken,
      getCsrfHeaders,
      refreshToken: notifyListeners,
      hasToken: csrfToken !== null,
    }),
    [csrfToken, getCsrfHeaders]
  );
}

/**
 * Utility function to get CSRF token directly (non-hook version)
 * Useful for use outside of React components
 */
export function getCsrfToken(): string | null {
  return getCookie(CSRF_COOKIE_NAME);
}

/**
 * Utility function to get CSRF headers directly (non-hook version)
 * Useful for use in API client or other non-component code
 */
export function getCsrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) {
    return {};
  }
  return {
    [CSRF_HEADER_NAME]: token,
  };
}
