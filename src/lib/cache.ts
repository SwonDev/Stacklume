/**
 * Simple In-Memory Cache with TTL (Time-To-Live)
 *
 * Features:
 * - Map-based storage for fast access
 * - Automatic expiration of entries based on TTL
 * - Cleanup of expired entries
 * - TypeScript generic support
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTTL?: number;
  /** Interval for cleaning up expired entries in milliseconds (default: 5 minutes) */
  cleanupInterval?: number;
  /** Maximum number of entries in the cache (default: 1000) */
  maxEntries?: number;
}

class InMemoryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>>;
  private defaultTTL: number;
  private maxEntries: number;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.defaultTTL = options.defaultTTL || 60 * 60 * 1000; // 1 hour default
    this.maxEntries = options.maxEntries || 1000;

    // Start cleanup interval
    const cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes default
    this.startCleanup(cleanupInterval);
  }

  /**
   * Get a value from the cache
   * Returns undefined if the key doesn't exist or has expired
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set a value in the cache with optional TTL
   * @param key Cache key
   * @param value Value to store
   * @param ttl Optional TTL in milliseconds (overrides default)
   */
  set(key: string, value: T, ttl?: number): void {
    // Enforce max entries limit (remove oldest entries if needed)
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldest();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Check if a key exists in the cache (and hasn't expired)
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all valid (non-expired) keys in the cache
   */
  keys(): string[] {
    const now = Date.now();
    const validKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now <= entry.expiresAt) {
        validKeys.push(key);
      }
    });

    return validKeys;
  }

  /**
   * Get cache statistics
   */
  stats(): {
    size: number;
    maxEntries: number;
    defaultTTL: number;
  } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      defaultTTL: this.defaultTTL,
    };
  }

  /**
   * Get or set a value with a factory function
   * If the key exists, return the cached value
   * If not, call the factory function, cache the result, and return it
   */
  async getOrSet(
    key: string,
    factory: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * Start the cleanup interval
   */
  private startCleanup(interval: number): void {
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, interval);

    // Prevent the cleanup interval from keeping the process alive
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  /**
   * Stop the cleanup interval
   */
  stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }

  /**
   * Remove all expired entries from the cache
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }

  /**
   * Evict the oldest entry when cache is full
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    this.cache.forEach((entry, key) => {
      if (entry.expiresAt < oldestExpiry) {
        oldestExpiry = entry.expiresAt;
        oldestKey = key;
      }
    });

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Create a singleton instance for the scrape cache (1 hour TTL)
export const scrapeCache = new InMemoryCache<{
  title: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  author: string | null;
  platform: string;
  contentType: string;
  platformLabel: string;
  platformColor: string;
  platformIcon: string;
}>({
  defaultTTL: 60 * 60 * 1000, // 1 hour
  cleanupInterval: 10 * 60 * 1000, // 10 minutes
  maxEntries: 500,
});

// Export the class for creating custom cache instances
export { InMemoryCache };

// Export type for cache options
export type { CacheOptions };
