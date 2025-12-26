"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Github,
  RefreshCw,
  ExternalLink,
  Plus,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";

interface GitHubTrendingWidgetProps {
  widget: Widget;
}

interface TrendingRepo {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  repoUrl: string;
  repoName: string;
  imageUrl?: string;
}

const ITEMS_PER_PAGE = 10;
const TOTAL_ITEMS = 50;

export function GitHubTrendingWidget({ widget }: GitHubTrendingWidgetProps) {
  const { openAddLinkModal } = useLinksStore();
  const [repos, setRepos] = useState<TrendingRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Always fetch at least 50 items (ignore old saved configs with lower values)
  const maxItems = Math.max(widget.config?.maxItems || TOTAL_ITEMS, TOTAL_ITEMS);

  // Paginated repos
  const visibleRepos = useMemo(() => {
    return repos.slice(0, visibleCount);
  }, [repos, visibleCount]);

  const hasMore = visibleCount < repos.length;
  const canCollapse = visibleCount > ITEMS_PER_PAGE;

  // Fetch from our API route
  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/github-trending?maxItems=${maxItems}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to fetch feed");
      }

      const data: TrendingRepo[] = await response.json();

      if (data.length === 0) {
        throw new Error("No repositories found in feed");
      }

      setRepos(data);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Error al cargar repositorios. Intenta de nuevo.");
      console.error("Feed fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [maxItems]);

  // Auto-fetch on mount and every 30 minutes
  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchFeed]);

  // Format relative date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffHours < 1) return "Hace menos de 1h";
      if (diffHours < 24) return `Hace ${diffHours}h`;
      if (diffDays < 7) return `Hace ${diffDays}d`;
      return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  // Quick add link to Stacklume
  const handleQuickAdd = (repo: TrendingRepo) => {
    // Open add link modal with pre-filled data
    openAddLinkModal({
      url: repo.repoUrl,
      title: repo.title,
      description: repo.description,
    });
  };

  // Show more repos
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, repos.length));
  };

  // Collapse to initial view
  const handleCollapse = () => {
    setVisibleCount(ITEMS_PER_PAGE);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Sparkles className="h-4 w-4 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">GitHub Trending</h3>
            <p className="text-xs text-muted-foreground">by @tom_doerr</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchFeed}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Github className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h4 className="font-medium">Error</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchFeed} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : loading && repos.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando repositorios...</p>
            </div>
          </div>
        ) : repos.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Github className="h-12 w-12 text-muted-foreground/50" />
            <div>
              <h4 className="font-medium">Sin repositorios</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                No se encontraron repositorios en el feed
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-3">
              {visibleRepos.map((repo, index) => (
                <div
                  key={`${repo.link}-${index}`}
                  className="group rounded-lg border bg-card p-3 transition-all hover:border-primary/50 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <div className="flex items-center gap-2">
                        <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <h4 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
                          {repo.title}
                        </h4>
                      </div>

                      {/* Description */}
                      {repo.description && (
                        <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {repo.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(repo.pubDate)}
                        </span>
                        {repo.repoName && (
                          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                            {repo.repoName}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuickAdd(repo)}
                        title="Añadir a Stacklume"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                      </Button>
                      <a
                        href={repo.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent"
                        title="Ver en GitHub"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}

              {/* Pagination Controls */}
              {(hasMore || canCollapse) && (
                <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                  {hasMore && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowMore}
                      className="h-8 text-xs gap-1"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Ver más ({repos.length - visibleCount} restantes)
                    </Button>
                  )}
                  {canCollapse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCollapse}
                      className="h-8 text-xs gap-1"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                      Colapsar
                    </Button>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {lastFetch && repos.length > 0 && (
        <div className="border-t px-4 py-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {visibleCount} de {repos.length} repos
          </span>
          <span>Actualizado: {formatDate(lastFetch.toISOString())}</span>
        </div>
      )}
    </div>
  );
}
