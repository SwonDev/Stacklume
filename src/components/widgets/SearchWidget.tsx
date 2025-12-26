"use client";

import { useState, useMemo, useEffect } from "react";
import { Search, ExternalLink, X, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";
import { motion, AnimatePresence } from "motion/react";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";

interface SearchWidgetProps {
  widget: Widget;
}

export function SearchWidget({ widget }: SearchWidgetProps) {
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Debounced filtering of links
  const filteredLinks = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return [];
    }

    const query = debouncedQuery.toLowerCase().trim();

    return links.filter((link) => {
      // Search by title
      if (link.title.toLowerCase().includes(query)) return true;

      // Search by description
      if (link.description?.toLowerCase().includes(query)) return true;

      // Search by URL
      if (link.url.toLowerCase().includes(query)) return true;

      // Search by site name
      if (link.siteName?.toLowerCase().includes(query)) return true;

      // Search by category name
      if (link.categoryId) {
        const category = categories.find((cat) => cat.id === link.categoryId);
        if (category?.name.toLowerCase().includes(query)) return true;
      }

      return false;
    });
  }, [links, categories, debouncedQuery]);

  const handleLinkClick = (link: Link) => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find((cat) => cat.id === categoryId)?.name;
  };

  const maxResults = widget.config?.limit || 10;
  const displayedLinks = filteredLinks.slice(0, maxResults);
  const hasMore = filteredLinks.length > maxResults;

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Search Input Section */}
      <div className="p-3 @sm:p-4 border-b bg-muted/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Buscar enlaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-9 @sm:h-10 text-sm @sm:text-base"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Search Stats */}
        {debouncedQuery && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs text-muted-foreground"
          >
            {filteredLinks.length === 0 ? (
              <span>No se encontraron resultados</span>
            ) : (
              <span>
                {filteredLinks.length} resultado{filteredLinks.length !== 1 ? "s" : ""} encontrado
                {filteredLinks.length !== 1 ? "s" : ""}
              </span>
            )}
          </motion.div>
        )}
      </div>

      {/* Results Section */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <AnimatePresence mode="popLayout">
            {!debouncedQuery && (
              <motion.div
                key="empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-4 py-8 @sm:py-12"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 @sm:w-14 @sm:h-14 @sm:mb-4">
                  <Search className="w-5 h-5 text-primary @sm:w-6 @sm:h-6" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1 @sm:text-base">
                  Buscar enlaces
                </h3>
                <p className="text-xs text-muted-foreground max-w-[200px] @sm:text-sm @sm:max-w-[250px]">
                  Escribe para buscar por título, descripción, URL o categoría
                </p>
              </motion.div>
            )}

            {debouncedQuery && filteredLinks.length === 0 && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-4 py-8"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Sparkles className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-1">
                  Sin resultados
                </h3>
                <p className="text-xs text-muted-foreground max-w-[200px]">
                  Intenta con otros términos de búsqueda
                </p>
              </motion.div>
            )}

            {debouncedQuery && displayedLinks.length > 0 && (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-2 @sm:p-3 space-y-1.5 @sm:space-y-2"
              >
                {displayedLinks.map((link, index) => {
                  const categoryName = getCategoryName(link.categoryId);

                  return (
                    <motion.button
                      key={link.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleLinkClick(link)}
                      className="w-full group relative flex items-start gap-3 p-2.5 @sm:p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all duration-200 text-left"
                    >
                      {/* Favicon */}
                      <div className="flex-shrink-0 w-8 h-8 @sm:w-10 @sm:h-10 rounded-md border bg-background flex items-center justify-center overflow-hidden">
                        {link.faviconUrl ? (
                          <img
                            src={link.faviconUrl}
                            alt=""
                            className="w-4 h-4 @sm:w-5 @sm:h-5 object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : (
                          <ExternalLink className="w-3.5 h-3.5 @sm:w-4 @sm:h-4 text-muted-foreground" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                            {link.title}
                          </h4>
                          <ExternalLink className="flex-shrink-0 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        {link.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2 hidden @sm:block">
                            {link.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          {categoryName && (
                            <Badge variant="secondary" className="text-xs h-5">
                              {categoryName}
                            </Badge>
                          )}
                          {link.siteName && (
                            <span className="text-xs text-muted-foreground/70 hidden @md:inline">
                              {link.siteName}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}

                {/* Show More Indicator */}
                {hasMore && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="pt-2 pb-1 text-center"
                  >
                    <p className="text-xs text-muted-foreground">
                      +{filteredLinks.length - maxResults} resultado
                      {filteredLinks.length - maxResults !== 1 ? "s" : ""} más
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
}
