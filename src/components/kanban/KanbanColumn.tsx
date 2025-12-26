"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanCard } from "./KanbanCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";
import { WIDGET_TYPE_METADATA } from "@/types/widget";
import type { KanbanColumn as KanbanColumnType } from "@/stores/kanban-store";
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Palette,
  ChevronUp,
  AlertTriangle,
  Gauge,
  X,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import {
  useKanbanStore,
  COLUMN_COLOR_PRESETS,
  useSortedColumns,
  useColumnWipStatus,
} from "@/stores/kanban-store";
import { toast } from "sonner";

interface KanbanColumnProps {
  column: KanbanColumnType;
  widgets: Widget[];
  onAddWidget?: () => void;
}

// Helper to get widget type distribution
function getWidgetTypeDistribution(widgets: Widget[]) {
  const distribution: Record<string, number> = {};
  widgets.forEach((w) => {
    distribution[w.type] = (distribution[w.type] || 0) + 1;
  });

  // Sort by count and return top 3
  return Object.entries(distribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([type, count]) => ({
      type,
      count,
      label: WIDGET_TYPE_METADATA[type as keyof typeof WIDGET_TYPE_METADATA]?.label || type,
      percentage: Math.round((count / widgets.length) * 100),
    }));
}

// WIP Limit options
const WIP_LIMIT_OPTIONS = [
  { value: undefined, label: "Sin límite" },
  { value: 3, label: "3 widgets" },
  { value: 5, label: "5 widgets" },
  { value: 8, label: "8 widgets" },
  { value: 10, label: "10 widgets" },
  { value: 15, label: "15 widgets" },
];

export function KanbanColumn({ column, widgets, onAddWidget }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Calculate widget type distribution
  const typeDistribution = getWidgetTypeDistribution(widgets);

  const {
    openEditColumnModal,
    removeColumn,
    updateColumn,
    moveColumnLeft,
    moveColumnRight,
    columns,
    toggleColumnCollapse,
    setColumnWipLimit,
    showWipWarnings,
  } = useKanbanStore();

  const sortedColumns = useSortedColumns();
  const columnIndex = sortedColumns.findIndex((c) => c.id === column.id);
  const isFirst = columnIndex === 0;
  const isLast = columnIndex === sortedColumns.length - 1;
  const canDelete = columns.length > 1;

  // WIP status
  const { isOverLimit, isNearLimit, limitPercentage } = useColumnWipStatus(
    column.id,
    widgets.length
  );
  const showWipWarning = showWipWarnings && (isOverLimit || isNearLimit);

  const widgetIds = widgets.map((w) => w.id);

  const handleEdit = () => {
    openEditColumnModal(column);
  };

  const handleDelete = () => {
    if (!canDelete) {
      toast.error("No puedes eliminar la última columna");
      return;
    }
    removeColumn(column.id);
    toast.success("Columna eliminada");
    setShowDeleteDialog(false);
  };

  const handleColorChange = (color: string) => {
    updateColumn(column.id, { color });
    toast.success("Color actualizado");
  };

  const handleMoveLeft = () => {
    if (!isFirst) {
      moveColumnLeft(column.id);
    }
  };

  const handleMoveRight = () => {
    if (!isLast) {
      moveColumnRight(column.id);
    }
  };

  const handleToggleCollapse = () => {
    toggleColumnCollapse(column.id);
  };

  const handleSetWipLimit = (limit: number | undefined) => {
    setColumnWipLimit(column.id, limit);
    if (limit) {
      toast.success(`Límite WIP establecido: ${limit} widgets`);
    } else {
      toast.success("Límite WIP eliminado");
    }
  };

  // Collapsed view
  if (column.isCollapsed) {
    return (
      <div
        className="flex flex-col h-full w-12 flex-shrink-0 cursor-pointer group"
        onClick={handleToggleCollapse}
      >
        <div
          className="flex flex-col items-center gap-2 py-3 px-1 rounded-lg bg-card/50 backdrop-blur-sm h-full hover:bg-card/70 transition-colors"
          style={{
            borderLeft: `3px solid ${column.color}`,
            boxShadow: `-2px 0 10px ${column.color}30`,
          }}
        >
          {/* Expand icon */}
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />

          {/* Title (rotated) */}
          <div
            className="flex-1 flex items-center justify-center"
            style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
          >
            <span className="font-semibold text-sm transform rotate-180">
              {column.title}
            </span>
          </div>

          {/* Widget count */}
          <div
            className="px-1.5 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: `${column.color}30`, color: column.color }}
          >
            {widgets.length}
          </div>

          {/* WIP warning */}
          {showWipWarning && (
            <AlertTriangle
              className={cn(
                "w-4 h-4",
                isOverLimit ? "text-destructive" : "text-amber-500"
              )}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-w-[300px] max-w-[350px] flex-shrink-0">
      {/* Column Header - Gold themed border */}
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-t-lg bg-card/50 backdrop-blur-sm transition-colors",
          showWipWarning && isOverLimit && "bg-destructive/10",
          showWipWarning && isNearLimit && "bg-amber-500/10"
        )}
        style={{
          borderTop: `3px solid ${column.color}`,
          boxShadow: `0 -2px 10px ${column.color}30`,
        }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Collapse button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={handleToggleCollapse}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Colapsar columna</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Color Dot */}
          <div
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />

          {/* Title */}
          <h3 className="font-semibold text-sm truncate">{column.title}</h3>

          {/* Widget count with WIP indicator */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    "text-xs px-1.5 py-0.5 rounded-full flex items-center gap-1",
                    showWipWarning && isOverLimit
                      ? "bg-destructive/20 text-destructive"
                      : showWipWarning && isNearLimit
                      ? "bg-amber-500/20 text-amber-600"
                      : "bg-secondary/80 text-muted-foreground"
                  )}
                >
                  {widgets.length}
                  {column.wipLimit && (
                    <>
                      <span className="opacity-50">/</span>
                      {column.wipLimit}
                    </>
                  )}
                  {showWipWarning && (
                    <AlertTriangle className="w-3 h-3" />
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {column.wipLimit ? (
                  isOverLimit ? (
                    <span className="text-destructive">
                      ¡Límite WIP superado! ({widgets.length}/{column.wipLimit})
                    </span>
                  ) : isNearLimit ? (
                    <span className="text-amber-500">
                      Cerca del límite WIP ({Math.round(limitPercentage)}%)
                    </span>
                  ) : (
                    `${widgets.length} de ${column.wipLimit} widgets`
                  )
                ) : (
                  `${widgets.length} widget${widgets.length !== 1 ? "s" : ""}`
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Stats Toggle Button */}
          {widgets.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-6 w-6 flex-shrink-0",
                      showStats && "bg-primary/10 text-primary"
                    )}
                    onClick={() => setShowStats(!showStats)}
                  >
                    <BarChart2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showStats ? "Ocultar estadísticas" : "Ver estadísticas"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Add Widget Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
                  onClick={onAddWidget}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Añadir widget</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Column Options Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-primary/10 hover:text-primary"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              {/* Edit Column */}
              <DropdownMenuItem onClick={handleEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar columna
              </DropdownMenuItem>

              {/* Color Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="w-4 h-4 mr-2" />
                  Cambiar color
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="p-2">
                  <div className="grid grid-cols-4 gap-2">
                    {COLUMN_COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => handleColorChange(preset.value)}
                        className={cn(
                          "w-7 h-7 rounded-full transition-all hover:scale-110",
                          column.color === preset.value
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : "opacity-80 hover:opacity-100"
                        )}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* WIP Limit Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Gauge className="w-4 h-4 mr-2" />
                  Límite WIP
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Límite de trabajo en progreso
                  </DropdownMenuLabel>
                  {WIP_LIMIT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value ?? "none"}
                      onClick={() => handleSetWipLimit(option.value)}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 mr-2 rounded-full border flex items-center justify-center text-[10px]",
                          column.wipLimit === option.value
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {column.wipLimit === option.value && "✓"}
                      </span>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Move Left */}
              <DropdownMenuItem onClick={handleMoveLeft} disabled={isFirst}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Mover a la izquierda
              </DropdownMenuItem>

              {/* Move Right */}
              <DropdownMenuItem onClick={handleMoveRight} disabled={isLast}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Mover a la derecha
              </DropdownMenuItem>

              {/* Collapse */}
              <DropdownMenuItem onClick={handleToggleCollapse}>
                <ChevronUp className="w-4 h-4 mr-2" />
                Colapsar columna
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Delete Column */}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={!canDelete}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar columna
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* WIP Progress bar */}
      {column.wipLimit && (
        <div className="h-1 bg-secondary/50">
          <div
            className={cn(
              "h-full transition-all",
              isOverLimit
                ? "bg-destructive"
                : isNearLimit
                ? "bg-amber-500"
                : "bg-primary/50"
            )}
            style={{ width: `${Math.min(limitPercentage, 100)}%` }}
          />
        </div>
      )}

      {/* Stats Section - Collapsible */}
      {showStats && widgets.length > 0 && (
        <div className="px-3 py-2 bg-secondary/20 border-b border-border/30 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BarChart2 className="w-3 h-3" />
              Distribución por tipo
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => setShowStats(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-1.5">
            {typeDistribution.map((item) => (
              <div key={item.type} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-20 truncate">
                  {item.label}
                </span>
                <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: column.color,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {item.count}
                </span>
              </div>
            ))}
            {widgets.length > 3 && typeDistribution.length === 3 && (
              <div className="text-xs text-muted-foreground text-center pt-1">
                +{Object.keys(getWidgetTypeDistribution(widgets)).length - 3} más tipos
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Content - Droppable area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 rounded-b-lg border border-t-0 bg-secondary/10 transition-all min-h-[200px]",
          isOver && "bg-primary/5 border-primary/30 shadow-inner"
        )}
        style={{
          borderColor: isOver ? `${column.color}50` : undefined,
        }}
      >
        <ScrollArea className="h-full">
          <SortableContext items={widgetIds} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-2">
              {widgets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${column.color}20` }}
                  >
                    <Plus className="w-5 h-5" style={{ color: column.color }} />
                  </div>
                  <p className="text-sm">Sin widgets</p>
                  <p className="text-xs mt-1">Arrastra widgets aquí</p>
                </div>
              ) : (
                widgets.map((widget) => (
                  <KanbanCard key={widget.id} widget={widget} />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar columna &ldquo;{column.title}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              Los widgets de esta columna ({widgets.length}) se moverán a la primera columna disponible.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
