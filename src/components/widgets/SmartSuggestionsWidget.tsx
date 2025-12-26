"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Wand2,
  RefreshCw,
  ExternalLink,
  Star,
  Clock,
  Sparkles,
  History,
  Shuffle,
  Heart,
  Folder,
  Tag as TagIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";

interface SmartSuggestionsWidgetProps {
  widget: Widget;
}

interface SuggestedLink {
  link: Link;
  reason: string;
  score: number;
}

interface SmartSuggestionsWidgetConfig {
  lastSuggestions?: string[]; // IDs of last suggested links
  lastRefreshDate?: string;
  viewMode?: "smart" | "rediscover" | "favorites";
}

// Simple seeded pseudo-random generator for deterministic shuffling
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function shuffleArraySeeded<T>(array: T[], seed: number): T[] {
  const shuffled = [...array];
  const random = seededRandom(seed);
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDaysSince(date: Date | string): number {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dateObj.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function SmartSuggestionsWidget({ widget }: SmartSuggestionsWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const config = widget.config as SmartSuggestionsWidgetConfig | undefined;
  const viewMode = config?.viewMode || "smart";
  const { links, categories, getTagsForLink } = useLinksStore();

  const updateConfig = useCallback(
    (updates: Partial<SmartSuggestionsWidgetConfig>) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          ...updates,
        } as Record<string, unknown>,
      });
    },
    [widget.id, widget.config]
  );

  // Generate smart suggestions
  const suggestions = useMemo((): SuggestedLink[] => {
    if (links.length === 0) return [];

    const result: SuggestedLink[] = [];
    const lastSuggested = new Set(config?.lastSuggestions || []);

    // Use refreshKey as seed for deterministic randomness during render
    const random = seededRandom(refreshKey + 1);

    if (viewMode === "favorites") {
      // Show random favorites
      const favorites = links.filter((link) => link.isFavorite);
      const shuffled = shuffleArraySeeded(favorites, refreshKey).slice(0, 5);
      shuffled.forEach((link) => {
        result.push({
          link,
          reason: "Uno de tus favoritos",
          score: 100,
        });
      });
    } else if (viewMode === "rediscover") {
      // Find old links that haven't been suggested recently
      const oldLinks = links
        .filter((link) => getDaysSince(link.createdAt) > 30)
        .filter((link) => !lastSuggested.has(link.id));

      const shuffled = shuffleArraySeeded(oldLinks, refreshKey).slice(0, 5);
      shuffled.forEach((link) => {
        const days = getDaysSince(link.createdAt);
        result.push({
          link,
          reason: `Guardado hace ${days} dias`,
          score: days,
        });
      });
    } else {
      // Smart suggestions based on multiple factors
      const scored: SuggestedLink[] = [];

      // Calculate category popularity
      const categoryCount: Record<string, number> = {};
      links.forEach((link) => {
        if (link.categoryId) {
          categoryCount[link.categoryId] = (categoryCount[link.categoryId] || 0) + 1;
        }
      });

      links.forEach((link) => {
        // Skip recently suggested
        if (lastSuggested.has(link.id)) return;

        let score = 0;
        let reason = "";

        // Favor links from popular categories
        if (link.categoryId && categoryCount[link.categoryId]) {
          const categoryPopularity = categoryCount[link.categoryId] / links.length;
          if (categoryPopularity > 0.2) {
            score += 30;
            const category = categories.find((c) => c.id === link.categoryId);
            if (category) {
              reason = `De tu categoria favorita: ${category.name}`;
            }
          }
        }

        // Favorites get higher priority
        if (link.isFavorite) {
          score += 40;
          if (!reason) reason = "Uno de tus favoritos";
        }

        // Recent links get some priority
        const daysSinceCreated = getDaysSince(link.createdAt);
        if (daysSinceCreated < 7) {
          score += 20;
          if (!reason) reason = "Guardado recientemente";
        }

        // Links with platform detection are interesting
        if (link.platform) {
          score += 10;
          if (!reason) reason = `Contenido de ${link.platform}`;
        }

        // Links with images are more engaging
        if (link.imageUrl) {
          score += 5;
        }

        // Add some deterministic randomness based on refreshKey
        score += random() * 20;

        if (!reason) reason = "Puede interesarte";

        scored.push({ link, reason, score });
      });

      // Sort by score and take top 5
      scored.sort((a, b) => b.score - a.score);
      result.push(...scored.slice(0, 5));
    }

    return result;
  }, [links, categories, config?.lastSuggestions, viewMode, refreshKey]);

  // Save last suggestions
  useEffect(() => {
    if (suggestions.length > 0) {
      const suggestionIds = suggestions.map((s) => s.link.id);
      updateConfig({
        lastSuggestions: suggestionIds,
        lastRefreshDate: new Date().toISOString(),
      });
    }
  }, [suggestions.length]); // Intentionally minimal deps to avoid loops

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleViewModeChange = (mode: string) => {
    updateConfig({ viewMode: mode as SmartSuggestionsWidgetConfig["viewMode"] });
    setRefreshKey((k) => k + 1);
  };

  const handleOpenLink = (url: string) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Empty state
  if (links.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center mb-3 @md:w-14 @md:h-14">
            <Wand2 className="w-6 h-6 text-white @md:w-7 @md:h-7" />
          </div>
          <p className="text-sm font-medium mb-1 @md:text-base">Sin sugerencias</p>
          <p className="text-xs text-muted-foreground max-w-[200px] @md:text-sm">
            Agrega algunos enlaces para recibir recomendaciones inteligentes
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b @sm:px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center @sm:w-7 @sm:h-7">
              <Wand2 className="w-3.5 h-3.5 text-white @sm:w-4 @sm:h-4" />
            </div>
            <span className="text-xs font-medium @sm:text-sm">Sugerencias</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Nuevas sugerencias"
          >
            <Shuffle
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>

        {/* View Mode Tabs */}
        <div className="px-3 py-2 border-b @sm:px-4">
          <Tabs value={viewMode} onValueChange={handleViewModeChange}>
            <TabsList className="w-full h-8 grid grid-cols-3">
              <TabsTrigger value="smart" className="text-xs h-7 gap-1">
                <Sparkles className="w-3 h-3" />
                <span className="hidden @sm:inline">Inteligente</span>
              </TabsTrigger>
              <TabsTrigger value="rediscover" className="text-xs h-7 gap-1">
                <History className="w-3 h-3" />
                <span className="hidden @sm:inline">Redescubrir</span>
              </TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs h-7 gap-1">
                <Heart className="w-3 h-3" />
                <span className="hidden @sm:inline">Favoritos</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Suggestions List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2 @sm:p-4 @sm:space-y-3">
            <AnimatePresence mode="popLayout">
              {suggestions.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-8 text-muted-foreground"
                >
                  <RefreshCw className="w-8 h-8 mb-2 opacity-50" />
                  <p className="text-sm">No hay sugerencias</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={handleRefresh}
                  >
                    Refrescar
                  </Button>
                </motion.div>
              ) : (
                suggestions.map((suggestion, index) => {
                  const { link, reason } = suggestion;
                  const category = categories.find((c) => c.id === link.categoryId);
                  const linkTags = getTagsForLink(link.id);

                  return (
                    <motion.div
                      key={link.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      <button
                        onClick={() => handleOpenLink(link.url)}
                        className="w-full text-left p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex gap-3">
                          {/* Favicon/Image */}
                          <div className="flex-shrink-0">
                            {link.imageUrl ? (
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-muted @sm:w-12 @sm:h-12">
                                <img
                                  src={link.imageUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                            ) : link.faviconUrl ? (
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center @sm:w-12 @sm:h-12">
                                <img
                                  src={link.faviconUrl}
                                  alt=""
                                  className="w-5 h-5 @sm:w-6 @sm:h-6"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center @sm:w-12 @sm:h-12">
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className="text-xs font-medium truncate @sm:text-sm">
                                {link.title || new URL(link.url).hostname}
                              </h4>
                              {link.isFavorite && (
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                              )}
                            </div>

                            {link.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 @sm:text-xs">
                                {link.description}
                              </p>
                            )}

                            {/* Reason */}
                            <div className="flex items-center gap-1.5 text-[10px] text-primary @sm:text-xs">
                              <Sparkles className="w-3 h-3" />
                              <span>{reason}</span>
                            </div>

                            {/* Category and Tags */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                              {category && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] h-4 gap-1 px-1.5"
                                  style={{
                                    borderColor: category.color || undefined,
                                    color: category.color || undefined,
                                  }}
                                >
                                  <Folder className="w-2.5 h-2.5" />
                                  {category.name}
                                </Badge>
                              )}
                              {linkTags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag.id}
                                  variant="outline"
                                  className="text-[10px] h-4 gap-1 px-1.5 bg-muted"
                                >
                                  <TagIcon className="w-2.5 h-2.5" />
                                  {tag.name}
                                </Badge>
                              ))}
                              {linkTags.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{linkTags.length - 2}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* External Link Icon */}
                          <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-3 py-2 @sm:px-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground @sm:text-xs">
            <span>
              {suggestions.length} de {links.length} enlaces
            </span>
            <Badge variant="outline" className="text-[10px] h-5">
              IA Simulada
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
