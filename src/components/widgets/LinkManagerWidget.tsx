"use client";

import { useState, useMemo, useCallback, useDeferredValue } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  MeasuringStrategy,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { arrayMove } from "@dnd-kit/sortable";
import { Search, Filter, SortAsc, Grid3x3, List, Table as TableIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/i18n";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";
import { LinkManagerList } from "./link-manager/LinkManagerList";
import { LinkManagerGrid } from "./link-manager/LinkManagerGrid";
import { LinkManagerTable } from "./link-manager/LinkManagerTable";
import { BulkActionsBar } from "./link-manager/BulkActionsBar";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { toast } from "sonner";

interface LinkManagerWidgetProps {
  widget: Widget;
}

type ViewMode = "list" | "grid" | "table";
type SortBy = "createdAt" | "title" | "updatedAt";
type SortOrder = "asc" | "desc";

export function LinkManagerWidget({ widget: _widget }: LinkManagerWidgetProps) {
  const { t } = useTranslation();
  const defaultSortField = useSettingsStore((state) => state.defaultSortField);
  const defaultSortOrder = useSettingsStore((state) => state.defaultSortOrder);

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDeferredValue(searchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>((defaultSortField === "order" ? "createdAt" : defaultSortField) as SortBy);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder as SortOrder);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Store data
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const reorderLinks = useLinksStore((state) => state.reorderLinks);
  const openEditLinkModal = useLinksStore((state) => state.openEditLinkModal);
  const refreshAllData = useLinksStore((state) => state.refreshAllData);

  // Create linkTags map for quick lookup
  const linkTagsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    linkTags.forEach(({ linkId, tagId }) => {
      const existing = map.get(linkId) || [];
      existing.push(tagId);
      map.set(linkId, existing);
    });
    return map;
  }, [linkTags]);

  // Filter and sort links
  const filteredAndSortedLinks = useMemo(() => {
    let filtered = [...links];

    // Apply search filter
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase();
      filtered = filtered.filter(
        (link) =>
          link.title.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter) {
      filtered = filtered.filter((link) => link.categoryId === categoryFilter);
    }

    // Apply tag filter
    if (tagFilter) {
      filtered = filtered.filter((link) => {
        const linkTagIds = linkTagsMap.get(link.id) || [];
        return linkTagIds.includes(tagFilter);
      });
    }

    // Apply favorites filter
    if (showFavoritesOnly) {
      filtered = filtered.filter((link) => link.isFavorite);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "updatedAt":
          comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
          break;
        case "createdAt":
        default:
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }

      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [links, debouncedSearch, categoryFilter, tagFilter, showFavoritesOnly, sortBy, sortOrder, linkTagsMap]);

  // DnD sensors with reduced activation distance for better precision in small widgets
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Reduced from 8px for better precision
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // Small delay to differentiate from scroll
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Measuring configuration for accurate drop zone calculation
  const measuringConfig = {
    droppable: {
      strategy: MeasuringStrategy.Always,
    },
  };

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over || active.id === over.id) return;

      const oldIndex = filteredAndSortedLinks.findIndex((l) => l.id === active.id);
      const newIndex = filteredAndSortedLinks.findIndex((l) => l.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(filteredAndSortedLinks, oldIndex, newIndex);
      const orderedIds = reordered.map((l) => l.id);

      // Call reorderLinks with the new order and current category filter
      await reorderLinks(orderedIds, categoryFilter);
    },
    [filteredAndSortedLinks, reorderLinks, categoryFilter]
  );

  // Handle selection
  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredAndSortedLinks.map((l) => l.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [filteredAndSortedLinks]);

  // Handle edit
  const handleEdit = useCallback((link: Link) => {
    openEditLinkModal(link);
  }, [openEditLinkModal]);

  // Bulk action handlers
  const handleBulkMoveToCategory = useCallback(async (categoryId: string | null) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ categoryId }),
          })
        )
      );
      await refreshAllData();
      toast.success(`${ids.length} enlace${ids.length > 1 ? "s" : ""} movido${ids.length > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error al mover los enlaces");
    }
  }, [selectedIds, refreshAllData]);

  const handleBulkManageTags = useCallback(async (action: "add" | "remove", tagIds: string[]) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.flatMap((linkId) =>
          tagIds.map((tagId) =>
            action === "add"
              ? fetch("/api/tags/link", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                  credentials: "include",
                  body: JSON.stringify({ linkId, tagId }),
                })
              : fetch(`/api/tags/link?linkId=${linkId}&tagId=${tagId}`, {
                  method: "DELETE",
                  headers: getCsrfHeaders(),
                  credentials: "include",
                })
          )
        )
      );
      await refreshAllData();
      toast.success(`Etiquetas ${action === "add" ? "añadidas a" : "eliminadas de"} ${ids.length} enlace${ids.length > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error al gestionar las etiquetas");
    }
  }, [selectedIds, refreshAllData]);

  const handleBulkToggleFavorites = useCallback(async (isFavorite: boolean) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ isFavorite }),
          })
        )
      );
      await refreshAllData();
      toast.success(`${ids.length} enlace${ids.length > 1 ? "s" : ""} ${isFavorite ? "marcado" : "desmarcado"}${ids.length > 1 ? "s" : ""} como favorito${ids.length > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error al actualizar favoritos");
    }
  }, [selectedIds, refreshAllData]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "DELETE",
            headers: getCsrfHeaders(),
            credentials: "include",
          })
        )
      );
      await refreshAllData();
      toast.success(`${ids.length} enlace${ids.length > 1 ? "s" : ""} eliminado${ids.length > 1 ? "s" : ""}`);
      setSelectedIds(new Set());
    } catch {
      toast.error("Error al eliminar los enlaces");
    }
  }, [selectedIds, refreshAllData]);

  // Get active link for drag overlay
  const activeLink = useMemo(() => {
    return activeId ? links.find((l) => l.id === activeId) : null;
  }, [activeId, links]);

  return (
    <div className="@container flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-border/50 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("linkManager.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filter dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="w-4 h-4 mr-2" />
              {t("linkManager.filters")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t("linkManager.filterBy")}</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={showFavoritesOnly}
              onCheckedChange={setShowFavoritesOnly}
            >
              {t("linkManager.favoritesOnly")}
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("linkManager.category")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={categoryFilter || ""} onValueChange={(v) => setCategoryFilter(v || null)}>
              <DropdownMenuRadioItem value="">{t("linkManager.all")}</DropdownMenuRadioItem>
              {categories.map((cat) => (
                <DropdownMenuRadioItem key={cat.id} value={cat.id}>
                  {cat.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("linkManager.tag")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={tagFilter || ""} onValueChange={(v) => setTagFilter(v || null)}>
              <DropdownMenuRadioItem value="">{t("linkManager.all")}</DropdownMenuRadioItem>
              {tags.map((tag) => (
                <DropdownMenuRadioItem key={tag.id} value={tag.id}>
                  {tag.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <SortAsc className="w-4 h-4 mr-2" />
              {t("linkManager.sort")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{t("linkManager.sortBy")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <DropdownMenuRadioItem value="createdAt">{t("linkManager.dateCreated")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updatedAt">{t("linkManager.dateUpdated")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">{t("linkManager.titleLabel")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <DropdownMenuRadioItem value="asc">{t("linkManager.ascending")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">{t("linkManager.descending")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* View mode toggles */}
        <div className="flex items-center gap-1 border border-border rounded-md p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("list")}
            title={t("linkManager.listView")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("grid")}
            title={t("linkManager.gridView")}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("table")}
            title={t("linkManager.tableView")}
          >
            <TableIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          measuring={measuringConfig}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {viewMode === "list" && (
            <LinkManagerList
              links={filteredAndSortedLinks}
              linkTagsMap={linkTagsMap}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
            />
          )}

          {viewMode === "grid" && (
            <LinkManagerGrid
              links={filteredAndSortedLinks}
              linkTagsMap={linkTagsMap}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
            />
          )}

          {viewMode === "table" && (
            <LinkManagerTable
              links={filteredAndSortedLinks}
              linkTagsMap={linkTagsMap}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={handleEdit}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={(column) => {
                if (sortBy === column) {
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                } else {
                  setSortBy(column as SortBy);
                  setSortOrder("desc");
                }
              }}
            />
          )}

          <DragOverlay dropAnimation={null}>
            {activeLink && (
              <div className="bg-card border border-primary/50 rounded-md shadow-xl p-2 opacity-95 max-w-[200px]">
                <div className="flex items-center gap-2">
                  {activeLink.faviconUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeLink.faviconUrl}
                      alt=""
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded-sm bg-muted flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate">{activeLink.title}</span>
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <BulkActionsBar
        selectedCount={selectedIds.size}
        onMoveToCategory={handleBulkMoveToCategory}
        onManageTags={handleBulkManageTags}
        onToggleFavorites={handleBulkToggleFavorites}
        onDelete={handleBulkDelete}
        onClearSelection={() => setSelectedIds(new Set())}
        categories={categories}
        tags={tags}
      />
    </div>
  );
}
