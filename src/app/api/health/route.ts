import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createModuleLogger } from "@/lib/logger";

// Create a module-specific logger
const log = createModuleLogger("api/health");

// Track server start time for uptime calculation
const serverStartTime = Date.now();

interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  uptime: number;
  uptimeFormatted: string;
  database: {
    status: "connected" | "disconnected";
    latencyMs?: number;
    error?: string;
  };
  version: string;
  environment: string;
}

/**
 * Format uptime in a human-readable format
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Check database connectivity
 */
async function checkDatabase(): Promise<{
  status: "connected" | "disconnected";
  latencyMs?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Execute a simple query to verify database connectivity
    await db.execute(sql`SELECT 1`);
    const latencyMs = Date.now() - startTime;

    return {
      status: "connected",
      latencyMs,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    return {
      status: "disconnected",
      error: errorMessage,
    };
  }
}

// GET health check endpoint
export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = Date.now() - serverStartTime;

  try {
    // Check database connectivity
    const databaseCheck = await checkDatabase();

    // Determine overall health status
    const isHealthy = databaseCheck.status === "connected";

    const response: HealthCheckResponse = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      database: databaseCheck,
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    // Log health check result
    if (!isHealthy) {
      log.warn({ database: databaseCheck }, "Health check failed - database unhealthy");
    }

    // Return appropriate status code based on health
    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    // In case of unexpected errors, return unhealthy status
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    log.error({ error }, "Health check encountered unexpected error");

    const response: HealthCheckResponse = {
      status: "unhealthy",
      timestamp,
      uptime,
      uptimeFormatted: formatUptime(uptime),
      database: {
        status: "disconnected",
        error: errorMessage,
      },
      version: process.env.npm_package_version || "1.0.0",
      environment: process.env.NODE_ENV || "development",
    };

    return NextResponse.json(response, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  }
}
