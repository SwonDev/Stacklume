"use client";

import { useState, useEffect } from "react";
import { X, Star, Clock, FolderOpen, Plus, Tag as TagIcon, Home, Settings, ChevronDown } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { useProjectsStore } from "@/stores/projects-store";
import { ProjectList } from "@/components/projects/ProjectList";
import { AddProjectModal, EditProjectModal } from "@/components/projects/ProjectDialog";
import type { Link, Category, Tag } from "@/lib/db/schema";
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
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
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
    <motion.button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      }`}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
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
    </motion.button>
  );
}

// Sortable Category Item
interface SortableCategoryProps {
  category: Category;
  linkCount: number;
  isActive: boolean;
  onClick: () => void;
}

function SortableCategoryItem({ category, linkCount, isActive, onClick }: SortableCategoryProps) {
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
      className="touch-manipulation cursor-default"
    >
      <NavItemContent
        icon={<FolderOpen className="h-4 w-4" />}
        label={category.name}
        count={linkCount}
        isActive={isActive}
        onClick={onClick}
        isDragging={isDragging}
      />
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
}

function SortableTagItem({ tag, linkCount, isActive, onClick, colorClass }: SortableTagProps) {
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
      className="touch-manipulation cursor-default"
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
    </div>
  );
}

// Local storage key for collapsed sections
const COLLAPSED_SECTIONS_KEY = "stacklume-sidebar-collapsed";

interface CollapsedSections {
  projects: boolean;
  categories: boolean;
  tags: boolean;
}

export function Sidebar() {
  const sidebarOpen = useLayoutStore((state) => state.sidebarOpen);
  const setSidebarOpen = useLayoutStore((state) => state.setSidebarOpen);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const setActiveFilter = useLayoutStore((state) => state.setActiveFilter);
  const clearFilter = useLayoutStore((state) => state.clearFilter);
  const categories = useLinksStore((state) => state.categories);
  const links = useLinksStore((state) => state.links);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const setAddCategoryModalOpen = useLinksStore((state) => state.setAddCategoryModalOpen);
  const setAddTagModalOpen = useLinksStore((state) => state.setAddTagModalOpen);
  const setManageCategoriesModalOpen = useLinksStore((state) => state.setManageCategoriesModalOpen);
  const setManageTagsModalOpen = useLinksStore((state) => state.setManageTagsModalOpen);
  const reorderCategories = useLinksStore((state) => state.reorderCategories);
  const reorderTags = useLinksStore((state) => state.reorderTags);
  const setActiveProject = useProjectsStore((state) => state.setActiveProject);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);

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
          return { projects: false, categories: false, tags: false };
        }
      }
    }
    return { projects: false, categories: false, tags: false };
  });

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(collapsedSections));
  }, [collapsedSections]);

  const toggleSection = (section: keyof CollapsedSections) => {
    setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const favoriteCount = links.filter((l: Link) => l.isFavorite).length;
  const recentCount = Math.min(links.length, 10);

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
    clearFilter();
    setActiveProject(null);
    setSidebarOpen(false);
  };

  const handleFavoritesClick = () => {
    setActiveFilter({ type: "favorites", label: "Favoritos" });
    setSidebarOpen(false);
  };

  const handleRecentClick = () => {
    setActiveFilter({ type: "recent", label: "Recientes" });
    setSidebarOpen(false);
  };

  const handleCategoryClick = (category: Category) => {
    if (!activeCategoryId) {
      setActiveFilter({ type: "category", id: category.id, label: category.name });
      setSidebarOpen(false);
    }
  };

  const handleTagClick = (tag: Tag) => {
    if (!activeTagId) {
      setActiveFilter({ type: "tag", id: tag.id, label: tag.name });
      setSidebarOpen(false);
    }
  };

  // Calculate link count per tag
  const getTagLinkCount = (tagId: string) => {
    return linkTags.filter((lt: { linkId: string; tagId: string }) => lt.tagId === tagId).length;
  };

  // Sort categories and tags by order
  const sortedCategories = [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const sortedTags = [...tags].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

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
      reorderCategories(newOrder.map((c) => c.id));
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
      reorderTags(newOrder.map((t) => t.id));
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
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="left"
        className="w-72 p-0 bg-sidebar border-r border-sidebar-border [&>button]:hidden"
      >
        <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
        <SheetDescription className="sr-only">Navega por categorías y enlaces guardados</SheetDescription>
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-primary flex items-center justify-center">
                <span className="text-sm font-bold text-primary-foreground">
                  S
                </span>
              </div>
              <span className="font-semibold text-sidebar-foreground">
                Stacklume
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-foreground"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto px-3 py-4 scrollbar-none">
            <div className="space-y-1">
              <NavItem
                icon={<Home className="h-4 w-4" />}
                label="Inicio"
                isActive={activeFilter.type === "all" && activeProjectId === null}
                onClick={handleHomeClick}
              />
              <NavItem
                icon={<Star className="h-4 w-4" />}
                label="Favoritos"
                count={favoriteCount}
                isActive={activeFilter.type === "favorites"}
                onClick={handleFavoritesClick}
              />
              <NavItem
                icon={<Clock className="h-4 w-4" />}
                label="Recientes"
                count={recentCount}
                isActive={activeFilter.type === "recent"}
                onClick={handleRecentClick}
              />
            </div>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Projects */}
            <ProjectList
              isCollapsed={collapsedSections.projects}
              onToggle={() => toggleSection("projects")}
            />

            <Separator className="my-4 bg-sidebar-border" />

            {/* Categories with drag and drop */}
            <CollapsibleSection
              title="Categorías"
              isCollapsed={collapsedSections.categories}
              onToggle={() => toggleSection("categories")}
              count={categories.length}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setManageCategoriesModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    title="Gestionar categorías"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setAddCategoryModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    title="Nueva categoría"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
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
                    const categoryLinkCount = links.filter(
                      (l: Link) => l.categoryId === category.id
                    ).length;
                    return (
                      <SortableCategoryItem
                        key={category.id}
                        category={category}
                        linkCount={categoryLinkCount}
                        isActive={activeFilter.type === "category" && activeFilter.id === category.id}
                        onClick={() => handleCategoryClick(category)}
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
                      count={links.filter((l: Link) => l.categoryId === activeCategory.id).length}
                      isActive={activeFilter.type === "category" && activeFilter.id === activeCategory.id}
                      onClick={() => {}}
                      isOverlay
                    />
                  ) : null}
                </DragOverlay>
              </DndContext>

              {categories.length === 0 && (
                <p className="px-3 py-2 text-xs text-sidebar-foreground/40">
                  No hay categorías creadas
                </p>
              )}
            </CollapsibleSection>

            <Separator className="my-4 bg-sidebar-border" />

            {/* Tags section with drag and drop */}
            <CollapsibleSection
              title="Etiquetas"
              isCollapsed={collapsedSections.tags}
              onToggle={() => toggleSection("tags")}
              count={tags.length}
              actions={
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setManageTagsModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    title="Gestionar etiquetas"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-sidebar-foreground/50 hover:text-sidebar-foreground"
                    onClick={() => {
                      setAddTagModalOpen(true);
                      setSidebarOpen(false);
                    }}
                    title="Nueva etiqueta"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
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
                  Sin etiquetas
                </p>
              )}
            </CollapsibleSection>
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-4 py-3">
            <p className="text-xs text-sidebar-foreground/40 text-center">
              {links.length} enlaces guardados
            </p>
          </div>
        </div>
      </SheetContent>

      {/* Project Modals */}
      <AddProjectModal />
      <EditProjectModal />
    </Sheet>
  );
}
