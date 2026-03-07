"use client";

import { useSyncExternalStore, useEffect, useState } from "react";
import {
  isTauriWebView,
  minimizeTauriWindow,
  toggleMaximizeTauriWindow,
  closeTauriWindow,
} from "@/lib/desktop";

function getIsElectron() {
  if (typeof window === "undefined") return false;
  return window.isElectron === true || window.electronAPI?.isElectron === true;
}

const noopSubscribe = () => () => {};
const serverFalse = () => false;

/**
 * Hook para detectar si se está corriendo en Electron o Tauri y acceder a sus APIs
 */
export function useElectron() {
  // useSyncExternalStore: SSR-safe, sin setState en effect, compatible con React Compiler
  const isElectron = useSyncExternalStore(noopSubscribe, getIsElectron, serverFalse);
  const isTauri = useSyncExternalStore(noopSubscribe, () => isTauriWebView(), serverFalse);
  const [platform, setPlatform] = useState<NodeJS.Platform | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

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
