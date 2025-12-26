"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Category, Tag } from "@/lib/db/schema";

interface LinkManagerFiltersProps {
  filterCategoryId: string | null;
  filterTagIds: string[];
  filterFavoritesOnly: boolean;
  categories: Category[];
  tags: Tag[];
  onFilterChange: (filters: {
    categoryId: string | null;
    tagIds: string[];
    favoritesOnly: boolean;
  }) => void;
  onClearFilters: () => void;
}

export function LinkManagerFilters({
  filterCategoryId,
  filterTagIds,
  filterFavoritesOnly,
  categories,
  tags,
  onFilterChange,
  onClearFilters,
}: LinkManagerFiltersProps) {
  const handleCategoryChange = (value: string) => {
    const categoryId = value === "all" ? null : value;
    onFilterChange({
      categoryId,
      tagIds: filterTagIds,
      favoritesOnly: filterFavoritesOnly,
    });
  };

  const handleTagToggle = (tagId: string) => {
    const newTagIds = filterTagIds.includes(tagId)
      ? filterTagIds.filter((id) => id !== tagId)
      : [...filterTagIds, tagId];
    onFilterChange({
      categoryId: filterCategoryId,
      tagIds: newTagIds,
      favoritesOnly: filterFavoritesOnly,
    });
  };

  const handleFavoritesToggle = (checked: boolean) => {
    onFilterChange({
      categoryId: filterCategoryId,
      tagIds: filterTagIds,
      favoritesOnly: checked,
    });
  };

  const hasActiveFilters =
    filterCategoryId !== null ||
    filterTagIds.length > 0 ||
    filterFavoritesOnly;

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Categoría</label>
        <Select
          value={filterCategoryId || "all"}
          onValueChange={handleCategoryChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="uncategorized">Sin categoría</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tags filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Etiquetas</label>
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay etiquetas disponibles
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const isSelected = filterTagIds.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && "bg-primary text-primary-foreground"
                  )}
                  style={
                    isSelected && tag.color
                      ? { backgroundColor: tag.color }
                      : undefined
                  }
                  onClick={() => handleTagToggle(tag.id)}
                >
                  {tag.name}
                  {isSelected && <X className="ml-1 size-3" />}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {/* Favorites only toggle */}
      <div className="flex items-center justify-between">
        <label htmlFor="favorites-only" className="text-sm font-medium">
          Solo favoritos
        </label>
        <Switch
          id="favorites-only"
          checked={filterFavoritesOnly}
          onCheckedChange={handleFavoritesToggle}
        />
      </div>

      {/* Clear filters button */}
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={onClearFilters}
          className="w-full"
        >
          <X className="size-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

// Wrapper component that includes the Popover
interface LinkManagerFiltersPopoverProps extends LinkManagerFiltersProps {
  trigger: React.ReactNode;
}

export function LinkManagerFiltersPopover({
  trigger,
  ...filterProps
}: LinkManagerFiltersPopoverProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Filtros</h3>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setOpen(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
          <LinkManagerFilters {...filterProps} />
        </div>
      </PopoverContent>
    </Popover>
  );
}
