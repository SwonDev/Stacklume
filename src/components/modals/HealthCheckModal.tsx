"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  HeartPulse,
  CheckCircle2,
  ArrowRight,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/desktop";
import { AnimatePresence, motion } from "motion/react";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/es";

interface HealthCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HealthStatus = "ok" | "redirect" | "broken" | "timeout" | "error";

interface HealthResult {
  linkId: string;
  url: string;
  title: string | null;
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  error?: string;
}

interface HealthSummary {
  total: number;
  ok: number;
  redirect: number;
  broken: number;
  timeout: number;
  error: number;
}

const STATUS_CONFIG: Record<
  HealthStatus,
  {
    labelKey: TranslationKey;
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  ok: {
    labelKey: "healthCheck.statusOk",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  redirect: {
    labelKey: "healthCheck.statusRedirect",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: ArrowRight,
  },
  broken: {
    labelKey: "healthCheck.statusBroken",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: XCircle,
  },
  timeout: {
    labelKey: "healthCheck.statusTimeout",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    icon: Clock,
  },
  error: {
    labelKey: "healthCheck.statusError",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30",
    icon: AlertTriangle,
  },
};

export function HealthCheckModal({ open, onOpenChange }: HealthCheckModalProps) {
  const { t } = useTranslation();
  const links = useLinksStore((state) => state.links);
  const removeLink = useLinksStore((state) => state.removeLink);
  const refreshAllData = useLinksStore((state) => state.refreshAllData);

  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<HealthResult[] | null>(null);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<HealthStatus | "all">("all");

  const handleStartCheck = useCallback(async () => {
    setIsChecking(true);
    setProgress(0);
    setResults(null);
    setSummary(null);
    setActiveFilter("all");

    try {
      // Verificar todos los enlaces activos en lotes
      // Enviamos los IDs en bloques de 20 para mostrar progreso granular
      const allIds = links.map((l) => l.id);
      const batchSize = 20;
      const totalBatches = Math.ceil(allIds.length / batchSize);
      const allResults: HealthResult[] = [];

      for (let i = 0; i < allIds.length; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);

        const response = await fetch("/api/links/health-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ linkIds: batchIds }),
        });

        if (!response.ok) {
          throw new Error(`Error del servidor: ${response.status}`);
        }

        const data = await response.json();
        allResults.push(...data.results);

        // Actualizar progreso
        const currentBatch = Math.floor(i / batchSize) + 1;
        setProgress(Math.round((currentBatch / totalBatches) * 100));
      }

      // Calcular resumen final
      const finalSummary: HealthSummary = {
        total: allResults.length,
        ok: allResults.filter((r) => r.status === "ok").length,
        redirect: allResults.filter((r) => r.status === "redirect").length,
        broken: allResults.filter((r) => r.status === "broken").length,
        timeout: allResults.filter((r) => r.status === "timeout").length,
        error: allResults.filter((r) => r.status === "error").length,
      };

      setResults(allResults);
      setSummary(finalSummary);
      setProgress(100);

      if (finalSummary.broken > 0 || finalSummary.error > 0) {
        toast.warning(
          t("healthCheck.completedWithIssues", { count: finalSummary.broken + finalSummary.error })
        );
      } else {
        toast.success(t("healthCheck.allOk"));
      }
    } catch (error) {
      console.error("Health check error:", error);
      toast.error(t("healthCheck.errorChecking"));
    } finally {
      setIsChecking(false);
    }
  }, [links]);

  const handleDeleteLink = useCallback(
    async (linkId: string) => {
      setDeletingId(linkId);
      try {
        const response = await fetch(`/api/links/${linkId}`, {
          method: "DELETE",
          headers: getCsrfHeaders(),
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Error al eliminar");
        }

        // Actualizar estado local
        removeLink(linkId);

        // Quitar de resultados
        setResults((prev) => {
          if (!prev) return prev;
          const updated = prev.filter((r) => r.linkId !== linkId);
          // Recalcular resumen
          setSummary({
            total: updated.length,
            ok: updated.filter((r) => r.status === "ok").length,
            redirect: updated.filter((r) => r.status === "redirect").length,
            broken: updated.filter((r) => r.status === "broken").length,
            timeout: updated.filter((r) => r.status === "timeout").length,
            error: updated.filter((r) => r.status === "error").length,
          });
          return updated;
        });

        toast.success(t("healthCheck.linkDeleted"));
      } catch (error) {
        console.error("Delete error:", error);
        toast.error(t("healthCheck.errorDeleting"));
      } finally {
        setDeletingId(null);
      }
    },
    [removeLink]
  );

  const handleOpenLink = useCallback((url: string) => {
    void openExternalUrl(url);
  }, []);

  const handleReset = useCallback(() => {
    setResults(null);
    setSummary(null);
    setProgress(0);
    setActiveFilter("all");
  }, []);

  const handleClose = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && results) {
        // Refrescar datos al cerrar si se hicieron cambios
        refreshAllData();
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, refreshAllData, results]
  );

  // Filtrar resultados seg\u00FAn el filtro activo
  const filteredResults = results
    ? activeFilter === "all"
      ? results
      : results.filter((r) => r.status === activeFilter)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="w-5 h-5 text-primary" />
            {t("healthCheck.title")}
          </DialogTitle>
          <DialogDescription>
            {t("healthCheck.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Resumen estad\u00EDstico */}
          {summary && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-3 sm:grid-cols-6 gap-2"
            >
              {(
                [
                  { key: "all" as const, label: t("healthCheck.total"), value: summary.total, color: "text-foreground", bg: "bg-secondary" },
                  { key: "ok" as const, label: t("healthCheck.statusOk"), value: summary.ok, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
                  { key: "redirect" as const, label: t("healthCheck.redirected"), value: summary.redirect, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
                  { key: "broken" as const, label: t("healthCheck.broken"), value: summary.broken, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10" },
                  { key: "timeout" as const, label: t("healthCheck.statusTimeout"), value: summary.timeout, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-500/10" },
                  { key: "error" as const, label: t("healthCheck.statusError"), value: summary.error, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
                ] as const
              ).map((stat) => (
                <button
                  key={stat.key}
                  onClick={() => setActiveFilter(stat.key)}
                  className={cn(
                    "flex flex-col items-center p-2 rounded-lg border transition-all cursor-pointer",
                    stat.bg,
                    activeFilter === stat.key
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-transparent hover:border-border"
                  )}
                >
                  <span className={cn("text-lg font-bold", stat.color)}>{stat.value}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Barra de progreso durante la verificaci\u00F3n */}
          {isChecking && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("healthCheck.checking")}
                </span>
                <span className="font-mono text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {/* Estado inicial: bot\u00F3n para iniciar */}
          {!isChecking && !results && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="p-4 rounded-full bg-primary/10">
                <HeartPulse className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium">
                  {t("healthCheck.linksAvailable", { count: links.length })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("healthCheck.httpCheck")}
                </p>
              </div>
              <Button
                onClick={handleStartCheck}
                disabled={links.length === 0}
                className="gap-2"
                size="lg"
              >
                <HeartPulse className="w-4 h-4" />
                {t("healthCheck.startCheck")}
              </Button>
            </div>
          )}

          {/* Lista de resultados */}
          {results && results.length > 0 && (
            <ScrollArea className="h-[340px] overflow-y-auto pr-2">
              <AnimatePresence mode="popLayout">
                {filteredResults.length === 0 ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-muted-foreground py-8"
                  >
                    {t("healthCheck.noResults")}
                  </motion.p>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map((result) => {
                      const config = STATUS_CONFIG[result.status];
                      const StatusIcon = config.icon;

                      return (
                        <motion.div
                          key={result.linkId}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border",
                            config.bgColor,
                            config.borderColor
                          )}
                        >
                          <StatusIcon className={cn("w-4 h-4 shrink-0", config.color)} />

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {result.title || result.url}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{result.url}</p>
                            {result.redirectUrl && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 truncate mt-0.5">
                                {t("healthCheck.redirectsTo", { url: result.redirectUrl })}
                              </p>
                            )}
                            {result.error && (
                              <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                                {result.error}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0", config.color)}
                            >
                              {t(config.labelKey)}
                              {result.statusCode ? ` ${result.statusCode}` : ""}
                            </Badge>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleOpenLink(result.url)}
                              title={t("healthCheck.openLink")}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>

                            {(result.status === "broken" || result.status === "error") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                onClick={() => handleDeleteLink(result.linkId)}
                                disabled={deletingId === result.linkId}
                                title={t("healthCheck.deleteLink")}
                              >
                                {deletingId === result.linkId ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </AnimatePresence>
            </ScrollArea>
          )}

          {/* Resultados vac\u00EDos */}
          {results && results.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-8">
              {t("healthCheck.noLinks")}
            </p>
          )}

          {/* Botones de acci\u00F3n post-verificaci\u00F3n */}
          {results && !isChecking && (
            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                {t("healthCheck.checkAgain")}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
