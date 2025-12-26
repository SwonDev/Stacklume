/**
 * Next.js Instrumentation Hook
 *
 * This file is automatically loaded by Next.js at server startup.
 * We use it to initialize the database before any requests are handled.
 */

export async function register() {
  // Only run on the server
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.log("[Instrumentation] Initializing server...");

    // Initialize the database
    const { ensureDbInitialized, getCurrentDatabaseType } = await import("@/lib/db");
    await ensureDbInitialized();
    console.log(`[Instrumentation] Database initialized (${getCurrentDatabaseType()})`);
  }
}
