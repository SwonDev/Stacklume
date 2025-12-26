"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  Grid3x3,
  Plus,
  Trash2,
  Download,
  Copy,
  Settings,
  RotateCw,
  ArrowDownUp,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface InventoryGridWidgetProps {
  widget: Widget;
}

type ItemType = "weapon" | "armor" | "consumable" | "key-item" | "material" | "misc";
type Rarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  width: number;
  height: number;
  stackSize: number;
  maxStack: number;
  type: ItemType;
  rarity: Rarity;
  weight?: number;
  x?: number;
  y?: number;
  rotation?: 0 | 90 | 180 | 270;
}

interface GridCell {
  itemId: string | null;
  occupied: boolean;
}

interface HotbarSlot {
  itemId: string | null;
  slotIndex: number;
}

interface EquipmentSlot {
  id: string;
  name: string;
  icon: string;
  itemId: string | null;
  allowedTypes: ItemType[];
}

interface InventoryConfig {
  rows?: number;
  cols?: number;
  items?: InventoryItem[];
  grid?: GridCell[][];
  hotbarSlots?: HotbarSlot[];
  equipmentSlots?: EquipmentSlot[];
  maxWeight?: number;
  enableWeight?: boolean;
  testMode?: boolean;
}

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string; glow: string }> = {
  common: { bg: "bg-zinc-700", text: "text-zinc-200", border: "border-zinc-600", glow: "shadow-zinc-500/20" },
  uncommon: { bg: "bg-green-700", text: "text-green-100", border: "border-green-600", glow: "shadow-green-500/30" },
  rare: { bg: "bg-blue-700", text: "text-blue-100", border: "border-blue-600", glow: "shadow-blue-500/40" },
  epic: { bg: "bg-purple-700", text: "text-purple-100", border: "border-purple-600", glow: "shadow-purple-500/40" },
  legendary: { bg: "bg-amber-600", text: "text-amber-100", border: "border-amber-500", glow: "shadow-amber-500/50" },
};

const _ITEM_TYPE_ICONS: Record<ItemType, string> = {
  weapon: "⚔️",
  armor: "🛡️",
  consumable: "🍎",
  "key-item": "🔑",
  material: "⚙️",
  misc: "📦",
};

const DEFAULT_EQUIPMENT_SLOTS: EquipmentSlot[] = [
  { id: "head", name: "Head", icon: "🪖", itemId: null, allowedTypes: ["armor"] },
  { id: "chest", name: "Chest", icon: "🛡️", itemId: null, allowedTypes: ["armor"] },
  { id: "weapon", name: "Weapon", icon: "⚔️", itemId: null, allowedTypes: ["weapon"] },
  { id: "accessory", name: "Accessory", icon: "💍", itemId: null, allowedTypes: ["misc"] },
];

const PRESETS = {
  rpg: {
    name: "RPG Inventory",
    rows: 6,
    cols: 8,
    items: [
      { id: "1", name: "Iron Sword", description: "A sturdy iron blade", icon: "⚔️", width: 1, height: 3, stackSize: 1, maxStack: 1, type: "weapon" as ItemType, rarity: "common" as Rarity, weight: 5 },
      { id: "2", name: "Health Potion", description: "Restores 50 HP", icon: "🧪", width: 1, height: 1, stackSize: 5, maxStack: 10, type: "consumable" as ItemType, rarity: "common" as Rarity, weight: 0.5 },
      { id: "3", name: "Legendary Shield", description: "Ultimate protection", icon: "🛡️", width: 2, height: 2, stackSize: 1, maxStack: 1, type: "armor" as ItemType, rarity: "legendary" as Rarity, weight: 12 },
    ],
  },
  survival: {
    name: "Survival Game",
    rows: 5,
    cols: 10,
    items: [
      { id: "1", name: "Wood", description: "Basic crafting material", icon: "🪵", width: 1, height: 1, stackSize: 20, maxStack: 99, type: "material" as ItemType, rarity: "common" as Rarity, weight: 1 },
      { id: "2", name: "Pickaxe", description: "Mine resources faster", icon: "⛏️", width: 2, height: 1, stackSize: 1, maxStack: 1, type: "weapon" as ItemType, rarity: "uncommon" as Rarity, weight: 3 },
      { id: "3", name: "Food", description: "Restores hunger", icon: "🍖", width: 1, height: 1, stackSize: 3, maxStack: 10, type: "consumable" as ItemType, rarity: "common" as Rarity, weight: 0.2 },
    ],
  },
  puzzle: {
    name: "Puzzle Game",
    rows: 4,
    cols: 6,
    items: [
      { id: "1", name: "Red Key", description: "Opens red doors", icon: "🔑", width: 1, height: 1, stackSize: 1, maxStack: 1, type: "key-item" as ItemType, rarity: "rare" as Rarity },
      { id: "2", name: "Blue Gem", description: "Activates mechanisms", icon: "💎", width: 1, height: 1, stackSize: 1, maxStack: 5, type: "key-item" as ItemType, rarity: "epic" as Rarity },
      { id: "3", name: "Ancient Map", description: "Reveals secrets", icon: "🗺️", width: 2, height: 2, stackSize: 1, maxStack: 1, type: "key-item" as ItemType, rarity: "legendary" as Rarity },
    ],
  },
};

export function InventoryGridWidget({ widget }: InventoryGridWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const config = (widget.config || {}) as InventoryConfig;

  const [rows, setRows] = useState(config.rows || 6);
  const [cols, setCols] = useState(config.cols || 8);
  const [items, setItems] = useState<InventoryItem[]>(config.items || []);
  const [grid, setGrid] = useState<GridCell[][]>(() =>
    config.grid || Array(rows).fill(null).map(() => Array(cols).fill({ itemId: null, occupied: false }))
  );
  const [hotbarSlots, setHotbarSlots] = useState<HotbarSlot[]>(
    config.hotbarSlots || Array(5).fill(null).map((_, i) => ({ itemId: null, slotIndex: i }))
  );
  const [equipmentSlots, setEquipmentSlots] = useState<EquipmentSlot[]>(
    config.equipmentSlots || DEFAULT_EQUIPMENT_SLOTS
  );
  const [maxWeight, setMaxWeight] = useState(config.maxWeight || 100);
  const [enableWeight, setEnableWeight] = useState(config.enableWeight ?? false);
  const [testMode, setTestMode] = useState(config.testMode ?? false);

  const [_selectedItem, _setSelectedItem] = useState<InventoryItem | null>(null);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [sortBy, setSortBy] = useState<"type" | "rarity" | "size">("type");

  // Calculate current weight
  const currentWeight = useMemo(() => {
    if (!enableWeight) return 0;
    return items.reduce((total, item) => {
      if (item.x !== undefined && item.y !== undefined) {
        return total + (item.weight || 0) * item.stackSize;
      }
      return total;
    }, 0);
  }, [items, enableWeight]);

  // Calculate used slots
  const usedSlots = useMemo(() => {
    return grid.flat().filter(cell => cell.occupied).length;
  }, [grid]);

  const totalSlots = rows * cols;

  // Save config
  const saveConfig = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        rows,
        cols,
        items,
        grid,
        hotbarSlots,
        equipmentSlots,
        maxWeight,
        enableWeight,
        testMode,
      },
    });
  }, [widget.id, widget.config, rows, cols, items, grid, hotbarSlots, equipmentSlots, maxWeight, enableWeight, testMode]);

  // Auto-save on changes
   
  useEffect(() => {
    const timeout = setTimeout(saveConfig, 500);
    return () => clearTimeout(timeout);
  }, [rows, cols, items, grid, hotbarSlots, equipmentSlots, maxWeight, enableWeight, testMode]);

  // Initialize grid when dimensions change
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setGrid(Array(rows).fill(null).map(() =>
        Array(cols).fill(null).map(() => ({ itemId: null, occupied: false }))
      ));
    });
    return () => cancelAnimationFrame(frame);
  }, [rows, cols]);

  // Add new item
  const addItem = useCallback(() => {
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: `Item ${items.length + 1}`,
      description: "A new item",
      icon: "📦",
      width: 1,
      height: 1,
      stackSize: 1,
      maxStack: 10,
      type: "misc",
      rarity: "common",
      weight: 1,
      rotation: 0,
    };
    setItems([...items, newItem]);
    setEditingItem(newItem);
    setShowItemDialog(true);
  }, [items]);

  // Update item
  const updateItem = useCallback((itemId: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    ));
  }, []);

  // Delete item
  const deleteItem = useCallback((itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId));
    setGrid(prev => prev.map(row =>
      row.map(cell => cell.itemId === itemId ? { itemId: null, occupied: false } : cell)
    ));
  }, []);

  // Check if item can be placed
  const canPlaceItem = useCallback((item: InventoryItem, x: number, y: number): boolean => {
    const width = item.rotation === 90 || item.rotation === 270 ? item.height : item.width;
    const height = item.rotation === 90 || item.rotation === 270 ? item.width : item.height;

    if (x + width > cols || y + height > rows) return false;

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        const cell = grid[y + dy]?.[x + dx];
        if (cell?.occupied && cell.itemId !== item.id) return false;
      }
    }
    return true;
  }, [cols, rows, grid]);

  // Place item on grid
  const placeItem = useCallback((item: InventoryItem, x: number, y: number) => {
    if (!canPlaceItem(item, x, y)) return;

    const width = item.rotation === 90 || item.rotation === 270 ? item.height : item.width;
    const height = item.rotation === 90 || item.rotation === 270 ? item.width : item.height;

    // Clear old position
    setGrid(prev => prev.map(row =>
      row.map(cell => cell.itemId === item.id ? { itemId: null, occupied: false } : cell)
    ));

    // Set new position
    setGrid(prev => {
      const newGrid = prev.map(row => [...row]);
      for (let dy = 0; dy < height; dy++) {
        for (let dx = 0; dx < width; dx++) {
          if (newGrid[y + dy] && newGrid[y + dy][x + dx]) {
            newGrid[y + dy][x + dx] = { itemId: item.id, occupied: true };
          }
        }
      }
      return newGrid;
    });

    updateItem(item.id, { x, y });
  }, [canPlaceItem, updateItem]);

  // Rotate item
  const rotateItem = useCallback((itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newRotation = ((item.rotation || 0) + 90) % 360 as 0 | 90 | 180 | 270;

    // Clear from grid
    if (item.x !== undefined && item.y !== undefined) {
      setGrid(prev => prev.map(row =>
        row.map(cell => cell.itemId === itemId ? { itemId: null, occupied: false } : cell)
      ));
      updateItem(itemId, { rotation: newRotation, x: undefined, y: undefined });
    } else {
      updateItem(itemId, { rotation: newRotation });
    }
  }, [items, updateItem]);

  // Auto-sort inventory
  const autoSort = useCallback(() => {
    // Remove all items from grid
    setGrid(Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({ itemId: null, occupied: false }))
    ));

    // Sort items
    const sortedItems = [...items].sort((a, b) => {
      if (sortBy === "type") {
        return a.type.localeCompare(b.type);
      } else if (sortBy === "rarity") {
        const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
        return rarityOrder.indexOf(b.rarity) - rarityOrder.indexOf(a.rarity);
      } else {
        return (b.width * b.height) - (a.width * a.height);
      }
    });

    // Place items in grid
    const _currentX = 0;
    const _currentY = 0;

    sortedItems.forEach(item => {
      let placed = false;

      for (let y = 0; y < rows && !placed; y++) {
        for (let x = 0; x < cols && !placed; x++) {
          if (canPlaceItem(item, x, y)) {
            placeItem(item, x, y);
            placed = true;
          }
        }
      }
    });
  }, [items, rows, cols, sortBy, canPlaceItem, placeItem]);

  // Load preset
  const loadPreset = useCallback((presetKey: keyof typeof PRESETS) => {
    const preset = PRESETS[presetKey];
    setRows(preset.rows);
    setCols(preset.cols);
    setItems(preset.items);
    setGrid(Array(preset.rows).fill(null).map(() =>
      Array(preset.cols).fill(null).map(() => ({ itemId: null, occupied: false }))
    ));
  }, []);

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    const data = {
      rows,
      cols,
      items,
      maxWeight,
      enableWeight,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "inventory_layout.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [rows, cols, items, maxWeight, enableWeight]);

  // Export as JavaScript
  const exportAsJS = useCallback(() => {
    const code = `// Inventory Configuration
const inventoryConfig = {
  rows: ${rows},
  cols: ${cols},
  maxWeight: ${maxWeight},
  enableWeight: ${enableWeight},
  items: [
${items.map(item => `    {
      name: "${item.name}",
      description: "${item.description}",
      icon: "${item.icon}",
      width: ${item.width},
      height: ${item.height},
      stackSize: ${item.stackSize},
      maxStack: ${item.maxStack},
      type: "${item.type}",
      rarity: "${item.rarity}",
      weight: ${item.weight || 0},
    }`).join(',\n')}
  ]
};

export default inventoryConfig;`;

    navigator.clipboard.writeText(code);
  }, [rows, cols, items, maxWeight, enableWeight]);

  // Render item in grid
  const renderGridItem = useCallback((item: InventoryItem, x: number, y: number) => {
    const width = item.rotation === 90 || item.rotation === 270 ? item.height : item.width;
    const height = item.rotation === 90 || item.rotation === 270 ? item.width : item.height;
    const colors = RARITY_COLORS[item.rarity];

    return (
      <TooltipProvider key={`${item.id}-${x}-${y}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              layout
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              drag={!testMode}
              dragMomentum={false}
              onDragStart={() => setDraggedItem(item)}
              onDragEnd={(_e, _info) => {
                setDraggedItem(null);
                if (hoveredCell) {
                  placeItem(item, hoveredCell.x, hoveredCell.y);
                }
              }}
              className={cn(
                "absolute cursor-move rounded border-2 p-1 flex flex-col items-center justify-center gap-0.5 shadow-lg",
                colors.bg,
                colors.border,
                colors.glow,
                item.rotation === 90 || item.rotation === 270 ? "rotate-90" : ""
              )}
              style={{
                left: `${x * (100 / cols)}%`,
                top: `${y * (100 / rows)}%`,
                width: `${width * (100 / cols)}%`,
                height: `${height * (100 / rows)}%`,
              }}
            >
              <span className="text-lg @xs:text-xl @sm:text-2xl">{item.icon}</span>
              <span className="text-[8px] @xs:text-[9px] @sm:text-[10px] font-medium text-center line-clamp-1 px-0.5">
                {item.name}
              </span>
              {item.stackSize > 1 && (
                <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[8px] font-bold">
                  {item.stackSize}
                </Badge>
              )}
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-bold">{item.name}</div>
                  <Badge variant="outline" className={cn("text-[10px]", colors.text)}>
                    {item.rarity}
                  </Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{item.description}</p>
              <div className="text-xs space-y-0.5 pt-1 border-t">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span>{item.width}x{item.height}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Stack:</span>
                  <span>{item.stackSize}/{item.maxStack}</span>
                </div>
                {enableWeight && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Weight:</span>
                    <span>{item.weight} kg</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="capitalize">{item.type.replace("-", " ")}</span>
                </div>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }, [cols, rows, testMode, hoveredCell, placeItem, enableWeight]);

  const placedItems = useMemo(() => {
    return items.filter(item => item.x !== undefined && item.y !== undefined);
  }, [items]);

  const unplacedItems = useMemo(() => {
    return items.filter(item => item.x === undefined || item.y === undefined);
  }, [items]);

  return (
    <div className="h-full w-full @container flex flex-col gap-3 p-3 @xs:p-4">
      <Tabs defaultValue="grid" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grid">Grid</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="flex-1 flex flex-col gap-3 mt-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Grid3x3 className="w-4 h-4 text-purple-400" />
              <div className="text-xs space-x-2">
                <Badge variant="outline">{usedSlots}/{totalSlots} slots</Badge>
                {enableWeight && (
                  <Badge variant={currentWeight > maxWeight ? "destructive" : "outline"}>
                    {currentWeight.toFixed(1)}/{maxWeight} kg
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTestMode(!testMode)}
                className={cn("h-7 px-2 text-xs", testMode && "bg-blue-500/20 text-blue-400")}
              >
                <Play className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={autoSort}
                className="h-7 px-2 text-xs"
              >
                <ArrowDownUp className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Inventory Grid */}
          <div className="flex-1 flex flex-col @lg:flex-row gap-3 min-h-0">
            <div className="flex-1 flex flex-col gap-2">
              <div
                className="relative bg-zinc-900/50 rounded-lg border-2 border-zinc-800 overflow-hidden"
                style={{ aspectRatio: `${cols}/${rows}` }}
              >
                {/* Grid cells */}
                <div className="absolute inset-0 grid" style={{
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}>
                  {Array.from({ length: rows * cols }).map((_, idx) => {
                    const x = idx % cols;
                    const y = Math.floor(idx / cols);
                    const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
                    const canPlace = draggedItem ? canPlaceItem(draggedItem, x, y) : false;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "border border-zinc-800/50 transition-colors",
                          isHovered && draggedItem && (canPlace ? "bg-green-500/20" : "bg-red-500/20")
                        )}
                        onMouseEnter={() => setHoveredCell({ x, y })}
                        onMouseLeave={() => setHoveredCell(null)}
                      />
                    );
                  })}
                </div>

                {/* Placed items */}
                <div className="absolute inset-0">
                  <AnimatePresence>
                    {placedItems.map(item =>
                      item.x !== undefined && item.y !== undefined && renderGridItem(item, item.x, item.y)
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Hotbar */}
              <div className="flex gap-2 justify-center">
                {hotbarSlots.map((slot, idx) => {
                  const item = items.find(i => i.id === slot.itemId);
                  return (
                    <div
                      key={idx}
                      className="w-12 h-12 @sm:w-14 @sm:h-14 rounded border-2 border-zinc-700 bg-zinc-900/70 flex items-center justify-center relative"
                    >
                      {item && (
                        <>
                          <span className="text-xl @sm:text-2xl">{item.icon}</span>
                          <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[8px]">
                            {idx + 1}
                          </Badge>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equipment slots */}
            <div className="w-full @lg:w-32 flex @lg:flex-col gap-2">
              {equipmentSlots.map(slot => {
                const item = items.find(i => i.id === slot.itemId);
                return (
                  <div
                    key={slot.id}
                    className="flex-1 @lg:flex-none h-16 @lg:h-20 rounded border-2 border-zinc-700 bg-zinc-900/70 p-2 flex flex-col items-center justify-center gap-1"
                  >
                    <span className="text-xs text-zinc-500 font-medium">{slot.name}</span>
                    {item ? (
                      <span className="text-2xl">{item.icon}</span>
                    ) : (
                      <span className="text-2xl opacity-30">{slot.icon}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Unplaced Items */}
          {unplacedItems.length > 0 && (
            <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <h4 className="text-xs font-semibold text-zinc-400 mb-2">Unplaced Items</h4>
              <div className="flex flex-wrap gap-2">
                {unplacedItems.map(item => (
                  <TooltipProvider key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div
                          drag
                          dragMomentum={false}
                          onDragStart={() => setDraggedItem(item)}
                          onDragEnd={() => {
                            setDraggedItem(null);
                            if (hoveredCell) {
                              placeItem(item, hoveredCell.x, hoveredCell.y);
                            }
                          }}
                          className={cn(
                            "w-12 h-12 rounded border-2 cursor-move flex items-center justify-center relative",
                            RARITY_COLORS[item.rarity].bg,
                            RARITY_COLORS[item.rarity].border
                          )}
                        >
                          <span className="text-2xl">{item.icon}</span>
                          {item.stackSize > 1 && (
                            <Badge variant="secondary" className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[8px]">
                              {item.stackSize}
                            </Badge>
                          )}
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-xs">
                          <div className="font-bold">{item.name}</div>
                          <div className="text-muted-foreground">{item.width}x{item.height}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="items" className="flex-1 mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-3 pr-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Items ({items.length})</h4>
                <Button onClick={addItem} size="sm" className="h-8 gap-2">
                  <Plus className="w-3 h-3" />
                  Add Item
                </Button>
              </div>

              <AnimatePresence mode="popLayout">
                {items.map(item => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-3xl">{item.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{item.name}</div>
                          <Badge variant="outline" className={cn("text-[10px]", RARITY_COLORS[item.rarity].text)}>
                            {item.rarity}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rotateItem(item.id)}
                          className="h-7 w-7 p-0"
                        >
                          <RotateCw className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setShowItemDialog(true);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <Settings className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-zinc-400">Size: {item.width}x{item.height}</div>
                      <div className="text-zinc-400">Stack: {item.stackSize}/{item.maxStack}</div>
                      <div className="text-zinc-400 capitalize">{item.type}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="settings" className="flex-1 mt-3">
          <ScrollArea className="h-full">
            <div className="space-y-4 pr-3">
              <div className="space-y-2">
                <Label>Grid Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rows: {rows}</Label>
                    <Slider
                      value={[rows]}
                      onValueChange={([value]) => setRows(value)}
                      min={3}
                      max={12}
                      step={1}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Columns: {cols}</Label>
                    <Slider
                      value={[cols]}
                      onValueChange={([value]) => setCols(value)}
                      min={3}
                      max={15}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Weight System</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={enableWeight ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEnableWeight(!enableWeight)}
                    className="flex-1"
                  >
                    {enableWeight ? "Enabled" : "Disabled"}
                  </Button>
                  {enableWeight && (
                    <Input
                      type="number"
                      value={maxWeight}
                      onChange={(e) => setMaxWeight(Number(e.target.value))}
                      className="flex-1"
                      placeholder="Max weight"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select value={sortBy} onValueChange={(v: "type" | "rarity" | "size") => setSortBy(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="type">Type</SelectItem>
                    <SelectItem value="rarity">Rarity</SelectItem>
                    <SelectItem value="size">Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Load Preset</Label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => loadPreset(key as keyof typeof PRESETS)}
                      className="text-xs"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Export</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsJSON}
                    className="flex-1 gap-2"
                  >
                    <Download className="w-3 h-3" />
                    JSON
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportAsJS}
                    className="flex-1 gap-2"
                  >
                    <Copy className="w-3 h-3" />
                    JavaScript
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Item Editor Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? "Edit Item" : "New Item"}</DialogTitle>
            <DialogDescription>Configure item properties</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingItem.description}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <Input
                  value={editingItem.icon}
                  onChange={(e) => setEditingItem({ ...editingItem, icon: e.target.value })}
                  maxLength={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Width</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={editingItem.width}
                    onChange={(e) => setEditingItem({ ...editingItem, width: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Height</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={editingItem.height}
                    onChange={(e) => setEditingItem({ ...editingItem, height: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stack Size</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.stackSize}
                    onChange={(e) => setEditingItem({ ...editingItem, stackSize: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Stack</Label>
                  <Input
                    type="number"
                    min={1}
                    value={editingItem.maxStack}
                    onChange={(e) => setEditingItem({ ...editingItem, maxStack: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={editingItem.type}
                  onValueChange={(value: ItemType) => setEditingItem({ ...editingItem, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weapon">Weapon</SelectItem>
                    <SelectItem value="armor">Armor</SelectItem>
                    <SelectItem value="consumable">Consumable</SelectItem>
                    <SelectItem value="key-item">Key Item</SelectItem>
                    <SelectItem value="material">Material</SelectItem>
                    <SelectItem value="misc">Miscellaneous</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rarity</Label>
                <Select
                  value={editingItem.rarity}
                  onValueChange={(value: Rarity) => setEditingItem({ ...editingItem, rarity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="uncommon">Uncommon</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {enableWeight && (
                <div className="space-y-2">
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={editingItem.weight || 0}
                    onChange={(e) => setEditingItem({ ...editingItem, weight: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowItemDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    updateItem(editingItem.id, editingItem);
                    setShowItemDialog(false);
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
