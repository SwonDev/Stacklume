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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Palette,
  Download,
  RefreshCw,
  Star,
  Trash2,
  Plus,
  Eye,
  Lightbulb,
  Moon,
  Sun,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface ColorRampWidgetProps {
  widget: Widget;
}

interface ColorRamp {
  id: string;
  name: string;
  baseColor: string;
  colors: string[];
  style: RampStyle;
  count: number;
  hueShift: number;
  temperature: number;
  isFavorite: boolean;
  createdAt: string;
}

interface ColorRampConfig {
  savedRamps?: ColorRamp[];
  currentRamp?: ColorRamp;
}

type RampStyle = "linear" | "hue-shift" | "saturation-shift" | "luminosity";
type ExportFormat = "array" | "css" | "tailwind" | "json";

// Preset game palettes
const PRESET_PALETTES = [
  {
    name: "NES",
    colors: ["#000000", "#740F07", "#AB1304", "#F62817", "#FF6037", "#FF9966", "#FFD1AA", "#FFFFFF"],
    description: "Classic 8-bit NES palette",
  },
  {
    name: "Game Boy",
    colors: ["#0F380F", "#306230", "#8BAC0F", "#9BBC0F"],
    description: "Iconic Game Boy green screen",
  },
  {
    name: "PICO-8",
    colors: ["#000000", "#1D2B53", "#7E2553", "#AB5236", "#FF004D", "#FFA300", "#FFEC27", "#00E436"],
    description: "PICO-8 fantasy console",
  },
  {
    name: "CGA",
    colors: ["#000000", "#555555", "#AA0000", "#AA5500", "#AAAA00", "#00AA00", "#00AAAA", "#AAAAAA"],
    description: "IBM CGA graphics",
  },
  {
    name: "C64",
    colors: ["#000000", "#433900", "#6D5412", "#A77A1B", "#D8A958", "#E1BC7B", "#F3D29A", "#FFFFFF"],
    description: "Commodore 64 classic",
  },
  {
    name: "Arcade Fire",
    colors: ["#2A0B38", "#7E2072", "#CD3B62", "#EE6B6B", "#FCA967", "#FDE07C", "#FFFFFF"],
    description: "Warm arcade cabinet glow",
  },
];

// Color conversion utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return { r: r * 255, g: g * 255, b: b * 255 };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHsl(r, g, b);
}

function hslToHex(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// Generate color ramp based on style
function generateColorRamp(
  baseColor: string,
  count: number,
  style: RampStyle,
  hueShift: number,
  temperature: number
): string[] {
  const { h, s, l } = hexToHsl(baseColor);
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1 || 1);

    switch (style) {
      case "linear": {
        const newL = l * (0.2 + 0.8 * t);
        const tempShift = temperature * (t - 0.5);
        colors.push(hslToHex((h + tempShift + 360) % 360, s, newL));
        break;
      }

      case "hue-shift": {
        const newH = (h + hueShift * t + 360) % 360;
        const newL = l * (0.3 + 0.7 * t);
        const tempShift = temperature * (t - 0.5);
        colors.push(hslToHex((newH + tempShift + 360) % 360, s, newL));
        break;
      }

      case "saturation-shift": {
        const newS = s * (0.4 + 0.6 * t);
        const newL = l * (0.2 + 0.8 * t);
        const tempShift = temperature * (t - 0.5);
        colors.push(hslToHex((h + tempShift + 360) % 360, newS, newL));
        break;
      }

      case "luminosity": {
        const curve = Math.pow(t, 1.2);
        const newL = 10 + 80 * curve;
        const newS = s * (0.6 + 0.4 * (1 - Math.abs(t - 0.5) * 2));
        const tempShift = temperature * (t - 0.5);
        colors.push(hslToHex((h + tempShift + 360) % 360, newS, newL));
        break;
      }
    }
  }

  return colors;
}

// Generate ambient/shadow suggestions
function generateAmbientColors(baseColor: string): { ambient: string; shadow: string } {
  const { h, s, l } = hexToHsl(baseColor);

  // Ambient light: slightly warmer, more saturated, lighter
  const ambientH = (h + 15) % 360;
  const ambientS = Math.min(100, s * 1.2);
  const ambientL = Math.min(95, l * 1.3);

  // Shadow: cooler, less saturated, darker
  const shadowH = (h - 20 + 360) % 360;
  const shadowS = s * 0.6;
  const shadowL = l * 0.4;

  return {
    ambient: hslToHex(ambientH, ambientS, ambientL),
    shadow: hslToHex(shadowH, shadowS, shadowL),
  };
}

export function ColorRampWidget({ widget }: ColorRampWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config
  const config = widget.config as ColorRampConfig | undefined;
  const savedRamps = config?.savedRamps || [];

  const [baseColor, setBaseColor] = useState(config?.currentRamp?.baseColor || "#FF6B6B");
  const [rampStyle, setRampStyle] = useState<RampStyle>(
    config?.currentRamp?.style || "linear"
  );
  const [colorCount, setColorCount] = useState(config?.currentRamp?.count || 6);
  const [hueShift, setHueShift] = useState(config?.currentRamp?.hueShift || 60);
  const [temperature, setTemperature] = useState(config?.currentRamp?.temperature || 0);
  const [_copiedValue, setCopiedValue] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"swatches" | "gradient">("swatches");
  const [activeTab, setActiveTab] = useState("generator");
  const [ramps, setRamps] = useState<ColorRamp[]>(savedRamps);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Generate current ramp
  const currentColors = useMemo(
    () => generateColorRamp(baseColor, colorCount, rampStyle, hueShift, temperature),
    [baseColor, colorCount, rampStyle, hueShift, temperature]
  );

  // Generate ambient/shadow for selected color
  const ambientShadow = useMemo(
    () => (selectedColor ? generateAmbientColors(selectedColor) : null),
    [selectedColor]
  );

  // Generate gradient CSS
  const gradientCSS = useMemo(() => {
    const stops = currentColors.map((color, idx) => {
      const position = (idx / (currentColors.length - 1)) * 100;
      return `${color} ${position}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }, [currentColors]);

  // Save config to widget store
  const saveConfig = () => {
    const currentRamp: ColorRamp = {
      id: Date.now().toString(),
      name: `Ramp ${ramps.length + 1}`,
      baseColor,
      colors: currentColors,
      style: rampStyle,
      count: colorCount,
      hueShift,
      temperature,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    updateWidget(widget.id, {
      config: {
        savedRamps: ramps,
        currentRamp,
      },
    });
  };

  const handleCopyColor = async (color: string, format: "hex" | "rgb") => {
    let text = color;
    if (format === "rgb") {
      const { r, g, b } = hexToRgb(color);
      text = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    }

    await navigator.clipboard.writeText(text);
    setCopiedValue(color);
    toast.success("Copied to clipboard", {
      description: `${format.toUpperCase()}: ${text}`,
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const handleExport = (format: ExportFormat) => {
    let output = "";

    switch (format) {
      case "array":
        output = `const ramp = [${currentColors.map((c) => `"${c}"`).join(", ")}];`;
        break;

      case "css":
        output = ":root {\n";
        currentColors.forEach((color, idx) => {
          output += `  --ramp-${idx + 1}: ${color};\n`;
        });
        output += "}";
        break;

      case "tailwind":
        output = "module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        ramp: {\n";
        currentColors.forEach((color, idx) => {
          output += `          ${(idx + 1) * 100}: '${color}',\n`;
        });
        output += "        },\n      },\n    },\n  },\n}";
        break;

      case "json":
        output = JSON.stringify(
          {
            name: "Color Ramp",
            baseColor,
            style: rampStyle,
            colors: currentColors,
          },
          null,
          2
        );
        break;
    }

    navigator.clipboard.writeText(output);
    toast.success("Exported to clipboard", {
      description: `${format.toUpperCase()} format`,
    });
  };

  const handleSaveRamp = () => {
    const newRamp: ColorRamp = {
      id: Date.now().toString(),
      name: `Ramp ${ramps.length + 1}`,
      baseColor,
      colors: currentColors,
      style: rampStyle,
      count: colorCount,
      hueShift,
      temperature,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    const updatedRamps = [...ramps, newRamp];
    setRamps(updatedRamps);
    updateWidget(widget.id, {
      config: {
        savedRamps: updatedRamps,
        currentRamp: newRamp,
      },
    });
    toast.success("Ramp saved", {
      description: newRamp.name,
    });
  };

  const handleLoadRamp = (ramp: ColorRamp) => {
    setBaseColor(ramp.baseColor);
    setRampStyle(ramp.style);
    setColorCount(ramp.count);
    setHueShift(ramp.hueShift);
    setTemperature(ramp.temperature);
    setActiveTab("generator");
    toast.success("Ramp loaded");
  };

  const handleDeleteRamp = (id: string) => {
    const updatedRamps = ramps.filter((r) => r.id !== id);
    setRamps(updatedRamps);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        savedRamps: updatedRamps,
      },
    });
    toast.success("Ramp deleted");
  };

  const handleToggleFavorite = (id: string) => {
    const updatedRamps = ramps.map((r) => (r.id === id ? { ...r, isFavorite: !r.isFavorite } : r));
    setRamps(updatedRamps);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        savedRamps: updatedRamps,
      },
    });
  };

  const handleApplyPreset = (preset: typeof PRESET_PALETTES[0]) => {
    const middleIdx = Math.floor(preset.colors.length / 2);
    setBaseColor(preset.colors[middleIdx]);
    setColorCount(preset.colors.length);
    setRampStyle("linear");
    toast.success("Preset applied", {
      description: preset.name,
    });
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 rounded-lg bg-primary/10">
              <Palette className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm font-semibold text-foreground">Color Ramp</h3>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant={viewMode === "swatches" ? "default" : "ghost"}
              className="h-6 w-6 @sm:h-7 @sm:w-7"
              onClick={() => setViewMode("swatches")}
            >
              <Eye className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={viewMode === "gradient" ? "default" : "ghost"}
              className="h-6 w-6 @sm:h-7 @sm:w-7"
              onClick={() => setViewMode("gradient")}
            >
              <Palette className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full rounded-lg border border-border overflow-hidden shadow-sm"
        >
          {viewMode === "swatches" ? (
            <div className="flex h-16 @sm:h-20 @md:h-24">
              {currentColors.map((color, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.05, zIndex: 10 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 relative group transition-all"
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  title={color}
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {selectedColor === color && (
                    <div className="absolute inset-0 ring-2 ring-primary ring-inset" />
                  )}
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="h-16 @sm:h-20 @md:h-24" style={{ background: gradientCSS }} />
          )}
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8">
            <TabsTrigger value="generator" className="text-[10px] @sm:text-xs">
              Generator
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
              Presets
            </TabsTrigger>
            <TabsTrigger value="saved" className="text-[10px] @sm:text-xs">
              Saved ({ramps.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generator" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* Base Color */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs">Base Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="w-10 h-8 @sm:h-9 rounded border border-border cursor-pointer"
                />
                <Input
                  value={baseColor}
                  onChange={(e) => setBaseColor(e.target.value)}
                  className="flex-1 h-8 @sm:h-9 font-mono text-[10px] @sm:text-xs"
                />
              </div>
            </div>

            {/* Ramp Style */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs">Style</Label>
              <Select value={rampStyle} onValueChange={(value) => setRampStyle(value as RampStyle)}>
                <SelectTrigger className="h-8 @sm:h-9 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="hue-shift">Hue Shift</SelectItem>
                  <SelectItem value="saturation-shift">Saturation Shift</SelectItem>
                  <SelectItem value="luminosity">Luminosity</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Count */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Colors</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {colorCount}
                </span>
              </div>
              <Slider
                value={[colorCount]}
                onValueChange={(value) => setColorCount(value[0])}
                min={3}
                max={12}
                step={1}
                className="w-full"
              />
            </div>

            {/* Hue Shift (only for hue-shift style) */}
            {rampStyle === "hue-shift" && (
              <div className="space-y-1 @sm:space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs">Hue Rotation</Label>
                  <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                    {hueShift}°
                  </span>
                </div>
                <Slider
                  value={[hueShift]}
                  onValueChange={(value) => setHueShift(value[0])}
                  min={-180}
                  max={180}
                  step={5}
                  className="w-full"
                />
              </div>
            )}

            {/* Temperature Shift */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs flex items-center gap-1">
                  <Moon className="w-3 h-3 text-blue-500" />
                  Temperature
                  <Sun className="w-3 h-3 text-orange-500" />
                </Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {temperature > 0 ? "+" : ""}
                  {temperature}°
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={(value) => setTemperature(value[0])}
                min={-30}
                max={30}
                step={5}
                className="w-full"
              />
            </div>

            {/* Selected Color Details */}
            {selectedColor && ambientShadow && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-2 @sm:p-3 rounded-lg bg-secondary/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs font-semibold">Selected Color</Label>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[9px]"
                    onClick={() => setSelectedColor(null)}
                  >
                    Clear
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <div className="h-8 rounded border border-border" style={{ backgroundColor: selectedColor }} />
                    <p className="text-[9px] text-muted-foreground mt-1">Base</p>
                  </div>
                  <div>
                    <div
                      className="h-8 rounded border border-border"
                      style={{ backgroundColor: ambientShadow.ambient }}
                    />
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5">
                      <Lightbulb className="w-2.5 h-2.5" />
                      Ambient
                    </p>
                  </div>
                  <div>
                    <div
                      className="h-8 rounded border border-border"
                      style={{ backgroundColor: ambientShadow.shadow }}
                    />
                    <p className="text-[9px] text-muted-foreground mt-1 flex items-center gap-0.5">
                      <Moon className="w-2.5 h-2.5" />
                      Shadow
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <button
                    className="text-[10px] font-mono hover:text-primary transition-colors block w-full text-left"
                    onClick={() => handleCopyColor(selectedColor, "hex")}
                  >
                    HEX: {selectedColor}
                  </button>
                  <button
                    className="text-[10px] font-mono hover:text-primary transition-colors block w-full text-left"
                    onClick={() => handleCopyColor(selectedColor, "rgb")}
                  >
                    RGB: {(() => {
                      const { r, g, b } = hexToRgb(selectedColor);
                      return `${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}`;
                    })()}
                  </button>
                </div>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2">
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {PRESET_PALETTES.map((preset) => (
                  <motion.button
                    key={preset.name}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleApplyPreset(preset)}
                    className="w-full p-2 rounded-lg border border-border hover:border-primary/50 transition-colors group text-left"
                  >
                    <div className="flex gap-1 mb-1.5">
                      {preset.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-6 @sm:h-8 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] @sm:text-xs font-semibold">{preset.name}</p>
                    <p className="text-[9px] @sm:text-[10px] text-muted-foreground">
                      {preset.description}
                    </p>
                  </motion.button>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="flex-1 overflow-hidden mt-2">
            {ramps.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Palette className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground">No saved ramps</p>
                <p className="text-[10px] text-muted-foreground/60 mt-1">
                  Generate and save ramps to see them here
                </p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-2">
                  {ramps.map((ramp) => (
                    <motion.div
                      key={ramp.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1 min-w-0 flex-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-5 w-5 flex-shrink-0"
                            onClick={() => handleToggleFavorite(ramp.id)}
                          >
                            <Star
                              className={`w-3 h-3 ${
                                ramp.isFavorite ? "fill-yellow-500 text-yellow-500" : ""
                              }`}
                            />
                          </Button>
                          <span className="text-xs font-medium truncate">{ramp.name}</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteRamp(ramp.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>

                      <div className="flex gap-1 mb-1.5 h-5">
                        {ramp.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="flex-1 rounded-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-[9px] h-4">
                          {ramp.style}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-5 text-[10px]"
                          onClick={() => handleLoadRamp(ramp)}
                        >
                          Load
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="space-y-1">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              onClick={handleSaveRamp}
            >
              <Plus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
              Save
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              onClick={saveConfig}
            >
              <RefreshCw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
              Refresh
            </Button>
          </div>
          <div className="grid grid-cols-4 gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] @sm:text-[10px]"
              onClick={() => handleExport("array")}
            >
              <Download className="w-3 h-3 mr-0.5" />
              Array
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] @sm:text-[10px]"
              onClick={() => handleExport("css")}
            >
              <Download className="w-3 h-3 mr-0.5" />
              CSS
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] @sm:text-[10px]"
              onClick={() => handleExport("tailwind")}
            >
              <Download className="w-3 h-3 mr-0.5" />
              TW
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[9px] @sm:text-[10px]"
              onClick={() => handleExport("json")}
            >
              <Download className="w-3 h-3 mr-0.5" />
              JSON
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
