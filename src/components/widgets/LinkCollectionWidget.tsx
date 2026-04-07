"use client";

import Image from "next/image";
import {
  useState,
  useMemo,
  useCallback,
  useRef,
  useEffect,
  useDeferredValue,
  lazy,
  Suspense,
} from "react";
import {
  LayoutGrid,
  List,
  Rows3,
  Plus,
  Search,
  Star,
  X,
  ArrowUpDown,
  Globe,
  Layers,
  ChevronRight,
  Terminal,
  CheckSquare,
  Trash2,
  FolderPlus,
  TagIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useTranslation } from "@/lib/i18n";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { cn } from "@/lib/utils";
import { LinkCollectionCard } from "./link-collection/LinkCollectionCard";
import type { Widget } from "@/types/widget";
import type { Link, Category, Tag } from "@/lib/db/schema";

const DevPromptModal = lazy(() => import("@/components/modals/DevPromptModal").then(m => ({ default: m.DevPromptModal })));

type ViewMode = "cards" | "compact" | "list";
type SortField = "createdAt" | "title" | "updatedAt";
type ReadingStatus = "inbox" | "reading" | "done";
type Panel = "collection" | "browse";

interface LinkCollectionWidgetProps {
  widget: Widget;
}

export function LinkCollectionWidget({ widget }: LinkCollectionWidgetProps) {
  const { t } = useTranslation();

  // ─── Store data ─────────────────────────────────────────────────────────
  const links = useLinksStore((s) => s.links);
  const categories = useLinksStore((s) => s.categories);
  const tags = useLinksStore((s) => s.tags);
  const linkTags = useLinksStore((s) => s.linkTags);
  const updateLink = useLinksStore((s) => s.updateLink);
  const openAddLinkModal = useLinksStore((s) => s.openAddLinkModal);
  const updateWidget = useWidgetStore((s) => s.updateWidget);
  const allWidgets = useWidgetStore((s) => s.widgets);

  // ─── Config from widget ─────────────────────────────────────────────────
  const collectionLinkIds = useMemo(
    () => (widget.config?.collectionLinkIds as string[]) || [],
    [widget.config?.collectionLinkIds]
  );
  // O(1) lookup Set — prevents O(n²) in render loops
  const collectionLinkIdsSet = useMemo(() => new Set(collectionLinkIds), [collectionLinkIds]);
  const viewMode: ViewMode = (widget.config?.collectionViewMode as ViewMode) || "cards";
  const sortBy: SortField = (widget.config?.collectionSortBy as SortField) || "createdAt";
  const sortOrder: "asc" | "desc" = (widget.config?.collectionSortOrder as "asc" | "desc") || "desc";

  // Ref to always have fresh widget.config — avoids stale closures in callbacks
  const widgetConfigRef = useRef(widget.config);
  widgetConfigRef.current = widget.config;

  // ─── Local state ────────────────────────────────────────────────────────
  const [activePanel, setActivePanel] = useState<Panel>("collection");
  const [searchQuery, setSearchQuery] = useState("");
  const [collectionSearch, setCollectionSearch] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const deferredCollectionSearch = useDeferredValue(collectionSearch);
  const [selectedForAdd, setSelectedForAdd] = useState<Set<string>>(new Set());
  const [browseCategory, setBrowseCategory] = useState<string>("__all__");
  const [browseTag, setBrowseTag] = useState<string>("__all__");
  const [devKitOpen, setDevKitOpen] = useState(false);
  const [devKitIncludeWidgets, setDevKitIncludeWidgets] = useState<Set<string>>(new Set());
  // Bulk selection within collection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedInCollection, setSelectedInCollection] = useState<Set<string>>(new Set());

  // ─── New link auto-add refs ─────────────────────────────────────────────
  const pendingNewLink = useRef(false);
  const prevLinksCount = useRef(links.length);

  useEffect(() => {
    if (pendingNewLink.current && links.length > prevLinksCount.current) {
      const newLink = links[0];
      const current = (widgetConfigRef.current?.collectionLinkIds as string[]) || [];
      if (newLink && !current.includes(newLink.id)) {
        updateWidget(widget.id, {
          config: { ...widgetConfigRef.current, collectionLinkIds: [...current, newLink.id] },
        });
      }
      pendingNewLink.current = false;
    }
    prevLinksCount.current = links.length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links.length]);

  // ─── Derived data ───────────────────────────────────────────────────────
  const categoryMap = useMemo(() => new Map(categories.map((c: Category) => [c.id, c])), [categories]);
  const tagMap = useMemo(() => new Map(tags.map((tg: Tag) => [tg.id, tg])), [tags]);
  const linkTagsMap = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const lt of linkTags) {
      const arr = m.get(lt.linkId) || [];
      arr.push(lt.tagId);
      m.set(lt.linkId, arr);
    }
    return m;
  }, [linkTags]);

  // ─── Sibling collections (DevKit) ─────────────────────────────────────
  const siblingCollections = useMemo(() => {
    return allWidgets.filter(
      (w) => w.type === "link-collection" && w.id !== widget.id && (w.projectId ?? null) === (widget.projectId ?? null)
    );
  }, [allWidgets, widget.id, widget.projectId]);

  const devKitLinkIds = useMemo(() => {
    const ids = new Set(collectionLinkIds);
    for (const wId of devKitIncludeWidgets) {
      const w = siblingCollections.find((s) => s.id === wId);
      for (const id of ((w?.config?.collectionLinkIds as string[]) || [])) ids.add(id);
    }
    return Array.from(ids);
  }, [collectionLinkIds, devKitIncludeWidgets, siblingCollections]);

  // ─── Collection links (sorted — favorites first) ──────────────────────
  const collectionLinks = useMemo(() => {
    let filtered = links.filter((l: Link) => collectionLinkIdsSet.has(l.id));
    // Search within collection
    if (deferredCollectionSearch.trim()) {
      const q = deferredCollectionSearch.toLowerCase();
      filtered = filtered.filter(
        (l: Link) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) ||
          categoryMap.get(l.categoryId ?? "")?.name.toLowerCase().includes(q)
      );
    }
    return filtered.sort((a: Link, b: Link) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      let cmp = 0;
      if (sortBy === "title") cmp = a.title.localeCompare(b.title);
      else if (sortBy === "updatedAt") cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === "desc" ? -cmp : cmp;
    });
  }, [links, collectionLinkIdsSet, sortBy, sortOrder, deferredCollectionSearch, categoryMap]);

  // ─── Browse links (filtered) ───────────────────────────────────────────
  const browseLinks = useMemo(() => {
    let filtered = links;
    if (deferredSearch.trim()) {
      const q = deferredSearch.toLowerCase();
      filtered = filtered.filter(
        (l: Link) =>
          l.title.toLowerCase().includes(q) || l.url.toLowerCase().includes(q) ||
          l.description?.toLowerCase().includes(q) || categoryMap.get(l.categoryId ?? "")?.name.toLowerCase().includes(q)
      );
    }
    if (browseCategory !== "__all__") filtered = filtered.filter((l: Link) => l.categoryId === browseCategory);
    if (browseTag !== "__all__") filtered = filtered.filter((l: Link) => (linkTagsMap.get(l.id) || []).includes(browseTag));
    return filtered;
  }, [links, deferredSearch, browseCategory, browseTag, categoryMap, linkTagsMap]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const getTagInfo = useCallback((linkId: string) => {
    const tIds = linkTagsMap.get(linkId) || [];
    const names: string[] = [], colors: string[] = [];
    for (const tid of tIds) { const tag = tagMap.get(tid); if (tag) { names.push(tag.name); colors.push(tag.color || ""); } }
    return { names, colors };
  }, [linkTagsMap, tagMap]);

  const getCategoryName = useCallback((catId?: string | null) => catId ? categoryMap.get(catId)?.name : undefined, [categoryMap]);
  const getCategoryColor = useCallback((catId?: string | null) => catId ? categoryMap.get(catId)?.color : undefined, [categoryMap]);

  // ─── Actions (use widgetConfigRef to avoid stale closures) ──────────────
  const handleAddToCollection = useCallback((linkIds: string[]) => {
    const current = (widgetConfigRef.current?.collectionLinkIds as string[]) || [];
    const updated = [...new Set([...current, ...linkIds])];
    updateWidget(widget.id, { config: { ...widgetConfigRef.current, collectionLinkIds: updated } });
    setSelectedForAdd(new Set());
  }, [widget.id, updateWidget]);

  const handleRemoveFromCollection = useCallback((linkId: string) => {
    const current = (widgetConfigRef.current?.collectionLinkIds as string[]) || [];
    const updated = current.filter((id: string) => id !== linkId);
    updateWidget(widget.id, { config: { ...widgetConfigRef.current, collectionLinkIds: updated } });
    setSelectedInCollection((prev) => { const n = new Set(prev); n.delete(linkId); return n; });
  }, [widget.id, updateWidget]);

  const handleBulkRemove = useCallback(() => {
    const current = (widgetConfigRef.current?.collectionLinkIds as string[]) || [];
    const updated = current.filter((id: string) => !selectedInCollection.has(id));
    updateWidget(widget.id, { config: { ...widgetConfigRef.current, collectionLinkIds: updated } });
    setSelectedInCollection(new Set());
    setIsSelecting(false);
  }, [selectedInCollection, widget.id, updateWidget]);

  const handleBulkFavorite = useCallback(async () => {
    for (const linkId of selectedInCollection) {
      const link = links.find((l: Link) => l.id === linkId);
      if (!link) continue;
      try {
        await fetch(`/api/links/${linkId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getCsrfHeaders() }, credentials: "include", body: JSON.stringify({ isFavorite: true }) });
        updateLink(linkId, { isFavorite: true });
      } catch { /* silently fail */ }
    }
    setSelectedInCollection(new Set());
    setIsSelecting(false);
  }, [links, selectedInCollection, updateLink]);

  const handleFavoriteToggle = useCallback(async (linkId: string) => {
    const link = links.find((l: Link) => l.id === linkId);
    if (!link) return;
    const newValue = !link.isFavorite;
    try {
      await fetch(`/api/links/${linkId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getCsrfHeaders() }, credentials: "include", body: JSON.stringify({ isFavorite: newValue }) });
      updateLink(linkId, { isFavorite: newValue });
    } catch { /* silently fail */ }
  }, [links, updateLink]);

  const handleReadingStatusChange = useCallback(async (linkId: string, status: ReadingStatus) => {
    try {
      await fetch(`/api/links/${linkId}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...getCsrfHeaders() }, credentials: "include", body: JSON.stringify({ readingStatus: status }) });
      updateLink(linkId, { readingStatus: status });
    } catch { /* silently fail */ }
  }, [updateLink]);

  const handleAddNewLink = useCallback(() => {
    pendingNewLink.current = true;
    prevLinksCount.current = links.length;
    openAddLinkModal();
  }, [links.length, openAddLinkModal]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    updateWidget(widget.id, { config: { ...widgetConfigRef.current, collectionViewMode: mode } });
  }, [widget.id, updateWidget]);

  const handleSortChange = useCallback((field: SortField, order: "asc" | "desc") => {
    updateWidget(widget.id, { config: { ...widgetConfigRef.current, collectionSortBy: field, collectionSortOrder: order } });
  }, [widget.id, updateWidget]);

  const toggleSelectForAdd = useCallback((linkId: string) => {
    setSelectedForAdd((prev) => { const n = new Set(prev); if (n.has(linkId)) n.delete(linkId); else n.add(linkId); return n; });
  }, []);

  const toggleSelectInCollection = useCallback((linkId: string) => {
    setSelectedInCollection((prev) => { const n = new Set(prev); if (n.has(linkId)) n.delete(linkId); else n.add(linkId); return n; });
  }, []);

  const selectAllVisible = useCallback(() => setSelectedForAdd(new Set(browseLinks.map((l: Link) => l.id))), [browseLinks]);

  // Import all links from a category or tag
  const handleImportCategory = useCallback((categoryId: string) => {
    const catLinks = links.filter((l: Link) => l.categoryId === categoryId).map((l: Link) => l.id);
    handleAddToCollection(catLinks);
  }, [links, handleAddToCollection]);

  const handleImportTag = useCallback((tagId: string) => {
    const tagLinkIds = linkTags.filter((lt) => lt.tagId === tagId).map((lt) => lt.linkId);
    handleAddToCollection(tagLinkIds);
  }, [linkTags, handleAddToCollection]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        <Layers className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium truncate">{widget.title}</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-4 shrink-0">{collectionLinks.length}</Badge>

        <div className="ml-auto flex items-center gap-1">
          {activePanel === "collection" && (
            <>
              {/* Collection search */}
              {collectionLinkIds.length > 3 && (
                <div className="relative">
                  <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder={t("linkCollection.search")}
                    value={collectionSearch}
                    onChange={(e) => setCollectionSearch(e.target.value)}
                    className="h-7 w-28 pl-6 text-xs"
                  />
                </div>
              )}

              {/* View mode toggles */}
              <div className="flex border rounded-md overflow-hidden">
                {(["cards", "list", "compact"] as const).map((mode) => {
                  const Icon = mode === "cards" ? LayoutGrid : mode === "list" ? List : Rows3;
                  return (
                    <Tooltip key={mode}>
                      <TooltipTrigger asChild>
                        <button type="button" className={cn("p-1 transition-colors", viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted")} onClick={() => handleViewModeChange(mode)}>
                          <Icon className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t(`linkCollection.view${mode.charAt(0).toUpperCase() + mode.slice(1)}` as "linkCollection.viewCards")}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"><ArrowUpDown className="h-3.5 w-3.5" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleSortChange("createdAt", "desc")}>{t("linkCollection.sortNewest")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("createdAt", "asc")}>{t("linkCollection.sortOldest")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("title", "asc")}>{t("linkCollection.sortAZ")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("title", "desc")}>{t("linkCollection.sortZA")}</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Bulk select toggle */}
              {collectionLinkIds.length > 1 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant={isSelecting ? "default" : "ghost"} size="icon" className="h-7 w-7" onClick={() => { setIsSelecting(!isSelecting); setSelectedInCollection(new Set()); }}>
                      <CheckSquare className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Selección múltiple</TooltipContent>
                </Tooltip>
              )}
            </>
          )}

          {/* DevKit */}
          {collectionLinkIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Terminal className="h-3.5 w-3.5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => { setDevKitIncludeWidgets(new Set()); setDevKitOpen(true); }}>
                  <Terminal className="h-3.5 w-3.5 mr-2" />DevKit — Generar prompt
                </DropdownMenuItem>
                {siblingCollections.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Incluir de otras colecciones</div>
                    {siblingCollections.map((sw) => (
                      <DropdownMenuItem key={sw.id} onClick={(e) => { e.preventDefault(); setDevKitIncludeWidgets((prev) => { const n = new Set(prev); if (n.has(sw.id)) n.delete(sw.id); else n.add(sw.id); return n; }); }}>
                        <Checkbox checked={devKitIncludeWidgets.has(sw.id)} className="mr-2" />
                        <span className="truncate flex-1">{sw.title}</span>
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1 h-4 shrink-0">{((sw.config?.collectionLinkIds as string[]) || []).length}</Badge>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => setDevKitOpen(true)} className="text-primary font-medium">
                      <Terminal className="h-3.5 w-3.5 mr-2" />Generar con {devKitLinkIds.length} enlaces
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Add new link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddNewLink}><Plus className="h-3.5 w-3.5" /></Button>
            </TooltipTrigger>
            <TooltipContent>{t("linkCollection.addNewLink")}</TooltipContent>
          </Tooltip>

          {/* Panel toggle */}
          <Button variant={activePanel === "browse" ? "default" : "outline"} size="sm" className="h-7 text-xs px-2" onClick={() => setActivePanel((p) => (p === "collection" ? "browse" : "collection"))}>
            {activePanel === "collection" ? t("linkCollection.browseLinks") : t("linkCollection.viewCollection")}
          </Button>
        </div>
      </div>

      {/* Bulk actions bar */}
      {isSelecting && selectedInCollection.size > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border-b border-primary/20 shrink-0">
          <Badge variant="secondary" className="text-xs">{selectedInCollection.size} seleccionados</Badge>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={handleBulkFavorite}>
            <Star className="h-3 w-3 mr-1" />Favoritos
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={handleBulkRemove}>
            <Trash2 className="h-3 w-3 mr-1" />Quitar
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs ml-auto" onClick={() => setSelectedInCollection(new Set(collectionLinks.map((l: Link) => l.id)))}>
            Todos
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => { setSelectedInCollection(new Set()); setIsSelecting(false); }}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ── Panels ── */}
      <AnimatePresence mode="wait">
        {activePanel === "collection" ? (
          <motion.div key="collection" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="flex-1 min-h-0">
            {collectionLinks.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <Layers className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">{collectionLinkIds.length === 0 ? t("linkCollection.emptyCollection") : t("linkCollection.noResults")}</p>
                <p className="text-xs text-muted-foreground/60 mt-1 max-w-[240px]">{collectionLinkIds.length === 0 ? t("linkCollection.emptyCollectionDesc") : ""}</p>
                {collectionLinkIds.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => setActivePanel("browse")}>
                    <Search className="h-3.5 w-3.5 mr-1.5" />{t("linkCollection.browseLinks")}
                  </Button>
                )}
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className={cn("p-3", viewMode === "cards" ? "grid grid-cols-1 @lg:grid-cols-2 gap-3" : "flex flex-col gap-1")}>
                  {collectionLinks.map((link: Link) => {
                    const { names, colors } = getTagInfo(link.id);
                    return (
                      <LinkCollectionCard
                        key={link.id}
                        link={link}
                        categoryName={getCategoryName(link.categoryId)}
                        categoryColor={getCategoryColor(link.categoryId) ?? undefined}
                        tagNames={names}
                        tagColors={colors}
                        variant={viewMode === "cards" ? "card" : viewMode}
                        isSelecting={isSelecting}
                        isSelected={selectedInCollection.has(link.id)}
                        onSelect={toggleSelectInCollection}
                        onFavoriteToggle={handleFavoriteToggle}
                        onRemove={handleRemoveFromCollection}
                        onReadingStatusChange={handleReadingStatusChange}
                        t={t}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        ) : (
          <motion.div key="browse" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }} className="flex-1 min-h-0 flex flex-col">
            {/* Browse filters */}
            <div className="px-3 pt-2 pb-1 space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder={t("linkCollection.search")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-8 pl-8 text-sm" />
                {searchQuery && <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2" onClick={() => setSearchQuery("")}><X className="h-3.5 w-3.5 text-muted-foreground" /></button>}
              </div>
              <div className="flex gap-2">
                <Select value={browseCategory} onValueChange={setBrowseCategory}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder={t("linkCollection.filterByCategory")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("linkCollection.allCategories")}</SelectItem>
                    {categories.map((c: Category) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={browseTag} onValueChange={setBrowseTag}>
                  <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder={t("linkCollection.filterByTag")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">{t("linkCollection.allTags")}</SelectItem>
                    {tags.map((tg: Tag) => <SelectItem key={tg.id} value={tg.id}>{tg.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Quick import buttons */}
              <div className="flex gap-1 flex-wrap">
                {browseCategory !== "__all__" && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleImportCategory(browseCategory)}>
                    <FolderPlus className="h-3 w-3 mr-1" />Añadir toda la categoría
                  </Button>
                )}
                {browseTag !== "__all__" && (
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => handleImportTag(browseTag)}>
                    <TagIcon className="h-3 w-3 mr-1" />Añadir toda la etiqueta
                  </Button>
                )}
              </div>

              {selectedForAdd.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">{t("linkCollection.selected", { count: selectedForAdd.size })}</Badge>
                  <Button size="sm" className="h-6 text-xs px-2" onClick={() => handleAddToCollection(Array.from(selectedForAdd))}>{t("linkCollection.addSelected")}</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={selectAllVisible}>Todos</Button>
                  <Button variant="ghost" size="sm" className="h-6 text-xs px-1" onClick={() => setSelectedForAdd(new Set())}><X className="h-3 w-3" /></Button>
                </div>
              )}
            </div>

            {/* Browse link list */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="px-3 pb-3">
                {browseLinks.length === 0 ? (
                  <div className="text-center py-8 text-sm text-muted-foreground">{t("linkCollection.noResults")}</div>
                ) : (
                  browseLinks.map((link: Link) => {
                    const isInCollection = collectionLinkIdsSet.has(link.id);
                    const isSelected = selectedForAdd.has(link.id);
                    return (
                      <div
                        key={link.id}
                        className={cn(
                          "flex items-center gap-2.5 py-2 px-2 rounded-lg transition-colors",
                          isInCollection ? "bg-primary/5 opacity-60" : "hover:bg-muted/50 cursor-pointer",
                          isSelected && !isInCollection && "bg-primary/10"
                        )}
                        onClick={() => { if (!isInCollection) toggleSelectForAdd(link.id); }}
                      >
                        <Checkbox checked={isInCollection || isSelected} disabled={isInCollection} onCheckedChange={() => { if (!isInCollection) toggleSelectForAdd(link.id); }} className="shrink-0" />
                        <div className="shrink-0 h-6 w-6 rounded-full bg-muted/50 flex items-center justify-center overflow-hidden">
                          {link.faviconUrl && /^https?:\/\//.test(link.faviconUrl) ? <Image src={link.faviconUrl} alt="" width={24} height={24} className="h-full w-full object-cover" unoptimized /> : <Globe className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{link.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {link.categoryId && categoryMap.get(link.categoryId) && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 shrink-0">{categoryMap.get(link.categoryId)!.name}</Badge>
                            )}
                            {(linkTagsMap.get(link.id) || []).slice(0, 2).map((tid: string) => {
                              const tag = tagMap.get(tid);
                              return tag ? <Badge key={tid} variant="outline" className="text-[10px] px-1 py-0 h-4">{tag.name}</Badge> : null;
                            })}
                          </div>
                        </div>
                        {link.isFavorite && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />}
                        {isInCollection && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0 text-primary border-primary/30">
                            <ChevronRight className="h-2.5 w-2.5 mr-0.5" />En colección
                          </Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DevKit Modal */}
      {devKitOpen && (
        <Suspense fallback={null}>
          <DevPromptModal open={devKitOpen} onClose={() => setDevKitOpen(false)} linkIds={devKitLinkIds} />
        </Suspense>
      )}
    </div>
  );
}
