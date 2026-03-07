"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Columns3,
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GripVertical,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useKanbanStore,
  useSortedColumns,
  DEFAULT_KANBAN_COLUMNS,
} from "@/stores/kanban-store";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { KanbanColumn } from "@/stores/kanban-store";
import { useTranslation } from "@/lib/i18n";

interface SortableColumnItemProps {
  column: KanbanColumn;
  onEdit: (column: KanbanColumn) => void;
  onDelete: (id: string) => void;
  onMoveLeft: (id: string) => void;
  onMoveRight: (id: string) => void;
  canDelete: boolean;
  isFirst: boolean;
  isLast: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function SortableColumnItem({
  column,
  onEdit,
  onDelete,
  onMoveLeft,
  onMoveRight,
  canDelete,
  isFirst,
  isLast,
  t,
}: SortableColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors group"
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-secondary rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </button>

      {/* Color Indicator */}
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: column.color }}
      />

      {/* Column Name */}
      <span className="flex-1 font-medium text-sm truncate">{column.title}</span>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Move Left */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMoveLeft(column.id)}
          disabled={isFirst}
          title={t("manageColumns.moveLeft")}
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </Button>

        {/* Move Right */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onMoveRight(column.id)}
          disabled={isLast}
          title={t("manageColumns.moveRight")}
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>

        {/* Edit */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onEdit(column)}
          title={t("manageColumns.editColumn")}
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>

        {/* Delete */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
              disabled={!canDelete}
              title={canDelete ? t("manageColumns.deleteColumn") : t("manageColumns.cannotDeleteLast")}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("manageColumns.deleteColumnTitle", { title: column.title })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("manageColumns.deleteColumnDesc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(column.id)}>
                {t("btn.delete")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function ManageColumnsModal() {
  const {
    isManageColumnsModalOpen,
    closeManageColumnsModal,
    openAddColumnModal,
    openEditColumnModal,
    removeColumn,
    moveColumnLeft,
    moveColumnRight,
    reorderColumns,
    resetToDefaults,
  } = useKanbanStore();

  const columns = useSortedColumns();
  const { t } = useTranslation();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        reorderColumns(oldIndex, newIndex);
      }
    }
  };

  const handleDelete = (id: string) => {
    removeColumn(id);
    toast.success(t("manageColumns.columnDeleted"));
  };

  const handleReset = () => {
    resetToDefaults();
    toast.success(t("manageColumns.successReset"));
    setShowResetConfirm(false);
  };

  const handleAddColumn = () => {
    closeManageColumnsModal();
    setTimeout(() => openAddColumnModal(), 100);
  };

  const handleEditColumn = (column: KanbanColumn) => {
    closeManageColumnsModal();
    setTimeout(() => openEditColumnModal(column), 100);
  };

  return (
    <Dialog open={isManageColumnsModalOpen} onOpenChange={closeManageColumnsModal}>
      <DialogContent className="sm:max-w-lg glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-primary" />
            {t("manageColumns.title")}
          </DialogTitle>
          <DialogDescription>
            {t("manageColumns.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Columns List */}
          <ScrollArea className="h-[300px] pr-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={columns.map((c) => c.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {columns.map((column, index) => (
                    <SortableColumnItem
                      key={column.id}
                      column={column}
                      onEdit={handleEditColumn}
                      onDelete={handleDelete}
                      onMoveLeft={moveColumnLeft}
                      onMoveRight={moveColumnRight}
                      canDelete={columns.length > 1}
                      isFirst={index === 0}
                      isLast={index === columns.length - 1}
                      t={t}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </ScrollArea>

          <Separator />

          {/* Actions */}
          <div className="flex items-center justify-between">
            {/* Reset Button */}
            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                  {t("manageColumns.resetButton")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("manageColumns.resetTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("manageColumns.resetDesc")}
                    <ul className="mt-2 space-y-1">
                      {DEFAULT_KANBAN_COLUMNS.map((col) => (
                        <li key={col.id} className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: col.color }}
                          />
                          {col.title}
                        </li>
                      ))}
                    </ul>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
                  <AlertDialogAction onClick={handleReset}>
                    {t("manageColumns.resetButton")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Add Column Button */}
            <Button onClick={handleAddColumn}>
              <Plus className="w-4 h-4 mr-1.5" />
              {t("manageColumns.newColumn")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
