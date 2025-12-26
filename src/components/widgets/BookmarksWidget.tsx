"use client";

import { useState, useMemo } from "react";
import { Bookmark, ExternalLink, Plus, X, Settings2, Star, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import { motion, AnimatePresence } from "motion/react";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface BookmarksWidgetProps {
  widget: Widget;
}

type ViewMode = "grid" | "list";

export function BookmarksWidget({ widget }: BookmarksWidgetProps) {
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(
    (widget.config?.bookmarksViewMode as ViewMode) || "grid"
  );

  // Get bookmarked link IDs from widget config
  const bookmarkedLinkIds = useMemo(
    () => (widget.config?.bookmarkedLinkIds as string[]) || [],
    [widget.config?.bookmarkedLinkIds]
  );

  // Get the actual bookmarked links
  const bookmarkedLinks = useMemo(() => {
    return links.filter((link) => bookmarkedLinkIds.includes(link.id));
  }, [links, bookmarkedLinkIds]);

  // Get available links for adding (not already bookmarked)
  const availableLinks = useMemo(() => {
    return links.filter((link) => !bookmarkedLinkIds.includes(link.id));
  }, [links, bookmarkedLinkIds]);

  const handleLinkClick = (link: Link) => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  };

  const handleAddBookmark = (linkId: string) => {
    const updatedIds = [...bookmarkedLinkIds, linkId];
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        bookmarkedLinkIds: updatedIds,
      },
    });
  };

  const handleRemoveBookmark = (linkId: string) => {
    const updatedIds = bookmarkedLinkIds.filter((id) => id !== linkId);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        bookmarkedLinkIds: updatedIds,
      },
    });
  };

  const handleToggleViewMode = () => {
    const newMode = viewMode === "grid" ? "list" : "grid";
    setViewMode(newMode);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        bookmarksViewMode: newMode,
      },
    });
  };

  const getCategoryName = (categoryId?: string | null) => {
    if (!categoryId) return null;
    return categories.find((cat) => cat.id === categoryId)?.name;
  };

  return (
    <>
      <div className="@container h-full w-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 p-3 @sm:p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2 min-w-0">
            <Bookmark className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-sm font-semibold truncate @sm:text-base">
              Enlaces guardados
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleViewMode}
              className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
            >
              {viewMode === "grid" ? (
                <Grid3x3 className="w-3.5 h-3.5" />
              ) : (
                <List className="w-3.5 h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManageModalOpen(true)}
              className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <AnimatePresence mode="wait">
              {bookmarkedLinks.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center h-full text-center px-4 py-8 @sm:py-12"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 @sm:w-14 @sm:h-14 @sm:mb-4">
                    <Bookmark className="w-5 h-5 text-primary @sm:w-6 @sm:h-6" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1 @sm:text-base">
                    Sin enlaces guardados
                  </h3>
                  <p className="text-xs text-muted-foreground mb-4 max-w-[200px] @sm:text-sm @sm:max-w-[250px]">
                    Agrega tus enlaces favoritos para acceso rápido
                  </p>
                  <Button
                    size="sm"
                    onClick={() => setIsManageModalOpen(true)}
                    className="h-8 text-xs @sm:h-9 @sm:text-sm"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Agregar enlaces
                  </Button>
                </motion.div>
              ) : viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-3 @sm:p-4 grid grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 gap-2 @sm:gap-3"
                >
                  {bookmarkedLinks.map((link, index) => {
                    const categoryName = getCategoryName(link.categoryId);

                    return (
                      <motion.button
                        key={link.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleLinkClick(link)}
                        className="group relative flex flex-col gap-2 p-3 @sm:p-3.5 rounded-lg border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 hover:shadow-md transition-all duration-200 text-left"
                      >
                        {/* Favorite indicator */}
                        {link.isFavorite && (
                          <Star className="absolute top-2 right-2 w-3 h-3 text-yellow-500 fill-yellow-500" />
                        )}

                        {/* Icon/Favicon */}
                        <div className="w-10 h-10 @sm:w-12 @sm:h-12 rounded-lg border bg-background flex items-center justify-center overflow-hidden mx-auto">
                          {link.faviconUrl ? (
                            <img
                              src={link.faviconUrl}
                              alt=""
                              className="w-5 h-5 @sm:w-6 @sm:h-6 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <ExternalLink className="w-4 h-4 @sm:w-5 @sm:h-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Title */}
                        <div className="flex-1">
                          <h4 className="text-xs @sm:text-sm font-medium text-foreground line-clamp-2 text-center group-hover:text-primary transition-colors mb-1">
                            {link.title}
                          </h4>
                          {categoryName && (
                            <Badge
                              variant="secondary"
                              className="text-xs h-4 mx-auto hidden @sm:inline-flex"
                            >
                              {categoryName}
                            </Badge>
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-2 @sm:p-3 space-y-1.5 @sm:space-y-2"
                >
                  {bookmarkedLinks.map((link, index) => {
                    const categoryName = getCategoryName(link.categoryId);

                    return (
                      <motion.button
                        key={link.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => handleLinkClick(link)}
                        className="w-full group relative flex items-center gap-3 p-2.5 @sm:p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all duration-200 text-left"
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
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                              {link.title}
                            </h4>
                            {link.isFavorite && (
                              <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {categoryName && (
                              <Badge variant="secondary" className="text-xs h-5">
                                {categoryName}
                              </Badge>
                            )}
                            {link.siteName && (
                              <span className="text-xs text-muted-foreground/70 truncate hidden @md:inline">
                                {link.siteName}
                              </span>
                            )}
                          </div>
                        </div>

                        <ExternalLink className="flex-shrink-0 w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </div>

      {/* Manage Bookmarks Modal */}
      <Dialog open={isManageModalOpen} onOpenChange={setIsManageModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Administrar enlaces guardados</DialogTitle>
            <DialogDescription>
              Agrega o elimina enlaces de este widget
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 -mx-6">
            <ScrollArea className="h-full px-6">
              {/* Current Bookmarks */}
              {bookmarkedLinks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium mb-3">
                    Enlaces actuales ({bookmarkedLinks.length})
                  </h4>
                  <div className="space-y-2">
                    {bookmarkedLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                      >
                        {link.faviconUrl && (
                          <img
                            src={link.faviconUrl}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {link.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.url}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveBookmark(link.id)}
                          className="h-8 w-8 p-0 flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Available Links */}
              {availableLinks.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-3">
                    Enlaces disponibles ({availableLinks.length})
                  </h4>
                  <div className="space-y-2">
                    {availableLinks.map((link) => (
                      <div
                        key={link.id}
                        className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                      >
                        {link.faviconUrl && (
                          <img
                            src={link.faviconUrl}
                            alt=""
                            className="w-5 h-5 object-contain flex-shrink-0"
                            onError={(e) => {
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {link.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {link.url}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddBookmark(link.id)}
                          className="h-8 px-3 flex-shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          Agregar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {availableLinks.length === 0 && bookmarkedLinks.length > 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    Todos tus enlaces están guardados en este widget
                  </p>
                </div>
              )}

              {links.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">
                    No tienes enlaces disponibles. Crea algunos enlaces primero.
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
