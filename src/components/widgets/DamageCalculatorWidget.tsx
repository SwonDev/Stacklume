"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "motion/react";
import {
  Sword,
  Calculator,
  Zap,
  Copy,
  Code2,
  Download,
  Flame,
  Snowflake,
  Activity,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Play,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DamageCalculatorWidgetProps {
  widget: Widget;
}

type DamageType = "physical" | "magical" | "true";
type ElementType = "none" | "fire" | "ice" | "lightning" | "poison" | "holy" | "dark";
type FormulaPreset =
  | "simple"
  | "pokemon"
  | "dark-souls"
  | "percentage"
  | "final-fantasy"
  | "custom";

interface FormulaVariables {
  ATK: number;
  DEF: number;
  LVL: number;
  STR: number;
  DEX: number;
  INT: number;
  Power: number;
  Scaling: number;
}

interface DamageModifiers {
  critMultiplier: number;
  variance: number;
  elementalBonus: number;
  resistanceMultiplier: number;
  damageType: DamageType;
  elementType: ElementType;
}

interface DamageResult {
  min: number;
  max: number;
  average: number;
  withCrit: number;
}

interface ScenarioTest {
  id: string;
  name: string;
  variables: FormulaVariables;
  result: number;
}

// Formula presets with their expressions
const FORMULA_PRESETS: Record<FormulaPreset, { formula: string; description: string }> = {
  simple: {
    formula: "ATK - DEF",
    description: "Basic subtraction formula",
  },
  pokemon: {
    formula: "((2*LVL/5+2)*Power*ATK/DEF/50+2)",
    description: "Pokemon-style damage calculation",
  },
  "dark-souls": {
    formula: "ATK * (1 + Scaling/100) - DEF * 0.75",
    description: "Dark Souls with scaling",
  },
  percentage: {
    formula: "ATK * (100/(100+DEF))",
    description: "Percentage-based damage reduction",
  },
  "final-fantasy": {
    formula: "(ATK * ATK / DEF) * (LVL + STR) / 256",
    description: "Final Fantasy-inspired formula",
  },
  custom: {
    formula: "",
    description: "Write your own formula",
  },
};

export function DamageCalculatorWidget({ widget: _widget }: DamageCalculatorWidgetProps) {
  // Note: Don't destructure store - access via .getState() when needed
  // const updateWidget = useWidgetStore.getState().updateWidget;

  // Formula state
  const [preset, setPreset] = useState<FormulaPreset>("simple");
  const [customFormula, setCustomFormula] = useState("ATK - DEF");
  // Note: Formula error is now derived from damageResult.error instead of state

  // Variables state
  const [variables, setVariables] = useState<FormulaVariables>({
    ATK: 100,
    DEF: 50,
    LVL: 10,
    STR: 50,
    DEX: 40,
    INT: 30,
    Power: 80,
    Scaling: 50,
  });

  // Modifiers state
  const [modifiers, setModifiers] = useState<DamageModifiers>({
    critMultiplier: 2.0,
    variance: 10,
    elementalBonus: 0,
    resistanceMultiplier: 1.0,
    damageType: "physical",
    elementType: "none",
  });

  // Advanced settings
  const [attackSpeed, setAttackSpeed] = useState(1.5);
  const [critChance, setCritChance] = useState(25);
  const [enableVariance, setEnableVariance] = useState(false);

  // Scenario testing
  const [scenarios, setScenarios] = useState<ScenarioTest[]>([]);
  const [graphData, setGraphData] = useState<Array<{ def: number; dmg: number }>>([]);

  // Get active formula
  const activeFormula = useMemo(() => {
    if (preset === "custom") return customFormula;
    return FORMULA_PRESETS[preset].formula;
  }, [preset, customFormula]);

  // Safely evaluate formula - returns { value, error } to avoid setState during render
  const evaluateFormula = useCallback(
    (formula: string, vars: FormulaVariables): { value: number; error: string } => {
      try {
        // Replace variable names with their values
        let expression = formula;
        Object.entries(vars).forEach(([key, value]) => {
          expression = expression.replace(new RegExp(key, "g"), value.toString());
        });

        // Evaluate the expression safely
         
        const result = Function(`'use strict'; return (${expression})`)();

        if (typeof result !== "number" || isNaN(result)) {
          throw new Error("Invalid result");
        }

        return { value: Math.max(0, Math.round(result)), error: "" };
      } catch (error) {
        return {
          value: 0,
          error: `Formula error: ${error instanceof Error ? error.message : "Invalid expression"}`
        };
      }
    },
    []
  );

  // Calculate damage with all modifiers - returns DamageResult & error string
  const calculateDamage = useCallback(
    (vars: FormulaVariables, withCrit = false): DamageResult & { error: string } => {
      const { value: baseDamage, error } = evaluateFormula(activeFormula, vars);

      // Apply type effectiveness
      let damage = baseDamage;

      // Apply elemental bonus
      if (modifiers.elementalBonus !== 0) {
        damage += (damage * modifiers.elementalBonus) / 100;
      }

      // Apply resistance
      damage *= modifiers.resistanceMultiplier;

      // Apply variance
      const varianceAmount = enableVariance ? (damage * modifiers.variance) / 100 : 0;
      const min = Math.max(1, Math.round(damage - varianceAmount));
      const max = Math.round(damage + varianceAmount);
      const average = Math.round((min + max) / 2);

      // Critical hit
      const critDamage = Math.round(average * modifiers.critMultiplier);

      return {
        min,
        max,
        average: withCrit ? critDamage : average,
        withCrit: critDamage,
        error,
      };
    },
    [activeFormula, modifiers, enableVariance, evaluateFormula]
  );

  // Calculate DPS
  const calculateDPS = useMemo(() => {
    const result = calculateDamage(variables);
    const critRate = critChance / 100;
    const avgDamagePerHit = result.average * (1 - critRate) + result.withCrit * critRate;
    const dps = avgDamagePerHit * attackSpeed;
    return Math.round(dps * 10) / 10;
  }, [variables, attackSpeed, critChance, calculateDamage]);

  // Generate damage vs defense graph
  const generateGraph = useCallback(() => {
    const data: Array<{ def: number; dmg: number }> = [];
    const startDef = Math.max(0, variables.DEF - 50);
    const endDef = variables.DEF + 50;
    const step = 5;

    for (let def = startDef; def <= endDef; def += step) {
      const testVars = { ...variables, DEF: def };
      const result = calculateDamage(testVars);
      data.push({ def, dmg: result.average });
    }

    setGraphData(data);
  }, [variables, calculateDamage]);

  // Update graph when relevant values change
  useEffect(() => {
    generateGraph();
  }, [generateGraph]);

  // Apply preset
  const applyPreset = useCallback((presetName: FormulaPreset) => {
    setPreset(presetName);
    if (presetName !== "custom") {
      setCustomFormula(FORMULA_PRESETS[presetName].formula);
    }
    // Note: Error state is now derived from damageResult.error
  }, []);

  // Export formula
  const exportFormula = useCallback(
    (format: "javascript" | "json") => {
      if (format === "javascript") {
        const code = `function calculateDamage(ATK, DEF, LVL, STR, DEX, INT, Power, Scaling) {
  const baseDamage = ${activeFormula};
  const variance = ${modifiers.variance}; // percentage
  const critMultiplier = ${modifiers.critMultiplier};

  // Apply modifiers
  let damage = baseDamage;
  damage += (damage * ${modifiers.elementalBonus}) / 100; // Elemental bonus
  damage *= ${modifiers.resistanceMultiplier}; // Resistance

  // Random variance
  const varianceAmount = (damage * variance) / 100;
  const finalDamage = damage + (Math.random() * varianceAmount * 2 - varianceAmount);

  return Math.max(1, Math.round(finalDamage));
}

// Example usage:
const damage = calculateDamage(${variables.ATK}, ${variables.DEF}, ${variables.LVL}, ${variables.STR}, ${variables.DEX}, ${variables.INT}, ${variables.Power}, ${variables.Scaling});
console.log("Damage:", damage);`;
        navigator.clipboard.writeText(code);
      } else {
        const config = {
          formula: activeFormula,
          preset: preset,
          variables: variables,
          modifiers: modifiers,
          settings: {
            attackSpeed,
            critChance,
            enableVariance,
          },
        };
        navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      }
    },
    [activeFormula, preset, variables, modifiers, attackSpeed, critChance, enableVariance]
  );

  // Save scenario
  const saveScenario = useCallback(() => {
    const result = calculateDamage(variables);
    const newScenario: ScenarioTest = {
      id: Date.now().toString(),
      name: `Scenario ${scenarios.length + 1}`,
      variables: { ...variables },
      result: result.average,
    };
    setScenarios([...scenarios, newScenario]);
  }, [scenarios, variables, calculateDamage]);

  // Test all scenarios
  const testAllScenarios = useCallback(() => {
    const updatedScenarios = scenarios.map((scenario) => {
      const result = calculateDamage(scenario.variables);
      return { ...scenario, result: result.average };
    });
    setScenarios(updatedScenarios);
  }, [scenarios, calculateDamage]);

  const damageResult = useMemo(() => calculateDamage(variables), [variables, calculateDamage]);

  // Element icon
  const _getElementIcon = (element: ElementType) => {
    switch (element) {
      case "fire":
        return <Flame className="w-4 h-4" />;
      case "ice":
        return <Snowflake className="w-4 h-4" />;
      case "lightning":
        return <Zap className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="h-full w-full @container">
      <ScrollArea className="h-full w-full">
        <div className="p-3 @xs:p-4 space-y-3 @xs:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-500" />
              <h3 className="font-bold text-lg">Damage Calculator</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportFormula("javascript")}
                className="text-xs"
              >
                <Code2 className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => exportFormula("json")}
                className="text-xs"
              >
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs defaultValue="formula" className="w-full">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="formula" className="text-xs @sm:text-sm">
                Formula
              </TabsTrigger>
              <TabsTrigger value="variables" className="text-xs @sm:text-sm">
                Variables
              </TabsTrigger>
              <TabsTrigger value="modifiers" className="text-xs @sm:text-sm">
                Modifiers
              </TabsTrigger>
              <TabsTrigger value="advanced" className="text-xs @sm:text-sm">
                Advanced
              </TabsTrigger>
            </TabsList>

            {/* Formula Tab */}
            <TabsContent value="formula" className="space-y-4 mt-4">
              {/* Preset Selector */}
              <div className="space-y-2">
                <Label>Formula Preset</Label>
                <Select value={preset} onValueChange={(v) => applyPreset(v as FormulaPreset)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple (ATK - DEF)</SelectItem>
                    <SelectItem value="pokemon">Pokemon Style</SelectItem>
                    <SelectItem value="dark-souls">Dark Souls</SelectItem>
                    <SelectItem value="percentage">Percentage Reduction</SelectItem>
                    <SelectItem value="final-fantasy">Final Fantasy</SelectItem>
                    <SelectItem value="custom">Custom Formula</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {FORMULA_PRESETS[preset].description}
                </p>
              </div>

              {/* Formula Editor */}
              <div className="space-y-2">
                <Label>Formula Expression</Label>
                <Textarea
                  value={preset === "custom" ? customFormula : FORMULA_PRESETS[preset].formula}
                  onChange={(e) => {
                    setCustomFormula(e.target.value);
                    if (preset !== "custom") setPreset("custom");
                  }}
                  placeholder="Enter formula using: ATK, DEF, LVL, STR, DEX, INT, Power, Scaling"
                  className="font-mono text-sm min-h-[100px] bg-secondary/30"
                  spellCheck={false}
                />
                {damageResult.error && (
                  <p className="text-xs text-destructive">{damageResult.error}</p>
                )}
              </div>

              {/* Available Variables Reference */}
              <div className="p-3 bg-secondary/30 rounded-lg border text-xs space-y-2">
                <p className="font-semibold">Available Variables:</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><code className="text-primary">ATK</code> - Attack Power</div>
                  <div><code className="text-primary">DEF</code> - Defense</div>
                  <div><code className="text-primary">LVL</code> - Level</div>
                  <div><code className="text-primary">STR</code> - Strength</div>
                  <div><code className="text-primary">DEX</code> - Dexterity</div>
                  <div><code className="text-primary">INT</code> - Intelligence</div>
                  <div><code className="text-primary">Power</code> - Move Power</div>
                  <div><code className="text-primary">Scaling</code> - Scaling %</div>
                </div>
                <p className="text-muted-foreground pt-2">
                  Use standard math operators: + - * / ( ) and functions like Math.pow, Math.sqrt
                </p>
              </div>

              {/* Quick Test Button */}
              <Button onClick={generateGraph} className="w-full" variant="outline">
                <Play className="w-4 h-4 mr-2" />
                Test Formula
              </Button>
            </TabsContent>

            {/* Variables Tab */}
            <TabsContent value="variables" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(variables).map(([key, value]) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-xs font-mono">{key}: {value}</Label>
                    <Slider
                      value={[value]}
                      onValueChange={([v]) =>
                        setVariables((prev) => ({ ...prev, [key]: v }))
                      }
                      min={0}
                      max={key === "LVL" ? 100 : 200}
                      step={1}
                      className="py-1"
                    />
                  </div>
                ))}
              </div>

              {/* Damage Display */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20"
              >
                <div className="text-center space-y-3">
                  <div>
                    <div className="text-sm text-muted-foreground">Base Damage</div>
                    <div className="text-4xl font-bold text-blue-500">
                      {damageResult.average}
                    </div>
                  </div>
                  {enableVariance && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Min</div>
                        <div className="text-xl font-bold text-green-500">
                          {damageResult.min}
                        </div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Max</div>
                        <div className="text-xl font-bold text-orange-500">
                          {damageResult.max}
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm text-muted-foreground">Critical Hit</div>
                    <div className="text-3xl font-bold text-red-500">
                      {damageResult.withCrit}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={saveScenario}
                  className="flex-1"
                  size="sm"
                  variant="outline"
                >
                  <Download className="w-3 h-3 mr-2" />
                  Save Scenario
                </Button>
                <Button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(variables))}
                  size="sm"
                  variant="outline"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </TabsContent>

            {/* Modifiers Tab */}
            <TabsContent value="modifiers" className="space-y-4 mt-4">
              {/* Damage Type */}
              <div className="space-y-2">
                <Label>Damage Type</Label>
                <Select
                  value={modifiers.damageType}
                  onValueChange={(v: DamageType) =>
                    setModifiers((prev) => ({ ...prev, damageType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">
                      <div className="flex items-center gap-2">
                        <Sword className="w-4 h-4" />
                        Physical
                      </div>
                    </SelectItem>
                    <SelectItem value="magical">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        Magical
                      </div>
                    </SelectItem>
                    <SelectItem value="true">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        True Damage
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Element Type */}
              <div className="space-y-2">
                <Label>Element Type</Label>
                <Select
                  value={modifiers.elementType}
                  onValueChange={(v: ElementType) =>
                    setModifiers((prev) => ({ ...prev, elementType: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="fire">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-red-500" />
                        Fire
                      </div>
                    </SelectItem>
                    <SelectItem value="ice">
                      <div className="flex items-center gap-2">
                        <Snowflake className="w-4 h-4 text-blue-400" />
                        Ice
                      </div>
                    </SelectItem>
                    <SelectItem value="lightning">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        Lightning
                      </div>
                    </SelectItem>
                    <SelectItem value="poison">Poison</SelectItem>
                    <SelectItem value="holy">Holy</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Critical Multiplier */}
              <div className="space-y-2">
                <Label>Critical Multiplier: {modifiers.critMultiplier}x</Label>
                <Slider
                  value={[modifiers.critMultiplier]}
                  onValueChange={([v]) =>
                    setModifiers((prev) => ({ ...prev, critMultiplier: v }))
                  }
                  min={1.5}
                  max={5}
                  step={0.1}
                />
              </div>

              {/* Variance */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Random Variance: {modifiers.variance}%</Label>
                  <Switch
                    checked={enableVariance}
                    onCheckedChange={setEnableVariance}
                  />
                </div>
                <Slider
                  value={[modifiers.variance]}
                  onValueChange={([v]) =>
                    setModifiers((prev) => ({ ...prev, variance: v }))
                  }
                  min={0}
                  max={50}
                  step={1}
                  disabled={!enableVariance}
                />
              </div>

              {/* Elemental Bonus */}
              <div className="space-y-2">
                <Label>Elemental Bonus: {modifiers.elementalBonus}%</Label>
                <Slider
                  value={[modifiers.elementalBonus]}
                  onValueChange={([v]) =>
                    setModifiers((prev) => ({ ...prev, elementalBonus: v }))
                  }
                  min={-100}
                  max={200}
                  step={5}
                />
                <p className="text-xs text-muted-foreground">
                  {modifiers.elementalBonus > 0
                    ? "Weak to element (2x = +100%)"
                    : modifiers.elementalBonus < 0
                    ? "Resistant to element"
                    : "Neutral"}
                </p>
              </div>

              {/* Resistance */}
              <div className="space-y-2">
                <Label>Resistance Multiplier: {modifiers.resistanceMultiplier}x</Label>
                <Slider
                  value={[modifiers.resistanceMultiplier]}
                  onValueChange={([v]) =>
                    setModifiers((prev) => ({ ...prev, resistanceMultiplier: v }))
                  }
                  min={0}
                  max={2}
                  step={0.05}
                />
              </div>
            </TabsContent>

            {/* Advanced Tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
              {/* DPS Calculator */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  DPS Calculator
                </h4>

                <div className="space-y-2">
                  <Label>Attack Speed: {attackSpeed}/sec</Label>
                  <Slider
                    value={[attackSpeed]}
                    onValueChange={([v]) => setAttackSpeed(v)}
                    min={0.5}
                    max={5}
                    step={0.1}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Critical Chance: {critChance}%</Label>
                  <Slider
                    value={[critChance]}
                    onValueChange={([v]) => setCritChance(v)}
                    min={0}
                    max={100}
                    step={1}
                  />
                </div>

                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-4 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20 text-center"
                >
                  <div className="text-sm text-muted-foreground mb-1">Damage Per Second</div>
                  <div className="text-4xl font-bold text-purple-500">{calculateDPS}</div>
                  <div className="text-xs text-muted-foreground mt-2">
                    Per minute: {Math.round(calculateDPS * 60)}
                  </div>
                </motion.div>
              </div>

              {/* Damage vs Defense Graph */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Damage vs Defense Curve
                  </h4>
                  <Button size="sm" variant="ghost" onClick={generateGraph}>
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
                <div className="h-32 bg-secondary/30 rounded-lg p-3 flex items-end gap-1">
                  {graphData.map((point, i) => {
                    const maxDmg = Math.max(...graphData.map((p) => p.dmg));
                    const height = (point.dmg / maxDmg) * 100;
                    const isCenter = point.def === variables.DEF;
                    return (
                      <div
                        key={i}
                        className={cn(
                          "flex-1 rounded-t transition-all",
                          isCenter ? "bg-primary" : "bg-blue-500/50"
                        )}
                        style={{ height: `${height}%` }}
                        title={`DEF ${point.def}: ${point.dmg} dmg`}
                      />
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  DEF range: {graphData[0]?.def} - {graphData[graphData.length - 1]?.def}
                </p>
              </div>

              {/* Batch Scenarios */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Saved Scenarios ({scenarios.length})
                  </h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={testAllScenarios}
                    disabled={scenarios.length === 0}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Test All
                  </Button>
                </div>

                {scenarios.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className="p-2 bg-secondary/30 rounded border flex items-center justify-between text-xs"
                      >
                        <span className="font-medium">{scenario.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">
                            ATK:{scenario.variables.ATK} DEF:{scenario.variables.DEF}
                          </span>
                          <span className="font-bold text-primary">
                            {scenario.result}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-muted-foreground bg-secondary/20 rounded-lg border border-dashed">
                    No saved scenarios. Save current values from the Variables tab.
                  </div>
                )}
              </div>

              {/* Stat Comparison */}
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Quick Comparison</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-green-500/10 rounded border border-green-500/20">
                    <div className="text-muted-foreground">ATK +10%</div>
                    <div className="font-bold text-green-500">
                      {calculateDamage({ ...variables, ATK: variables.ATK * 1.1 }).average}
                    </div>
                  </div>
                  <div className="p-2 bg-blue-500/10 rounded border border-blue-500/20">
                    <div className="text-muted-foreground">DEF -10%</div>
                    <div className="font-bold text-blue-500">
                      {calculateDamage({ ...variables, DEF: variables.DEF * 0.9 }).average}
                    </div>
                  </div>
                  <div className="p-2 bg-purple-500/10 rounded border border-purple-500/20">
                    <div className="text-muted-foreground">Scaling +20</div>
                    <div className="font-bold text-purple-500">
                      {calculateDamage({ ...variables, Scaling: variables.Scaling + 20 }).average}
                    </div>
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded border border-orange-500/20">
                    <div className="text-muted-foreground">Power +20</div>
                    <div className="font-bold text-orange-500">
                      {calculateDamage({ ...variables, Power: variables.Power + 20 }).average}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </ScrollArea>
    </div>
  );
}
