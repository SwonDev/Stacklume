"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { Sun, Copy, Check, Square, Circle, RotateCcw } from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface NeumorphismWidgetProps {
  widget: Widget;
}

type ShapeType = "flat" | "concave" | "convex" | "pressed";
type LightDirection = "top-left" | "top-right" | "bottom-left" | "bottom-right";
type PreviewShape = "square" | "circle";

interface NeumorphismConfig {
  backgroundColor: string;
  shadowDistance: number;
  blurAmount: number;
  shadowIntensity: number;
  borderRadius: number;
  elementSize: number;
  shapeType: ShapeType;
  lightDirection: LightDirection;
  previewShape: PreviewShape;
}

const defaultConfig: NeumorphismConfig = {
  backgroundColor: "#e0e5ec",
  shadowDistance: 15,
  blurAmount: 30,
  shadowIntensity: 0.15,
  borderRadius: 20,
  elementSize: 120,
  shapeType: "flat",
  lightDirection: "top-left",
  previewShape: "square",
};

// Preset configurations
const presets: Array<{ name: string; config: Partial<NeumorphismConfig> }> = [
  {
    name: "Subtle",
    config: {
      shadowDistance: 8,
      blurAmount: 16,
      shadowIntensity: 0.1,
      borderRadius: 12,
      shapeType: "flat",
    },
  },
  {
    name: "Soft",
    config: {
      shadowDistance: 15,
      blurAmount: 30,
      shadowIntensity: 0.15,
      borderRadius: 20,
      shapeType: "flat",
    },
  },
  {
    name: "Bold",
    config: {
      shadowDistance: 25,
      blurAmount: 50,
      shadowIntensity: 0.2,
      borderRadius: 25,
      shapeType: "flat",
    },
  },
  {
    name: "Pressed",
    config: {
      shadowDistance: 12,
      blurAmount: 25,
      shadowIntensity: 0.18,
      borderRadius: 16,
      shapeType: "pressed",
    },
  },
  {
    name: "Convex",
    config: {
      shadowDistance: 18,
      blurAmount: 35,
      shadowIntensity: 0.16,
      borderRadius: 22,
      shapeType: "convex",
    },
  },
  {
    name: "Concave",
    config: {
      shadowDistance: 18,
      blurAmount: 35,
      shadowIntensity: 0.16,
      borderRadius: 22,
      shapeType: "concave",
    },
  },
];

// Calculate light and dark shadow colors from background
const calculateShadowColors = (bgColor: string, intensity: number) => {
  // Parse hex color
  const hex = bgColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate lighter shadow (add white)
  const lightR = Math.min(255, r + Math.round(255 * intensity * 0.8));
  const lightG = Math.min(255, g + Math.round(255 * intensity * 0.8));
  const lightB = Math.min(255, b + Math.round(255 * intensity * 0.8));
  const lightShadow = `rgba(${lightR}, ${lightG}, ${lightB}, ${intensity * 1.5})`;

  // Calculate darker shadow (subtract, darken)
  const darkR = Math.max(0, r - Math.round(r * intensity * 2));
  const darkG = Math.max(0, g - Math.round(g * intensity * 2));
  const darkB = Math.max(0, b - Math.round(b * intensity * 2));
  const darkShadow = `rgba(${darkR}, ${darkG}, ${darkB}, ${intensity * 2})`;

  return { lightShadow, darkShadow };
};

// Generate neumorphic CSS based on configuration
const generateNeumorphicCSS = (config: NeumorphismConfig): string => {
  const { backgroundColor, shadowDistance, blurAmount, shadowIntensity, shapeType, lightDirection } = config;
  const { lightShadow, darkShadow } = calculateShadowColors(backgroundColor, shadowIntensity);

  // Determine shadow offsets based on light direction
  let lightX = 0, lightY = 0, darkX = 0, darkY = 0;

  switch (lightDirection) {
    case "top-left":
      lightX = -shadowDistance;
      lightY = -shadowDistance;
      darkX = shadowDistance;
      darkY = shadowDistance;
      break;
    case "top-right":
      lightX = shadowDistance;
      lightY = -shadowDistance;
      darkX = -shadowDistance;
      darkY = shadowDistance;
      break;
    case "bottom-left":
      lightX = -shadowDistance;
      lightY = shadowDistance;
      darkX = shadowDistance;
      darkY = -shadowDistance;
      break;
    case "bottom-right":
      lightX = shadowDistance;
      lightY = shadowDistance;
      darkX = -shadowDistance;
      darkY = -shadowDistance;
      break;
  }

  // Generate box-shadow based on shape type
  let boxShadow = "";

  switch (shapeType) {
    case "flat":
      boxShadow = `${lightX}px ${lightY}px ${blurAmount}px ${lightShadow}, ${darkX}px ${darkY}px ${blurAmount}px ${darkShadow}`;
      break;
    case "concave":
      boxShadow = `inset ${lightX}px ${lightY}px ${blurAmount}px ${lightShadow}, inset ${darkX}px ${darkY}px ${blurAmount}px ${darkShadow}`;
      break;
    case "convex":
      // Lighter on one side, darker on the other (opposite of flat)
      boxShadow = `${darkX}px ${darkY}px ${blurAmount}px ${darkShadow}, ${lightX}px ${lightY}px ${blurAmount}px ${lightShadow}`;
      break;
    case "pressed":
      boxShadow = `inset ${darkX}px ${darkY}px ${blurAmount}px ${darkShadow}, inset ${lightX}px ${lightY}px ${blurAmount * 0.8}px ${lightShadow}`;
      break;
  }

  return `background: ${backgroundColor};\nbox-shadow: ${boxShadow};`;
};

export function NeumorphismWidget({ widget }: NeumorphismWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [config, setConfig] = useState<NeumorphismConfig>(() => {
    const saved = widget.config?.neumorphismConfig as NeumorphismConfig | undefined;
    return saved?.backgroundColor ? saved : defaultConfig;
  });

  const [copied, setCopied] = useState(false);

  // Save config to store (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          neumorphismConfig: config,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [config, widget.id]);

  const cssOutput = useMemo(() => generateNeumorphicCSS(config), [config]);

  const updateConfig = (updates: Partial<NeumorphismConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handleCopyCSS = async () => {
    try {
      await navigator.clipboard.writeText(cssOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  const applyPreset = (preset: typeof presets[0]) => {
    setConfig((prev) => ({ ...prev, ...preset.config }));
  };

  const lightDirectionIcons = {
    "top-left": "↖",
    "top-right": "↗",
    "bottom-left": "↙",
    "bottom-right": "↘",
  };

  return (
    <div className="@container flex h-full flex-col gap-3 p-3 @sm:gap-4 @sm:p-4 @md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 @sm:h-8 @sm:w-8">
            <Sun className="h-3.5 w-3.5 text-primary @sm:h-4 @sm:w-4" />
          </div>
          <h3 className="text-xs font-semibold @sm:text-sm">Neumorphism Generator</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-7 w-7 @sm:h-8 @sm:w-8"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
        </Button>
      </div>

      {/* Live Preview */}
      <div
        className="flex min-h-[140px] items-center justify-center rounded-lg border p-6 @sm:min-h-[160px] @sm:p-8 @md:min-h-[180px]"
        style={{ backgroundColor: config.backgroundColor }}
      >
        <motion.div
          layout
          className={cn(
            "transition-all duration-200",
            config.previewShape === "circle" ? "rounded-full" : ""
          )}
          style={{
            width: `${config.elementSize}px`,
            height: `${config.elementSize}px`,
            backgroundColor: config.backgroundColor,
            borderRadius: config.previewShape === "circle" ? "50%" : `${config.borderRadius}px`,
            boxShadow: generateNeumorphicCSS(config).split("\n")[1].replace("box-shadow: ", "").replace(";", ""),
          }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Tabs for Controls and Presets */}
      <Tabs defaultValue="controls" className="flex flex-1 flex-col overflow-hidden">
        <TabsList className="grid h-8 w-full grid-cols-2 @sm:h-9">
          <TabsTrigger value="controls" className="text-xs @sm:text-sm">
            Controls
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs @sm:text-sm">
            Presets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="mt-3 flex-1 space-y-3 overflow-y-auto @sm:space-y-4">
          {/* Background Color */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Background Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded border bg-background @sm:h-10"
              />
              <span className="flex h-9 items-center text-xs text-muted-foreground tabular-nums @sm:h-10">
                {config.backgroundColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Shape Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Shape Type</Label>
            <Select
              value={config.shapeType}
              onValueChange={(value: ShapeType) => updateConfig({ shapeType: value })}
            >
              <SelectTrigger className="h-8 text-xs @sm:h-9 @sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="flat">Flat (Raised)</SelectItem>
                <SelectItem value="concave">Concave (Inset)</SelectItem>
                <SelectItem value="convex">Convex (Pushed)</SelectItem>
                <SelectItem value="pressed">Pressed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Preview Shape Toggle */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Preview Shape</Label>
            <ToggleGroup
              type="single"
              value={config.previewShape}
              onValueChange={(value: PreviewShape) => value && updateConfig({ previewShape: value })}
              className="justify-start"
            >
              <ToggleGroupItem value="square" aria-label="Square" className="h-8 px-3 @sm:h-9">
                <Square className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="circle" aria-label="Circle" className="h-8 px-3 @sm:h-9">
                <Circle className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Light Direction */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Light Source</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(lightDirectionIcons) as LightDirection[]).map((direction) => (
                <Button
                  key={direction}
                  variant={config.lightDirection === direction ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig({ lightDirection: direction })}
                  className="h-8 text-xs @sm:h-9"
                >
                  <span className="mr-1.5 text-base">{lightDirectionIcons[direction]}</span>
                  {direction.split("-").map(w => w[0].toUpperCase() + w.slice(1)).join(" ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Shadow Distance */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Shadow Distance</Label>
              <span className="text-xs text-muted-foreground">{config.shadowDistance}px</span>
            </div>
            <Slider
              value={[config.shadowDistance]}
              onValueChange={(value) => updateConfig({ shadowDistance: value[0] })}
              min={5}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          {/* Blur Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Blur Amount</Label>
              <span className="text-xs text-muted-foreground">{config.blurAmount}px</span>
            </div>
            <Slider
              value={[config.blurAmount]}
              onValueChange={(value) => updateConfig({ blurAmount: value[0] })}
              min={10}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Shadow Intensity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Shadow Intensity</Label>
              <span className="text-xs text-muted-foreground">
                {(config.shadowIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              value={[config.shadowIntensity * 100]}
              onValueChange={(value) => updateConfig({ shadowIntensity: value[0] / 100 })}
              min={5}
              max={40}
              step={1}
              className="w-full"
            />
          </div>

          {/* Border Radius */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Border Radius</Label>
              <span className="text-xs text-muted-foreground">{config.borderRadius}px</span>
            </div>
            <Slider
              value={[config.borderRadius]}
              onValueChange={(value) => updateConfig({ borderRadius: value[0] })}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          {/* Element Size */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">Element Size</Label>
              <span className="text-xs text-muted-foreground">{config.elementSize}px</span>
            </div>
            <Slider
              value={[config.elementSize]}
              onValueChange={(value) => updateConfig({ elementSize: value[0] })}
              min={60}
              max={200}
              step={5}
              className="w-full"
            />
          </div>
        </TabsContent>

        <TabsContent value="presets" className="mt-3 flex-1 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
            {presets.map((preset) => {
              const presetConfig = { ...config, ...preset.config };
              const previewCSS = generateNeumorphicCSS(presetConfig);
              const boxShadow = previewCSS.split("\n")[1].replace("box-shadow: ", "").replace(";", "");

              return (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyPreset(preset)}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-lg border border-border p-3 hover:bg-accent/50"
                  style={{ backgroundColor: presetConfig.backgroundColor }}
                >
                  <div
                    className="h-12 w-12 rounded-lg @sm:h-14 @sm:w-14"
                    style={{
                      backgroundColor: presetConfig.backgroundColor,
                      borderRadius: `${presetConfig.borderRadius}px`,
                      boxShadow,
                    }}
                  />
                  <span className="text-xs font-medium">{preset.name}</span>
                </motion.button>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* CSS Output & Copy */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">Generated CSS</Label>
        <div className="flex items-start gap-2">
          <code className="flex-1 overflow-x-auto rounded-md border bg-muted px-2.5 py-2 text-[10px] @sm:px-3 @sm:text-xs">
            {cssOutput}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopyCSS}
            className="h-9 w-9 shrink-0"
            title="Copy CSS"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
