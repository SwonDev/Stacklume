"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, AlertCircle, Tag, FolderOpen } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";

interface ClassifyResults {
  categoriesCreated: string[];
  tagsCreated: string[];
  linksMoved: number;
  linksTagged: number;
  skipped: number;
}

interface ClassifyProgress {
  current: number;
  total: number;
  phase: string;
}

interface AutoClassifyDialogProps {
  open: boolean;
  onClose: () => void;
}

function tauriInvoke<T = unknown>(cmd: string): Promise<T> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as { invoke?: (cmd: string) => Promise<T> } | undefined;
  if (internals?.invoke) return internals.invoke(cmd);
  return Promise.reject(new Error("No Tauri"));
}

export function AutoClassifyDialog({ open, onClose }: AutoClassifyDialogProps) {
  const [state, setState] = useState<"confirm" | "running" | "done" | "error">("confirm");
  const [progress, setProgress] = useState<ClassifyProgress>({ current: 0, total: 0, phase: "" });
  const [results, setResults] = useState<ClassifyResults | null>(null);
  const [error, setError] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const linksCount = useLinksStore((s) => s.links.length);
  const categoriesCount = useLinksStore((s) => s.categories.length);

  // Contar enlaces sin categoría o sin tags
  const uncategorized = useLinksStore((s) => s.links.filter(l => !l.categoryId).length);

  // Reset al abrir
  useEffect(() => {
    if (open) {
      setState("confirm");
      setProgress({ current: 0, total: 0, phase: "" });
      setResults(null);
      setError("");
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [open]);

  const startClassification = useCallback(async () => {
    setState("running");
    setProgress({ current: 0, total: 0, phase: "Iniciando..." });

    let llamaPort = 0;
    try {
      llamaPort = await tauriInvoke<number>("get_llama_port");
    } catch { /* */ }

    try {
      const res = await fetch("/api/llm/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ llamaPort }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const { jobId } = await res.json();

      // Polling
      pollingRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/llm/classify?jobId=${jobId}`);
          if (!pollRes.ok) return;
          const job = await pollRes.json();

          setProgress(job.progress);

          if (job.status === "done") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setResults(job.results);
            setState("done");
            // Refrescar datos
            useLinksStore.getState().refreshAllData().catch(() => {});
          } else if (job.status === "error") {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setError(job.error || "Error desconocido");
            setState("error");
          }
        } catch { /* retry next interval */ }
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar");
      setState("error");
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (state !== "running") && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Autoclasificar enlaces
          </DialogTitle>
          {state === "confirm" && (
            <DialogDescription>
              El modelo de IA analizará tus enlaces y los organizará automáticamente
            </DialogDescription>
          )}
        </DialogHeader>

        {/* Confirmación */}
        {state === "confirm" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{uncategorized}</p>
                <p className="text-xs text-muted-foreground">Sin categoría</p>
              </div>
              <div className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{linksCount}</p>
                <p className="text-xs text-muted-foreground">Total enlaces</p>
              </div>
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>El LLM analizará los enlaces sin categoría o sin etiquetas y:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Creará categorías nuevas si hacen falta</li>
                <li>Asignará etiquetas relevantes</li>
                <li>Moverá enlaces a la categoría más apropiada</li>
              </ul>
              <p className="text-amber-500 mt-2">Los enlaces ya clasificados no se modificarán.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" className="gap-1.5" onClick={startClassification}>
                <Sparkles className="w-3.5 h-3.5" />
                Iniciar clasificación
              </Button>
            </div>
          </div>
        )}

        {/* En progreso */}
        {state === "running" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium">{progress.phase}</p>
              {progress.total > 0 && (
                <div className="w-full bg-secondary rounded-full h-2 mt-2">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max((progress.current / progress.total) * 100, 5)}%` }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {progress.total > 0 ? `Lote ${progress.current} de ${progress.total}` : "Preparando..."}
              </p>
            </div>
          </div>
        )}

        {/* Completado */}
        {state === "done" && results && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="space-y-2">
              {results.categoriesCreated.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <FolderOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{results.categoriesCreated.length} categorías creadas:</span>
                    <span className="text-muted-foreground ml-1">{results.categoriesCreated.join(", ")}</span>
                  </div>
                </div>
              )}
              {results.tagsCreated.length > 0 && (
                <div className="flex items-start gap-2 text-sm">
                  <Tag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium">{results.tagsCreated.length} etiquetas creadas:</span>
                    <span className="text-muted-foreground ml-1">{results.tagsCreated.join(", ")}</span>
                  </div>
                </div>
              )}
              {results.linksMoved > 0 && (
                <p className="text-sm text-muted-foreground">{results.linksMoved} enlaces movidos a categorías</p>
              )}
              {results.linksTagged > 0 && (
                <p className="text-sm text-muted-foreground">{results.linksTagged} etiquetas asignadas</p>
              )}
              {results.categoriesCreated.length === 0 && results.tagsCreated.length === 0 && results.linksMoved === 0 && results.linksTagged === 0 && (
                <p className="text-sm text-muted-foreground text-center">Todos los enlaces ya estaban clasificados correctamente.</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={onClose}>Cerrar</Button>
            </div>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cerrar</Button>
              <Button size="sm" onClick={() => { setState("confirm"); setError(""); }}>Reintentar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
