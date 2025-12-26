"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "motion/react";
import {
  Users,
  Clock,
  Play,
  Pause,
  Plus,
  Copy,
  Trash2,
  Download,
  Code2,
  BarChart3,
  Zap,
  Target,
  Skull,
  Heart,
  TrendingUp,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Sparkles,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WaveSpawnerWidgetProps {
  widget: Widget;
}

type SpawnPattern = "linear" | "burst" | "random" | "formation";
type PresetTemplate = "tower-defense" | "survival" | "boss-rush" | "endless";

interface EnemyType {
  id: string;
  name: string;
  emoji: string;
  health: number;
  speed: number;
  damage: number;
  points: number;
  color: string;
}

interface EnemySpawn {
  id: string;
  enemyTypeId: string;
  count: number;
  spawnDelay: number; // delay before this spawn starts
}

interface Wave {
  id: string;
  number: number;
  name: string;
  spawns: EnemySpawn[];
  spawnInterval: number; // interval between enemy spawns
  waveDuration: number; // total duration
  delayBeforeNext: number; // delay before next wave
  pattern: SpawnPattern;
  difficultyMultiplier: number;
}

interface WaveSpawnerConfig {
  enemyTypes?: EnemyType[];
  waves?: Wave[];
  activeWaveId?: string;
  selectedPreset?: PresetTemplate;
}

const DEFAULT_ENEMY_TYPES: EnemyType[] = [
  { id: "1", name: "Grunt", emoji: "🟢", health: 10, speed: 1, damage: 1, points: 10, color: "#22c55e" },
  { id: "2", name: "Soldier", emoji: "🔵", health: 20, speed: 1.2, damage: 2, points: 20, color: "#3b82f6" },
  { id: "3", name: "Elite", emoji: "🟣", health: 50, speed: 1.5, damage: 5, points: 50, color: "#a855f7" },
  { id: "4", name: "Tank", emoji: "🟠", health: 100, speed: 0.8, damage: 3, points: 75, color: "#f97316" },
  { id: "5", name: "Boss", emoji: "🔴", health: 500, speed: 0.5, damage: 10, points: 500, color: "#ef4444" },
];

const SPAWN_PATTERNS: Record<SpawnPattern, { label: string; description: string }> = {
  linear: { label: "Linear", description: "Enemies spawn one after another" },
  burst: { label: "Burst", description: "All enemies spawn at once" },
  random: { label: "Random", description: "Random spawn timing" },
  formation: { label: "Formation", description: "Coordinated group spawns" },
};

const PRESET_TEMPLATES: Record<PresetTemplate, { label: string; description: string }> = {
  "tower-defense": { label: "Tower Defense", description: "Progressive waves with increasing difficulty" },
  "survival": { label: "Survival", description: "Endless waves with rapid escalation" },
  "boss-rush": { label: "Boss Rush", description: "Series of challenging boss encounters" },
  "endless": { label: "Endless", description: "Infinite scaling waves" },
};

const EMOJI_OPTIONS = [
  "🟢", "🔵", "🟣", "🟠", "🔴", "⚫", "⚪", "🟡", "🟤",
  "👹", "👺", "💀", "👻", "👽", "👾", "🤖", "🐉", "🦂",
  "🦇", "🕷️", "🐍", "🦖", "🧟", "🧛", "🧌", "🦹", "⚔️",
];

export function WaveSpawnerWidget({ widget }: WaveSpawnerWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const config = (widget.config || {}) as WaveSpawnerConfig;

  // State
  const [enemyTypes, setEnemyTypes] = useState<EnemyType[]>(config.enemyTypes || DEFAULT_ENEMY_TYPES);
  const [waves, setWaves] = useState<Wave[]>(config.waves || []);
  const [activeWaveId, setActiveWaveId] = useState<string | null>(config.activeWaveId || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [selectedEnemyType, setSelectedEnemyType] = useState<string | null>(null);
  const [showEnemyEditor, setShowEnemyEditor] = useState(false);
  const [expandedWaves, setExpandedWaves] = useState<Set<string>>(new Set());

  // Save config
  const saveConfig = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        enemyTypes,
        waves,
        activeWaveId: activeWaveId || undefined,
      },
    });
  }, [widget.id, widget.config, enemyTypes, waves, activeWaveId]);

  // Auto-save when data changes
  useEffect(() => {
    const timer = setTimeout(saveConfig, 500);
    return () => clearTimeout(timer);
  }, [enemyTypes, waves, activeWaveId, saveConfig]);

  // Active wave
  const activeWave = useMemo(
    () => waves.find(w => w.id === activeWaveId),
    [waves, activeWaveId]
  );

  // Calculate wave statistics
  const waveStats = useMemo(() => {
    if (!activeWave) return null;

    const stats = {
      totalEnemies: 0,
      totalDuration: 0,
      totalDPS: 0,
      totalHealth: 0,
      totalPoints: 0,
      enemyBreakdown: [] as Array<{ type: EnemyType; count: number }>,
    };

    activeWave.spawns.forEach(spawn => {
      const enemyType = enemyTypes.find(e => e.id === spawn.enemyTypeId);
      if (enemyType) {
        stats.totalEnemies += spawn.count;
        stats.totalHealth += enemyType.health * spawn.count;
        stats.totalPoints += enemyType.points * spawn.count;
        stats.totalDPS += enemyType.damage * spawn.count * enemyType.speed;

        const existing = stats.enemyBreakdown.find(e => e.type.id === enemyType.id);
        if (existing) {
          existing.count += spawn.count;
        } else {
          stats.enemyBreakdown.push({ type: enemyType, count: spawn.count });
        }
      }
    });

    stats.totalDuration = activeWave.waveDuration;

    return stats;
  }, [activeWave, enemyTypes]);

  // Simulation
  useEffect(() => {
    if (!isPlaying || !activeWave) return;

    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + 0.1;
        if (next >= activeWave.waveDuration + activeWave.delayBeforeNext) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, activeWave]);

  // Add enemy type
  const addEnemyType = useCallback(() => {
    const newEnemy: EnemyType = {
      id: Date.now().toString(),
      name: `Enemy ${enemyTypes.length + 1}`,
      emoji: EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)],
      health: 10,
      speed: 1,
      damage: 1,
      points: 10,
      color: "#3b82f6",
    };
    setEnemyTypes([...enemyTypes, newEnemy]);
  }, [enemyTypes]);

  // Update enemy type
  const updateEnemyType = useCallback((id: string, updates: Partial<EnemyType>) => {
    setEnemyTypes(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  // Delete enemy type
  const deleteEnemyType = useCallback((id: string) => {
    setEnemyTypes(prev => prev.filter(e => e.id !== id));
    // Remove from waves
    setWaves(prev => prev.map(w => ({
      ...w,
      spawns: w.spawns.filter(s => s.enemyTypeId !== id),
    })));
  }, []);

  // Add wave
  const addWave = useCallback(() => {
    const newWave: Wave = {
      id: Date.now().toString(),
      number: waves.length + 1,
      name: `Wave ${waves.length + 1}`,
      spawns: [],
      spawnInterval: 1,
      waveDuration: 30,
      delayBeforeNext: 5,
      pattern: "linear",
      difficultyMultiplier: 1 + (waves.length * 0.1),
    };
    setWaves([...waves, newWave]);
    setActiveWaveId(newWave.id);
  }, [waves]);

  // Update wave
  const updateWave = useCallback((id: string, updates: Partial<Wave>) => {
    setWaves(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  // Duplicate wave
  const duplicateWave = useCallback((id: string) => {
    const wave = waves.find(w => w.id === id);
    if (!wave) return;

    const newWave: Wave = {
      ...wave,
      id: Date.now().toString(),
      number: waves.length + 1,
      name: `${wave.name} (Copy)`,
    };
    setWaves([...waves, newWave]);
    setActiveWaveId(newWave.id);
  }, [waves]);

  // Delete wave
  const deleteWave = useCallback((id: string) => {
    setWaves(prev => prev.filter(w => w.id !== id));
    if (activeWaveId === id) {
      setActiveWaveId(waves.find(w => w.id !== id)?.id || null);
    }
  }, [activeWaveId, waves]);

  // Add spawn to wave
  const addSpawnToWave = useCallback((waveId: string, enemyTypeId: string) => {
    const newSpawn: EnemySpawn = {
      id: Date.now().toString(),
      enemyTypeId,
      count: 1,
      spawnDelay: 0,
    };
    setWaves(prev => prev.map(w =>
      w.id === waveId ? { ...w, spawns: [...w.spawns, newSpawn] } : w
    ));
  }, []);

  // Update spawn
  const updateSpawn = useCallback((waveId: string, spawnId: string, updates: Partial<EnemySpawn>) => {
    setWaves(prev => prev.map(w =>
      w.id === waveId
        ? { ...w, spawns: w.spawns.map(s => s.id === spawnId ? { ...s, ...updates } : s) }
        : w
    ));
  }, []);

  // Delete spawn
  const deleteSpawn = useCallback((waveId: string, spawnId: string) => {
    setWaves(prev => prev.map(w =>
      w.id === waveId
        ? { ...w, spawns: w.spawns.filter(s => s.id !== spawnId) }
        : w
    ));
  }, []);

  // Apply preset template
  const applyPreset = useCallback((preset: PresetTemplate) => {
    let newWaves: Wave[] = [];

    switch (preset) {
      case "tower-defense":
        newWaves = Array.from({ length: 10 }, (_, i) => ({
          id: `wave-${i + 1}`,
          number: i + 1,
          name: `Wave ${i + 1}`,
          spawns: [
            { id: `spawn-${i}-1`, enemyTypeId: "1", count: 5 + i * 2, spawnDelay: 0 },
            { id: `spawn-${i}-2`, enemyTypeId: "2", count: 2 + i, spawnDelay: 5 },
          ],
          spawnInterval: 1,
          waveDuration: 30,
          delayBeforeNext: 5,
          pattern: "linear",
          difficultyMultiplier: 1 + (i * 0.15),
        }));
        break;

      case "survival":
        newWaves = Array.from({ length: 20 }, (_, i) => ({
          id: `wave-${i + 1}`,
          number: i + 1,
          name: `Wave ${i + 1}`,
          spawns: [
            { id: `spawn-${i}-1`, enemyTypeId: "1", count: 10 + i * 5, spawnDelay: 0 },
            { id: `spawn-${i}-2`, enemyTypeId: "2", count: 5 + i * 2, spawnDelay: 2 },
          ],
          spawnInterval: 0.5,
          waveDuration: 25,
          delayBeforeNext: 3,
          pattern: "burst",
          difficultyMultiplier: 1 + (i * 0.2),
        }));
        break;

      case "boss-rush":
        newWaves = Array.from({ length: 5 }, (_, i) => ({
          id: `wave-${i + 1}`,
          number: i + 1,
          name: `Boss ${i + 1}`,
          spawns: [
            { id: `spawn-${i}-1`, enemyTypeId: "5", count: 1, spawnDelay: 0 },
            { id: `spawn-${i}-2`, enemyTypeId: "3", count: 2 + i, spawnDelay: 10 },
          ],
          spawnInterval: 2,
          waveDuration: 60,
          delayBeforeNext: 10,
          pattern: "formation",
          difficultyMultiplier: 1 + (i * 0.5),
        }));
        break;

      case "endless":
        newWaves = Array.from({ length: 50 }, (_, i) => ({
          id: `wave-${i + 1}`,
          number: i + 1,
          name: `Wave ${i + 1}`,
          spawns: [
            { id: `spawn-${i}-1`, enemyTypeId: "1", count: 5 + Math.floor(i * 1.5), spawnDelay: 0 },
            { id: `spawn-${i}-2`, enemyTypeId: "2", count: 3 + i, spawnDelay: 3 },
            { id: `spawn-${i}-3`, enemyTypeId: "3", count: 1 + Math.floor(i / 2), spawnDelay: 6 },
          ],
          spawnInterval: 0.8,
          waveDuration: 20 + i,
          delayBeforeNext: 5,
          pattern: "random",
          difficultyMultiplier: 1 + (i * 0.1),
        }));
        break;
    }

    setWaves(newWaves);
    if (newWaves.length > 0) {
      setActiveWaveId(newWaves[0].id);
    }
  }, []);

  // Export as JSON
  const exportAsJSON = useCallback(() => {
    const data = { enemyTypes, waves };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "wave-spawner-data.json";
    link.click();
    URL.revokeObjectURL(url);
  }, [enemyTypes, waves]);

  // Export as JavaScript
  const exportAsCode = useCallback(() => {
    const code = `// Enemy Types
const enemyTypes = ${JSON.stringify(enemyTypes, null, 2)};

// Wave Configuration
const waves = ${JSON.stringify(waves, null, 2)};

// Spawn wave function
function spawnWave(waveIndex) {
  const wave = waves[waveIndex];
  if (!wave) return;

  console.log(\`Starting \${wave.name}\`);

  wave.spawns.forEach((spawn, i) => {
    setTimeout(() => {
      const enemyType = enemyTypes.find(e => e.id === spawn.enemyTypeId);
      for (let j = 0; j < spawn.count; j++) {
        setTimeout(() => {
          console.log(\`Spawning \${enemyType.name}\`);
          // Your spawn logic here
        }, j * wave.spawnInterval * 1000);
      }
    }, spawn.spawnDelay * 1000);
  });
}

// Start wave sequence
let currentWave = 0;
spawnWave(currentWave);
`;

    navigator.clipboard.writeText(code);
  }, [enemyTypes, waves]);

  // Toggle wave expansion
  const toggleWaveExpansion = useCallback((waveId: string) => {
    setExpandedWaves(prev => {
      const next = new Set(prev);
      if (next.has(waveId)) {
        next.delete(waveId);
      } else {
        next.add(waveId);
      }
      return next;
    });
  }, []);

  return (
    <div className="h-full w-full @container flex flex-col gap-3 p-3 @xs:p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 @xs:w-5 @xs:h-5 text-purple-400" />
          <h3 className="text-sm @xs:text-base font-semibold text-zinc-100">
            Wave Spawner
          </h3>
        </div>

        <div className="flex items-center gap-1 @xs:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowEnemyEditor(!showEnemyEditor)}
            className="h-7 @xs:h-8 px-2 text-xs"
          >
            <Settings className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={exportAsJSON}
            className="h-7 @xs:h-8 px-2 text-xs"
          >
            <Download className="w-3 h-3 @xs:w-4 @xs:h-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="waves" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3 h-8 @xs:h-9">
          <TabsTrigger value="waves" className="text-xs @xs:text-sm">
            Waves
          </TabsTrigger>
          <TabsTrigger value="enemies" className="text-xs @xs:text-sm">
            Enemies
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs @xs:text-sm">
            Preview
          </TabsTrigger>
        </TabsList>

        {/* Waves Tab */}
        <TabsContent value="waves" className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs @xs:text-sm text-zinc-300">
              Wave Timeline ({waves.length})
            </Label>
            <div className="flex gap-1 @xs:gap-2">
              <Select onValueChange={(value) => applyPreset(value as PresetTemplate)}>
                <SelectTrigger className="h-7 @xs:h-8 w-[100px] @xs:w-[120px] text-xs">
                  <SelectValue placeholder="Preset" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRESET_TEMPLATES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key} className="text-xs">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={addWave}
                className="h-7 @xs:h-8 px-2 @xs:px-3 text-xs gap-1"
              >
                <Plus className="w-3 h-3" />
                Wave
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-3">
              <AnimatePresence mode="popLayout">
                {waves.map((wave, index) => {
                  const isExpanded = expandedWaves.has(wave.id);
                  const isActive = wave.id === activeWaveId;

                  return (
                    <motion.div
                      key={wave.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      className={cn(
                        "p-2 @xs:p-3 rounded-lg border transition-colors",
                        isActive ? "bg-purple-900/20 border-purple-600" : "bg-zinc-900/50 border-zinc-800"
                      )}
                    >
                      {/* Wave Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => {
                            setActiveWaveId(wave.id);
                            toggleWaveExpansion(wave.id);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3 text-zinc-400" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-zinc-400" />
                            )}
                            <Input
                              value={wave.name}
                              onChange={(e) => updateWave(wave.id, { name: e.target.value })}
                              onClick={(e) => e.stopPropagation()}
                              className="h-7 @xs:h-8 text-xs @xs:text-sm bg-zinc-800/50 border-zinc-700"
                            />
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-5 text-[10px] @xs:text-xs text-zinc-400">
                            <span>{wave.spawns.reduce((sum, s) => sum + s.count, 0)} enemies</span>
                            <span>{wave.waveDuration}s</span>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded text-[9px] @xs:text-[10px] font-medium",
                              wave.pattern === "burst" && "bg-red-900/30 text-red-300",
                              wave.pattern === "linear" && "bg-blue-900/30 text-blue-300",
                              wave.pattern === "random" && "bg-purple-900/30 text-purple-300",
                              wave.pattern === "formation" && "bg-amber-900/30 text-amber-300"
                            )}>
                              {wave.pattern}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => duplicateWave(wave.id)}
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-blue-400"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWave(wave.id)}
                            className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Wave Details (Expanded) */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-3 space-y-3"
                          >
                            {/* Wave Configuration */}
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-[10px] @xs:text-xs text-zinc-400">
                                  Duration (s)
                                </Label>
                                <Input
                                  type="number"
                                  min="1"
                                  value={wave.waveDuration}
                                  onChange={(e) => updateWave(wave.id, { waveDuration: Number(e.target.value) })}
                                  className="h-7 @xs:h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] @xs:text-xs text-zinc-400">
                                  Spawn Interval (s)
                                </Label>
                                <Input
                                  type="number"
                                  min="0.1"
                                  step="0.1"
                                  value={wave.spawnInterval}
                                  onChange={(e) => updateWave(wave.id, { spawnInterval: Number(e.target.value) })}
                                  className="h-7 @xs:h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] @xs:text-xs text-zinc-400">
                                  Delay Before Next (s)
                                </Label>
                                <Input
                                  type="number"
                                  min="0"
                                  value={wave.delayBeforeNext}
                                  onChange={(e) => updateWave(wave.id, { delayBeforeNext: Number(e.target.value) })}
                                  className="h-7 @xs:h-8 text-xs"
                                />
                              </div>
                              <div>
                                <Label className="text-[10px] @xs:text-xs text-zinc-400">
                                  Pattern
                                </Label>
                                <Select
                                  value={wave.pattern}
                                  onValueChange={(value: SpawnPattern) => updateWave(wave.id, { pattern: value })}
                                >
                                  <SelectTrigger className="h-7 @xs:h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(SPAWN_PATTERNS).map(([key, { label }]) => (
                                      <SelectItem key={key} value={key} className="text-xs">
                                        {label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Difficulty Multiplier */}
                            <div>
                              <Label className="text-[10px] @xs:text-xs text-zinc-400 flex items-center justify-between">
                                <span>Difficulty Multiplier</span>
                                <span className="font-mono">{wave.difficultyMultiplier.toFixed(2)}x</span>
                              </Label>
                              <Slider
                                value={[wave.difficultyMultiplier]}
                                onValueChange={([value]) => updateWave(wave.id, { difficultyMultiplier: value })}
                                min={0.5}
                                max={5}
                                step={0.1}
                                className="mt-1"
                              />
                            </div>

                            {/* Spawns */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <Label className="text-[10px] @xs:text-xs text-zinc-400">
                                  Enemy Spawns
                                </Label>
                                <Select onValueChange={(value) => addSpawnToWave(wave.id, value)}>
                                  <SelectTrigger className="h-6 w-[100px] text-[10px]">
                                    <Plus className="w-3 h-3 mr-1" />
                                    <SelectValue placeholder="Add" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {enemyTypes.map((enemy) => (
                                      <SelectItem key={enemy.id} value={enemy.id} className="text-xs">
                                        {enemy.emoji} {enemy.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1.5">
                                {wave.spawns.map((spawn) => {
                                  const enemyType = enemyTypes.find(e => e.id === spawn.enemyTypeId);
                                  if (!enemyType) return null;

                                  return (
                                    <div
                                      key={spawn.id}
                                      className="flex items-center gap-2 p-1.5 bg-zinc-800/50 rounded border border-zinc-700"
                                    >
                                      <span className="text-lg">{enemyType.emoji}</span>
                                      <span className="text-xs text-zinc-300 flex-1">{enemyType.name}</span>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={spawn.count}
                                        onChange={(e) => updateSpawn(wave.id, spawn.id, { count: Number(e.target.value) })}
                                        className="h-6 w-12 text-xs"
                                        title="Count"
                                      />
                                      <Input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        value={spawn.spawnDelay}
                                        onChange={(e) => updateSpawn(wave.id, spawn.id, { spawnDelay: Number(e.target.value) })}
                                        className="h-6 w-12 text-xs"
                                        title="Delay (s)"
                                      />
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteSpawn(wave.id, spawn.id)}
                                        className="h-6 w-6 p-0 text-zinc-400 hover:text-red-400"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {waves.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-xs @xs:text-sm">
                  No waves configured. Add your first wave or select a preset template!
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Enemies Tab */}
        <TabsContent value="enemies" className="flex-1 flex flex-col min-h-0 mt-2">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs @xs:text-sm text-zinc-300">
              Enemy Types ({enemyTypes.length})
            </Label>
            <Button
              size="sm"
              onClick={addEnemyType}
              className="h-7 @xs:h-8 px-2 @xs:px-3 text-xs gap-1"
            >
              <Plus className="w-3 h-3" />
              Enemy
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-2 pr-3">
              <AnimatePresence mode="popLayout">
                {enemyTypes.map((enemy) => (
                  <motion.div
                    key={enemy.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="p-2 @xs:p-3 rounded-lg border bg-zinc-900/50 border-zinc-800 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-2">
                        {/* Name and Emoji */}
                        <div className="flex items-center gap-2">
                          <Select
                            value={enemy.emoji}
                            onValueChange={(value) => updateEnemyType(enemy.id, { emoji: value })}
                          >
                            <SelectTrigger className="h-8 w-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {EMOJI_OPTIONS.map((emoji) => (
                                <SelectItem key={emoji} value={emoji}>
                                  {emoji}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={enemy.name}
                            onChange={(e) => updateEnemyType(enemy.id, { name: e.target.value })}
                            className="h-7 @xs:h-8 text-xs @xs:text-sm flex-1"
                            placeholder="Enemy name"
                          />
                          <Input
                            type="color"
                            value={enemy.color}
                            onChange={(e) => updateEnemyType(enemy.id, { color: e.target.value })}
                            className="h-7 @xs:h-8 w-12 p-1"
                          />
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Heart className="w-3 h-3" /> Health
                            </Label>
                            <Input
                              type="number"
                              min="1"
                              value={enemy.health}
                              onChange={(e) => updateEnemyType(enemy.id, { health: Number(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Zap className="w-3 h-3" /> Speed
                            </Label>
                            <Input
                              type="number"
                              min="0.1"
                              step="0.1"
                              value={enemy.speed}
                              onChange={(e) => updateEnemyType(enemy.id, { speed: Number(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Skull className="w-3 h-3" /> Damage
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={enemy.damage}
                              onChange={(e) => updateEnemyType(enemy.id, { damage: Number(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-zinc-400 flex items-center gap-1">
                              <Target className="w-3 h-3" /> Points
                            </Label>
                            <Input
                              type="number"
                              min="0"
                              value={enemy.points}
                              onChange={(e) => updateEnemyType(enemy.id, { points: Number(e.target.value) })}
                              className="h-7 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEnemyType(enemy.id)}
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 flex flex-col min-h-0 mt-2">
          {activeWave ? (
            <div className="flex-1 space-y-3">
              {/* Wave Info */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800">
                <h4 className="text-sm font-semibold text-zinc-100 mb-2">{activeWave.name}</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Pattern:</span>
                    <span className="text-zinc-200">{SPAWN_PATTERNS[activeWave.pattern].label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Duration:</span>
                    <span className="text-zinc-200">{activeWave.waveDuration}s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Difficulty:</span>
                    <span className="text-zinc-200">{activeWave.difficultyMultiplier.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400">Next Wave:</span>
                    <span className="text-zinc-200">{activeWave.delayBeforeNext}s</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              {waveStats && (
                <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h4 className="text-sm font-semibold text-zinc-100">Wave Statistics</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <div className="text-[10px] text-zinc-400">Total Enemies</div>
                      <div className="text-lg font-bold text-zinc-100">{waveStats.totalEnemies}</div>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <div className="text-[10px] text-zinc-400">Total Health</div>
                      <div className="text-lg font-bold text-zinc-100">{waveStats.totalHealth}</div>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <div className="text-[10px] text-zinc-400">Total DPS</div>
                      <div className="text-lg font-bold text-zinc-100">{waveStats.totalDPS.toFixed(1)}</div>
                    </div>
                    <div className="p-2 bg-zinc-800/50 rounded">
                      <div className="text-[10px] text-zinc-400">Total Points</div>
                      <div className="text-lg font-bold text-zinc-100">{waveStats.totalPoints}</div>
                    </div>
                  </div>

                  {/* Enemy Breakdown */}
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-400">Enemy Breakdown:</Label>
                    {waveStats.enemyBreakdown.map(({ type, count }) => (
                      <div key={type.id} className="flex items-center justify-between text-xs p-1.5 bg-zinc-800/50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{type.emoji}</span>
                          <span className="text-zinc-300">{type.name}</span>
                        </div>
                        <span className="font-mono text-zinc-400">{count}x</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Simulation Controls */}
              <div className="p-3 bg-zinc-900/50 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-semibold text-zinc-100">Simulation</h4>
                </div>

                <div className="space-y-2">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-zinc-400">Time:</span>
                      <span className="font-mono text-zinc-300">
                        {currentTime.toFixed(1)}s / {(activeWave.waveDuration + activeWave.delayBeforeNext).toFixed(1)}s
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
                        animate={{
                          width: `${(currentTime / (activeWave.waveDuration + activeWave.delayBeforeNext)) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  {/* Control Buttons */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setIsPlaying(!isPlaying);
                        if (currentTime >= activeWave.waveDuration + activeWave.delayBeforeNext) {
                          setCurrentTime(0);
                        }
                      }}
                      className="flex-1 h-8 text-xs gap-2"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3 h-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Play
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentTime(0);
                      }}
                      className="h-8 px-3 text-xs"
                    >
                      Reset
                    </Button>
                  </div>
                </div>

                {/* Current Wave Indicator */}
                {currentTime < activeWave.waveDuration && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-purple-900/20 border border-purple-600/30 rounded text-xs text-purple-200"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Wave in progress...</span>
                    </div>
                  </motion.div>
                )}

                {currentTime >= activeWave.waveDuration && currentTime < (activeWave.waveDuration + activeWave.delayBeforeNext) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 bg-blue-900/20 border border-blue-600/30 rounded text-xs text-blue-200"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3" />
                      <span>Waiting for next wave...</span>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Export Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsJSON}
                  className="flex-1 h-8 text-xs gap-2"
                >
                  <FileJson className="w-3 h-3" />
                  Export JSON
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAsCode}
                  className="flex-1 h-8 text-xs gap-2"
                >
                  <Code2 className="w-3 h-3" />
                  Copy Code
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
              Select a wave to preview
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
