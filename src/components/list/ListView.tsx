"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { Link2Off, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListViewToolbar } from "./ListViewToolbar";
import { CategorySection } from "./CategorySection";
import { LinkListItemContent } from "./LinkListItem";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useListViewStore } from "@/stores/list-view-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";
import type { Link, Category, LinkTag } from "@/lib/db/schema";

// dnd-kit imports
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

interface ListViewProps {
  className?: string;
}

export function ListView({ className }: ListViewProps) {
  const { t } = useTranslation();
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const linkTags = useLinksStore((state) => state.linkTags);
  const isLoading = useLinksStore((state) => state.isLoading);
  const updateLink = useLinksStore((state) => state.updateLink);
  const reorderLinks = useLinksStore((state) => state.reorderLinks);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const sortBy = useListViewStore((state) => state.sortBy);
  const sortOrder = useListViewStore((state) => state.sortOrder);
  const showEmptyCategories = useListViewStore((state) => state.showEmptyCategories);
  const showUncategorized = useListViewStore((state) => state.showUncategorized);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  // Drag state
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [overCategoryId, setOverCategoryId] = useState<string | null | undefined>(undefined);

  // Sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter links based on active filter and search
  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Apply category filter
    if (activeFilter.type === "category" && activeFilter.id) {
      result = result.filter((link: Link) => link.categoryId === activeFilter.id);
    }

    // Apply tag filter
    if (activeFilter.type === "tag" && activeFilter.id) {
      const tagLinkIds = linkTags
        .filter((lt: LinkTag) => lt.tagId === activeFilter.id)
        .map((lt: LinkTag) => lt.linkId);
      result = result.filter((link: Link) => tagLinkIds.includes(link.id));
    }

    // Apply favorites filter
    if (activeFilter.type === "favorites") {
      result = result.filter((link: Link) => link.isFavorite);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (link: Link) =>
          link.title.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a: Link, b: Link) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "createdAt") {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "updatedAt") {
        comparison =
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime();
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });

    return result;
  }, [links, activeFilter, searchQuery, linkTags, sortBy, sortOrder]);

  // Group links by category
  const linksByCategory = useMemo(() => {
    const grouped = new Map<string | null, Link[]>();

    // Initialize with all categories
    categories.forEach((cat: Category) => {
      grouped.set(cat.id, []);
    });
    grouped.set(null, []); // Uncategorized

    // Group filtered links
    filteredLinks.forEach((link: Link) => {
      const categoryId = link.categoryId;
      const existing = grouped.get(categoryId) || [];
      grouped.set(categoryId, [...existing, link]);
    });

    return grouped;
  }, [filteredLinks, categories]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0));
  }, [categories]);

  // Get category IDs for collapse/expand
  const categoryIds = useMemo(() => {
    const ids = sortedCategories.map((c: Category) => c.id);
    if (showUncategorized) ids.push("uncategorized");
    return ids;
  }, [sortedCategories, showUncategorized]);

  // Get link tags for filtered links
  const filteredLinkTags = useMemo(() => {
    const filteredLinkIds = new Set(filteredLinks.map((l: Link) => l.id));
    return linkTags.filter((lt: LinkTag) => filteredLinkIds.has(lt.linkId));
  }, [filteredLinks, linkTags]);

  // Build a map: linkId -> categoryId for quick lookup
  const linkCategoryMap = useMemo(() => {
    const map = new Map<string, string | null>();
    filteredLinks.forEach((l) => map.set(l.id, l.categoryId));
    return map;
  }, [filteredLinks]);

  // Get tag IDs for a link (used by DragOverlay)
  const getLinkTagIds = useMemo(() => {
    const tagMap = new Map<string, string[]>();
    filteredLinkTags.forEach((lt) => {
      const existing = tagMap.get(lt.linkId) || [];
      tagMap.set(lt.linkId, [...existing, lt.tagId]);
    });
    return (linkId: string) => tagMap.get(linkId) || [];
  }, [filteredLinkTags]);

  // Resolve which categoryId the "over" element belongs to
  const resolveTargetCategory = useCallback((overId: string): string | null | undefined => {
    // Check if it's a droppable container
    if (overId.startsWith("droppable-")) {
      const catId = overId.replace("droppable-", "");
      return catId === "uncategorized" ? null : catId;
    }
    // It's a link - look up its category
    return linkCategoryMap.get(overId);
  }, [linkCategoryMap]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveLinkId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over) {
      setOverCategoryId(undefined);
      return;
    }
    const targetCat = resolveTargetCategory(over.id as string);
    setOverCategoryId(targetCat);
  }, [resolveTargetCategory]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveLinkId(null);
    setOverCategoryId(undefined);

    if (!over) return;

    const draggedLinkId = active.id as string;
    const sourceCategoryId = linkCategoryMap.get(draggedLinkId);
    if (sourceCategoryId === undefined) return; // link not found

    const overId = over.id as string;
    const targetCategoryId = resolveTargetCategory(overId);
    if (targetCategoryId === undefined) return;

    const isDroppableContainer = overId.startsWith("droppable-");

    if (sourceCategoryId === targetCategoryId) {
      // Same category → reorder within
      if (isDroppableContainer) return; // dropped on own category header, nothing to do
      const categoryLinks = linksByCategory.get(targetCategoryId) || [];
      const sorted = [...categoryLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const oldIndex = sorted.findIndex((l) => l.id === draggedLinkId);
      const newIndex = sorted.findIndex((l) => l.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(sorted, oldIndex, newIndex);
        reorderLinks(newOrder.map((l) => l.id), targetCategoryId);
      }
    } else {
      // Cross-category move
      // 1. Update category in local state immediately
      updateLink(draggedLinkId, { categoryId: targetCategoryId });

      // 2. Persist category change via API
      try {
        await fetch(`/api/links/${draggedLinkId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ categoryId: targetCategoryId }),
        });
      } catch (error) {
        console.error("Error moving link to category:", error);
        // Revert on error
        updateLink(draggedLinkId, { categoryId: sourceCategoryId });
        return;
      }

      // 3. Build new order for target category
      const targetLinks = linksByCategory.get(targetCategoryId) || [];
      const sorted = [...targetLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const existingIds = sorted.map((l) => l.id);

      if (!isDroppableContainer) {
        // Dropped on a specific link → insert at that position
        const insertIndex = existingIds.indexOf(overId);
        if (insertIndex !== -1) {
          existingIds.splice(insertIndex, 0, draggedLinkId);
        } else {
          existingIds.push(draggedLinkId);
        }
      } else {
        // Dropped on category container → append at end
        existingIds.push(draggedLinkId);
      }

      reorderLinks(existingIds, targetCategoryId);
    }
  }, [linkCategoryMap, linksByCategory, resolveTargetCategory, updateLink, reorderLinks]);

  const handleDragCancel = useCallback(() => {
    setActiveLinkId(null);
    setOverCategoryId(undefined);
  }, []);

  // Get the active link for overlay
  const activeLink = activeLinkId
    ? filteredLinks.find((l) => l.id === activeLinkId)
    : null;

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">{t("listView.loading")}</p>
        </div>
      </div>
    );
  }

  // Empty state - no links at all
  if (links.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ListViewToolbar
          categoryIds={categoryIds}
          totalLinks={links.length}
          filteredLinks={filteredLinks.length}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Link2Off className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t("listView.noLinks")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("listView.noLinksDescription")}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Empty state - no matches for filter
  if (filteredLinks.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ListViewToolbar
          categoryIds={categoryIds}
          totalLinks={links.length}
          filteredLinks={filteredLinks.length}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">{t("listView.noResults")}</h3>
            <p className="text-sm text-muted-foreground">
              {t("listView.noResultsDescription")}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <ListViewToolbar
        categoryIds={categoryIds}
        totalLinks={links.length}
        filteredLinks={filteredLinks.length}
        className="flex-shrink-0 mb-3"
      />

      {/* Scrollable content with unified DndContext */}
      <ScrollArea className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-3 pb-4">
            {/* Render categories in order */}
            {sortedCategories.map((category: Category) => {
              const categoryLinks = linksByCategory.get(category.id) || [];

              // Skip empty categories if not showing them (unless drag is active over this category)
              if (categoryLinks.length === 0 && !showEmptyCategories && overCategoryId !== category.id) {
                return null;
              }

              return (
                <CategorySection
                  key={category.id}
                  category={category}
                  links={categoryLinks}
                  linkTags={filteredLinkTags}
                  isDragActiveOverThis={activeLinkId !== null && overCategoryId === category.id && linkCategoryMap.get(activeLinkId) !== category.id}
                />
              );
            })}

            {/* Uncategorized section */}
            {showUncategorized && (
              <CategorySection
                category={null}
                links={linksByCategory.get(null) || []}
                linkTags={filteredLinkTags}
                isDragActiveOverThis={activeLinkId !== null && overCategoryId === null && linkCategoryMap.get(activeLinkId) !== null}
              />
            )}
          </div>

          {/* Single DragOverlay for the entire list */}
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
      </ScrollArea>
    </div>
  );
}
