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
import { Sparkles, Loader2, Check, AlertCircle, Tag, FolderOpen, Minimize2 } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ProposedChange {
  linkId: string;
  linkTitle: string;
  linkUrl: string;
  currentCategory: string | null;
  proposedCategory: string | null;
  isNewCategory: boolean;
  currentTags: string[];
  proposedTags: string[];
  newTags: string[];
}

interface ClassifyProposal {
  changes: ProposedChange[];
  newCategories: string[];
  newTags: string[];
  summary: {
    linksToMove: number;
    linksToTag: number;
    skipped: number;
    total: number;
  };
}

interface ClassifyResults {
  categoriesCreated: string[];
  tagsCreated: string[];
  linksMoved: number;
  linksTagged: number;
}

interface ClassifyProgress {
  current: number;
  total: number;
  phase: string;
}

interface AutoClassifyDialogProps {
  open: boolean;
  onClose: () => void;
  onJobStarted?: (jobId: string) => void;
  pendingJobId?: string | null;
  pendingProposal?: unknown;
  onApplied?: () => void;
}

function tauriInvoke<T = unknown>(cmd: string): Promise<T> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as { invoke?: (cmd: string) => Promise<T> } | undefined;
  if (internals?.invoke) return internals.invoke(cmd);
  return Promise.reject(new Error("No Tauri"));
}

type DialogState = "confirm" | "running" | "review" | "applying" | "done" | "error";

// ─── Dialog principal ────────────────────────────────────────────────────────

export function AutoClassifyDialog({
  open, onClose, onJobStarted, pendingJobId, pendingProposal, onApplied,
}: AutoClassifyDialogProps) {
  const [state, setState] = useState<DialogState>("confirm");
  const [progress, setProgress] = useState<ClassifyProgress>({ current: 0, total: 0, phase: "" });
  const [proposal, setProposal] = useState<ClassifyProposal | null>(null);
  const [results, setResults] = useState<ClassifyResults | null>(null);
  const [error, setError] = useState("");
  const [jobId, setJobId] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const linksCount = useLinksStore((s) => s.links.length);
  const uncategorized = useLinksStore((s) => s.links.filter(l => !l.categoryId).length);

  // Reset al abrir — o restaurar estado de job pendiente
  useEffect(() => {
    if (open) {
      // Si hay una propuesta pendiente del toolbar, ir directo a review
      if (pendingProposal && (pendingProposal as ClassifyProposal).changes) {
        const p = pendingProposal as ClassifyProposal;
        setProposal(p);
        setJobId(pendingJobId || "");
        if (p.changes.length === 0) {
          setState("done");
          setResults({ categoriesCreated: [], tagsCreated: [], linksMoved: 0, linksTagged: 0 });
        } else {
          setState("review");
        }
        return;
      }
      // Si hay un job corriendo, retomar el polling
      if (pendingJobId) {
        setJobId(pendingJobId);
        setState("running");
        setProgress({ current: 0, total: 0, phase: "Retomando..." });
        startPolling(pendingJobId);
        return;
      }
      // Estado inicial
      setState("confirm");
      setProgress({ current: 0, total: 0, phase: "" });
      setProposal(null);
      setResults(null);
      setError("");
      setJobId("");
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startPolling = useCallback((id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/llm/classify?jobId=${id}`);
        if (!pollRes.ok) return;
        const job = await pollRes.json();

        setProgress(job.progress);

        if (job.status === "analyzed") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setProposal(job.proposal);
          if (job.proposal.changes.length === 0) {
            setState("done");
            setResults({ categoriesCreated: [], tagsCreated: [], linksMoved: 0, linksTagged: 0 });
          } else {
            setState("review");
          }
        } else if (job.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(job.error || "Error desconocido");
          setState("error");
        }
      } catch { /* retry next interval */ }
    }, 2000);
  }, []);

  // Iniciar análisis
  const startAnalysis = useCallback(async () => {
    setState("running");
    setProgress({ current: 0, total: 0, phase: "Iniciando análisis..." });

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

      const data = await res.json();
      setJobId(data.jobId);
      onJobStarted?.(data.jobId);
      startPolling(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al iniciar");
      setState("error");
    }
  }, [onJobStarted, startPolling]);

  // Aplicar propuesta
  const applyChanges = useCallback(async () => {
    const currentJobId = jobId || pendingJobId;
    if (!currentJobId) return;
    setState("applying");

    try {
      const res = await fetch("/api/llm/classify", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: currentJobId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResults(data);
      setState("done");
      onApplied?.();
      useLinksStore.getState().refreshAllData().catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aplicar");
      setState("error");
    }
  }, [jobId, pendingJobId, onApplied]);

  // Minimizar (cerrar sin cancelar el job)
  const handleMinimize = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    onClose();
  }, [onClose]);

  // Cerrar / descartar
  const handleDiscard = useCallback(() => {
    onApplied?.(); // Limpia el estado en el toolbar
    onClose();
  }, [onApplied, onClose]);

  const isWide = state === "review";
  const canClose = state !== "applying";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && canClose && (state === "running" ? handleMinimize() : onClose())}>
      <DialogContent className={cn(
        "transition-all duration-300",
        isWide ? "sm:max-w-2xl" : "sm:max-w-md"
      )}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Autoclasificar enlaces
          </DialogTitle>
          {state === "confirm" && (
            <DialogDescription>
              La IA analizará tus enlaces y propondrá una organización que podrás revisar antes de aplicar
            </DialogDescription>
          )}
          {state === "review" && (
            <DialogDescription>
              Revisa los cambios propuestos antes de aplicarlos
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Confirmación ── */}
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
              <p>El LLM analizará los enlaces sin categoría o sin etiquetas y propondrá:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Categorías nuevas si hacen falta</li>
                <li>Etiquetas relevantes para cada enlace</li>
                <li>A qué categoría mover cada enlace</li>
              </ul>
              <p className="text-amber-500 mt-2">Podrás revisar todos los cambios antes de aplicarlos.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
              <Button size="sm" className="gap-1.5" onClick={startAnalysis}>
                <Sparkles className="w-3.5 h-3.5" />
                Analizar enlaces
              </Button>
            </div>
          </div>
        )}

        {/* ── Analizando ── */}
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
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMinimize}>
                <Minimize2 className="w-3.5 h-3.5" />
                Minimizar
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Puedes minimizar y seguir usando la app. Te avisaremos cuando termine.
            </p>
          </div>
        )}

        {/* ── Revisión de propuesta ── */}
        {state === "review" && proposal && (
          <ReviewProposal proposal={proposal} onApply={applyChanges} onDiscard={handleDiscard} />
        )}

        {/* ── Aplicando ── */}
        {state === "applying" && (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
            <p className="text-sm text-center font-medium">Aplicando cambios...</p>
          </div>
        )}

        {/* ── Completado ── */}
        {state === "done" && (
          <DoneResults results={results} onClose={() => { onApplied?.(); onClose(); }} />
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { onApplied?.(); onClose(); }}>Cerrar</Button>
              <Button size="sm" onClick={() => { setState("confirm"); setError(""); }}>Reintentar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Componente de revisión ──────────────────────────────────────────────────

function ReviewProposal({ proposal, onApply, onDiscard }: {
  proposal: ClassifyProposal;
  onApply: () => void;
  onDiscard: () => void;
}) {
  const grouped = new Map<string, ProposedChange[]>();
  const tagOnly: ProposedChange[] = [];

  for (const change of proposal.changes) {
    if (change.proposedCategory) {
      const key = change.proposedCategory;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(change);
    } else {
      tagOnly.push(change);
    }
  }

  return (
    <div className="space-y-4">
      {/* Métricas resumen */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{proposal.newCategories.length}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Categorías nuevas</p>
        </div>
        <div className="bg-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{proposal.newTags.length}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Etiquetas nuevas</p>
        </div>
        <div className="bg-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-bold">{proposal.summary.linksToMove}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Enlaces a mover</p>
        </div>
        <div className="bg-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-bold">{proposal.summary.linksToTag}</p>
          <p className="text-[10px] text-muted-foreground leading-tight">Etiquetas a asignar</p>
        </div>
      </div>

      {/* Categorías nuevas */}
      {proposal.newCategories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <FolderOpen className="w-3 h-3" /> Categorías nuevas
          </p>
          <div className="flex flex-wrap gap-1">
            {proposal.newCategories.map(name => (
              <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Etiquetas nuevas */}
      {proposal.newTags.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Etiquetas nuevas
          </p>
          <div className="flex flex-wrap gap-1">
            {proposal.newTags.map(name => (
              <span key={name} className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Lista de cambios */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">
          Cambios propuestos ({proposal.changes.length} enlaces)
        </p>
        <div className="max-h-[40vh] overflow-y-auto rounded-lg border border-border divide-y divide-border">
          {[...grouped.entries()].map(([catName, changes]) => (
            <div key={catName}>
              <div className="px-3 py-1.5 bg-secondary/50 flex items-center gap-1.5 sticky top-0 z-10">
                <FolderOpen className="w-3 h-3 text-primary shrink-0" />
                <span className="text-xs font-medium">{catName}</span>
                {proposal.newCategories.includes(catName) && (
                  <span className="text-[10px] px-1 py-px rounded bg-primary/10 text-primary">nueva</span>
                )}
                <span className="text-[10px] text-muted-foreground ml-auto">{changes.length}</span>
              </div>
              {changes.map(change => (
                <LinkChangeRow key={change.linkId} change={change} newTags={proposal.newTags} />
              ))}
            </div>
          ))}
          {tagOnly.length > 0 && (
            <div>
              <div className="px-3 py-1.5 bg-secondary/50 flex items-center gap-1.5 sticky top-0 z-10">
                <Tag className="w-3 h-3 text-primary shrink-0" />
                <span className="text-xs font-medium">Solo etiquetas</span>
                <span className="text-[10px] text-muted-foreground ml-auto">{tagOnly.length}</span>
              </div>
              {tagOnly.map(change => (
                <LinkChangeRow key={change.linkId} change={change} newTags={proposal.newTags} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onDiscard}>Descartar</Button>
        <Button size="sm" className="gap-1.5" onClick={onApply}>
          <Check className="w-3.5 h-3.5" />
          Aplicar {proposal.changes.length} cambios
        </Button>
      </div>
    </div>
  );
}

// ─── Fila de cambio ──────────────────────────────────────────────────────────

function LinkChangeRow({ change, newTags }: { change: ProposedChange; newTags: string[] }) {
  const hostname = (() => {
    try { return new URL(change.linkUrl).hostname; } catch { return ""; }
  })();

  return (
    <div className="px-3 py-2 hover:bg-secondary/30 transition-colors">
      <div className="flex items-baseline gap-2">
        <p className="text-xs font-medium truncate flex-1">{change.linkTitle}</p>
        <span className="text-[10px] text-muted-foreground shrink-0">{hostname}</span>
      </div>
      {change.proposedTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {change.proposedTags.map(tag => (
            <span
              key={tag}
              className={cn(
                "text-[10px] px-1.5 py-px rounded-full",
                newTags.some(nt => nt.toLowerCase() === tag.toLowerCase())
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "bg-accent text-accent-foreground"
              )}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Resultados finales ──────────────────────────────────────────────────────

function DoneResults({ results, onClose }: { results: ClassifyResults | null; onClose: () => void }) {
  const noChanges = !results || (
    results.categoriesCreated.length === 0 &&
    results.tagsCreated.length === 0 &&
    results.linksMoved === 0 &&
    results.linksTagged === 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-500" />
        </div>
      </div>
      {noChanges ? (
        <p className="text-sm text-muted-foreground text-center">
          Todos los enlaces ya estaban clasificados correctamente.
        </p>
      ) : (
        <div className="space-y-2">
          {results!.categoriesCreated.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <FolderOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">{results!.categoriesCreated.length} categorías creadas:</span>
                <span className="text-muted-foreground ml-1">{results!.categoriesCreated.join(", ")}</span>
              </div>
            </div>
          )}
          {results!.tagsCreated.length > 0 && (
            <div className="flex items-start gap-2 text-sm">
              <Tag className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">{results!.tagsCreated.length} etiquetas creadas:</span>
                <span className="text-muted-foreground ml-1">{results!.tagsCreated.join(", ")}</span>
              </div>
            </div>
          )}
          {results!.linksMoved > 0 && (
            <p className="text-sm text-muted-foreground">{results!.linksMoved} enlaces movidos a categorías</p>
          )}
          {results!.linksTagged > 0 && (
            <p className="text-sm text-muted-foreground">{results!.linksTagged} etiquetas asignadas</p>
          )}
        </div>
      )}
      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>Cerrar</Button>
      </div>
    </div>
  );
}
