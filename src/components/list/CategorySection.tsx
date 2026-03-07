"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  MoreHorizontal,
  ExternalLink,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SortableLinkListItem } from "./LinkListItem";
import { useListViewStore } from "@/stores/list-view-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/i18n";
import type { Link, Category, LinkTag } from "@/lib/db/schema";

// dnd-kit imports
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface CategorySectionProps {
  category: Category | null; // null = uncategorized
  links: Link[];
  linkTags: LinkTag[];
  className?: string;
  isDragActiveOverThis?: boolean;
}

// Color mapping for category colors
const categoryColorClasses: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  gray: "bg-gray-500",
  zinc: "bg-zinc-500",
  neutral: "bg-neutral-500",
  stone: "bg-stone-500",
};

export function CategorySection({
  category,
  links,
  linkTags,
  className,
  isDragActiveOverThis = false,
}: CategorySectionProps) {
  const { t } = useTranslation();
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const toggleCategoryCollapsed = useListViewStore((state) => state.toggleCategoryCollapsed);

  const categoryId = category?.id || "uncategorized";
  const droppableId = `droppable-${categoryId}`;

  // Make this section a droppable target for cross-category drag
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
  });

  // Subscribe directly to the collapsed state for this category
  const isCollapsed = useListViewStore((state) =>
    state.collapsedCategories.includes(categoryId)
  );
  const categoryName = category?.name || t("categorySection.uncategorized");
  const categoryColor = category?.color || "gray";
  const colorClass = categoryColorClasses[categoryColor] || "bg-gray-500";

  // Sort links by order field
  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [links]);

  // Get tag IDs for each link
  const getLinkTagIds = useMemo(() => {
    const tagMap = new Map<string, string[]>();
    linkTags.forEach((lt) => {
      const existing = tagMap.get(lt.linkId) || [];
      tagMap.set(lt.linkId, [...existing, lt.tagId]);
    });
    return (linkId: string) => tagMap.get(linkId) || [];
  }, [linkTags]);

  // Open all links in new tabs
  const handleOpenAll = () => {
    links.forEach((link) => {
      window.open(link.url, "_blank", "noopener,noreferrer");
    });
  };

  // Copy all URLs
  const handleCopyAllUrls = () => {
    const urls = links.map((link) => link.url).join("\n");
    navigator.clipboard.writeText(urls);
  };

  // Show drop indicator when dragging over this category from another
  const showDropIndicator = isDragActiveOverThis || isOver;

  if (links.length === 0 && !isDragActiveOverThis) return null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border rounded-lg overflow-hidden bg-card/50 group transition-colors duration-200",
        showDropIndicator
          ? "border-primary/60 bg-primary/5 ring-1 ring-primary/30"
          : "border-border/50",
        className
      )}
    >
      {/* Category Header */}
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
        {/* Clickable area for collapse */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleCategoryCollapsed(categoryId);
          }}
          className={cn(
            "flex-1 flex items-center gap-3 text-left",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm"
          )}
          aria-expanded={!isCollapsed}
          aria-controls={`category-content-${categoryId}`}
        >
          {/* Collapse indicator */}
          <motion.div
            initial={false}
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: reduceMotion ? 0 : 0.15 }}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </motion.div>

          {/* Color indicator */}
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", colorClass)} />

          {/* Folder icon */}
          {isCollapsed ? (
            <Folder className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          ) : (
            <FolderOpen className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}

          {/* Category name */}
          <span className="font-medium text-sm flex-1 truncate">
            {categoryName}
          </span>

          {/* Link count */}
          <Badge variant="secondary">
            {links.length === 1 ? t("categorySection.linkCount") : t("categorySection.linkCountPlural", { count: links.length })}
          </Badge>
        </button>

        {/* Actions dropdown - outside the button */}
        {links.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
                title={t("categorySection.moreOptions")}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenAll}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("categorySection.openAll", { count: links.length })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyAllUrls}>
                <Copy className="w-4 h-4 mr-2" />
                {t("categorySection.copyAllUrls")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Links list */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id={`category-content-${categoryId}`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden will-change-[height,opacity]"
          >
            <div className="border-t border-border/50">
              <SortableContext
                items={sortedLinks.map((l) => l.id)}
                strategy={verticalListSortingStrategy}
              >
                {sortedLinks.map((link) => (
                  <SortableLinkListItem
                    key={link.id}
                    link={link}
                    linkTagIds={getLinkTagIds(link.id)}
                  />
                ))}
              </SortableContext>

              {/* Drop zone indicator for empty categories during drag */}
              {sortedLinks.length === 0 && isDragActiveOverThis && (
                <div className="flex items-center justify-center py-6 text-sm text-primary/70">
                  {t("categorySection.dropToMove")}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop indicator on collapsed categories */}
      {isCollapsed && showDropIndicator && (
        <div className="border-t border-primary/30 px-4 py-2 text-xs text-primary/70 text-center">
          {t("categorySection.dropHere")}
        </div>
      )}
    </div>
  );
}
