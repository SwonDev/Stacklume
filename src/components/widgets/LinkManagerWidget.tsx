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
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";
import { LinkManagerList } from "./link-manager/LinkManagerList";
import { LinkManagerGrid } from "./link-manager/LinkManagerGrid";
import { LinkManagerTable } from "./link-manager/LinkManagerTable";

interface LinkManagerWidgetProps {
  widget: Widget;
}

type ViewMode = "list" | "grid" | "table";
type SortBy = "createdAt" | "title" | "updatedAt";
type SortOrder = "asc" | "desc";

export function LinkManagerWidget({ widget: _widget }: LinkManagerWidgetProps) {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDeferredValue(searchQuery);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
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
  const _updateWidget = useWidgetStore((state) => state.updateWidget);

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
            placeholder="Buscar enlaces..."
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
              Filtros
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filtrar por</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuCheckboxItem
              checked={showFavoritesOnly}
              onCheckedChange={setShowFavoritesOnly}
            >
              Solo favoritos
            </DropdownMenuCheckboxItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Categoría</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={categoryFilter || ""} onValueChange={(v) => setCategoryFilter(v || null)}>
              <DropdownMenuRadioItem value="">Todas</DropdownMenuRadioItem>
              {categories.map((cat) => (
                <DropdownMenuRadioItem key={cat.id} value={cat.id}>
                  {cat.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Etiqueta</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={tagFilter || ""} onValueChange={(v) => setTagFilter(v || null)}>
              <DropdownMenuRadioItem value="">Todas</DropdownMenuRadioItem>
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
              Ordenar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <DropdownMenuRadioItem value="createdAt">Fecha creación</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updatedAt">Fecha actualización</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">Título</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={sortOrder} onValueChange={(v) => setSortOrder(v as SortOrder)}>
              <DropdownMenuRadioItem value="asc">Ascendente</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="desc">Descendente</DropdownMenuRadioItem>
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
            title="Vista de lista"
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("grid")}
            title="Vista de cuadrícula"
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setViewMode("table")}
            title="Vista de tabla"
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

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 p-3 border-t border-border/50 bg-primary/10">
          <span className="text-sm font-medium">
            {selectedIds.size} enlace{selectedIds.size > 1 ? "s" : ""} seleccionado{selectedIds.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                // TODO: Implement bulk actions
                console.log("Bulk action with:", Array.from(selectedIds));
              }}
            >
              Acciones
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
