import { db, generateId } from "@/lib/db";
import {
  links,
  categories,
  tags,
  linkTags,
  widgets,
  projects,
  userSettings,
  userBackups,
  type BackupData,
  type UserBackup,
} from "@/lib/db/schema";
import { eq, desc, and, isNull, or, inArray } from "drizzle-orm";

/** Convert unknown value to Date (backup JSON stores dates as ISO strings) */
function toDate(val: unknown, fallback?: Date): Date {
  if (val instanceof Date) return val;
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}

/** Convert unknown value to Date or null */
function toDateOrNull(val: unknown): Date | null {
  if (val == null) return null;
  const d = toDate(val, undefined as unknown as Date);
  return isNaN(d.getTime()) ? null : d;
}

const BACKUP_VERSION = "1.0.0";
const MAX_BACKUPS_PER_USER = 10;

export interface CreateBackupOptions {
  userId: string;
  backupType?: "manual" | "auto" | "export";
  includeLinks?: boolean;
  includeCategories?: boolean;
  includeTags?: boolean;
  includeWidgets?: boolean;
  includeProjects?: boolean;
  includeSettings?: boolean;
}

export interface RestoreBackupOptions {
  userId: string;
  backupId: string;
  mergeMode?: "replace" | "merge"; // replace = clear existing data, merge = add to existing
}

/**
 * Creates a backup of user data
 */
export async function createBackup(options: CreateBackupOptions): Promise<UserBackup> {
  const {
    userId,
    backupType = "manual",
    includeLinks = true,
    includeCategories = true,
    includeTags = true,
    includeWidgets = true,
    includeProjects = true,
    includeSettings = true,
  } = options;

  // Gather all data to backup
  const backupData: BackupData = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {},
  };

  // Helper: match userId = X OR userId IS NULL (desktop mode may not set userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function userFilter(col: any) {
    return or(eq(col, userId), isNull(col))!;
  }

  // Fetch links (excluding soft-deleted)
  if (includeLinks) {
    const userLinks = await db
      .select()
      .from(links)
      .where(and(
        userFilter(links.userId),
        isNull(links.deletedAt)
      ));
    backupData.data.links = userLinks.map(({ userId: _userId, ...link }) => link);
  }

  // Fetch categories (excluding soft-deleted)
  if (includeCategories) {
    const userCategories = await db
      .select()
      .from(categories)
      .where(and(
        userFilter(categories.userId),
        isNull(categories.deletedAt)
      ));
    backupData.data.categories = userCategories.map(({ userId: _userId, ...cat }) => cat);
  }

  // Fetch tags (excluding soft-deleted)
  if (includeTags) {
    const userTags = await db
      .select()
      .from(tags)
      .where(and(
        userFilter(tags.userId),
        isNull(tags.deletedAt)
      ));
    backupData.data.tags = userTags.map(({ userId: _userId, ...tag }) => tag);

    // Also fetch link-tag associations if we have both links and tags
    // Solo incluimos linkTags de links activos (sin deletedAt)
    if (includeLinks && backupData.data.links?.length) {
      const activeLinkIds = backupData.data.links.map(l => l.id);
      const allLinkTags = activeLinkIds.length > 0
        ? await db.select().from(linkTags).where(inArray(linkTags.linkId, activeLinkIds))
        : [];
      backupData.data.linkTags = allLinkTags;
    }
  }

  // Fetch widgets (excluding soft-deleted)
  if (includeWidgets) {
    const userWidgets = await db
      .select()
      .from(widgets)
      .where(and(
        userFilter(widgets.userId),
        isNull(widgets.deletedAt)
      ));
    backupData.data.widgets = userWidgets.map(({ userId: _userId, ...widget }) => widget);
  }

  // Fetch projects (excluding soft-deleted)
  if (includeProjects) {
    const userProjects = await db
      .select()
      .from(projects)
      .where(and(
        userFilter(projects.userId),
        isNull(projects.deletedAt)
      ));
    backupData.data.projects = userProjects.map(({ userId: _userId, ...project }) => project);
  }

  // Fetch settings
  if (includeSettings) {
    const settings = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);
    if (settings.length > 0) {
      const { userId: _userId, id: _id, ...settingsData } = settings[0];
      backupData.data.settings = settingsData;
    }
  }

  // Calculate backup size (approximate)
  const backupJson = JSON.stringify(backupData);
  const size = new Blob([backupJson]).size;

  // Generate filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `stacklume-backup-${timestamp}.json`;

  // Save backup to database
  const [newBackup] = await db
    .insert(userBackups)
    .values({
      id: generateId(),
      userId,
      filename,
      size,
      backupData,
      backupType,
      createdAt: new Date(),
    })
    .returning();

  // Cleanup old backups (keep only MAX_BACKUPS_PER_USER)
  await cleanupOldBackups(userId);

  return newBackup;
}

/**
 * Lists all backups for a user
 */
export async function listBackups(userId: string): Promise<UserBackup[]> {
  return db
    .select()
    .from(userBackups)
    .where(eq(userBackups.userId, userId))
    .orderBy(desc(userBackups.createdAt));
}

/**
 * Gets a specific backup by ID
 */
export async function getBackup(userId: string, backupId: string): Promise<UserBackup | null> {
  const results = await db
    .select()
    .from(userBackups)
    .where(and(
      eq(userBackups.id, backupId),
      eq(userBackups.userId, userId)
    ))
    .limit(1);

  return results[0] || null;
}

/**
 * Deletes a backup
 */
export async function deleteBackup(userId: string, backupId: string): Promise<boolean> {
  const result = await db
    .delete(userBackups)
    .where(and(
      eq(userBackups.id, backupId),
      eq(userBackups.userId, userId)
    ))
    .returning();

  return result.length > 0;
}

/**
 * Restores data from a backup.
 * Handles date conversion (JSON stores ISO strings, DB expects Date objects),
 * pre-fetches existing IDs to skip duplicates, and revives soft-deleted items.
 */
export async function restoreBackup(options: RestoreBackupOptions): Promise<{
  success: boolean;
  restored: {
    links: number;
    categories: number;
    tags: number;
    widgets: number;
    projects: number;
  };
  errors: string[];
}> {
  const { userId, backupId, mergeMode = "merge" } = options;
  const errors: string[] = [];
  const restored = {
    links: 0,
    categories: 0,
    tags: 0,
    widgets: 0,
    projects: 0,
  };

  // Get the backup
  const backup = await getBackup(userId, backupId);
  if (!backup) {
    return { success: false, restored, errors: ["Backup not found"] };
  }

  const data = backup.backupData as BackupData;

  if (mergeMode === "replace") {
    errors.push("Replace mode not yet implemented. Using merge mode instead.");
  }

  // Helper: match userId = X OR userId IS NULL (desktop mode may not set userId)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function userOr(col: any) {
    return or(eq(col, userId), isNull(col))!;
  }

  // Pre-fetch existing IDs (including soft-deleted) so we can skip/revive
  const [existingCats, existingTags, existingProjects, existingLinks, existingWidgets] =
    await Promise.all([
      data.data.categories?.length
        ? db.select({ id: categories.id, deletedAt: categories.deletedAt }).from(categories).where(userOr(categories.userId))
        : Promise.resolve([]),
      data.data.tags?.length
        ? db.select({ id: tags.id, deletedAt: tags.deletedAt }).from(tags).where(userOr(tags.userId))
        : Promise.resolve([]),
      data.data.projects?.length
        ? db.select({ id: projects.id, deletedAt: projects.deletedAt }).from(projects).where(userOr(projects.userId))
        : Promise.resolve([]),
      data.data.links?.length
        ? db.select({ id: links.id, deletedAt: links.deletedAt }).from(links).where(userOr(links.userId))
        : Promise.resolve([]),
      data.data.widgets?.length
        ? db.select({ id: widgets.id, deletedAt: widgets.deletedAt }).from(widgets).where(userOr(widgets.userId))
        : Promise.resolve([]),
    ]);

  // Build sets: active IDs (skip) and soft-deleted IDs (revive via UPDATE)
  function buildSets(rows: { id: string; deletedAt: Date | null }[]) {
    const active = new Set<string>();
    const softDeleted = new Set<string>();
    for (const r of rows) {
      if (r.deletedAt) softDeleted.add(r.id);
      else active.add(r.id);
    }
    return { active, softDeleted };
  }

  const catSets = buildSets(existingCats);
  const tagSets = buildSets(existingTags);
  const projectSets = buildSets(existingProjects);
  const linkSets = buildSets(existingLinks);
  const widgetSets = buildSets(existingWidgets);

  // Also track existing linkTag combos
  const existingLinkTagKeys = new Set<string>();
  if (data.data.linkTags?.length) {
    const allLT = await db.select().from(linkTags);
    for (const lt of allLT) existingLinkTagKeys.add(`${lt.linkId}:${lt.tagId}`);
  }

  // Ejecutar todos los writes en una transacción para atomicidad
  try {
    await (db as unknown as { transaction: (fn: (tx: typeof db) => Promise<void>) => Promise<void> }).transaction(async (tx) => {
      // Restore categories first (links depend on them)
      if (data.data.categories?.length) {
        for (const cat of data.data.categories) {
          try {
            if (catSets.active.has(cat.id)) continue; // already exists, skip
            if (catSets.softDeleted.has(cat.id)) {
              // Revive soft-deleted item
              await tx.update(categories).set({
                name: cat.name,
                description: cat.description ?? null,
                icon: cat.icon ?? null,
                color: cat.color ?? null,
                order: cat.order ?? 0,
                updatedAt: new Date(),
                deletedAt: null,
              }).where(eq(categories.id, cat.id));
            } else {
              await tx.insert(categories).values({
                id: cat.id,
                userId,
                name: cat.name,
                description: cat.description ?? null,
                icon: cat.icon ?? null,
                color: cat.color ?? null,
                order: cat.order ?? 0,
                createdAt: toDate(cat.createdAt),
                updatedAt: toDate(cat.updatedAt),
                deletedAt: null,
              }).onConflictDoNothing();
            }
            restored.categories++;
          } catch (_err) {
            errors.push(`Failed to restore category: ${cat.name}`);
          }
        }
      }

      // Restore tags
      if (data.data.tags?.length) {
        for (const tag of data.data.tags) {
          try {
            if (tagSets.active.has(tag.id)) continue;
            if (tagSets.softDeleted.has(tag.id)) {
              await tx.update(tags).set({
                name: tag.name,
                color: tag.color ?? null,
                order: tag.order ?? 0,
                deletedAt: null,
              }).where(eq(tags.id, tag.id));
            } else {
              await tx.insert(tags).values({
                id: tag.id,
                userId,
                name: tag.name,
                color: tag.color ?? null,
                order: tag.order ?? 0,
                createdAt: toDate(tag.createdAt),
                deletedAt: null,
              }).onConflictDoNothing();
            }
            restored.tags++;
          } catch (_err) {
            errors.push(`Failed to restore tag: ${tag.name}`);
          }
        }
      }

      // Restore projects
      if (data.data.projects?.length) {
        for (const project of data.data.projects) {
          try {
            if (projectSets.active.has(project.id)) continue;
            if (projectSets.softDeleted.has(project.id)) {
              await tx.update(projects).set({
                name: project.name,
                description: project.description ?? null,
                icon: project.icon ?? "Folder",
                color: project.color ?? "#6366f1",
                order: project.order ?? 0,
                updatedAt: new Date(),
                deletedAt: null,
              }).where(eq(projects.id, project.id));
            } else {
              await tx.insert(projects).values({
                id: project.id,
                userId,
                name: project.name,
                description: project.description ?? null,
                icon: project.icon ?? "Folder",
                color: project.color ?? "#6366f1",
                order: project.order ?? 0,
                isDefault: project.isDefault ?? false,
                createdAt: toDate(project.createdAt),
                updatedAt: toDate(project.updatedAt),
                deletedAt: null,
              }).onConflictDoNothing();
            }
            restored.projects++;
          } catch (_err) {
            errors.push(`Failed to restore project: ${project.name}`);
          }
        }
      }

      // Restore links
      if (data.data.links?.length) {
        for (const link of data.data.links) {
          try {
            if (linkSets.active.has(link.id)) continue;
            if (linkSets.softDeleted.has(link.id)) {
              await tx.update(links).set({
                url: link.url,
                title: link.title,
                description: link.description ?? null,
                imageUrl: link.imageUrl ?? null,
                faviconUrl: link.faviconUrl ?? null,
                categoryId: link.categoryId ?? null,
                isFavorite: link.isFavorite ?? false,
                siteName: link.siteName ?? null,
                author: link.author ?? null,
                publishedAt: toDateOrNull(link.publishedAt),
                source: link.source ?? null,
                sourceId: link.sourceId ?? null,
                platform: link.platform ?? null,
                contentType: link.contentType ?? null,
                platformColor: link.platformColor ?? null,
                order: link.order ?? 0,
                updatedAt: new Date(),
                deletedAt: null,
              }).where(eq(links.id, link.id));
            } else {
              await tx.insert(links).values({
                id: link.id,
                userId,
                url: link.url,
                title: link.title,
                description: link.description ?? null,
                imageUrl: link.imageUrl ?? null,
                faviconUrl: link.faviconUrl ?? null,
                categoryId: link.categoryId ?? null,
                isFavorite: link.isFavorite ?? false,
                siteName: link.siteName ?? null,
                author: link.author ?? null,
                publishedAt: toDateOrNull(link.publishedAt),
                source: link.source ?? null,
                sourceId: link.sourceId ?? null,
                platform: link.platform ?? null,
                contentType: link.contentType ?? null,
                platformColor: link.platformColor ?? null,
                order: link.order ?? 0,
                createdAt: toDate(link.createdAt),
                updatedAt: toDate(link.updatedAt),
                deletedAt: null,
                lastCheckedAt: toDateOrNull(link.lastCheckedAt),
                healthStatus: link.healthStatus ?? null,
              }).onConflictDoNothing();
            }
            restored.links++;
          } catch (_err) {
            errors.push(`Failed to restore link: ${link.title}`);
          }
        }
      }

      // Restore widgets
      if (data.data.widgets?.length) {
        for (const widget of data.data.widgets) {
          try {
            if (widgetSets.active.has(widget.id)) continue;
            if (widgetSets.softDeleted.has(widget.id)) {
              await tx.update(widgets).set({
                type: widget.type,
                title: widget.title ?? null,
                size: widget.size ?? "medium",
                config: widget.config ?? null,
                layoutX: widget.layoutX ?? 0,
                layoutY: widget.layoutY ?? 0,
                layoutW: widget.layoutW ?? 2,
                layoutH: widget.layoutH ?? 2,
                isVisible: widget.isVisible ?? true,
                updatedAt: new Date(),
                deletedAt: null,
              }).where(eq(widgets.id, widget.id));
            } else {
              await tx.insert(widgets).values({
                id: widget.id,
                userId,
                projectId: widget.projectId ?? null,
                type: widget.type,
                title: widget.title ?? null,
                size: widget.size ?? "medium",
                categoryId: widget.categoryId ?? null,
                tagId: widget.tagId ?? null,
                tags: widget.tags ?? null,
                config: widget.config ?? null,
                layoutX: widget.layoutX ?? 0,
                layoutY: widget.layoutY ?? 0,
                layoutW: widget.layoutW ?? 2,
                layoutH: widget.layoutH ?? 2,
                isVisible: widget.isVisible ?? true,
                createdAt: toDate(widget.createdAt),
                updatedAt: toDate(widget.updatedAt),
                deletedAt: null,
              }).onConflictDoNothing();
            }
            restored.widgets++;
          } catch (_err) {
            errors.push(`Failed to restore widget: ${widget.title}`);
          }
        }
      }

      // Restore link-tags associations
      if (data.data.linkTags?.length) {
        for (const lt of data.data.linkTags) {
          try {
            const key = `${lt.linkId}:${lt.tagId}`;
            if (existingLinkTagKeys.has(key)) continue;
            await tx.insert(linkTags).values(lt).onConflictDoNothing();
          } catch {
            // Silently ignore link-tag restore failures
          }
        }
      }
    });
  } catch (txError) {
    console.error("[restoreBackup] Error en la transacción:", txError);
    errors.push("Error en la transacción de restauración. Algunos datos pueden no haberse restaurado.");
  }

  return {
    success: errors.length === 0,
    restored,
    errors,
  };
}

/**
 * Removes old backups, keeping only the most recent MAX_BACKUPS_PER_USER
 */
async function cleanupOldBackups(userId: string): Promise<void> {
  // Get all backups ordered by date
  const allBackups = await db
    .select({ id: userBackups.id })
    .from(userBackups)
    .where(eq(userBackups.userId, userId))
    .orderBy(desc(userBackups.createdAt));

  // Si hay más del máximo, eliminar los más antiguos en un solo batch delete
  if (allBackups.length > MAX_BACKUPS_PER_USER) {
    const backupsToDelete = allBackups.slice(MAX_BACKUPS_PER_USER);
    const idsToDelete = backupsToDelete.map(b => b.id);
    if (idsToDelete.length > 0) {
      await db.delete(userBackups).where(inArray(userBackups.id, idsToDelete));
    }
  }
}

/**
 * Exports backup data as a downloadable JSON
 */
export function exportBackupAsJson(backup: UserBackup): string {
  return JSON.stringify(backup.backupData, null, 2);
}

/**
 * Validates backup data structure
 */
export function validateBackupData(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;
  const backup = data as BackupData;

  if (!backup.version || typeof backup.version !== "string") return false;
  if (!backup.exportedAt || typeof backup.exportedAt !== "string") return false;
  if (!backup.data || typeof backup.data !== "object") return false;

  return true;
}
