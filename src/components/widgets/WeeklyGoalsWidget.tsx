"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Target,
  Plus,
  ChevronLeft,
  ChevronRight,
  Flag,
  MoreVertical,
  Copy,
  Trash2,
  Edit,
  CheckCircle2,
  Circle,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface KeyResult {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
}

interface Goal {
  id: string;
  title: string;
  status: "not-started" | "in-progress" | "completed" | "blocked";
  priority: "low" | "medium" | "high";
  keyResults: KeyResult[];
}

interface WeekData {
  weekId: string;
  startDate: string;
  endDate: string;
  goals: Goal[];
  reflection: string;
}

interface WeeklyGoalsWidgetProps {
  widget: Widget;
}

const STATUS_CONFIG = {
  "not-started": {
    label: "Not Started",
    color: "bg-gray-500",
    icon: Circle,
  },
  "in-progress": {
    label: "In Progress",
    color: "bg-blue-500",
    icon: PlayCircle,
  },
  completed: {
    label: "Completed",
    color: "bg-green-500",
    icon: CheckCircle2,
  },
  blocked: {
    label: "Blocked",
    color: "bg-red-500",
    icon: XCircle,
  },
};

const PRIORITY_CONFIG = {
  low: { label: "Low", color: "text-gray-500" },
  medium: { label: "Medium", color: "text-yellow-500" },
  high: { label: "High", color: "text-red-500" },
};

function getWeekId(date: Date): string {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
  const start = new Date(d.setDate(diff));
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", options);
  const endStr = end.toLocaleDateString("en-US", options);
  return `${startStr} - ${endStr}`;
}

export function WeeklyGoalsWidget({ widget }: WeeklyGoalsWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [isEditGoalOpen, setIsEditGoalOpen] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [isReflectionOpen, setIsReflectionOpen] = useState(false);

  // Form state
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState<"low" | "medium" | "high">("medium");
  const [newKeyResults, setNewKeyResults] = useState<Omit<KeyResult, "id">[]>([]);

  // Get weeks data from widget config
  const weeksData: WeekData[] = useMemo(() => {
    return (widget.config?.weeksData as WeekData[]) || [];
  }, [widget.config?.weeksData]);

  // Calculate current week
  const currentWeek = useMemo(() => {
    const now = new Date();
    now.setDate(now.getDate() + currentWeekOffset * 7);
    const { start, end } = getWeekBounds(now);
    const weekId = getWeekId(now);

    return {
      weekId,
      start,
      end,
      dateRange: formatDateRange(start, end),
    };
  }, [currentWeekOffset]);

  // Get or create current week data
  const currentWeekData = useMemo(() => {
    const existing = weeksData.find((w) => w.weekId === currentWeek.weekId);
    if (existing) return existing;

    // Auto-create new week
    const newWeek: WeekData = {
      weekId: currentWeek.weekId,
      startDate: currentWeek.start.toISOString(),
      endDate: currentWeek.end.toISOString(),
      goals: [],
      reflection: "",
    };

    return newWeek;
  }, [weeksData, currentWeek]);

  const saveWeekData = (updatedWeekData: WeekData) => {
    const updatedWeeks = weeksData.filter((w) => w.weekId !== updatedWeekData.weekId);
    updatedWeeks.push(updatedWeekData);

    updateWidget(widget.id, {
      config: {
        ...widget.config,
        weeksData: updatedWeeks,
      },
    });
  };

  const addGoal = () => {
    if (!newGoalTitle.trim()) return;

    const newGoal: Goal = {
      id: crypto.randomUUID(),
      title: newGoalTitle,
      status: "not-started",
      priority: newGoalPriority,
      keyResults: newKeyResults.map((kr) => ({
        ...kr,
        id: crypto.randomUUID(),
      })),
    };

    const updatedWeek = {
      ...currentWeekData,
      goals: [...currentWeekData.goals, newGoal],
    };

    saveWeekData(updatedWeek);

    // Reset form
    setNewGoalTitle("");
    setNewGoalPriority("medium");
    setNewKeyResults([]);
    setIsAddGoalOpen(false);
  };

  const updateGoal = (goalId: string, updates: Partial<Goal>) => {
    const updatedWeek = {
      ...currentWeekData,
      goals: currentWeekData.goals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g
      ),
    };
    saveWeekData(updatedWeek);
  };

  const deleteGoal = (goalId: string) => {
    const updatedWeek = {
      ...currentWeekData,
      goals: currentWeekData.goals.filter((g) => g.id !== goalId),
    };
    saveWeekData(updatedWeek);
  };

  const openEditGoal = (goal: Goal) => {
    setEditingGoalId(goal.id);
    setNewGoalTitle(goal.title);
    setNewGoalPriority(goal.priority);
    setNewKeyResults(goal.keyResults.map(({ id, ...kr }) => kr));
    setIsEditGoalOpen(true);
  };

  const saveEditGoal = () => {
    if (!editingGoalId || !newGoalTitle.trim()) return;

    updateGoal(editingGoalId, {
      title: newGoalTitle,
      priority: newGoalPriority,
      keyResults: newKeyResults.map((kr) => ({
        ...kr,
        id: crypto.randomUUID(),
      })),
    });

    // Reset form
    setNewGoalTitle("");
    setNewGoalPriority("medium");
    setNewKeyResults([]);
    setEditingGoalId(null);
    setIsEditGoalOpen(false);
  };

  const updateKeyResultProgress = (goalId: string, krId: string, current: number) => {
    const goal = currentWeekData.goals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedKeyResults = goal.keyResults.map((kr) =>
      kr.id === krId ? { ...kr, current: Math.max(0, current) } : kr
    );

    updateGoal(goalId, { keyResults: updatedKeyResults });
  };

  const addKeyResult = () => {
    setNewKeyResults([
      ...newKeyResults,
      { title: "", current: 0, target: 100, unit: "%" },
    ]);
  };

  const updateKeyResult = (index: number, updates: Partial<Omit<KeyResult, "id">>) => {
    setNewKeyResults(
      newKeyResults.map((kr, i) => (i === index ? { ...kr, ...updates } : kr))
    );
  };

  const removeKeyResult = (index: number) => {
    setNewKeyResults(newKeyResults.filter((_, i) => i !== index));
  };

  const updateReflection = (reflection: string) => {
    saveWeekData({ ...currentWeekData, reflection });
  };

  const copyWeekSummary = async () => {
    const summary = `Week ${currentWeek.weekId} (${currentWeek.dateRange})

Goals:
${currentWeekData.goals
  .map((goal) => {
    const statusIcon = goal.status === "completed" ? "✓" : goal.status === "blocked" ? "✗" : "○";
    const krSummary = goal.keyResults.length
      ? `\n  Key Results:\n${goal.keyResults.map((kr) => `    - ${kr.title}: ${kr.current}/${kr.target} ${kr.unit}`).join("\n")}`
      : "";
    return `${statusIcon} ${goal.title} [${PRIORITY_CONFIG[goal.priority].label}]${krSummary}`;
  })
  .join("\n")}

Reflection:
${currentWeekData.reflection || "No reflection yet."}`;

    await navigator.clipboard.writeText(summary);
  };

  const completedGoals = currentWeekData.goals.filter((g) => g.status === "completed").length;
  const totalGoals = currentWeekData.goals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  return (
    <div className="h-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">Weekly Goals</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentWeekOffset(currentWeekOffset - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-xs font-medium px-2 min-w-[120px] text-center">
            {currentWeek.dateRange}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
            disabled={currentWeekOffset >= 0}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="mb-4 p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Week Progress</span>
          <span className="text-xs font-medium">
            {completedGoals}/{totalGoals} Goals
          </span>
        </div>
        <Progress value={completionRate} className="h-2" />
      </div>

      {/* Goals List */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        <AnimatePresence mode="popLayout">
          {currentWeekData.goals.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8 text-sm text-muted-foreground"
            >
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No goals for this week yet</p>
            </motion.div>
          ) : (
            currentWeekData.goals.map((goal) => {
              const StatusIcon = STATUS_CONFIG[goal.status].icon;
              const priorityColor = PRIORITY_CONFIG[goal.priority].color;

              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${STATUS_CONFIG[goal.status].color.replace("bg-", "text-")}`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">{goal.title}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant="outline"
                            className={`text-xs ${STATUS_CONFIG[goal.status].color.replace("bg-", "border-")} ${STATUS_CONFIG[goal.status].color.replace("bg-", "text-")}`}
                          >
                            {STATUS_CONFIG[goal.status].label}
                          </Badge>
                          <Flag className={`w-3 h-3 ${priorityColor}`} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Select
                        value={goal.status}
                        onValueChange={(value) =>
                          updateGoal(goal.id, {
                            status: value as Goal["status"],
                          })
                        }
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key} className="text-xs">
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreVertical className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditGoal(goal)}>
                            <Edit className="w-3 h-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteGoal(goal.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-3 h-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Key Results */}
                  {goal.keyResults.length > 0 && (
                    <div className="space-y-2 mt-3 pl-6">
                      {goal.keyResults.map((kr) => {
                        const percentage = kr.target > 0 ? (kr.current / kr.target) * 100 : 0;
                        return (
                          <div key={kr.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate flex-1">
                                {kr.title}
                              </span>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={kr.current}
                                  onChange={(e) =>
                                    updateKeyResultProgress(
                                      goal.id,
                                      kr.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="h-6 w-16 text-xs text-right"
                                  min="0"
                                />
                                <span className="text-muted-foreground min-w-[60px]">
                                  / {kr.target} {kr.unit}
                                </span>
                              </div>
                            </div>
                            <Progress value={percentage} className="h-1" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={() => setIsAddGoalOpen(true)}
          className="flex-1"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
        <Button
          onClick={() => setIsReflectionOpen(true)}
          variant="outline"
          size="sm"
        >
          Reflection
        </Button>
        <Button
          onClick={copyWeekSummary}
          variant="outline"
          size="icon"
          className="h-9 w-9"
        >
          <Copy className="w-4 h-4" />
        </Button>
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddGoalOpen} onOpenChange={setIsAddGoalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Add New Goal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="goal-title">Goal Title</Label>
              <Input
                id="goal-title"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g., Complete project milestone"
              />
            </div>

            <div>
              <Label htmlFor="goal-priority">Priority</Label>
              <Select value={newGoalPriority} onValueChange={(value) => setNewGoalPriority(value as Goal["priority"])}>
                <SelectTrigger id="goal-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Key Results (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addKeyResult}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add KR
                </Button>
              </div>

              <div className="space-y-3">
                {newKeyResults.map((kr, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={kr.title}
                        onChange={(e) =>
                          updateKeyResult(index, { title: e.target.value })
                        }
                        placeholder="Key result title"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeKeyResult(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Current</Label>
                        <Input
                          type="number"
                          value={kr.current}
                          onChange={(e) =>
                            updateKeyResult(index, {
                              current: Number(e.target.value),
                            })
                          }
                          className="h-8"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Target</Label>
                        <Input
                          type="number"
                          value={kr.target}
                          onChange={(e) =>
                            updateKeyResult(index, {
                              target: Number(e.target.value),
                            })
                          }
                          className="h-8"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={kr.unit}
                          onChange={(e) =>
                            updateKeyResult(index, { unit: e.target.value })
                          }
                          placeholder="%"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddGoalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addGoal} disabled={!newGoalTitle.trim()}>
              Add Goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditGoalOpen} onOpenChange={setIsEditGoalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit Goal</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-goal-title">Goal Title</Label>
              <Input
                id="edit-goal-title"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                placeholder="e.g., Complete project milestone"
              />
            </div>

            <div>
              <Label htmlFor="edit-goal-priority">Priority</Label>
              <Select value={newGoalPriority} onValueChange={(value) => setNewGoalPriority(value as Goal["priority"])}>
                <SelectTrigger id="edit-goal-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Key Results</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addKeyResult}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add KR
                </Button>
              </div>

              <div className="space-y-3">
                {newKeyResults.map((kr, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Input
                        value={kr.title}
                        onChange={(e) =>
                          updateKeyResult(index, { title: e.target.value })
                        }
                        placeholder="Key result title"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeKeyResult(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Current</Label>
                        <Input
                          type="number"
                          value={kr.current}
                          onChange={(e) =>
                            updateKeyResult(index, {
                              current: Number(e.target.value),
                            })
                          }
                          className="h-8"
                          min="0"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Target</Label>
                        <Input
                          type="number"
                          value={kr.target}
                          onChange={(e) =>
                            updateKeyResult(index, {
                              target: Number(e.target.value),
                            })
                          }
                          className="h-8"
                          min="1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={kr.unit}
                          onChange={(e) =>
                            updateKeyResult(index, { unit: e.target.value })
                          }
                          placeholder="%"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditGoalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveEditGoal} disabled={!newGoalTitle.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Weekly Reflection Dialog */}
      <Dialog open={isReflectionOpen} onOpenChange={setIsReflectionOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Weekly Reflection</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reflection">
                What went well? What could be improved?
              </Label>
              <Textarea
                id="reflection"
                value={currentWeekData.reflection}
                onChange={(e) => updateReflection(e.target.value)}
                placeholder="Reflect on your week..."
                className="min-h-[150px] resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsReflectionOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
