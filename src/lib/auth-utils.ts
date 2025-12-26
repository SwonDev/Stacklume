/**
 * Default user ID for single-user local application
 * Since this app runs locally without authentication,
 * all data belongs to this default user
 */
export const DEFAULT_USER_ID = "default";

/**
 * Get the current user ID
 * Always returns DEFAULT_USER_ID since this is a local-only app
 * @returns User ID string
 */
export function getCurrentUserId(): string {
  return DEFAULT_USER_ID;
}

/**
 * Async version for API routes compatibility
 * @returns Promise resolving to user ID string
 */
export async function getCurrentUserIdAsync(): Promise<string> {
  return DEFAULT_USER_ID;
}
