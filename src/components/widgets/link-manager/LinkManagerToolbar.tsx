"use client";

import * as React from "react";
import {
  Search,
  LayoutList,
  LayoutGrid,
  Table2,
  Filter,
  CheckSquare,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ViewMode = "list" | "grid" | "table";
export type SortBy = "createdAt" | "title" | "updatedAt";
export type SortOrder = "asc" | "desc";

interface LinkManagerToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
  onOpenFilters: () => void;
  isSelectionMode: boolean;
  onToggleSelectionMode: () => void;
  selectedCount: number;
  totalCount: number;
  hasActiveFilters?: boolean;
}

export function LinkManagerToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  onOpenFilters,
  isSelectionMode,
  onToggleSelectionMode,
  selectedCount,
  totalCount,
  hasActiveFilters = false,
}: LinkManagerToolbarProps) {
  const getSortLabel = (sortBy: SortBy, sortOrder: SortOrder): string => {
    const labels: Record<SortBy, string> = {
      createdAt: "Fecha creación",
      title: "Título",
      updatedAt: "Fecha actualización",
    };
    return `${labels[sortBy]} (${sortOrder === "asc" ? "A-Z" : "Z-A"})`;
  };

  const handleSortChange = (value: string) => {
    const [newSortBy, newSortOrder] = value.split("-") as [SortBy, SortOrder];
    onSortChange(newSortBy, newSortOrder);
  };

  return (
    <div className="@container w-full">
      <div className="flex flex-col gap-2 @md:flex-row @md:items-center @md:justify-between">
        {/* Left section - Search */}
        <div className="relative flex-1 @md:max-w-xs">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar enlaces..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Right section - Controls */}
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="hidden @lg:flex items-center rounded-md border bg-background shadow-xs">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("list")}
              className={cn(
                "rounded-none rounded-l-md",
                viewMode === "list" && "bg-accent text-accent-foreground"
              )}
            >
              <LayoutList className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("grid")}
              className={cn(
                "rounded-none",
                viewMode === "grid" && "bg-accent text-accent-foreground"
              )}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onViewModeChange("table")}
              className={cn(
                "rounded-none rounded-r-md",
                viewMode === "table" && "bg-accent text-accent-foreground"
              )}
            >
              <Table2 className="size-4" />
            </Button>
          </div>

          {/* Filter button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className="relative"
          >
            <Filter className="size-4" />
            <span className="hidden @sm:inline">Filtros</span>
            {hasActiveFilters && (
              <Badge
                variant="default"
                className="absolute -top-1 -right-1 size-4 p-0 text-[10px]"
              >
                !
              </Badge>
            )}
          </Button>

          {/* Sort dropdown */}
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={handleSortChange}
          >
            <SelectTrigger size="sm" className="hidden @md:flex w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="createdAt-desc">
                Fecha creación (más recientes)
              </SelectItem>
              <SelectItem value="createdAt-asc">
                Fecha creación (más antiguos)
              </SelectItem>
              <SelectItem value="title-asc">Título (A-Z)</SelectItem>
              <SelectItem value="title-desc">Título (Z-A)</SelectItem>
              <SelectItem value="updatedAt-desc">
                Fecha actualización (más recientes)
              </SelectItem>
              <SelectItem value="updatedAt-asc">
                Fecha actualización (más antiguos)
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Selection mode toggle */}
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            size="sm"
            onClick={onToggleSelectionMode}
          >
            <CheckSquare className="size-4" />
            <span className="hidden @lg:inline">
              {isSelectionMode
                ? `${selectedCount}/${totalCount}`
                : "Seleccionar"}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
