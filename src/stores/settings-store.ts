import { create } from "zustand";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useListViewStore } from "@/stores/list-view-store";
import type { SortBy } from "@/stores/list-view-store";

/**
 * Helper to make API requests with CSRF token retry logic.
 * Dispatches sync events consumed by SyncIndicator.
 */
async function fetchWithCsrfRetry(
  url: string,
  options: RequestInit,
  retried = false
): Promise<Response> {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stacklume:sync-start"));
  }
  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options.headers,
        ...getCsrfHeaders(),
      },
    });

    if (response.status === 403 && !retried) {
      console.log("CSRF token expired or missing, refreshing...");
      await fetch("/api/settings", { credentials: "include" });
      await new Promise(resolve => setTimeout(resolve, 100));
      return fetchWithCsrfRetry(url, options, true);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(response.ok ? "stacklume:sync-done" : "stacklume:sync-error"));
    }
    return response;
  } catch (error) {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("stacklume:sync-error"));
    }
    throw error;
  }
}

export type Theme =
  | "light" | "dark" | "system"
  | "midnight" | "ocean" | "forest" | "slate" | "crimson" | "aurora"
  | "nordic" | "catppuccin" | "tokyo" | "rosepine" | "gruvbox" | "solardark" | "vampire"
  | "solarized"
  | "arctic" | "sakura" | "lavender" | "mint"
  | "cement" | "stone" | "steel";
export type ViewDensity = "compact" | "normal" | "comfortable";
export type ViewMode = "bento" | "kanban" | "list";
export type Language = "es" | "en";
export type SortField = "createdAt" | "updatedAt" | "title" | "order";
export type SortOrder = "asc" | "desc";
export type ThumbnailSize = "none" | "small" | "medium" | "large";
export type LinkClickBehavior = "new-tab" | "same-tab";
export type DatabaseType = "sqlite" | "neon" | "unknown";

interface DatabaseInfo {
  type: DatabaseType;
  isLocal: boolean;
  status: "connected" | "error" | "unknown";
  config: {
    type: DatabaseType;
    sqlitePath?: string;
    hasNeonConnection?: boolean;
  };
  error?: string;
}

interface SettingsState {
  // Settings data
  theme: Theme;
  viewDensity: ViewDensity;
  viewMode: ViewMode;
  showTooltips: boolean;
  reduceMotion: boolean;
  stickerSoundVolume: number; // 0-100 (0 = muted)

  // MCP server settings
  mcpEnabled: boolean;
  mcpApiKey: string | null;

  // Database info
  databaseInfo: DatabaseInfo | null;
  isDatabaseLoading: boolean;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;

  // Extended settings (localStorage-only)
  language: Language;
  gridColumns: number;
  sidebarAlwaysVisible: boolean;
  defaultSortField: SortField;
  defaultSortOrder: SortOrder;
  thumbnailSize: ThumbnailSize;
  sidebarDensity: ViewDensity;
  autoBackupInterval: number; // 0=off, 1=daily, 7=weekly, 30=monthly
  confirmBeforeDelete: boolean;
  linkClickBehavior: LinkClickBehavior;

  // Actions
  setTheme: (theme: Theme) => void;
  setViewDensity: (density: ViewDensity) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowTooltips: (show: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setStickerSoundVolume: (volume: number) => void;
  fetchDatabaseInfo: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  setGridColumns: (cols: number) => void;
  setSidebarAlwaysVisible: (v: boolean) => void;
  setDefaultSortField: (f: SortField) => void;
  setDefaultSortOrder: (o: SortOrder) => void;
  setThumbnailSize: (s: ThumbnailSize) => void;
  setSidebarDensity: (d: ViewDensity) => void;
  setAutoBackupInterval: (days: number) => void;
  setConfirmBeforeDelete: (v: boolean) => void;
  setLinkClickBehavior: (b: LinkClickBehavior) => void;

  // MCP actions
  setMcpEnabled: (enabled: boolean) => Promise<void>;
  regenerateMcpApiKey: () => Promise<void>;

  // DB operations
  initSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  // Default values
  theme: "system",
  viewDensity: "normal",
  viewMode: "bento",
  showTooltips: true,
  reduceMotion: false,
  stickerSoundVolume: 50, // 0-100 (default 50%)
  mcpEnabled: false,
  mcpApiKey: null,
  databaseInfo: null,
  isDatabaseLoading: false,
  isLoading: false,
  isInitialized: false,

  // Extended defaults (loaded from DB in initSettings)
  language: "es",
  gridColumns: 12,
  sidebarAlwaysVisible: false,
  defaultSortField: "createdAt",
  defaultSortOrder: "desc",
  thumbnailSize: "medium",
  sidebarDensity: "normal",
  autoBackupInterval: 0,
  confirmBeforeDelete: true,
  linkClickBehavior: "new-tab",

  // Extended settings — persisted to DB
  setLanguage: async (language) => {
    set({ language });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      });
    } catch (error) {
      console.error("Error saving language:", error);
    }
  },
  setGridColumns: async (gridColumns) => {
    set({ gridColumns });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gridColumns }),
      });
    } catch (error) {
      console.error("Error saving grid columns:", error);
    }
  },
  setSidebarAlwaysVisible: async (sidebarAlwaysVisible) => {
    set({ sidebarAlwaysVisible });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarAlwaysVisible }),
      });
    } catch (error) {
      console.error("Error saving sidebar always visible:", error);
    }
  },
  setDefaultSortField: async (defaultSortField) => {
    set({ defaultSortField });
    // Sync to list-view-store (skip "order" which doesn't exist there)
    if (defaultSortField !== "order") {
      useListViewStore.getState().setSortBy(defaultSortField as SortBy);
    }
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultSortField }),
      });
    } catch (error) {
      console.error("Error saving default sort field:", error);
    }
  },
  setDefaultSortOrder: async (defaultSortOrder) => {
    set({ defaultSortOrder });
    // Sync to list-view-store
    useListViewStore.getState().setSortOrder(defaultSortOrder);
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultSortOrder }),
      });
    } catch (error) {
      console.error("Error saving default sort order:", error);
    }
  },
  setThumbnailSize: async (thumbnailSize) => {
    set({ thumbnailSize });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thumbnailSize }),
      });
    } catch (error) {
      console.error("Error saving thumbnail size:", error);
    }
  },
  setSidebarDensity: async (sidebarDensity) => {
    set({ sidebarDensity });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sidebarDensity }),
      });
    } catch (error) {
      console.error("Error saving sidebar density:", error);
    }
  },
  setAutoBackupInterval: async (autoBackupInterval) => {
    set({ autoBackupInterval });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoBackupInterval }),
      });
    } catch (error) {
      console.error("Error saving auto backup interval:", error);
    }
  },
  setConfirmBeforeDelete: async (confirmBeforeDelete) => {
    set({ confirmBeforeDelete });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmBeforeDelete }),
      });
    } catch (error) {
      console.error("Error saving confirm before delete:", error);
    }
  },
  setLinkClickBehavior: async (linkClickBehavior) => {
    set({ linkClickBehavior });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkClickBehavior }),
      });
    } catch (error) {
      console.error("Error saving link click behavior:", error);
    }
  },

  // Initialize settings from database
  initSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const response = await fetch("/api/settings", { credentials: "include" });
      if (response.ok) {
        const settings = await response.json();
        set({
          theme: settings.theme as Theme,
          viewDensity: settings.viewDensity as ViewDensity,
          viewMode: (settings.viewMode as ViewMode) || "bento",
          showTooltips: settings.showTooltips,
          reduceMotion: settings.reduceMotion,
          mcpEnabled: settings.mcpEnabled ?? false,
          mcpApiKey: settings.mcpApiKey ?? null,
          language: (settings.language as Language) ?? "es",
          gridColumns: settings.gridColumns ?? 12,
          sidebarAlwaysVisible: settings.sidebarAlwaysVisible ?? false,
          defaultSortField: (settings.defaultSortField as SortField) ?? "createdAt",
          defaultSortOrder: (settings.defaultSortOrder as SortOrder) ?? "desc",
          thumbnailSize: (settings.thumbnailSize as ThumbnailSize) ?? "medium",
          sidebarDensity: (settings.sidebarDensity as ViewDensity) ?? "normal",
          autoBackupInterval: settings.autoBackupInterval ?? 0,
          confirmBeforeDelete: settings.confirmBeforeDelete ?? true,
          linkClickBehavior: (settings.linkClickBehavior as LinkClickBehavior) ?? "new-tab",
          isInitialized: true,
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  // Update theme
  setTheme: async (theme) => {
    set({ theme });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  },

  // Update view density
  setViewDensity: async (viewDensity) => {
    set({ viewDensity });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewDensity }),
      });
    } catch (error) {
      console.error("Error saving view density:", error);
    }
  },

  // Update view mode (bento/kanban)
  setViewMode: async (viewMode) => {
    set({ viewMode });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewMode }),
      });
    } catch (error) {
      console.error("Error saving view mode:", error);
    }
  },

  // Update show tooltips
  setShowTooltips: async (showTooltips) => {
    set({ showTooltips });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ showTooltips }),
      });
    } catch (error) {
      console.error("Error saving show tooltips:", error);
    }
  },

  // Update reduce motion
  setReduceMotion: async (reduceMotion) => {
    set({ reduceMotion });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reduceMotion }),
      });
    } catch (error) {
      console.error("Error saving reduce motion:", error);
    }
  },

  // Toggle MCP server on/off
  setMcpEnabled: async (mcpEnabled) => {
    set({ mcpEnabled });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcpEnabled }),
      });
    } catch (error) {
      console.error("Error saving MCP enabled:", error);
    }
  },

  // Genera una nueva API key y la persiste
  regenerateMcpApiKey: async () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const mcpApiKey = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    set({ mcpApiKey });
    try {
      await fetchWithCsrfRetry("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mcpApiKey }),
      });
    } catch (error) {
      console.error("Error saving MCP API key:", error);
    }
  },

  // Update sticker sound volume (stored locally only, not in DB)
  setStickerSoundVolume: (stickerSoundVolume) => {
    set({ stickerSoundVolume });
    // Store in localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem("stacklume-sticker-sound-volume", String(stickerSoundVolume));
    }
  },

  // Fetch database info
  fetchDatabaseInfo: async () => {
    set({ isDatabaseLoading: true });
    try {
      const response = await fetch("/api/database", { credentials: "include" });
      if (response.ok) {
        const databaseInfo = await response.json();
        set({ databaseInfo, isDatabaseLoading: false });
      } else {
        set({
          databaseInfo: {
            type: "unknown",
            isLocal: true,
            status: "error",
            config: { type: "unknown" },
            error: "Failed to fetch database info",
          },
          isDatabaseLoading: false,
        });
      }
    } catch (error) {
      console.error("Error fetching database info:", error);
      set({
        databaseInfo: {
          type: "unknown",
          isLocal: true,
          status: "error",
          config: { type: "unknown" },
          error: error instanceof Error ? error.message : "Unknown error",
        },
        isDatabaseLoading: false,
      });
    }
  },
}));

// Initialize stickerSoundVolume from localStorage (kept local-only)
if (typeof window !== "undefined") {
  const savedVolume = localStorage.getItem("stacklume-sticker-sound-volume");
  if (savedVolume !== null) {
    const volume = parseInt(savedVolume, 10);
    if (!isNaN(volume) && volume >= 0 && volume <= 100) {
      useSettingsStore.setState({ stickerSoundVolume: volume });
    }
  }
}
