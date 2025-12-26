"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Plus,
  GripVertical,
  Calendar,
  User,
  Tag,
  MoreVertical,
  Pencil,
  Trash2,
  Target,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface SprintTask {
  id: string;
  title: string;
  columnId: string;
  priority: "low" | "medium" | "high" | "urgent";
  assignee?: string;
  dueDate?: string;
  storyPoints?: number;
  tags?: string[];
  order: number;
}

interface SprintColumn {
  id: string;
  name: string;
  wipLimit?: number;
}

interface SprintInfo {
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
}

interface SprintTasksConfig {
  sprint?: SprintInfo;
  columns?: SprintColumn[];
  sprintTasks?: SprintTask[];
}

interface SprintTasksWidgetProps {
  widget: Widget;
}

const DEFAULT_COLUMNS: SprintColumn[] = [
  { id: "backlog", name: "Backlog" },
  { id: "todo", name: "To Do" },
  { id: "in-progress", name: "In Progress", wipLimit: 3 },
  { id: "done", name: "Done" },
];

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  urgent: { label: "Urgent", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

export function SprintTasksWidget({ widget }: SprintTasksWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as SprintTasksConfig) || {};

  const [sprint, setSprint] = useState<SprintInfo>(
    config.sprint || { name: "Sprint 1", goal: "Initial sprint setup" }
  );
  const [columns, setColumns] = useState<SprintColumn[]>(
    config.columns || DEFAULT_COLUMNS
  );
  const [tasks, setTasks] = useState<SprintTask[]>(config.sprintTasks || []);
  const [draggedTask, setDraggedTask] = useState<SprintTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [targetColumnId, setTargetColumnId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<SprintTask | null>(null);

  // Filter states
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");

  // Form states
  const [taskForm, setTaskForm] = useState({
    title: "",
    priority: "medium" as SprintTask["priority"],
    assignee: "",
    dueDate: "",
    storyPoints: "",
    tags: "",
  });

  // Save config to widget store
  const saveConfig = (
    newSprint: SprintInfo,
    newColumns: SprintColumn[],
    newTasks: SprintTask[]
  ) => {
    updateWidget(widget.id, {
      config: {
        sprint: newSprint,
        columns: newColumns,
        sprintTasks: newTasks,
      },
    });
  };

  // Get unique assignees for filter
  const assignees = useMemo(() => {
    const unique = new Set(tasks.filter(t => t.assignee).map(t => t.assignee));
    return Array.from(unique) as string[];
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterPriority !== "all" && task.priority !== filterPriority) return false;
      if (filterAssignee !== "all" && task.assignee !== filterAssignee) return false;
      return true;
    });
  }, [tasks, filterPriority, filterAssignee]);

  // Get tasks by column
  const getColumnTasks = (columnId: string) => {
    return filteredTasks
      .filter(task => task.columnId === columnId)
      .sort((a, b) => a.order - b.order);
  };

  // Handle add task
  const handleAddTask = () => {
    if (!taskForm.title.trim() || !targetColumnId) return;

    const columnTasks = tasks.filter(t => t.columnId === targetColumnId);
    const maxOrder = columnTasks.length > 0
      ? Math.max(...columnTasks.map(t => t.order))
      : -1;

    const newTask: SprintTask = {
      id: `task-${Date.now()}`,
      title: taskForm.title,
      columnId: targetColumnId,
      priority: taskForm.priority,
      assignee: taskForm.assignee || undefined,
      dueDate: taskForm.dueDate || undefined,
      storyPoints: taskForm.storyPoints ? parseInt(taskForm.storyPoints) : undefined,
      tags: taskForm.tags ? taskForm.tags.split(",").map(t => t.trim()) : undefined,
      order: maxOrder + 1,
    };

    const newTasks = [...tasks, newTask];
    setTasks(newTasks);
    saveConfig(sprint, columns, newTasks);

    // Reset form
    setTaskForm({
      title: "",
      priority: "medium",
      assignee: "",
      dueDate: "",
      storyPoints: "",
      tags: "",
    });
    setIsAddDialogOpen(false);
    setTargetColumnId(null);
  };

  // Handle edit task
  const handleEditTask = () => {
    if (!editingTask || !taskForm.title.trim()) return;

    const updatedTasks = tasks.map(task =>
      task.id === editingTask.id
        ? {
            ...task,
            title: taskForm.title,
            priority: taskForm.priority,
            assignee: taskForm.assignee || undefined,
            dueDate: taskForm.dueDate || undefined,
            storyPoints: taskForm.storyPoints ? parseInt(taskForm.storyPoints) : undefined,
            tags: taskForm.tags ? taskForm.tags.split(",").map(t => t.trim()) : undefined,
          }
        : task
    );

    setTasks(updatedTasks);
    saveConfig(sprint, columns, updatedTasks);
    setIsEditDialogOpen(false);
    setEditingTask(null);
    setTaskForm({
      title: "",
      priority: "medium",
      assignee: "",
      dueDate: "",
      storyPoints: "",
      tags: "",
    });
  };

  // Handle delete task
  const handleDeleteTask = (taskId: string) => {
    const newTasks = tasks.filter(t => t.id !== taskId);
    setTasks(newTasks);
    saveConfig(sprint, columns, newTasks);
  };

  // Open add dialog
  const openAddDialog = (columnId: string) => {
    setTargetColumnId(columnId);
    setIsAddDialogOpen(true);
  };

  // Open edit dialog
  const openEditDialog = (task: SprintTask) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      priority: task.priority,
      assignee: task.assignee || "",
      dueDate: task.dueDate || "",
      storyPoints: task.storyPoints?.toString() || "",
      tags: task.tags?.join(", ") || "",
    });
    setIsEditDialogOpen(true);
  };

  // Drag handlers
  const handleDragStart = (task: SprintTask) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedTask || draggedTask.columnId === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    // Check WIP limit
    const targetColumn = columns.find(c => c.id === targetColumnId);
    const targetColumnTasks = tasks.filter(t => t.columnId === targetColumnId);

    if (targetColumn?.wipLimit && targetColumnTasks.length >= targetColumn.wipLimit) {
      alert(`WIP limit reached for ${targetColumn.name} (${targetColumn.wipLimit})`);
      setDraggedTask(null);
      return;
    }

    // Update task column
    const maxOrder = targetColumnTasks.length > 0
      ? Math.max(...targetColumnTasks.map(t => t.order))
      : -1;

    const updatedTasks = tasks.map(task =>
      task.id === draggedTask.id
        ? { ...task, columnId: targetColumnId, order: maxOrder + 1 }
        : task
    );

    setTasks(updatedTasks);
    saveConfig(sprint, columns, updatedTasks);
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  // Calculate sprint progress
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.columnId === "done").length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="h-full flex flex-col gap-3 p-4 @container">
      {/* Sprint Header */}
      <div className="flex-none space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{sprint.name}</h3>
            {sprint.goal && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Target className="h-3 w-3 flex-shrink-0" />
                {sprint.goal}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                <Filter className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="p-2 space-y-2">
                <div>
                  <label className="text-xs font-medium mb-1 block">Priority</label>
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {assignees.length > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Assignee</label>
                    <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {assignees.map(assignee => (
                          <SelectItem key={assignee} value={assignee}>
                            {assignee}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}% ({doneTasks}/{totalTasks})</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {sprint.startDate && sprint.endDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>
              {new Date(sprint.startDate).toLocaleDateString()} - {new Date(sprint.endDate).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* Columns */}
      <div className="flex-1 min-h-0 grid grid-cols-1 @2xl:grid-cols-2 @4xl:grid-cols-4 gap-3 overflow-auto">
        {columns.map(column => {
          const columnTasks = getColumnTasks(column.id);
          const isOverLimit = column.wipLimit ? columnTasks.length >= column.wipLimit : false;

          return (
            <div
              key={column.id}
              className={cn(
                "flex flex-col gap-2 p-3 rounded-lg border bg-muted/30 transition-colors min-h-0",
                dragOverColumn === column.id && "bg-primary/5 border-primary"
              )}
              onDragOver={(e) => handleDragOver(e, column.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.id)}
            >
              {/* Column Header */}
              <div className="flex-none space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-medium text-xs uppercase tracking-wide truncate">
                    {column.name}
                  </h4>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {columnTasks.length}
                    {column.wipLimit && `/${column.wipLimit}`}
                  </Badge>
                </div>

                {column.wipLimit && isOverLimit && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    WIP limit reached!
                  </p>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => openAddDialog(column.id)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Task
                </Button>
              </div>

              {/* Tasks */}
              <div className="flex-1 min-h-0 space-y-2 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {columnTasks.map(task => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group p-2.5 rounded-md border bg-background cursor-grab active:cursor-grabbing",
                        "hover:shadow-sm transition-shadow",
                        draggedTask?.id === task.id && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 mt-0.5 flex-shrink-0" />

                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-xs font-medium leading-snug break-words">
                            {task.title}
                          </p>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn("text-xs h-5 px-1.5 border", PRIORITY_CONFIG[task.priority].color)}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </Badge>

                            {task.storyPoints && (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                {task.storyPoints} pts
                              </Badge>
                            )}

                            {task.assignee && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                <span>{task.assignee}</span>
                              </div>
                            )}

                            {task.dueDate && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            )}
                          </div>

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              <Tag className="h-3 w-3 text-muted-foreground" />
                              {task.tags.map((tag, i) => (
                                <Badge key={i} variant="outline" className="text-xs h-5 px-1.5">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(task)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) =>
                    setTaskForm({ ...taskForm, priority: value as SprintTask["priority"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Story Points</label>
                <Input
                  type="number"
                  value={taskForm.storyPoints}
                  onChange={(e) => setTaskForm({ ...taskForm, storyPoints: e.target.value })}
                  placeholder="Points"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Assignee</label>
              <Input
                value={taskForm.assignee}
                onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                placeholder="Assignee name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <Input
                value={taskForm.tags}
                onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddTask} disabled={!taskForm.title.trim()}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Title *</label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Priority</label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(value) =>
                    setTaskForm({ ...taskForm, priority: value as SprintTask["priority"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Story Points</label>
                <Input
                  type="number"
                  value={taskForm.storyPoints}
                  onChange={(e) => setTaskForm({ ...taskForm, storyPoints: e.target.value })}
                  placeholder="Points"
                  min="0"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Assignee</label>
              <Input
                value={taskForm.assignee}
                onChange={(e) => setTaskForm({ ...taskForm, assignee: e.target.value })}
                placeholder="Assignee name"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Due Date</label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Tags</label>
              <Input
                value={taskForm.tags}
                onChange={(e) => setTaskForm({ ...taskForm, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTask} disabled={!taskForm.title.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
