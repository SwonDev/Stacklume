"use client";

import { useState, useCallback } from "react";
import {
  PiggyBank,
  Plus,
  Minus,
  Edit2,
  Trash2,
  Target,
  TrendingUp,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface SavingsGoalWidgetProps {
  widget: Widget;
}

interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  color: string;
  createdAt: string;
}

const GOAL_COLORS = [
  { name: "Esmeralda", value: "rgb(16, 185, 129)", class: "bg-emerald-500" },
  { name: "Azul", value: "rgb(59, 130, 246)", class: "bg-blue-500" },
  { name: "Morado", value: "rgb(168, 85, 247)", class: "bg-purple-500" },
  { name: "Rosa", value: "rgb(236, 72, 153)", class: "bg-pink-500" },
  { name: "Ambar", value: "rgb(245, 158, 11)", class: "bg-amber-500" },
  { name: "Cian", value: "rgb(6, 182, 212)", class: "bg-cyan-500" },
  { name: "Indigo", value: "rgb(99, 102, 241)", class: "bg-indigo-500" },
  { name: "Lima", value: "rgb(132, 204, 22)", class: "bg-lime-500" },
];

const MILESTONES = [25, 50, 75, 100];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getMilestone = (percentage: number): number | null => {
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    if (percentage >= MILESTONES[i]) {
      return MILESTONES[i];
    }
  }
  return null;
};

export function SavingsGoalWidget({ widget }: SavingsGoalWidgetProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCurrent, setFormCurrent] = useState("");
  const [formColor, setFormColor] = useState(GOAL_COLORS[0].value);
  const [fundsAmount, setFundsAmount] = useState("");

  const savingsGoals: SavingsGoal[] = widget.config?.savingsGoals || [];

  const saveGoals = useCallback(
    (items: SavingsGoal[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          savingsGoals: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const resetForm = () => {
    setFormName("");
    setFormTarget("");
    setFormCurrent("");
    setFormColor(GOAL_COLORS[0].value);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setFormName(goal.name);
    setFormTarget(goal.targetAmount.toString());
    setFormCurrent(goal.currentAmount.toString());
    setFormColor(goal.color);
    setIsEditDialogOpen(true);
  };

  const handleOpenAddFundsDialog = (goal: SavingsGoal) => {
    setSelectedGoal(goal);
    setFundsAmount("");
    setIsAddFundsDialogOpen(true);
  };

  const handleAddGoal = () => {
    const targetValue = parseFloat(formTarget);
    const currentValue = parseFloat(formCurrent) || 0;

    if (!formName.trim() || isNaN(targetValue) || targetValue <= 0) return;

    const newGoal: SavingsGoal = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      targetAmount: targetValue,
      currentAmount: Math.min(currentValue, targetValue),
      color: formColor,
      createdAt: new Date().toISOString(),
    };

    saveGoals([...savingsGoals, newGoal]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateGoal = () => {
    if (!editingGoal) return;

    const targetValue = parseFloat(formTarget);
    const currentValue = parseFloat(formCurrent) || 0;

    if (!formName.trim() || isNaN(targetValue) || targetValue <= 0) return;

    const updatedGoals = savingsGoals.map((g) =>
      g.id === editingGoal.id
        ? {
            ...g,
            name: formName.trim(),
            targetAmount: targetValue,
            currentAmount: Math.min(currentValue, targetValue),
            color: formColor,
          }
        : g
    );

    saveGoals(updatedGoals);
    setIsEditDialogOpen(false);
    setEditingGoal(null);
    resetForm();
  };

  const handleDeleteGoal = (id: string) => {
    saveGoals(savingsGoals.filter((g) => g.id !== id));
  };

  const handleAddFunds = (isAdding: boolean) => {
    if (!selectedGoal) return;

    const amount = parseFloat(fundsAmount);
    if (isNaN(amount) || amount <= 0) return;

    const delta = isAdding ? amount : -amount;
    const updatedGoals = savingsGoals.map((g) =>
      g.id === selectedGoal.id
        ? {
            ...g,
            currentAmount: Math.max(
              0,
              Math.min(g.targetAmount, g.currentAmount + delta)
            ),
          }
        : g
    );

    saveGoals(updatedGoals);
    setIsAddFundsDialogOpen(false);
    setSelectedGoal(null);
    setFundsAmount("");
  };

  const handleQuickAdd = (goalId: string, amount: number) => {
    const goal = savingsGoals.find((g) => g.id === goalId);
    if (!goal) return;

    const updatedGoals = savingsGoals.map((g) =>
      g.id === goalId
        ? {
            ...g,
            currentAmount: Math.min(g.targetAmount, g.currentAmount + amount),
          }
        : g
    );

    saveGoals(updatedGoals);
  };

  const totalSaved = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTarget = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);

  const isFormValid = (): boolean => {
    if (!formName.trim()) return false;
    const targetValue = parseFloat(formTarget);
    if (isNaN(targetValue) || targetValue <= 0) return false;
    return true;
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Empty state */}
        {savingsGoals.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center @md:w-14 @md:h-14"
            >
              <PiggyBank className="w-6 h-6 text-primary @md:w-7 @md:h-7" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1 @md:text-base">
                Sin metas de ahorro
              </p>
              <p className="text-xs text-muted-foreground @md:text-sm">
                Crea metas para organizar tus ahorros
              </p>
            </div>
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Nueva meta
            </Button>
          </div>
        )}

        {/* Goals list */}
        {savingsGoals.length > 0 && (
          <>
            {/* Summary header */}
            <div className="p-3 border-b @sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <PiggyBank className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Total ahorrado</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {savingsGoals.length} meta{savingsGoals.length !== 1 && "s"}
                </Badge>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-primary @sm:text-2xl">
                  {formatCurrency(totalSaved)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatCurrency(totalTarget)}
                </span>
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3 @sm:p-4 @sm:space-y-4">
                <AnimatePresence mode="popLayout">
                  {savingsGoals.map((goal, index) => {
                    const percentage =
                      (goal.currentAmount / goal.targetAmount) * 100;
                    const isCompleted = percentage >= 100;
                    const milestone = getMilestone(percentage);

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
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: goal.color }}
                              />
                              <h3 className="text-sm font-medium text-foreground truncate @sm:text-base">
                                {goal.name}
                              </h3>
                              {isCompleted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{
                                    type: "spring",
                                    stiffness: 500,
                                    damping: 15,
                                  }}
                                >
                                  <PartyPopper className="w-4 h-4 text-amber-500" />
                                </motion.div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 @sm:text-sm">
                              {formatCurrency(goal.currentAmount)} /{" "}
                              {formatCurrency(goal.targetAmount)}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenAddFundsDialog(goal)}
                              className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
                              title="Anadir/Retirar fondos"
                            >
                              <TrendingUp className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                            </Button>
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
                        <div className="relative h-3 bg-secondary/50 rounded-full overflow-hidden @sm:h-4">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(percentage, 100)}%` }}
                            transition={{
                              duration: 0.8,
                              ease: "easeOut",
                              delay: index * 0.1,
                            }}
                            style={{ backgroundColor: goal.color }}
                            className="h-full rounded-full relative"
                          >
                            {/* Shimmer effect */}
                            {!isCompleted && percentage > 0 && (
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

                          {/* Milestone markers */}
                          {MILESTONES.slice(0, -1).map((m) => (
                            <div
                              key={m}
                              className="absolute top-0 bottom-0 w-0.5 bg-background/50"
                              style={{ left: `${m}%` }}
                            />
                          ))}
                        </div>

                        {/* Percentage and milestone */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-xs font-medium"
                              style={{ color: goal.color }}
                            >
                              {percentage.toFixed(0)}%
                            </span>
                            {milestone && !isCompleted && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 px-1.5 py-0"
                              >
                                <Sparkles className="w-2.5 h-2.5" />
                                {milestone}% alcanzado
                              </Badge>
                            )}
                          </div>
                          {!isCompleted && (
                            <span className="text-xs text-muted-foreground">
                              Faltan{" "}
                              {formatCurrency(
                                goal.targetAmount - goal.currentAmount
                              )}
                            </span>
                          )}
                        </div>

                        {/* Quick add buttons */}
                        {!isCompleted && (
                          <div className="hidden @md:flex items-center gap-2 mt-3 pt-3 border-t">
                            <span className="text-xs text-muted-foreground">
                              Añadir rapido:
                            </span>
                            {[10, 50, 100].map((amount) => (
                              <Button
                                key={amount}
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuickAdd(goal.id, amount)}
                                className="h-6 px-2 text-xs"
                              >
                                +{formatCurrency(amount)}
                              </Button>
                            ))}
                          </div>
                        )}

                        {/* Celebration for completed goals */}
                        {isCompleted && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-3 pt-3 border-t text-center"
                          >
                            <p className="text-xs text-primary font-medium flex items-center justify-center gap-1">
                              <PartyPopper className="w-3 h-3" />
                              Meta completada!
                              <PartyPopper className="w-3 h-3" />
                            </p>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>

            {/* Add button footer */}
            <div className="border-t p-3 @sm:p-4">
              <Button
                onClick={handleOpenAddDialog}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <Plus className="w-4 h-4" />
                Nueva meta de ahorro
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Add Goal Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva meta de ahorro</DialogTitle>
            <DialogDescription>
              Define una meta para organizar tus ahorros
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="goal-name">Nombre</Label>
              <Input
                id="goal-name"
                placeholder="ej: Vacaciones, Coche nuevo, Fondo de emergencia"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goal-target">Objetivo</Label>
                <Input
                  id="goal-target"
                  type="number"
                  placeholder="1000"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-current">Ahorrado</Label>
                <Input
                  id="goal-current"
                  type="number"
                  placeholder="0"
                  value={formCurrent}
                  onChange={(e) => setFormCurrent(e.target.value)}
                  min="0"
                />
              </div>
            </div>

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
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddGoal} disabled={!isFormValid()}>
              Crear meta
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
              Modifica los detalles de tu meta de ahorro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-goal-name">Nombre</Label>
              <Input
                id="edit-goal-name"
                placeholder="ej: Vacaciones, Coche nuevo"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-goal-target">Objetivo</Label>
                <Input
                  id="edit-goal-target"
                  type="number"
                  placeholder="1000"
                  value={formTarget}
                  onChange={(e) => setFormTarget(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-goal-current">Ahorrado</Label>
                <Input
                  id="edit-goal-current"
                  type="number"
                  placeholder="0"
                  value={formCurrent}
                  onChange={(e) => setFormCurrent(e.target.value)}
                  min="0"
                />
              </div>
            </div>

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
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Subtract Funds Dialog */}
      <Dialog
        open={isAddFundsDialogOpen}
        onOpenChange={setIsAddFundsDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gestionar fondos</DialogTitle>
            <DialogDescription>
              {selectedGoal && (
                <>
                  Añade o retira fondos de &quot;{selectedGoal.name}&quot;
                  <br />
                  <span className="text-primary font-medium">
                    Actual: {formatCurrency(selectedGoal.currentAmount)} /{" "}
                    {formatCurrency(selectedGoal.targetAmount)}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="funds-amount">Cantidad</Label>
              <Input
                id="funds-amount"
                type="number"
                placeholder="100"
                value={fundsAmount}
                onChange={(e) => setFundsAmount(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleAddFunds(false)}
              disabled={
                !fundsAmount ||
                parseFloat(fundsAmount) <= 0 ||
                (selectedGoal ? selectedGoal.currentAmount <= 0 : false)
              }
              className="gap-1"
            >
              <Minus className="w-4 h-4" />
              Retirar
            </Button>
            <Button
              onClick={() => handleAddFunds(true)}
              disabled={
                !fundsAmount ||
                parseFloat(fundsAmount) <= 0 ||
                (selectedGoal
                  ? selectedGoal.currentAmount >= selectedGoal.targetAmount
                  : false)
              }
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Anadir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
