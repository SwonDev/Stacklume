"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DollarSign,
  Plus,
  Trash2,
  ShoppingCart,
  Car,
  Film,
  ShoppingBag,
  FileText,
  MoreHorizontal,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

interface ExpenseTrackerWidgetProps {
  widget: Widget;
}

interface Expense {
  id: string;
  amount: number;
  category: ExpenseCategory;
  description: string;
  createdAt: string;
}

type ExpenseCategory =
  | "food"
  | "transport"
  | "entertainment"
  | "shopping"
  | "bills"
  | "other";

type TimePeriod = "today" | "week" | "month";

const categoryConfig: Record<
  ExpenseCategory,
  { label: string; icon: React.ElementType; color: string; bgColor: string }
> = {
  food: {
    label: "Comida",
    icon: ShoppingCart,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  transport: {
    label: "Transporte",
    icon: Car,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  entertainment: {
    label: "Entretenimiento",
    icon: Film,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  shopping: {
    label: "Compras",
    icon: ShoppingBag,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  bills: {
    label: "Facturas",
    icon: FileText,
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  other: {
    label: "Otros",
    icon: MoreHorizontal,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
  },
};

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  }).format(amount);
};

const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

const isThisWeek = (date: Date): boolean => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return date >= startOfWeek && date < endOfWeek;
};

const isThisMonth = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export function ExpenseTrackerWidget({ widget }: ExpenseTrackerWidgetProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("today");

  const expenses: Expense[] = widget.config?.expenses || [];

  const saveExpenses = useCallback(
    (items: Expense[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          expenses: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addExpense = () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount: parsedAmount,
      category,
      description: description.trim() || categoryConfig[category].label,
      createdAt: new Date().toISOString(),
    };

    saveExpenses([newExpense, ...expenses]);
    setAmount("");
    setDescription("");
  };

  const deleteExpense = (id: string) => {
    saveExpenses(expenses.filter((expense) => expense.id !== id));
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const date = new Date(expense.createdAt);
      switch (timePeriod) {
        case "today":
          return isToday(date);
        case "week":
          return isThisWeek(date);
        case "month":
          return isThisMonth(date);
        default:
          return true;
      }
    });
  }, [expenses, timePeriod]);

  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  }, [filteredExpenses]);

  const periodLabels: Record<TimePeriod, string> = {
    today: "Hoy",
    week: "Esta semana",
    month: "Este mes",
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Gastos</span>
          </div>
          <Select
            value={timePeriod}
            onValueChange={(v) => setTimePeriod(v as TimePeriod)}
          >
            <SelectTrigger className="h-7 w-[110px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Total */}
        <div className="bg-primary/5 rounded-lg p-3 mb-3">
          <p className="text-xs text-muted-foreground mb-1">
            Total {periodLabels[timePeriod].toLowerCase()}
          </p>
          <p className="text-2xl font-bold text-primary @sm:text-3xl">
            {formatCurrency(totalAmount)}
          </p>
        </div>

        {/* Add expense form */}
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
            />
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ExpenseCategory)}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(categoryConfig).map(([key, config]) => {
                  const Icon = config.icon as React.ComponentType<{ className?: string }>;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className={cn("w-3 h-3", config.color)} />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripcion (opcional)..."
              className="h-8 text-sm flex-1"
              onKeyDown={(e) => e.key === "Enter" && addExpense()}
            />
            <Button
              variant="default"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={addExpense}
              disabled={!amount || parseFloat(amount) <= 0}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Expense list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <AnimatePresence mode="popLayout">
            {filteredExpenses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
              >
                <Calendar className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">Sin gastos {periodLabels[timePeriod].toLowerCase()}</p>
              </motion.div>
            ) : (
              <div className="space-y-1">
                {filteredExpenses.map((expense) => {
                  const config = categoryConfig[expense.category];
                  const Icon = config.icon as React.ComponentType<{ className?: string }>;
                  const date = new Date(expense.createdAt);
                  return (
                    <motion.div
                      key={expense.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg group transition-colors",
                        config.bgColor
                      )}
                    >
                      <div
                        className={cn(
                          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                          config.bgColor
                        )}
                      >
                        <Icon className={cn("w-4 h-4", config.color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {expense.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date.toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono">
                          {formatCurrency(expense.amount)}
                        </Badge>
                        <button
                          onClick={() => deleteExpense(expense.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Category summary */}
        {filteredExpenses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="pt-2 mt-2 border-t hidden @md:block"
          >
            <div className="flex flex-wrap gap-1">
              {Object.entries(categoryConfig).map(([key, config]) => {
                const categoryTotal = filteredExpenses
                  .filter((e) => e.category === key)
                  .reduce((sum, e) => sum + e.amount, 0);
                if (categoryTotal === 0) return null;
                const Icon = config.icon as React.ComponentType<{ className?: string }>;
                return (
                  <Badge
                    key={key}
                    variant="outline"
                    className={cn("text-xs gap-1", config.color)}
                  >
                    <Icon className="w-3 h-3" />
                    {formatCurrency(categoryTotal)}
                  </Badge>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
