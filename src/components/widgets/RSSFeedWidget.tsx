"use client";

import { useState, useEffect, useCallback } from "react";
import { Rss, RefreshCw, Plus, Trash2, ExternalLink, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface RSSFeedWidgetProps {
  widget: Widget;
}

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  description?: string;
  image?: string;
  source: string;
}

interface FeedConfig {
  feedUrls?: string[];
  refreshInterval?: number;
  maxItems?: number;
}

export function RSSFeedWidget({ widget }: RSSFeedWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const config = (widget.config as unknown as FeedConfig) || {};
  const feedUrls = config.feedUrls || [];
  const maxItems = config.maxItems || 10;
  const refreshInterval = config.refreshInterval || 30;

  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Parse RSS/Atom feed from XML
  const parseRSSFeed = useCallback((xmlText: string, feedUrl: string): RSSItem[] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");

      // Check for parsing errors
      const parserError = xmlDoc.querySelector("parsererror");
      if (parserError) {
        throw new Error("Invalid XML format");
      }

      const items: RSSItem[] = [];
      const feedTitle = xmlDoc.querySelector("channel > title, feed > title")?.textContent || new URL(feedUrl).hostname;

      // Try RSS 2.0 format
      const rssItems = xmlDoc.querySelectorAll("item");
      if (rssItems.length > 0) {
        rssItems.forEach((item) => {
          const title = item.querySelector("title")?.textContent || "Untitled";
          const link = item.querySelector("link")?.textContent || "";
          const pubDate = item.querySelector("pubDate")?.textContent || new Date().toISOString();
          const description = item.querySelector("description")?.textContent || "";

          // Try to find image
          let image = item.querySelector("enclosure[type^='image']")?.getAttribute("url") || "";
          if (!image) {
            const content = item.querySelector("content\\:encoded, encoded")?.textContent || description;
            const imgMatch = content.match(/<img[^>]+src="([^">]+)"/);
            image = imgMatch ? imgMatch[1] : "";
          }

          items.push({
            title,
            link,
            pubDate,
            description,
            image,
            source: feedTitle,
          });
        });
      } else {
        // Try Atom format
        const atomEntries = xmlDoc.querySelectorAll("entry");
        atomEntries.forEach((entry) => {
          const title = entry.querySelector("title")?.textContent || "Untitled";
          const link = entry.querySelector("link")?.getAttribute("href") || "";
          const pubDate = entry.querySelector("updated, published")?.textContent || new Date().toISOString();
          const description = entry.querySelector("summary, content")?.textContent || "";

          items.push({
            title,
            link,
            pubDate,
            description,
            image: "",
            source: feedTitle,
          });
        });
      }

      return items;
    } catch (err) {
      console.error("Error parsing RSS feed:", err);
      return [];
    }
  }, []);

  // Fetch RSS feeds
  const fetchFeeds = useCallback(async () => {
    if (feedUrls.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const allItems: RSSItem[] = [];

      for (const feedUrl of feedUrls) {
        try {
          // Use allorigins.win CORS proxy
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`;
          const response = await fetch(proxyUrl);

          if (!response.ok) {
            console.warn(`Failed to fetch feed: ${feedUrl}`);
            continue;
          }

          const xmlText = await response.text();
          const feedItems = parseRSSFeed(xmlText, feedUrl);
          allItems.push(...feedItems);
        } catch (err) {
          console.error(`Error fetching feed ${feedUrl}:`, err);
        }
      }

      // Sort by date and limit items
      allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setItems(allItems.slice(0, maxItems));
      setLastFetch(new Date());
      setError(null);
    } catch (err) {
      setError("Failed to fetch RSS feeds. Please check your feed URLs.");
      console.error("RSS fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [feedUrls, maxItems, parseRSSFeed]);

  // Auto-refresh
  useEffect(() => {
    if (feedUrls.length > 0) {
      fetchFeeds();
      const interval = setInterval(fetchFeeds, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [feedUrls, refreshInterval, fetchFeeds]);

  // Add feed
  const handleAddFeed = useCallback(() => {
    if (!newFeedUrl.trim()) return;

    const updatedConfig = {
      ...config,
      feedUrls: [...feedUrls, newFeedUrl.trim()],
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig });
    setNewFeedUrl("");
    setIsAddingFeed(false);
  }, [newFeedUrl, feedUrls, config, widget.id]);

  // Remove feed
  const handleRemoveFeed = useCallback((feedUrl: string) => {
    const updatedConfig = {
      ...config,
      feedUrls: feedUrls.filter((url) => url !== feedUrl),
    };

    useWidgetStore.getState().updateWidget(widget.id, { config: updatedConfig });
  }, [feedUrls, config, widget.id]);

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString();
    } catch {
      return "Unknown date";
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">RSS Feeds</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchFeeds()}
            disabled={loading || feedUrls.length === 0}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsAddingFeed(!isAddingFeed)}
            className="h-8 w-8"
          >
            {isAddingFeed ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Add Feed Form */}
      {isAddingFeed && (
        <div className="border-b p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter RSS feed URL..."
              value={newFeedUrl}
              onChange={(e) => setNewFeedUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddFeed()}
              className="flex-1"
            />
            <Button onClick={handleAddFeed} size="sm">
              Add
            </Button>
          </div>
          {feedUrls.length > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground">Current feeds:</p>
              {feedUrls.map((url) => (
                <div key={url} className="flex items-center justify-between rounded bg-muted px-2 py-1 text-xs">
                  <span className="truncate">{url}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveFeed(url)}
                    className="h-5 w-5 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {feedUrls.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Rss className="h-12 w-12 text-muted-foreground" />
            <div>
              <h4 className="font-medium">No RSS Feeds</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                Add an RSS feed URL to get started
              </p>
            </div>
            <Button onClick={() => setIsAddingFeed(true)} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Feed
            </Button>
            <div className="mt-4 text-xs text-muted-foreground">
              <p className="font-medium">Example feeds:</p>
              <ul className="mt-2 space-y-1 text-left">
                <li>• https://hnrss.org/frontpage</li>
                <li>• https://www.theverge.com/rss/index.xml</li>
                <li>• https://feeds.feedburner.com/TechCrunch/</li>
              </ul>
            </div>
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
            <div>
              <h4 className="font-medium">Error Loading Feeds</h4>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={() => fetchFeeds()} size="sm" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </div>
        ) : loading && items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <Rss className="h-12 w-12 text-muted-foreground" />
            <div>
              <h4 className="font-medium">No Items Found</h4>
              <p className="mt-1 text-sm text-muted-foreground">
                The feeds don&apos;t have any items yet
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-0.5 p-3">
              {items.map((item, index) => (
                <a
                  key={`${item.link}-${index}`}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex gap-3">
                    {item.image && (
                      <div className="shrink-0">
                        <img
                          src={item.image}
                          alt=""
                          className="h-16 w-16 rounded object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="line-clamp-2 font-medium leading-tight group-hover:text-primary">
                          {item.title}
                        </h4>
                        <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      </div>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.description.replace(/<[^>]*>/g, "").trim()}
                        </p>
                      )}
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{item.source}</span>
                        <span>•</span>
                        <span>{formatDate(item.pubDate)}</span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Footer */}
      {lastFetch && items.length > 0 && (
        <div className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
          Last updated: {formatDate(lastFetch.toISOString())}
        </div>
      )}
    </div>
  );
}
