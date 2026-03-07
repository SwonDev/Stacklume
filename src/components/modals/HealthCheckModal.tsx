"use client";

import { useState, useCallback } from "react";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

interface HealthCheckModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type HealthStatus = "ok" | "redirect" | "broken" | "timeout" | "error";
type FilterStatus = HealthStatus | "all";

interface LinkHealthResult {
  id: string;
  url: string;
  status: HealthStatus;
  statusCode?: number;
  redirectUrl?: string;
  responseTimeMs: number;
  checkedAt: string;
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

const STATUS_LABEL_KEYS: Record<HealthStatus, string> = {
  ok:       "OK",
  redirect: "healthCheck.statusRedirect",
  broken:   "healthCheck.statusBroken",
  timeout:  "healthCheck.statusTimeout",
  error:    "healthCheck.statusError",
};

const STATUS_ICONS: Record<HealthStatus, { icon: typeof CheckCircle2; color: string; bg: string }> = {
  ok:       { icon: CheckCircle2,  color: "text-green-500",  bg: "bg-green-500/10"  },
  redirect: { icon: AlertTriangle, color: "text-amber-500",  bg: "bg-amber-500/10"  },
  broken:   { icon: XCircle,       color: "text-red-500",    bg: "bg-red-500/10"    },
  timeout:  { icon: Clock,         color: "text-orange-500", bg: "bg-orange-500/10" },
  error:    { icon: AlertCircle,   color: "text-rose-500",   bg: "bg-rose-500/10"   },
};

const BATCH_SIZE = 10;

export function HealthCheckModal({ open, onOpenChange }: HealthCheckModalProps) {
  const { t } = useTranslation();
  const links = useLinksStore((state) => state.links);
  const removeLink = useLinksStore((state) => state.removeLink);
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<LinkHealthResult[]>([]);
  const [summary, setSummary] = useState<HealthSummary | null>(null);
  const [progress, setProgress] = useState(0);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalLinks = links.length;

  const handleDeleteLink = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/links/${id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error al eliminar");
      removeLink(id);
      setResults((prev) => prev.filter((r) => r.id !== id));
      setSummary((prev) => {
        if (!prev) return prev;
        const deletedResult = results.find((r) => r.id === id);
        if (!deletedResult) return prev;
        return {
          ...prev,
          total: prev.total - 1,
          [deletedResult.status]: prev[deletedResult.status] - 1,
        };
      });
    } catch {
      // silently ignore
    } finally {
      setDeletingId(null);
    }
  }, [removeLink, results]);

  const handleStartCheck = async () => {
    if (totalLinks === 0) return;
    setIsChecking(true);
    setResults([]);
    setSummary(null);
    setProgress(0);

    const allIds = links.map((l) => l.id);
    const allResults: LinkHealthResult[] = [];

    for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
      const batch = allIds.slice(i, i + BATCH_SIZE);
      try {
        const response = await fetch("/api/links/check-health", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ linkIds: batch }),
        });
        if (response.ok) {
          const data = await response.json();
          allResults.push(...(data.results as LinkHealthResult[]));
        }
      } catch {
        // continue with remaining batches
      }
      setProgress(Math.round(((i + BATCH_SIZE) / allIds.length) * 100));
    }

    setProgress(100);

    const newSummary: HealthSummary = {
      total: allResults.length,
      ok: allResults.filter((r) => r.status === "ok").length,
      redirect: allResults.filter((r) => r.status === "redirect").length,
      broken: allResults.filter((r) => r.status === "broken").length,
      timeout: allResults.filter((r) => r.status === "timeout").length,
      error: allResults.filter((r) => r.status === "error").length,
    };

    setResults(allResults);
    setSummary(newSummary);
    setIsChecking(false);
    setFilter("all");
  };

  const filteredResults = filter === "all"
    ? results
    : results.filter((r) => r.status === filter);

  const hasIssues = summary && (summary.broken + summary.timeout + summary.error) > 0;
  const issueCount = summary ? summary.broken + summary.timeout + summary.error : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {t("healthCheck.title")}
          </DialogTitle>
          <DialogDescription>
            {t("healthCheck.description")}
          </DialogDescription>
        </DialogHeader>

        {!isChecking && !summary && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">{t("healthCheck.readyTitle")}</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {totalLinks !== 1
                  ? t("healthCheck.readyDescPlural", { count: totalLinks })
                  : t("healthCheck.readyDesc", { count: totalLinks })}
              </p>
            </div>
            <Button onClick={handleStartCheck} disabled={totalLinks === 0} className="gap-2">
              <Activity className="w-4 h-4" />
              {t("healthCheck.startCheck")}
            </Button>
          </div>
        )}

        {isChecking && (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="w-full max-w-sm space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{t("healthCheck.checking")}</span>
                <span>{Math.min(progress, 100)}%</span>
              </div>
              <Progress value={Math.min(progress, 100)} className="h-2" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("healthCheck.slowWarning")}
            </p>
          </div>
        )}

        {!isChecking && summary && (
          <div className="space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {(Object.keys(STATUS_ICONS) as HealthStatus[]).map((status) => {
                const cfg = STATUS_ICONS[status];
                const count = summary[status];
                const Icon = cfg.icon;
                const label = status === "ok" ? "OK" : t(STATUS_LABEL_KEYS[status]);
                return (
                  <button
                    key={status}
                    onClick={() => setFilter(filter === status ? "all" : status)}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all",
                      filter === status
                        ? `${cfg.bg} border-current ${cfg.color}`
                        : "border-border/40 hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4", filter === status ? cfg.color : "")} />
                    <span className="text-lg font-semibold leading-none">{count}</span>
                    <span className="text-[10px] leading-none">{label}</span>
                  </button>
                );
              })}
            </div>

            {hasIssues ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {issueCount !== 1
                  ? t("healthCheck.problemsFoundPlural", { count: issueCount })
                  : t("healthCheck.problemsFound", { count: issueCount })}
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {t("healthCheck.allGood")}
              </div>
            )}

            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-1 pr-1">
                {filteredResults.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    {t("healthCheck.noFilterResults")}
                  </p>
                ) : (
                  filteredResults.map((result) => {
                    const cfg = STATUS_ICONS[result.status];
                    const Icon = cfg.icon;
                    const linkData = links.find((l) => l.id === result.id);
                    return (
                      <div
                        key={result.id}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className={cn("p-1.5 rounded-md shrink-0", cfg.bg)}>
                          <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {linkData?.title || result.url}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground truncate max-w-[240px]">
                              {result.url}
                            </p>
                            {result.statusCode && (
                              <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                {result.statusCode}
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {result.responseTimeMs}ms
                            </span>
                          </div>
                          {result.error && (
                            <p className="text-[10px] text-destructive mt-0.5 truncate">
                              {result.error}
                            </p>
                          )}
                        </div>
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-md hover:bg-secondary transition-colors shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                        </a>
                        <button
                          onClick={() => handleDeleteLink(result.id)}
                          disabled={deletingId === result.id}
                          title={t("btn.delete")}
                          className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        >
                          {deletingId === result.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-end pt-1">
              <Button variant="outline" size="sm" onClick={handleStartCheck} className="gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                {t("healthCheck.retryCheck")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
