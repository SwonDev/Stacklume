"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ExternalLink,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ensureProtocol, extractHostname } from "@/lib/url-utils";
import { useTranslation } from "@/lib/i18n";

interface SiteStatusMonitorWidgetProps {
  widget: Widget;
}

interface MonitoredSite {
  id: string;
  url: string;
  name: string;
  addedAt: string;
}

interface SiteStatus {
  status: "online" | "offline" | "checking" | "unknown";
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

export function SiteStatusMonitorWidget({ widget }: SiteStatusMonitorWidgetProps) {
  const { t } = useTranslation();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSite, setNewSite] = useState({ url: "", name: "" });
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({});
  const [isChecking, setIsChecking] = useState(false);

  const monitoredSites: MonitoredSite[] = widget.config?.monitoredSites || [];

  const formatLastChecked = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return t("siteMonitor.timeSeconds");
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return t("siteMonitor.timeMinutes", { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("siteMonitor.timeHours", { count: hours });

    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const saveSites = useCallback(
    (sites: MonitoredSite[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          monitoredSites: sites,
        },
      });
    },
    [widget.id, widget.config]
  );

  const checkSite = async (site: MonitoredSite): Promise<SiteStatus> => {
    const startTime = Date.now();

    try {
      // Using a CORS proxy to check websites
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(site.url)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(proxyUrl, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        status: response.ok ? "online" : "offline",
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "offline",
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : t("siteMonitor.unknownError"),
      };
    }
  };

  const checkAllSites = useCallback(async () => {
    if (monitoredSites.length === 0) return;

    setIsChecking(true);

    // Set all to checking
    const checkingStatuses: Record<string, SiteStatus> = {};
    monitoredSites.forEach((site) => {
      checkingStatuses[site.id] = {
        status: "checking",
        lastChecked: new Date().toISOString(),
      };
    });
    setStatuses(checkingStatuses);

    // Check all sites in parallel
    const results = await Promise.all(
      monitoredSites.map(async (site) => {
        const status = await checkSite(site);
        return { id: site.id, status };
      })
    );

    const newStatuses: Record<string, SiteStatus> = {};
    results.forEach(({ id, status }) => {
      newStatuses[id] = status;
    });

    setStatuses(newStatuses);
    setIsChecking(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- checkSite is a plain function; its only external dep (t) is stable
  }, [monitoredSites]);

  // Check on mount and when sites change
  useEffect(() => {
    if (monitoredSites.length > 0) {
      const frame = requestAnimationFrame(() => {
        checkAllSites();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [monitoredSites.length, checkAllSites]);

  const addSite = () => {
    if (!newSite.url.trim()) return;

    const normalizedUrl = ensureProtocol(newSite.url.trim());

    // Check for duplicates
    const isDuplicate = monitoredSites.some((site) => site.url === normalizedUrl);
    if (isDuplicate) {
      toast.error(t("siteMonitor.alreadyMonitored"));
      return;
    }

    const site: MonitoredSite = {
      id: crypto.randomUUID(),
      url: normalizedUrl,
      name: newSite.name.trim() || extractHostname(normalizedUrl),
      addedAt: new Date().toISOString(),
    };

    saveSites([...monitoredSites, site]);
    setNewSite({ url: "", name: "" });
    setIsAddDialogOpen(false);
    toast.success(t("siteMonitor.siteAdded"));

    // Check the new site immediately
    checkSite(site).then((status) => {
      setStatuses((prev) => ({ ...prev, [site.id]: status }));
    });
  };

  const removeSite = (id: string) => {
    saveSites(monitoredSites.filter((site) => site.id !== id));
    setStatuses((prev) => {
      const newStatuses = { ...prev };
      delete newStatuses[id];
      return newStatuses;
    });
    toast.success(t("siteMonitor.siteRemoved"));
  };

  const getStatusIcon = (status: SiteStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "offline":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "checking":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadgeClass = (status: SiteStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "offline":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      case "checking":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  const getStatusLabel = (status: SiteStatus["status"]) => {
    switch (status) {
      case "online":
        return t("siteMonitor.statusOnline");
      case "offline":
        return t("siteMonitor.statusOffline");
      case "checking":
        return "...";
      default:
        return "?";
    }
  };

  const onlineCount = Object.values(statuses).filter((s) => s.status === "online").length;

  // Add Dialog (shared between empty state and main view)
  const addDialog = (
    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            {t("siteMonitor.addSite")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="site-url">{t("siteMonitor.siteUrl")}</Label>
            <Input
              id="site-url"
              placeholder={t("siteMonitor.urlPlaceholder")}
              value={newSite.url}
              onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && addSite()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="site-name">{t("siteMonitor.siteName")}</Label>
            <Input
              id="site-name"
              placeholder={t("siteMonitor.namePlaceholder")}
              value={newSite.name}
              onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
            {t("siteMonitor.cancel")}
          </Button>
          <Button onClick={addSite} disabled={!newSite.url.trim()}>
            {t("siteMonitor.add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Empty state
  if (monitoredSites.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t("siteMonitor.noSites")}</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            {t("siteMonitor.noSitesDesc")}
          </p>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t("siteMonitor.addSite")}
          </Button>

          {addDialog}
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">
              {onlineCount}/{monitoredSites.length} {t("siteMonitor.online")}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={checkAllSites}
              disabled={isChecking}
              title={t("siteMonitor.checkAll")}
            >
              <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsAddDialogOpen(true)}
              title={t("siteMonitor.addSite")}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Sites list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {monitoredSites.map((site, index) => {
                const status = statuses[site.id];
                return (
                  <motion.div
                    key={site.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="group flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    {getStatusIcon(status?.status || "unknown")}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{site.name}</span>
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground/60 truncate">
                          {extractHostname(site.url)}
                        </span>
                        {status?.responseTime && (
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {status.responseTime}ms
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs capitalize",
                          getStatusBadgeClass(status?.status || "unknown")
                        )}
                      >
                        {getStatusLabel(status?.status || "unknown")}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSite(site.id)}
                        title={t("siteMonitor.remove")}
                      >
                        <X className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Last checked info */}
        {Object.keys(statuses).length > 0 && (
          <div className="mt-2 pt-2 border-t text-center">
            <span className="text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              {t("siteMonitor.lastCheck")}{" "}
              {formatLastChecked(Object.values(statuses)[0]?.lastChecked || new Date().toISOString())}
            </span>
          </div>
        )}

        {addDialog}
      </div>
    </div>
  );
}
