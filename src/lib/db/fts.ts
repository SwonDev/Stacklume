/**
 * FTS5 Full-Text Search helpers para SQLite (modo desktop).
 *
 * La tabla virtual `links_fts` se crea en sqlite-driver.ts (runSQLiteMigrations).
 * Este módulo gestiona la sincronización de datos entre `links` y `links_fts`.
 */

import { getRawClient } from "./sqlite-driver";

interface LinkRow {
  id: string;
  title: string;
  description: string | null;
  summary: string | null;
  url: string;
  siteName: string | null;
  semanticTags: string | null;
  notes: string | null;
}

/**
 * Inserta o actualiza una fila en links_fts.
 * Usa DELETE + INSERT porque FTS5 con content='' no soporta UPDATE.
 */
export async function upsertLinkFts(link: LinkRow): Promise<void> {
  const client = getRawClient();
  if (!client) return;

  // Borrar entrada existente (si la hay)
  await client.execute({
    sql: `DELETE FROM links_fts WHERE link_id = ?`,
    args: [link.id],
  });

  // Insertar nueva entrada
  await client.execute({
    sql: `INSERT INTO links_fts(link_id, title, description, summary, url, site_name, semantic_tags, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      link.id,
      link.title || "",
      link.description || "",
      link.summary || "",
      link.url || "",
      link.siteName || "",
      link.semanticTags || "",
      link.notes || "",
    ],
  });
}

/**
 * Elimina una fila de links_fts.
 */
export async function deleteLinkFts(linkId: string): Promise<void> {
  const client = getRawClient();
  if (!client) return;

  await client.execute({
    sql: `DELETE FROM links_fts WHERE link_id = ?`,
    args: [linkId],
  });
}

/**
 * Busca enlaces usando FTS5 full-text search.
 * Devuelve los IDs de links ordenados por relevancia (rank).
 */
export async function searchLinksFts(
  query: string,
  limit = 50
): Promise<string[]> {
  const client = getRawClient();
  if (!client) return [];

  // Sanitizar query para FTS5: escapar comillas dobles, usar prefijo * para búsqueda parcial
  const sanitized = query
    .replace(/"/g, '""')
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => `"${w}"*`)
    .join(" ");

  if (!sanitized) return [];

  try {
    const result = await client.execute({
      sql: `SELECT link_id FROM links_fts WHERE links_fts MATCH ? ORDER BY rank LIMIT ?`,
      args: [sanitized, limit],
    });

    return (result.rows ?? []).map(
      (row) => row.link_id as string
    );
  } catch {
    // FTS5 MATCH puede fallar con queries malformados — fallback silencioso
    return [];
  }
}

/**
 * Reconstruye el índice FTS5 completo desde la tabla links.
 * Útil tras importación masiva o para reparar el índice.
 */
export async function rebuildLinksFts(): Promise<number> {
  const client = getRawClient();
  if (!client) return 0;

  // Vaciar tabla FTS
  await client.execute("DELETE FROM links_fts");

  // Insertar todos los links activos
  const result = await client.execute(
    `INSERT INTO links_fts(link_id, title, description, summary, url, site_name, semantic_tags, notes)
     SELECT id, COALESCE(title, ''), COALESCE(description, ''), COALESCE(summary, ''), COALESCE(url, ''), COALESCE(site_name, ''), COALESCE(semantic_tags, ''), COALESCE(notes, '')
     FROM links
     WHERE deleted_at IS NULL`
  );

  return result.rowsAffected ?? 0;
}
