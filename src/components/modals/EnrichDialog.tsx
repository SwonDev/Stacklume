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
import {
  Wand2,
  Loader2,
  Check,
  AlertCircle,
  Minimize2,
  ImageIcon,
  Globe,
  Tag,
  FileText,
} from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import { useTranslation } from "@/lib/i18n";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface EnrichResults {
  enriched: number;
  faviconsAdded: number;
  platformsDetected: number;
  tagsGenerated: number;
  summariesGenerated: number;
  visionTagsGenerated: number;
  llmAvailable: boolean;
  skippedNoLlm: number;
}

interface EnrichProgress {
  current: number;
  total: number;
  phase: string;
}

interface EnrichDialogProps {
  open: boolean;
  onClose: () => void;
  onJobStarted?: (jobId: string) => void;
  pendingJobId?: string | null;
  onCompleted?: () => void;
}

function tauriInvoke<T = unknown>(cmd: string): Promise<T> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as { invoke?: (cmd: string) => Promise<T> } | undefined;
  if (internals?.invoke) return internals.invoke(cmd);
  return Promise.reject(new Error("No Tauri"));
}

type DialogState = "confirm" | "running" | "done" | "error";

// ─── Dialog principal ────────────────────────────────────────────────────────

export function EnrichDialog({
  open, onClose, onJobStarted, pendingJobId, onCompleted,
}: EnrichDialogProps) {
  const { t } = useTranslation();
  const [state, setState] = useState<DialogState>("confirm");
  const [progress, setProgress] = useState<EnrichProgress>({ current: 0, total: 0, phase: "" });
  const [results, setResults] = useState<EnrichResults | null>(null);
  const [error, setError] = useState("");
  const [_jobId, setJobId] = useState("");
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Contar enlaces que necesitan enriquecimiento
  const allLinks = useLinksStore((s) => s.links);
  const linkTags = useLinksStore((s) => s.linkTags ?? []);

  // Desglose detallado de lo que necesita enriquecimiento
  const noFaviconCount = allLinks.filter(l => !l.faviconUrl).length;
  const noPlatformCount = allLinks.filter(l => !l.platform).length;
  const noTagsCount = allLinks.filter(l => !linkTags.some((lt: { linkId: string }) => lt.linkId === l.id)).length;
  const noSummaryCount = allLinks.filter(l => !l.summary).length;

  const needsEnrichmentCount = allLinks.filter(link => {
    const noFavicon = !link.faviconUrl;
    const noPlatform = !link.platform;
    const noTags = !linkTags.some((lt: { linkId: string }) => lt.linkId === link.id);
    const noSummary = !link.summary;
    return noFavicon || noPlatform || noTags || noSummary;
  }).length;

  // Reset al abrir — o restaurar estado de job pendiente
  useEffect(() => {
    if (open) {
      if (pendingJobId) {
        setJobId(pendingJobId);
        setState("running");
        setProgress({ current: 0, total: 0, phase: "Retomando..." });
        startPolling(pendingJobId);
        return;
      }
      setState("confirm");
      setProgress({ current: 0, total: 0, phase: "" });
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
        const pollRes = await fetch(`/api/links/enrich?jobId=${id}`);
        if (!pollRes.ok) return;
        const job = await pollRes.json();

        setProgress(job.progress);

        if (job.status === "done") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setResults(job.results);
          setState("done");
          // Refrescar datos automáticamente al completar
          useLinksStore.getState().refreshAllData().catch(() => {});
        } else if (job.status === "error") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          setError(job.error || "Error desconocido");
          setState("error");
        }
      } catch { /* retry next interval */ }
    }, 2000);
  }, []);

  // Iniciar enriquecimiento
  const startEnrichment = useCallback(async () => {
    setState("running");
    setProgress({ current: 0, total: 0, phase: "Iniciando enriquecimiento..." });

    let llamaPort = 0;
    try {
      llamaPort = await tauriInvoke<number>("get_llama_port");
    } catch { /* */ }

    try {
      const res = await fetch("/api/links/enrich", {
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

  // Minimizar
  const handleMinimize = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    onClose();
  }, [onClose]);

  // Cerrar definitivo
  const handleClose = useCallback(() => {
    onCompleted?.();
    onClose();
  }, [onCompleted, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && (state === "running" ? handleMinimize() : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            {t("enrich.title")}
          </DialogTitle>
          {state === "confirm" && (
            <DialogDescription>
              {t("enrich.description")}
            </DialogDescription>
          )}
        </DialogHeader>

        {/* ── Confirmación ── */}
        {state === "confirm" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{needsEnrichmentCount}</p>
                <p className="text-xs text-muted-foreground">{t("enrich.needsEnrichment")}</p>
              </div>
              <div className="bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{allLinks.length}</p>
                <p className="text-xs text-muted-foreground">{t("enrich.totalLinks")}</p>
              </div>
            </div>
            {/* Desglose detallado */}
            {needsEnrichmentCount > 0 && (
              <div className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">{t("enrich.breakdown")}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div className="flex items-center gap-1.5 text-xs">
                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>{t("enrich.breakdown.favicon")}</span>
                    <span className="ml-auto font-medium">{noFaviconCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span>{t("enrich.breakdown.platform")}</span>
                    <span className="ml-auto font-medium">{noPlatformCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Tag className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-amber-500/80">{t("enrich.breakdown.tags")}</span>
                    <span className="ml-auto font-medium text-amber-500">{noTagsCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                    <span className="text-amber-500/80">{t("enrich.breakdown.summary")}</span>
                    <span className="ml-auto font-medium text-amber-500">{noSummaryCount}</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-500 mt-1.5 pt-1.5 border-t border-border/50">
                  {t("enrich.breakdown.llmHint")}
                </p>
              </div>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>{t("enrich.willDo")}</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>{t("enrich.step.favicon")}</li>
                <li>{t("enrich.step.platform")}</li>
                <li>{t("enrich.step.tags")}</li>
                <li>{t("enrich.step.summary")}</li>
                <li>{t("enrich.step.vision")}</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>{t("enrich.cancel")}</Button>
              <Button
                size="sm"
                className="gap-1.5"
                onClick={startEnrichment}
                disabled={needsEnrichmentCount === 0}
              >
                <Wand2 className="w-3.5 h-3.5" />
                {needsEnrichmentCount === 0 ? t("enrich.allEnriched") : t("enrich.start")}
              </Button>
            </div>
          </div>
        )}

        {/* ── Procesando ── */}
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
                {progress.total > 0
                  ? `${progress.current} de ${progress.total} enlaces`
                  : "Preparando..."}
              </p>
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleMinimize}>
                <Minimize2 className="w-3.5 h-3.5" />
                {t("enrich.minimize")}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              {t("enrich.minimizeHint")}
            </p>
          </div>
        )}

        {/* ── Completado ── */}
        {state === "done" && results && (
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-6 h-6 text-green-500" />
              </div>
            </div>
            {results.enriched === 0 && results.skippedNoLlm === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                {t("enrich.noChanges")}
              </p>
            ) : (
              <div className="space-y-2">
                {results.enriched > 0 && (
                  <p className="text-sm font-medium text-center">
                    {t("enrich.enrichedCount", { count: results.enriched })}
                  </p>
                )}
                <div className="grid grid-cols-1 gap-1.5 mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{results.faviconsAdded} favicons {t("enrich.result.generated")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{results.platformsDetected} {t("enrich.platforms")} {t("enrich.result.detected")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{results.tagsGenerated} {t("enrich.tags")} {t("enrich.result.generated")}{!results.llmAvailable ? ` (${t("enrich.result.noLlm")})` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{results.summariesGenerated} {t("enrich.summaries")} {t("enrich.result.generated")}{!results.llmAvailable ? ` (${t("enrich.result.noLlm")})` : ""}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ImageIcon className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{results.visionTagsGenerated} {t("enrich.result.visionAnalyzed")}</span>
                  </div>
                </div>
                {/* Nota sobre LLM no disponible */}
                {!results.llmAvailable && results.skippedNoLlm > 0 && (
                  <div className="bg-amber-500/10 rounded-lg p-2.5 mt-2">
                    <p className="text-xs text-amber-500">
                      {t("enrich.result.skippedNoLlm", { count: results.skippedNoLlm })}
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button size="sm" onClick={handleClose}>{t("enrich.close")}</Button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleClose}>{t("enrich.close")}</Button>
              <Button size="sm" onClick={() => { setState("confirm"); setError(""); }}>{t("enrich.retry")}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
