/**
 * Utilidades para detectar y controlar el entorno desktop (Tauri v2)
 */

/**
 * Detecta si el servidor Next.js está corriendo en modo desktop.
 * Solo disponible en server-side (lee la variable de entorno DESKTOP_MODE).
 */
export function isDesktopMode(): boolean {
  return process.env.DESKTOP_MODE === "true";
}

/**
 * Detecta si el frontend está corriendo dentro del WebView de Tauri.
 * Solo disponible en client-side.
 */
export function isTauriWebView(): boolean {
  if (typeof window === "undefined") return false;
  return (
    // Inyectado por layout.tsx cuando el servidor corre con DESKTOP_MODE=true (más fiable)
    window.__DESKTOP_MODE__ === true ||
    // API pública de Tauri v1 (por compatibilidad)
    typeof window.__TAURI__ !== "undefined" ||
    // API interna de Tauri v2 (__TAURI_INTERNALS__ reemplaza __TAURI__ en v2)
    typeof window.__TAURI_INTERNALS__ !== "undefined"
  );
}

/**
 * Invoca un comando Tauri usando la API disponible (v2 o v1).
 * __TAURI_INTERNALS__ es la API de Tauri v2; __TAURI__ es la v1.
 */
function tauriInvoke<T = unknown>(
  cmd: string,
  args?: Record<string, unknown>
): Promise<T> {
  // Tauri v2: usa __TAURI_INTERNALS__
  if (window.__TAURI_INTERNALS__) {
    return window.__TAURI_INTERNALS__.invoke<T>(cmd, args);
  }
  // Tauri v1: usa __TAURI__
  if (window.__TAURI__) {
    return window.__TAURI__.invoke<T>(cmd, args);
  }
  return Promise.reject(new Error("[Desktop] Tauri API no disponible"));
}

/**
 * Minimiza la ventana de Tauri.
 */
export async function minimizeTauriWindow(): Promise<void> {
  await tauriInvoke("minimize_window");
}

/**
 * Alterna entre maximizado y restaurado en la ventana de Tauri.
 */
export async function toggleMaximizeTauriWindow(): Promise<void> {
  await tauriInvoke("toggle_maximize_window");
}

/**
 * Cierra la ventana de Tauri.
 */
export async function closeTauriWindow(): Promise<void> {
  await tauriInvoke("close_window");
}

/**
 * Obtiene el puerto en el que está escuchando el servidor Next.js local.
 * Devuelve null si no está en entorno Tauri.
 */
export async function getServerPort(): Promise<number | null> {
  if (typeof window === "undefined") return null;
  if (!window.__TAURI_INTERNALS__ && !window.__TAURI__) return null;
  return tauriInvoke<number>("get_server_port");
}

/**
 * Actualiza el icono del system tray con un frame RGBA del canvas offscreen.
 * @param rgba  Array de bytes RGBA (width × height × 4) en orden top-down.
 * @param width  Ancho en píxeles (normalmente 64).
 * @param height Alto en píxeles (normalmente 64).
 */
export async function updateTrayIcon(
  rgba: number[],
  width: number,
  height: number
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!window.__TAURI_INTERNALS__) return;
  await window.__TAURI_INTERNALS__.invoke("update_tray_icon", { rgba, width, height });
}

/**
 * Abre una URL externa en el navegador por defecto del sistema.
 * En Tauri usa el comando Rust nativo open_url (cmd /c start en Windows).
 * En navegador normal usa window.open() estándar.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined") return;

  // Rutas locales (local:// scheme) — convertir a path del sistema de archivos
  if (url.startsWith("local://")) {
    const path = url.slice("local://".length);
    await openLocalPath(path);
    return;
  }

  if (window.__TAURI_INTERNALS__) {
    // 1. Nuestro comando Rust nativo — más fiable en Windows
    try {
      await window.__TAURI_INTERNALS__.invoke("open_url", { url });
      return;
    } catch {
      // Fallback al plugin shell
    }
    // 2. Plugin shell de Tauri
    try {
      await window.__TAURI_INTERNALS__.invoke("plugin:shell|open", { path: url });
      return;
    } catch {
      // Ambos fallaron — NO llamar window.open (causaría bucle infinito
      // porque AppShell lo sobreescribe para redirigir a openExternalUrl)
      return;
    }
  }

  // Navegador web normal (no Tauri)
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Abre una ruta local (archivo o carpeta) con la aplicación por defecto del sistema.
 * Solo funciona en el desktop Tauri.
 */
export async function openLocalPath(path: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!window.__TAURI_INTERNALS__) return;
  await window.__TAURI_INTERNALS__.invoke("open_local_path", { path });
}

/**
 * Abre una ruta local en VS Code.
 * Solo funciona en el desktop Tauri si VS Code está instalado en el PATH.
 */
export async function openInVscode(path: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!window.__TAURI_INTERNALS__) return;
  await window.__TAURI_INTERNALS__.invoke("open_in_vscode", { path });
}

/**
 * Registra un listener para el evento global de Quick Launcher.
 * Tauri v2 (withGlobalTauri: true) expone `window.__TAURI_INTERNALS__.event.listen`.
 * Devuelve una función para desregistrar el listener.
 */
export function onShowLauncher(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  type ListenFn = (event: string, handler: () => void) => Promise<() => void>;

  // Tauri v2: __TAURI_INTERNALS__.event.listen
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as { event?: { listen?: ListenFn } } | undefined;
  const listenV2 = internals?.event?.listen;
  if (typeof listenV2 === "function") {
    let unlisten: (() => void) | null = null;
    listenV2("stacklume:show-launcher", callback)
      .then((fn) => { unlisten = fn; })
      .catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }

  // Fallback Tauri v1: __TAURI__.event.listen
  const tauri = (window as unknown as Record<string, unknown>).__TAURI__ as
    | { event?: { listen?: ListenFn } }
    | undefined;
  const listenV1 = tauri?.event?.listen;
  if (typeof listenV1 === "function") {
    let unlisten: (() => void) | null = null;
    listenV1("stacklume:show-launcher", callback)
      .then((fn) => { unlisten = fn; })
      .catch(() => {});
    return () => { if (unlisten) unlisten(); };
  }

  return () => {};
}
