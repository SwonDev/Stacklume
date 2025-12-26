/**
 * Analytics utilities for Plausible Analytics
 * Privacy-first analytics without cookies
 */

// Extend Window interface for Plausible
declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, string | number | boolean | undefined> }) => void;
  }
}

// Plausible event types for type safety
export type PlausibleEventName =
  // Navigation events
  | "pageview"
  // Link events
  | "link_added"
  | "link_edited"
  | "link_deleted"
  | "link_favorited"
  | "links_imported"
  // Widget events
  | "widget_added"
  | "widget_deleted"
  | "widget_configured"
  | "widget_locked"
  | "widget_unlocked"
  // Category/Tag events
  | "category_created"
  | "tag_created"
  // Project events
  | "project_created"
  | "project_switched"
  // Backup events
  | "backup_created"
  | "backup_restored"
  | "backup_exported"
  // User events
  | "user_signed_in"
  | "user_signed_out"
  | "user_registered"
  // Feature usage
  | "view_mode_changed"
  | "edit_mode_toggled"
  | "search_performed"
  | "duplicate_detection"
  // PWA events
  | "pwa_installed"
  | "offline_mode_entered";

// Event properties type
export interface PlausibleEventProps {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Check if Plausible is available
 */
function isPlausibleAvailable(): boolean {
  return typeof window !== "undefined" && typeof window.plausible === "function";
}

/**
 * Track a custom event with Plausible
 * @param eventName - The name of the event to track
 * @param props - Optional properties to include with the event
 */
export function trackEvent(
  eventName: PlausibleEventName,
  props?: PlausibleEventProps
): void {
  if (!isPlausibleAvailable()) {
    // Log in development for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] ${eventName}`, props);
    }
    return;
  }

  try {
    if (props) {
      window.plausible!(eventName, { props });
    } else {
      window.plausible!(eventName);
    }
  } catch (error) {
    console.error("[Analytics] Error tracking event:", error);
  }
}

/**
 * Track a page view
 * Note: Plausible automatically tracks page views, but this can be used for SPAs
 */
export function trackPageView(url?: string): void {
  if (!isPlausibleAvailable()) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[Analytics] pageview`, { url });
    }
    return;
  }

  try {
    if (url) {
      window.plausible!("pageview", { props: { url } });
    } else {
      window.plausible!("pageview");
    }
  } catch (error) {
    console.error("[Analytics] Error tracking pageview:", error);
  }
}

// Convenience functions for common events

export const analytics = {
  // Link events
  linkAdded: (source?: string) => trackEvent("link_added", source ? { source } : undefined),
  linkDeleted: () => trackEvent("link_deleted"),
  linkEdited: () => trackEvent("link_edited"),
  linkFavorited: () => trackEvent("link_favorited"),
  linksImported: (count: number) => trackEvent("links_imported", { count }),

  // Widget events
  widgetAdded: (type: string) => trackEvent("widget_added", { type }),
  widgetDeleted: (type: string) => trackEvent("widget_deleted", { type }),
  widgetConfigured: (type: string) => trackEvent("widget_configured", { type }),
  widgetLocked: () => trackEvent("widget_locked"),
  widgetUnlocked: () => trackEvent("widget_unlocked"),

  // Category/Tag events
  categoryCreated: () => trackEvent("category_created"),
  tagCreated: () => trackEvent("tag_created"),

  // Project events
  projectCreated: () => trackEvent("project_created"),
  projectSwitched: () => trackEvent("project_switched"),

  // Backup events
  backupCreated: (type: string) => trackEvent("backup_created", { type }),
  backupRestored: () => trackEvent("backup_restored"),
  backupExported: () => trackEvent("backup_exported"),

  // User events
  userSignedIn: (provider: string) => trackEvent("user_signed_in", { provider }),
  userSignedOut: () => trackEvent("user_signed_out"),
  userRegistered: (provider: string) => trackEvent("user_registered", { provider }),

  // Feature usage
  viewModeChanged: (mode: string) => trackEvent("view_mode_changed", { mode }),
  editModeToggled: (enabled: boolean) => trackEvent("edit_mode_toggled", { enabled }),
  searchPerformed: () => trackEvent("search_performed"),
  duplicateDetection: (count: number) => trackEvent("duplicate_detection", { count }),

  // PWA events
  pwaInstalled: () => trackEvent("pwa_installed"),
  offlineModeEntered: () => trackEvent("offline_mode_entered"),
};
