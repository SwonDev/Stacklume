"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable";
import { useWidgetStore } from "@/stores/widget-store";
import { useProjectsStore } from "@/stores/projects-store";
import { useKanbanStore, useSortedColumns } from "@/stores/kanban-store";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Sparkles,
  Settings2,
  Columns3,
  Search,
  Filter,
  X,
  LayoutGrid,
  List,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Widget, WidgetType } from "@/types/widget";
import { WIDGET_TYPE_METADATA } from "@/types/widget";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AddColumnModal } from "@/components/modals/AddColumnModal";
import { EditColumnModal } from "@/components/modals/EditColumnModal";
import { ManageColumnsModal } from "@/components/modals/ManageColumnsModal";
import { useKanbanShortcuts } from "@/hooks/useKanbanShortcuts";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface KanbanBoardProps {
  className?: string;
}

export function KanbanBoard({ className }: KanbanBoardProps) {
  const widgets = useWidgetStore((state) => state.widgets);
  const initWidgets = useWidgetStore((state) => state.initWidgets);
  const widgetsInitialized = useWidgetStore((state) => state.isInitialized);
  const openAddWidgetModal = useWidgetStore((state) => state.openAddWidgetModal);
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const currentProjectId = useWidgetStore((state) => state.currentProjectId);
  const setCurrentProjectId = useWidgetStore((state) => state.setCurrentProjectId);
  const getFilteredWidgets = useWidgetStore((state) => state.getFilteredWidgets);

  const activeProjectId = useProjectsStore((state) => state.activeProjectId);

  const initColumns = useKanbanStore((state) => state.initColumns);
  const openManageColumnsModal = useKanbanStore((state) => state.openManageColumnsModal);
  const openAddColumnModal = useKanbanStore((state) => state.openAddColumnModal);
  const searchTerm = useKanbanStore((state) => state.searchTerm);
  const setSearchTerm = useKanbanStore((state) => state.setSearchTerm);
  const globalFilter = useKanbanStore((state) => state.globalFilter);
  const setGlobalFilter = useKanbanStore((state) => state.setGlobalFilter);
  const clearGlobalFilter = useKanbanStore((state) => state.clearGlobalFilter);
  const showCompactCards = useKanbanStore((state) => state.showCompactCards);
  const toggleCompactCards = useKanbanStore((state) => state.toggleCompactCards);
  const showWipWarnings = useKanbanStore((state) => state.showWipWarnings);
  const toggleWipWarnings = useKanbanStore((state) => state.toggleWipWarnings);
  const collapseAllColumns = useKanbanStore((state) => state.collapseAllColumns);
  const expandAllColumns = useKanbanStore((state) => state.expandAllColumns);

  const columns = useSortedColumns();

  const [activeWidget, setActiveWidget] = useState<Widget | null>(null);

  // Ref for search input to enable keyboard shortcuts
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Enable keyboard shortcuts for Kanban view
  const { shortcuts } = useKanbanShortcuts({ searchInputRef });

  // Initialize widgets and columns from database/store
  useEffect(() => {
    if (!widgetsInitialized) {
      initWidgets();
    }
    initColumns();
  }, [widgetsInitialized, initWidgets, initColumns]);

  // Sync project ID from projects store to widget store
  useEffect(() => {
    if (currentProjectId !== activeProjectId) {
      setCurrentProjectId(activeProjectId);
    }
  }, [activeProjectId, currentProjectId, setCurrentProjectId]);

  // Get widgets filtered by current project
  // Note: widgets and currentProjectId are intentionally included as dependencies
  // because getFilteredWidgets returns different results when they change
  const projectWidgets = useMemo(() => {
    return getFilteredWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getFilteredWidgets, widgets, currentProjectId]);

  // Assign widgets to default column if they don't have one
  useEffect(() => {
    if (widgetsInitialized && widgets.length > 0 && columns.length > 0) {
      widgets.forEach((widget, index) => {
        // Check if widget has no column or if its column no longer exists
        const columnExists = columns.some((col) => col.id === widget.kanbanColumnId);
        if (!widget.kanbanColumnId || !columnExists) {
          // Distribute widgets among columns initially or move to first column
          const columnIndex = !widget.kanbanColumnId ? index % columns.length : 0;
          updateWidget(widget.id, {
            kanbanColumnId: columns[columnIndex].id,
            kanbanOrder: Math.floor(index / columns.length),
          });
        }
      });
    }
  }, [widgetsInitialized, widgets, columns, updateWidget]);

  // DnD sensors configuration
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

  // Filter widgets based on search term and global filters (using project-filtered widgets)
  const filteredWidgets = useMemo(() => {
    let result = projectWidgets;

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (w) =>
          w.title.toLowerCase().includes(term) ||
          w.type.toLowerCase().includes(term) ||
          WIDGET_TYPE_METADATA[w.type]?.label.toLowerCase().includes(term)
      );
    }

    // Apply type filter
    if (globalFilter.length > 0) {
      result = result.filter((w) => globalFilter.includes(w.type));
    }

    return result;
  }, [projectWidgets, searchTerm, globalFilter]);

  // Get widgets for a specific column, sorted by kanbanOrder
  const getWidgetsForColumn = useCallback(
    (columnId: string): Widget[] => {
      return filteredWidgets
        .filter((w) => w.kanbanColumnId === columnId)
        .sort((a, b) => (a.kanbanOrder ?? 0) - (b.kanbanOrder ?? 0));
    },
    [filteredWidgets]
  );

  // Find which column a widget belongs to
  const findColumnForWidget = useCallback(
    (widgetId: UniqueIdentifier): string | null => {
      const widget = widgets.find((w) => w.id === widgetId);
      return widget?.kanbanColumnId ?? null;
    },
    [widgets]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const widget = widgets.find((w) => w.id === active.id);
      if (widget) {
        setActiveWidget(widget);
      }
    },
    [widgets]
  );

  // Handle drag over - for visual feedback and cross-column movement
  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      // Find the columns
      const activeColumnId = findColumnForWidget(activeId);

      // Check if over is a column or a widget
      const isOverColumn = columns.some((col) => col.id === overId);
      const overColumnId = isOverColumn
        ? (overId as string)
        : findColumnForWidget(overId);

      if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
        return;
      }

      // Move widget to new column
      const activeWidget = widgets.find((w) => w.id === activeId);
      if (activeWidget) {
        const overColumnWidgets = getWidgetsForColumn(overColumnId);
        const newOrder = overColumnWidgets.length;

        updateWidget(activeWidget.id, {
          kanbanColumnId: overColumnId,
          kanbanOrder: newOrder,
        });
      }
    },
    [columns, widgets, findColumnForWidget, getWidgetsForColumn, updateWidget]
  );

  // Handle drag end - for reordering within column
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveWidget(null);

      if (!over) return;

      const activeId = active.id;
      const overId = over.id;

      const activeColumnId = findColumnForWidget(activeId);
      const isOverColumn = columns.some((col) => col.id === overId);
      const overColumnId = isOverColumn
        ? (overId as string)
        : findColumnForWidget(overId);

      if (!activeColumnId || !overColumnId) return;

      // Same column - reorder
      if (activeColumnId === overColumnId && !isOverColumn) {
        const columnWidgets = getWidgetsForColumn(activeColumnId);
        const oldIndex = columnWidgets.findIndex((w) => w.id === activeId);
        const newIndex = columnWidgets.findIndex((w) => w.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reorderedWidgets = arrayMove(columnWidgets, oldIndex, newIndex);

          // Update order for all widgets in the column
          reorderedWidgets.forEach((widget, index) => {
            if (widget.kanbanOrder !== index) {
              updateWidget(widget.id, { kanbanOrder: index });
            }
          });
        }
      }
    },
    [columns, findColumnForWidget, getWidgetsForColumn, updateWidget]
  );

  // Memoize widgets per column
  const widgetsByColumn = useMemo(() => {
    const result: Record<string, Widget[]> = {};
    columns.forEach((col) => {
      result[col.id] = getWidgetsForColumn(col.id);
    });
    return result;
  }, [columns, getWidgetsForColumn]);

  // Calculate total widgets count
  const totalWidgets = widgets.length;
  const filteredCount = filteredWidgets.length;
  const hasFilters = searchTerm.trim() !== "" || globalFilter.length > 0;

  // Get unique widget types present in the widgets collection
  const availableWidgetTypes = useMemo(() => {
    const types = new Set(widgets.map((w) => w.type));
    return Array.from(types).sort((a, b) =>
      (WIDGET_TYPE_METADATA[a]?.label || a).localeCompare(
        WIDGET_TYPE_METADATA[b]?.label || b
      )
    );
  }, [widgets]);

  // Check if all columns are collapsed
  const allColumnsCollapsed = columns.every((c) => c.isCollapsed);

  // Handle filter type toggle
  const handleFilterTypeToggle = (type: WidgetType) => {
    if (globalFilter.includes(type)) {
      setGlobalFilter(globalFilter.filter((t) => t !== type));
    } else {
      setGlobalFilter([...globalFilter, type]);
    }
  };

  if (!widgetsInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">
          Cargando widgets...
        </div>
      </div>
    );
  }

  if (widgets.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
          <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-medium">No hay widgets</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Comienza agregando widgets para personalizar tu dashboard en vista
              Kanban.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openManageColumnsModal}>
              <Columns3 className="w-4 h-4 mr-2" />
              Gestionar Columnas
            </Button>
            <Button onClick={openAddWidgetModal}>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Widget
            </Button>
          </div>
        </div>

        {/* Modals */}
        <AddColumnModal />
        <EditColumnModal />
        <ManageColumnsModal />
      </>
    );
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={cn("h-full w-full flex flex-col", className)}>
          {/* Toolbar */}
          <div className="flex flex-col gap-2 px-4 py-2 border-b border-border/50 flex-shrink-0 bg-card/30 backdrop-blur-sm">
            {/* Top Row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gold-gradient">
                  Vista Kanban
                </span>
                <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
                  {hasFilters ? (
                    <>
                      {filteredCount} de {totalWidgets} widget{totalWidgets !== 1 ? "s" : ""}
                    </>
                  ) : (
                    <>
                      {totalWidgets} widget{totalWidgets !== 1 ? "s" : ""} en {columns.length} columna{columns.length !== 1 ? "s" : ""}
                    </>
                  )}
                </span>
                {hasFilters && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/20 text-primary hover:bg-primary/30 cursor-pointer"
                    onClick={clearGlobalFilter}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpiar filtros
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Manage Columns Button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-primary/30 hover:border-primary hover:bg-primary/10"
                  onClick={openManageColumnsModal}
                >
                  <Settings2 className="w-3.5 h-3.5 mr-1.5" />
                  Columnas
                </Button>
                {/* Quick Add Column */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 border-primary/30 hover:border-primary hover:bg-primary/10"
                  onClick={openAddColumnModal}
                >
                  <Columns3 className="w-3.5 h-3.5 mr-1.5" />
                  Nueva Columna
                </Button>
                {/* Add Widget */}
                <Button size="sm" onClick={openAddWidgetModal} className="h-8">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Agregar
                </Button>
              </div>
            </div>

            {/* Bottom Row - Search & Filters */}
            <div className="flex items-center gap-2">
              {/* Search Input */}
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar widgets... (/)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 pl-8 pr-8 text-sm bg-secondary/30 border-primary/20 focus:border-primary/50"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Filter by Type Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "h-8 border-primary/20 hover:border-primary/50",
                      globalFilter.length > 0 && "border-primary bg-primary/10"
                    )}
                  >
                    <Filter className="w-3.5 h-3.5 mr-1.5" />
                    Tipo
                    {globalFilter.length > 0 && (
                      <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1 bg-primary text-primary-foreground">
                        {globalFilter.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-auto">
                  <DropdownMenuLabel>Filtrar por tipo de widget</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableWidgetTypes.map((type) => {
                    const metadata = WIDGET_TYPE_METADATA[type];
                    const count = widgets.filter((w) => w.type === type).length;
                    return (
                      <DropdownMenuCheckboxItem
                        key={type}
                        checked={globalFilter.includes(type)}
                        onCheckedChange={() => handleFilterTypeToggle(type)}
                      >
                        <span className="flex-1">{metadata?.label || type}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({count})
                        </span>
                      </DropdownMenuCheckboxItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="h-6 w-px bg-border/50" />

              {/* Compact Cards Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-8 w-8 border-primary/20 hover:border-primary/50",
                        showCompactCards && "border-primary bg-primary/10"
                      )}
                      onClick={toggleCompactCards}
                    >
                      {showCompactCards ? (
                        <List className="h-3.5 w-3.5" />
                      ) : (
                        <LayoutGrid className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showCompactCards ? "Vista compacta activa" : "Vista normal activa"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* WIP Warnings Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className={cn(
                        "h-8 w-8 border-primary/20 hover:border-primary/50",
                        showWipWarnings && "border-amber-500 bg-amber-500/10"
                      )}
                      onClick={toggleWipWarnings}
                    >
                      <AlertTriangle
                        className={cn(
                          "h-3.5 w-3.5",
                          showWipWarnings ? "text-amber-500" : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showWipWarnings ? "Avisos WIP activos" : "Avisos WIP desactivados"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Collapse/Expand All Toggle */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 border-primary/20 hover:border-primary/50"
                      onClick={allColumnsCollapsed ? expandAllColumns : collapseAllColumns}
                    >
                      {allColumnsCollapsed ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronUp className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {allColumnsCollapsed ? "Expandir todas las columnas" : "Colapsar todas las columnas"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="h-6 w-px bg-border/50" />

              {/* Keyboard Shortcuts Help */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 border-primary/20 hover:border-primary/50"
                  >
                    <Keyboard className="h-3.5 w-3.5" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-64 p-3">
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Keyboard className="h-4 w-4 text-primary" />
                      Atajos de teclado
                    </h4>
                    <div className="space-y-1">
                      {shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.key}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {shortcut.description}
                          </span>
                          <kbd className="px-1.5 py-0.5 text-xs font-mono bg-secondary rounded border border-border">
                            {shortcut.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Kanban Columns */}
          <ScrollArea className="flex-1">
            <div className="flex gap-4 p-4 h-full min-h-[500px]">
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={horizontalListSortingStrategy}
              >
                {columns.map((column) => (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    widgets={widgetsByColumn[column.id] || []}
                    onAddWidget={openAddWidgetModal}
                  />
                ))}
              </SortableContext>

              {/* Add Column Button at the end */}
              <div className="flex-shrink-0 w-[300px] h-full min-h-[200px]">
                <button
                  onClick={openAddColumnModal}
                  className="w-full h-full min-h-[200px] rounded-lg border-2 border-dashed border-primary/20 hover:border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary"
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-sm font-medium">Añadir columna</span>
                </button>
              </div>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Drag Overlay - Shows the card being dragged */}
        <DragOverlay>
          {activeWidget ? (
            <div className="opacity-90 rotate-2 shadow-xl">
              <KanbanCard widget={activeWidget} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modals */}
      <AddColumnModal />
      <EditColumnModal />
      <ManageColumnsModal />
    </>
  );
}
