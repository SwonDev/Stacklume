import { create } from "zustand";
import { getCsrfHeaders } from "@/hooks/useCsrf";

/**
 * Helper to make API requests with CSRF token retry logic.
 */
async function fetchWithCsrfRetry(
  url: string,
  options: RequestInit,
  retried = false
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...getCsrfHeaders(),
    },
  });

  if (response.status === 403 && !retried) {
    console.log("CSRF token expired or missing, refreshing...");
    await fetch("/api/settings");
    await new Promise(resolve => setTimeout(resolve, 100));
    return fetchWithCsrfRetry(url, options, true);
  }

  return response;
}

export type Theme = "light" | "dark" | "system";
export type ViewDensity = "compact" | "normal" | "comfortable";
export type ViewMode = "bento" | "kanban" | "list";
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

  // Database info
  databaseInfo: DatabaseInfo | null;
  isDatabaseLoading: boolean;

  // Loading state
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setTheme: (theme: Theme) => void;
  setViewDensity: (density: ViewDensity) => void;
  setViewMode: (mode: ViewMode) => void;
  setShowTooltips: (show: boolean) => void;
  setReduceMotion: (reduce: boolean) => void;
  setStickerSoundVolume: (volume: number) => void;
  fetchDatabaseInfo: () => Promise<void>;

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
  databaseInfo: null,
  isDatabaseLoading: false,
  isLoading: false,
  isInitialized: false,

  // Initialize settings from database
  initSettings: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const settings = await response.json();
        set({
          theme: settings.theme as Theme,
          viewDensity: settings.viewDensity as ViewDensity,
          viewMode: (settings.viewMode as ViewMode) || "bento",
          showTooltips: settings.showTooltips,
          reduceMotion: settings.reduceMotion,
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
      const response = await fetch("/api/database");
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

// Initialize sticker sound volume from localStorage on hydration
if (typeof window !== "undefined") {
  const savedVolume = localStorage.getItem("stacklume-sticker-sound-volume");
  if (savedVolume !== null) {
    const volume = parseInt(savedVolume, 10);
    if (!isNaN(volume) && volume >= 0 && volume <= 100) {
      useSettingsStore.setState({ stickerSoundVolume: volume });
    }
  }
}
