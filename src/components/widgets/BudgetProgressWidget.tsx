"use client";

import { useState, useCallback } from "react";
import {
  Wallet,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface BudgetProgressWidgetProps {
  widget: Widget;
}

interface Budget {
  id: string;
  name: string;
  limit: number;
  spent: number;
  color: string;
}

const BUDGET_COLORS = [
  { name: "Azul", value: "rgb(59, 130, 246)", class: "bg-blue-500" },
  { name: "Verde", value: "rgb(34, 197, 94)", class: "bg-green-500" },
  { name: "Morado", value: "rgb(168, 85, 247)", class: "bg-purple-500" },
  { name: "Naranja", value: "rgb(249, 115, 22)", class: "bg-orange-500" },
  { name: "Rosa", value: "rgb(236, 72, 153)", class: "bg-pink-500" },
  { name: "Rojo", value: "rgb(239, 68, 68)", class: "bg-red-500" },
  { name: "Cian", value: "rgb(20, 184, 166)", class: "bg-teal-500" },
  { name: "Amarillo", value: "rgb(234, 179, 8)", class: "bg-yellow-500" },
];

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getProgressColor = (percentage: number): string => {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 70) return "bg-yellow-500";
  return "bg-green-500";
};

const getStatusIcon = (percentage: number) => {
  if (percentage >= 90) {
    return <AlertTriangle className="w-4 h-4 text-red-500" />;
  }
  if (percentage < 70) {
    return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  }
  return null;
};

export function BudgetProgressWidget({ widget }: BudgetProgressWidgetProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formLimit, setFormLimit] = useState("");
  const [formSpent, setFormSpent] = useState("");
  const [formColor, setFormColor] = useState(BUDGET_COLORS[0].value);

  const budgets: Budget[] = widget.config?.budgets || [];

  const saveBudgets = useCallback(
    (items: Budget[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          budgets: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const resetForm = () => {
    setFormName("");
    setFormLimit("");
    setFormSpent("");
    setFormColor(BUDGET_COLORS[0].value);
  };

  const handleOpenAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const handleOpenEditDialog = (budget: Budget) => {
    setEditingBudget(budget);
    setFormName(budget.name);
    setFormLimit(budget.limit.toString());
    setFormSpent(budget.spent.toString());
    setFormColor(budget.color);
    setIsEditDialogOpen(true);
  };

  const handleAddBudget = () => {
    const limitValue = parseFloat(formLimit);
    const spentValue = parseFloat(formSpent) || 0;

    if (!formName.trim() || isNaN(limitValue) || limitValue <= 0) return;

    const newBudget: Budget = {
      id: crypto.randomUUID(),
      name: formName.trim(),
      limit: limitValue,
      spent: spentValue,
      color: formColor,
    };

    saveBudgets([...budgets, newBudget]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleUpdateBudget = () => {
    if (!editingBudget) return;

    const limitValue = parseFloat(formLimit);
    const spentValue = parseFloat(formSpent) || 0;

    if (!formName.trim() || isNaN(limitValue) || limitValue <= 0) return;

    const updatedBudgets = budgets.map((b) =>
      b.id === editingBudget.id
        ? {
            ...b,
            name: formName.trim(),
            limit: limitValue,
            spent: spentValue,
            color: formColor,
          }
        : b
    );

    saveBudgets(updatedBudgets);
    setIsEditDialogOpen(false);
    setEditingBudget(null);
    resetForm();
  };

  const handleDeleteBudget = (id: string) => {
    saveBudgets(budgets.filter((b) => b.id !== id));
  };

  const handleQuickUpdateSpent = (id: string, delta: number) => {
    const updatedBudgets = budgets.map((b) =>
      b.id === id
        ? { ...b, spent: Math.max(0, Math.min(b.limit * 1.5, b.spent + delta)) }
        : b
    );
    saveBudgets(updatedBudgets);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);
  const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const isFormValid = (): boolean => {
    if (!formName.trim()) return false;
    const limitValue = parseFloat(formLimit);
    if (isNaN(limitValue) || limitValue <= 0) return false;
    return true;
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Empty state */}
        {budgets.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 p-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center @md:w-14 @md:h-14"
            >
              <Wallet className="w-6 h-6 text-primary @md:w-7 @md:h-7" />
            </motion.div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1 @md:text-base">
                Sin presupuestos
              </p>
              <p className="text-xs text-muted-foreground @md:text-sm">
                Crea categorias de presupuesto para controlar tus gastos
              </p>
            </div>
            <Button
              onClick={handleOpenAddDialog}
              size="sm"
              className="gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              Anadir presupuesto
            </Button>
          </div>
        )}

        {/* Budget list */}
        {budgets.length > 0 && (
          <>
            {/* Overall summary */}
            <div className="p-3 border-b @sm:p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Presupuesto total</span>
                </div>
                {getStatusIcon(overallPercentage)}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-xl font-bold @sm:text-2xl">
                  {formatCurrency(totalSpent)}
                </span>
                <span className="text-sm text-muted-foreground">
                  / {formatCurrency(totalBudget)}
                </span>
              </div>
              <div className="relative h-2 bg-secondary/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(overallPercentage, 100)}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    getProgressColor(overallPercentage)
                  )}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3 space-y-3 @sm:p-4 @sm:space-y-4">
                <AnimatePresence mode="popLayout">
                  {budgets.map((budget, index) => {
                    const percentage = (budget.spent / budget.limit) * 100;
                    const isOver = percentage > 100;

                    return (
                      <motion.div
                        key={budget.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                          "group relative rounded-lg border bg-card p-3 transition-all hover:shadow-md @sm:p-4",
                          isOver && "border-red-500/50 bg-red-500/5"
                        )}
                      >
                        {/* Budget header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: budget.color }}
                              />
                              <h3 className="text-sm font-medium text-foreground truncate @sm:text-base">
                                {budget.name}
                              </h3>
                              {isOver && (
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 @sm:text-sm">
                              {formatCurrency(budget.spent)} /{" "}
                              {formatCurrency(budget.limit)}
                            </p>
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(budget)}
                              className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
                            >
                              <Edit2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBudget(budget.id)}
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
                            animate={{
                              width: `${Math.min(percentage, 100)}%`,
                            }}
                            transition={{
                              duration: 0.5,
                              ease: "easeOut",
                              delay: index * 0.1,
                            }}
                            style={{ backgroundColor: budget.color }}
                            className="h-full rounded-full relative"
                          />
                        </div>

                        {/* Percentage */}
                        <div className="flex items-center justify-between mt-2">
                          <span
                            className="text-xs font-medium"
                            style={{ color: budget.color }}
                          >
                            {percentage.toFixed(0)}%
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {isOver
                              ? `Excedido en ${formatCurrency(
                                  budget.spent - budget.limit
                                )}`
                              : `Restante: ${formatCurrency(
                                  budget.limit - budget.spent
                                )}`}
                          </span>
                        </div>

                        {/* Quick update buttons */}
                        <div className="hidden @md:flex items-center gap-2 mt-3 pt-3 border-t">
                          <span className="text-xs text-muted-foreground">
                            Ajuste rapido:
                          </span>
                          {[-50, -10, 10, 50].map((delta) => (
                            <Button
                              key={delta}
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleQuickUpdateSpent(budget.id, delta)
                              }
                              className="h-6 px-2 text-xs"
                            >
                              {delta > 0 ? `+${delta}` : delta}
                            </Button>
                          ))}
                        </div>
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
                Anadir presupuesto
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Add Budget Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
            <DialogDescription>
              Crea un presupuesto para una categoria de gastos
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="budget-name">Nombre</Label>
              <Input
                id="budget-name"
                placeholder="ej: Comida, Transporte, Ocio"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="budget-limit">Limite</Label>
                <Input
                  id="budget-limit"
                  type="number"
                  placeholder="500"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-spent">Gastado</Label>
                <Input
                  id="budget-spent"
                  type="number"
                  placeholder="0"
                  value={formSpent}
                  onChange={(e) => setFormSpent(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_COLORS.map((color) => (
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
            <Button onClick={handleAddBudget} disabled={!isFormValid()}>
              Crear presupuesto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Budget Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar presupuesto</DialogTitle>
            <DialogDescription>
              Modifica el presupuesto y el gasto actual
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-budget-name">Nombre</Label>
              <Input
                id="edit-budget-name"
                placeholder="ej: Comida, Transporte, Ocio"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-budget-limit">Limite</Label>
                <Input
                  id="edit-budget-limit"
                  type="number"
                  placeholder="500"
                  value={formLimit}
                  onChange={(e) => setFormLimit(e.target.value)}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-budget-spent">Gastado</Label>
                <Input
                  id="edit-budget-spent"
                  type="number"
                  placeholder="0"
                  value={formSpent}
                  onChange={(e) => setFormSpent(e.target.value)}
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {BUDGET_COLORS.map((color) => (
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
                setEditingBudget(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleUpdateBudget} disabled={!isFormValid()}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
