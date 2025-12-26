"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { motion, AnimatePresence } from "motion/react";
import {
  Gift,
  Dices,
  Plus,
  Trash2,
  Download,
  Copy,
  BarChart3,
  Sparkles,
  Calculator,
  PieChart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LootTableWidgetProps {
  widget: Widget;
}

type Rarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

interface LootItem {
  id: string;
  name: string;
  rarity: Rarity;
  weight: number;
  probability?: number;
}

interface LootTable {
  id: string;
  name: string;
  items: LootItem[];
  guaranteedDrops?: {
    enabled: boolean;
    pityCounter: number;
    targetRarity: Rarity;
  };
}

interface SimulationResult {
  itemId: string;
  itemName: string;
  rarity: Rarity;
  count: number;
}

const RARITY_COLORS: Record<Rarity, { bg: string; text: string; border: string }> = {
  Common: { bg: "bg-zinc-700", text: "text-zinc-200", border: "border-zinc-600" },
  Uncommon: { bg: "bg-green-700", text: "text-green-100", border: "border-green-600" },
  Rare: { bg: "bg-blue-700", text: "text-blue-100", border: "border-blue-600" },
  Epic: { bg: "bg-purple-700", text: "text-purple-100", border: "border-purple-600" },
  Legendary: { bg: "bg-amber-600", text: "text-amber-100", border: "border-amber-500" },
};

const RARITY_ORDER: Rarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

interface LootTableConfig {
  lootTables?: LootTable[];
  activeTableId?: string;
}

export function LootTableWidget({ widget }: LootTableWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const config = (widget.config || {}) as LootTableConfig;

  // Load tables from config
  const [tables, setTables] = useState<LootTable[]>([]);
  const [activeTableId, setActiveTableId] = useState<string | null>(null);
  const [simulationRolls, setSimulationRolls] = useState(100);
  const [simulationResults, setSimulationResults] = useState<SimulationResult[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [showPieChart, _setShowPieChart] = useState(true);

  // Initialize from config
  useEffect(() => {
    if (config.lootTables) {
      setTables(config.lootTables);
      if (config.activeTableId) {
        setActiveTableId(config.activeTableId);
      } else if (config.lootTables.length > 0) {
        setActiveTableId(config.lootTables[0].id);
      }
    } else {
      // Create default table
      const defaultTable: LootTable = {
        id: Date.now().toString(),
        name: "Default Loot Table",
        items: [
          { id: "1", name: "Health Potion", rarity: "Common", weight: 50 },
          { id: "2", name: "Magic Scroll", rarity: "Uncommon", weight: 30 },
          { id: "3", name: "Rare Gem", rarity: "Rare", weight: 15 },
          { id: "4", name: "Epic Sword", rarity: "Epic", weight: 4 },
          { id: "5", name: "Legendary Armor", rarity: "Legendary", weight: 1 },
        ],
        guaranteedDrops: { enabled: false, pityCounter: 50, targetRarity: "Epic" },
      };
      setTables([defaultTable]);
      setActiveTableId(defaultTable.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save to config
  const saveConfig = useCallback((newTables: LootTable[], newActiveId?: string) => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        lootTables: newTables,
        activeTableId: newActiveId || activeTableId || undefined,
      },
    });
  }, [widget.id, widget.config, activeTableId]);

  const activeTable = useMemo(() =>
    tables.find(t => t.id === activeTableId),
    [tables, activeTableId]
  );

  // Calculate probabilities
  const calculateProbabilities = useCallback((items: LootItem[]): LootItem[] => {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    return items.map(item => ({
      ...item,
      probability: totalWeight > 0 ? (item.weight / totalWeight) * 100 : 0,
    }));
  }, []);

  const itemsWithProbability = useMemo(() =>
    activeTable ? calculateProbabilities(activeTable.items) : [],
    [activeTable, calculateProbabilities]
  );

  // Add new table
  const addTable = useCallback(() => {
    const newTable: LootTable = {
      id: Date.now().toString(),
      name: `Loot Table ${tables.length + 1}`,
      items: [],
      guaranteedDrops: { enabled: false, pityCounter: 50, targetRarity: "Epic" },
    };
    const newTables = [...tables, newTable];
    setTables(newTables);
    setActiveTableId(newTable.id);
    saveConfig(newTables, newTable.id);
  }, [tables, saveConfig]);

  // Add item to active table
  const addItem = useCallback(() => {
    if (!activeTable) return;

    const newItem: LootItem = {
      id: Date.now().toString(),
      name: `Item ${activeTable.items.length + 1}`,
      rarity: "Common",
      weight: 10,
    };

    const updatedTables = tables.map(t =>
      t.id === activeTableId
        ? { ...t, items: [...t.items, newItem] }
        : t
    );

    setTables(updatedTables);
    saveConfig(updatedTables);
  }, [activeTable, tables, activeTableId, saveConfig]);

  // Update item
  const updateItem = useCallback((itemId: string, updates: Partial<LootItem>) => {
    const updatedTables = tables.map(t =>
      t.id === activeTableId
        ? {
            ...t,
            items: t.items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }
        : t
    );
    setTables(updatedTables);
    saveConfig(updatedTables);
  }, [tables, activeTableId, saveConfig]);

  // Remove item
  const removeItem = useCallback((itemId: string) => {
    const updatedTables = tables.map(t =>
      t.id === activeTableId
        ? { ...t, items: t.items.filter(item => item.id !== itemId) }
        : t
    );
    setTables(updatedTables);
    saveConfig(updatedTables);
  }, [tables, activeTableId, saveConfig]);

  // Simulate drops
  const simulateDrops = useCallback(() => {
    if (!activeTable || activeTable.items.length === 0) return;

    const results: Record<string, SimulationResult> = {};
    const totalWeight = activeTable.items.reduce((sum, item) => sum + item.weight, 0);

    for (let i = 0; i < simulationRolls; i++) {
      const roll = Math.random() * totalWeight;
      let cumulativeWeight = 0;

      for (const item of activeTable.items) {
        cumulativeWeight += item.weight;
        if (roll <= cumulativeWeight) {
          if (!results[item.id]) {
            results[item.id] = {
              itemId: item.id,
              itemName: item.name,
              rarity: item.rarity,
              count: 0,
            };
          }
          results[item.id].count++;
          break;
        }
      }
    }

    setSimulationResults(Object.values(results).sort((a, b) => b.count - a.count));
  }, [activeTable, simulationRolls]);

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    if (!activeTable) return;

    const dataStr = JSON.stringify(activeTable, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeTable.name.replace(/\s+/g, "_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTable]);

  // Copy as code
  const copyAsCode = useCallback(() => {
    if (!activeTable) return;

    const code = `const lootTable = ${JSON.stringify(
      {
        name: activeTable.name,
        items: activeTable.items.map(({ id: _id, ...item }) => item),
      },
      null,
      2
    )};`;

    navigator.clipboard.writeText(code);
  }, [activeTable]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!activeTable || activeTable.items.length === 0) {
      return { expectedValue: 0, variance: 0, avgDropsPerRarity: {} as Record<Rarity, number> };
    }

    const itemsWithProb = calculateProbabilities(activeTable.items);

    // Group by rarity for expected drops
    const avgDropsPerRarity: Record<Rarity, number> = {} as Record<Rarity, number>;
    RARITY_ORDER.forEach(rarity => {
      const rarityProb = itemsWithProb
        .filter(item => item.rarity === rarity)
        .reduce((sum, item) => sum + (item.probability || 0), 0);
      avgDropsPerRarity[rarity] = rarityProb;
    });

    return {
      expectedValue: itemsWithProb.length,
      variance: 0,
      avgDropsPerRarity,
    };
  }, [activeTable, calculateProbabilities]);

  if (!activeTable) {
    return (
      <div className="h-full w-full flex items-center justify-center p-4">
        <Button onClick={addTable} className="gap-2">
          <Plus className="w-4 h-4" />
          Create First Loot Table
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full @container flex flex-col gap-3 p-3 @xs:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 @xs:w-5 @xs:h-5 text-purple-400" />
          <Select
            value={activeTableId || ""}
            onValueChange={(value) => {
              setActiveTableId(value);
              saveConfig(tables, value);
            }}
          >
            <SelectTrigger className="h-8 @xs:h-9 w-[150px] @sm:w-[200px] text-xs @xs:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tables.map((table) => (
                <SelectItem key={table.id} value={table.id}>
                  {table.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1 @xs:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStats(!showStats)}
            className="h-7 @xs:h-8 px-2 text-xs"
          >
            <BarChart3 className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addTable}
            className="h-7 @xs:h-8 px-2 text-xs"
          >
            <Plus className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-3 pr-3">
          {/* Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs @xs:text-sm font-semibold text-zinc-300">
                Items ({activeTable.items.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={addItem}
                className="h-7 @xs:h-8 px-2 @xs:px-3 text-xs gap-1"
              >
                <Plus className="w-3 h-3" />
                Add Item
              </Button>
            </div>

            <AnimatePresence mode="popLayout">
              {itemsWithProbability.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={cn(
                    "p-2 @xs:p-3 rounded-lg border space-y-2",
                    "bg-zinc-900/50 border-zinc-800"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-2">
                      {/* Name */}
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        className="h-7 @xs:h-8 text-xs @xs:text-sm bg-zinc-800/50 border-zinc-700"
                        placeholder="Item name"
                      />

                      {/* Rarity and Weight */}
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={item.rarity}
                          onValueChange={(value: Rarity) =>
                            updateItem(item.id, { rarity: value })
                          }
                        >
                          <SelectTrigger className="h-7 @xs:h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RARITY_ORDER.map((rarity) => (
                              <SelectItem key={rarity} value={rarity}>
                                <span className={cn("font-medium", RARITY_COLORS[rarity].text)}>
                                  {rarity}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            value={item.weight}
                            onChange={(e) =>
                              updateItem(item.id, { weight: Math.max(0, Number(e.target.value)) })
                            }
                            className="h-7 @xs:h-8 text-xs @xs:text-sm bg-zinc-800/50 border-zinc-700"
                            placeholder="Weight"
                          />
                        </div>
                      </div>

                      {/* Probability Display */}
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-400">Probability:</span>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.probability || 0}%` }}
                              className={cn(
                                "h-full rounded-full",
                                `bg-gradient-to-r ${RARITY_COLORS[item.rarity].bg.replace('bg-', 'from-')} ${RARITY_COLORS[item.rarity].bg.replace('bg-', 'to-')}`
                              )}
                            />
                          </div>
                          <span className="font-mono text-zinc-300 min-w-[60px] text-right">
                            {(item.probability || 0).toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(item.id)}
                      className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400 hover:bg-red-950/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {activeTable.items.length === 0 && (
              <div className="text-center py-8 text-zinc-500 text-xs @xs:text-sm">
                No items yet. Add your first loot item!
              </div>
            )}
          </div>

          {/* Pie Chart Visualization */}
          {showPieChart && activeTable.items.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3 @xs:p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2"
            >
              <div className="flex items-center gap-2">
                <PieChart className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs @xs:text-sm font-semibold text-zinc-300">
                  Drop Distribution
                </h4>
              </div>

              <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2">
                {RARITY_ORDER.map((rarity) => {
                  const prob = statistics.avgDropsPerRarity[rarity] || 0;
                  if (prob === 0) return null;

                  return (
                    <div key={rarity} className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-sm",
                        RARITY_COLORS[rarity].bg
                      )} />
                      <span className="text-xs text-zinc-400 flex-1">{rarity}</span>
                      <span className="text-xs font-mono text-zinc-300">
                        {prob.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Simulation */}
          <div className="p-3 @xs:p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-3">
            <div className="flex items-center gap-2">
              <Dices className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs @xs:text-sm font-semibold text-zinc-300">
                Simulate Drops
              </h4>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-400 min-w-[60px]">
                  Rolls: {simulationRolls}
                </label>
                <Slider
                  value={[simulationRolls]}
                  onValueChange={([value]) => setSimulationRolls(value)}
                  min={10}
                  max={10000}
                  step={10}
                  className="flex-1"
                />
              </div>

              <Button
                onClick={simulateDrops}
                disabled={activeTable.items.length === 0}
                className="w-full h-8 @xs:h-9 text-xs @xs:text-sm gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Sparkles className="w-3 h-3 @xs:w-4 @xs:h-4" />
                Run Simulation
              </Button>
            </div>

            {/* Simulation Results */}
            {simulationResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <h5 className="text-xs font-medium text-zinc-400">Results:</h5>
                {simulationResults.map((result) => (
                  <div
                    key={result.itemId}
                    className="flex items-center justify-between p-2 rounded bg-zinc-800/50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        RARITY_COLORS[result.rarity].bg
                      )} />
                      <span className="text-zinc-300">{result.itemName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-400">{result.count}x</span>
                      <span className="font-mono text-zinc-300">
                        ({((result.count / simulationRolls) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </div>

          {/* Statistics */}
          <AnimatePresence>
            {showStats && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3 @xs:p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-green-400" />
                  <h4 className="text-xs @xs:text-sm font-semibold text-zinc-300">
                    Statistical Analysis
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="text-zinc-400">Total Items</div>
                    <div className="text-lg font-bold text-zinc-100">
                      {activeTable.items.length}
                    </div>
                  </div>
                  <div className="p-2 bg-zinc-800/50 rounded">
                    <div className="text-zinc-400">Total Weight</div>
                    <div className="text-lg font-bold text-zinc-100">
                      {activeTable.items.reduce((sum, item) => sum + item.weight, 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h5 className="text-xs font-medium text-zinc-400">Expected drops per 100 rolls:</h5>
                  {RARITY_ORDER.map((rarity) => {
                    const prob = statistics.avgDropsPerRarity[rarity] || 0;
                    if (prob === 0) return null;

                    return (
                      <div key={rarity} className="flex items-center justify-between text-xs">
                        <span className={RARITY_COLORS[rarity].text}>{rarity}</span>
                        <span className="font-mono text-zinc-300">
                          ~{(prob).toFixed(1)} drops
                        </span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Export Options */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsJSON}
              className="flex-1 h-8 text-xs gap-2"
            >
              <Download className="w-3 h-3" />
              Export JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAsCode}
              className="flex-1 h-8 text-xs gap-2"
            >
              <Copy className="w-3 h-3" />
              Copy Code
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
