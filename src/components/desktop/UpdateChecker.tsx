"use client";

import { useEffect, useState, useCallback } from "react";
import { isTauriWebView } from "@/lib/desktop";
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type UpdateState =
  | { phase: "idle" }
  | { phase: "available"; version: string; notes: string | null }
  | { phase: "downloading"; progress: number }
  | { phase: "ready" }
  | { phase: "error"; message: string };

/**
 * Comprueba actualizaciones de Stacklume al arrancar (solo en modo desktop Tauri).
 * Muestra un toast no intrusivo en la esquina inferior derecha cuando hay
 * una nueva versión disponible. La descarga e instalación son silenciosas;
 * la app se reinicia automáticamente al terminar.
 */
export function UpdateChecker() {
  const [state, setState] = useState<UpdateState>({ phase: "idle" });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauriWebView()) return;

    // Espera 6 s tras el arranque antes de consultar para no interferir con la carga inicial
    const timer = setTimeout(async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const update = await check();
        if (update?.available) {
          setState({
            phase: "available",
            version: update.version,
            notes: update.body ?? null,
          });
        }
      } catch {
        // Sin conexión o endpoint no disponible — fallo silencioso
      }
    }, 6000);

    return () => clearTimeout(timer);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (state.phase !== "available") return;

    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const { relaunch } = await import("@tauri-apps/plugin-process");

      const update = await check();
      if (!update?.available) return;

      setState({ phase: "downloading", progress: 0 });

      let downloaded = 0;
      let total = 0;

      await update.downloadAndInstall((event) => {
        switch (event.event) {
          case "Started":
            total = event.data.contentLength ?? 0;
            break;
          case "Progress":
            downloaded += event.data.chunkLength;
            setState({
              phase: "downloading",
              progress: total > 0 ? Math.round((downloaded / total) * 100) : 0,
            });
            break;
          case "Finished":
            setState({ phase: "ready" });
            break;
        }
      });

      // El instalador NSIS ya se ejecutó silenciosamente — relanzar la app
      await relaunch();
    } catch (err) {
      setState({ phase: "error", message: String(err) });
    }
  }, [state.phase]);

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
                ? "Actualización instalada"
                : isError
                ? "Error al actualizar"
                : isDownloading
                ? "Descargando actualización…"
                : `Nueva versión disponible`}
            </p>
            {state.phase === "available" && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Stacklume v{state.version}
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
              className="h-full rounded-full bg-primary transition-all duration-200"
              style={{ width: `${state.progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 tabular-nums">
            {state.progress > 0 ? `${state.progress}%` : "Iniciando…"}
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
              Reiniciando la aplicación…
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
