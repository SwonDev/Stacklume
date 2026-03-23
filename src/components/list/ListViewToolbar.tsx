"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
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
  Check,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { useListViewStore, type SortBy, type SortOrder, type CategorySortBy } from "@/stores/list-view-store";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import { AutoClassifyDialog } from "@/components/modals/AutoClassifyDialog";
import { EnrichDialog } from "@/components/modals/EnrichDialog";
import type { Category, Tag as TagType } from "@/lib/db/schema";

// Mapa de colores para las categorías (hex estático — Tailwind no incluye clases dinámicas)
const CATEGORY_COLOR_MAP: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  amber: "#f59e0b",
  yellow: "#eab308",
  lime: "#84cc16",
  green: "#22c55e",
  emerald: "#10b981",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  sky: "#0ea5e9",
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  purple: "#a855f7",
  fuchsia: "#d946ef",
  pink: "#ec4899",
  rose: "#f43f5e",
  slate: "#64748b",
  gray: "#6b7280",
  zinc: "#71717a",
  neutral: "#737373",
  stone: "#78716c",
};

interface ListViewToolbarProps {
  className?: string;
  categoryIds: string[];
  totalLinks: number;
  filteredLinks: number;
}

const sortByLabelKeys: Record<SortBy, string> = {
  createdAt: "listView.sortByCreatedAt",
  updatedAt: "listView.sortByUpdatedAt",
  title: "listView.sortByTitle",
};

const categorySortByLabelKeys: Record<CategorySortBy, string> = {
  manual: "listView.categorySortManual",
  alphabetical: "listView.categorySortAlphabetical",
  linkCount: "listView.categorySortLinkCount",
  lastUsed: "listView.categorySortLastUsed",
};

export function ListViewToolbar({
  className,
  categoryIds,
  totalLinks,
  filteredLinks,
}: ListViewToolbarProps) {
  const { t } = useTranslation();
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
  const categorySortBy = useListViewStore((state) => state.categorySortBy);
  const categorySortOrder = useListViewStore((state) => state.categorySortOrder);
  const setSortBy = useListViewStore((state) => state.setSortBy);
  const setSortOrder = useListViewStore((state) => state.setSortOrder);
  const setCategorySortBy = useListViewStore((state) => state.setCategorySortBy);
  const setCategorySortOrder = useListViewStore((state) => state.setCategorySortOrder);
  const setShowEmptyCategories = useListViewStore((state) => state.setShowEmptyCategories);
  const setShowUncategorized = useListViewStore((state) => state.setShowUncategorized);
  const [classifyOpen, setClassifyOpen] = useState(false);
  const [classifyJobId, setClassifyJobId] = useState<string | null>(null);
  const [classifyProposal, setClassifyProposal] = useState<unknown>(null);
  const classifyPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [enrichOpen, setEnrichOpen] = useState(false);
  const [enrichJobId, setEnrichJobId] = useState<string | null>(null);
  const enrichPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const collapseAll = useListViewStore((state) => state.collapseAll);
  const expandAll = useListViewStore((state) => state.expandAll);

  // Background polling para clasificación
  const handleClassifyJobStarted = useCallback((jobId: string) => {
    setClassifyJobId(jobId);
    setClassifyProposal(null);
  }, []);

  // Background polling para enriquecimiento
  const handleEnrichJobStarted = useCallback((jobId: string) => {
    setEnrichJobId(jobId);
  }, []);

  useEffect(() => {
    if (!enrichJobId || enrichOpen) {
      if (enrichPollingRef.current) clearInterval(enrichPollingRef.current);
      return;
    }
    enrichPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/links/enrich?jobId=${enrichJobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "done") {
          if (enrichPollingRef.current) clearInterval(enrichPollingRef.current);
          setEnrichJobId(null);
          const { toast } = await import("sonner");
          toast.success("Enriquecimiento completado", {
            description: `${job.results?.enriched ?? 0} enlaces enriquecidos`,
            action: { label: "Ver", onClick: () => setEnrichOpen(true) },
            duration: 10000,
          });
          useLinksStore.getState().refreshAllData().catch(() => {});
        } else if (job.status === "error") {
          if (enrichPollingRef.current) clearInterval(enrichPollingRef.current);
          setEnrichJobId(null);
          const { toast } = await import("sonner");
          toast.error("Error en enriquecimiento", { description: job.error });
        }
      } catch { /* retry */ }
    }, 2000);
    return () => { if (enrichPollingRef.current) clearInterval(enrichPollingRef.current); };
  }, [enrichJobId, enrichOpen]);

  useEffect(() => {
    // Solo polling cuando el dialog está cerrado y hay un job pendiente
    if (!classifyJobId || classifyOpen) {
      if (classifyPollingRef.current) clearInterval(classifyPollingRef.current);
      return;
    }
    classifyPollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/llm/classify?jobId=${classifyJobId}`);
        if (!res.ok) return;
        const job = await res.json();
        if (job.status === "analyzed" && job.proposal) {
          if (classifyPollingRef.current) clearInterval(classifyPollingRef.current);
          setClassifyProposal(job.proposal);
          const { toast } = await import("sonner");
          toast.success("Clasificación completada", {
            description: `${job.proposal.changes.length} cambios propuestos`,
            action: { label: "Revisar", onClick: () => setClassifyOpen(true) },
            duration: 15000,
          });
        } else if (job.status === "error") {
          if (classifyPollingRef.current) clearInterval(classifyPollingRef.current);
          setClassifyJobId(null);
          const { toast } = await import("sonner");
          toast.error("Error en clasificación", { description: job.error });
        }
      } catch { /* retry */ }
    }, 2000);
    return () => { if (classifyPollingRef.current) clearInterval(classifyPollingRef.current); };
  }, [classifyJobId, classifyOpen]);

  // IDs activos para multi-selección
  const activeCategoryIds = useMemo((): string[] => {
    if (activeFilter.type !== "category") return [];
    if (activeFilter.ids && activeFilter.ids.length > 0) return activeFilter.ids;
    if (activeFilter.id) return [activeFilter.id];
    return [];
  }, [activeFilter]);

  const activeTagIds = useMemo((): string[] => {
    if (activeFilter.type !== "tag") return [];
    if (activeFilter.ids && activeFilter.ids.length > 0) return activeFilter.ids;
    if (activeFilter.id) return [activeFilter.id];
    return [];
  }, [activeFilter]);

  const toggleCategoryId = (catId: string) => {
    const newIds = activeCategoryIds.includes(catId)
      ? activeCategoryIds.filter((id) => id !== catId)
      : [...activeCategoryIds, catId];
    if (newIds.length === 0) {
      setActiveFilter({ type: "all", id: undefined, ids: undefined });
    } else {
      setActiveFilter({ type: "category", ids: newIds, id: undefined });
    }
  };

  const toggleTagId = (tagId: string) => {
    const newIds = activeTagIds.includes(tagId)
      ? activeTagIds.filter((id) => id !== tagId)
      : [...activeTagIds, tagId];
    if (newIds.length === 0) {
      setActiveFilter({ type: "all", id: undefined, ids: undefined });
    } else {
      setActiveFilter({ type: "tag", ids: newIds, id: undefined });
    }
  };

  const handleClearFilters = () => {
    setActiveFilter({ type: "all", id: undefined, ids: undefined });
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
            placeholder={t("listView.searchPlaceholder")}
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

        {/* Category filter — multi-selección */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeCategoryIds.length > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-2"
            >
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">{t("listView.category")}</span>
              {activeCategoryIds.length === 1 && (
                <Badge variant="secondary" className="ml-1 max-w-[80px] truncate">
                  {categories.find((c: Category) => c.id === activeCategoryIds[0])?.name}
                </Badge>
              )}
              {activeCategoryIds.length > 1 && (
                <Badge variant="secondary" className="ml-1">
                  {activeCategoryIds.length}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("listView.searchCategory")} />
              <CommandList>
                <CommandEmpty>{t("listView.noCategories")}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setActiveFilter({ type: "all", id: undefined, ids: undefined })}
                    className="cursor-pointer"
                  >
                    <span className={cn(activeCategoryIds.length === 0 && "font-semibold")}>
                      {t("listView.allCategories")}
                    </span>
                    {activeCategoryIds.length === 0 && (
                      <Check className="ml-auto w-4 h-4 text-primary" />
                    )}
                  </CommandItem>
                  {categories.map((cat: Category) => (
                    <CommandItem
                      key={cat.id}
                      onSelect={() => toggleCategoryId(cat.id)}
                      className="cursor-pointer"
                    >
                      <div
                        className="w-2 h-2 rounded-full mr-2 flex-shrink-0"
                        style={{
                          backgroundColor: CATEGORY_COLOR_MAP[cat.color ?? ""] ?? cat.color ?? "#6b7280",
                        }}
                      />
                      <span className={cn(activeCategoryIds.includes(cat.id) && "font-semibold")}>
                        {cat.name}
                      </span>
                      {activeCategoryIds.includes(cat.id) && (
                        <Check className="ml-auto w-4 h-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                  <CommandItem
                    onSelect={() => toggleCategoryId("__uncategorized__")}
                    className="cursor-pointer"
                  >
                    <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0 bg-muted-foreground/40" />
                    <span className={cn(activeCategoryIds.includes("__uncategorized__") && "font-semibold")}>
                      {t("listView.uncategorized")}
                    </span>
                    {activeCategoryIds.includes("__uncategorized__") && (
                      <Check className="ml-auto w-4 h-4 text-primary" />
                    )}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Tag filter — multi-selección */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={activeTagIds.length > 0 ? "secondary" : "outline"}
              size="sm"
              className="h-9 gap-2"
            >
              <Tag className="w-4 h-4" />
              <span className="hidden sm:inline">{t("listView.tag")}</span>
              {activeTagIds.length === 1 && (
                <TagBadge
                  name={tags.find((t: TagType) => t.id === activeTagIds[0])?.name ?? ""}
                  color={tags.find((t: TagType) => t.id === activeTagIds[0])?.color ?? "blue"}
                  size="sm"
                  className="ml-1"
                />
              )}
              {activeTagIds.length > 1 && (
                <Badge variant="secondary" className="ml-1">
                  {activeTagIds.length}
                </Badge>
              )}
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput placeholder={t("listView.searchTag")} />
              <CommandList>
                <CommandEmpty>{t("listView.noTags")}</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setActiveFilter({ type: "all", id: undefined, ids: undefined })}
                    className="cursor-pointer"
                  >
                    <span className={cn(activeTagIds.length === 0 && "font-semibold")}>
                      {t("listView.allTags")}
                    </span>
                    {activeTagIds.length === 0 && (
                      <Check className="ml-auto w-4 h-4 text-primary" />
                    )}
                  </CommandItem>
                  {tags.map((tag: TagType) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => toggleTagId(tag.id)}
                      className="cursor-pointer"
                    >
                      <TagBadge
                        name={tag.name}
                        color={tag.color ?? "blue"}
                        size="sm"
                      />
                      {activeTagIds.includes(tag.id) && (
                        <Check className="ml-auto w-4 h-4 text-primary" />
                      )}
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
          <span className="hidden sm:inline">{t("listView.favorites")}</span>
        </Button>

        {/* Sort links dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              {sortOrder === "asc" ? (
                <SortAsc className="w-4 h-4" />
              ) : (
                <SortDesc className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">{t(sortByLabelKeys[sortBy])}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("listView.sortLinks")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={sortBy}
              onValueChange={(value) => setSortBy(value as SortBy)}
            >
              <DropdownMenuRadioItem value="createdAt">
                {t("listView.sortByCreatedAt")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="updatedAt">
                {t("listView.sortByUpdatedAt")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="title">
                {t("listView.sortByTitle")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t("listView.direction")}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as SortOrder)}
            >
              <DropdownMenuRadioItem value="desc">
                <SortDesc className="w-4 h-4 mr-2" />
                {t("listView.descending")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="asc">
                <SortAsc className="w-4 h-4 mr-2" />
                {t("listView.ascending")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort categories dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Folder className="w-4 h-4" />
              <span className="hidden sm:inline">{t(categorySortByLabelKeys[categorySortBy])}</span>
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("listView.sortCategories")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={categorySortBy}
              onValueChange={(value) => setCategorySortBy(value as CategorySortBy)}
            >
              <DropdownMenuRadioItem value="manual">
                {t("listView.categorySortManual")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="alphabetical">
                {t("listView.categorySortAlphabetical")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="linkCount">
                {t("listView.categorySortLinkCount")}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="lastUsed">
                {t("listView.categorySortLastUsed")}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            {categorySortBy !== "manual" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t("listView.direction")}</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={categorySortOrder}
                  onValueChange={(value) => setCategorySortOrder(value as SortOrder)}
                >
                  <DropdownMenuRadioItem value="asc">
                    <SortAsc className="w-4 h-4 mr-2" />
                    {t("listView.ascending")}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">
                    <SortDesc className="w-4 h-4 mr-2" />
                    {t("listView.descending")}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bottom row: Options and info */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          {/* Collapse/Expand all */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5"
                aria-label={t("listView.collapseAll")}
                onClick={() => collapseAll(categoryIds)}
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">{t("listView.collapse")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{t("listView.collapseAll")}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 gap-1.5"
                aria-label={t("listView.expandAll")}
                onClick={() => expandAll()}
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-xs">{t("listView.expand")}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{t("listView.expandAll")}</p></TooltipContent>
          </Tooltip>

          {/* Autoclasificar con IA */}
          {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 gap-1.5", classifyJobId && !classifyProposal && "text-primary")}
                  onClick={() => setClassifyOpen(true)}
                >
                  {classifyJobId && !classifyProposal ? (
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                  ) : classifyProposal ? (
                    <Sparkles className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline text-xs">
                    {classifyJobId && !classifyProposal ? "Analizando..." : classifyProposal ? "Ver propuesta" : "Autoclasificar"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{classifyJobId && !classifyProposal ? "Clasificación en curso..." : classifyProposal ? "Hay una propuesta lista para revisar" : "Clasificar enlaces con IA"}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <AutoClassifyDialog
            open={classifyOpen}
            onClose={() => setClassifyOpen(false)}
            onJobStarted={handleClassifyJobStarted}
            pendingJobId={classifyJobId}
            pendingProposal={classifyProposal}
            onApplied={() => { setClassifyJobId(null); setClassifyProposal(null); }}
          />

          {/* Enriquecer enlaces con IA */}
          {typeof window !== "undefined" && "__TAURI_INTERNALS__" in window && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-7 px-2 gap-1.5", enrichJobId && "text-primary")}
                  onClick={() => setEnrichOpen(true)}
                >
                  {enrichJobId ? (
                    <Wand2 className="w-3.5 h-3.5 animate-pulse" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline text-xs">
                    {enrichJobId ? t("enrich.running") : t("enrich.button")}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{enrichJobId ? t("enrich.runningTooltip") : t("enrich.tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          )}

          <EnrichDialog
            open={enrichOpen}
            onClose={() => setEnrichOpen(false)}
            onJobStarted={handleEnrichJobStarted}
            pendingJobId={enrichJobId}
            onCompleted={() => setEnrichJobId(null)}
          />

          <div className="h-4 w-px bg-border" />

          {/* View options */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1.5">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs">{t("listView.options")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuCheckboxItem
                checked={showEmptyCategories}
                onCheckedChange={setShowEmptyCategories}
              >
                {t("listView.showEmptyCategories")}
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showUncategorized}
                onCheckedChange={setShowUncategorized}
              >
                {t("listView.showUncategorized")}
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
                <span className="text-xs">{t("listView.clearFilters")}</span>
              </Button>
            </>
          )}
        </div>

        {/* Link count */}
        <div className="text-xs text-muted-foreground">
          {filteredLinks === totalLinks ? (
            <span>{t("listView.linksCount", { count: totalLinks })}</span>
          ) : (
            <span>
              {t("listView.linksFiltered", { filtered: filteredLinks, total: totalLinks })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
