/**
 * Type definitions for Electron API exposed via preload script
 */

interface ElectronAPI {
  // App info
  getAppVersion: () => Promise<string>;
  getPlatform: () => Promise<NodeJS.Platform>;
  isDarkMode: () => Promise<boolean>;

  // External links
  openExternal: (url: string) => Promise<void>;

  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  isMaximized: () => Promise<boolean>;

  // Theme changes listener
  onThemeChange: (callback: (isDark: boolean) => void) => void;

  // Check if running in Electron
  isElectron: boolean;
}

/** API de Tauri v2 expuesta al WebView */
interface TauriAPI {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
  event: {
    listen: (event: string, handler: (payload: unknown) => void) => Promise<() => void>;
    emit: (event: string, payload?: unknown) => Promise<void>;
  };
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
    /** Presente cuando la app corre dentro del WebView de Tauri v1 */
    __TAURI__?: TauriAPI;
    /** API interna de Tauri v2 (reemplaza __TAURI__ en v2) */
    __TAURI_INTERNALS__?: TauriAPI;
    /** Inyectado por el servidor Next.js en modo desktop */
    __DESKTOP_MODE__?: boolean;
  }
}

export {};
