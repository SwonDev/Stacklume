"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Shuffle, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";

interface RandomLinkWidgetProps {
  widget: Widget;
}

interface RandomLinkConfig {
  autoShuffle?: boolean;
  shuffleInterval?: number; // seconds
  filterCategoryId?: string;
}

export function RandomLinkWidget({ widget }: RandomLinkWidgetProps) {
  const { links } = useLinksStore();
  const config = widget.config as RandomLinkConfig;

  const [currentLink, setCurrentLink] = useState<Link | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [timeUntilNext, setTimeUntilNext] = useState<number | null>(null);

  // Filter links based on category if specified
  const filteredLinks = useMemo(() => {
    if (!links || links.length === 0) return [];

    if (config.filterCategoryId) {
      return links.filter(link => link.categoryId === config.filterCategoryId);
    }

    return links;
  }, [links, config.filterCategoryId]);

  // Get a random link from the filtered collection
  const getRandomLink = useCallback(() => {
    if (filteredLinks.length === 0) return null;

    // If only one link, return it
    if (filteredLinks.length === 1) {
      return filteredLinks[0];
    }

    // Get a different random link than the current one
    let randomLink: Link;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomIndex = Math.floor(Math.random() * filteredLinks.length);
      randomLink = filteredLinks[randomIndex];
      attempts++;
    } while (
      currentLink &&
      randomLink.id === currentLink.id &&
      attempts < maxAttempts &&
      filteredLinks.length > 1
    );

    return randomLink;
  }, [filteredLinks, currentLink]);

  // Shuffle to a new random link
  const handleShuffle = useCallback(() => {
    setIsShuffling(true);

    // Animate shuffle
    setTimeout(() => {
      const newLink = getRandomLink();
      setCurrentLink(newLink);
      setIsShuffling(false);

      // Reset countdown timer
      if (config.autoShuffle && config.shuffleInterval) {
        setTimeUntilNext(config.shuffleInterval);
      }
    }, 300);
  }, [getRandomLink, config.autoShuffle, config.shuffleInterval]);

  // Initialize with a random link
  useEffect(() => {
    if (!currentLink && filteredLinks.length > 0) {
      const frame = requestAnimationFrame(() => {
        const initialLink = getRandomLink();
        setCurrentLink(initialLink);

        if (config.autoShuffle && config.shuffleInterval) {
          setTimeUntilNext(config.shuffleInterval);
        }
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [currentLink, filteredLinks, getRandomLink, config.autoShuffle, config.shuffleInterval]);

  // Auto-shuffle timer
  useEffect(() => {
    if (!config.autoShuffle || !config.shuffleInterval) return;

    const interval = setInterval(() => {
      setTimeUntilNext((prev) => {
        if (prev === null || prev <= 1) {
          handleShuffle();
          return config.shuffleInterval || null;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [config.autoShuffle, config.shuffleInterval, handleShuffle]);

  // Open link in new tab
  const handleOpenLink = useCallback(() => {
    if (currentLink?.url) {
      window.open(currentLink.url, '_blank', 'noopener,noreferrer');
    }
  }, [currentLink]);

  // Handle case when no links are available
  if (filteredLinks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <Shuffle className="w-12 h-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          {config.filterCategoryId
            ? "No links in this category"
            : "No links available"}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Add some links to get started
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-4 p-6">
      {/* Header with shuffle button */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          Random Discovery
        </h3>
        <div className="flex items-center gap-2">
          {config.autoShuffle && timeUntilNext !== null && (
            <span className="text-xs text-muted-foreground">
              {timeUntilNext}s
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShuffle}
            disabled={isShuffling}
            className="h-8 w-8"
          >
            <RefreshCw className={`h-4 w-4 ${isShuffling ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Link display */}
      {currentLink && (
        <div
          className={`
            flex-1 flex flex-col gap-4 p-4 rounded-lg
            bg-gradient-to-br from-background/60 to-background/30
            backdrop-blur-sm border border-border/50
            transition-all duration-300
            hover:border-primary/50 hover:shadow-lg
            cursor-pointer group
            ${isShuffling ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
          `}
          onClick={handleOpenLink}
        >
          {/* Favicon and Title */}
          <div className="flex items-start gap-3">
            {currentLink.faviconUrl ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={currentLink.faviconUrl}
                  alt=""
                  className="w-6 h-6 object-contain"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                {currentLink.title || currentLink.url}
              </h4>
            </div>
          </div>

          {/* Description */}
          {currentLink.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
              {currentLink.description}
            </p>
          )}

          {/* URL and External Link Icon */}
          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
            <span className="text-xs text-muted-foreground/70 truncate flex-1 mr-2">
              {new URL(currentLink.url).hostname}
            </span>
            <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>

          {/* Preview Image (if available) */}
          {currentLink.imageUrl && (
            <div className="mt-2 rounded-md overflow-hidden border border-border/50">
              <img
                src={currentLink.imageUrl}
                alt=""
                className="w-full h-32 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.parentElement?.remove();
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {filteredLinks.length} link{filteredLinks.length !== 1 ? 's' : ''} available
        </span>
        {config.autoShuffle && (
          <span className="flex items-center gap-1">
            <Shuffle className="w-3 h-3" />
            Auto-shuffle
          </span>
        )}
      </div>
    </div>
  );
}
