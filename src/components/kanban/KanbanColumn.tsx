"use client";

import { memo, useMemo, useCallback } from "react";
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
  useColumnWipStatus,
} from "@/stores/kanban-store";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface KanbanColumnProps {
  column: KanbanColumnType;
  widgets: Widget[];
  onAddWidget?: (columnId: string) => void;
  isFirst: boolean;
  isLast: boolean;
  canDelete: boolean;
  allColumns: KanbanColumnType[];
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

// WIP Limit options (values only, labels are i18n'd at render time)
const WIP_LIMIT_VALUES = [undefined, 3, 5, 8, 10, 15] as const;

export const KanbanColumn = memo(function KanbanColumn({ column, widgets, onAddWidget, isFirst, isLast, canDelete, allColumns }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: "column",
      column,
    },
  });

  const { t } = useTranslation();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showStats, setShowStats] = useState(false);

  // Memoize widget type distribution
  const typeDistribution = useMemo(() => getWidgetTypeDistribution(widgets), [widgets]);

  // Use fine-grained selectors instead of destructuring the entire store
  const openEditColumnModal = useKanbanStore((s) => s.openEditColumnModal);
  const removeColumn = useKanbanStore((s) => s.removeColumn);
  const updateColumn = useKanbanStore((s) => s.updateColumn);
  const moveColumnLeft = useKanbanStore((s) => s.moveColumnLeft);
  const moveColumnRight = useKanbanStore((s) => s.moveColumnRight);
  const toggleColumnCollapse = useKanbanStore((s) => s.toggleColumnCollapse);
  const setColumnWipLimit = useKanbanStore((s) => s.setColumnWipLimit);
  const showWipWarnings = useKanbanStore((s) => s.showWipWarnings);
  const showCompactCards = useKanbanStore((s) => s.showCompactCards);

  // WIP status
  const { isOverLimit, isNearLimit, limitPercentage } = useColumnWipStatus(
    column.id,
    widgets.length
  );
  const showWipWarning = showWipWarnings && (isOverLimit || isNearLimit);

  // Memoize widget IDs array to prevent SortableContext from re-rendering children
  const widgetIds = useMemo(() => widgets.map((w) => w.id), [widgets]);

  const handleEdit = useCallback(() => {
    openEditColumnModal(column);
  }, [openEditColumnModal, column]);

  const handleDelete = useCallback(() => {
    if (!canDelete) {
      toast.error(t("kanban.cannotDeleteLast"));
      return;
    }
    removeColumn(column.id);
    toast.success(t("kanban.columnDeleted"));
    setShowDeleteDialog(false);
  }, [canDelete, removeColumn, column.id, t]);

  const handleColorChange = useCallback((color: string) => {
    updateColumn(column.id, { color });
    toast.success(t("kanban.colorUpdated"));
  }, [updateColumn, column.id, t]);

  const handleMoveLeft = useCallback(() => {
    if (!isFirst) {
      moveColumnLeft(column.id);
    }
  }, [isFirst, moveColumnLeft, column.id]);

  const handleMoveRight = useCallback(() => {
    if (!isLast) {
      moveColumnRight(column.id);
    }
  }, [isLast, moveColumnRight, column.id]);

  const handleToggleCollapse = useCallback(() => {
    toggleColumnCollapse(column.id);
  }, [toggleColumnCollapse, column.id]);

  const handleSetWipLimit = useCallback((limit: number | undefined) => {
    setColumnWipLimit(column.id, limit);
    if (limit) {
      toast.success(t("kanban.wipSet", { count: limit }));
    } else {
      toast.success(t("kanban.wipRemoved"));
    }
  }, [setColumnWipLimit, column.id, t]);

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
            <span className="font-semibold text-sm">
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
              <TooltipContent>{t("kanban.collapseColumn")}</TooltipContent>
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
                      {t("kanban.wipExceeded", { current: widgets.length, limit: column.wipLimit })}
                    </span>
                  ) : isNearLimit ? (
                    <span className="text-amber-500">
                      {t("kanban.wipNear", { percentage: Math.round(limitPercentage) })}
                    </span>
                  ) : (
                    t("kanban.widgetCount", { current: widgets.length, limit: column.wipLimit })
                  )
                ) : (
                  widgets.length !== 1
                    ? t("kanban.widgetCountSimplePlural", { count: widgets.length })
                    : t("kanban.widgetCountSimple", { count: widgets.length })
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
                  {showStats ? t("kanban.hideStats") : t("kanban.showStats")}
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
                  onClick={() => onAddWidget?.(column.id)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t("kanban.addWidget")}</TooltipContent>
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
                {t("kanban.editColumn")}
              </DropdownMenuItem>

              {/* Color Submenu */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="w-4 h-4 mr-2" />
                  {t("kanban.changeColor")}
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
                  {t("kanban.wipLimit")}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("kanban.wipLimitDesc")}
                  </DropdownMenuLabel>
                  {WIP_LIMIT_VALUES.map((value) => (
                    <DropdownMenuItem
                      key={value ?? "none"}
                      onClick={() => handleSetWipLimit(value)}
                    >
                      <span
                        className={cn(
                          "w-4 h-4 mr-2 rounded-full border flex items-center justify-center text-[10px]",
                          column.wipLimit === value
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {column.wipLimit === value && "✓"}
                      </span>
                      {value === undefined ? t("kanban.noLimit") : t("kanban.wipWidgets", { count: value })}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Move Left */}
              <DropdownMenuItem onClick={handleMoveLeft} disabled={isFirst}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                {t("kanban.moveLeft")}
              </DropdownMenuItem>

              {/* Move Right */}
              <DropdownMenuItem onClick={handleMoveRight} disabled={isLast}>
                <ChevronRight className="w-4 h-4 mr-2" />
                {t("kanban.moveRight")}
              </DropdownMenuItem>

              {/* Collapse */}
              <DropdownMenuItem onClick={handleToggleCollapse}>
                <ChevronUp className="w-4 h-4 mr-2" />
                {t("kanban.collapseColumn")}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Delete Column */}
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                disabled={!canDelete}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("kanban.deleteColumn")}
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
              {t("kanban.typeDistribution")}
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
                {t("kanban.moreTypes", { count: Object.keys(getWidgetTypeDistribution(widgets)).length - 3 })}
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
                  <p className="text-sm">{t("kanban.noWidgets")}</p>
                  <p className="text-xs mt-1">{t("kanban.dragWidgetsHere")}</p>
                </div>
              ) : (
                widgets.map((widget) => (
                  <KanbanCard key={widget.id} widget={widget} columns={allColumns} showCompactCards={showCompactCards} />
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
            <AlertDialogTitle>{t("kanban.deleteColumnTitle", { title: column.title })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("kanban.deleteColumnDesc", { count: widgets.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t("btn.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
