import { NextRequest, NextResponse } from "next/server";
import {
  getBackup,
  deleteBackup,
  restoreBackup,
  exportBackupAsJson,
} from "@/lib/backup/backup-service";
import { DEFAULT_USER_ID } from "@/lib/auth-utils";

function getUserId(): string {
  return DEFAULT_USER_ID;
}

/**
 * GET /api/backup/[id] - Get a specific backup (for download)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId();

    const backup = await getBackup(userId, id);
    if (!backup) {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    // Return the full backup data for download
    const jsonContent = exportBackupAsJson(backup);

    return new NextResponse(jsonContent, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
      },
    });
  } catch (error) {
    console.error("Error getting backup:", error);
    return NextResponse.json(
      { error: "Failed to get backup" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backup/[id] - Delete a backup
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId();

    const deleted = await deleteBackup(userId, id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Backup not found or already deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Backup deleted successfully" });
  } catch (error) {
    console.error("Error deleting backup:", error);
    return NextResponse.json(
      { error: "Failed to delete backup" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backup/[id] - Restore a backup
 * Body: { action: "restore", mergeMode?: "replace" | "merge" }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = getUserId();
    const body = await request.json();

    if (body.action !== "restore") {
      return NextResponse.json(
        { error: "Invalid action. Use 'restore' to restore a backup." },
        { status: 400 }
      );
    }

    const result = await restoreBackup({
      userId,
      backupId: id,
      mergeMode: body.mergeMode || "merge",
    });

    if (!result.success && result.errors.length > 0 && result.errors[0] === "Backup not found") {
      return NextResponse.json(
        { error: "Backup not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: result.success,
      restored: result.restored,
      errors: result.errors,
      message: result.success
        ? "Backup restored successfully"
        : "Backup restored with some errors",
    });
  } catch (error) {
    console.error("Error restoring backup:", error);
    return NextResponse.json(
      { error: "Failed to restore backup" },
      { status: 500 }
    );
  }
}
