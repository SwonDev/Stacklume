"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  GanttChart,
  Plus,
  Calendar,
  Flag,
  Check,
  MoreVertical,
  Edit,
  Trash2,
  List,
  Users,
  Link2,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type MilestoneStatus = "upcoming" | "in-progress" | "completed" | "delayed";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  status: MilestoneStatus;
  progress: number;
  color: string;
  assignees?: string[];
  dependencies?: string[];
  createdAt: string;
}

interface ProjectTimelineConfig {
  projectName: string;
  milestones: Milestone[];
  viewMode: "timeline" | "list";
  showCompleted: boolean;
  statusFilter: MilestoneStatus | "all";
}

interface ProjectTimelineWidgetProps {
  widget: Widget;
}

const STATUS_CONFIG = {
  upcoming: {
    label: "Upcoming",
    color: "hsl(217, 91%, 60%)",
    bgColor: "hsl(217, 91%, 95%)",
    darkBgColor: "hsl(217, 91%, 20%)",
  },
  "in-progress": {
    label: "In Progress",
    color: "hsl(45, 93%, 47%)",
    bgColor: "hsl(45, 93%, 95%)",
    darkBgColor: "hsl(45, 93%, 20%)",
  },
  completed: {
    label: "Completed",
    color: "hsl(142, 71%, 45%)",
    bgColor: "hsl(142, 71%, 95%)",
    darkBgColor: "hsl(142, 71%, 20%)",
  },
  delayed: {
    label: "Delayed",
    color: "hsl(0, 84%, 60%)",
    bgColor: "hsl(0, 84%, 95%)",
    darkBgColor: "hsl(0, 84%, 20%)",
  },
};

const PRESET_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#f59e0b",
  "#10b981",
  "#06b6d4",
  "#6366f1",
  "#f43f5e",
];

export default function ProjectTimelineWidget({
  widget,
}: ProjectTimelineWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const config = (widget.config as unknown as ProjectTimelineConfig) || {
    projectName: "My Project",
    milestones: [],
    viewMode: "timeline",
    showCompleted: true,
    statusFilter: "all",
  };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(
    null
  );
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    description: "",
    dueDate: "",
    status: "upcoming" as MilestoneStatus,
    progress: 0,
    color: PRESET_COLORS[0],
    assignees: "",
    dependencies: [] as string[],
  });

  const updateConfig = (updates: Partial<ProjectTimelineConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const filteredMilestones = useMemo(() => {
    let filtered = config.milestones;

    if (!config.showCompleted) {
      filtered = filtered.filter((m) => m.status !== "completed");
    }

    if (config.statusFilter !== "all") {
      filtered = filtered.filter((m) => m.status === config.statusFilter);
    }

    return filtered.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  }, [config.milestones, config.showCompleted, config.statusFilter]);

  const handleAddMilestone = () => {
    const milestone: Milestone = {
      id: crypto.randomUUID(),
      title: newMilestone.title,
      description: newMilestone.description,
      dueDate: newMilestone.dueDate,
      status: newMilestone.status,
      progress: newMilestone.progress,
      color: newMilestone.color,
      assignees: newMilestone.assignees
        ? newMilestone.assignees.split(",").map((a) => a.trim())
        : [],
      dependencies: newMilestone.dependencies,
      createdAt: new Date().toISOString(),
    };

    if (editingMilestone) {
      updateConfig({
        milestones: config.milestones.map((m) =>
          m.id === editingMilestone.id ? { ...milestone, id: m.id } : m
        ),
      });
    } else {
      updateConfig({
        milestones: [...config.milestones, milestone],
      });
    }

    resetForm();
  };

  const handleDeleteMilestone = (id: string) => {
    updateConfig({
      milestones: config.milestones.filter((m) => m.id !== id),
    });
  };

  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setNewMilestone({
      title: milestone.title,
      description: milestone.description || "",
      dueDate: milestone.dueDate,
      status: milestone.status,
      progress: milestone.progress,
      color: milestone.color,
      assignees: milestone.assignees?.join(", ") || "",
      dependencies: milestone.dependencies || [],
    });
    setIsAddDialogOpen(true);
  };

  const handleUpdateProgress = (id: string, progress: number) => {
    updateConfig({
      milestones: config.milestones.map((m) =>
        m.id === id
          ? {
              ...m,
              progress,
              status:
                progress === 100
                  ? "completed"
                  : progress > 0
                    ? "in-progress"
                    : m.status,
            }
          : m
      ),
    });
  };

  const handleUpdateStatus = (id: string, status: MilestoneStatus) => {
    updateConfig({
      milestones: config.milestones.map((m) =>
        m.id === id
          ? {
              ...m,
              status,
              progress: status === "completed" ? 100 : m.progress,
            }
          : m
      ),
    });
  };

  const resetForm = () => {
    setNewMilestone({
      title: "",
      description: "",
      dueDate: "",
      status: "upcoming",
      progress: 0,
      color: PRESET_COLORS[0],
      assignees: "",
      dependencies: [],
    });
    setEditingMilestone(null);
    setIsAddDialogOpen(false);
  };

  const isOverdue = (dueDate: string, status: MilestoneStatus) => {
    if (status === "completed") return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return `${Math.abs(days)} days overdue`;
    if (days === 0) return "Due today";
    if (days === 1) return "Due tomorrow";
    return `${days} days left`;
  };

  const getTimelinePosition = (dueDate: string) => {
    if (filteredMilestones.length === 0) return 0;

    const dates = filteredMilestones.map((m) =>
      new Date(m.dueDate).getTime()
    );
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const current = new Date(dueDate).getTime();

    if (max === min) return 50;
    return ((current - min) / (max - min)) * 100;
  };

  return (
    <Card className="h-full flex flex-col @container">
      <CardHeader className="flex-none pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <GanttChart className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <CardTitle className="text-base truncate">
              {config.projectName}
            </CardTitle>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() =>
                updateConfig({
                  viewMode: config.viewMode === "timeline" ? "list" : "timeline",
                })
              }
            >
              {config.viewMode === "timeline" ? (
                <List className="h-3.5 w-3.5" />
              ) : (
                <GanttChart className="h-3.5 w-3.5" />
              )}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setEditingMilestone(null);
                    resetForm();
                  }}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
                <DialogHeader>
                  <DialogTitle>
                    {editingMilestone ? "Edit Milestone" : "Add Milestone"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingMilestone
                      ? "Update the milestone details below."
                      : "Create a new milestone for your project timeline."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="Milestone title"
                      value={newMilestone.title}
                      onChange={(e) =>
                        setNewMilestone({ ...newMilestone, title: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Milestone description"
                      value={newMilestone.description}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date *</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={newMilestone.dueDate}
                        onChange={(e) =>
                          setNewMilestone({
                            ...newMilestone,
                            dueDate: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={newMilestone.status}
                        onValueChange={(value: MilestoneStatus) =>
                          setNewMilestone({ ...newMilestone, status: value })
                        }
                      >
                        <SelectTrigger id="status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="progress">
                      Progress: {newMilestone.progress}%
                    </Label>
                    <input
                      id="progress"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={newMilestone.progress}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          progress: parseInt(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Color</Label>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={cn(
                            "w-8 h-8 rounded-full border-2 transition-all",
                            newMilestone.color === color
                              ? "border-foreground scale-110"
                              : "border-transparent hover:scale-105"
                          )}
                          style={{ backgroundColor: color }}
                          onClick={() =>
                            setNewMilestone({ ...newMilestone, color })
                          }
                        />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assignees">
                      Assignees (comma-separated)
                    </Label>
                    <Input
                      id="assignees"
                      placeholder="John Doe, Jane Smith"
                      value={newMilestone.assignees}
                      onChange={(e) =>
                        setNewMilestone({
                          ...newMilestone,
                          assignees: e.target.value,
                        })
                      }
                    />
                  </div>
                  {config.milestones.length > 0 && (
                    <div className="space-y-2">
                      <Label>Dependencies</Label>
                      <div className="space-y-1 max-h-32 overflow-y-auto border rounded-md p-2">
                        {config.milestones
                          .filter((m) => m.id !== editingMilestone?.id)
                          .map((m) => (
                            <label
                              key={m.id}
                              className="flex items-center gap-2 text-sm hover:bg-accent p-1.5 rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={newMilestone.dependencies.includes(m.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewMilestone({
                                      ...newMilestone,
                                      dependencies: [
                                        ...newMilestone.dependencies,
                                        m.id,
                                      ],
                                    });
                                  } else {
                                    setNewMilestone({
                                      ...newMilestone,
                                      dependencies:
                                        newMilestone.dependencies.filter(
                                          (id) => id !== m.id
                                        ),
                                    });
                                  }
                                }}
                                className="rounded"
                              />
                              <span className="truncate">{m.title}</span>
                            </label>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddMilestone}
                    disabled={!newMilestone.title || !newMilestone.dueDate}
                  >
                    {editingMilestone ? "Update" : "Add"} Milestone
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pb-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={config.statusFilter}
            onValueChange={(value) =>
              updateConfig({
                statusFilter: value as MilestoneStatus | "all",
              })
            }
          >
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, value]) => (
                <SelectItem key={key} value={key}>
                  {value.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Switch
              checked={config.showCompleted}
              onCheckedChange={(checked) =>
                updateConfig({ showCompleted: checked })
              }
            />
            <span>Show Completed</span>
          </label>
        </div>

        {/* Content */}
        {filteredMilestones.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <GanttChart className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">No milestones yet</p>
              <p className="text-xs mt-1">
                Click the + button to add your first milestone
              </p>
            </div>
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="space-y-3 pr-3">
              {config.viewMode === "timeline" ? (
                <TimelineView
                  milestones={filteredMilestones}
                  onEdit={handleEditMilestone}
                  onDelete={handleDeleteMilestone}
                  onUpdateProgress={handleUpdateProgress}
                  onUpdateStatus={handleUpdateStatus}
                  getTimelinePosition={getTimelinePosition}
                  formatDate={formatDate}
                  getDaysUntil={getDaysUntil}
                  isOverdue={isOverdue}
                />
              ) : (
                <ListView
                  milestones={filteredMilestones}
                  onEdit={handleEditMilestone}
                  onDelete={handleDeleteMilestone}
                  onUpdateProgress={handleUpdateProgress}
                  onUpdateStatus={handleUpdateStatus}
                  formatDate={formatDate}
                  getDaysUntil={getDaysUntil}
                  isOverdue={isOverdue}
                />
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

interface ViewProps {
  milestones: Milestone[];
  onEdit: (milestone: Milestone) => void;
  onDelete: (id: string) => void;
  onUpdateProgress: (id: string, progress: number) => void;
  onUpdateStatus: (id: string, status: MilestoneStatus) => void;
  formatDate: (date: string) => string;
  getDaysUntil: (date: string) => string;
  isOverdue: (date: string, status: MilestoneStatus) => boolean;
  getTimelinePosition?: (date: string) => number;
}

function TimelineView({
  milestones,
  onEdit,
  onDelete,
  onUpdateProgress: _onUpdateProgress,
  onUpdateStatus,
  getTimelinePosition,
  formatDate,
  getDaysUntil,
  isOverdue,
}: ViewProps) {
  return (
    <div className="relative @lg:min-h-[300px]">
      {/* Timeline Line - Horizontal on wide, Vertical on narrow */}
      <div className="hidden @lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-border -translate-y-1/2" />
      <div className="@lg:hidden absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

      <div className="space-y-6 @lg:space-y-0 @lg:relative">
        <AnimatePresence mode="popLayout">
          {milestones.map((milestone, index) => {
            const overdue = isOverdue(milestone.dueDate, milestone.status);
            const statusConfig = STATUS_CONFIG[milestone.status];
            const position = getTimelinePosition
              ? getTimelinePosition(milestone.dueDate)
              : 0;

            return (
              <motion.div
                key={milestone.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "@lg:absolute @lg:w-64",
                  index % 2 === 0 ? "@lg:top-1/2 @lg:mt-8" : "@lg:bottom-1/2 @lg:mb-8"
                )}
                style={{
                  left: `${position}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="flex @lg:flex-col items-start gap-3">
                  {/* Timeline Node */}
                  <div className="flex-shrink-0 relative">
                    <div
                      className="w-12 h-12 rounded-full border-4 border-background flex items-center justify-center"
                      style={{ backgroundColor: milestone.color }}
                    >
                      {milestone.status === "completed" ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <Flag className="h-5 w-5 text-white" />
                      )}
                    </div>
                    {/* Connecting line to timeline */}
                    <div
                      className={cn(
                        "@lg:absolute @lg:left-1/2 @lg:-translate-x-1/2 @lg:w-0.5 @lg:bg-border",
                        index % 2 === 0
                          ? "@lg:-top-8 @lg:h-8"
                          : "@lg:-bottom-8 @lg:h-8"
                      )}
                    />
                  </div>

                  {/* Milestone Card */}
                  <motion.div
                    className="flex-1 min-w-0"
                    whileHover={{ scale: 1.02 }}
                  >
                    <Card
                      className={cn(
                        "border-2",
                        overdue && "border-destructive"
                      )}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm truncate">
                              {milestone.title}
                            </h4>
                            {milestone.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {milestone.description}
                              </p>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onEdit(milestone)}
                              >
                                <Edit className="h-3.5 w-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {(Object.keys(STATUS_CONFIG) as MilestoneStatus[]).map(
                                (status) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() =>
                                      onUpdateStatus(milestone.id, status)
                                    }
                                  >
                                    <div
                                      className="h-2 w-2 rounded-full mr-2"
                                      style={{
                                        backgroundColor: STATUS_CONFIG[status].color,
                                      }}
                                    />
                                    {STATUS_CONFIG[status].label}
                                  </DropdownMenuItem>
                                )
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(milestone.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className={overdue ? "text-destructive" : ""}>
                            {formatDate(milestone.dueDate)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                            style={{
                              backgroundColor: statusConfig.bgColor,
                              color: statusConfig.color,
                              borderColor: statusConfig.color,
                            }}
                          >
                            {getDaysUntil(milestone.dueDate)}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {milestone.progress}%
                            </span>
                          </div>
                          <Progress value={milestone.progress} className="h-1.5" />
                        </div>

                        {(milestone.assignees?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            <span className="truncate">
                              {milestone.assignees?.join(", ")}
                            </span>
                          </div>
                        )}

                        {(milestone.dependencies?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Link2 className="h-3 w-3" />
                            <span>{milestone.dependencies?.length} dependencies</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ListView({
  milestones,
  onEdit,
  onDelete,
  onUpdateProgress,
  onUpdateStatus,
  formatDate,
  getDaysUntil,
  isOverdue,
}: ViewProps) {
  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {milestones.map((milestone) => {
          const overdue = isOverdue(milestone.dueDate, milestone.status);
          const statusConfig = STATUS_CONFIG[milestone.status];

          return (
            <motion.div
              key={milestone.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <Card
                className={cn("border-l-4", overdue && "border-l-destructive")}
                style={{
                  borderLeftColor: overdue ? undefined : milestone.color,
                }}
              >
                <CardContent className="p-3 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm truncate">
                          {milestone.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 flex-shrink-0"
                          style={{
                            backgroundColor: statusConfig.bgColor,
                            color: statusConfig.color,
                            borderColor: statusConfig.color,
                          }}
                        >
                          {statusConfig.label}
                        </Badge>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {milestone.description}
                        </p>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(milestone)}>
                          <Edit className="h-3.5 w-3.5 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {(Object.keys(STATUS_CONFIG) as MilestoneStatus[]).map(
                          (status) => (
                            <DropdownMenuItem
                              key={status}
                              onClick={() => onUpdateStatus(milestone.id, status)}
                            >
                              <div
                                className="h-2 w-2 rounded-full mr-2"
                                style={{
                                  backgroundColor: STATUS_CONFIG[status].color,
                                }}
                              />
                              {STATUS_CONFIG[status].label}
                            </DropdownMenuItem>
                          )
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(milestone.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className={overdue ? "text-destructive" : ""}>
                        {formatDate(milestone.dueDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className={overdue ? "text-destructive" : ""}>
                        {getDaysUntil(milestone.dueDate)}
                      </span>
                    </div>
                    {(milestone.assignees?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="h-3 w-3" />
                        <span className="truncate">
                          {milestone.assignees?.join(", ")}
                        </span>
                      </div>
                    )}
                    {(milestone.dependencies?.length ?? 0) > 0 && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Link2 className="h-3 w-3" />
                        <span>{milestone.dependencies?.length} dependencies</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{milestone.progress}%</span>
                        <div className="flex gap-0.5">
                          {[0, 25, 50, 75, 100].map((value) => (
                            <button
                              key={value}
                              onClick={() =>
                                onUpdateProgress(milestone.id, value)
                              }
                              className={cn(
                                "w-5 h-5 rounded text-[10px] hover:bg-accent transition-colors",
                                milestone.progress === value &&
                                  "bg-primary text-primary-foreground"
                              )}
                            >
                              {value}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <Progress value={milestone.progress} className="h-1.5" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
