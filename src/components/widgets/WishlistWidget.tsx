"use client";

import { useState, useCallback } from "react";
import {
  Gift,
  Plus,
  Trash2,
  Check,
  ExternalLink,
  ShoppingCart,
  Star,
  ChevronDown,
  ChevronUp,
  Laptop,
  Gamepad2,
  BookOpen,
  MoreHorizontal,
  DollarSign,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface WishlistWidgetProps {
  widget: Widget;
}

type WishlistCategory = "tech" | "games" | "books" | "other";
type WishlistPriority = "high" | "medium" | "low";

interface WishlistItem {
  id: string;
  name: string;
  price?: number;
  link?: string;
  category: WishlistCategory;
  priority: WishlistPriority;
  purchased: boolean;
  addedAt: string;
  purchasedAt?: string;
}

const categoryLabels: Record<WishlistCategory, string> = {
  tech: "Tech",
  games: "Juegos",
  books: "Libros",
  other: "Otros",
};

const categoryColors: Record<WishlistCategory, string> = {
  tech: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  games: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  books: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  other: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

const categoryIcons: Record<WishlistCategory, React.ReactNode> = {
  tech: <Laptop className="w-3 h-3" />,
  games: <Gamepad2 className="w-3 h-3" />,
  books: <BookOpen className="w-3 h-3" />,
  other: <MoreHorizontal className="w-3 h-3" />,
};

const priorityColors: Record<WishlistPriority, string> = {
  high: "text-red-500 fill-red-500",
  medium: "text-amber-500 fill-amber-500",
  low: "text-blue-500 fill-blue-500",
};

const priorityLabels: Record<WishlistPriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const categories: WishlistCategory[] = ["tech", "games", "books", "other"];

export function WishlistWidget({ widget }: WishlistWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newCategory, setNewCategory] = useState<WishlistCategory>("tech");
  const [newPriority, setNewPriority] = useState<WishlistPriority>("medium");
  const [showPurchased, setShowPurchased] = useState(false);
  const [filterCategory, setFilterCategory] = useState<WishlistCategory | "all">("all");

  const wishlistItems: WishlistItem[] = widget.config?.wishlistItems || [];

  const saveWishlistItems = useCallback(
    (items: WishlistItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          wishlistItems: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addItem = () => {
    if (!newName.trim()) return;

    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      name: newName.trim(),
      price: parseFloat(newPrice) || 0,
      link: newLink.trim(),
      category: newCategory,
      priority: newPriority,
      purchased: false,
      addedAt: new Date().toISOString(),
    };

    saveWishlistItems([newItem, ...wishlistItems]);
    setNewName("");
    setNewPrice("");
    setNewLink("");
    setNewPriority("medium");
    setIsAdding(false);
  };

  const deleteItem = (id: string) => {
    saveWishlistItems(wishlistItems.filter((item) => item.id !== id));
  };

  const togglePurchased = (id: string) => {
    saveWishlistItems(
      wishlistItems.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          purchased: !item.purchased,
          purchasedAt: !item.purchased ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  const cyclePriority = (id: string, current: WishlistPriority) => {
    const order: WishlistPriority[] = ["low", "medium", "high"];
    const currentIndex = order.indexOf(current);
    const nextPriority = order[(currentIndex + 1) % order.length];
    saveWishlistItems(
      wishlistItems.map((item) => (item.id === id ? { ...item, priority: nextPriority } : item))
    );
  };

  const getFilteredItems = () => {
    return wishlistItems
      .filter((item) => {
        if (!showPurchased && item.purchased) return false;
        if (filterCategory !== "all" && item.category !== filterCategory) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by purchased status, then priority
        if (a.purchased !== b.purchased) return a.purchased ? 1 : -1;
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  };

  const formatPrice = (price: number) => {
    if (price === 0) return null;
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const getTotalValue = () => {
    return wishlistItems
      .filter((item) => !item.purchased)
      .reduce((sum, item) => sum + (item.price ?? 0), 0);
  };

  const getPurchasedValue = () => {
    return wishlistItems
      .filter((item) => item.purchased)
      .reduce((sum, item) => sum + (item.price ?? 0), 0);
  };

  const filteredItems = getFilteredItems();
  const totalValue = getTotalValue();
  const purchasedValue = getPurchasedValue();
  const pendingCount = wishlistItems.filter((item) => !item.purchased).length;
  const purchasedCount = wishlistItems.filter((item) => item.purchased).length;

  const renderPriorityStars = (item: WishlistItem) => {
    const starCount = item.priority === "high" ? 3 : item.priority === "medium" ? 2 : 1;
    return (
      <button
        onClick={() => cyclePriority(item.id, item.priority)}
        className="flex gap-0.5"
        title={`Prioridad: ${priorityLabels[item.priority]}`}
      >
        {[1, 2, 3].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-3 h-3 transition-colors",
              star <= starCount ? priorityColors[item.priority] : "text-muted-foreground/30"
            )}
          />
        ))}
      </button>
    );
  };

  const renderItemCard = (item: WishlistItem) => {
    const priceFormatted = formatPrice(item.price ?? 0);

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={cn(
          "group p-2 @sm:p-3 rounded-lg border transition-colors",
          item.purchased
            ? "bg-emerald-500/5 border-emerald-500/20 opacity-70"
            : "bg-card border-border hover:border-primary/30"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Purchased checkbox */}
            <button
              onClick={() => togglePurchased(item.id)}
              className={cn(
                "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mt-0.5",
                item.purchased
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-muted-foreground/30 hover:border-primary"
              )}
            >
              {item.purchased && <Check className="w-3 h-3 text-white" />}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn("text-[8px] @sm:text-[9px] h-4 px-1", categoryColors[item.category])}
                >
                  {categoryIcons[item.category]}
                  <span className="ml-0.5">{categoryLabels[item.category]}</span>
                </Badge>
                {renderPriorityStars(item)}
              </div>
              <p
                className={cn(
                  "text-xs @sm:text-sm font-medium truncate",
                  item.purchased && "line-through text-muted-foreground"
                )}
              >
                {item.name}
              </p>
              <div className="flex items-center gap-2 mt-1">
                {priceFormatted && (
                  <span
                    className={cn(
                      "text-[10px] @sm:text-xs font-medium",
                      item.purchased ? "text-muted-foreground" : "text-emerald-500"
                    )}
                  >
                    {priceFormatted}
                  </span>
                )}
                {item.link && (
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] @sm:text-xs text-primary hover:underline flex items-center gap-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver
                  </a>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => deleteItem(item.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {pendingCount} pendientes
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 mb-3">
          <div className="flex-1 p-2 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-primary" />
              <div>
                <p className="text-[9px] @sm:text-[10px] text-muted-foreground">Total pendiente</p>
                <p className="text-xs @sm:text-sm font-medium">{formatPrice(totalValue) || "$0"}</p>
              </div>
            </div>
          </div>
          {purchasedValue > 0 && (
            <div className="flex-1 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5 text-emerald-500" />
                <div>
                  <p className="text-[9px] @sm:text-[10px] text-muted-foreground">Comprado</p>
                  <p className="text-xs @sm:text-sm font-medium text-emerald-500">
                    {formatPrice(purchasedValue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <Button
            variant={filterCategory === "all" ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilterCategory("all")}
          >
            Todos
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              variant={filterCategory === category ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setFilterCategory(category)}
            >
              {categoryIcons[category]}
              <span className="ml-0.5 hidden @sm:inline">{categoryLabels[category]}</span>
            </Button>
          ))}
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 space-y-2 overflow-hidden"
            >
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Nombre del item..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Precio"
                  type="number"
                  step="0.01"
                  className="h-8 text-sm w-24"
                />
                <Input
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="Link (opcional)"
                  className="h-8 text-sm flex-1"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={newCategory === category ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setNewCategory(category)}
                  >
                    {categoryIcons[category]}
                    <span className="ml-0.5">{categoryLabels[category]}</span>
                  </Button>
                ))}
              </div>
              <div className="flex gap-1 items-center">
                <span className="text-xs text-muted-foreground mr-1">Prioridad:</span>
                {(["low", "medium", "high"] as WishlistPriority[]).map((priority) => (
                  <Button
                    key={priority}
                    variant={newPriority === priority ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setNewPriority(priority)}
                  >
                    {priorityLabels[priority]}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  onClick={addItem}
                  disabled={!newName.trim()}
                >
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setIsAdding(false);
                    setNewName("");
                    setNewPrice("");
                    setNewLink("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Wishlist Items */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {wishlistItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Gift className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin items en la lista</p>
              <p className="text-xs">Agrega uno para comenzar</p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredItems.map(renderItemCard)}
              </AnimatePresence>

              {/* Show purchased toggle */}
              {purchasedCount > 0 && (
                <button
                  onClick={() => setShowPurchased(!showPurchased)}
                  className="w-full flex items-center justify-center gap-1 p-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPurchased ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Ocultar comprados ({purchasedCount})
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      Mostrar comprados ({purchasedCount})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
