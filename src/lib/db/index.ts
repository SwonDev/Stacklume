/**
 * Database Module — Neon PostgreSQL (producción) o SQLite (modo desktop)
 *
 * Usa DESKTOP_MODE=true para activar SQLite.
 * En producción usa Neon PostgreSQL vía drizzle-orm/neon-http.
 */

import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle as drizzleNeon, NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as pgSchema from "./schema";
import { getSQLiteDb, type SQLiteDatabase } from "./sqlite-driver";

export type UnifiedDatabase = NeonHttpDatabase<typeof pgSchema> | SQLiteDatabase;

// ─── Neon singleton ────────────────────────────────────────────────────────────

let _neonDb: NeonHttpDatabase<typeof pgSchema> | null = null;

function getNeonDb(): NeonHttpDatabase<typeof pgSchema> {
  if (!_neonDb) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required for Neon PostgreSQL");
    }
    const sql: NeonQueryFunction<boolean, boolean> = neon(process.env.DATABASE_URL, {
      fetchOptions: { cache: "no-store" },
    });
    _neonDb = drizzleNeon(sql, { schema: pgSchema });
    console.log("[DB] Initialized Neon PostgreSQL");
  }
  return _neonDb;
}

// ─── Public API ────────────────────────────────────────────────────────────────

/**
 * Obtiene la instancia de base de datos correcta según el entorno.
 */
export async function getDatabase(): Promise<UnifiedDatabase> {
  if (process.env.DESKTOP_MODE === "true") {
    return getSQLiteDb();
  }
  return getNeonDb();
}

/**
 * Ensure the database is initialized.
 * Call this at application startup.
 */
export async function ensureDbInitialized(): Promise<void> {
  if (process.env.DESKTOP_MODE === "true") {
    await getSQLiteDb();
  } else {
    getNeonDb();
  }
  console.log("[DB] Database initialized");
}

/**
 * Proxy para acceso directo a la DB (compatible con el uso existente).
 * En modo desktop la DB SQLite debe estar inicializada antes de usarlo
 * (se hace en el startup del servidor vía initDesktopDatabase()).
 *
 * Se tipifica como NeonHttpDatabase para mantener compatibilidad TypeScript
 * con el schema PostgreSQL que usan todas las rutas API. El runtime
 * del proxy devuelve la DB SQLite cuando DESKTOP_MODE=true.
 */
export const db = new Proxy({} as NeonHttpDatabase<typeof pgSchema>, {
  get(_target, prop) {
    if (process.env.DESKTOP_MODE === "true") {
      // Usamos globalThis para acceder al singleton cross-chunk de Turbopack.
      // El require() clásico puede devolver una instancia diferente del módulo.
      const SQLITE_KEY = "__stacklume_sqlite_db__";
      const sqliteDb = (globalThis as Record<string, unknown>)[
        SQLITE_KEY
      ] as SQLiteDatabase | null | undefined;
      if (sqliteDb) return Reflect.get(sqliteDb, prop);
      throw new Error(
        "[Desktop] SQLite DB not initialized. Call getDatabase() first."
      );
    }
    return Reflect.get(getNeonDb(), prop);
  },
});

/**
 * Genera un UUID para usar como ID en inserts.
 * Necesario en SQLite (PostgreSQL los genera automáticamente).
 */
export function generateId(): string {
  return crypto.randomUUID();
}

// ─── Retry logic ───────────────────────────────────────────────────────────────

/**
 * Wrapper para ejecutar operaciones de DB con reintentos en errores transitorios.
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Pagination helpers ────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

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
 * Devuelve el tipo de base de datos activo.
 */
export function getCurrentDatabaseType(): "neon" | "sqlite" {
  return process.env.DESKTOP_MODE === "true" ? "sqlite" : "neon";
}

// Re-export schema PostgreSQL para compatibilidad
export * from "./schema";
