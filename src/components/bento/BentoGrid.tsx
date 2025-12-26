"use client";

import { useCallback, useMemo, useState, useEffect, useDeferredValue, memo, useRef } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import { useLayoutStore } from "@/stores/layout-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useProjectsStore, useProjectsHasHydrated } from "@/stores/projects-store";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
import { BentoCard } from "./BentoCard";
import { EmptyState, SearchEmptyState, WidgetEmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { generateResponsiveLayouts, COLS, BREAKPOINTS } from "@/lib/responsive-layout";
import { useDragAnnouncements, getPositionInfo } from "@/hooks/useDragAnnouncements";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { KeyboardDragHelper } from "@/components/ui/KeyboardDragHelper";
import type { Widget } from "@/types/widget";
import type { Link } from "@/lib/db/schema";

// Memoized wrapper for BentoCard to prevent unnecessary re-renders
const MemoizedBentoCard = memo(BentoCard);

const ResponsiveGridLayout = WidthProvider(Responsive);

type Breakpoint = "lg" | "md" | "sm";

interface BentoGridProps {
  className?: string;
}

export function BentoGrid({ className }: BentoGridProps) {
  const isEditMode = useLayoutStore((state) => state.isEditMode);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const widgets = useWidgetStore((state) => state.widgets);
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);
  const currentProjectId = useWidgetStore((state) => state.currentProjectId);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  const projectsHydrated = useProjectsHasHydrated();
  const links = useLinksStore((state) => state.links);
  const linkTags = useLinksStore((state) => state.linkTags);
  const viewDensity = useSettingsStore((state) => state.viewDensity);
  const [mounted, setMounted] = useState(false);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<Breakpoint>("lg");

  // Accessibility: Drag announcements for screen readers
  const { announcements, dragInstructionsId, LiveRegion } = useDragAnnouncements();
  const prefersReducedMotion = useReducedMotion();

  // Keyboard drag state
  const [keyboardDragState, setKeyboardDragState] = useState<{
    isActive: boolean;
    widgetId: string | null;
    originalPosition: { x: number; y: number } | null;
    currentPosition: { x: number; y: number };
  }>({
    isActive: false,
    widgetId: null,
    originalPosition: null,
    currentPosition: { x: 0, y: 0 },
  });

  // Track the currently dragging widget for announcements
  const draggingWidgetRef = useRef<{ id: string; title: string } | null>(null);

  // Track if we're in the middle of a user-initiated drag/resize
  const isUserInteracting = useRef(false);
  // Track the last saved layout to avoid duplicate saves
  const lastSavedLayoutRef = useRef<string>("");

  // Defer search query updates to reduce re-renders during typing
  const deferredSearchQuery = useDeferredValue(searchQuery);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      // Zustand store functions are stable, safe to call directly
      useWidgetStore.getState().cleanup();
    };
     
  }, []); // Run once on unmount - cleanup function is stable

  // Sync project ID from projects store to widget store
  // Only sync AFTER hydration is complete to avoid SSR mismatch issues
  useEffect(() => {
    // Wait for projects store to hydrate before syncing
    if (!projectsHydrated) return;

    const currentInStore = useWidgetStore.getState().currentProjectId;
    // Sync if there's a mismatch (handles initial mount and subsequent changes)
    if (currentInStore !== activeProjectId) {
      useWidgetStore.getState().setCurrentProjectId(activeProjectId);
    }
  }, [activeProjectId, projectsHydrated]);

  // Get widgets filtered by current project - computed directly instead of using store function
  const projectWidgets = useMemo(() => {
    return widgets.filter(widget => {
      const widgetProjectId = widget.projectId ?? null;
      return widgetProjectId === currentProjectId;
    });
  }, [widgets, currentProjectId]);

  // Filter widgets based on active filter and search query
  const filteredWidgets = useMemo(() => {
    // Helper to get links for a widget
    const getWidgetLinks = (widget: Widget): Link[] => {
      if (widget.type === "favorites") {
        return links.filter((l: Link) => l.isFavorite);
      }
      if (widget.type === "recent") {
        return [...links]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10);
      }
      if (widget.type === "category" && widget.categoryId) {
        return links.filter((l: Link) => l.categoryId === widget.categoryId);
      }
      if (widget.type === "tag" && widget.tagId) {
        // Get links for tag directly using linkTags data (avoid store function)
        const tagLinkIds = linkTags
          .filter((lt: { linkId: string; tagId: string }) => lt.tagId === widget.tagId)
          .map((lt: { linkId: string; tagId: string }) => lt.linkId);
        return links.filter((l: Link) => tagLinkIds.includes(l.id));
      }
      return [];
    };

    // Helper to check if widget matches search query
    const matchesSearch = (widget: Widget): boolean => {
      if (!deferredSearchQuery.trim()) return true;

      const query = deferredSearchQuery.toLowerCase().trim();

      // Check widget title
      if (widget.title.toLowerCase().includes(query)) return true;

      // Check widget links
      const widgetLinks = getWidgetLinks(widget);
      return widgetLinks.some((link: Link) =>
        link.title.toLowerCase().includes(query) ||
        link.url.toLowerCase().includes(query) ||
        (link.description && link.description.toLowerCase().includes(query))
      );
    };

    // If no filter is active (type = "all") and no search, show all project widgets
    if (activeFilter.type === "all" && !deferredSearchQuery.trim()) {
      return projectWidgets;
    }

    // Filter by active filter type (start with project-filtered widgets)
    let filtered = projectWidgets;

    if (activeFilter.type === "favorites") {
      // Show only: favorites widget, or widgets that have favorite links
      filtered = projectWidgets.filter((widget: Widget) => {
        if (widget.type === "favorites") return true;
        const widgetLinks = getWidgetLinks(widget);
        return widgetLinks.some((link: Link) => link.isFavorite);
      });
    } else if (activeFilter.type === "recent") {
      // Show only: recent widget, or all link-based widgets (they all have "recent" links)
      filtered = projectWidgets.filter((widget: Widget) => {
        if (widget.type === "recent") return true;
        // For recent filter, show widgets that have links
        const widgetLinks = getWidgetLinks(widget);
        return widgetLinks.length > 0;
      });
    } else if (activeFilter.type === "category" && activeFilter.id) {
      // Show only: the specific category widget, or widgets with links in that category
      filtered = projectWidgets.filter((widget: Widget) => {
        if (widget.type === "category" && widget.categoryId === activeFilter.id) return true;
        const widgetLinks = getWidgetLinks(widget);
        return widgetLinks.some((link: Link) => link.categoryId === activeFilter.id);
      });
    } else if (activeFilter.type === "tag" && activeFilter.id) {
      // Show only: the specific tag widget, or widgets with links that have that tag
      const tagLinkIds = linkTags
        .filter((lt: { linkId: string; tagId: string }) => lt.tagId === activeFilter.id)
        .map((lt: { linkId: string; tagId: string }) => lt.linkId);

      filtered = projectWidgets.filter((widget: Widget) => {
        if (widget.type === "tag" && widget.tagId === activeFilter.id) return true;
        const widgetLinks = getWidgetLinks(widget);
        return widgetLinks.some((link: Link) => tagLinkIds.includes(link.id));
      });
    }

    // Apply search filter on top of the type filter
    if (deferredSearchQuery.trim()) {
      filtered = filtered.filter(matchesSearch);
    }

    return filtered;
  }, [projectWidgets, activeFilter, deferredSearchQuery, links, linkTags]);

  // Generate responsive layouts for all breakpoints
  const layouts = useMemo(() => {
    return generateResponsiveLayouts(filteredWidgets);
  }, [filteredWidgets]);

  // Handle layout changes from user interaction (drag/resize)
  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      // Only save if user is actively interacting (in edit mode and dragging/resizing)
      if (!isEditMode || !isUserInteracting.current) return;

      // Get the layout for the current breakpoint
      const layoutToSave = allLayouts[currentBreakpoint] || currentLayout;

      // Create a hash of the layout to compare
      const layoutHash = JSON.stringify(layoutToSave.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));

      // Skip if layout hasn't changed
      if (layoutHash === lastSavedLayoutRef.current) return;
      lastSavedLayoutRef.current = layoutHash;

      // If we're on a smaller breakpoint, we need to convert positions back to lg scale
      // But since we store based on user interaction, we can save the lg layout which maintains consistency
      const lgLayout = allLayouts.lg || currentLayout;

      // Update widget positions in the widget store using the lg layout
      reorderWidgets(lgLayout);
    },
    [reorderWidgets, isEditMode, currentBreakpoint]
  );

  // Handle drag start with screen reader announcement
  const handleDragStart = useCallback(
    (_layout: Layout[], oldItem: Layout, _newItem: Layout, _placeholder: Layout, _event: MouseEvent, _element: HTMLElement) => {
      isUserInteracting.current = true;

      // Find the widget being dragged
      const widget = filteredWidgets.find((w) => w.id === oldItem.i);
      if (widget) {
        draggingWidgetRef.current = { id: widget.id, title: widget.title };
        const { position, total } = getPositionInfo(filteredWidgets, widget.id);
        announcements.onDragStart(widget.title, position, total);
      }
    },
    [filteredWidgets, announcements]
  );

  // Handle drag stop with screen reader announcement
  const handleDragStop = useCallback(
    (layout: Layout[], _oldItem: Layout, newItem: Layout, _placeholder: Layout, _event: MouseEvent, _element: HTMLElement) => {
      isUserInteracting.current = false;

      if (!isEditMode) return;

      // Announce the drop for screen readers
      if (draggingWidgetRef.current) {
        const newIndex = layout.findIndex((l) => l.i === newItem.i);
        announcements.onDrop(
          draggingWidgetRef.current.title,
          newIndex + 1,
          layout.length
        );
        draggingWidgetRef.current = null;
      }

      // Save the final layout after drag
      const layoutHash = JSON.stringify(layout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
      if (layoutHash !== lastSavedLayoutRef.current) {
        lastSavedLayoutRef.current = layoutHash;
        reorderWidgets(layout);
      }
    },
    [isEditMode, reorderWidgets, announcements]
  );

  // Handle resize start
  const handleResizeStart = useCallback(() => {
    isUserInteracting.current = true;
  }, []);

  // Handle resize stop
  const handleResizeStop = useCallback(
    (layout: Layout[]) => {
      isUserInteracting.current = false;

      if (!isEditMode) return;

      // Save the final layout after resize
      const layoutHash = JSON.stringify(layout.map(l => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h })));
      if (layoutHash !== lastSavedLayoutRef.current) {
        lastSavedLayoutRef.current = layoutHash;
        reorderWidgets(layout);
      }
    },
    [isEditMode, reorderWidgets]
  );

  // Handle breakpoint change
  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint as Breakpoint);
  }, []);

  // Keyboard drag handlers
  const handleKeyboardDragActivate = useCallback(
    (widgetId: string) => {
      const widget = filteredWidgets.find((w) => w.id === widgetId);
      if (!widget) return;

      setKeyboardDragState({
        isActive: true,
        widgetId,
        originalPosition: { x: widget.layout.x, y: widget.layout.y },
        currentPosition: { x: widget.layout.x, y: widget.layout.y },
      });

      const { position, total } = getPositionInfo(filteredWidgets, widgetId);
      announcements.onDragStart(widget.title, position, total);
    },
    [filteredWidgets, announcements]
  );

  const handleKeyboardPositionChange = useCallback(
    (newPosition: { x: number; y: number }) => {
      setKeyboardDragState((prev) => ({
        ...prev,
        currentPosition: newPosition,
      }));

      // Announce new position
      const widget = filteredWidgets.find((w) => w.id === keyboardDragState.widgetId);
      if (widget) {
        announcements.onDragOver(widget.title, newPosition.y + 1, filteredWidgets.length);
      }
    },
    [filteredWidgets, keyboardDragState.widgetId, announcements]
  );

  const handleKeyboardDragConfirm = useCallback(() => {
    if (!keyboardDragState.widgetId) return;

    const widget = filteredWidgets.find((w) => w.id === keyboardDragState.widgetId);
    if (widget) {
      // Update the widget layout
      const newLayout = filteredWidgets.map((w) => ({
        i: w.id,
        x: w.id === keyboardDragState.widgetId ? keyboardDragState.currentPosition.x : w.layout.x,
        y: w.id === keyboardDragState.widgetId ? keyboardDragState.currentPosition.y : w.layout.y,
        w: w.layout.w,
        h: w.layout.h,
      }));

      reorderWidgets(newLayout);

      const { position, total } = getPositionInfo(filteredWidgets, keyboardDragState.widgetId);
      announcements.onDrop(widget.title, position, total);
    }

    setKeyboardDragState({
      isActive: false,
      widgetId: null,
      originalPosition: null,
      currentPosition: { x: 0, y: 0 },
    });
  }, [keyboardDragState, filteredWidgets, reorderWidgets, announcements]);

  const handleKeyboardDragCancel = useCallback(() => {
    const widget = filteredWidgets.find((w) => w.id === keyboardDragState.widgetId);
    if (widget) {
      announcements.onDragCancel(widget.title);
    }

    setKeyboardDragState({
      isActive: false,
      widgetId: null,
      originalPosition: null,
      currentPosition: { x: 0, y: 0 },
    });
  }, [keyboardDragState.widgetId, filteredWidgets, announcements]);

  // Handle keyboard events on widget items
  const handleWidgetKeyDown = useCallback(
    (event: React.KeyboardEvent, widgetId: string) => {
      if (!isEditMode) return;

      // Activate keyboard drag on Space or Enter
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        handleKeyboardDragActivate(widgetId);
      }
    },
    [isEditMode, handleKeyboardDragActivate]
  );

  // Get current widget for keyboard drag helper
  const keyboardDragWidget = useMemo(() => {
    if (!keyboardDragState.widgetId) return null;
    return filteredWidgets.find((w) => w.id === keyboardDragState.widgetId) || null;
  }, [keyboardDragState.widgetId, filteredWidgets]);

  const children = useMemo(() => {
    return filteredWidgets.map((widget) => {
      const isBeingDragged = keyboardDragState.isActive && keyboardDragState.widgetId === widget.id;

      return (
        <div
          key={widget.id}
          className={cn(
            "h-full w-full",
            isBeingDragged && "ring-2 ring-primary ring-offset-2 ring-offset-background"
          )}
          data-widget-id={widget.id}
          tabIndex={isEditMode ? 0 : -1}
          role={isEditMode ? "button" : undefined}
          aria-label={isEditMode ? `${widget.title}. Presiona Espacio o Enter para mover.` : undefined}
          aria-describedby={isEditMode ? dragInstructionsId : undefined}
          aria-grabbed={isEditMode ? isBeingDragged : undefined}
          onKeyDown={(e) => handleWidgetKeyDown(e, widget.id)}
        >
          <MemoizedBentoCard widget={widget} />
        </div>
      );
    });
  }, [filteredWidgets, isEditMode, keyboardDragState, dragInstructionsId, handleWidgetKeyDown]);

  // Apply view density settings
  const densityConfig = useMemo(() => {
    const configs = {
      compact: { margin: [6, 6], rowHeight: 80, containerPadding: [6, 6] },
      normal: { margin: [8, 8], rowHeight: 100, containerPadding: [8, 8] },
      comfortable: { margin: [12, 12], rowHeight: 120, containerPadding: [12, 12] },
    };
    return configs[viewDensity];
  }, [viewDensity]);

  // Get grid bounds for keyboard drag (must be before any early returns)
  const gridBounds = useMemo(() => ({
    minX: 0,
    maxX: COLS[currentBreakpoint] - 1,
    minY: 0,
    maxY: 100, // Reasonable max
    cols: COLS[currentBreakpoint],
  }), [currentBreakpoint]);

  // Wait for both mount AND hydration to complete before rendering widgets
  // This ensures activeProjectId is correctly loaded from localStorage
  if (!mounted || !projectsHydrated) {
    return (
      <div
        className="flex items-center justify-center h-full"
        role="status"
        aria-label="Cargando widgets"
      >
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Show empty state when no widgets match
  if (filteredWidgets.length === 0) {
    // Determine which empty state to show
    const hasSearchOrFilter = deferredSearchQuery.trim() || activeFilter.type !== "all";
    const hasNoWidgetsAtAll = projectWidgets.length === 0;

    if (hasSearchOrFilter) {
      // Show search/filter empty state with clear option
      return (
        <SearchEmptyState
          query={deferredSearchQuery}
          filterLabel={activeFilter.label || undefined}
          onClearSearch={() => useLayoutStore.getState().setSearchQuery("")}
          onClearFilter={() => useLayoutStore.getState().setActiveFilter({ type: "all" })}
          className="h-[50vh]"
        />
      );
    }

    if (hasNoWidgetsAtAll) {
      // Show empty state for no widgets with action to add
      return (
        <WidgetEmptyState
          onAddWidget={() => useWidgetStore.getState().openAddWidgetModal()}
          className="h-[50vh] mx-4"
        />
      );
    }

    // Fallback generic empty state
    return (
      <EmptyState
        variant="no-widgets"
        action={{
          label: "Agregar widget",
          onClick: () => useWidgetStore.getState().openAddWidgetModal(),
        }}
        className="h-[50vh]"
      />
    );
  }

  return (
    <>
      {/* Screen reader live region for drag announcements */}
      <LiveRegion />

      {/* Keyboard drag helper overlay */}
      {keyboardDragWidget && (
        <KeyboardDragHelper
          isActive={keyboardDragState.isActive}
          currentPosition={keyboardDragState.currentPosition}
          itemTitle={keyboardDragWidget.title}
          itemIndex={filteredWidgets.findIndex((w) => w.id === keyboardDragWidget.id) + 1}
          totalItems={filteredWidgets.length}
          gridBounds={gridBounds}
          onPositionChange={handleKeyboardPositionChange}
          onConfirm={handleKeyboardDragConfirm}
          onCancel={handleKeyboardDragCancel}
        />
      )}

      <div role="grid" aria-label="Cuadricula de widgets">
        <ResponsiveGridLayout
          key={`grid-${isEditMode ? 'edit' : 'view'}-${viewDensity}-${currentProjectId || 'home'}`}
          className={cn(
            "w-full",
            className,
            isEditMode && "edit-mode",
            // Add drop zone classes for visual feedback during drag
            isEditMode && "drop-zone-container"
          )}
          layouts={layouts}
          breakpoints={BREAKPOINTS}
          cols={COLS}
          rowHeight={densityConfig.rowHeight}
          margin={densityConfig.margin as [number, number]}
          containerPadding={densityConfig.containerPadding as [number, number]}
          onLayoutChange={handleLayoutChange}
          onBreakpointChange={handleBreakpointChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          onResizeStart={handleResizeStart}
          onResizeStop={handleResizeStop}
          isDraggable={isEditMode}
          isResizable={isEditMode}
          useCSSTransforms={!prefersReducedMotion}
          compactType="vertical"
          preventCollision={false}
          resizeHandles={["se", "sw", "ne", "nw", "e", "w", "n", "s"]}
          draggableHandle=".drag-handle"
        >
          {children}
        </ResponsiveGridLayout>
      </div>
    </>
  );
}
