import { NextResponse } from "next/server";
import { getCurrentDatabaseType } from "@/lib/db";

/**
 * GET /api/database
 * Returns current database configuration and status
 */
export async function GET() {
  try {
    const dbType = getCurrentDatabaseType();

    return NextResponse.json({
      type: dbType,
      status: "connected",
      config: {
        type: "neon",
        hasConnection: !!process.env.DATABASE_URL,
      },
    });
  } catch (error) {
    console.error("Error getting database info:", error);
    return NextResponse.json(
      {
        type: "unknown",
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
