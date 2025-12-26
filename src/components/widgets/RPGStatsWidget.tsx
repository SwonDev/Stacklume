"use client";

import { useState, useCallback, useMemo } from "react";
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
  Sword,
  Calculator,
  TrendingUp,
  Users,
  Zap,
  Target,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Dice6,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RPGStatsWidgetProps {
  widget: Widget;
}

// RPG Formula Presets
type RPGPreset = "custom" | "final-fantasy" | "dark-souls" | "dnd" | "pokemon" | "diablo";

interface DamageFormula {
  baseDamage: number;
  attackPower: number;
  defense: number;
  multiplier: number;
  critChance: number;
  critMultiplier: number;
}

interface LevelScaling {
  baseXP: number;
  scalingType: "linear" | "exponential" | "polynomial";
  scalingFactor: number;
  maxLevel: number;
}

interface StatDistribution {
  totalPoints: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
  statCap: number;
  diminishingReturnsThreshold: number;
}

interface DPSCalculation {
  damage: number;
  attackSpeed: number;
  critChance: number;
  critDamage: number;
  hitChance: number;
}

interface BuildComparison {
  name: string;
  stats: StatDistribution;
  dps: number;
}

const RPG_PRESETS: Record<RPGPreset, Partial<DamageFormula>> = {
  custom: {},
  "final-fantasy": {
    baseDamage: 10,
    attackPower: 50,
    defense: 30,
    multiplier: 1.5,
    critChance: 10,
    critMultiplier: 1.5,
  },
  "dark-souls": {
    baseDamage: 100,
    attackPower: 250,
    defense: 150,
    multiplier: 1.0,
    critChance: 5,
    critMultiplier: 2.0,
  },
  dnd: {
    baseDamage: 8,
    attackPower: 18,
    defense: 15,
    multiplier: 1.0,
    critChance: 5,
    critMultiplier: 2.0,
  },
  pokemon: {
    baseDamage: 50,
    attackPower: 100,
    defense: 80,
    multiplier: 1.5,
    critChance: 6.25,
    critMultiplier: 1.5,
  },
  diablo: {
    baseDamage: 50,
    attackPower: 500,
    defense: 200,
    multiplier: 1.2,
    critChance: 25,
    critMultiplier: 2.5,
  },
};

export function RPGStatsWidget({ widget: _widget }: RPGStatsWidgetProps) {
  const { updateWidget: _updateWidget } = useWidgetStore();

  // State for damage formula
  const [preset, setPreset] = useState<RPGPreset>("custom");
  const [damageFormula, setDamageFormula] = useState<DamageFormula>({
    baseDamage: 50,
    attackPower: 100,
    defense: 50,
    multiplier: 1.5,
    critChance: 10,
    critMultiplier: 2.0,
  });

  // State for level scaling
  const [levelScaling, setLevelScaling] = useState<LevelScaling>({
    baseXP: 100,
    scalingType: "exponential",
    scalingFactor: 1.5,
    maxLevel: 100,
  });

  // State for stat distribution
  const [statDistribution, setStatDistribution] = useState<StatDistribution>({
    totalPoints: 50,
    strength: 10,
    dexterity: 10,
    intelligence: 10,
    vitality: 10,
    luck: 10,
    statCap: 99,
    diminishingReturnsThreshold: 50,
  });

  // State for DPS calculator
  const [dpsCalc, setDpsCalc] = useState<DPSCalculation>({
    damage: 100,
    attackSpeed: 1.5,
    critChance: 25,
    critDamage: 200,
    hitChance: 95,
  });

  // State for build comparison
  const [builds, setBuilds] = useState<BuildComparison[]>([]);
  const [selectedBuildIndex, setSelectedBuildIndex] = useState<number | null>(null);

  // State for encounter difficulty
  const [partyLevel, setPartyLevel] = useState(5);
  const [partySize, setPartySize] = useState(4);
  const [encounterXPBudget, setEncounterXPBudget] = useState(400);

  // State for loot drop rates
  const [dropChance, setDropChance] = useState(10);
  const [numberOfRolls, setNumberOfRolls] = useState(1);
  const [luckyRolls, setLuckyRolls] = useState(0);

  // Calculate damage
  const calculateDamage = useCallback((formula: DamageFormula, isCrit: boolean = false): number => {
    const { baseDamage, attackPower, defense, multiplier, critMultiplier } = formula;
    const rawDamage = (baseDamage + attackPower - defense * 0.5) * multiplier;
    const finalDamage = isCrit ? rawDamage * critMultiplier : rawDamage;
    return Math.max(1, Math.round(finalDamage));
  }, []);

  const averageDamage = useMemo(() => {
    const normalDamage = calculateDamage(damageFormula, false);
    const critDamage = calculateDamage(damageFormula, true);
    const critRate = damageFormula.critChance / 100;
    return normalDamage * (1 - critRate) + critDamage * critRate;
  }, [damageFormula, calculateDamage]);

  // Calculate XP for level
  const calculateXPForLevel = useCallback((level: number): number => {
    const { baseXP, scalingType, scalingFactor } = levelScaling;

    switch (scalingType) {
      case "linear":
        return Math.round(baseXP * level);
      case "exponential":
        return Math.round(baseXP * Math.pow(scalingFactor, level - 1));
      case "polynomial":
        return Math.round(baseXP * Math.pow(level, scalingFactor));
      default:
        return baseXP * level;
    }
  }, [levelScaling]);

  // Calculate total XP to reach level
  const calculateTotalXP = useCallback((targetLevel: number): number => {
    let total = 0;
    for (let i = 2; i <= targetLevel; i++) {
      total += calculateXPForLevel(i);
    }
    return total;
  }, [calculateXPForLevel]);

  // Calculate stat efficiency with diminishing returns
  const _calculateStatEfficiency = useCallback((statValue: number, threshold: number): number => {
    if (statValue <= threshold) {
      return statValue;
    }
    const excess = statValue - threshold;
    const diminished = Math.sqrt(excess) * Math.sqrt(threshold);
    return threshold + diminished;
  }, []);

  // Calculate DPS
  const calculateDPS = useMemo(() => {
    const { damage, attackSpeed, critChance, critDamage, hitChance } = dpsCalc;
    const critRate = critChance / 100;
    const critMult = critDamage / 100;
    const hitRate = hitChance / 100;

    const avgDamagePerHit = damage * (1 + critRate * (critMult - 1));
    const effectiveDPS = avgDamagePerHit * attackSpeed * hitRate;

    return Math.round(effectiveDPS * 10) / 10;
  }, [dpsCalc]);

  // Calculate drop probability
  const calculateDropProbability = useCallback((chance: number, rolls: number, lucky: number): number => {
    const baseChance = chance / 100;
    const luckyBonus = lucky * 0.01; // 1% per lucky roll
    const effectiveChance = Math.min(baseChance + luckyBonus, 1);

    // Probability of getting at least one drop
    const noDropChance = Math.pow(1 - effectiveChance, rolls);
    return (1 - noDropChance) * 100;
  }, []);

  const dropProbability = useMemo(() => {
    return calculateDropProbability(dropChance, numberOfRolls, luckyRolls);
  }, [dropChance, numberOfRolls, luckyRolls, calculateDropProbability]);

  // Calculate encounter difficulty
  const encounterDifficulty = useMemo(() => {
    const xpPerPlayer = encounterXPBudget / partySize;
    const levelThresholds = [25, 50, 75, 100, 150, 200]; // Trivial, Easy, Medium, Hard, Deadly, Legendary

    if (xpPerPlayer < levelThresholds[0]) return { level: "Trivial", color: "text-green-400" };
    if (xpPerPlayer < levelThresholds[1]) return { level: "Easy", color: "text-blue-400" };
    if (xpPerPlayer < levelThresholds[2]) return { level: "Medium", color: "text-yellow-400" };
    if (xpPerPlayer < levelThresholds[3]) return { level: "Hard", color: "text-orange-400" };
    if (xpPerPlayer < levelThresholds[4]) return { level: "Deadly", color: "text-red-400" };
    return { level: "Legendary", color: "text-purple-400" };
  }, [encounterXPBudget, partySize, partyLevel]);

  // Balance analysis
  const balanceAnalysis = useMemo(() => {
    const suggestions: string[] = [];

    if (averageDamage < 50) {
      suggestions.push("Damage is low. Consider increasing attack power or multipliers.");
    } else if (averageDamage > 500) {
      suggestions.push("Damage might be too high. Consider balancing for difficulty.");
    }

    if (damageFormula.critChance > 50) {
      suggestions.push("Critical chance is very high. Consider reducing for balance.");
    }

    if (damageFormula.critMultiplier > 3) {
      suggestions.push("Critical multiplier is high. This creates high variance.");
    }

    if (calculateDPS > 1000) {
      suggestions.push("DPS is very high. Enemies might die too quickly.");
    }

    const usedPoints = statDistribution.strength + statDistribution.dexterity +
                      statDistribution.intelligence + statDistribution.vitality +
                      statDistribution.luck;
    if (usedPoints !== statDistribution.totalPoints) {
      suggestions.push(`Unallocated stat points: ${statDistribution.totalPoints - usedPoints}`);
    }

    return suggestions.length > 0 ? suggestions : ["Balance looks good!"];
  }, [averageDamage, damageFormula, calculateDPS, statDistribution]);

  // Apply preset
  const applyPreset = useCallback((presetName: RPGPreset) => {
    setPreset(presetName);
    if (presetName !== "custom") {
      setDamageFormula((prev) => ({
        ...prev,
        ...RPG_PRESETS[presetName],
      }));
    }
  }, []);

  // Export formula as code
  const exportFormula = useCallback((format: "javascript" | "python" | "csharp") => {
    let code = "";

    switch (format) {
      case "javascript":
        code = `function calculateDamage(baseDamage, attackPower, defense, multiplier, isCrit, critMultiplier) {
  const rawDamage = (baseDamage + attackPower - defense * 0.5) * multiplier;
  const finalDamage = isCrit ? rawDamage * critMultiplier : rawDamage;
  return Math.max(1, Math.round(finalDamage));
}

// Example usage:
const damage = calculateDamage(${damageFormula.baseDamage}, ${damageFormula.attackPower}, ${damageFormula.defense}, ${damageFormula.multiplier}, false, ${damageFormula.critMultiplier});
console.log("Damage:", damage);`;
        break;

      case "python":
        code = `def calculate_damage(base_damage, attack_power, defense, multiplier, is_crit, crit_multiplier):
    raw_damage = (base_damage + attack_power - defense * 0.5) * multiplier
    final_damage = raw_damage * crit_multiplier if is_crit else raw_damage
    return max(1, round(final_damage))

# Example usage:
damage = calculate_damage(${damageFormula.baseDamage}, ${damageFormula.attackPower}, ${damageFormula.defense}, ${damageFormula.multiplier}, False, ${damageFormula.critMultiplier})
print(f"Damage: {damage}")`;
        break;

      case "csharp":
        code = `public int CalculateDamage(int baseDamage, int attackPower, int defense, float multiplier, bool isCrit, float critMultiplier)
{
    float rawDamage = (baseDamage + attackPower - defense * 0.5f) * multiplier;
    float finalDamage = isCrit ? rawDamage * critMultiplier : rawDamage;
    return Math.Max(1, (int)Math.Round(finalDamage));
}

// Example usage:
int damage = CalculateDamage(${damageFormula.baseDamage}, ${damageFormula.attackPower}, ${damageFormula.defense}, ${damageFormula.multiplier}f, false, ${damageFormula.critMultiplier}f);
Console.WriteLine($"Damage: {damage}");`;
        break;
    }

    navigator.clipboard.writeText(code);
  }, [damageFormula]);

  // Save current build
  const saveCurrentBuild = useCallback(() => {
    const buildName = `Build ${builds.length + 1}`;
    const newBuild: BuildComparison = {
      name: buildName,
      stats: { ...statDistribution },
      dps: calculateDPS,
    };
    setBuilds((prev) => [...prev, newBuild]);
  }, [builds, statDistribution, calculateDPS]);

  return (
    <div className="h-full w-full @container">
      <ScrollArea className="h-full w-full">
        <div className="p-3 @xs:p-4 space-y-3 @xs:space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <Sword className="w-5 h-5 text-red-500" />
            <h3 className="font-bold text-lg">RPG Stats Calculator</h3>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="damage" className="w-full">
            <TabsList className="grid grid-cols-4 @lg:grid-cols-5 w-full">
              <TabsTrigger value="damage" className="text-xs @xs:text-sm">
                <Sword className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Damage
              </TabsTrigger>
              <TabsTrigger value="leveling" className="text-xs @xs:text-sm">
                <TrendingUp className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Levels
              </TabsTrigger>
              <TabsTrigger value="stats" className="text-xs @xs:text-sm">
                <Users className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Stats
              </TabsTrigger>
              <TabsTrigger value="dps" className="text-xs @xs:text-sm">
                <Zap className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                DPS
              </TabsTrigger>
              <TabsTrigger value="tools" className="text-xs @xs:text-sm hidden @lg:block">
                <Calculator className="w-3 h-3 @xs:w-4 @xs:h-4 mr-1" />
                Tools
              </TabsTrigger>
            </TabsList>

            {/* Damage Formula Tab */}
            <TabsContent value="damage" className="space-y-4 mt-4">
              {/* Preset Selector */}
              <div className="space-y-2">
                <Label>Preset</Label>
                <Select value={preset} onValueChange={(v) => applyPreset(v as RPGPreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="final-fantasy">Final Fantasy</SelectItem>
                    <SelectItem value="dark-souls">Dark Souls</SelectItem>
                    <SelectItem value="dnd">D&D 5e</SelectItem>
                    <SelectItem value="pokemon">Pokemon</SelectItem>
                    <SelectItem value="diablo">Diablo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Formula Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Base Damage</Label>
                  <Input
                    type="number"
                    value={damageFormula.baseDamage}
                    onChange={(e) => setDamageFormula((prev) => ({ ...prev, baseDamage: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Attack Power</Label>
                  <Input
                    type="number"
                    value={damageFormula.attackPower}
                    onChange={(e) => setDamageFormula((prev) => ({ ...prev, attackPower: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Defense</Label>
                  <Input
                    type="number"
                    value={damageFormula.defense}
                    onChange={(e) => setDamageFormula((prev) => ({ ...prev, defense: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Multiplier</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={damageFormula.multiplier}
                    onChange={(e) => setDamageFormula((prev) => ({ ...prev, multiplier: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* Critical Stats */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Critical Chance: {damageFormula.critChance}%</Label>
                  <Slider
                    value={[damageFormula.critChance]}
                    onValueChange={([v]) => setDamageFormula((prev) => ({ ...prev, critChance: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Critical Multiplier: {damageFormula.critMultiplier}x</Label>
                  <Slider
                    value={[damageFormula.critMultiplier]}
                    onValueChange={([v]) => setDamageFormula((prev) => ({ ...prev, critMultiplier: v }))}
                    min={1}
                    max={5}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Damage Results */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg border border-red-500/20"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Normal Hit</div>
                    <div className="text-3xl font-bold text-red-500">
                      {calculateDamage(damageFormula, false)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Critical Hit</div>
                    <div className="text-3xl font-bold text-orange-500">
                      {calculateDamage(damageFormula, true)}
                    </div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-sm text-muted-foreground mb-1">Average Damage</div>
                    <div className="text-2xl font-bold text-yellow-500">
                      {Math.round(averageDamage * 10) / 10}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Export Options */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportFormula("javascript")}
                  className="flex-1"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  JS
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportFormula("python")}
                  className="flex-1"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  Python
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportFormula("csharp")}
                  className="flex-1"
                >
                  <Code2 className="w-4 h-4 mr-2" />
                  C#
                </Button>
              </div>
            </TabsContent>

            {/* Level Scaling Tab */}
            <TabsContent value="leveling" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Base XP</Label>
                  <Input
                    type="number"
                    value={levelScaling.baseXP}
                    onChange={(e) => setLevelScaling((prev) => ({ ...prev, baseXP: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Scaling Type</Label>
                  <Select
                    value={levelScaling.scalingType}
                    onValueChange={(v: "linear" | "exponential" | "polynomial") =>
                      setLevelScaling((prev) => ({ ...prev, scalingType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linear">Linear</SelectItem>
                      <SelectItem value="exponential">Exponential</SelectItem>
                      <SelectItem value="polynomial">Polynomial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Scaling Factor: {levelScaling.scalingFactor}</Label>
                  <Slider
                    value={[levelScaling.scalingFactor]}
                    onValueChange={([v]) => setLevelScaling((prev) => ({ ...prev, scalingFactor: v }))}
                    min={1}
                    max={3}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Level</Label>
                  <Input
                    type="number"
                    value={levelScaling.maxLevel}
                    onChange={(e) => setLevelScaling((prev) => ({ ...prev, maxLevel: Number(e.target.value) }))}
                  />
                </div>
              </div>

              {/* XP Table Preview */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">XP Progression (First 10 Levels)</h4>
                <div className="bg-secondary/30 rounded-lg p-3 space-y-2">
                  {[...Array(Math.min(10, levelScaling.maxLevel))].map((_, i) => {
                    const level = i + 2;
                    const xpForLevel = calculateXPForLevel(level);
                    const totalXP = calculateTotalXP(level);
                    return (
                      <div
                        key={level}
                        className="flex justify-between items-center text-sm"
                      >
                        <span className="font-medium">Level {level}</span>
                        <div className="flex gap-4 text-muted-foreground">
                          <span>{xpForLevel} XP</span>
                          <span className="text-xs">(Total: {totalXP})</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Visual graph representation */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">XP Curve Visualization</h4>
                <div className="h-32 bg-secondary/30 rounded-lg p-3 flex items-end gap-1">
                  {[...Array(20)].map((_, i) => {
                    const level = i + 1;
                    const xp = calculateXPForLevel(level);
                    const maxXP = calculateXPForLevel(20);
                    const height = (xp / maxXP) * 100;
                    return (
                      <div
                        key={level}
                        className="flex-1 bg-blue-500/50 rounded-t"
                        style={{ height: `${height}%` }}
                        title={`Level ${level}: ${xp} XP`}
                      />
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* Stat Distribution Tab */}
            <TabsContent value="stats" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Total Points</Label>
                  <span className="text-sm text-muted-foreground">
                    Used: {statDistribution.strength + statDistribution.dexterity +
                           statDistribution.intelligence + statDistribution.vitality +
                           statDistribution.luck} / {statDistribution.totalPoints}
                  </span>
                </div>
                <Input
                  type="number"
                  value={statDistribution.totalPoints}
                  onChange={(e) => setStatDistribution((prev) => ({ ...prev, totalPoints: Number(e.target.value) }))}
                />
              </div>

              {/* Stat Sliders */}
              <div className="space-y-4">
                {["strength", "dexterity", "intelligence", "vitality", "luck"].map((stat) => (
                  <div key={stat} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="capitalize">{stat}</Label>
                      <span className="text-sm font-medium">
                        {statDistribution[stat as keyof Omit<StatDistribution, "totalPoints" | "statCap" | "diminishingReturnsThreshold">]}
                        {statDistribution[stat as keyof Omit<StatDistribution, "totalPoints" | "statCap" | "diminishingReturnsThreshold">] >
                          statDistribution.diminishingReturnsThreshold && (
                          <span className="text-yellow-500 ml-2 text-xs">(Diminishing)</span>
                        )}
                      </span>
                    </div>
                    <Slider
                      value={[statDistribution[stat as keyof Omit<StatDistribution, "totalPoints" | "statCap" | "diminishingReturnsThreshold">]]}
                      onValueChange={([v]) =>
                        setStatDistribution((prev) => ({
                          ...prev,
                          [stat]: v,
                        }))
                      }
                      min={0}
                      max={statDistribution.statCap}
                      step={1}
                    />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Stat Cap</Label>
                  <Input
                    type="number"
                    value={statDistribution.statCap}
                    onChange={(e) => setStatDistribution((prev) => ({ ...prev, statCap: Number(e.target.value) }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Diminishing Returns At</Label>
                  <Input
                    type="number"
                    value={statDistribution.diminishingReturnsThreshold}
                    onChange={(e) =>
                      setStatDistribution((prev) => ({ ...prev, diminishingReturnsThreshold: Number(e.target.value) }))
                    }
                  />
                </div>
              </div>

              {/* Save Build Button */}
              <Button onClick={saveCurrentBuild} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Save Current Build
              </Button>

              {/* Saved Builds */}
              {builds.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Saved Builds</h4>
                  <div className="space-y-2">
                    {builds.map((build, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-colors",
                          selectedBuildIndex === index
                            ? "bg-primary/10 border-primary"
                            : "bg-secondary/30 border-border hover:bg-secondary/50"
                        )}
                        onClick={() => setSelectedBuildIndex(index === selectedBuildIndex ? null : index)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{build.name}</span>
                          <span className="text-sm text-muted-foreground">DPS: {build.dps}</span>
                        </div>
                        {selectedBuildIndex === index && (
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            <div>STR: {build.stats.strength}</div>
                            <div>DEX: {build.stats.dexterity}</div>
                            <div>INT: {build.stats.intelligence}</div>
                            <div>VIT: {build.stats.vitality}</div>
                            <div>LCK: {build.stats.luck}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* DPS Calculator Tab */}
            <TabsContent value="dps" className="space-y-4 mt-4">
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Base Damage</Label>
                  <Input
                    type="number"
                    value={dpsCalc.damage}
                    onChange={(e) => setDpsCalc((prev) => ({ ...prev, damage: Number(e.target.value) }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Attack Speed: {dpsCalc.attackSpeed}/sec</Label>
                  <Slider
                    value={[dpsCalc.attackSpeed]}
                    onValueChange={([v]) => setDpsCalc((prev) => ({ ...prev, attackSpeed: v }))}
                    min={0.5}
                    max={5}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Critical Chance: {dpsCalc.critChance}%</Label>
                  <Slider
                    value={[dpsCalc.critChance]}
                    onValueChange={([v]) => setDpsCalc((prev) => ({ ...prev, critChance: v }))}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Critical Damage: {dpsCalc.critDamage}%</Label>
                  <Slider
                    value={[dpsCalc.critDamage]}
                    onValueChange={([v]) => setDpsCalc((prev) => ({ ...prev, critDamage: v }))}
                    min={100}
                    max={500}
                    step={10}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hit Chance: {dpsCalc.hitChance}%</Label>
                  <Slider
                    value={[dpsCalc.hitChance]}
                    onValueChange={([v]) => setDpsCalc((prev) => ({ ...prev, hitChance: v }))}
                    min={50}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* DPS Result */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 text-center"
              >
                <div className="text-sm text-muted-foreground mb-2">Damage Per Second</div>
                <div className="text-5xl font-bold text-purple-500">
                  {calculateDPS}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Per minute: {Math.round(calculateDPS * 60)}
                </div>
              </motion.div>

              {/* Time to Kill Calculator */}
              <div className="space-y-2">
                <Label>Enemy HP (Time to Kill)</Label>
                <Input
                  type="number"
                  placeholder="Enemy HP"
                  onChange={(e) => {
                    const hp = Number(e.target.value);
                    const ttk = hp / calculateDPS;
                    console.log(`Time to kill: ${ttk.toFixed(2)}s`);
                  }}
                />
              </div>
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent value="tools" className="space-y-4 mt-4">
              {/* Encounter Difficulty */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Encounter Difficulty
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Party Level</Label>
                    <Input
                      type="number"
                      value={partyLevel}
                      onChange={(e) => setPartyLevel(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Party Size</Label>
                    <Input
                      type="number"
                      value={partySize}
                      onChange={(e) => setPartySize(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>XP Budget</Label>
                  <Input
                    type="number"
                    value={encounterXPBudget}
                    onChange={(e) => setEncounterXPBudget(Number(e.target.value))}
                  />
                </div>
                <div className={cn("p-4 rounded-lg border text-center", encounterDifficulty.color)}>
                  <div className="text-2xl font-bold">{encounterDifficulty.level}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {Math.round(encounterXPBudget / partySize)} XP per player
                  </div>
                </div>
              </div>

              {/* Drop Rate Calculator */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  Loot Drop Probability
                </h4>
                <div className="space-y-2">
                  <Label>Drop Chance: {dropChance}%</Label>
                  <Slider
                    value={[dropChance]}
                    onValueChange={([v]) => setDropChance(v)}
                    min={0.1}
                    max={100}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Number of Rolls</Label>
                  <Input
                    type="number"
                    value={numberOfRolls}
                    onChange={(e) => setNumberOfRolls(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lucky Bonus Rolls</Label>
                  <Input
                    type="number"
                    value={luckyRolls}
                    onChange={(e) => setLuckyRolls(Number(e.target.value))}
                  />
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {dropProbability.toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Probability of at least one drop
                  </div>
                </div>
              </div>

              {/* Random Encounter Generator */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Dice6 className="w-4 h-4" />
                  Quick Random Roll
                </h4>
                <Button
                  onClick={() => {
                    const roll = Math.floor(Math.random() * 20) + 1;
                    alert(`D20 Roll: ${roll}`);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Roll D20
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          {/* Balance Suggestions */}
          <div className="mt-4 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <div className="flex items-start gap-2">
              {balanceAnalysis[0] === "Balance looks good!" ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Balance Analysis</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {balanceAnalysis.map((suggestion, index) => (
                    <li key={index}>• {suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
