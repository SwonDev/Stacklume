import { NextResponse } from "next/server";
import { db, getCurrentDatabaseType, userSettings, withRetry } from "@/lib/db";

/**
 * GET /api/database
 * Returns current database configuration and status
 */
export async function GET() {
  try {
    const dbType = getCurrentDatabaseType();
    const isSqlite = dbType === "sqlite";

    // Verify actual connectivity by querying an existing table
    let status: "connected" | "error" = "error";
    try {
      await withRetry(
        () => db.select().from(userSettings).limit(1),
        { operationName: "database health check" }
      );
      status = "connected";
    } catch {
      status = "error";
    }

    return NextResponse.json({
      type: dbType,
      isLocal: isSqlite,
      status,
      config: {
        type: dbType,
        ...(isSqlite
          ? { sqlitePath: process.env.DATABASE_PATH || "./stacklume-dev.db" }
          : { hasNeonConnection: !!process.env.DATABASE_URL }),
      },
    });
  } catch (error) {
    console.error("Error getting database info:", error);
    return NextResponse.json(
      {
        type: "unknown",
        isLocal: true,
        status: "error",
        config: { type: "unknown" },
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
