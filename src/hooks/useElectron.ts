"use client";

import { useLayoutEffect, useEffect, useState } from "react";
import {
  isTauriWebView,
  minimizeTauriWindow,
  toggleMaximizeTauriWindow,
  closeTauriWindow,
} from "@/lib/desktop";

/**
 * Hook para detectar si se está corriendo en Electron o Tauri y acceder a sus APIs
 */
export function useElectron() {
  const [isElectron, setIsElectron] = useState(false);
  const [isTauri, setIsTauri] = useState(false);
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // useLayoutEffect: corre síncrono antes del primer paint → sin flash del botón logout
  useLayoutEffect(() => {
    // Detectar Electron
    const electronCheck =
      window.isElectron === true || window.electronAPI?.isElectron === true;
    setIsElectron(electronCheck);

    // Detectar Tauri (lee window.__DESKTOP_MODE__ inyectado por layout.tsx)
    const tauriCheck = isTauriWebView();
    setIsTauri(tauriCheck);
  }, []);

  // Info de plataforma Electron (async, no crítico)
  useEffect(() => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.getPlatform().then(setPlatform);
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, [isElectron]);

  /** true si estamos en cualquier entorno de escritorio (Electron o Tauri) */
  const isDesktop = isElectron || isTauri;

  const openExternal = (url: string) => {
    if (isElectron && window.electronAPI) {
      window.electronAPI.openExternal(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const minimizeWindow = () => {
    if (isTauri) {
      minimizeTauriWindow();
    } else if (isElectron && window.electronAPI) {
      window.electronAPI.minimizeWindow();
    }
  };

  const maximizeWindow = () => {
    if (isTauri) {
      toggleMaximizeTauriWindow();
    } else if (isElectron && window.electronAPI) {
      window.electronAPI.maximizeWindow();
    }
  };

  const closeWindow = () => {
    if (isTauri) {
      closeTauriWindow();
    } else if (isElectron && window.electronAPI) {
      window.electronAPI.closeWindow();
    }
  };

  return {
    isElectron,
    isTauri,
    isDesktop,
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
 * Verifica si se está ejecutando en Electron o Tauri (fuera de componentes React)
 */
export function isElectronEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.isElectron === true ||
    window.electronAPI?.isElectron === true ||
    isTauriWebView()
  );
}
