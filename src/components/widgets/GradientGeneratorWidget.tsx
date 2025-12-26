"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Blend, Plus, Trash2, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GradientGeneratorWidgetProps {
  widget: Widget;
}

interface ColorStop {
  id: string;
  color: string;
  position: number;
}

// Preset gradients
const GRADIENT_PRESETS = [
  {
    name: "Sunset",
    type: "linear" as const,
    angle: 90,
    colors: [
      { color: "#FF6B6B", position: 0 },
      { color: "#FFD93D", position: 50 },
      { color: "#6BCF7F", position: 100 },
    ],
  },
  {
    name: "Ocean",
    type: "linear" as const,
    angle: 135,
    colors: [
      { color: "#2E3192", position: 0 },
      { color: "#1BFFFF", position: 100 },
    ],
  },
  {
    name: "Fire",
    type: "radial" as const,
    angle: 0,
    colors: [
      { color: "#FF0000", position: 0 },
      { color: "#FFA500", position: 50 },
      { color: "#FFFF00", position: 100 },
    ],
  },
  {
    name: "Purple Haze",
    type: "linear" as const,
    angle: 45,
    colors: [
      { color: "#8E2DE2", position: 0 },
      { color: "#4A00E0", position: 100 },
    ],
  },
  {
    name: "Emerald",
    type: "linear" as const,
    angle: 180,
    colors: [
      { color: "#348F50", position: 0 },
      { color: "#56B4D3", position: 100 },
    ],
  },
  {
    name: "Rose Gold",
    type: "linear" as const,
    angle: 270,
    colors: [
      { color: "#E94057", position: 0 },
      { color: "#F27121", position: 100 },
    ],
  },
  {
    name: "Northern Lights",
    type: "linear" as const,
    angle: 90,
    colors: [
      { color: "#00C9FF", position: 0 },
      { color: "#92FE9D", position: 100 },
    ],
  },
  {
    name: "Cosmic",
    type: "radial" as const,
    angle: 0,
    colors: [
      { color: "#5F2C82", position: 0 },
      { color: "#49A09D", position: 100 },
    ],
  },
];

export function GradientGeneratorWidget({ widget }: GradientGeneratorWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config or use defaults
  const initialType = widget.config?.gradientType || "linear";
  const initialAngle = widget.config?.angle || 90;
  const initialColors = widget.config?.colors || [
    { color: "#3B82F6", position: 0 },
    { color: "#8B5CF6", position: 100 },
  ];

  const [gradientType, setGradientType] = useState<"linear" | "radial">(initialType);
  const [angle, setAngle] = useState<number>(initialAngle);
  const [colorStops, setColorStops] = useState<ColorStop[]>(() =>
    initialColors.map((stop, index) => ({
      id: `color-${index}`,
      color: stop.color,
      position: stop.position,
    }))
  );
  const [copied, setCopied] = useState(false);

  // Generate CSS gradient string
  const gradientCSS = useMemo(() => {
    const sortedStops = [...colorStops].sort((a, b) => a.position - b.position);
    const stopsString = sortedStops.map((stop) => `${stop.color} ${stop.position}%`).join(", ");

    if (gradientType === "linear") {
      return `linear-gradient(${angle}deg, ${stopsString})`;
    } else {
      return `radial-gradient(circle, ${stopsString})`;
    }
  }, [gradientType, angle, colorStops]);

  // Save config to widget store
  const saveConfig = (
    newType?: "linear" | "radial",
    newAngle?: number,
    newColors?: ColorStop[]
  ) => {
    const type = newType ?? gradientType;
    const ang = newAngle ?? angle;
    const colors = newColors ?? colorStops;

    updateWidget(widget.id, {
      config: {
        gradientType: type,
        angle: ang,
        colors: colors.map((stop) => ({ color: stop.color, position: stop.position })),
      },
    });
  };

  const handleTypeChange = (type: "linear" | "radial") => {
    setGradientType(type);
    saveConfig(type, undefined, undefined);
  };

  const handleAngleChange = (value: number[]) => {
    setAngle(value[0]);
    saveConfig(undefined, value[0], undefined);
  };

  const handleAddColorStop = () => {
    const newStop: ColorStop = {
      id: crypto.randomUUID(),
      color: "#FF0000",
      position: 50,
    };
    const newStops = [...colorStops, newStop];
    setColorStops(newStops);
    saveConfig(undefined, undefined, newStops);
  };

  const handleRemoveColorStop = (id: string) => {
    if (colorStops.length <= 2) return; // Keep at least 2 colors
    const newStops = colorStops.filter((stop) => stop.id !== id);
    setColorStops(newStops);
    saveConfig(undefined, undefined, newStops);
  };

  const handleColorChange = (id: string, color: string) => {
    const newStops = colorStops.map((stop) => (stop.id === id ? { ...stop, color } : stop));
    setColorStops(newStops);
    saveConfig(undefined, undefined, newStops);
  };

  const handlePositionChange = (id: string, position: number) => {
    const newStops = colorStops.map((stop) => (stop.id === id ? { ...stop, position } : stop));
    setColorStops(newStops);
    saveConfig(undefined, undefined, newStops);
  };

  const handleCopyCSS = async () => {
    await navigator.clipboard.writeText(gradientCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyPreset = (preset: typeof GRADIENT_PRESETS[0]) => {
    const newStops = preset.colors.map((stop, _index) => ({
      id: crypto.randomUUID(),
      color: stop.color,
      position: stop.position,
    }));

    setGradientType(preset.type);
    setAngle(preset.angle);
    setColorStops(newStops);
    saveConfig(preset.type, preset.angle, newStops);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3 @md:gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <Blend className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            CSS Gradient Generator
          </h3>
        </div>

        {/* Live Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full aspect-[2/1] @md:aspect-[3/1] rounded-lg border border-border overflow-hidden shadow-sm"
          style={{ background: gradientCSS }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-2 @sm:px-3 py-1 @sm:py-1.5 rounded-md bg-black/50 backdrop-blur-sm">
              <p className="text-[10px] @sm:text-xs @md:text-sm font-mono text-white truncate max-w-[180px] @sm:max-w-[250px] @md:max-w-full">
                {gradientCSS}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs @md:text-sm">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 @md:space-y-4 mt-2 @sm:mt-3">
            {/* Gradient Type */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Type</Label>
              <Select value={gradientType} onValueChange={(value) => handleTypeChange(value as "linear" | "radial")}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="radial">Radial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Angle Slider (only for linear) */}
            {gradientType === "linear" && (
              <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs @md:text-sm">Angle</Label>
                  <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                    {angle}°
                  </span>
                </div>
                <Slider
                  value={[angle]}
                  onValueChange={handleAngleChange}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>
            )}

            {/* Color Stops */}
            <div className="space-y-1 @sm:space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Color Stops</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddColorStop}
                  className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
                >
                  <Plus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                  Add
                </Button>
              </div>

              <div className="space-y-2 @sm:space-y-2.5 @md:space-y-3">
                <AnimatePresence mode="popLayout">
                  {colorStops
                    .sort((a, b) => a.position - b.position)
                    .map((stop) => (
                      <motion.div
                        key={stop.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="color"
                          value={stop.color}
                          onChange={(e) => handleColorChange(stop.id, e.target.value)}
                          className="w-8 h-8 @sm:w-9 @sm:h-9 @md:w-10 @md:h-10 rounded border border-border cursor-pointer"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] @sm:text-xs font-mono text-muted-foreground">
                              {stop.color.toUpperCase()}
                            </span>
                            <span className="text-[10px] @sm:text-xs font-mono text-muted-foreground">
                              {stop.position}%
                            </span>
                          </div>
                          <Slider
                            value={[stop.position]}
                            onValueChange={(value) => handlePositionChange(stop.id, value[0])}
                            min={0}
                            max={100}
                            step={1}
                            className="w-full"
                          />
                        </div>
                        {colorStops.length > 2 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveColorStop(stop.id)}
                            className="h-6 @sm:h-7 w-6 @sm:w-7 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-2 gap-2 @sm:gap-2.5 @md:gap-3">
              {GRADIENT_PRESETS.map((preset) => {
                const presetCSS =
                  preset.type === "linear"
                    ? `linear-gradient(${preset.angle}deg, ${preset.colors
                        .map((c) => `${c.color} ${c.position}%`)
                        .join(", ")})`
                    : `radial-gradient(circle, ${preset.colors
                        .map((c) => `${c.color} ${c.position}%`)
                        .join(", ")})`;

                return (
                  <motion.button
                    key={preset.name}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => applyPreset(preset)}
                    className="relative aspect-[3/2] rounded-lg border border-border overflow-hidden group cursor-pointer"
                    style={{ background: presetCSS }}
                  >
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] @sm:text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center px-2">
                        {preset.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Copy Button */}
        <Button
          onClick={handleCopyCSS}
          variant="default"
          className="w-full h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 mr-1.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 mr-1.5" />
              Copy CSS
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
