"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Code, RefreshCw, ExternalLink, Heart, MessageCircle, Clock, Plus, X, AlertCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface DevToFeedWidgetProps {
  widget: Widget;
}

interface DevToArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  coverImage?: string;
  socialImage?: string;
  publishedAt: string;
  readingTimeMinutes: number;
  positiveReactionsCount: number;
  commentsCount: number;
  user: {
    name: string;
    username: string;
    profileImage: string;
  };
  tags: string[];
}

interface DevToConfig {
  devToTags?: string[];
  devToMaxItems?: number;
  devToRefreshInterval?: number;
}

interface DevToApiArticle {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image?: string;
  social_image?: string;
  published_at: string;
  reading_time_minutes: number;
  positive_reactions_count: number;
  comments_count: number;
  user: {
    name: string;
    username: string;
    profile_image: string;
  };
  tag_list: string[];
}

const ITEMS_PER_PAGE = 8;

export function DevToFeedWidget({ widget }: DevToFeedWidgetProps) {
  const config = (widget.config as unknown as DevToConfig) || {};
  const tags = config.devToTags || [];
  const maxItems = config.devToMaxItems || 20;

  const [articles, setArticles] = useState<DevToArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // Paginated articles
  const visibleArticles = useMemo(() => {
    return articles.slice(0, visibleCount);
  }, [articles, visibleCount]);

  const hasMore = visibleCount < articles.length;
  const canCollapse = visibleCount > ITEMS_PER_PAGE;

  // Fetch articles from DEV.to API
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let allArticles: DevToArticle[] = [];

      if (tags.length === 0) {
        // Fetch general articles if no tags specified
        const response = await fetch(
          `https://dev.to/api/articles?per_page=${maxItems}&top=7`
        );

        if (!response.ok) {
          throw new Error("Error al obtener articulos");
        }

        const data: DevToApiArticle[] = await response.json();
        allArticles = data.map((article) => ({
          id: article.id,
          title: article.title,
          description: article.description,
          url: article.url,
          coverImage: article.cover_image,
          socialImage: article.social_image,
          publishedAt: article.published_at,
          readingTimeMinutes: article.reading_time_minutes,
          positiveReactionsCount: article.positive_reactions_count,
          commentsCount: article.comments_count,
          user: {
            name: article.user.name,
            username: article.user.username,
            profileImage: article.user.profile_image,
          },
          tags: article.tag_list,
        }));
      } else {
        // Fetch articles for each tag
        for (const tag of tags) {
          try {
            const response = await fetch(
              `https://dev.to/api/articles?tag=${tag}&per_page=${Math.ceil(maxItems / tags.length)}`
            );

            if (!response.ok) continue;

            const data: DevToApiArticle[] = await response.json();
            const tagArticles = data.map((article) => ({
              id: article.id,
              title: article.title,
              description: article.description,
              url: article.url,
              coverImage: article.cover_image,
              socialImage: article.social_image,
              publishedAt: article.published_at,
              readingTimeMinutes: article.reading_time_minutes,
              positiveReactionsCount: article.positive_reactions_count,
              commentsCount: article.comments_count,
              user: {
                name: article.user.name,
                username: article.user.username,
                profileImage: article.user.profile_image,
              },
              tags: article.tag_list,
            }));

            allArticles.push(...tagArticles);
          } catch (err) {
            console.error(`Error fetching tag ${tag}:`, err);
          }
        }
      }

      // Remove duplicates by ID and sort by reactions
      const uniqueArticles = Array.from(
        new Map(allArticles.map((a) => [a.id, a])).values()
      ).sort((a, b) => b.positiveReactionsCount - a.positiveReactionsCount);

      setArticles(uniqueArticles.slice(0, maxItems));
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Error al cargar articulos de DEV.to");
      console.error("DEV.to fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [tags, maxItems]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // Add tag
  const handleAddTag = useCallback(() => {
    if (!newTag.trim()) return;

    const cleanTag = newTag.trim().toLowerCase().replace(/^#/, "");
    if (tags.includes(cleanTag)) return;

    const updatedConfig: DevToConfig = {
      ...config,
      devToTags: [...tags, cleanTag],
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
    setNewTag("");
    setIsAddingTag(false);
  }, [newTag, tags, config, widget.id]);

  // Remove tag
  const handleRemoveTag = useCallback((tag: string) => {
    const updatedConfig: DevToConfig = {
      ...config,
      devToTags: tags.filter((t) => t !== tag),
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
  }, [tags, config, widget.id]);

  // Show more articles
  const handleShowMore = () => {
    setVisibleCount((prev) => Math.min(prev + ITEMS_PER_PAGE, articles.length));
  };

  // Collapse to initial view
  const handleCollapse = () => {
    setVisibleCount(ITEMS_PER_PAGE);
  };

  // Format relative time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `hace ${days}d`;
    if (hours > 0) return `hace ${hours}h`;
    return "hace poco";
  };

  return (
    <div className="flex h-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black dark:bg-white">
            <Code className="h-4 w-4 text-white dark:text-black" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">DEV.to</h3>
            <p className="text-xs text-muted-foreground">
              {tags.length > 0 ? tags.map((t) => `#${t}`).join(", ") : "Articulos populares"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchArticles}
            disabled={loading}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAddingTag(!isAddingTag)}
            className="h-8 w-8"
          >
            {isAddingTag ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Add Tag Form */}
      {isAddingTag && (
        <div className="border-b p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Filtrar por tag (ej: javascript, react)"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
              className="flex-1"
            />
            <Button onClick={handleAddTag} size="sm">
              Agregar
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          <div className="mt-2 text-xs text-muted-foreground">
            <p>Tags populares:</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {["javascript", "react", "webdev", "typescript", "nextjs"].map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="cursor-pointer text-[10px] hover:bg-accent"
                  onClick={() => {
                    setNewTag(t);
                  }}
                >
                  #{t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h4 className="font-medium">Error</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchArticles} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : loading && articles.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando articulos...</p>
            </div>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/10 dark:bg-white/10">
              <Code className="h-8 w-8" />
            </div>
            <div>
              <h4 className="font-medium">Sin articulos</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                No se encontraron articulos para los tags seleccionados
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-3">
              {visibleArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-accent/50"
                >
                  <div className="flex gap-3">
                    {/* Cover Image */}
                    {(article.coverImage || article.socialImage) && (
                      <div className="hidden h-16 w-20 flex-shrink-0 overflow-hidden rounded @[320px]:block">
                        <img
                          src={article.coverImage || article.socialImage}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Title */}
                      <h4 className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-primary">
                        {article.title}
                      </h4>

                      {/* Description */}
                      {article.description && (
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground hidden @[280px]:block">
                          {article.description}
                        </p>
                      )}

                      {/* Meta */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {/* Author */}
                        <div className="flex items-center gap-1">
                          <img
                            src={article.user.profileImage}
                            alt=""
                            className="h-4 w-4 rounded-full"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                          <span className="hidden @[200px]:inline">{article.user.name}</span>
                        </div>

                        <span className="flex items-center gap-0.5">
                          <Heart className="h-3 w-3" />
                          {article.positiveReactionsCount}
                        </span>

                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" />
                          {article.commentsCount}
                        </span>

                        <span className="hidden @[200px]:flex items-center gap-0.5">
                          <Clock className="h-3 w-3" />
                          {article.readingTimeMinutes} min
                        </span>

                        <span className="hidden @[280px]:inline">{formatTime(article.publishedAt)}</span>
                      </div>

                      {/* Tags */}
                      <div className="mt-1.5 hidden flex-wrap gap-1 @[200px]:flex">
                        {article.tags.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* External link */}
                    <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </a>
              ))}

              {/* Pagination Controls */}
              {(hasMore || canCollapse) && (
                <div className="flex items-center justify-center gap-2 pt-2 pb-1">
                  {hasMore && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowMore}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                      Ver mas ({articles.length - visibleCount} restantes)
                    </Button>
                  )}
                  {canCollapse && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCollapse}
                      className="h-8 gap-1 text-xs"
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
      {lastFetch && articles.length > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
          <span>{visibleCount} de {articles.length} articulos</span>
          <a
            href="https://dev.to"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-primary"
          >
            <ExternalLink className="h-3 w-3" />
            dev.to
          </a>
        </div>
      )}
    </div>
  );
}
