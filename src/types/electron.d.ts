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

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    isElectron?: boolean;
  }
}

export {};
