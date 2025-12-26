"use client";

import { useState, useEffect, useCallback } from "react";
import { Newspaper, RefreshCw, ExternalLink, ArrowUp, MessageCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface HackerNewsWidgetProps {
  widget: Widget;
}

interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  by: string;
  time: number;
  descendants: number;
}

interface HNConfig {
  hnMaxItems?: number;
  hnRefreshInterval?: number;
  hnStoryType?: "top" | "new" | "best" | "ask" | "show";
}

const STORY_TYPES = {
  top: "Top Stories",
  new: "New Stories",
  best: "Best Stories",
  ask: "Ask HN",
  show: "Show HN",
};

export function HackerNewsWidget({ widget }: HackerNewsWidgetProps) {
  const config = (widget.config as unknown as HNConfig) || {};
  const maxItems = config.hnMaxItems || 15;
  const storyType = config.hnStoryType || "top";

  const [stories, setStories] = useState<HNStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Fetch stories from HN API
  const fetchStories = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get story IDs
      const idsResponse = await fetch(
        `https://hacker-news.firebaseio.com/v0/${storyType}stories.json`
      );

      if (!idsResponse.ok) {
        throw new Error("Error al obtener IDs de historias");
      }

      const storyIds: number[] = await idsResponse.json();
      const topIds = storyIds.slice(0, maxItems);

      // Fetch story details in parallel
      const storyPromises = topIds.map(async (id) => {
        const response = await fetch(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`
        );
        return response.json();
      });

      const fetchedStories = await Promise.all(storyPromises);
      const validStories = fetchedStories.filter(
        (story): story is HNStory => story && story.title
      );

      setStories(validStories);
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Error al cargar historias de Hacker News");
      console.error("HN fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [maxItems, storyType]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  // Change story type
  const handleChangeStoryType = useCallback(
    (type: "top" | "new" | "best" | "ask" | "show") => {
      const updatedConfig: HNConfig = {
        ...config,
        hnStoryType: type,
      };
      useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
    },
    [config, widget.id]
  );

  // Format relative time
  const formatTime = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days}d`;
    if (hours > 0) return `hace ${hours}h`;
    return `hace ${Math.floor(diff / 60)}m`;
  };

  // Get domain from URL
  const getDomain = (url?: string): string => {
    if (!url) return "news.ycombinator.com";
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return "news.ycombinator.com";
    }
  };

  return (
    <div className="flex h-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6600]/10">
            <Newspaper className="h-4 w-4 text-[#FF6600]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Hacker News</h3>
            <p className="text-xs text-muted-foreground">{STORY_TYPES[storyType]}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchStories}
          disabled={loading}
          className="h-8 w-8"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Story Type Tabs */}
      <div className="flex gap-1 border-b px-3 py-2 overflow-x-auto">
        {(Object.keys(STORY_TYPES) as Array<keyof typeof STORY_TYPES>).map((type) => (
          <Button
            key={type}
            variant={storyType === type ? "secondary" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => handleChangeStoryType(type)}
          >
            {type === "top" ? "Top" : type === "new" ? "Nuevo" : type === "best" ? "Mejor" : type === "ask" ? "Ask" : "Show"}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h4 className="font-medium">Error</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchStories} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : loading && stories.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando historias...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-3">
              {stories.map((story, index) => (
                <div
                  key={story.id}
                  className="group rounded-lg border bg-card p-3 transition-colors hover:border-[#FF6600]/50 hover:bg-accent/50"
                >
                  <div className="flex gap-3">
                    {/* Rank */}
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#FF6600]/10 text-sm font-semibold text-[#FF6600]">
                      {index + 1}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <a
                        href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="line-clamp-2 text-sm font-medium leading-tight hover:text-[#FF6600]"
                      >
                        {story.title}
                      </a>

                      {/* Domain */}
                      <p className="mt-0.5 text-xs text-muted-foreground/70">
                        ({getDomain(story.url)})
                      </p>

                      {/* Meta */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-[#FF6600]">
                          <ArrowUp className="h-3 w-3" />
                          {story.score}
                        </span>
                        <span>by {story.by}</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(story.time)}
                        </span>
                        <a
                          href={`https://news.ycombinator.com/item?id=${story.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-0.5 hover:text-[#FF6600]"
                        >
                          <MessageCircle className="h-3 w-3" />
                          {story.descendants || 0}
                        </a>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={story.url || `https://news.ycombinator.com/item?id=${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                        title="Ver enlace"
                      >
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </a>
                      <a
                        href={`https://news.ycombinator.com/item?id=${story.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent"
                        title="Ver comentarios"
                      >
                        <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {lastFetch && stories.length > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{stories.length} historias</span>
          <a
            href="https://news.ycombinator.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-[#FF6600]"
          >
            <ExternalLink className="h-3 w-3" />
            news.ycombinator.com
          </a>
        </div>
      )}
    </div>
  );
}
