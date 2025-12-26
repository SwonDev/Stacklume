"use client";

import { useState, useCallback } from "react";
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Flag,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface TodoWidgetProps {
  widget: Widget;
}

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  createdAt: string;
}

const priorityColors = {
  low: "text-blue-500",
  medium: "text-yellow-500",
  high: "text-red-500",
};

const priorityBgColors = {
  low: "bg-blue-500/10",
  medium: "bg-yellow-500/10",
  high: "bg-red-500/10",
};

export function TodoWidget({ widget }: TodoWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const [newTodo, setNewTodo] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");

  const todoItems: TodoItem[] = widget.config?.todoItems || [];
  const showCompleted = widget.config?.showCompletedTodos !== false;

  const saveTodos = useCallback(
    (items: TodoItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          todoItems: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addTodo = () => {
    if (!newTodo.trim()) return;

    const newItem: TodoItem = {
      id: crypto.randomUUID(),
      text: newTodo.trim(),
      completed: false,
      priority,
      createdAt: new Date().toISOString(),
    };

    saveTodos([newItem, ...todoItems]);
    setNewTodo("");
  };

  const toggleTodo = (id: string) => {
    saveTodos(
      todoItems.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const deleteTodo = (id: string) => {
    saveTodos(todoItems.filter((item) => item.id !== id));
  };

  const toggleShowCompleted = () => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        showCompletedTodos: !showCompleted,
      },
    });
  };

  const cyclePriority = () => {
    const priorities: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
    const currentIndex = priorities.indexOf(priority);
    setPriority(priorities[(currentIndex + 1) % priorities.length]);
  };

  const displayedTodos = showCompleted
    ? todoItems
    : todoItems.filter((item) => !item.completed);

  const completedCount = todoItems.filter((item) => item.completed).length;
  const totalCount = todoItems.length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {completedCount}/{totalCount} completadas
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={toggleShowCompleted}
            title={showCompleted ? "Ocultar completadas" : "Mostrar completadas"}
          >
            {showCompleted ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Add todo form */}
        <div className="flex gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 w-8 p-0", priorityColors[priority])}
            onClick={cyclePriority}
            title={`Prioridad: ${priority === "low" ? "baja" : priority === "medium" ? "media" : "alta"}`}
          >
            <Flag className="w-4 h-4" />
          </Button>
          <Input
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTodo()}
            placeholder="Nueva tarea..."
            className="h-8 text-sm flex-1"
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={addTodo}
            disabled={!newTodo.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Todo list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <AnimatePresence mode="popLayout">
            {displayedTodos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
              >
                <CheckSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">
                  {todoItems.length === 0
                    ? "Sin tareas pendientes"
                    : "Todas las tareas completadas"}
                </p>
              </motion.div>
            ) : (
              <div className="space-y-1">
                {displayedTodos.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg group transition-colors",
                      item.completed
                        ? "bg-muted/30"
                        : priorityBgColors[item.priority]
                    )}
                  >
                    <button
                      onClick={() => toggleTodo(item.id)}
                      className={cn(
                        "flex-shrink-0 transition-colors",
                        item.completed
                          ? "text-muted-foreground"
                          : priorityColors[item.priority]
                      )}
                    >
                      {item.completed ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span
                      className={cn(
                        "flex-1 text-sm truncate transition-all",
                        item.completed &&
                          "line-through text-muted-foreground"
                      )}
                    >
                      {item.text}
                    </span>
                    <button
                      onClick={() => deleteTodo(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer with clear completed */}
        {completedCount > 0 && showCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 mt-2 border-t"
          >
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-destructive"
              onClick={() =>
                saveTodos(todoItems.filter((item) => !item.completed))
              }
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Limpiar completadas ({completedCount})
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
