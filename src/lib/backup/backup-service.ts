import { db } from "@/lib/db";
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
import { eq, desc, and, isNull } from "drizzle-orm";

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

  // Fetch links (excluding soft-deleted)
  if (includeLinks) {
    const userLinks = await db
      .select()
      .from(links)
      .where(and(
        eq(links.userId, userId),
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
        eq(categories.userId, userId),
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
        eq(tags.userId, userId),
        isNull(tags.deletedAt)
      ));
    backupData.data.tags = userTags.map(({ userId: _userId, ...tag }) => tag);

    // Also fetch link-tag associations if we have both links and tags
    if (includeLinks && backupData.data.links?.length) {
      const linkIds = backupData.data.links.map(l => l.id);
      const _userLinkTags = await db
        .select()
        .from(linkTags)
        .where(eq(linkTags.linkId, linkIds[0])); // This is a simplification, ideally use IN query

      // Actually, let's fetch all link tags and filter
      const allLinkTags = await db.select().from(linkTags);
      const linkIdSet = new Set(linkIds);
      backupData.data.linkTags = allLinkTags.filter(lt => linkIdSet.has(lt.linkId));
    }
  }

  // Fetch widgets (excluding soft-deleted)
  if (includeWidgets) {
    const userWidgets = await db
      .select()
      .from(widgets)
      .where(and(
        eq(widgets.userId, userId),
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
        eq(projects.userId, userId),
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
      userId,
      filename,
      size,
      backupData,
      backupType,
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
 * Restores data from a backup
 * Note: This is a simplified version. Full implementation would need transactions and conflict resolution.
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

  // If replace mode, we'd need to soft-delete existing data first
  // For safety, we only support merge mode in this initial implementation
  if (mergeMode === "replace") {
    errors.push("Replace mode not yet implemented. Using merge mode instead.");
  }

  // Restore categories first (links depend on them)
  if (data.data.categories?.length) {
    for (const cat of data.data.categories) {
      try {
        await db.insert(categories).values({
          ...cat,
          userId,
        }).onConflictDoNothing();
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
        await db.insert(tags).values({
          ...tag,
          userId,
        }).onConflictDoNothing();
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
        await db.insert(projects).values({
          ...project,
          userId,
        }).onConflictDoNothing();
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
        await db.insert(links).values({
          ...link,
          userId,
        }).onConflictDoNothing();
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
        await db.insert(widgets).values({
          ...widget,
          userId,
        }).onConflictDoNothing();
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
        await db.insert(linkTags).values(lt).onConflictDoNothing();
      } catch {
        // Silently ignore link-tag restore failures
      }
    }
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

  // If we have more than the max, delete the oldest ones
  if (allBackups.length > MAX_BACKUPS_PER_USER) {
    const backupsToDelete = allBackups.slice(MAX_BACKUPS_PER_USER);
    for (const backup of backupsToDelete) {
      await db.delete(userBackups).where(eq(userBackups.id, backup.id));
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
