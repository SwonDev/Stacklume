"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Lightbulb,
  Plus,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
  Tag,
  Filter,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface ParkingLotEnhancedWidgetProps {
  widget: Widget;
}

type IdeaStatus = "pending" | "implemented" | "rejected";

interface ParkingLotItem {
  id: string;
  title: string;
  description?: string;
  votes: number;
  category: string;
  status: IdeaStatus;
  createdAt: string;
}

interface ParkingLotEnhancedConfig {
  parkingLotItems?: ParkingLotItem[];
  categories?: string[];
}

const DEFAULT_CATEGORIES = ["Feature", "Bug", "Mejora", "Investigar", "Otro"];

const STATUS_CONFIG = {
  pending: { label: "Pendiente", color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  implemented: { label: "Implementado", color: "bg-green-500/10 text-green-600 border-green-500/30" },
  rejected: { label: "Rechazado", color: "bg-red-500/10 text-red-600 border-red-500/30" },
};

type SortOption = "votes" | "newest" | "oldest";

export function ParkingLotEnhancedWidget({ widget }: ParkingLotEnhancedWidgetProps) {
  const config: ParkingLotEnhancedConfig = widget.config || {};
  const items: ParkingLotItem[] = config.parkingLotItems || [];
  const categories = config.categories || DEFAULT_CATEGORIES;

  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState(categories[0]);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<IdeaStatus | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("votes");
  const [isAddingItem, setIsAddingItem] = useState(false);

  const saveItems = useCallback(
    (updatedItems: ParkingLotItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          parkingLotItems: updatedItems,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addItem = () => {
    if (!newItemTitle.trim()) return;

    const newItem: ParkingLotItem = {
      id: crypto.randomUUID(),
      title: newItemTitle.trim(),
      votes: 0,
      category: newItemCategory,
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    saveItems([newItem, ...items]);
    setNewItemTitle("");
    setIsAddingItem(false);
  };

  const deleteItem = (id: string) => {
    saveItems(items.filter((item) => item.id !== id));
  };

  const vote = (id: string, delta: number) => {
    saveItems(
      items.map((item) => (item.id === id ? { ...item, votes: item.votes + delta } : item))
    );
  };

  const setStatus = (id: string, status: IdeaStatus) => {
    saveItems(items.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // Filter by category
    if (filterCategory) {
      result = result.filter((item) => item.category === filterCategory);
    }

    // Filter by status
    if (filterStatus) {
      result = result.filter((item) => item.status === filterStatus);
    }

    // Sort
    switch (sortBy) {
      case "votes":
        result.sort((a, b) => b.votes - a.votes);
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
    }

    return result;
  }, [items, filterCategory, filterStatus, sortBy]);

  const pendingCount = items.filter((i) => i.status === "pending").length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Ideas y Backlog</span>
            <Badge variant="secondary" className="text-[10px] h-5">
              {pendingCount} pendientes
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsAddingItem(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-3 flex-wrap">
          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Tag className="w-3 h-3" />
                {filterCategory || "Categoria"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilterCategory(null)}>
                Todas las categorias
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {categories.map((cat) => (
                <DropdownMenuItem key={cat} onClick={() => setFilterCategory(cat)}>
                  {cat}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Status Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Filter className="w-3 h-3" />
                {filterStatus ? STATUS_CONFIG[filterStatus].label : "Estado"}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setFilterStatus(null)}>
                Todos los estados
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {(Object.keys(STATUS_CONFIG) as IdeaStatus[]).map((status) => (
                <DropdownMenuItem key={status} onClick={() => setFilterStatus(status)}>
                  {STATUS_CONFIG[status].label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1 ml-auto">
                Ordenar
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("votes")}>
                Mas votados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                Mas recientes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                Mas antiguos
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Add Item Form */}
        <AnimatePresence>
          {isAddingItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                <Input
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addItem();
                    if (e.key === "Escape") {
                      setIsAddingItem(false);
                      setNewItemTitle("");
                    }
                  }}
                  placeholder="Describe la idea..."
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs flex-1"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" className="h-8" onClick={addItem} disabled={!newItemTitle.trim()}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={() => {
                      setIsAddingItem(false);
                      setNewItemTitle("");
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items List */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {filteredAndSortedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Lightbulb className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin ideas aun</p>
              <p className="text-xs">Haz clic en + para agregar una</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredAndSortedItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "group p-2 @sm:p-3 rounded-lg border transition-colors",
                      item.status === "pending"
                        ? "border-border bg-card hover:border-primary/50"
                        : item.status === "implemented"
                        ? "border-green-500/30 bg-green-500/5"
                        : "border-red-500/30 bg-red-500/5 opacity-60"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {/* Voting */}
                      <div className="flex flex-col items-center gap-0.5 pt-0.5">
                        <button
                          onClick={() => vote(item.id, 1)}
                          className="p-0.5 rounded hover:bg-primary/10 transition-colors"
                          disabled={item.status !== "pending"}
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-muted-foreground hover:text-green-500" />
                        </button>
                        <span
                          className={cn(
                            "text-xs font-semibold tabular-nums",
                            item.votes > 0 && "text-green-600",
                            item.votes < 0 && "text-red-600"
                          )}
                        >
                          {item.votes}
                        </span>
                        <button
                          onClick={() => vote(item.id, -1)}
                          className="p-0.5 rounded hover:bg-primary/10 transition-colors"
                          disabled={item.status !== "pending"}
                        >
                          <ThumbsDown className="w-3.5 h-3.5 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            item.status !== "pending" && "line-through text-muted-foreground"
                          )}
                        >
                          {item.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-[10px] h-5">
                            {item.category}
                          </Badge>
                          <Badge className={cn("text-[10px] h-5 border", STATUS_CONFIG[item.status].color)}>
                            {STATUS_CONFIG[item.status].label}
                          </Badge>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.status === "pending" && (
                          <>
                            <button
                              onClick={() => setStatus(item.id, "implemented")}
                              className="p-1 rounded hover:bg-green-500/10 transition-colors"
                              title="Marcar como implementado"
                            >
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            </button>
                            <button
                              onClick={() => setStatus(item.id, "rejected")}
                              className="p-1 rounded hover:bg-red-500/10 transition-colors"
                              title="Marcar como rechazado"
                            >
                              <X className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="p-1 rounded hover:bg-destructive/10 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
