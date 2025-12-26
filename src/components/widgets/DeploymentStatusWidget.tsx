"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Rocket,
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  ExternalLink,
  RefreshCw,
  Settings,
  GitBranch,
  GitCommit,
  LogOut,
  AlertCircle,
  Triangle,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget, DeploymentProvider, DeploymentState, Deployment } from "@/types/widget";
import { cn } from "@/lib/utils";

interface DeploymentStatusWidgetProps {
  widget: Widget;
}

// Mock deployments for demo (in production, these would come from the API)
const MOCK_DEPLOYMENTS: Deployment[] = [
  {
    id: "dpl_1",
    projectId: "prj_1",
    projectName: "my-portfolio",
    url: "https://my-portfolio.vercel.app",
    state: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    readyAt: new Date(Date.now() - 1000 * 60 * 28).toISOString(),
    branch: "main",
    commitMessage: "Update hero section",
    commitRef: "abc123",
    duration: 120,
    provider: "vercel",
  },
  {
    id: "dpl_2",
    projectId: "prj_2",
    projectName: "blog-nextjs",
    url: "https://blog-nextjs.vercel.app",
    state: "building",
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    branch: "feature/dark-mode",
    commitMessage: "Add dark mode toggle",
    commitRef: "def456",
    provider: "vercel",
  },
  {
    id: "dpl_3",
    projectId: "prj_3",
    projectName: "api-backend",
    url: "https://api-backend.netlify.app",
    state: "error",
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    branch: "main",
    commitMessage: "Fix authentication bug",
    commitRef: "ghi789",
    duration: 45,
    provider: "netlify",
  },
  {
    id: "dpl_4",
    projectId: "prj_1",
    projectName: "my-portfolio",
    url: "https://my-portfolio-abc123.vercel.app",
    state: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    readyAt: new Date(Date.now() - 1000 * 60 * 60 * 2 + 90000).toISOString(),
    branch: "main",
    commitMessage: "Add contact form",
    commitRef: "jkl012",
    duration: 90,
    provider: "vercel",
  },
  {
    id: "dpl_5",
    projectId: "prj_4",
    projectName: "landing-page",
    url: "https://landing-page.netlify.app",
    state: "ready",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    readyAt: new Date(Date.now() - 1000 * 60 * 60 * 24 + 60000).toISOString(),
    branch: "main",
    commitMessage: "Initial deployment",
    commitRef: "mno345",
    duration: 60,
    provider: "netlify",
  },
];

const STATE_CONFIG: Record<DeploymentState, { icon: typeof CheckCircle; color: string; label: string }> = {
  ready: { icon: CheckCircle, color: "text-green-500", label: "Listo" },
  building: { icon: Loader2, color: "text-yellow-500", label: "Construyendo" },
  error: { icon: XCircle, color: "text-red-500", label: "Error" },
  queued: { icon: Clock, color: "text-blue-500", label: "En cola" },
  canceled: { icon: AlertCircle, color: "text-muted-foreground", label: "Cancelado" },
};

const PROVIDER_CONFIG: Record<DeploymentProvider, { icon: typeof Triangle; color: string; label: string }> = {
  vercel: { icon: Triangle, color: "text-foreground", label: "Vercel" },
  netlify: { icon: Circle, color: "text-teal-500", label: "Netlify" },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "ahora mismo";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  return `hace ${diffDays}d`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function DeploymentStatusWidget({ widget }: DeploymentStatusWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = widget.config || {};

  const provider = config.deployProvider as DeploymentProvider | undefined;
  const connected = config.deployConnected ?? false;
  const maxItems = config.deployMaxItems ?? 10;
  const autoRefresh = config.deployAutoRefresh ?? true;
  const refreshInterval = config.deployRefreshInterval ?? 60;

  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Simulate fetching deployments
  const fetchDeployments = useCallback(async () => {
    if (!connected) return;

    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Filter by provider if selected
      let filtered = [...MOCK_DEPLOYMENTS];
      if (provider) {
        filtered = filtered.filter(d => d.provider === provider);
      }

      // Limit results
      filtered = filtered.slice(0, maxItems);

      setDeployments(filtered);
      setLastRefresh(new Date());
    } catch (error) {
      console.error("Error fetching deployments:", error);
    } finally {
      setIsLoading(false);
    }
  }, [connected, provider, maxItems]);

  // Auto-refresh
  useEffect(() => {
    if (connected && autoRefresh) {
      fetchDeployments();
      const interval = setInterval(fetchDeployments, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [connected, autoRefresh, refreshInterval, fetchDeployments]);

  // Initial fetch when connected
  useEffect(() => {
    if (connected) {
      fetchDeployments();
    }
  }, [connected, fetchDeployments]);

  const handleConnect = async (selectedProvider: DeploymentProvider) => {
    setIsConnecting(true);
    try {
      // In production, this would redirect to OAuth flow
      // For now, we'll simulate a successful connection
      await new Promise(resolve => setTimeout(resolve, 1000));

      await updateWidget(widget.id, {
        config: {
          ...config,
          deployProvider: selectedProvider,
          deployConnected: true,
        } as Record<string, unknown>,
      });
    } catch (error) {
      console.error("Error connecting:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await updateWidget(widget.id, {
      config: {
        ...config,
        deployProvider: undefined,
        deployConnected: false,
        deployProjects: [],
      } as Record<string, unknown>,
    });
    setDeployments([]);
  };

  const handleProviderChange = async (newProvider: DeploymentProvider | "all") => {
    await updateWidget(widget.id, {
      config: {
        ...config,
        deployProvider: newProvider === "all" ? undefined : newProvider,
      } as Record<string, unknown>,
    });
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <span className="font-medium text-sm">{widget.title}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-4">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium mb-1">Conecta tu cuenta</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecta tu cuenta de Vercel o Netlify para ver tus deployments
            </p>
          </div>

          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button
              onClick={() => handleConnect("vercel")}
              disabled={isConnecting}
              className="w-full gap-2"
              variant="outline"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Triangle className="w-4 h-4" />
              )}
              Conectar Vercel
            </Button>
            <Button
              onClick={() => handleConnect("netlify")}
              disabled={isConnecting}
              className="w-full gap-2"
              variant="outline"
            >
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Circle className="w-4 h-4 fill-teal-500 text-teal-500" />
              )}
              Conectar Netlify
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Se abrirá una ventana para autorizar el acceso
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Rocket className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">{widget.title}</span>
          {lastRefresh && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(lastRefresh.toISOString())}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Select
            value={provider || "all"}
            onValueChange={(value) => handleProviderChange(value as DeploymentProvider | "all")}
          >
            <SelectTrigger className="h-7 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="vercel">
                <span className="flex items-center gap-1.5">
                  <Triangle className="w-3 h-3" />
                  Vercel
                </span>
              </SelectItem>
              <SelectItem value="netlify">
                <span className="flex items-center gap-1.5">
                  <Circle className="w-3 h-3 fill-teal-500 text-teal-500" />
                  Netlify
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchDeployments}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Desconectar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && deployments.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Deployments list */}
      {deployments.length > 0 && (
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-2">
            {deployments.map((deployment) => {
              const stateConfig = STATE_CONFIG[deployment.state];
              const providerConfig = PROVIDER_CONFIG[deployment.provider];
              const StateIcon = stateConfig.icon;
              const ProviderIcon = providerConfig.icon;

              return (
                <div
                  key={deployment.id}
                  className="p-3 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <ProviderIcon
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          deployment.provider === "netlify" && "fill-current"
                        )}
                        style={{ color: deployment.provider === "netlify" ? "#00AD9F" : undefined }}
                      />
                      <span className="font-medium text-sm truncate">
                        {deployment.projectName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <StateIcon
                        className={cn(
                          "w-4 h-4",
                          stateConfig.color,
                          deployment.state === "building" && "animate-spin"
                        )}
                      />
                      <span className={cn("text-xs font-medium", stateConfig.color)}>
                        {stateConfig.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                    {deployment.branch && (
                      <span className="flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {deployment.branch}
                      </span>
                    )}
                    {deployment.commitRef && (
                      <span className="flex items-center gap-1">
                        <GitCommit className="w-3 h-3" />
                        {deployment.commitRef.slice(0, 7)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(deployment.createdAt)}
                    </span>
                    {deployment.duration && (
                      <span>{formatDuration(deployment.duration)}</span>
                    )}
                  </div>

                  {deployment.commitMessage && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {deployment.commitMessage}
                    </p>
                  )}

                  {deployment.state === "ready" && deployment.url && (
                    <a
                      href={deployment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver deployment
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Empty state */}
      {!isLoading && deployments.length === 0 && connected && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Rocket className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No hay deployments recientes
          </p>
        </div>
      )}
    </div>
  );
}
