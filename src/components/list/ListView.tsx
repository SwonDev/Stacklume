"use client";

import { useMemo, useState, useCallback, useDeferredValue, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Link2Off, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { fuzzySearch } from "@/lib/fuzzy-search";
import { ListViewToolbar } from "./ListViewToolbar";
import { SortableCategorySection } from "./CategorySection";
import { LinkListItemContent } from "./LinkListItem";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useListViewStore } from "@/stores/list-view-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";
import type { Link, Category, LinkTag } from "@/lib/db/schema";
import { CategorySectionContent } from "./CategorySection";

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
  SortableContext,
  verticalListSortingStrategy,
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
  const reorderCategories = useLinksStore((state) => state.reorderCategories);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const sortBy = useListViewStore((state) => state.sortBy);
  const sortOrder = useListViewStore((state) => state.sortOrder);
  const categorySortBy = useListViewStore((state) => state.categorySortBy);
  const categorySortOrder = useListViewStore((state) => state.categorySortOrder);
  const showEmptyCategories = useListViewStore((state) => state.showEmptyCategories);
  const showUncategorized = useListViewStore((state) => state.showUncategorized);
  const uncategorizedPosition = useListViewStore((state) => state.uncategorizedPosition);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const deferredSearch = useDeferredValue(searchQuery);

  // Auto-collapse categories when there are many links to keep DOM lightweight
  const autoCollapsedRef = useRef(false);
  useEffect(() => {
    if (autoCollapsedRef.current || links.length < 150 || categories.length < 5) return;
    autoCollapsedRef.current = true;
    const store = useListViewStore.getState();
    // Only auto-collapse if user hasn't manually configured collapsed state
    if (store.collapsedCategories.length === 0) {
      // Collapse all except the first 3 categories
      const allCatIds = categories.map(c => c.id);
      const toCollapse = allCatIds.slice(3);
      if (toCollapse.length > 0) {
        store.collapseAll(toCollapse);
      }
    }
  }, [links.length, categories]);

  // Drag state
  const [activeLinkId, setActiveLinkId] = useState<string | null>(null);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
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

    if (activeFilter.type === "category") {
      const ids = activeFilter.ids && activeFilter.ids.length > 0
        ? activeFilter.ids
        : activeFilter.id ? [activeFilter.id] : [];
      if (ids.length > 0) {
        const hasUncategorized = ids.includes("__uncategorized__");
        const realIds = ids.filter((id) => id !== "__uncategorized__");
        result = result.filter((link: Link) => {
          if (hasUncategorized && !link.categoryId) return true;
          if (realIds.length > 0 && link.categoryId && realIds.includes(link.categoryId)) return true;
          return false;
        });
      }
    }
    if (activeFilter.type === "tag") {
      const ids = activeFilter.ids && activeFilter.ids.length > 0
        ? activeFilter.ids
        : activeFilter.id ? [activeFilter.id] : [];
      if (ids.length > 0) {
        const tagLinkIds = new Set(
          linkTags
            .filter((lt: LinkTag) => ids.includes(lt.tagId))
            .map((lt: LinkTag) => lt.linkId)
        );
        result = result.filter((link: Link) => tagLinkIds.has(link.id));
      }
    }
    if (activeFilter.type === "favorites") {
      result = result.filter((link: Link) => link.isFavorite);
    }
    if (activeFilter.type === "readingStatus" && activeFilter.id) {
      const statusId = activeFilter.id;
      result = result.filter((link: Link) => (link.readingStatus ?? "inbox") === statusId);
    }
    if (deferredSearch.trim()) {
      result = fuzzySearch(
        result,
        deferredSearch,
        (link: Link) => [
          link.title,
          link.url,
          link.description ?? "",
        ].filter(Boolean)
      );
    }

    result.sort((a: Link, b: Link) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "createdAt") {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "updatedAt") {
        comparison =
          new Date(a.updatedAt || a.createdAt).getTime() -
          new Date(b.updatedAt || b.createdAt).getTime();
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [links, activeFilter, deferredSearch, linkTags, sortBy, sortOrder]);

  // Group links by category
  const linksByCategory = useMemo(() => {
    const grouped = new Map<string | null, Link[]>();
    categories.forEach((cat: Category) => {
      grouped.set(cat.id, []);
    });
    grouped.set(null, []);
    filteredLinks.forEach((link: Link) => {
      const categoryId = link.categoryId;
      const arr = grouped.get(categoryId);
      if (arr) {
        arr.push(link);
      } else {
        grouped.set(categoryId, [link]);
      }
    });
    return grouped;
  }, [filteredLinks, categories]);

  // Get sorted real categories based on categorySortBy
  const sortedCategories = useMemo(() => {
    const cats = [...categories];

    if (categorySortBy === "manual") {
      cats.sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0));
    } else if (categorySortBy === "alphabetical") {
      cats.sort((a: Category, b: Category) => a.name.localeCompare(b.name));
    } else if (categorySortBy === "linkCount") {
      cats.sort((a: Category, b: Category) => {
        const aCount = (linksByCategory.get(a.id) || []).length;
        const bCount = (linksByCategory.get(b.id) || []).length;
        return aCount - bCount;
      });
    } else if (categorySortBy === "lastUsed") {
      cats.sort((a: Category, b: Category) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return aTime - bTime;
      });
    }

    if (categorySortOrder === "desc") {
      cats.reverse();
    }

    return cats;
  }, [categories, categorySortBy, categorySortOrder, linksByCategory]);

  // Build combined sortable IDs: real categories + uncategorized at stored position
  const sortableCategoryIds = useMemo(() => {
    const ids = sortedCategories.map((c: Category) => `category-${c.id}`);
    if (showUncategorized) {
      const pos = Math.min(uncategorizedPosition, ids.length);
      ids.splice(pos >= 0 ? pos : ids.length, 0, "category-uncategorized");
    }
    return ids;
  }, [sortedCategories, showUncategorized, uncategorizedPosition]);

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
      const arr = tagMap.get(lt.linkId);
      if (arr) {
        arr.push(lt.tagId);
      } else {
        tagMap.set(lt.linkId, [lt.tagId]);
      }
    });
    return (linkId: string) => tagMap.get(linkId) || [];
  }, [filteredLinkTags]);

  // Resolve which categoryId the "over" element belongs to
  const resolveTargetCategory = useCallback((overId: string): string | null | undefined => {
    if (overId.startsWith("droppable-")) {
      const catId = overId.replace("droppable-", "");
      return catId === "uncategorized" ? null : catId;
    }
    return linkCategoryMap.get(overId);
  }, [linkCategoryMap]);

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const activeId = event.active.id as string;

    if (activeId.startsWith("category-")) {
      setActiveCategoryId(activeId.replace("category-", ""));
      setActiveLinkId(null);
    } else {
      setActiveLinkId(activeId);
      setActiveCategoryId(null);
    }
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    if (!over || activeCategoryId) {
      if (!activeCategoryId) setOverCategoryId(undefined);
      return;
    }
    const targetCat = resolveTargetCategory(over.id as string);
    setOverCategoryId(targetCat);
  }, [resolveTargetCategory, activeCategoryId]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    const wasDraggingCategory = activeCategoryId !== null;

    setActiveLinkId(null);
    setActiveCategoryId(null);
    setOverCategoryId(undefined);

    if (!over) return;

    // Category reorder
    if (wasDraggingCategory) {
      const activeId = active.id as string;
      const rawOverId = over.id as string;

      // Resolve over ID to a category sortable ID
      let resolvedOverId: string | null = null;
      if (rawOverId.startsWith("category-")) {
        resolvedOverId = rawOverId;
      } else if (rawOverId.startsWith("droppable-")) {
        const catId = rawOverId.replace("droppable-", "");
        resolvedOverId = `category-${catId}`;
      } else {
        const linkCat = linkCategoryMap.get(rawOverId);
        if (linkCat !== undefined) {
          resolvedOverId = linkCat ? `category-${linkCat}` : "category-uncategorized";
        }
      }

      if (!resolvedOverId || activeId === resolvedOverId) return;

      const oldIndex = sortableCategoryIds.indexOf(activeId);
      const newIndex = sortableCategoryIds.indexOf(resolvedOverId);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrderIds = arrayMove([...sortableCategoryIds], oldIndex, newIndex);

        // Separate real category IDs from uncategorized, track position
        const realCategoryIds: string[] = [];
        let newUncatPos = newOrderIds.length;
        newOrderIds.forEach((id, idx) => {
          if (id === "category-uncategorized") {
            newUncatPos = idx;
          } else {
            realCategoryIds.push(id.replace("category-", ""));
          }
        });

        // Persist real category order via API
        reorderCategories(realCategoryIds);
        // Persist uncategorized position in localStorage
        useListViewStore.getState().setUncategorizedPosition(newUncatPos);

        if (categorySortBy !== "manual") {
          useListViewStore.getState().setCategorySortBy("manual");
        }
      }
      return;
    }

    // Link drag (existing logic)
    const draggedLinkId = active.id as string;
    const sourceCategoryId = linkCategoryMap.get(draggedLinkId);
    if (sourceCategoryId === undefined) return;

    const overId = over.id as string;
    if (overId.startsWith("category-")) return;

    const targetCategoryId = resolveTargetCategory(overId);
    if (targetCategoryId === undefined) return;

    const isDroppableContainer = overId.startsWith("droppable-");

    if (sourceCategoryId === targetCategoryId) {
      if (isDroppableContainer) return;
      const categoryLinks = linksByCategory.get(targetCategoryId) || [];
      const sorted = [...categoryLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const oldIndex = sorted.findIndex((l) => l.id === draggedLinkId);
      const newIndex = sorted.findIndex((l) => l.id === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newOrder = arrayMove(sorted, oldIndex, newIndex);
        reorderLinks(newOrder.map((l) => l.id), targetCategoryId);
      }
    } else {
      updateLink(draggedLinkId, { categoryId: targetCategoryId });

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
        updateLink(draggedLinkId, { categoryId: sourceCategoryId });
        return;
      }

      const targetLinks = linksByCategory.get(targetCategoryId) || [];
      const sorted = [...targetLinks].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const existingIds = sorted.map((l) => l.id);

      if (!isDroppableContainer) {
        const insertIndex = existingIds.indexOf(overId);
        if (insertIndex !== -1) {
          existingIds.splice(insertIndex, 0, draggedLinkId);
        } else {
          existingIds.push(draggedLinkId);
        }
      } else {
        existingIds.push(draggedLinkId);
      }

      reorderLinks(existingIds, targetCategoryId);
    }
  }, [activeCategoryId, linkCategoryMap, linksByCategory, resolveTargetCategory, updateLink, reorderLinks, reorderCategories, sortableCategoryIds, categorySortBy]);

  const handleDragCancel = useCallback(() => {
    setActiveLinkId(null);
    setActiveCategoryId(null);
    setOverCategoryId(undefined);
  }, []);

  // Get the active link for overlay
  const activeLink = activeLinkId
    ? filteredLinks.find((l) => l.id === activeLinkId)
    : null;

  // Get the active category for overlay (supports real categories + uncategorized)
  const activeDragCategory = useMemo(() => {
    if (!activeCategoryId) return null;
    if (activeCategoryId === "uncategorized") return null; // null = uncategorized marker
    return categories.find((c) => c.id === activeCategoryId) ?? null;
  }, [activeCategoryId, categories]);

  // Is uncategorized being dragged?
  const isDraggingUncategorized = activeCategoryId === "uncategorized";

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

  // Build a lookup for categories by ID (for rendering from sortableCategoryIds)
  const categoryMap = new Map(sortedCategories.map(c => [c.id, c]));

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <ListViewToolbar
        categoryIds={categoryIds}
        totalLinks={links.length}
        filteredLinks={filteredLinks.length}
        className="flex-shrink-0 mb-3"
      />

      <div className="flex-1">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="space-y-3 pb-4">
            <SortableContext
              items={sortableCategoryIds}
              strategy={verticalListSortingStrategy}
            >
              {sortableCategoryIds.map((sortableId) => {
                if (sortableId === "category-uncategorized") {
                  // Uncategorized section
                  return (
                    <SortableCategorySection
                      key="uncategorized"
                      category={null}
                      links={linksByCategory.get(null) || []}
                      linkTags={filteredLinkTags}
                      isDragActiveOverThis={activeLinkId !== null && overCategoryId === null && linkCategoryMap.get(activeLinkId) !== null}
                      isCategoryDragActive={activeCategoryId !== null}
                    />
                  );
                }

                const catId = sortableId.replace("category-", "");
                const category = categoryMap.get(catId);
                if (!category) return null;

                const categoryLinks = linksByCategory.get(category.id) || [];
                if (categoryLinks.length === 0 && !showEmptyCategories && overCategoryId !== category.id) {
                  return null;
                }

                return (
                  <SortableCategorySection
                    key={category.id}
                    category={category}
                    links={categoryLinks}
                    linkTags={filteredLinkTags}
                    isDragActiveOverThis={activeLinkId !== null && overCategoryId === category.id && linkCategoryMap.get(activeLinkId) !== category.id}
                    isCategoryDragActive={activeCategoryId !== null}
                  />
                );
              })}
            </SortableContext>
          </div>

          {/* Drag overlays */}
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
            ) : (activeDragCategory || isDraggingUncategorized) ? (
              <CategorySectionContent
                category={activeDragCategory}
                links={activeDragCategory
                  ? (linksByCategory.get(activeDragCategory.id) || [])
                  : (linksByCategory.get(null) || [])
                }
                linkTags={[]}
                isOverlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
