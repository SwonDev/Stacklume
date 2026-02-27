/**
 * Database Module - Neon PostgreSQL
 *
 * This module provides the database interface using Neon PostgreSQL.
 */

import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "./schema";

export type UnifiedDatabase = NeonHttpDatabase<typeof schema>;

// Singleton instance
let _db: NeonHttpDatabase<typeof schema> | null = null;

/**
 * Get Neon PostgreSQL database instance (lazy initialization)
 */
function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Neon PostgreSQL");
    }
    const sql: NeonQueryFunction<boolean, boolean> = neon(process.env.DATABASE_URL, {
      fetchOptions: {
        cache: "no-store",
      },
    });
    _db = drizzle(sql, { schema });
    console.log("[DB] Initialized Neon PostgreSQL");
  }
  return _db;
}

/**
 * Get the database instance
 */
export async function getDatabase(): Promise<UnifiedDatabase> {
  return getDb();
}

/**
 * Ensure the database is initialized
 * Call this at application startup
 */
export async function ensureDbInitialized(): Promise<void> {
  getDb();
  console.log("[DB] Database initialized");
}

/**
 * The database instance for direct use
 */
export const db = new Proxy({} as UnifiedDatabase, {
  get: function(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});

/**
 * Wrapper function to execute database operations with retry logic
 * Handles transient errors like cold starts, timeouts, and connection issues
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    operationName?: string;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 500,
    maxDelayMs = 5000,
    operationName = "database operation",
  } = options;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const isRetryable = isRetryableError(lastError);

      if (!isRetryable || attempt === maxRetries) {
        console.error(
          `[DB Error] ${operationName} failed after ${attempt} attempt(s):`,
          lastError.message
        );
        throw lastError;
      }

      console.warn(
        `[DB Retry] ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`,
        lastError.message
      );

      await sleep(delay);
      delay = Math.min(delay * 2, maxDelayMs);
    }
  }

  throw lastError || new Error("Unknown error in withRetry");
}

/**
 * Check if an error is retryable (transient network/connection errors)
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();

  const retryablePatterns = [
    "fetch failed",
    "network",
    "timeout",
    "econnreset",
    "econnrefused",
    "socket hang up",
    "connection",
    "temporarily unavailable",
    "service unavailable",
    "too many connections",
    "connection terminated",
    "ssl",
    "tls",
  ];

  return retryablePatterns.some((pattern) => message.includes(pattern));
}

/**
 * Simple sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pagination metadata type
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

/**
 * Creates a paginated response object
 */
export function createPaginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get the current database type (always neon now)
 */
export function getCurrentDatabaseType(): "neon" | "sqlite" {
  return "neon";
}

// Re-export schema for convenience
export * from "./schema";
