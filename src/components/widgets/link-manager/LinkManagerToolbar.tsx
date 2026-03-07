"use client";

import * as React from "react";
import {
  Search,
  LayoutList,
  LayoutGrid,
  Table2,
  Filter,
  CheckSquare,
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
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

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
            placeholder={t("linkManager.searchPlaceholder")}
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
            <span className="hidden @sm:inline">{t("linkManager.filters")}</span>
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
                {t("linkManager.sortCreatedAtDesc")}
              </SelectItem>
              <SelectItem value="createdAt-asc">
                {t("linkManager.sortCreatedAtAsc")}
              </SelectItem>
              <SelectItem value="title-asc">{t("linkManager.sortTitleAsc")}</SelectItem>
              <SelectItem value="title-desc">{t("linkManager.sortTitleDesc")}</SelectItem>
              <SelectItem value="updatedAt-desc">
                {t("linkManager.sortUpdatedAtDesc")}
              </SelectItem>
              <SelectItem value="updatedAt-asc">
                {t("linkManager.sortUpdatedAtAsc")}
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
                : t("linkManager.select")}
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
