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

  // Crear las tablas si no existen
  await initializeSQLiteTables(client);
  // Aplicar migraciones incrementales (columnas nuevas en upgrades)
  await runSQLiteMigrations(client);

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
      health_status TEXT,
      is_read INTEGER DEFAULT 0,
      notes TEXT,
      reminder_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_links_user_id ON links(user_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_links_url ON links(url) WHERE deleted_at IS NULL`,
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
      mcp_enabled INTEGER NOT NULL DEFAULT 0,
      mcp_api_key TEXT,
      ollama_enabled INTEGER NOT NULL DEFAULT 0,
      ollama_url TEXT DEFAULT 'http://localhost:11434',
      ollama_model TEXT,
      language TEXT NOT NULL DEFAULT 'es',
      grid_columns INTEGER NOT NULL DEFAULT 12,
      sidebar_always_visible INTEGER NOT NULL DEFAULT 0,
      default_sort_field TEXT NOT NULL DEFAULT 'createdAt',
      default_sort_order TEXT NOT NULL DEFAULT 'desc',
      thumbnail_size TEXT NOT NULL DEFAULT 'medium',
      sidebar_density TEXT NOT NULL DEFAULT 'normal',
      auto_backup_interval INTEGER NOT NULL DEFAULT 0,
      confirm_before_delete INTEGER NOT NULL DEFAULT 1,
      link_click_behavior TEXT NOT NULL DEFAULT 'new-tab',
      onboarding_completed INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id)`,
    `CREATE TABLE IF NOT EXISTS custom_widget_types (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL DEFAULT 'custom',
      icon TEXT NOT NULL DEFAULT 'Puzzle',
      html_template TEXT NOT NULL,
      config_schema TEXT,
      default_config TEXT,
      default_width INTEGER NOT NULL DEFAULT 2,
      default_height INTEGER NOT NULL DEFAULT 2,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_custom_widget_types_user_id ON custom_widget_types(user_id)`,
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
    `CREATE TABLE IF NOT EXISTS saved_searches (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      query TEXT NOT NULL,
      filters TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS shared_collections (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      type TEXT NOT NULL,
      reference_id TEXT NOT NULL,
      share_token TEXT NOT NULL UNIQUE,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      expires_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_shared_collections_token ON shared_collections(share_token)`,
    `CREATE TABLE IF NOT EXISTS link_categories (
      link_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      PRIMARY KEY (link_id, category_id)
    )`,
    `CREATE TABLE IF NOT EXISTS classification_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      condition_type TEXT NOT NULL,
      condition_value TEXT NOT NULL,
      action_type TEXT NOT NULL,
      action_value TEXT NOT NULL,
      "order" INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_classification_rules_user_id ON classification_rules(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_classification_rules_order ON classification_rules("order")`,
    `CREATE TABLE IF NOT EXISTS link_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      name TEXT NOT NULL,
      description TEXT,
      link_ids TEXT NOT NULL DEFAULT '[]',
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      deleted_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_link_sessions_user_id ON link_sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS page_archives (
      id TEXT PRIMARY KEY,
      user_id TEXT DEFAULT 'default',
      link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
      title TEXT,
      text_content TEXT,
      archived_at INTEGER NOT NULL,
      word_count INTEGER NOT NULL DEFAULT 0,
      size INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_page_archives_user_id ON page_archives(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_page_archives_link_id ON page_archives(link_id)`,
  ];

  for (const sql of statements) {
    await client.execute(sql);
  }
}

/**
 * Migraciones incrementales para bases de datos existentes.
 * Cada ALTER TABLE está envuelto en try/catch — SQLite lanza error si la columna
 * ya existe ("duplicate column name"), lo cual es esperado en instalaciones nuevas.
 * Esto garantiza que upgrades desde versiones anteriores no fallen.
 */
async function runSQLiteMigrations(client: ReturnType<typeof createClient>) {
  const migrations: Array<{ sql: string; description: string }> = [
    // v0.3.0 — Servidor MCP
    {
      sql: `ALTER TABLE user_settings ADD COLUMN mcp_enabled INTEGER NOT NULL DEFAULT 0`,
      description: "user_settings.mcp_enabled",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN mcp_api_key TEXT`,
      description: "user_settings.mcp_api_key",
    },
    // v0.3.16 — Configuración extendida
    {
      sql: `ALTER TABLE user_settings ADD COLUMN language TEXT NOT NULL DEFAULT 'es'`,
      description: "user_settings.language",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN grid_columns INTEGER NOT NULL DEFAULT 12`,
      description: "user_settings.grid_columns",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN sidebar_always_visible INTEGER NOT NULL DEFAULT 0`,
      description: "user_settings.sidebar_always_visible",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN default_sort_field TEXT NOT NULL DEFAULT 'createdAt'`,
      description: "user_settings.default_sort_field",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN default_sort_order TEXT NOT NULL DEFAULT 'desc'`,
      description: "user_settings.default_sort_order",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN thumbnail_size TEXT NOT NULL DEFAULT 'medium'`,
      description: "user_settings.thumbnail_size",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN sidebar_density TEXT NOT NULL DEFAULT 'normal'`,
      description: "user_settings.sidebar_density",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN auto_backup_interval INTEGER NOT NULL DEFAULT 0`,
      description: "user_settings.auto_backup_interval",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN confirm_before_delete INTEGER NOT NULL DEFAULT 1`,
      description: "user_settings.confirm_before_delete",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN link_click_behavior TEXT NOT NULL DEFAULT 'new-tab'`,
      description: "user_settings.link_click_behavior",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN onboarding_completed INTEGER NOT NULL DEFAULT 0`,
      description: "user_settings.onboarding_completed",
    },
    // v0.3.24 — Ollama IA local
    {
      sql: `ALTER TABLE user_settings ADD COLUMN ollama_enabled INTEGER NOT NULL DEFAULT 0`,
      description: "user_settings.ollama_enabled",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN ollama_url TEXT DEFAULT 'http://localhost:11434'`,
      description: "user_settings.ollama_url",
    },
    {
      sql: `ALTER TABLE user_settings ADD COLUMN ollama_model TEXT`,
      description: "user_settings.ollama_model",
    },
    // v0.3.17 — Campos personales de enlace
    {
      sql: `ALTER TABLE links ADD COLUMN is_read INTEGER NOT NULL DEFAULT 0`,
      description: "links.is_read",
    },
    {
      sql: `ALTER TABLE links ADD COLUMN notes TEXT`,
      description: "links.notes",
    },
    {
      sql: `ALTER TABLE links ADD COLUMN reminder_at INTEGER`,
      description: "links.reminder_at",
    },
    // v0.3.24 — Índice UNIQUE parcial en links.url (solo registros no eliminados)
    // Permite re-añadir una URL que fue eliminada (soft-delete)
    {
      sql: `DROP INDEX IF EXISTS idx_links_url`,
      description: "idx_links_url drop (reemplazar por parcial)",
    },
    {
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS idx_links_url ON links(url) WHERE deleted_at IS NULL`,
      description: "idx_links_url parcial (deleted_at IS NULL)",
    },
    // v0.3.26 — Reglas de autoclasificación
    {
      sql: `CREATE TABLE IF NOT EXISTS classification_rules (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default',
        name TEXT NOT NULL,
        condition_type TEXT NOT NULL,
        condition_value TEXT NOT NULL,
        action_type TEXT NOT NULL,
        action_value TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )`,
      description: "classification_rules table",
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_classification_rules_user_id ON classification_rules(user_id)`,
      description: "idx_classification_rules_user_id",
    },
    // v0.3.27 — Reading Queue (Feature 5)
    {
      sql: `ALTER TABLE links ADD COLUMN reading_status TEXT DEFAULT 'inbox'`,
      description: "links.reading_status",
    },
    {
      sql: `ALTER TABLE links ADD COLUMN review_at INTEGER`,
      description: "links.review_at",
    },
    // v0.3.27 — Link Sessions (Feature 3)
    {
      sql: `CREATE TABLE IF NOT EXISTS link_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default',
        name TEXT NOT NULL,
        description TEXT,
        link_ids TEXT NOT NULL DEFAULT '[]',
        "order" INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )`,
      description: "link_sessions table",
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_link_sessions_user_id ON link_sessions(user_id)`,
      description: "idx_link_sessions_user_id",
    },
    // v0.3.27 — Page Archives (Feature 4)
    {
      sql: `CREATE TABLE IF NOT EXISTS page_archives (
        id TEXT PRIMARY KEY,
        user_id TEXT DEFAULT 'default',
        link_id TEXT NOT NULL REFERENCES links(id) ON DELETE CASCADE,
        title TEXT,
        text_content TEXT,
        archived_at INTEGER NOT NULL,
        word_count INTEGER NOT NULL DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 0
      )`,
      description: "page_archives table",
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_page_archives_user_id ON page_archives(user_id)`,
      description: "idx_page_archives_user_id",
    },
    {
      sql: `CREATE INDEX IF NOT EXISTS idx_page_archives_link_id ON page_archives(link_id)`,
      description: "idx_page_archives_link_id",
    },
    // v0.3.28 — DevKit: comandos de instalación extraídos del scraping
    {
      sql: `ALTER TABLE links ADD COLUMN install_commands TEXT`,
      description: "links.install_commands",
    },
  ];

  for (const migration of migrations) {
    try {
      await client.execute(migration.sql);
      console.log(`[SQLite Migration] Columna añadida: ${migration.description}`);
    } catch {
      // "duplicate column name" → columna ya existía, OK
    }
  }
}
