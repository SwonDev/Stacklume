"use client";

import { useEffect, useState } from "react";

/**
 * Hook to detect if running in Electron and access the Electron API
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      // Check if running in Electron
      const electronCheck =
        typeof window !== "undefined" &&
        (window.isElectron === true || window.electronAPI?.isElectron === true);

      setIsElectron(electronCheck);

      if (electronCheck && window.electronAPI) {
        // Get platform info
        window.electronAPI.getPlatform().then(setPlatform);
        window.electronAPI.getAppVersion().then(setAppVersion);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const openExternal = (url: string) => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const minimizeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const maximizeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const closeWindow = () => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  return {
    isElectron,
    platform,
    appVersion,
    openExternal,
    minimizeWindow,
    maximizeWindow,
    closeWindow,
    api: isElectron ? window.electronAPI : null,
  };
}

/**
 * Check if running in Electron (non-hook version for use outside components)
 */
export function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return window.isElectron === true || window.electronAPI?.isElectron === true;
}
