"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Activity,
  Plus,
  Trash2,
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

function formatLastChecked(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);

  if (seconds < 60) return "Hace unos segundos";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Hace ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;

  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SiteStatusMonitorWidget({ widget }: SiteStatusMonitorWidgetProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSite, setNewSite] = useState({ url: "", name: "" });
  const [statuses, setStatuses] = useState<Record<string, SiteStatus>>({});
  const [isChecking, setIsChecking] = useState(false);

  const monitoredSites: MonitoredSite[] = widget.config?.monitoredSites || [];

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
        error: error instanceof Error ? error.message : "Error desconocido",
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
  }, [monitoredSites]);

  // Check on mount and when sites change
  useEffect(() => {
    if (monitoredSites.length > 0) {
      const frame = requestAnimationFrame(() => {
        checkAllSites();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [monitoredSites.length]);

  const addSite = () => {
    if (!newSite.url.trim()) return;

    const normalizedUrl = ensureProtocol(newSite.url.trim());

    // Check for duplicates
    const isDuplicate = monitoredSites.some((site) => site.url === normalizedUrl);
    if (isDuplicate) {
      toast.error("Este sitio ya esta siendo monitoreado");
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
    toast.success("Sitio agregado");

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
    toast.success("Sitio eliminado");
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

  const onlineCount = Object.values(statuses).filter((s) => s.status === "online").length;

  // Empty state
  if (monitoredSites.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
            <Activity className="w-6 h-6 text-green-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Sin sitios monitoreados</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Agrega sitios para monitorear su estado
          </p>
          <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar sitio
          </Button>

          {/* Add Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-500" />
                  Agregar Sitio
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="site-url">URL del sitio</Label>
                  <Input
                    id="site-url"
                    placeholder="ejemplo.com o https://ejemplo.com"
                    value={newSite.url}
                    onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addSite()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="site-name">Nombre (opcional)</Label>
                  <Input
                    id="site-name"
                    placeholder="Mi sitio web"
                    value={newSite.name}
                    onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={addSite} disabled={!newSite.url.trim()}>
                  Agregar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
              {onlineCount}/{monitoredSites.length} online
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={checkAllSites}
              disabled={isChecking}
              title="Verificar todos"
            >
              <RefreshCw className={cn("w-4 h-4", isChecking && "animate-spin")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsAddDialogOpen(true)}
              title="Agregar sitio"
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
                        {status?.status === "online"
                          ? "Online"
                          : status?.status === "offline"
                          ? "Offline"
                          : status?.status === "checking"
                          ? "..."
                          : "?"}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeSite(site.id)}
                        title="Eliminar"
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
              Ultima verificacion:{" "}
              {formatLastChecked(Object.values(statuses)[0]?.lastChecked || new Date().toISOString())}
            </span>
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-500" />
                Agregar Sitio
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="site-url-new">URL del sitio</Label>
                <Input
                  id="site-url-new"
                  placeholder="ejemplo.com o https://ejemplo.com"
                  value={newSite.url}
                  onChange={(e) => setNewSite({ ...newSite, url: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && addSite()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="site-name-new">Nombre (opcional)</Label>
                <Input
                  id="site-name-new"
                  placeholder="Mi sitio web"
                  value={newSite.name}
                  onChange={(e) => setNewSite({ ...newSite, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={addSite} disabled={!newSite.url.trim()}>
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
