"use client";

import { useState, useEffect } from "react";
import { Target, Plus, Edit2, Trash2, TrendingUp, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

// Goal types supported by the widget
type GoalType = "numeric" | "percentage" | "boolean";

// Goal interface
interface Goal {
  id: string;
  name: string;
  type: GoalType;
  current: number;
  target: number;
  color: string;
  unit?: string; // Optional unit like "$", "km", "books"
  completed?: boolean; // For boolean type goals
}

// Available colors for goals
const GOAL_COLORS = [
  { name: "Blue", value: "rgb(59, 130, 246)", class: "bg-blue-500" },
  { name: "Green", value: "rgb(34, 197, 94)", class: "bg-green-500" },
  { name: "Purple", value: "rgb(168, 85, 247)", class: "bg-purple-500" },
  { name: "Orange", value: "rgb(249, 115, 22)", class: "bg-orange-500" },
  { name: "Pink", value: "rgb(236, 72, 153)", class: "bg-pink-500" },
  { name: "Yellow", value: "rgb(234, 179, 8)", class: "bg-yellow-500" },
  { name: "Red", value: "rgb(239, 68, 68)", class: "bg-red-500" },
  { name: "Teal", value: "rgb(20, 184, 166)", class: "bg-teal-500" },
];

interface ProgressWidgetProps {
  widget: Widget;
}

export function ProgressWidget({ widget }: ProgressWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState<GoalType>("numeric");
  const [formCurrent, setFormCurrent] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formColor, setFormColor] = useState(GOAL_COLORS[0].value);
  const [formUnit, setFormUnit] = useState("");

  // Load goals from widget config
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedGoals = widget.config?.goals || [];
      setGoals(savedGoals);
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.config]);

  // Save goals to widget config
  const saveGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        goals: newGoals,
      },
    });
  };

  // Reset form
  const resetForm = () => {
    setFormName("");
    setFormType("numeric");
    setFormCurrent("");
    setFormTarget("");
    setFormColor(GOAL_COLORS[0].value);
    setFormUnit("");
  };

  // Open add dialog
  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  // Open edit dialog
  const handleOpenEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormType(goal.type);
    setFormCurrent(goal.current.toString());
    setFormTarget(goal.target.toString());
    setFormColor(goal.color);
    setFormUnit(goal.unit || "");
    setIsEditDialogOpen(true);
  };

  // Add goal
  const handleAddGoal = () => {
    const newGoal: Goal = {
      id: `goal-${Date.now()}`,
      name: formName,
      type: formType,
      current: parseFloat(formCurrent) || 0,
      target: parseFloat(formTarget) || 100,
      color: formColor,
      unit: formUnit || undefined,
    };
    saveGoals([...goals, newGoal]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  // Update goal
  const handleUpdateGoal = () => {
    if (!editingGoal) return;
    const updatedGoals = goals.map((g) =>
      g.id === editingGoal.id
        ? {
            ...g,
            name: formName,
            type: formType,
            current: parseFloat(formCurrent) || 0,
            target: parseFloat(formTarget) || 100,
            color: formColor,
            unit: formUnit || undefined,
          }
        : g
    );
    saveGoals(updatedGoals);
    setIsEditDialogOpen(false);
    setEditingGoal(null);
    resetForm();
  };

  // Delete goal
  const handleDeleteGoal = (goalId: string) => {
    saveGoals(goals.filter((g) => g.id !== goalId));
  };

  // Update goal progress
  const handleUpdateProgress = (goalId: string, newValue: number) => {
    const updatedGoals = goals.map((g) =>
      g.id === goalId ? { ...g, current: newValue } : g
    );
    saveGoals(updatedGoals);
  };

  // Calculate progress percentage
  const calculateProgress = (goal: Goal): number => {
    if (goal.type === "boolean") {
      return goal.completed ? 100 : 0;
    }
    return Math.min((goal.current / goal.target) * 100, 100);
  };

  // Format value with unit
  const formatValue = (value: number, unit?: string): string => {
    if (unit) {
      return `${unit}${value}`;
    }
    return value.toString();
  };

  // Check if form is valid
  const isFormValid = (): boolean => {
    if (!formName.trim()) return false;
    if (formType !== "boolean") {
      const current = parseFloat(formCurrent);
      const target = parseFloat(formTarget);
      if (isNaN(current) || isNaN(target) || target <= 0) return false;
    }
    return true;
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Empty state */}
        {goals.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center @md:w-14 @md:h-14"
            >
              <Target className="w-6 h-6 text-primary @md:w-7 @md:h-7" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1 @md:text-base">
                Sin metas aún
              </p>
              <p className="text-xs text-muted-foreground @md:text-sm">
                Añade tu primera meta para empezar a seguir tu progreso
              </p>
            </div>
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Añadir meta
            </Button>
          </div>
        )}

        {/* Goals list */}
        {goals.length > 0 && (
          <>
            <div className="flex-1 overflow-y-auto p-3 space-y-3 @sm:p-4 @sm:space-y-4">
              <AnimatePresence mode="popLayout">
                {goals.map((goal, index) => {
                  const progress = calculateProgress(goal);
                  const isCompleted = progress >= 100;

                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md @sm:p-4",
                        isCompleted && "border-primary/50 bg-primary/5"
                      )}
                    >
                      {/* Goal header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-foreground truncate @sm:text-base">
                              {goal.name}
                            </h3>
                            {isCompleted && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 15 }}
                              >
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                              </motion.div>
                            )}
                          </div>
                          {goal.type !== "boolean" && (
                            <p className="text-xs text-muted-foreground mt-0.5 @sm:text-sm">
                              {formatValue(goal.current, goal.unit)} / {formatValue(goal.target, goal.unit)}
                            </p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDialog(goal)}
                            className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
                          >
                            <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteGoal(goal.id)}
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive @sm:h-8 @sm:w-8"
                          >
                            <Trash2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="relative h-2 bg-secondary/50 rounded-full overflow-hidden @sm:h-3">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{
                            duration: 1,
                            ease: "easeOut",
                            delay: index * 0.1,
                          }}
                          style={{ backgroundColor: goal.color }}
                          className="h-full rounded-full relative"
                        >
                          {/* Shimmer effect for active progress */}
                          {!isCompleted && progress > 0 && (
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                              animate={{
                                x: ["-100%", "200%"],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                repeatDelay: 1,
                              }}
                            />
                          )}
                        </motion.div>
                      </div>

                      {/* Progress percentage */}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-medium" style={{ color: goal.color }}>
                          {progress.toFixed(0)}%
                        </span>
                        {!isCompleted && progress > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <TrendingUp className="w-3 h-3" />
                            <span className="hidden @sm:inline">
                              Faltan {formatValue(goal.target - goal.current, goal.unit)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Quick increment buttons for numeric goals */}
                      {goal.type === "numeric" && !isCompleted && (
                        <div className="hidden @md:flex items-center gap-2 mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">Actualización rápida:</span>
                          {[1, 5, 10].map((increment) => (
                            <Button
                              key={increment}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateProgress(
                                  goal.id,
                                  Math.min(goal.current + increment, goal.target)
                                )
                              }
                              className="h-6 px-2 text-xs"
                            >
                              +{increment}
                            </Button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Add button footer */}
            <div className="border-t p-3 @sm:p-4">
              <Button
                onClick={handleOpenAddDialog}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Añadir meta
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir nueva meta</DialogTitle>
            <DialogDescription>
              Crea una nueva meta para seguir tu progreso
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Goal name */}
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nombre de la meta</Label>
              <Input
                id="goal-name"
                placeholder="ej: Libros leídos, Días de ejercicio"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Goal type */}
            <div className="space-y-2">
              <Label htmlFor="goal-type">Tipo de meta</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as GoalType)}>
                <SelectTrigger id="goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numérico (ej: 5/12)</SelectItem>
                  <SelectItem value="percentage">Porcentaje (0-100%)</SelectItem>
                  <SelectItem value="boolean">Completo/Incompleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current and target values (only for numeric/percentage) */}
            {formType !== "boolean" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-current">Actual</Label>
                  <Input
                    id="goal-current"
                    type="number"
                    placeholder="0"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-target">Objetivo</Label>
                  <Input
                    id="goal-target"
                    type="number"
                    placeholder="100"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            )}

            {/* Unit (only for numeric) */}
            {formType === "numeric" && (
              <div className="space-y-2">
                <Label htmlFor="goal-unit">Unidad (opcional)</Label>
                <Input
                  id="goal-unit"
                  placeholder="ej: $, km, libros"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </div>
            )}

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.class,
                      formColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-110"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={handleAddGoal} disabled={!isFormValid()}>
              Añadir meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Goal Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar meta</DialogTitle>
            <DialogDescription>
              Actualiza los detalles y el progreso de tu meta
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Goal name */}
            <div className="space-y-2">
              <Label htmlFor="edit-goal-name">Nombre de la meta</Label>
              <Input
                id="edit-goal-name"
                placeholder="ej: Libros leídos, Días de ejercicio"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            {/* Goal type */}
            <div className="space-y-2">
              <Label htmlFor="edit-goal-type">Tipo de meta</Label>
              <Select value={formType} onValueChange={(v) => setFormType(v as GoalType)}>
                <SelectTrigger id="edit-goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="numeric">Numérico (ej: 5/12)</SelectItem>
                  <SelectItem value="percentage">Porcentaje (0-100%)</SelectItem>
                  <SelectItem value="boolean">Completo/Incompleto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Current and target values (only for numeric/percentage) */}
            {formType !== "boolean" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-goal-current">Actual</Label>
                  <Input
                    id="edit-goal-current"
                    type="number"
                    placeholder="0"
                    value={formCurrent}
                    onChange={(e) => setFormCurrent(e.target.value)}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-goal-target">Objetivo</Label>
                  <Input
                    id="edit-goal-target"
                    type="number"
                    placeholder="100"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    min="1"
                  />
                </div>
              </div>
            )}

            {/* Unit (only for numeric) */}
            {formType === "numeric" && (
              <div className="space-y-2">
                <Label htmlFor="edit-goal-unit">Unidad (opcional)</Label>
                <Input
                  id="edit-goal-unit"
                  placeholder="ej: $, km, libros"
                  value={formUnit}
                  onChange={(e) => setFormUnit(e.target.value)}
                />
              </div>
            )}

            {/* Color picker */}
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {GOAL_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormColor(color.value)}
                    className={cn(
                      "w-8 h-8 rounded-full transition-all",
                      color.class,
                      formColor === color.value
                        ? "ring-2 ring-offset-2 ring-primary scale-110"
                        : "hover:scale-110"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingGoal(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal} disabled={!isFormValid()}>
              Actualizar meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
