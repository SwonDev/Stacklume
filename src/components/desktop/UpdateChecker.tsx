"use client";

import { useEffect, useState, useCallback } from "react";
import { isTauriWebView } from "@/lib/desktop";
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// GitHub API tiene CORS abierto (Access-Control-Allow-Origin: *).
// La URL de descarga directa redirige a una CDN sin CORS → "Failed to fetch".
const GITHUB_API_URL =
  "https://api.github.com/repos/SwonDev/Stacklume/releases/latest";

type UpdateState =
  | { phase: "idle" }
  | { phase: "available"; version: string; notes: string | null }
  | { phase: "downloading"; progress: number }
  | { phase: "ready" }
  | { phase: "error"; message: string };

/** Compara versiones semver simples (MAJOR.MINOR.PATCH). */
function isNewer(latest: string, current: string): boolean {
  const p = (v: string) => v.split(".").map(Number);
  const [la, lb, lc] = p(latest);
  const [ca, cb, cc] = p(current);
  if (la !== ca) return la > ca;
  if (lb !== cb) return lb > cb;
  return lc > cc;
}

/**
 * Comprueba actualizaciones via GitHub API (CORS abierto) desde el WebView2.
 * La versión actual se lee de NEXT_PUBLIC_APP_VERSION (incrustada en build time).
 */
async function runUpdateCheck(
  onAvailable: (version: string, notes: string | null) => void,
  onUpToDate?: () => void,
) {
  const currentVersion = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
  const res = await fetch(GITHUB_API_URL, {
    cache: "no-store",
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!res.ok) throw new Error(`GitHub API: HTTP ${res.status}`);
  const release = await res.json() as { tag_name: string; body?: string };
  const latestVersion = release.tag_name.replace(/^v/, "");

  if (isNewer(latestVersion, currentVersion)) {
    onAvailable(latestVersion, release.body ?? null);
  } else {
    onUpToDate?.();
  }
}

/**
 * Comprueba actualizaciones de Stacklume al arrancar (solo en modo desktop Tauri).
 * Muestra un toast no intrusivo en la esquina inferior derecha cuando hay
 * una nueva versión disponible. La descarga e instalación son silenciosas;
 * la app se reinicia automáticamente al terminar.
 *
 * También escucha el evento "stacklume:check-update-manual" para comprobaciones
 * manuales desde el menú de configuración.
 */
export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback((manual = false) => {
    runUpdateCheck(
      (version, notes) => {
        setDismissed(false);
        setState({ phase: "available", version, notes });
      },
      manual
        ? () => toast.success("Ya tienes la última versión", { description: "Stacklume está al día." })
        : undefined,
    ).catch((err: unknown) => {
      if (manual) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error("No se pudo comprobar actualizaciones", { description: msg });
      }
    });
  }, []);

  // Comprobación automática 6 s tras el arranque
  useEffect(() => {
    if (!isTauriWebView()) return;
    const timer = setTimeout(() => checkForUpdate(false), 6000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  // Escucha comprobaciones manuales desde SettingsDropdown
  useEffect(() => {
    if (!isTauriWebView()) return;
    const handler = () => checkForUpdate(true);
    window.addEventListener("stacklume:check-update-manual", handler);
    return () => window.removeEventListener("stacklume:check-update-manual", handler);
  }, [checkForUpdate]);

  const handleUpdate = useCallback(async () => {
    if (state.phase !== "available") return;
    const { version } = state;

    // URL directa al instalador NSIS en GitHub Releases
    const installerUrl = `https://github.com/SwonDev/Stacklume/releases/download/v${version}/Stacklume_${version}_x64-setup.exe`;

    setState({ phase: "downloading", progress: 0 });

    try {
      // Usa el comando Rust propio (no plugin:updater) — no requiere ACL especial.
      // ureq descarga el instalador a %TEMP%\StacklumeUpdate.exe y lo ejecuta.
      // El hook NSIS del instalador cerrará Stacklume automáticamente.
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("download_and_run_update", { url: installerUrl });
      setState({ phase: "ready" });
    } catch {
      // Fallback para versiones antiguas que no tienen download_and_run_update:
      // abrir la página de releases en el navegador para descarga manual.
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke("open_url", {
          url: `https://github.com/SwonDev/Stacklume/releases/tag/v${version}`,
        });
        setState({
          phase: "error",
          message: "Descarga abierta en tu navegador. Ejecuta el instalador manualmente.",
        });
      } catch (e2) {
        setState({ phase: "error", message: String(e2) });
      }
    }
  }, [state]);

  // No mostrar nada en modo web, ni si fue descartado, ni en estado idle
  if (!isTauriWebView() || dismissed || state.phase === "idle") {
    return null;
  }

  const isDone = state.phase === "ready";
  const isError = state.phase === "error";
  const isDownloading = state.phase === "downloading";

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-[9999] w-80 rounded-xl border shadow-2xl",
        "bg-card/95 backdrop-blur-sm border-border/60",
        "animate-in slide-in-from-bottom-4 fade-in duration-300"
      )}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-center gap-2.5 min-w-0">
          {isDone ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-px" />
          ) : isError ? (
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-px" />
          ) : (
            <Download className="w-4 h-4 text-primary shrink-0 mt-px" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">
              {isDone
                ? "Instalando actualización…"
                : isError
                ? "Error al actualizar"
                : isDownloading
                ? "Descargando actualización…"
                : `Nueva versión disponible`}
            </p>
            {state.phase === "available" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"} → v{state.version}
              </p>
            )}
            {isError && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {state.message}
              </p>
            )}
          </div>
        </div>

        {!isDownloading && !isDone && (
          <button
            onClick={() => setDismissed(true)}
            className="shrink-0 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Descartar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Barra de progreso durante descarga */}
      {isDownloading && (
        <div className="px-4 pb-2">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full bg-primary",
                state.progress === 0 ? "animate-pulse w-full" : "transition-all duration-200"
              )}
              style={state.progress > 0 ? { width: `${state.progress}%` } : undefined}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
            {state.progress > 0 ? `${state.progress}%` : "Descargando instalador…"}
          </p>
        </div>
      )}

      {/* Botones de acción */}
      {(state.phase === "available" || isDone || isError) && (
        <div className="flex gap-2 px-4 pb-4">
          {state.phase === "available" && (
            <>
              <button
                onClick={() => setDismissed(true)}
                className="flex-1 py-1.5 px-3 text-xs rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Más tarde
              </button>
              <button
                onClick={handleUpdate}
                className="flex-1 py-1.5 px-3 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium flex items-center justify-center gap-1.5"
              >
                <Download className="w-3 h-3" />
                Actualizar
              </button>
            </>
          )}

          {isDone && (
            <p className="text-xs text-muted-foreground">
              Instalador iniciado. La app se cerrará y actualizará automáticamente.
            </p>
          )}

          {isError && (
            <button
              onClick={() => setState({ phase: "idle" })}
              className="flex items-center gap-1.5 py-1.5 px-3 text-xs rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
