"use client";

import { useMemo } from "react";
import {
  Search,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronsUpDown,
  ChevronsDownUp,
  Filter,
  Tag,
  Folder,
  Star,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TagBadge } from "@/components/ui/tag-badge";
import { useListViewStore, type SortBy, type SortOrder } from "@/stores/list-view-store";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import type { Category, Tag as TagType } from "@/lib/db/schema";

interface ListViewToolbarProps {
  className?: string;
  categoryIds: string[];
  totalLinks: number;
  filteredLinks: number;
}

const sortByLabels: Record<SortBy, string> = {
  createdAt: "Fecha de creacion",
  updatedAt: "Ultima actualizacion",
  title: "Titulo",
};

export function ListViewToolbar({
  className,
  categoryIds,
  totalLinks,
  filteredLinks,
}: ListViewToolbarProps) {
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const setActiveFilter = useLayoutStore((state) => state.setActiveFilter);
  const setSearchQuery = useLayoutStore((state) => state.setSearchQuery);
  const sortBy = useListViewStore((state) => state.sortBy);
  const sortOrder = useListViewStore((state) => state.sortOrder);
  const showEmptyCategories = useListViewStore((state) => state.showEmptyCategories);
  const showUncategorized = useListViewStore((state) => state.showUncategorized);
  const setSortBy = useListViewStore((state) => state.setSortBy);
  const setSortOrder = useListViewStore((state) => state.setSortOrder);
  const setShowEmptyCategories = useListViewStore((state) => state.setShowEmptyCategories);
  const setShowUncategorized = useListViewStore((state) => state.setShowUncategorized);
  const collapseAll = useListViewStore((state) => state.collapseAll);
  const expandAll = useListViewStore((state) => state.expandAll);

  // Get current filter info
  const activeCategory = useMemo(() => {
    if (activeFilter.type === "category" && activeFilter.id) {
      return categories.find((c: Category) => c.id === activeFilter.id);
    }
    return null;
  }, [activeFilter, categories]);

  const activeTag = useMemo(() => {
    if (activeFilter.type === "tag" && activeFilter.id) {
      return tags.find((t: TagType) => t.id === activeFilter.id);
    }
    return null;
  }, [activeFilter, tags]);

  const handleClearFilters = () => {
    setActiveFilter({ type: "all", id: undefined });
    setSearchQuery("");
  };

  const hasActiveFilters = (activeFilter.type !== "all" && activeFilter.type !== null) || searchQuery.trim() !== "";

  return (
    <div className={cn("flex flex-col gap-3 p-3 bg-card/50 border border-border/50 rounded-lg", className)}>
      {/* Top row: Search and main actions */}
      <div className="flex items-center gap-2">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar enlaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchQuery("")}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Category filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">Categoria</span>
              {activeCategory && (
                <Badge variant="secondary" className="ml-1">
                  {activeCategory.name}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar categoria..." />
              <CommandList>
                <CommandEmpty>No hay categorias</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setActiveFilter({ type: "all", id: undefined })}
                    className="cursor-pointer"
                  >
                    <span className={cn(!activeCategory && "font-semibold")}>
                      Todas las categorias
                    </span>
                  </CommandItem>
                  {categories.map((cat: Category) => (
                    <CommandItem
                      key={cat.id}
                      onSelect={() => setActiveFilter({ type: "category", id: cat.id })}
                      className="cursor-pointer"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full mr-2",
                          `bg-${cat.color || "gray"}-500`
                        )}
                        style={{
                          backgroundColor: cat.color
                            ? undefined
                            : "#6B7280",
                        }}
                      />
                      <span className={cn(activeCategory?.id === cat.id && "font-semibold")}>
                        {cat.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Tag filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">Etiqueta</span>
              {activeTag && (
                <TagBadge
                  name={activeTag.name}
                  color={activeTag.color || "blue"}
                  size="sm"
                  className="ml-1"
                />
              )}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder="Buscar etiqueta..." />
              <CommandList>
                <CommandEmpty>No hay etiquetas</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setActiveFilter({ type: "all", id: undefined })}
                    className="cursor-pointer"
                  >
                    <span className={cn(!activeTag && "font-semibold")}>
                      Todas las etiquetas
                    </span>
                  </CommandItem>
                  {tags.map((tag: TagType) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => setActiveFilter({ type: "tag", id: tag.id })}
                      className="cursor-pointer"
                    >
                      <TagBadge
                        name={tag.name}
                        color={tag.color || "blue"}
                        size="sm"
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Favorites filter */}
        <Button
          variant={activeFilter.type === "favorites" ? "secondary" : "outline"}
          size="sm"
          className="h-9 gap-2"
          onClick={() =>
            setActiveFilter(
              activeFilter.type === "favorites"
                ? { type: "all", id: undefined }
                : { type: "favorites", id: undefined }
            )
          }
        >
          <Star
            className={cn(
              "w-4 h-4",
              activeFilter.type === "favorites" && "fill-yellow-500 text-yellow-500"
            )}
          />
          <span className="hidden sm:inline">Favoritos</span>
        </Button>

        {/* Sort dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              {sortOrder === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{sortByLabels[sortBy]}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortBy)}
            >
              <DropdownMenuRadioItem value="createdAt">
                Fecha de creacion
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updatedAt">
                Ultima actualizacion
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">
                Titulo
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Direccion</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrder)}
            >
              <DropdownMenuRadioItem value="desc">
                <SortDesc className="w-4 h-4 mr-2" />
                Descendente
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc">
                <SortAsc className="w-4 h-4 mr-2" />
                Ascendente
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom row: Options and info */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {/* Collapse/Expand all */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => collapseAll(categoryIds)}
            title="Contraer todas las categorias"
          >
            <ChevronsDownUp className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Contraer</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 gap-1.5"
            onClick={() => expandAll()}
            title="Expandir todas las categorias"
          >
            <ChevronsUpDown className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Expandir</span>
          </Button>

          <div className="h-4 w-px bg-border" />

          {/* View options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs">Opciones</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={showEmptyCategories}
                onCheckedChange={setShowEmptyCategories}
              >
                Mostrar categorias vacias
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showUncategorized}
                onCheckedChange={setShowUncategorized}
              >
                Mostrar sin categoria
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear filters */}
          {hasActiveFilters && (
            <>
              <div className="h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5 text-destructive hover:text-destructive"
                onClick={handleClearFilters}
              >
                <X className="w-3.5 h-3.5" />
                <span className="text-xs">Limpiar filtros</span>
              </Button>
            </>
          )}
        </div>

        {/* Link count */}
        <div className="text-xs text-muted-foreground">
          {filteredLinks === totalLinks ? (
            <span>{totalLinks} enlaces</span>
          ) : (
            <span>
              {filteredLinks} de {totalLinks} enlaces
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
