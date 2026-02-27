/**
 * Driver SQLite para modo desktop (Tauri)
 * Usa @libsql/client con drizzle-orm/libsql.
 * Auto-migra el schema al arrancar.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema.sqlite";

export type SQLiteDatabase = ReturnType<typeof drizzle<typeof schema>>;

// Clave global para el singleton — se almacena en globalThis para que sea
// accesible desde cualquier chunk/módulo de Turbopack (evita el problema de
// instancias múltiples del módulo cuando Turbopack genera chunks separados).
const SQLITE_GLOBAL_KEY = "__stacklume_sqlite_db__";

/** Accede al singleton de DB desde globalThis (cross-chunk safe). */
export function getDbSingleton(): SQLiteDatabase | null {
  return (
    ((globalThis as Record<string, unknown>)[SQLITE_GLOBAL_KEY] as
      | SQLiteDatabase
      | undefined) ?? null
  );
}

function setDbSingleton(db: SQLiteDatabase): void {
  (globalThis as Record<string, unknown>)[SQLITE_GLOBAL_KEY] = db;
}

// Alias de compatibilidad para el código que lo importa directamente.
// NOTA: Este valor puede ser stale si el módulo se cargó antes que la init.
// Usar getDbSingleton() cuando se necesite el valor actual.
export let _sqliteDb: SQLiteDatabase | null = null;

/**
 * Obtiene (o crea) la instancia de la base de datos SQLite.
 * Crea las tablas automáticamente si no existen.
 */
export async function getSQLiteDb(): Promise<SQLiteDatabase> {
  const existing = getDbSingleton();
  if (existing) return existing;

  const rawPath = process.env.DATABASE_PATH ?? "./stacklume-dev.db";
  // @libsql/client en Windows requiere forward slashes en la URL file:
  const dbPath = rawPath.replace(/\\/g, "/");
  const client = createClient({ url: `file:${dbPath}` });

  const db = drizzle(client, { schema });

  // Guardar en globalThis ANTES de initializeSQLiteTables por si hay llamadas concurrentes
  setDbSingleton(db);
  _sqliteDb = db;

  // Crear las tablas si no existen (sin migraciones formales para simplicidad)
  await initializeSQLiteTables(client);

  console.log("[SQLite] Inicializado:", rawPath);
  return db;
}

/**
 * Inicializa las tablas SQLite ejecutando CREATE TABLE IF NOT EXISTS.
 * Más robusto que las migraciones Drizzle para el caso de uso de distribución.
 */
async function initializeSQLiteTables(client: ReturnType<typeof createClient>) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER,
      image TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS accounts (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      provider TEXT NOT NULL,
      provider_account_id TEXT NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type TEXT,
      scope TEXT,
      id_token TEXT,
      session_state TEXT,
      PRIMARY KEY (provider, provider_account_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`,
    `CREATE TABLE IF NOT EXISTS sessions (
      session_token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS verification_tokens (
      identifier TEXT NOT NULL,
      token TEXT NOT NULL,
      expires INTEGER NOT NULL,
      PRIMARY KEY (identifier, token)
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`,
    `CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id)`,
    `CREATE TABLE IF NOT EXISTS links (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      favicon_url TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      is_favorite INTEGER DEFAULT 0,
      site_name TEXT,
      author TEXT,
      published_at INTEGER,
      source TEXT,
      source_id TEXT,
      platform TEXT,
      content_type TEXT,
      platform_color TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER,
      last_checked_at INTEGER,
      health_status TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_links_url ON links(url)`,
    `CREATE INDEX IF NOT EXISTS idx_links_category_id ON links(category_id)`,
    `CREATE INDEX IF NOT EXISTS idx_links_is_favorite ON links(is_favorite)`,
    `CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_links_platform ON links(platform)`,
    `CREATE INDEX IF NOT EXISTS idx_links_order ON links("order")`,
    `CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON links(deleted_at)`,
    `CREATE INDEX IF NOT EXISTS idx_links_health_status ON links(health_status)`,
    `CREATE INDEX IF NOT EXISTS idx_links_category_created_at ON links(category_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_links_user_created_at ON links(user_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      color TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_user_name ON tags(user_id, name)`,
    `CREATE TABLE IF NOT EXISTS link_tags (
      link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (link_id, tag_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_layouts (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      layout_data TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT DEFAULT 'Folder',
      color TEXT DEFAULT '#6366f1',
      "order" INTEGER NOT NULL DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS widgets (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT,
      size TEXT NOT NULL DEFAULT 'medium',
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      tag_id TEXT REFERENCES tags(id) ON DELETE SET NULL,
      tags TEXT,
      config TEXT,
      layout_x INTEGER NOT NULL DEFAULT 0,
      layout_y INTEGER NOT NULL DEFAULT 0,
      layout_w INTEGER NOT NULL DEFAULT 2,
      layout_h INTEGER NOT NULL DEFAULT 2,
      is_visible INTEGER DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_widgets_user_id ON widgets(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_widgets_project_id ON widgets(project_id)`,
    `CREATE TABLE IF NOT EXISTS user_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default' UNIQUE,
      theme TEXT NOT NULL DEFAULT 'system',
      view_density TEXT NOT NULL DEFAULT 'normal',
      view_mode TEXT NOT NULL DEFAULT 'bento',
      show_tooltips INTEGER NOT NULL DEFAULT 1,
      reduce_motion INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)`,
    `CREATE TABLE IF NOT EXISTS user_backups (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default',
      filename TEXT NOT NULL,
      size INTEGER NOT NULL,
      backup_data TEXT NOT NULL,
      backup_type TEXT NOT NULL DEFAULT 'manual',
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_user_backups_user_id ON user_backups(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_user_backups_created_at ON user_backups(created_at)`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }
}
