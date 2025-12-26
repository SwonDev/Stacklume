"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus,
  Trash2,
  Check,
  Square,
  CheckSquare,
  Eye,
  EyeOff,
  Calendar,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface EisenhowerMatrixWidgetProps {
  widget: Widget;
}

type Quadrant = "DO" | "SCHEDULE" | "DELEGATE" | "ELIMINATE";

interface Task {
  id: string;
  title: string;
  completed: boolean;
  quadrant: Quadrant;
  dueDate?: string;
  createdAt: string;
}

interface QuadrantConfig {
  id: Quadrant;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const QUADRANT_CONFIGS: Record<Quadrant, QuadrantConfig> = {
  DO: {
    id: "DO",
    label: "DO",
    description: "Urgent + Important",
    color: "bg-red-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-600 dark:text-red-500",
  },
  SCHEDULE: {
    id: "SCHEDULE",
    label: "SCHEDULE",
    description: "Not Urgent + Important",
    color: "bg-blue-500",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    textColor: "text-blue-600 dark:text-blue-500",
  },
  DELEGATE: {
    id: "DELEGATE",
    label: "DELEGATE",
    description: "Urgent + Not Important",
    color: "bg-amber-500",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    textColor: "text-amber-600 dark:text-amber-500",
  },
  ELIMINATE: {
    id: "ELIMINATE",
    label: "ELIMINATE",
    description: "Not Urgent + Not Important",
    color: "bg-gray-500",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    textColor: "text-gray-600 dark:text-gray-500",
  },
};

interface SortableTaskItemProps {
  task: Task;
  config: QuadrantConfig;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  showCompleted: boolean;
}

function SortableTaskItem({
  task,
  config,
  onToggle,
  onDelete,
  showCompleted,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: task.completed && !showCompleted,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (task.completed && !showCompleted) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 p-2 rounded border transition-all",
        task.completed ? "bg-muted/30 border-muted" : `${config.bgColor} ${config.borderColor}`,
        isDragging && "shadow-lg z-50"
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-grab active:cursor-grabbing mt-0.5"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Checkbox
        checked={task.completed}
        onCheckedChange={() => onToggle(task.id)}
        className="mt-0.5 flex-shrink-0"
      />
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-xs @sm:text-sm break-words transition-all",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </p>
        {task.dueDate && (
          <div className="flex items-center gap-1 mt-1 text-[10px] @sm:text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
          </div>
        )}
      </div>
      <button
        onClick={() => onDelete(task.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0 mt-0.5"
        aria-label="Delete task"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface QuadrantProps {
  config: QuadrantConfig;
  tasks: Task[];
  onAddTask: (quadrant: Quadrant, title: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  showCompleted: boolean;
}

function QuadrantSection({
  config,
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  showCompleted,
}: QuadrantProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const displayedTasks = showCompleted
    ? tasks
    : tasks.filter((t) => !t.completed);

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleAdd = () => {
    if (!newTaskTitle.trim()) return;
    onAddTask(config.id, newTaskTitle.trim());
    setNewTaskTitle("");
    setIsAdding(false);
  };

  const taskIds = displayedTasks.map((t) => t.id);

  return (
    <div className={cn("flex flex-col h-full border-2 rounded-lg", config.borderColor)}>
      {/* Header */}
      <div className={cn("p-2 @sm:p-3 border-b", config.borderColor)}>
        <div className="flex items-center justify-between gap-2 mb-1">
          <h3 className={cn("text-xs @sm:text-sm font-bold uppercase", config.textColor)}>
            {config.label}
          </h3>
          <div className="flex items-center gap-1">
            <span className="text-[10px] @sm:text-xs text-muted-foreground">
              {completedCount}/{tasks.length}
            </span>
          </div>
        </div>
        <p className="text-[10px] @sm:text-xs text-muted-foreground">
          {config.description}
        </p>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto p-2 @sm:p-3 space-y-1.5 @sm:space-y-2 min-h-[120px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {displayedTasks.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-4 text-center"
              >
                <Square className="w-6 h-6 @sm:w-8 @sm:h-8 mb-2 text-muted-foreground/50" />
                <p className="text-[10px] @sm:text-xs text-muted-foreground">
                  {tasks.length === 0 ? "No tasks" : "All completed"}
                </p>
              </motion.div>
            ) : (
              displayedTasks.map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                >
                  <SortableTaskItem
                    task={task}
                    config={config}
                    onToggle={onToggleTask}
                    onDelete={onDeleteTask}
                    showCompleted={showCompleted}
                  />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </SortableContext>
      </div>

      {/* Quick Add Input */}
      <div className={cn("p-2 @sm:p-3 border-t", config.borderColor)}>
        {isAdding ? (
          <div className="flex gap-1.5">
            <Input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAdd();
                if (e.key === "Escape") {
                  setIsAdding(false);
                  setNewTaskTitle("");
                }
              }}
              placeholder="Task title..."
              className="h-7 @sm:h-8 text-xs flex-1"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 @sm:h-8 @sm:w-8 p-0"
              onClick={handleAdd}
              disabled={!newTaskTitle.trim()}
            >
              <Check className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAdding(true)}
            className={cn("w-full h-7 @sm:h-8 text-[10px] @sm:text-xs", config.textColor)}
          >
            <Plus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
            Add Task
          </Button>
        )}
      </div>
    </div>
  );
}

export function EisenhowerMatrixWidget({ widget }: EisenhowerMatrixWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [activeId, setActiveId] = useState<string | null>(null);

  const tasks: Task[] = (widget.config?.matrixTasks as unknown as Task[]) || [];
  const showCompleted = widget.config?.showCompleted !== false;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tasksByQuadrant = useMemo(() => {
    const grouped: Record<Quadrant, Task[]> = {
      DO: [],
      SCHEDULE: [],
      DELEGATE: [],
      ELIMINATE: [],
    };

    tasks.forEach((task) => {
      grouped[task.quadrant].push(task);
    });

    return grouped;
  }, [tasks]);

  const saveTasks = (newTasks: Task[]) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        matrixTasks: newTasks,
      } as unknown as typeof widget.config,
    });
  };

  const addTask = (quadrant: Quadrant, title: string) => {
    const newTask: Task = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      quadrant,
      createdAt: new Date().toISOString(),
    };
    saveTasks([...tasks, newTask]);
  };

  const toggleTask = (id: string) => {
    saveTasks(
      tasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (id: string) => {
    saveTasks(tasks.filter((task) => task.id !== id));
  };

  const toggleShowCompleted = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        showCompleted: !showCompleted,
      },
    });
  };

  const clearCompleted = () => {
    saveTasks(tasks.filter((task) => !task.completed));
  };

  const handleDragStart = (event: DragEndEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    const overTask = tasks.find((t) => t.id === over.id);

    if (!activeTask || !overTask) return;

    // If dragged to a different quadrant
    if (activeTask.quadrant !== overTask.quadrant) {
      saveTasks(
        tasks.map((task) =>
          task.id === activeTask.id
            ? { ...task, quadrant: overTask.quadrant }
            : task
        )
      );
    } else {
      // Reorder within same quadrant
      const quadrantTasks = tasksByQuadrant[activeTask.quadrant];
      const oldIndex = quadrantTasks.findIndex((t) => t.id === active.id);
      const newIndex = quadrantTasks.findIndex((t) => t.id === over.id);

      if (oldIndex === newIndex) return;

      const reordered = [...quadrantTasks];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, removed);

      // Update all tasks with new order
      const otherTasks = tasks.filter((t) => t.quadrant !== activeTask.quadrant);
      saveTasks([...otherTasks, ...reordered]);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;
  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 @sm:mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-[10px] @sm:text-xs text-muted-foreground">
              {completedCount}/{totalCount} completed
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 @sm:h-8 @sm:w-8 p-0"
              onClick={toggleShowCompleted}
              title={showCompleted ? "Hide completed" : "Show completed"}
            >
              {showCompleted ? (
                <Eye className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 @sm:w-4 @sm:h-4" />
              )}
            </Button>
            {completedCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 @sm:h-8 px-2 text-[10px] @sm:text-xs text-muted-foreground hover:text-destructive"
                onClick={clearCompleted}
                title="Clear completed tasks"
              >
                <Trash2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Matrix Grid */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="flex-1 grid grid-cols-1 @md:grid-cols-2 gap-2 @sm:gap-3 overflow-hidden">
            <QuadrantSection
              config={QUADRANT_CONFIGS.DO}
              tasks={tasksByQuadrant.DO}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              showCompleted={showCompleted}
            />
            <QuadrantSection
              config={QUADRANT_CONFIGS.SCHEDULE}
              tasks={tasksByQuadrant.SCHEDULE}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              showCompleted={showCompleted}
            />
            <QuadrantSection
              config={QUADRANT_CONFIGS.DELEGATE}
              tasks={tasksByQuadrant.DELEGATE}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              showCompleted={showCompleted}
            />
            <QuadrantSection
              config={QUADRANT_CONFIGS.ELIMINATE}
              tasks={tasksByQuadrant.ELIMINATE}
              onAddTask={addTask}
              onToggleTask={toggleTask}
              onDeleteTask={deleteTask}
              showCompleted={showCompleted}
            />
          </div>

          {/* Drag Overlay */}
          <DragOverlay>
            {activeTask && (
              <div className="bg-card border-2 border-primary shadow-xl p-2 rounded max-w-[200px]">
                <p className="text-xs truncate">{activeTask.title}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
