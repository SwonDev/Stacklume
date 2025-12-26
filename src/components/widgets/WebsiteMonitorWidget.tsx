"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Globe,
  Settings,
  Plus,
  X,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  ExternalLink,
  Bookmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { ensureProtocol, extractHostname as extractHostnameUtil } from "@/lib/url-utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface WebsiteMonitorWidgetProps {
  widget: Widget;
}

interface WebsiteInfo {
  id: string;
  url: string;
  name?: string;
}

interface WebsiteStatus {
  id: string;
  status: "online" | "offline" | "checking" | "error";
  responseTime?: number;
  lastChecked: Date;
  error?: string;
}

interface WebsiteMonitorConfig {
  websites?: WebsiteInfo[];
  refreshInterval?: number; // in seconds
}

// Use shared utilities
const normalizeUrl = ensureProtocol;

function extractHostname(url: string): string {
  return extractHostnameUtil(ensureProtocol(url));
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function WebsiteMonitorWidget({ widget }: WebsiteMonitorWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const { openAddLinkModal } = useLinksStore();
  const hasInitialCheck = useRef(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, WebsiteStatus>>({});
  const [isChecking, setIsChecking] = useState(false);

  const [newWebsite, setNewWebsite] = useState({ url: "", name: "" });

  const handleSaveAsLink = (website: WebsiteInfo) => {
    openAddLinkModal({
      url: website.url,
      title: website.name || extractHostname(website.url),
      description: `Sitio web monitoreado`,
    });
    toast.success("Abriendo formulario para guardar enlace");
  };

  const config = widget.config as WebsiteMonitorConfig | undefined;
  const websites = useMemo(() => config?.websites || [], [config?.websites]);
  const refreshInterval = config?.refreshInterval || 60;

  const checkWebsite = useCallback(async (website: WebsiteInfo): Promise<WebsiteStatus> => {
    const startTime = Date.now();

    try {
      // Using a CORS proxy to check websites
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(normalizeUrl(website.url))}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(proxyUrl, {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseTime = Date.now() - startTime;

      return {
        id: website.id,
        status: response.ok ? "online" : "error",
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        id: website.id,
        status: "offline",
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }, []);

  const checkAllWebsites = useCallback(async () => {
    if (websites.length === 0) return;

    setIsChecking(true);

    // Set all to checking
    const checkingStatuses: Record<string, WebsiteStatus> = {};
    websites.forEach((site) => {
      checkingStatuses[site.id] = {
        id: site.id,
        status: "checking",
        lastChecked: new Date(),
      };
    });
    setStatuses(checkingStatuses);

    // Check all websites in parallel
    const results = await Promise.all(websites.map(checkWebsite));

    const newStatuses: Record<string, WebsiteStatus> = {};
    results.forEach((result) => {
      newStatuses[result.id] = result;
    });

    setStatuses(newStatuses);
    setIsChecking(false);
  }, [websites, checkWebsite]);

  // Initial check and interval
  useEffect(() => {
    // Use ref to ensure we only do initial check once and avoid cascading renders
    if (!hasInitialCheck.current && websites.length > 0) {
      hasInitialCheck.current = true;
      // Defer initial check to avoid synchronous setState during render
      const timeout = setTimeout(() => {
        checkAllWebsites();
      }, 0);
      return () => clearTimeout(timeout);
    }

    // Set up interval for subsequent checks
    const interval = setInterval(checkAllWebsites, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [checkAllWebsites, refreshInterval, websites.length]);

  const addWebsite = () => {
    if (!newWebsite.url.trim()) return;

    const website: WebsiteInfo = {
      id: generateId(),
      url: normalizeUrl(newWebsite.url.trim()),
      name: newWebsite.name.trim() || undefined,
    };

    updateWidget(widget.id, {
      config: {
        ...widget.config,
        websites: [...websites, website],
      },
    });

    setNewWebsite({ url: "", name: "" });
    setIsAddDialogOpen(false);
  };

  const removeWebsite = (websiteId: string) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        websites: websites.filter((w) => w.id !== websiteId),
      },
    });
  };

  const getStatusIcon = (status: WebsiteStatus["status"]) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "offline":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "checking":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "error":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: WebsiteStatus["status"]) => {
    switch (status) {
      case "online":
        return "bg-green-500/20 text-green-600 border-green-500/30";
      case "offline":
        return "bg-red-500/20 text-red-600 border-red-500/30";
      case "checking":
        return "bg-blue-500/20 text-blue-600 border-blue-500/30";
      case "error":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/30";
      default:
        return "bg-secondary text-muted-foreground";
    }
  };

  // Empty state
  if (websites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mb-3">
          <Globe className="w-6 h-6 text-green-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No hay sitios monitoreados</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Agrega sitios web para monitorear su estado
        </p>
        <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Agregar sitio
        </Button>

        {/* Add Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-md glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-500" />
                Agregar Sitio Web
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="website-url">URL del sitio</Label>
                <Input
                  id="website-url"
                  placeholder="ejemplo.com o https://ejemplo.com"
                  value={newWebsite.url}
                  onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website-name">Nombre (opcional)</Label>
                <Input
                  id="website-name"
                  placeholder="Mi sitio web"
                  value={newWebsite.name}
                  onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={addWebsite} disabled={!newWebsite.url.trim()}>
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {websites.length} sitio{websites.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={checkAllWebsites}
            disabled={isChecking}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isChecking && "animate-spin")} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsAddDialogOpen(true)}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setIsSettingsOpen(true)}
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Website list */}
      <div className="flex-1 space-y-1 overflow-auto">
        <AnimatePresence>
          {websites.map((website, index) => {
            const status = statuses[website.id];
            return (
              <motion.div
                key={website.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
              >
                {getStatusIcon(status?.status || "checking")}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {website.name || extractHostname(website.url)}
                    </span>
                    <a
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ExternalLink className="w-3 h-3 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground truncate">
                      {extractHostname(website.url)}
                    </span>
                    {status?.responseTime && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {status.responseTime}ms
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn("text-xs capitalize", getStatusColor(status?.status || "checking"))}
                >
                  {status?.status || "..."}
                </Badge>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => handleSaveAsLink(website)}
                    title="Guardar como enlace"
                  >
                    <Bookmark className="w-3 h-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => removeWebsite(website.id)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-500" />
              Agregar Sitio Web
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="website-url-new">URL del sitio</Label>
              <Input
                id="website-url-new"
                placeholder="ejemplo.com o https://ejemplo.com"
                value={newWebsite.url}
                onChange={(e) => setNewWebsite({ ...newWebsite, url: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website-name-new">Nombre (opcional)</Label>
              <Input
                id="website-name-new"
                placeholder="Mi sitio web"
                value={newWebsite.name}
                onChange={(e) => setNewWebsite({ ...newWebsite, name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={addWebsite} disabled={!newWebsite.url.trim()}>
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Configuracion
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="refresh-interval">Intervalo de actualizacion (segundos)</Label>
              <Input
                id="refresh-interval"
                type="number"
                min="30"
                max="300"
                value={refreshInterval}
                onChange={(e) => {
                  updateWidget(widget.id, {
                    config: {
                      ...widget.config,
                      refreshInterval: parseInt(e.target.value) || 60,
                    },
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Minimo 30 segundos, maximo 5 minutos
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsSettingsOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
