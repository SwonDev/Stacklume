"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Star, Clock, FolderOpen, Plus, Tag as TagIcon, Home, Settings, ChevronDown, Share2, Inbox, BookOpen, CheckCheck, Trash2, Search, Save, Trash } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { ProjectList } from "@/components/projects/ProjectList";
import { AddProjectModal, EditProjectModal } from "@/components/projects/ProjectDialog";
import { ShareCollectionDialog } from "@/components/modals/ShareCollectionDialog";
import { TrashModal } from "@/components/modals/TrashModal";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";
import { useElectron } from "@/hooks/useElectron";
import type { Link, Category, Tag, SavedSearch } from "@/lib/db/schema";
import dynamic from "next/dynamic";

const spinningCoinImport = () => import("./SpinningCoinLogo").then((m) => ({ default: m.SpinningCoinLogo }));
const SpinningCoinLogo = dynamic(spinningCoinImport, { ssr: false });

// Precargar el módulo Three.js + GLB al cargar este módulo (no al abrir la sidebar)
// NOTA: Safari/WebKit lanza ReferenceError en variables no declaradas aunque se use ?. (optional chaining)
// Por eso usamos typeof guard en lugar de requestIdleCallback?.()
if (typeof window !== "undefined") {
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => spinningCoinImport());
  } else {
    setTimeout(() => spinningCoinImport(), 1000);
  }
}
import { motion } from "motion/react";

// dnd-kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Tag color mapping
const TAG_COLORS: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  amber: "bg-amber-500",
  yellow: "bg-yellow-500",
  lime: "bg-lime-500",
  green: "bg-green-500",
  emerald: "bg-emerald-500",
  teal: "bg-teal-500",
  cyan: "bg-cyan-500",
  sky: "bg-sky-500",
  blue: "bg-blue-500",
  indigo: "bg-indigo-500",
  violet: "bg-violet-500",
  purple: "bg-purple-500",
  fuchsia: "bg-fuchsia-500",
  pink: "bg-pink-500",
  rose: "bg-rose-500",
  slate: "bg-slate-500",
  gray: "bg-gray-500",
  zinc: "bg-zinc-500",
  neutral: "bg-neutral-500",
  stone: "bg-stone-500",
};

// Collapsible section header component
interface CollapsibleSectionProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

function CollapsibleSection({ title, isCollapsed, onToggle, count, actions, children }: CollapsibleSectionProps) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-3 py-1">
        <button
          onClick={onToggle}
          className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          <motion.div
            initial={false}
            animate={{ rotate: isCollapsed ? -90 : 0 }}
            transition={{ duration: 0.15 }}
          >
            <ChevronDown className="h-3 w-3" />
          </motion.div>
          {title}
          {count !== undefined && count > 0 && (
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px] ml-1">
              {count}
            </Badge>
          )}
        </button>
        {actions && (
          <div className="flex gap-1">
            {actions}
          </div>
        )}
      </div>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden will-change-[height,opacity]"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  count?: number;
  isActive?: boolean;
  onClick?: () => void;
  colorIndicator?: string;
  isDragging?: boolean;
  isOverlay?: boolean;
}

function NavItemContent({ icon, label, count, isActive, onClick, colorIndicator, isDragging, isOverlay }: NavItemProps) {
  return (
    <motion.div
      className={`${isDragging && !isOverlay ? "opacity-40" : ""}`}
      initial={false}
      animate={{
        scale: isOverlay ? 1.02 : 1,
        boxShadow: isOverlay
          ? "0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 4px 10px -5px rgba(0, 0, 0, 0.2)"
          : "none",
      }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
        } ${isOverlay ? "bg-sidebar/95 backdrop-blur-sm border border-sidebar-border rounded-lg" : ""}`}
      >
        {colorIndicator && (
          <div className={`w-2 h-2 rounded-full ${colorIndicator} flex-shrink-0`} />
        )}
        {icon}
        <span className="flex-1 text-left">{label}</span>
        {count !== undefined && (
          <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
            {count}
          </Badge>
        )}
      </button>
    </motion.div>
  );
}

function NavItem({ icon, label, count, isActive, onClick, colorIndicator }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-[colors,transform] duration-150 hover:translate-x-1 active:scale-[0.98] ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
    >
      {colorIndicator && (
        <div className={`w-2 h-2 rounded-full ${colorIndicator} flex-shrink-0`} />
      )}
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="h-5 min-w-5 px-1.5 text-xs">
          {count}
        </Badge>
      )}
    </button>
  );
}

// Sortable Category Item
interface SortableCategoryProps {
  category: Category;
  linkCount: number;
  isActive: boolean;
  onClick: () => void;
  onShare: (category: Category) => void;
  isDesktop: boolean;
}

function SortableCategoryItem({ category, linkCount, isActive, onClick, onShare, isDesktop }: SortableCategoryProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation cursor-default group/share relative"
    >
      <NavItemContent
        icon={<FolderOpen className="h-4 w-4" />}
        label={category.name}
        count={linkCount}
        isActive={isActive}
        onClick={onClick}
        isDragging={isDragging}
      />
      {!isDesktop && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(category); }}
              aria-label={t("sidebar.shareCategory")}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/share:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>{t("sidebar.shareCategory")}</p></TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Sortable Tag Item
interface SortableTagProps {
  tag: Tag;
  linkCount: number;
  isActive: boolean;
  onClick: () => void;
  colorClass: string;
  onShare: (tag: Tag) => void;
  isDesktop: boolean;
}

function SortableTagItem({ tag, linkCount, isActive, onClick, colorClass, onShare, isDesktop }: SortableTagProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tag.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-manipulation cursor-default group/share relative"
    >
      <NavItemContent
        icon={<TagIcon className="h-4 w-4" />}
        label={tag.name}
        count={linkCount}
        isActive={isActive}
        onClick={onClick}
        colorIndicator={colorClass}
        isDragging={isDragging}
      />
      {!isDesktop && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); onShare(tag); }}
              aria-label={t("sidebar.shareTag")}
              className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/share:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <Share2 className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top"><p>{t("sidebar.shareTag")}</p></TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// Local storage key for collapsed sections
const COLLAPSED_SECTIONS_KEY = "stacklume-sidebar-collapsed";

interface CollapsedSections {
  projects: boolean;
  categories: boolean;
  tags: boolean;
  reading: boolean;
  savedSearches: boolean;
}

export function Sidebar() {
  const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);
  const sidebarAlwaysVisible = useSettingsStore((state) => state.sidebarAlwaysVisible);
  const sidebarDensity = useSettingsStore((state) => state.sidebarDensity);
  const categories = useLinksStore((state) => state.categories);
  const links = useLinksStore((state) => state.links);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  const { t } = useTranslation();
  const { isDesktop } = useElectron();

  // Trash modal state
  const [showTrash, setShowTrash] = useState(false);
  const [trashCount, setTrashCount] = useState(0);

  // Fetch trash count on mount and when sidebar opens
  useEffect(() => {
    if (sidebarOpen || sidebarAlwaysVisible) {
      fetch("/api/trash", { headers: getCsrfHeaders(), credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (data?.totals?.total != null) setTrashCount(data.totals.total); })
        .catch(() => {});
    }
  }, [sidebarOpen, sidebarAlwaysVisible]);

  // Share dialog state
  const [shareDialogState, setShareDialogState] = useState<{
    open: boolean;
    type: "category" | "tag";
    referenceId: string;
    name: string;
  }>({ open: false, type: "category", referenceId: "", name: "" });

  const handleCategoryShare = useCallback((category: Category) => {
    setShareDialogState({ open: true, type: "category", referenceId: category.id, name: category.name });
  }, []);

  const handleTagShare = useCallback((tag: Tag) => {
    setShareDialogState({ open: true, type: "tag", referenceId: tag.id, name: tag.name });
  }, []);

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSaveSearchDialog, setShowSaveSearchDialog] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState("");
  const [isSavingSearch, setIsSavingSearch] = useState(false);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const activeFilter = useLayoutStore((state) => state.activeFilter);

  // Fetch saved searches on mount and when sidebar opens
  useEffect(() => {
    if (sidebarOpen || sidebarAlwaysVisible) {
      fetch("/api/saved-searches", { headers: getCsrfHeaders(), credentials: "include" })
        .then((r) => r.ok ? r.json() : [])
        .then((data: SavedSearch[]) => { if (Array.isArray(data)) setSavedSearches(data); })
        .catch(() => {});
    }
  }, [sidebarOpen, sidebarAlwaysVisible]);

  const handleSaveSearch = useCallback(async () => {
    if (!saveSearchName.trim()) return;
    setIsSavingSearch(true);
    try {
      const currentQuery = useLayoutStore.getState().searchQuery;
      const currentFilter = useLayoutStore.getState().activeFilter;
      const filters: Record<string, unknown> = {};
      if (currentFilter.type !== "all") {
        filters.filterType = currentFilter.type;
        if (currentFilter.id) filters.filterId = currentFilter.id;
        if (currentFilter.ids) filters.filterIds = currentFilter.ids;
        if (currentFilter.label) filters.filterLabel = currentFilter.label;
      }

      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify({
          name: saveSearchName.trim(),
          query: currentQuery || " ", // API requires non-empty query
          filters: Object.keys(filters).length > 0 ? filters : null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSavedSearches((prev) => [...prev, created]);
        setShowSaveSearchDialog(false);
        setSaveSearchName("");
      }
    } catch {
      // Silently fail
    } finally {
      setIsSavingSearch(false);
    }
  }, [saveSearchName]);

  const handleDeleteSavedSearch = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/saved-searches?id=${id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // Silently fail
    }
  }, []);

  const handleApplySavedSearch = useCallback((search: SavedSearch) => {
    const query = search.query?.trim() === " " ? "" : (search.query ?? "");
    useLayoutStore.getState().setSearchQuery(query);

    const filters = search.filters as Record<string, unknown> | null;
    if (filters?.filterType) {
      useLayoutStore.getState().setActiveFilter({
        type: filters.filterType as "all" | "favorites" | "recent" | "category" | "tag" | "readingStatus",
        id: filters.filterId as string | undefined,
        ids: filters.filterIds as string[] | undefined,
        label: filters.filterLabel as string | undefined,
      });
    } else if (query) {
      // Si solo tiene query sin filtro, limpiar filtro activo
      useLayoutStore.getState().setActiveFilter({ type: "all" });
    }

    useLayoutStore.getState().setSidebarOpen(false);
  }, []);

  // Determinar si hay una búsqueda/filtro activo que se puede guardar
  const hasActiveSearch = searchQuery.trim().length > 0 || activeFilter.type !== "all";

  // Drag state for categories and tags
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  // Collapsed sections state with localStorage persistence
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return { projects: false, categories: false, tags: false, reading: false, savedSearches: false };
        }
      }
    }
    return { projects: false, categories: false, tags: false, reading: false, savedSearches: false };
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (section: keyof CollapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const favoriteCount = useMemo(() => links.filter((l: Link) => l.isFavorite).length, [links]);
  const recentCount = Math.min(links.length, 10);

  const readingStatusCounts = useMemo(() => ({
    inbox: links.filter((l: Link) => !l.deletedAt && (l.readingStatus ?? "inbox") === "inbox").length,
    reading: links.filter((l: Link) => !l.deletedAt && (l.readingStatus ?? "inbox") === "reading").length,
    done: links.filter((l: Link) => !l.deletedAt && (l.readingStatus ?? "inbox") === "done").length,
  }), [links]);

  const categoryLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of links) {
      if (l.categoryId) {
        counts[l.categoryId] = (counts[l.categoryId] || 0) + 1;
      }
    }
    return counts;
  }, [links]);

  const tagLinkCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const lt of linkTags) {
      counts[(lt as { tagId: string }).tagId] = (counts[(lt as { tagId: string }).tagId] || 0) + 1;
    }
    return counts;
  }, [linkTags]);

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

  const handleHomeClick = () => {
    useLayoutStore.getState().clearFilter();
    useProjectsStore.getState().setActiveProject(null);
    useLayoutStore.getState().setSidebarOpen(false);
  };

  const handleFavoritesClick = () => {
    useLayoutStore.getState().setActiveFilter({ type: "favorites", label: t("sidebar.favorites") });
    useLayoutStore.getState().setSidebarOpen(false);
  };

  const handleRecentClick = () => {
    useLayoutStore.getState().setActiveFilter({ type: "recent", label: t("sidebar.recent") });
    useLayoutStore.getState().setSidebarOpen(false);
  };

  const handleReadingStatusClick = (status: "inbox" | "reading" | "done", label: string) => {
    useLayoutStore.getState().setActiveFilter({ type: "readingStatus", id: status, label });
    useLayoutStore.getState().setSidebarOpen(false);
  };

  const handleCategoryClick = (category: Category) => {
    if (!activeCategoryId) {
      useLayoutStore.getState().setActiveFilter({ type: "category", id: category.id, label: category.name });
      useLayoutStore.getState().setSidebarOpen(false);
    }
  };

  const handleTagClick = (tag: Tag) => {
    if (!activeTagId) {
      useLayoutStore.getState().setActiveFilter({ type: "tag", id: tag.id, label: tag.name });
      useLayoutStore.getState().setSidebarOpen(false);
    }
  };

  const getTagLinkCount = useCallback((tagId: string) => tagLinkCounts[tagId] || 0, [tagLinkCounts]);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [categories]);
  const sortedTags = useMemo(() => [...tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [tags]);

  // Category drag handlers
  const handleCategoryDragStart = (event: DragStartEvent) => {
    setActiveCategoryId(event.active.id as string);
  };

  const handleCategoryDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCategoryId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedCategories.findIndex((c) => c.id === active.id);
      const newIndex = sortedCategories.findIndex((c) => c.id === over.id);
      const newOrder = arrayMove(sortedCategories, oldIndex, newIndex);
      useLinksStore.getState().reorderCategories(newOrder.map((c) => c.id));
    }
  };

  const handleCategoryDragCancel = () => {
    setActiveCategoryId(null);
  };

  // Tag drag handlers
  const handleTagDragStart = (event: DragStartEvent) => {
    setActiveTagId(event.active.id as string);
  };

  const handleTagDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTagId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedTags.findIndex((t) => t.id === active.id);
      const newIndex = sortedTags.findIndex((t) => t.id === over.id);
      const newOrder = arrayMove(sortedTags, oldIndex, newIndex);
      useLinksStore.getState().reorderTags(newOrder.map((t) => t.id));
    }
  };

  const handleTagDragCancel = () => {
    setActiveTagId(null);
  };

  // Get active items for overlay
  const activeCategory = activeCategoryId
    ? sortedCategories.find((c) => c.id === activeCategoryId)
    : null;
  const activeTag = activeTagId
    ? sortedTags.find((t) => t.id === activeTagId)
    : null;

  return (
    <Sheet
      open={sidebarAlwaysVisible || sidebarOpen}
      onOpenChange={sidebarAlwaysVisible ? undefined : (open) => useLayoutStore.getState().setSidebarOpen(open)}
      modal={!sidebarAlwaysVisible}
    >
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar border-r border-sidebar-border [&>button]:hidden contain-content"
      >
        <SheetTitle className="sr-only">{t("sidebar.navTitle")}</SheetTitle>
        <SheetDescription className="sr-only">{t("sidebar.navDescription")}</SheetDescription>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md overflow-hidden">
                <SpinningCoinLogo width={28} height={28} />
              </div>
              <span className="font-semibold text-sidebar-foreground">
                Stacklume
              </span>
            </div>
            {!sidebarAlwaysVisible && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
                onClick={() => useLayoutStore.getState().setSidebarOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <div className={`flex-1 overflow-y-auto scrollbar-none ${sidebarDensity === "compact" ? "px-2 py-2" : sidebarDensity === "comfortable" ? "px-4 py-5" : "px-3 py-4"}`}>
            <div className="space-y-1">
              <NavItem
                icon={<Home className="h-4 w-4" />}
                label={t("sidebar.home")}
                isActive={activeFilter.type === "all" && activeProjectId === null}
                onClick={handleHomeClick}
              />
              <NavItem
                icon={<Star className="h-4 w-4" />}
                label={t("sidebar.favorites")}
                count={favoriteCount}
                isActive={activeFilter.type === "favorites"}
                onClick={handleFavoritesClick}
              />
              <NavItem
                icon={<Clock className="h-4 w-4" />}
                label={t("sidebar.recent")}
                count={recentCount}
                isActive={activeFilter.type === "recent"}
                onClick={handleRecentClick}
              />
            </div>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Reading Status */}
            <CollapsibleSection
              title={t("sidebar.reading")}
              isCollapsed={collapsedSections.reading}
              onToggle={() => toggleSection("reading")}
              count={readingStatusCounts.inbox + readingStatusCounts.reading}
            >
              <NavItem
                icon={<Inbox className="h-4 w-4" />}
                label={t("sidebar.readingInbox")}
                count={readingStatusCounts.inbox}
                isActive={activeFilter.type === "readingStatus" && activeFilter.id === "inbox"}
                onClick={() => handleReadingStatusClick("inbox", t("sidebar.readingInbox"))}
              />
              <NavItem
                icon={<BookOpen className="h-4 w-4" />}
                label={t("sidebar.readingInProgress")}
                count={readingStatusCounts.reading}
                isActive={activeFilter.type === "readingStatus" && activeFilter.id === "reading"}
                onClick={() => handleReadingStatusClick("reading", t("sidebar.readingInProgress"))}
              />
              <NavItem
                icon={<CheckCheck className="h-4 w-4" />}
                label={t("sidebar.readingDone")}
                count={readingStatusCounts.done}
                isActive={activeFilter.type === "readingStatus" && activeFilter.id === "done"}
                onClick={() => handleReadingStatusClick("done", t("sidebar.readingDone"))}
              />
            </CollapsibleSection>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Saved Searches */}
            <CollapsibleSection
              title={t("sidebar.savedSearches")}
              isCollapsed={collapsedSections.savedSearches}
              onToggle={() => toggleSection("savedSearches")}
              count={savedSearches.length}
              actions={
                hasActiveSearch ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        aria-label={t("sidebar.saveCurrentSearch")}
                        onClick={() => {
                          setSaveSearchName("");
                          setShowSaveSearchDialog(true);
                        }}
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{t("sidebar.saveCurrentSearch")}</p></TooltipContent>
                  </Tooltip>
                ) : undefined
              }
            >
              {savedSearches.map((search) => (
                <div key={search.id} className="group/saved relative">
                  <NavItem
                    icon={<Search className="h-4 w-4" />}
                    label={search.name}
                    onClick={() => handleApplySavedSearch(search)}
                  />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSavedSearch(search.id); }}
                    aria-label={t("sidebar.deleteSavedSearch")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md opacity-0 group-hover/saved:opacity-100 transition-opacity text-sidebar-foreground/40 hover:text-destructive hover:bg-sidebar-accent"
                  >
                    <Trash className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {savedSearches.length === 0 && (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                  {t("sidebar.noSavedSearches")}
                </p>
              )}
            </CollapsibleSection>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Projects */}
            <ProjectList
              isCollapsed={collapsedSections.projects}
              onToggle={() => toggleSection("projects")}
            />

            <Separator className="my-4 bg-sidebar-border" />

            {/* Categories with drag and drop */}
            <CollapsibleSection
              title={t("sidebar.categories")}
              isCollapsed={collapsedSections.categories}
              onToggle={() => toggleSection("categories")}
              count={categories.length}
              actions={
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        aria-label={t("sidebar.manageCategories")}
                        onClick={() => {
                          useLinksStore.getState().setManageCategoriesModalOpen(true);
                          useLayoutStore.getState().setSidebarOpen(false);
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{t("sidebar.manageCategories")}</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        aria-label={t("sidebar.newCategory")}
                        onClick={() => {
                          useLinksStore.getState().setAddCategoryModalOpen(true);
                          useLayoutStore.getState().setSidebarOpen(false);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{t("sidebar.newCategory")}</p></TooltipContent>
                  </Tooltip>
                </>
              }
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleCategoryDragStart}
                onDragEnd={handleCategoryDragEnd}
                onDragCancel={handleCategoryDragCancel}
              >
                <SortableContext
                  items={sortedCategories.map((c) => c.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedCategories.map((category: Category) => {
                    return (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        linkCount={categoryLinkCounts[category.id] || 0}
                        isActive={activeFilter.type === "category" && activeFilter.id === category.id}
                        onClick={() => handleCategoryClick(category)}
                        onShare={handleCategoryShare}
                        isDesktop={isDesktop}
                      />
                    );
                  })}
                </SortableContext>

                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeCategory ? (
                    <NavItemContent
                      icon={<FolderOpen className="h-4 w-4" />}
                      label={activeCategory.name}
                      count={categoryLinkCounts[activeCategory.id] || 0}
                      isActive={activeFilter.type === "category" && activeFilter.id === activeCategory.id}
                      onClick={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>

              {categories.length === 0 && (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                  {t("sidebar.noCategories")}
                </p>
              )}
            </CollapsibleSection>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Tags section with drag and drop */}
            <CollapsibleSection
              title={t("sidebar.tags")}
              isCollapsed={collapsedSections.tags}
              onToggle={() => toggleSection("tags")}
              count={tags.length}
              actions={
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        aria-label={t("sidebar.manageTags")}
                        onClick={() => {
                          useLinksStore.getState().setManageTagsModalOpen(true);
                          useLayoutStore.getState().setSidebarOpen(false);
                        }}
                      >
                        <Settings className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{t("sidebar.manageTags")}</p></TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                        aria-label={t("sidebar.newTag")}
                        onClick={() => {
                          useLinksStore.getState().setAddTagModalOpen(true);
                          useLayoutStore.getState().setSidebarOpen(false);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top"><p>{t("sidebar.newTag")}</p></TooltipContent>
                  </Tooltip>
                </>
              }
            >
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleTagDragStart}
                onDragEnd={handleTagDragEnd}
                onDragCancel={handleTagDragCancel}
              >
                <SortableContext
                  items={sortedTags.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedTags.map((tag: Tag) => {
                    const tagLinkCount = getTagLinkCount(tag.id);
                    const colorClass = tag.color ? TAG_COLORS[tag.color] || TAG_COLORS.gray : TAG_COLORS.gray;

                    return (
                      <SortableTagItem
                        key={tag.id}
                        tag={tag}
                        linkCount={tagLinkCount}
                        isActive={activeFilter.type === "tag" && activeFilter.id === tag.id}
                        onClick={() => handleTagClick(tag)}
                        colorClass={colorClass}
                        onShare={handleTagShare}
                        isDesktop={isDesktop}
                      />
                    );
                  })}
                </SortableContext>

                <DragOverlay dropAnimation={{
                  duration: 200,
                  easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
                }}>
                  {activeTag ? (
                    <NavItemContent
                      icon={<TagIcon className="h-4 w-4" />}
                      label={activeTag.name}
                      count={getTagLinkCount(activeTag.id)}
                      isActive={activeFilter.type === "tag" && activeFilter.id === activeTag.id}
                      onClick={() => {}}
                      colorIndicator={activeTag.color ? TAG_COLORS[activeTag.color] || TAG_COLORS.gray : TAG_COLORS.gray}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>

              {tags.length === 0 && (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                  {t("sidebar.noTags")}
                </p>
              )}
            </CollapsibleSection>
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-3 py-3 space-y-2">
            <NavItem
              icon={<Trash2 className="h-4 w-4" />}
              label={t("sidebar.trash")}
              count={trashCount > 0 ? trashCount : undefined}
              onClick={() => {
                setShowTrash(true);
                useLayoutStore.getState().setSidebarOpen(false);
              }}
            />
            <p className="text-xs text-sidebar-foreground/40 text-center">
              {t("sidebar.savedLinks", { count: links.length })}
            </p>
          </div>
        </div>
      </SheetContent>

      {/* Project Modals */}
      <AddProjectModal />
      <EditProjectModal />

      {/* Trash Modal */}
      <TrashModal open={showTrash} onOpenChange={(open) => {
        setShowTrash(open);
        if (!open) {
          // Re-fetch trash count when modal closes (items may have been restored/deleted)
          fetch("/api/trash", { headers: getCsrfHeaders(), credentials: "include" })
            .then((r) => r.ok ? r.json() : null)
            .then((data) => { if (data?.totals?.total != null) setTrashCount(data.totals.total); })
            .catch(() => {});
        }
      }} />

      {/* Share Collection Dialog */}
      <ShareCollectionDialog
        type={shareDialogState.type}
        referenceId={shareDialogState.referenceId}
        name={shareDialogState.name}
        open={shareDialogState.open}
        onOpenChange={(open) => setShareDialogState((prev) => ({ ...prev, open }))}
      />

      {/* Save Search Dialog */}
      <Dialog open={showSaveSearchDialog} onOpenChange={setShowSaveSearchDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{t("sidebar.saveSearchTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="save-search-name">{t("sidebar.saveSearchName")}</Label>
              <Input
                id="save-search-name"
                placeholder={t("sidebar.saveSearchNamePlaceholder")}
                value={saveSearchName}
                onChange={(e) => setSaveSearchName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && saveSearchName.trim()) {
                    handleSaveSearch();
                  }
                }}
                autoFocus
              />
            </div>
            {searchQuery && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{t("header.search")}:</span>{" "}
                <span className="text-foreground">&quot;{searchQuery}&quot;</span>
              </div>
            )}
            {activeFilter.type !== "all" && activeFilter.label && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{t("sidebar.categories")}:</span>{" "}
                <Badge variant="secondary" className="text-xs">{activeFilter.label}</Badge>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveSearchDialog(false)}>
              {t("sidebar.saveSearchCancel")}
            </Button>
            <Button onClick={handleSaveSearch} disabled={!saveSearchName.trim() || isSavingSearch}>
              {t("sidebar.saveSearchSave")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}
