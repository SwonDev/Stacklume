"use client";

import { useMemo, useState } from "react";
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
import { SortableLinkListItem, LinkListItemContent } from "./LinkListItem";
import { useListViewStore } from "@/stores/list-view-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useLinksStore } from "@/stores/links-store";
import type { Link, Category, LinkTag } from "@/lib/db/schema";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface CategorySectionProps {
  category: Category | null; // null = uncategorized
  links: Link[];
  linkTags: LinkTag[];
  className?: string;
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
}: CategorySectionProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const isCategoryCollapsed = useListViewStore((state) => state.isCategoryCollapsed);
  const toggleCategoryCollapsed = useListViewStore((state) => state.toggleCategoryCollapsed);
  const reorderLinks = useLinksStore((state) => state.reorderLinks);

  // Drag state
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);

  const categoryId = category?.id || "uncategorized";
  const isCollapsed = isCategoryCollapsed(categoryId);
  const categoryName = category?.name || "Sin categoria";
  const categoryColor = category?.color || "gray";
  const colorClass = categoryColorClasses[categoryColor] || "bg-gray-500";

  // Sort links by order field
  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [links]);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveLinkId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLinkId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedLinks.findIndex((l) => l.id === active.id);
      const newIndex = sortedLinks.findIndex((l) => l.id === over.id);
      const newOrder = arrayMove(sortedLinks, oldIndex, newIndex);
      const orderedIds = newOrder.map((l) => l.id);
      reorderLinks(orderedIds, category?.id || null);
    }
  };

  const handleDragCancel = () => {
    setActiveLinkId(null);
  };

  // Get active link for overlay
  const activeLink = activeLinkId
    ? sortedLinks.find((l) => l.id === activeLinkId)
    : null;

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

  if (links.length === 0) return null;

  return (
    <div className={cn("border border-border/50 rounded-lg overflow-hidden bg-card/50 group", className)}>
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
            {links.length} {links.length === 1 ? "enlace" : "enlaces"}
          </Badge>
        </button>

        {/* Actions dropdown - outside the button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity flex-shrink-0"
              title="Mas opciones"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleOpenAll}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir todos ({links.length})
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyAllUrls}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar todas las URLs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Links list with drag and drop */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            id={`category-content-${categoryId}`}
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
              >
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

                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeLink ? (
                    <LinkListItemContent
                      link={activeLink}
                      linkTagIds={getLinkTagIds(activeLink.id)}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
