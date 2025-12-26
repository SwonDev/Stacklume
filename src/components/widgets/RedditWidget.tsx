"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageCircle, ArrowUp, ExternalLink, RefreshCw, Plus, X, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface RedditWidgetProps {
  widget: Widget;
}

interface RedditPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  permalink: string;
  thumbnail?: string;
  createdUtc: number;
  isNsfw: boolean;
  flair?: string;
}

interface RedditConfig {
  subreddits?: string[];
  redditMaxItems?: number;
  redditRefreshInterval?: number;
  redditSortBy?: "hot" | "new" | "top" | "rising";
}

export function RedditWidget({ widget }: RedditWidgetProps) {
  const config = (widget.config as unknown as RedditConfig) || {};
  const subreddits = config.subreddits || [];
  const maxItems = config.redditMaxItems || 15;
  const sortBy = config.redditSortBy || "hot";

  const [posts, setPosts] = useState<RedditPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingSubreddit, setIsAddingSubreddit] = useState(false);
  const [newSubreddit, setNewSubreddit] = useState("");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Fetch posts from Reddit JSON API
  const fetchPosts = useCallback(async () => {
    if (subreddits.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const allPosts: RedditPost[] = [];

      for (const subreddit of subreddits) {
        try {
          const response = await fetch(
            `https://www.reddit.com/r/${subreddit}/${sortBy}.json?limit=${Math.ceil(maxItems / subreddits.length)}`,
            {
              headers: {
                "Accept": "application/json",
              },
            }
          );

          if (!response.ok) {
            console.warn(`Error al obtener r/${subreddit}: ${response.status}`);
            continue;
          }

          const data = await response.json();
          const children = data.data?.children || [];

          for (const child of children) {
            const post = child.data;
            allPosts.push({
              id: post.id,
              title: post.title,
              author: post.author,
              subreddit: post.subreddit,
              score: post.score,
              numComments: post.num_comments,
              url: post.url,
              permalink: `https://reddit.com${post.permalink}`,
              thumbnail: post.thumbnail && post.thumbnail.startsWith("http") ? post.thumbnail : undefined,
              createdUtc: post.created_utc,
              isNsfw: post.over_18,
              flair: post.link_flair_text,
            });
          }
        } catch (err) {
          console.error(`Error fetching r/${subreddit}:`, err);
        }
      }

      // Sort by score and limit
      allPosts.sort((a, b) => b.score - a.score);
      setPosts(allPosts.slice(0, maxItems));
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Error al cargar posts de Reddit");
      console.error("Reddit fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [subreddits, maxItems, sortBy]);

  // Auto-fetch on mount and when config changes
  useEffect(() => {
    if (subreddits.length > 0) {
      fetchPosts();
    }
  }, [fetchPosts]);

  // Add subreddit
  const handleAddSubreddit = useCallback(() => {
    if (!newSubreddit.trim()) return;

    const cleanSubreddit = newSubreddit.trim().replace(/^r\//, "").toLowerCase();
    if (subreddits.includes(cleanSubreddit)) return;

    const updatedConfig: RedditConfig = {
      ...config,
      subreddits: [...subreddits, cleanSubreddit],
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
    setNewSubreddit("");
    setIsAddingSubreddit(false);
  }, [newSubreddit, subreddits, config, widget.id]);

  // Remove subreddit
  const handleRemoveSubreddit = useCallback((subreddit: string) => {
    const updatedConfig: RedditConfig = {
      ...config,
      subreddits: subreddits.filter((s) => s !== subreddit),
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig as Record<string, unknown> });
  }, [subreddits, config, widget.id]);

  // Format number (1000 -> 1k)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  // Format relative time
  const formatTime = (timestamp: number): string => {
    const now = Date.now() / 1000;
    const diff = now - timestamp;
    const hours = Math.floor(diff / 3600);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(diff / 60)}m`;
  };

  return (
    <div className="flex h-full flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF4500]/10">
            <svg className="h-4 w-4 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold">Reddit</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchPosts}
            disabled={loading || subreddits.length === 0}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAddingSubreddit(!isAddingSubreddit)}
            className="h-8 w-8"
          >
            {isAddingSubreddit ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Add Subreddit Form */}
      {isAddingSubreddit && (
        <div className="border-b p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nombre del subreddit (ej: programming)"
              value={newSubreddit}
              onChange={(e) => setNewSubreddit(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSubreddit()}
              className="flex-1"
            />
            <Button onClick={handleAddSubreddit} size="sm">
              Agregar
            </Button>
          </div>
          {subreddits.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {subreddits.map((sub) => (
                <Badge key={sub} variant="secondary" className="gap-1 pr-1">
                  r/{sub}
                  <button
                    onClick={() => handleRemoveSubreddit(sub)}
                    className="ml-1 rounded-full p-0.5 hover:bg-destructive/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {subreddits.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FF4500]/10">
              <svg className="h-8 w-8 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium">Sin subreddits</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Agrega subreddits para ver sus posts
              </p>
            </div>
            <Button onClick={() => setIsAddingSubreddit(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Agregar subreddit
            </Button>
            <div className="mt-2 text-xs text-muted-foreground">
              <p className="font-medium">Subreddits populares:</p>
              <div className="mt-1 flex flex-wrap justify-center gap-1">
                {["programming", "webdev", "javascript", "reactjs", "gamedev"].map((sub) => (
                  <Badge
                    key={sub}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent"
                    onClick={() => {
                      setNewSubreddit(sub);
                      setIsAddingSubreddit(true);
                    }}
                  >
                    r/{sub}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h4 className="font-medium">Error</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchPosts} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : loading && posts.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando posts...</p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-1 p-3">
              {posts.map((post) => (
                <a
                  key={post.id}
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border bg-card p-3 transition-colors hover:border-[#FF4500]/50 hover:bg-accent/50"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    {post.thumbnail && (
                      <div className="hidden h-14 w-14 flex-shrink-0 overflow-hidden rounded @[280px]:block">
                        <img
                          src={post.thumbnail}
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
                      <h4 className="line-clamp-2 text-sm font-medium leading-tight group-hover:text-[#FF4500]">
                        {post.isNsfw && (
                          <Badge variant="destructive" className="mr-1 text-[10px]">
                            NSFW
                          </Badge>
                        )}
                        {post.title}
                      </h4>

                      {/* Meta */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="text-[10px]">
                          r/{post.subreddit}
                        </Badge>
                        <span className="flex items-center gap-0.5">
                          <ArrowUp className="h-3 w-3" />
                          {formatNumber(post.score)}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <MessageCircle className="h-3 w-3" />
                          {formatNumber(post.numComments)}
                        </span>
                        <span>{formatTime(post.createdUtc)}</span>
                      </div>

                      {/* Author & Flair */}
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
                        <span>u/{post.author}</span>
                        {post.flair && (
                          <Badge variant="outline" className="text-[9px]">
                            {post.flair}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* External link icon */}
                    <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </a>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {lastFetch && posts.length > 0 && (
        <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
          {posts.length} posts - Actualizado: {lastFetch.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
