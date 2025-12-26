/**
 * URL Utility Functions
 *
 * Centralized URL manipulation and normalization utilities
 */

/**
 * Ensures a URL has a protocol prefix (defaults to https://)
 * Use this when you have a URL input that might be missing the protocol.
 *
 * @param url - The URL to normalize
 * @returns The URL with https:// prefix if it was missing
 *
 * @example
 * ensureProtocol("example.com") // "https://example.com"
 * ensureProtocol("https://example.com") // "https://example.com"
 */
export function ensureProtocol(url: string): string {
  if (!url) return url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return "https://" + url;
  }
  return url;
}

/**
 * Normalizes a URL for comparison/duplicate detection.
 * Removes www prefix, trailing slashes, and normalizes the URL structure.
 * Preserves port numbers for non-standard ports.
 *
 * @param url - The URL to normalize
 * @returns A normalized string representation for comparison
 *
 * @example
 * normalizeUrlForComparison("https://www.example.com/path/") // "example.com/path"
 * normalizeUrlForComparison("http://example.com/path?query=1") // "example.com/path?query=1"
 * normalizeUrlForComparison("http://localhost:3000/path") // "localhost:3000/path"
 */
export function normalizeUrlForComparison(url: string): string {
  try {
    const parsed = new URL(url);
    // Use host (includes port) instead of hostname (no port)
    // Remove www prefix and trailing slashes
    const host = parsed.host.replace(/^www\./, '');
    let normalized = host + parsed.pathname.replace(/\/$/, '');
    // Include search params if they exist
    if (parsed.search) {
      normalized += parsed.search;
    }
    return normalized.toLowerCase();
  } catch {
    // If URL parsing fails, just return the original lowercased
    return url.toLowerCase();
  }
}

/**
 * Extracts the hostname from a URL, removing www prefix but preserving port
 *
 * @param url - The URL to extract hostname from
 * @returns The hostname (with port if present) without www prefix, or the original URL if parsing fails
 *
 * @example
 * extractHostname("https://www.example.com/path") // "example.com"
 * extractHostname("http://localhost:3000/path") // "localhost:3000"
 */
export function extractHostname(url: string): string {
  try {
    // Use host (includes port) instead of hostname
    return new URL(url).host.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Validates if a string is a valid URL
 *
 * @param url - The string to validate
 * @returns true if the string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
