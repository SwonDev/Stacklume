"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "motion/react";
import {
  TrendingUp,
  Star,
  Award,
  Download,
  LineChart,
  Sparkles,
  Clock,
  Target,
  Code2,
  Table,
  FileJson,
  Activity,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelProgressWidgetProps {
  widget: Widget;
}

// Curve type definitions
type CurveType = "linear" | "quadratic" | "exponential" | "logarithmic" | "custom";

interface CurveConfig {
  type: CurveType;
  baseXP: number;
  scalingFactor: number;
  maxLevel: number;
  customPoints?: Array<{ level: number; xp: number }>;
}

interface StatGain {
  id: string;
  name: string;
  baseValue: number;
  perLevel: number;
  scalingType: "linear" | "exponential";
  scalingFactor: number;
}

interface LevelMilestone {
  level: number;
  name: string;
  reward?: string;
}

interface PrestigeConfig {
  enabled: boolean;
  bonusPerPrestige: number;
  maxPrestiges: number;
  currentPrestige: number;
}

// Curve presets
const CURVE_PRESETS: Record<string, Partial<CurveConfig>> = {
  linear: {
    type: "linear",
    baseXP: 100,
    scalingFactor: 1.0,
    maxLevel: 100,
  },
  gentle: {
    type: "quadratic",
    baseXP: 100,
    scalingFactor: 1.2,
    maxLevel: 100,
  },
  moderate: {
    type: "exponential",
    baseXP: 100,
    scalingFactor: 1.15,
    maxLevel: 100,
  },
  steep: {
    type: "exponential",
    baseXP: 100,
    scalingFactor: 1.5,
    maxLevel: 100,
  },
  logarithmic: {
    type: "logarithmic",
    baseXP: 1000,
    scalingFactor: 2.0,
    maxLevel: 100,
  },
};

export function LevelProgressWidget({ widget }: LevelProgressWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load config from widget
  const loadedConfig = useMemo(() => {
    return widget.config?.levelProgressConfig as unknown as CurveConfig | undefined;
  }, [widget.config]);

  // State
  const [curveConfig, setCurveConfig] = useState<CurveConfig>(
    loadedConfig || {
      type: "exponential",
      baseXP: 100,
      scalingFactor: 1.5,
      maxLevel: 100,
      customPoints: [],
    }
  );

  const [statGains, setStatGains] = useState<StatGain[]>(
    (widget.config?.statGains as unknown as StatGain[]) || [
      { id: "1", name: "HP", baseValue: 100, perLevel: 10, scalingType: "linear", scalingFactor: 1.0 },
      { id: "2", name: "ATK", baseValue: 10, perLevel: 2, scalingType: "linear", scalingFactor: 1.0 },
      { id: "3", name: "DEF", baseValue: 5, perLevel: 1, scalingType: "linear", scalingFactor: 1.0 },
    ]
  );

  const [milestones, setMilestones] = useState<LevelMilestone[]>(
    (widget.config?.levelMilestones as unknown as LevelMilestone[]) || [
      { level: 10, name: "Apprentice", reward: "Skill Unlock" },
      { level: 25, name: "Expert", reward: "Rare Item" },
      { level: 50, name: "Master", reward: "Epic Weapon" },
      { level: 100, name: "Legend", reward: "Legendary Title" },
    ]
  );

  const [prestigeConfig, setPrestigeConfig] = useState<PrestigeConfig>(
    (widget.config?.prestigeConfig as PrestigeConfig) || {
      enabled: false,
      bonusPerPrestige: 10,
      maxPrestiges: 10,
      currentPrestige: 0,
    }
  );

  const [previewXP, setPreviewXP] = useState("");
  const [xpPerHour, setXpPerHour] = useState(1000);
  const [selectedPreset, setSelectedPreset] = useState<string>("moderate");
  const [compareConfigs, setCompareConfigs] = useState<CurveConfig[]>([]);
  const [_isDraggingPoint, _setIsDraggingPoint] = useState(false);

  // Save config to widget
  const saveConfig = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        levelProgressConfig: curveConfig,
        statGains,
        levelMilestones: milestones,
        prestigeConfig,
      },
    });
  }, [widget.id, widget.config, curveConfig, statGains, milestones, prestigeConfig]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    const timeout = setTimeout(saveConfig, 500);
    return () => clearTimeout(timeout);
  }, [curveConfig, statGains, milestones, prestigeConfig, saveConfig]);

  // Calculate XP for a specific level
  const calculateXPForLevel = useCallback(
    (level: number, config: CurveConfig = curveConfig): number => {
      const { type, baseXP, scalingFactor, customPoints } = config;

      // Apply prestige bonus
      const prestigeMultiplier = prestigeConfig.enabled
        ? 1 + (prestigeConfig.currentPrestige * prestigeConfig.bonusPerPrestige) / 100
        : 1;

      let xp = 0;

      switch (type) {
        case "linear":
          xp = baseXP * level;
          break;
        case "quadratic":
          xp = baseXP * Math.pow(level, scalingFactor);
          break;
        case "exponential":
          xp = baseXP * Math.pow(scalingFactor, level - 1);
          break;
        case "logarithmic":
          xp = baseXP * Math.log(level * scalingFactor + 1);
          break;
        case "custom":
          if (customPoints && customPoints.length > 0) {
            // Interpolate between custom points
            const sortedPoints = [...customPoints].sort((a, b) => a.level - b.level);
            const beforePoint = sortedPoints.filter((p) => p.level <= level).pop();
            const afterPoint = sortedPoints.find((p) => p.level > level);

            if (!beforePoint) {
              xp = sortedPoints[0]?.xp || baseXP;
            } else if (!afterPoint) {
              xp = beforePoint.xp;
            } else {
              const ratio = (level - beforePoint.level) / (afterPoint.level - beforePoint.level);
              xp = beforePoint.xp + (afterPoint.xp - beforePoint.xp) * ratio;
            }
          } else {
            xp = baseXP * level;
          }
          break;
      }

      return Math.round(xp * prestigeMultiplier);
    },
    [curveConfig, prestigeConfig]
  );

  // Calculate total XP to reach a level
  const calculateTotalXP = useCallback(
    (targetLevel: number): number => {
      let total = 0;
      for (let i = 2; i <= targetLevel; i++) {
        total += calculateXPForLevel(i);
      }
      return total;
    },
    [calculateXPForLevel]
  );

  // Get level from XP
  const getLevelFromXP = useCallback(
    (xp: number): { level: number; currentLevelXP: number; nextLevelXP: number; progress: number } => {
      let level = 1;
      let totalXP = 0;

      for (let i = 2; i <= curveConfig.maxLevel; i++) {
        const xpForLevel = calculateXPForLevel(i);
        if (totalXP + xpForLevel > xp) {
          level = i - 1;
          const currentLevelXP = totalXP;
          const nextLevelXP = totalXP + xpForLevel;
          const progress = ((xp - currentLevelXP) / xpForLevel) * 100;
          return { level, currentLevelXP, nextLevelXP, progress };
        }
        totalXP += xpForLevel;
      }

      return { level: curveConfig.maxLevel, currentLevelXP: totalXP, nextLevelXP: totalXP, progress: 100 };
    },
    [curveConfig.maxLevel, calculateXPForLevel]
  );

  // Calculate stat value at level
  const calculateStatAtLevel = useCallback((stat: StatGain, level: number): number => {
    if (stat.scalingType === "linear") {
      return Math.round(stat.baseValue + stat.perLevel * (level - 1));
    } else {
      // Exponential
      return Math.round(stat.baseValue * Math.pow(stat.scalingFactor, level - 1));
    }
  }, []);

  // XP table data
  const xpTable = useMemo(() => {
    const table: Array<{ level: number; xpRequired: number; totalXP: number; xpToNext: number }> = [];
    let totalXP = 0;

    for (let i = 1; i <= curveConfig.maxLevel; i++) {
      const xpForLevel = i === 1 ? 0 : calculateXPForLevel(i);
      totalXP += xpForLevel;
      const xpToNext = i < curveConfig.maxLevel ? calculateXPForLevel(i + 1) : 0;

      table.push({
        level: i,
        xpRequired: xpForLevel,
        totalXP,
        xpToNext,
      });
    }

    return table;
  }, [curveConfig.maxLevel, calculateXPForLevel]);

  // Total XP to max level
  const totalXPToMax = useMemo(() => {
    return calculateTotalXP(curveConfig.maxLevel);
  }, [curveConfig.maxLevel, calculateTotalXP]);

  // Preview level info
  const previewLevelInfo = useMemo(() => {
    const xp = parseInt(previewXP) || 0;
    return getLevelFromXP(xp);
  }, [previewXP, getLevelFromXP]);

  // Time to level estimation
  const timeToLevel = useCallback(
    (targetLevel: number): string => {
      const requiredXP = calculateTotalXP(targetLevel);
      const hours = requiredXP / xpPerHour;

      if (hours < 1) {
        return `${Math.round(hours * 60)} minutes`;
      } else if (hours < 24) {
        return `${hours.toFixed(1)} hours`;
      } else {
        return `${(hours / 24).toFixed(1)} days`;
      }
    },
    [calculateTotalXP, xpPerHour]
  );

  // Apply preset
  const applyPreset = useCallback((presetName: string) => {
    setSelectedPreset(presetName);
    const preset = CURVE_PRESETS[presetName];
    if (preset) {
      setCurveConfig((prev) => ({ ...prev, ...preset }));
    }
  }, []);

  // Export functions
  const exportAsJSON = useCallback(() => {
    const data = {
      config: curveConfig,
      xpTable: xpTable.slice(0, 20), // First 20 levels
      totalXPToMax,
      statGains,
      milestones,
      prestigeConfig,
    };
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
  }, [curveConfig, xpTable, totalXPToMax, statGains, milestones, prestigeConfig]);

  const exportAsJavaScript = useCallback(() => {
    const code = `// XP Calculation Function
function calculateXPForLevel(level, baseXP = ${curveConfig.baseXP}, scalingFactor = ${curveConfig.scalingFactor}) {
  const type = "${curveConfig.type}";
  let xp = 0;

  switch (type) {
    case "linear":
      xp = baseXP * level;
      break;
    case "quadratic":
      xp = baseXP * Math.pow(level, scalingFactor);
      break;
    case "exponential":
      xp = baseXP * Math.pow(scalingFactor, level - 1);
      break;
    case "logarithmic":
      xp = baseXP * Math.log(level * scalingFactor + 1);
      break;
  }

  return Math.round(xp);
}

// Get level from total XP
function getLevelFromXP(totalXP, maxLevel = ${curveConfig.maxLevel}) {
  let level = 1;
  let accumulated = 0;

  for (let i = 2; i <= maxLevel; i++) {
    const xpForLevel = calculateXPForLevel(i);
    if (accumulated + xpForLevel > totalXP) {
      return i - 1;
    }
    accumulated += xpForLevel;
  }

  return maxLevel;
}

// Example usage:
const xpForLevel10 = calculateXPForLevel(10);
console.log(\`XP for level 10: \${xpForLevel10}\`);

const currentLevel = getLevelFromXP(5000);
console.log(\`Level at 5000 XP: \${currentLevel}\`);
`;

    navigator.clipboard.writeText(code);
  }, [curveConfig]);

  const exportAsCSV = useCallback(() => {
    const headers = ["Level", "XP Required", "Total XP", "XP to Next"];
    const rows = xpTable.map((row) => [row.level, row.xpRequired, row.totalXP, row.xpToNext].join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    navigator.clipboard.writeText(csv);
  }, [xpTable]);

  // Add to comparison
  const addToComparison = useCallback(() => {
    if (compareConfigs.length < 3) {
      setCompareConfigs((prev) => [...prev, { ...curveConfig }]);
    }
  }, [curveConfig, compareConfigs]);

  return (
    <div className="h-full w-full @container">
      <ScrollArea className="h-full w-full">
        <div className="p-3 @xs:p-4 space-y-3 @xs:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-lg">Level Progression Designer</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={saveConfig}>
              Save
            </Button>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="curve" className="w-full">
            <TabsList className="grid grid-cols-4 @lg:grid-cols-6 w-full">
              <TabsTrigger value="curve" className="text-xs @xs:text-sm">
                <LineChart className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Curve
              </TabsTrigger>
              <TabsTrigger value="preview" className="text-xs @xs:text-sm">
                <Target className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="table" className="text-xs @xs:text-sm">
                <Table className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Table
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs @xs:text-sm">
                <Activity className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="milestones" className="text-xs @xs:text-sm hidden @lg:block">
                <Award className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs @xs:text-sm hidden @lg:block">
                <Download className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Export
              </TabsTrigger>
            </TabsList>

            {/* Curve Editor Tab */}
            <TabsContent value="curve" className="space-y-4 mt-4">
              {/* Preset Selector */}
              <div className="space-y-2">
                <Label>Curve Preset</Label>
                <div className="grid grid-cols-2 @sm:grid-cols-3 gap-2">
                  {Object.keys(CURVE_PRESETS).map((preset) => (
                    <Button
                      key={preset}
                      variant={selectedPreset === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => applyPreset(preset)}
                      className="capitalize"
                    >
                      {preset}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Parameters */}
              <div className="grid grid-cols-1 @sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Curve Type</Label>
                  <Select
                    value={curveConfig.type}
                    onValueChange={(v: CurveType) => setCurveConfig((prev) => ({ ...prev, type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="quadratic">Quadratic</SelectItem>
                      <SelectItem value="exponential">Exponential</SelectItem>
                      <SelectItem value="logarithmic">Logarithmic</SelectItem>
                      <SelectItem value="custom">Custom Points</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Max Level</Label>
                  <Input
                    type="number"
                    value={curveConfig.maxLevel}
                    onChange={(e) =>
                      setCurveConfig((prev) => ({ ...prev, maxLevel: Math.min(999, Math.max(1, Number(e.target.value))) }))
                    }
                    min={1}
                    max={999}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Base XP (Level 1)</Label>
                  <Input
                    type="number"
                    value={curveConfig.baseXP}
                    onChange={(e) => setCurveConfig((prev) => ({ ...prev, baseXP: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scaling Factor: {curveConfig.scalingFactor.toFixed(2)}</Label>
                  <Slider
                    value={[curveConfig.scalingFactor]}
                    onValueChange={([v]) => setCurveConfig((prev) => ({ ...prev, scalingFactor: v }))}
                    min={1}
                    max={3}
                    step={0.05}
                  />
                </div>
              </div>

              {/* Visual Curve Graph */}
              <div className="space-y-2">
                <Label>XP Curve Visualization</Label>
                <div className="relative h-48 bg-secondary/20 rounded-lg border border-border p-4">
                  <svg className="w-full h-full" viewBox="0 0 400 160" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[...Array(5)].map((_, i) => (
                      <line
                        key={`h-${i}`}
                        x1="0"
                        y1={(160 / 4) * i}
                        x2="400"
                        y2={(160 / 4) * i}
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-muted-foreground/20"
                      />
                    ))}
                    {[...Array(9)].map((_, i) => (
                      <line
                        key={`v-${i}`}
                        x1={(400 / 8) * i}
                        y1="0"
                        x2={(400 / 8) * i}
                        y2="160"
                        stroke="currentColor"
                        strokeWidth="0.5"
                        className="text-muted-foreground/20"
                      />
                    ))}

                    {/* XP Curve */}
                    <path
                      d={(() => {
                        const points = [...Array(Math.min(50, curveConfig.maxLevel))].map((_, i) => {
                          const level = i + 1;
                          const xp = calculateXPForLevel(level);
                          const maxXP = calculateXPForLevel(Math.min(50, curveConfig.maxLevel));
                          const x = (i / 49) * 400;
                          const y = 160 - (xp / maxXP) * 150;
                          return `${x},${y}`;
                        });
                        return `M ${points.join(" L ")}`;
                      })()}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-primary"
                    />
                  </svg>

                  {/* Stats overlay */}
                  <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded px-2 py-1 text-xs space-y-1">
                    <div>Max: {calculateXPForLevel(curveConfig.maxLevel).toLocaleString()} XP</div>
                    <div>Total: {totalXPToMax.toLocaleString()} XP</div>
                  </div>
                </div>
              </div>

              {/* Prestige System */}
              <div className="space-y-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <Label>Prestige / Rebirth System</Label>
                  </div>
                  <Button
                    variant={prestigeConfig.enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() =>
                      setPrestigeConfig((prev) => ({ ...prev, enabled: !prev.enabled }))
                    }
                  >
                    {prestigeConfig.enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>

                {prestigeConfig.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Bonus per Prestige (%)</Label>
                      <Input
                        type="number"
                        value={prestigeConfig.bonusPerPrestige}
                        onChange={(e) =>
                          setPrestigeConfig((prev) => ({ ...prev, bonusPerPrestige: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Prestiges</Label>
                      <Input
                        type="number"
                        value={prestigeConfig.maxPrestiges}
                        onChange={(e) =>
                          setPrestigeConfig((prev) => ({ ...prev, maxPrestiges: Number(e.target.value) }))
                        }
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label className="text-xs">Current Prestige: {prestigeConfig.currentPrestige}</Label>
                      <Slider
                        value={[prestigeConfig.currentPrestige]}
                        onValueChange={([v]) =>
                          setPrestigeConfig((prev) => ({ ...prev, currentPrestige: v }))
                        }
                        min={0}
                        max={prestigeConfig.maxPrestiges}
                        step={1}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison Tool */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Compare Curves</Label>
                  <Button size="sm" variant="outline" onClick={addToComparison} disabled={compareConfigs.length >= 3}>
                    Add Current
                  </Button>
                </div>
                {compareConfigs.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {compareConfigs.map((config, index) => (
                      <div key={index} className="p-2 bg-secondary/30 rounded border text-xs">
                        <div className="font-medium">{config.type} ({config.scalingFactor.toFixed(2)}x)</div>
                        <div className="text-muted-foreground">Max: {calculateXPForLevel(config.maxLevel, config).toLocaleString()}</div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setCompareConfigs((prev) => prev.filter((_, i) => i !== index))}
                          className="h-6 w-full mt-1"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="space-y-4 mt-4">
              {/* XP Input */}
              <div className="space-y-2">
                <Label>Enter XP to Preview Level</Label>
                <Input
                  type="number"
                  value={previewXP}
                  onChange={(e) => setPreviewXP(e.target.value)}
                  placeholder="Enter XP amount..."
                />
              </div>

              {/* Level Preview */}
              {previewXP && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 @sm:p-6 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20"
                >
                  <div className="text-center space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Current Level</div>
                      <div className="text-5xl @sm:text-6xl font-bold text-primary">
                        {previewLevelInfo.level}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-3 bg-secondary/30 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${previewLevelInfo.progress}%` }}
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {previewLevelInfo.progress.toFixed(1)}% to next level
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 bg-secondary/30 rounded">
                        <div className="text-muted-foreground text-xs">Current XP</div>
                        <div className="font-semibold">{parseInt(previewXP).toLocaleString()}</div>
                      </div>
                      <div className="p-2 bg-secondary/30 rounded">
                        <div className="text-muted-foreground text-xs">XP to Next</div>
                        <div className="font-semibold">
                          {(previewLevelInfo.nextLevelXP - parseInt(previewXP)).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Time to Level Calculator */}
              <div className="space-y-3 p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <Label>Time to Level Estimation</Label>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">XP per Hour</Label>
                  <Input
                    type="number"
                    value={xpPerHour}
                    onChange={(e) => setXpPerHour(Number(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  {[10, 25, 50, 75, 100].filter(l => l <= curveConfig.maxLevel).map((level) => (
                    <div key={level} className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Time to Level {level}:</span>
                      <span className="font-medium">{timeToLevel(level)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Level Distribution Graph */}
              <div className="space-y-2">
                <Label>Level Distribution (First 20 Levels)</Label>
                <div className="h-32 bg-secondary/20 rounded-lg p-3 flex items-end gap-1">
                  {[...Array(20)].map((_, i) => {
                    const level = i + 1;
                    const xp = calculateXPForLevel(level);
                    const maxXP = calculateXPForLevel(20);
                    const height = (xp / maxXP) * 100;
                    return (
                      <div
                        key={level}
                        className="flex-1 bg-gradient-to-t from-blue-500 to-purple-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${height}%` }}
                        title={`Level ${level}: ${xp.toLocaleString()} XP`}
                      />
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* XP Table Tab */}
            <TabsContent value="table" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>XP Progression Table</Label>
                  <div className="text-xs text-muted-foreground">
                    Total to max: {totalXPToMax.toLocaleString()} XP
                  </div>
                </div>

                <div className="max-h-96 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary">
                      <tr>
                        <th className="p-2 text-left">Level</th>
                        <th className="p-2 text-right">XP Required</th>
                        <th className="p-2 text-right">Total XP</th>
                        <th className="p-2 text-right">To Next</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xpTable.map((row) => (
                        <tr
                          key={row.level}
                          className={cn(
                            "border-t",
                            milestones.some((m) => m.level === row.level) && "bg-yellow-500/10"
                          )}
                        >
                          <td className="p-2 font-medium">
                            {row.level}
                            {milestones.some((m) => m.level === row.level) && (
                              <Star className="inline w-3 h-3 ml-1 text-yellow-500" />
                            )}
                          </td>
                          <td className="p-2 text-right">{row.xpRequired.toLocaleString()}</td>
                          <td className="p-2 text-right text-muted-foreground">
                            {row.totalXP.toLocaleString()}
                          </td>
                          <td className="p-2 text-right text-muted-foreground">
                            {row.xpToNext.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            {/* Stat Gains Tab */}
            <TabsContent value="stats" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <Label>Stat Gains per Level</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newStat: StatGain = {
                      id: Date.now().toString(),
                      name: "New Stat",
                      baseValue: 10,
                      perLevel: 1,
                      scalingType: "linear",
                      scalingFactor: 1.0,
                    };
                    setStatGains((prev) => [...prev, newStat]);
                  }}
                >
                  Add Stat
                </Button>
              </div>

              <div className="space-y-3">
                {statGains.map((stat, index) => (
                  <motion.div
                    key={stat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-secondary/20 rounded-lg border space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <Input
                        value={stat.name}
                        onChange={(e) => {
                          const newStats = [...statGains];
                          newStats[index].name = e.target.value;
                          setStatGains(newStats);
                        }}
                        className="font-medium"
                        placeholder="Stat name"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStatGains((prev) => prev.filter((s) => s.id !== stat.id))}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="space-y-1">
                        <Label className="text-xs">Base Value</Label>
                        <Input
                          type="number"
                          value={stat.baseValue}
                          onChange={(e) => {
                            const newStats = [...statGains];
                            newStats[index].baseValue = Number(e.target.value);
                            setStatGains(newStats);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Per Level</Label>
                        <Input
                          type="number"
                          value={stat.perLevel}
                          onChange={(e) => {
                            const newStats = [...statGains];
                            newStats[index].perLevel = Number(e.target.value);
                            setStatGains(newStats);
                          }}
                        />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-xs">Scaling Type</Label>
                        <Select
                          value={stat.scalingType}
                          onValueChange={(v: "linear" | "exponential") => {
                            const newStats = [...statGains];
                            newStats[index].scalingType = v;
                            setStatGains(newStats);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="linear">Linear</SelectItem>
                            <SelectItem value="exponential">Exponential</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Stat preview */}
                    <div className="pt-2 border-t space-y-1 text-xs">
                      <div className="text-muted-foreground">Preview:</div>
                      <div className="flex gap-3">
                        <span>Lv1: {calculateStatAtLevel(stat, 1)}</span>
                        <span>Lv10: {calculateStatAtLevel(stat, 10)}</span>
                        <span>Lv50: {calculateStatAtLevel(stat, 50)}</span>
                        <span>Lv{curveConfig.maxLevel}: {calculateStatAtLevel(stat, curveConfig.maxLevel)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            {/* Milestones Tab */}
            <TabsContent value="milestones" className="space-y-4 mt-4">
              <div className="flex justify-between items-center">
                <Label>Milestone Levels</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newMilestone: LevelMilestone = {
                      level: 10,
                      name: "New Milestone",
                      reward: "",
                    };
                    setMilestones((prev) => [...prev, newMilestone].sort((a, b) => a.level - b.level));
                  }}
                >
                  Add Milestone
                </Button>
              </div>

              <div className="space-y-3">
                {milestones.map((milestone, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20 space-y-2"
                  >
                    <div className="flex items-start gap-2">
                      <Award className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Level</Label>
                            <Input
                              type="number"
                              value={milestone.level}
                              onChange={(e) => {
                                const newMilestones = [...milestones];
                                newMilestones[index].level = Number(e.target.value);
                                setMilestones(newMilestones.sort((a, b) => a.level - b.level));
                              }}
                              min={1}
                              max={curveConfig.maxLevel}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Name</Label>
                            <Input
                              value={milestone.name}
                              onChange={(e) => {
                                const newMilestones = [...milestones];
                                newMilestones[index].name = e.target.value;
                                setMilestones(newMilestones);
                              }}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Reward (Optional)</Label>
                          <Input
                            value={milestone.reward || ""}
                            onChange={(e) => {
                              const newMilestones = [...milestones];
                              newMilestones[index].reward = e.target.value;
                              setMilestones(newMilestones);
                            }}
                            placeholder="e.g., Skill Unlock, Item, etc."
                          />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setMilestones((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      XP Required: {calculateTotalXP(milestone.level).toLocaleString()}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Milestone Generator */}
              <div className="p-3 bg-secondary/20 rounded-lg border space-y-2">
                <Label className="text-xs">Quick Generate Every N Levels</Label>
                <div className="flex gap-2">
                  {[5, 10, 25].map((n) => (
                    <Button
                      key={n}
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const newMilestones: LevelMilestone[] = [];
                        for (let i = n; i <= curveConfig.maxLevel; i += n) {
                          newMilestones.push({
                            level: i,
                            name: `Level ${i}`,
                            reward: "",
                          });
                        }
                        setMilestones(newMilestones);
                      }}
                    >
                      Every {n}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div>
                  <Label className="mb-2 block">Export Format</Label>
                  <div className="grid grid-cols-1 @sm:grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={exportAsJSON}
                      className="justify-start"
                    >
                      <FileJson className="w-4 h-4 mr-2" />
                      Export as JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportAsJavaScript}
                      className="justify-start"
                    >
                      <Code2 className="w-4 h-4 mr-2" />
                      Export as JavaScript
                    </Button>
                    <Button
                      variant="outline"
                      onClick={exportAsCSV}
                      className="justify-start"
                    >
                      <Table className="w-4 h-4 mr-2" />
                      Export as CSV
                    </Button>
                  </div>
                </div>

                {/* Quick Stats Summary */}
                <div className="p-4 bg-gradient-to-br from-green-500/10 to-blue-500/10 rounded-lg border border-green-500/20">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Curve Summary
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">Curve Type</div>
                      <div className="font-medium capitalize">{curveConfig.type}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Max Level</div>
                      <div className="font-medium">{curveConfig.maxLevel}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Base XP</div>
                      <div className="font-medium">{curveConfig.baseXP.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Scaling Factor</div>
                      <div className="font-medium">{curveConfig.scalingFactor.toFixed(2)}x</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">XP at Max Level</div>
                      <div className="font-medium">{calculateXPForLevel(curveConfig.maxLevel).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Total XP to Max</div>
                      <div className="font-medium">{totalXPToMax.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Milestones</div>
                      <div className="font-medium">{milestones.length}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">Stat Gains</div>
                      <div className="font-medium">{statGains.length}</div>
                    </div>
                    {prestigeConfig.enabled && (
                      <>
                        <div>
                          <div className="text-muted-foreground text-xs">Prestige Level</div>
                          <div className="font-medium">{prestigeConfig.currentPrestige}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-xs">Prestige Bonus</div>
                          <div className="font-medium">{prestigeConfig.currentPrestige * prestigeConfig.bonusPerPrestige}%</div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Implementation Notes */}
                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-xs space-y-2">
                  <h4 className="font-semibold text-sm">Implementation Notes</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Use the exported functions in your game engine</li>
                    <li>• XP values are calculated per level (not cumulative)</li>
                    <li>• Consider balancing XP gains with player progression speed</li>
                    <li>• Test thoroughly with actual gameplay data</li>
                    <li>• Adjust scaling factors based on player feedback</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
