import { NextRequest, NextResponse } from "next/server";
import {
  createBackup,
  listBackups,
  validateBackupData,
} from "@/lib/backup/backup-service";
import { db, generateId } from "@/lib/db";
import { userBackups } from "@/lib/db/schema";
import type { BackupData } from "@/lib/db/schema";
import { DEFAULT_USER_ID } from "@/lib/auth-utils";

function getUserId(): string {
  return DEFAULT_USER_ID;
}

/**
 * GET /api/backup - List all backups for the current user
 */
export async function GET() {
  try {
    const userId = getUserId();
    const backups = await listBackups(userId);

    // Return backups without the full data (just metadata)
    const backupList = backups.map(({ backupData, ...meta }) => ({
      ...meta,
      itemCount: {
        links: (backupData as BackupData)?.data?.links?.length || 0,
        categories: (backupData as BackupData)?.data?.categories?.length || 0,
        tags: (backupData as BackupData)?.data?.tags?.length || 0,
        widgets: (backupData as BackupData)?.data?.widgets?.length || 0,
        projects: (backupData as BackupData)?.data?.projects?.length || 0,
      },
    }));

    return NextResponse.json(backupList);
  } catch (error) {
    console.error("Error listing backups:", error);
    return NextResponse.json(
      { error: "Failed to list backups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup - Create a new backup or import from JSON
 */
export async function POST(request: NextRequest) {
  try {
    const userId = getUserId();
    const body = await request.json();

    // Check if this is an import request
    if (body.importData) {
      // Validate the imported data
      if (!validateBackupData(body.importData)) {
        return NextResponse.json(
          { error: "Invalid backup data format" },
          { status: 400 }
        );
      }

      const backupData = body.importData as BackupData;
      const backupJson = JSON.stringify(backupData);
      const size = new Blob([backupJson]).size;

      // Generate filename for import
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `stacklume-import-${timestamp}.json`;

      // Save imported backup
      const [newBackup] = await db
        .insert(userBackups)
        .values({
          id: generateId(),
          userId,
          filename,
          size,
          backupData,
          backupType: "export",
          createdAt: new Date(),
        })
        .returning();

      return NextResponse.json({
        id: newBackup.id,
        filename: newBackup.filename,
        size: newBackup.size,
        backupType: newBackup.backupType,
        createdAt: newBackup.createdAt,
        message: "Backup imported successfully",
      });
    }

    // Create a new backup
    const options = {
      userId,
      backupType: (body.backupType || "manual") as "manual" | "auto" | "export",
      includeLinks: body.includeLinks !== false,
      includeCategories: body.includeCategories !== false,
      includeTags: body.includeTags !== false,
      includeWidgets: body.includeWidgets !== false,
      includeProjects: body.includeProjects !== false,
      includeSettings: body.includeSettings !== false,
    };

    const backup = await createBackup(options);

    return NextResponse.json({
      id: backup.id,
      filename: backup.filename,
      size: backup.size,
      backupType: backup.backupType,
      createdAt: backup.createdAt,
      message: "Backup created successfully",
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
