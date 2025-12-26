"use client";

import { useMemo, useState, useEffect, useRef, useCallback, memo } from "react";
import { createPortal } from "react-dom";
import {
  Star,
  Clock,
  FolderOpen,
  ExternalLink,
  GripVertical,
  MoreHorizontal,
  Pencil,
  Trash2,
  Move,
  Settings,
  Tag as TagIcon,
  ExternalLinkIcon,
  Copy,
  Minimize2,
  Lock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import type { Link, Category, Tag } from "@/lib/db/schema";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { WidgetSkeleton } from "@/components/widgets/WidgetSkeleton";
import { LazyWidgetRenderer, specialWidgetTypes } from "@/components/widgets/LazyWidgets";
import { WidgetErrorBoundary } from "@/components/providers/ErrorBoundary";
import { WidgetContextMenu } from "@/components/widgets/WidgetContextMenu";

interface BentoCardProps {
  widget: Widget;
}

// Helper to get CSS color value from color preset name
function getColorValue(colorName: string): string {
  const colorMap: Record<string, string> = {
    slate: "hsl(215, 20%, 16%)",
    red: "hsl(0, 40%, 18%)",
    orange: "hsl(25, 40%, 18%)",
    amber: "hsl(38, 40%, 18%)",
    yellow: "hsl(50, 40%, 18%)",
    lime: "hsl(80, 40%, 15%)",
    green: "hsl(140, 40%, 15%)",
    emerald: "hsl(160, 40%, 15%)",
    teal: "hsl(175, 40%, 15%)",
    cyan: "hsl(190, 40%, 16%)",
    sky: "hsl(200, 40%, 18%)",
    blue: "hsl(220, 40%, 18%)",
    indigo: "hsl(235, 40%, 18%)",
    violet: "hsl(260, 40%, 18%)",
    purple: "hsl(280, 40%, 18%)",
    fuchsia: "hsl(295, 40%, 18%)",
    pink: "hsl(330, 40%, 18%)",
    rose: "hsl(350, 40%, 18%)",
  };
  return colorMap[colorName] || "";
}

interface LinkItemProps {
  id: string;
  title: string;
  description?: string | null;
  url: string;
  imageUrl?: string | null;
  faviconUrl?: string | null;
  isFavorite?: boolean;
  categoryName?: string;
  isEditMode?: boolean;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
  isThemed?: boolean;
}

// Memoized LinkItem component to prevent unnecessary re-renders
// when parent components update but link data remains unchanged
const LinkItem = memo(function LinkItem({
  title,
  description,
  url,
  imageUrl,
  faviconUrl,
  isFavorite,
  isEditMode,
  onEdit,
  onToggleFavorite,
  isThemed,
}: LinkItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }, [url]);

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode && onEdit) {
      e.preventDefault();
      onEdit();
    }
  };

  // Disable hover animations when reduced motion is preferred
  const hoverAnimation = prefersReducedMotion
    ? undefined
    : { x: isEditMode ? 0 : 2, scale: isEditMode ? 1.02 : 1 };

  return (
    <motion.a
      href={isEditMode ? undefined : url}
      target={isEditMode ? undefined : "_blank"}
      rel={isEditMode ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      className={cn(
        "group/link flex w-full rounded-lg transition-colors",
        // Responsive gap and padding based on container size
        "gap-1 p-1 @[160px]:gap-1.5 @[160px]:p-1.5 @[200px]:gap-2 @[200px]:p-2 @[280px]:gap-2.5",
        isEditMode
          ? "hover:bg-primary/10 cursor-pointer border border-transparent hover:border-primary/30"
          : "hover:bg-secondary/50"
      )}
      whileHover={hoverAnimation}
    >
      {/* Favicon or Image - Responsive sizing */}
      <div className={cn(
        "flex-shrink-0 rounded-md overflow-hidden bg-secondary flex items-center justify-center",
        "w-6 h-6 @[160px]:w-7 @[160px]:h-7 @[200px]:w-8 @[200px]:h-8 @[280px]:w-9 @[280px]:h-9"
      )}>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {faviconUrl && !imageUrl ? (
          <img
            src={faviconUrl}
            alt=""
            className={cn(
              "w-3 h-3 @[160px]:w-3.5 @[160px]:h-3.5 @[200px]:w-4 @[200px]:h-4"
            )}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <ExternalLink className={cn(
          "text-muted-foreground",
          "w-2.5 h-2.5 @[160px]:w-3 @[160px]:h-3 @[200px]:w-3.5 @[200px]:h-3.5",
          (imageUrl || faviconUrl) && "hidden"
        )} />
      </div>

      {/* Content - Adaptive visibility */}
      <div className="flex-1 min-w-0">
        {/* Title row with favorite star */}
        <div className="flex items-center gap-1">
          <h4 className={cn(
            "font-medium truncate transition-colors",
            "text-[11px] @[160px]:text-xs @[280px]:text-sm",
            isThemed
              ? "group-hover/link:text-[var(--widget-accent)]"
              : "group-hover/link:text-primary"
          )}>
            {title}
          </h4>
          {/* Interactive favorite star */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            className={cn(
              "flex-shrink-0 p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              !isFavorite && "opacity-0 group-hover/link:opacity-60 hover:!opacity-100"
            )}
            title={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Star className={cn(
              "flex-shrink-0 transition-colors",
              "w-2.5 h-2.5 @[160px]:w-3 @[160px]:h-3",
              isFavorite
                ? isThemed
                  ? "text-[var(--widget-accent)] fill-[var(--widget-accent)]"
                  : "text-yellow-500 fill-yellow-500"
                : isThemed
                  ? "text-[var(--widget-muted)] hover:text-[var(--widget-accent)]"
                  : "text-muted-foreground hover:text-yellow-500"
            )} />
          </button>
        </div>

        {/* Description - Hidden on very small containers */}
        {description && (
          <p className={cn(
            "line-clamp-1",
            "hidden @[280px]:block text-[10px] @[280px]:text-xs mt-0.5",
            isThemed ? "text-[var(--widget-muted)]" : "text-muted-foreground"
          )}>
            {description}
          </p>
        )}

        {/* Hostname - Hidden on very small containers */}
        <p className={cn(
          "truncate mt-0.5",
          "hidden @[160px]:block text-[10px] @[200px]:text-xs",
          isThemed ? "text-[var(--widget-muted)] opacity-60" : "text-muted-foreground/60"
        )}>
          {hostname}
        </p>
      </div>

      {/* Edit indicator or External link icon - Responsive sizing */}
      {isEditMode ? (
        <Pencil className={cn(
          "opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0",
          "w-3 h-3 @[200px]:w-3.5 @[200px]:h-3.5 mt-0.5 @[200px]:mt-1",
          isThemed ? "text-[var(--widget-accent)]" : "text-primary"
        )} />
      ) : (
        <ExternalLink className={cn(
          "opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0",
          "w-3 h-3 @[200px]:w-3.5 @[200px]:h-3.5 mt-0.5 @[200px]:mt-1",
          isThemed ? "text-[var(--widget-muted)] opacity-40" : "text-muted-foreground/40"
        )} />
      )}
    </motion.a>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  // Only re-render if these specific props change
  return (
    prevProps.id === nextProps.id &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.url === nextProps.url &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.faviconUrl === nextProps.faviconUrl &&
    prevProps.isFavorite === nextProps.isFavorite &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.isThemed === nextProps.isThemed
    // Note: onEdit callback is intentionally excluded as it's recreated on each render
    // but the underlying behavior doesn't change
  );
});

export function BentoCard({ widget }: BentoCardProps) {
  // Use selectors ONLY for state values, not functions (prevents re-render loops)
  const isEditMode = useLayoutStore((state) => state.isEditMode);
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const isLoading = useLinksStore((state) => state.isLoading);

  // Note: Functions are accessed via .getState() when needed to prevent re-render loops
  // setEditMode, openEditLinkModal, getLinksForTag, openAllLinks -> useLayoutStore/useLinksStore.getState()
  // openEditWidgetModal, removeWidget, updateWidget -> useWidgetStore.getState()
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [newTitle, setNewTitle] = useState(widget.title);

  // Fullscreen and inline editing states
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitleValue, setEditingTitleValue] = useState(widget.title);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [cardRect, setCardRect] = useState<DOMRect | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Long press / drag to enable edit mode
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasTriggeredEditModeRef = useRef(false);

  // Generate theme styles as CSS custom properties
  const themeStyles = useMemo(() => {
    const theme = widget.config?.widgetTheme;
    if (!theme) return {};

    return {
      '--widget-background': theme.gradient || theme.background,
      '--widget-foreground': theme.foreground,
      '--widget-muted': theme.muted,
      '--widget-accent': theme.accent,
      '--widget-border': theme.border,
      // Apply background
      background: theme.gradient || theme.background,
      // Apply text color to entire card
      color: theme.foreground,
      // Apply border color
      borderColor: theme.border,
    } as React.CSSProperties;
  }, [widget.config?.widgetTheme]);

  // Track if component is mounted (for portal)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle long press / drag to enable edit mode
  const handleHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left mouse button, and only when not in edit mode
    if (e.button !== 0 || isEditMode) return;

    // Don't trigger on buttons or interactive elements
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("[data-no-edit-trigger]")) {
      return;
    }

    // Store starting position
    mouseStartPosRef.current = { x: e.clientX, y: e.clientY };
    hasTriggeredEditModeRef.current = false;

    // Start long press timer (500ms)
    longPressTimerRef.current = setTimeout(() => {
      if (!hasTriggeredEditModeRef.current) {
        hasTriggeredEditModeRef.current = true;
        useLayoutStore.getState().setEditMode(true);
      }
    }, 500);
  }, [isEditMode]);

  const handleHeaderMouseMove = useCallback((e: React.MouseEvent) => {
    // Check if we're in a potential drag state
    if (!mouseStartPosRef.current || isEditMode || hasTriggeredEditModeRef.current) return;

    // Calculate distance moved
    const dx = Math.abs(e.clientX - mouseStartPosRef.current.x);
    const dy = Math.abs(e.clientY - mouseStartPosRef.current.y);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If moved more than 8px, trigger edit mode
    if (distance > 8) {
      hasTriggeredEditModeRef.current = true;
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      useLayoutStore.getState().setEditMode(true);
    }
  }, [isEditMode]);

  const handleHeaderMouseUp = useCallback(() => {
    // Clear timer and reset state
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    mouseStartPosRef.current = null;
  }, []);

  const handleHeaderMouseLeave = useCallback(() => {
    // Clear timer if mouse leaves the header
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    mouseStartPosRef.current = null;
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Determine widget type and get appropriate data
  const { icon, title, items } = useMemo(() => {
    // Helper to apply theme accent color if available
    const iconClass = (isPrimary: boolean) => cn(
      "w-4 h-4",
      widget.config?.widgetTheme
        ? isPrimary ? "text-[var(--widget-accent)]" : "text-[var(--widget-muted)]"
        : isPrimary ? "text-primary" : "text-muted-foreground"
    );

    if (widget.type === "favorites") {
      return {
        icon: <Star className={iconClass(true)} />,
        title: widget.title,
        items: links.filter((l: Link) => l.isFavorite).slice(0, 10),
      };
    }

    if (widget.type === "recent") {
      return {
        icon: <Clock className={iconClass(false)} />,
        title: widget.title,
        items: [...links]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 10),
      };
    }

    if (widget.type === "categories") {
      return {
        icon: <FolderOpen className={iconClass(false)} />,
        title: widget.title,
        items: [], // Special handling for categories widget
      };
    }

    if (widget.type === "category" && widget.categoryId) {
      const category = categories.find((c: Category) => c.id === widget.categoryId);
      return {
        icon: <FolderOpen className={iconClass(true)} />,
        title: category?.name || widget.title,
        items: links.filter((l: Link) => l.categoryId === widget.categoryId).slice(0, 10),
      };
    }

    if (widget.type === "tag" && widget.tagId) {
      const tag = tags.find((t: Tag) => t.id === widget.tagId);
      const tagLinks = useLinksStore.getState().getLinksForTag(widget.tagId);
      return {
        icon: <TagIcon className={iconClass(true)} />,
        title: tag?.name || widget.title,
        items: tagLinks.slice(0, 10),
      };
    }

    // For special widget types that will be rendered differently
    if (specialWidgetTypes.includes(widget.type)) {
      return {
        icon: <FolderOpen className={iconClass(false)} />,
        title: widget.title,
        items: [],
      };
    }

    // Default fallback - show all links
    return {
      icon: <FolderOpen className={iconClass(false)} />,
      title: widget.title,
      items: links.slice(0, 10),
    };
  }, [widget, links, categories, tags]); // Note: getLinksForTag accessed via .getState()

  // Handle Escape key to exit fullscreen or cancel title editing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
        }
        if (isEditingTitle) {
          setIsEditingTitle(false);
          setEditingTitleValue(widget.title);
        }
      }
    };

    if (isFullscreen || isEditingTitle) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isFullscreen, isEditingTitle, widget.title]);

  // Focus on title input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  // Prevent body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isFullscreen]);

  // Handle header double-click for fullscreen
  const handleHeaderDoubleClick = useCallback((e: React.MouseEvent) => {
    // Don't trigger fullscreen if clicking on the title, buttons, or in edit mode
    const target = e.target as HTMLElement;
    if (
      titleRef.current?.contains(target) ||
      target.closest("button") ||
      target.closest("[data-no-fullscreen]") ||
      isEditMode
    ) {
      return;
    }
    // Capture card position before going fullscreen
    if (cardRef.current) {
      setCardRect(cardRef.current.getBoundingClientRect());
    }
    setIsFullscreen(true);
  }, [isEditMode]);

  // Handle title double-click for inline editing
  const handleTitleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent header double-click
    setEditingTitleValue(widget.title);
    setIsEditingTitle(true);
  }, [widget.title]);

  // Save title on blur or Enter
  const handleTitleSave = useCallback(() => {
    if (editingTitleValue.trim() && editingTitleValue !== widget.title) {
      useWidgetStore.getState().updateWidget(widget.id, { title: editingTitleValue.trim() });
    }
    setIsEditingTitle(false);
  }, [editingTitleValue, widget.id, widget.title]);

  // Handle title input keydown
  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleTitleSave();
    }
    // Escape is handled by the global handler
  }, [handleTitleSave]);

  const renderContent = () => {
    // Show skeleton for data-dependent widgets while loading
    const isDataDependentWidget = ["favorites", "recent", "category", "tag", "categories", "stats", "link-analytics", "search", "bookmarks"].includes(widget.type);

    if (isLoading && isDataDependentWidget) {
      const skeletonVariant =
        widget.type === "stats" || widget.type === "link-analytics" ? "stats" :
        widget.type === "categories" ? "list" :
        ["favorites", "recent", "category", "tag", "bookmarks"].includes(widget.type) ? "list" :
        "default";
      return <WidgetSkeleton variant={skeletonVariant} />;
    }

    // Render special widget types using lazy loading
    if (specialWidgetTypes.includes(widget.type)) {
      return <LazyWidgetRenderer widget={widget} />;
    }

    // Special render for categories widget
    if (widget.type === "categories") {
      const isThemed = !!widget.config?.widgetTheme;
      return (
        <div className="space-y-0.5 @[200px]:space-y-1 w-full">
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-4 @[200px]:py-6 @[280px]:py-8 text-center">
              <div className={cn(
                "rounded-full bg-secondary/50 flex items-center justify-center mb-2 @[200px]:mb-3",
                "w-8 h-8 @[200px]:w-10 @[200px]:h-10 @[280px]:w-12 @[280px]:h-12"
              )}>
                <FolderOpen className={cn(
                  "w-3.5 h-3.5 @[200px]:w-4 @[200px]:h-4 @[280px]:w-5 @[280px]:h-5",
                  isThemed ? "text-[var(--widget-muted)]" : "text-muted-foreground"
                )} />
              </div>
              <p className={cn(
                "text-xs @[200px]:text-sm",
                isThemed ? "text-[var(--widget-muted)]" : "text-muted-foreground"
              )}>
                Sin categorías
              </p>
            </div>
          ) : (
            categories.map((category: Category) => {
              const count = links.filter(
                (l: Link) => l.categoryId === category.id
              ).length;
              return (
                <motion.div
                  key={category.id}
                  className={cn(
                    "flex items-center rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors w-full",
                    "gap-1 p-1 @[160px]:gap-1.5 @[160px]:p-1.5 @[200px]:gap-2 @[200px]:p-2"
                  )}
                  whileHover={{ x: 2 }}
                >
                  <FolderOpen className={cn(
                    "flex-shrink-0",
                    "w-3 h-3 @[160px]:w-3.5 @[160px]:h-3.5 @[200px]:w-4 @[200px]:h-4",
                    isThemed ? "text-[var(--widget-accent)]" : "text-primary"
                  )} />
                  <span className={cn(
                    "flex-1 truncate",
                    "text-[11px] @[160px]:text-xs @[280px]:text-sm"
                  )}>
                    {category.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "flex-shrink-0 font-medium",
                      "text-[10px] @[160px]:text-xs h-4 @[160px]:h-5 px-1 @[160px]:px-1.5 @[200px]:px-2"
                    )}
                  >
                    {count}
                  </Badge>
                </motion.div>
              );
            })
          )}
        </div>
      );
    }

    // Standard link list
    if (items.length === 0) {
      const isThemed = !!widget.config?.widgetTheme;
      return (
        <div className="flex flex-col items-center justify-center h-full py-4 @[200px]:py-6 @[280px]:py-8 text-center px-2">
          <div className={cn(
            "rounded-full bg-secondary/50 flex items-center justify-center mb-2 @[200px]:mb-3",
            "w-8 h-8 @[200px]:w-10 @[200px]:h-10 @[280px]:w-12 @[280px]:h-12"
          )}>
            {icon}
          </div>
          <p className={cn(
            "text-xs @[200px]:text-sm",
            isThemed ? "text-[var(--widget-muted)]" : "text-muted-foreground"
          )}>
            Sin enlaces
          </p>
          <p className={cn(
            "mt-0.5 @[200px]:mt-1",
            "text-[10px] @[160px]:text-xs hidden @[200px]:block",
            isThemed ? "text-[var(--widget-muted)] opacity-60" : "text-muted-foreground/60"
          )}>
            Añade tu primer enlace
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-0.5 @[200px]:space-y-0.5 w-full">
        {items.map((link: Link) => {
          const category = categories.find((c: Category) => c.id === link.categoryId);
          return (
            <LinkItem
              key={link.id}
              id={link.id}
              title={link.title}
              description={link.description}
              url={link.url}
              imageUrl={link.imageUrl}
              faviconUrl={link.faviconUrl}
              isFavorite={link.isFavorite ?? false}
              categoryName={category?.name}
              isEditMode={isEditMode}
              onEdit={() => useLinksStore.getState().openEditLinkModal(link)}
              onToggleFavorite={async () => {
                const newFavorite = !link.isFavorite;
                // Optimistic update
                useLinksStore.getState().updateLink(link.id, { isFavorite: newFavorite });
                // Persist to database
                try {
                  await fetch(`/api/links/${link.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ isFavorite: newFavorite }),
                  });
                } catch (error) {
                  // Revert on error
                  console.error("Error toggling favorite:", error);
                  useLinksStore.getState().updateLink(link.id, { isFavorite: !newFavorite });
                }
              }}
              isThemed={!!widget.config?.widgetTheme}
            />
          );
        })}
      </div>
    );
  };

  return (
    <WidgetContextMenu
      widget={widget}
      onRename={() => {
        setNewTitle(widget.title);
        setShowRenameDialog(true);
      }}
      onConfigure={() => useWidgetStore.getState().openEditWidgetModal(widget)}
    >
      <Card
        ref={cardRef}
        className={cn(
          "h-full w-full flex flex-col overflow-hidden group relative !gap-0 !py-0",
          isEditMode && !widget.isLocked && "ring-2 ring-primary/30",
          isEditMode && widget.isLocked && "ring-2 ring-amber-500/30",
          // Remove glass class when theme or custom background is applied
          !widget.config?.widgetTheme && !widget.config?.customBackground && !widget.config?.customGradient && "glass",
          // Add themed class for scoped styling
          widget.config?.widgetTheme && "widget-themed"
        )}
        style={{
          // Priority: widgetTheme > customGradient > customBackground
          ...(widget.config?.widgetTheme
            ? themeStyles
            : widget.config?.customGradient
              ? { background: widget.config.customGradient }
              : widget.config?.customBackground
                ? { backgroundColor: getColorValue(widget.config.customBackground) }
                : {}
          ),
        }}
      >
      {/* Drag handle - full header area in edit mode (not shown for locked widgets) */}
      {isEditMode && !widget.isLocked && (
        <div className="drag-handle absolute inset-x-0 top-0 h-12 cursor-move z-10 flex items-center justify-center bg-gradient-to-b from-primary/10 to-transparent opacity-0 hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1 text-primary/60">
            <Move className="w-4 h-4" />
            <span className="text-xs font-medium">Arrastrar</span>
          </div>
        </div>
      )}
      {/* Locked indicator overlay in edit mode */}
      {isEditMode && widget.isLocked && (
        <div className="absolute inset-x-0 top-0 h-12 z-10 flex items-center justify-center bg-gradient-to-b from-amber-500/10 to-transparent opacity-0 hover:opacity-100 transition-opacity cursor-not-allowed">
          <div className="flex items-center gap-1 text-amber-500/60">
            <Lock className="w-4 h-4" />
            <span className="text-xs font-medium">Bloqueado</span>
          </div>
        </div>
      )}

      <CardHeader
        className={cn(
          "!py-1.5 !px-3 !pb-1.5 !gap-0 flex-row items-center justify-between space-y-0 border-b flex-shrink-0",
          !isEditMode && "cursor-grab active:cursor-grabbing",
          // Use theme border color if available
          widget.config?.widgetTheme ? "border-[var(--widget-border)]" : "border-border/50"
        )}
        onDoubleClick={handleHeaderDoubleClick}
        onMouseDown={handleHeaderMouseDown}
        onMouseMove={handleHeaderMouseMove}
        onMouseUp={handleHeaderMouseUp}
        onMouseLeave={handleHeaderMouseLeave}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {isEditMode && !widget.isLocked && (
            <div className="drag-handle cursor-move flex-shrink-0" data-no-fullscreen>
              <GripVertical className="w-4 h-4 text-primary" />
            </div>
          )}
          {widget.isLocked && (
            <div className="flex-shrink-0" title="Widget bloqueado">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            </div>
          )}
          <div className="flex-shrink-0">{icon}</div>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={editingTitleValue}
              onChange={(e) => setEditingTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="text-sm font-medium bg-transparent border-b border-primary outline-none min-w-0 flex-1 text-foreground"
              data-no-fullscreen
            />
          ) : (
            <CardTitle
              className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
              onDoubleClick={handleTitleDoubleClick}
            >
              <span ref={titleRef}>{title}</span>
            </CardTitle>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-7 w-7 transition-opacity flex-shrink-0",
                isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setNewTitle(widget.title);
              setShowRenameDialog(true);
            }}>
              <Pencil className="w-3.5 h-3.5 mr-2" />
              Renombrar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => useWidgetStore.getState().openEditWidgetModal(widget)}>
              <Settings className="w-3.5 h-3.5 mr-2" />
              Configurar
            </DropdownMenuItem>
            {/* Bulk actions for link-based widgets */}
            {items.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => useLinksStore.getState().openAllLinks(items)}>
                  <ExternalLinkIcon className="w-3.5 h-3.5 mr-2" />
                  Abrir todos ({items.length})
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  const urls = items.map((l: Link) => l.url).join('\n');
                  navigator.clipboard.writeText(urls);
                }}>
                  <Copy className="w-3.5 h-3.5 mr-2" />
                  Copiar URLs
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => setShowDeleteAlert(true)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className={cn(
        "flex-1 overflow-hidden min-h-0",
        // Full-bleed widgets (iframes, images) - no padding
        ["embed", "youtube", "spotify", "codepen", "unsplash", "image", "qr-code"].includes(widget.type)
          ? "p-0"
          : "p-2"
      )}>
        <WidgetErrorBoundary widgetId={widget.id} widgetType={widget.type}>
          {/* Full-bleed widgets render directly without ScrollArea */}
          {["embed", "youtube", "spotify", "codepen", "unsplash", "image", "qr-code"].includes(widget.type) ? (
            <div className="h-full w-full">
              {renderContent()}
            </div>
          ) : (
            <ScrollArea className="h-full w-full scrollbar-thin">
              <div className="@container h-full w-full">
                {renderContent()}
              </div>
            </ScrollArea>
          )}
        </WidgetErrorBoundary>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar widget?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El widget &ldquo;{widget.title}&rdquo; se eliminará permanentemente del panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                useWidgetStore.getState().removeWidget(widget.id);
                setShowDeleteAlert(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Renombrar widget
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="widget-title">Nuevo título</Label>
              <Input
                id="widget-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Título del widget"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newTitle.trim()) {
                    useWidgetStore.getState().updateWidget(widget.id, { title: newTitle.trim() });
                    setShowRenameDialog(false);
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (newTitle.trim()) {
                  useWidgetStore.getState().updateWidget(widget.id, { title: newTitle.trim() });
                  setShowRenameDialog(false);
                }
              }}
              disabled={!newTitle.trim()}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Overlay - Rendered via Portal */}
      {isMounted && createPortal(
        <FullscreenOverlay
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          cardRect={cardRect}
          icon={icon}
          title={title}
          widgetType={widget.type}
        >
          {renderContent()}
        </FullscreenOverlay>,
        document.body
      )}
    </Card>
    </WidgetContextMenu>
  );
}

// Fullscreen overlay component rendered via portal
function FullscreenOverlay({
  isOpen,
  onClose,
  cardRect,
  icon,
  title,
  widgetType,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  cardRect: DOMRect | null;
  icon: React.ReactNode;
  title: string;
  widgetType: string;
  children: React.ReactNode;
}) {
  // Calculate initial position based on card rect
  const initialStyle = cardRect
    ? {
        top: cardRect.top,
        left: cardRect.left,
        width: cardRect.width,
        height: cardRect.height,
        borderRadius: "0.75rem",
      }
    : {
        top: "50%",
        left: "50%",
        width: 300,
        height: 200,
        x: "-50%",
        y: "-50%",
        borderRadius: "0.75rem",
      };

  const fullscreenStyle = {
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    borderRadius: "0px",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[999] bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Fullscreen Card */}
          <motion.div
            className="fixed z-[1000] glass flex flex-col overflow-hidden"
            initial={initialStyle}
            animate={fullscreenStyle}
            exit={initialStyle}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
              mass: 1,
            }}
            style={{ position: "fixed" }}
          >
            {/* Header */}
            <motion.div
              className="flex items-center justify-between px-6 py-4 border-b border-border/50 flex-shrink-0"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.15, duration: 0.2 }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                >
                  {icon}
                </motion.div>
                <motion.h2
                  className="text-xl font-semibold text-gold-gradient"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25, duration: 0.3 }}
                >
                  {title}
                </motion.h2>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
                  onClick={onClose}
                >
                  <Minimize2 className="w-5 h-5" />
                </Button>
              </motion.div>
            </motion.div>

            {/* Content */}
            <motion.div
              className={cn(
                "flex-1 min-h-0 flex flex-col",
                ["embed", "youtube", "spotify", "codepen", "unsplash", "image", "qr-code"].includes(widgetType)
                  ? "p-0 overflow-hidden"
                  : "p-6 overflow-hidden"
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1, duration: 0.3 }}
            >
              {/* Link-based widgets need ScrollArea wrapper, special widgets handle their own scroll */}
              {["favorites", "recent", "category", "tag", "categories"].includes(widgetType) ? (
                <ScrollArea className="h-full w-full">
                  <div className="@container">
                    {children}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-full w-full @container flex-1 min-h-0 flex flex-col">
                  {children}
                </div>
              )}
            </motion.div>

            {/* Footer hint */}
            <motion.div
              className="flex items-center justify-center py-3 border-t border-border/50 text-muted-foreground text-sm flex-shrink-0"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.3, duration: 0.2 }}
            >
              <kbd className="px-2 py-1 bg-secondary/50 rounded text-xs font-mono mr-2 border border-border/50">Esc</kbd>
              <span>para minimizar</span>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
