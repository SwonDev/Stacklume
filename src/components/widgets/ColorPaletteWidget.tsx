"use client";

import { useState, useEffect } from "react";
import {
  Palette,
  Copy,
  Check,
  RefreshCw,
  Lock,
  Unlock,
  Download,
  Save,
  Trash2,
  Shuffle,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface ColorPaletteWidgetProps {
  widget: Widget;
}

interface ColorValue {
  hex: string;
  rgb: string;
  hsl: string;
  locked: boolean;
}

interface SavedPalette {
  id: string;
  name: string;
  colors: ColorValue[];
  harmony: ColorHarmony;
  isFavorite: boolean;
  createdAt: string;
}

interface ColorPaletteConfig {
  savedPalettes?: SavedPalette[];
  currentColors?: ColorValue[];
  currentHarmony?: ColorHarmony;
  baseColor?: string;
}

type ColorHarmony =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "split-complementary"
  | "monochromatic";

const HARMONY_LABELS: Record<ColorHarmony, string> = {
  complementary: "Complementary",
  analogous: "Analogous",
  triadic: "Triadic",
  tetradic: "Tetradic",
  "split-complementary": "Split Complementary",
  monochromatic: "Monochromatic",
};

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
  return "#" + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  }).join("");
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
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

function formatRgb(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function formatHsl(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
}

// Generate harmonious color palettes
function generateHarmoniousPalette(baseHex: string, harmony: ColorHarmony): string[] {
  const { h, s, l } = hexToHsl(baseHex);

  switch (harmony) {
    case "complementary": {
      const h2 = (h + 180) % 360;
      return [
        baseHex,
        hslToHex(h, s * 0.8, l * 1.1),
        hslToHex(h2, s, l),
        hslToHex(h2, s * 0.8, l * 0.9),
        hslToHex((h + h2) / 2, s * 0.6, l),
      ];
    }

    case "analogous": {
      return [
        hslToHex((h - 60 + 360) % 360, s, l),
        hslToHex((h - 30 + 360) % 360, s * 0.9, l),
        baseHex,
        hslToHex((h + 30) % 360, s * 0.9, l),
        hslToHex((h + 60) % 360, s, l),
      ];
    }

    case "triadic": {
      return [
        baseHex,
        hslToHex((h + 120) % 360, s, l),
        hslToHex((h + 240) % 360, s, l),
        hslToHex(h, s * 0.6, l * 1.2),
        hslToHex((h + 180) % 360, s * 0.5, l),
      ];
    }

    case "tetradic": {
      return [
        baseHex,
        hslToHex((h + 90) % 360, s, l),
        hslToHex((h + 180) % 360, s, l),
        hslToHex((h + 270) % 360, s, l),
        hslToHex(h, s * 0.5, l * 1.1),
      ];
    }

    case "split-complementary": {
      return [
        baseHex,
        hslToHex((h + 150) % 360, s, l),
        hslToHex((h + 210) % 360, s, l),
        hslToHex(h, s * 0.7, l * 1.15),
        hslToHex(h, s * 0.5, l * 0.85),
      ];
    }

    case "monochromatic": {
      return [
        hslToHex(h, s, l * 0.7),
        hslToHex(h, s * 0.8, l * 0.85),
        baseHex,
        hslToHex(h, s * 0.6, l * 1.15),
        hslToHex(h, s * 0.4, l * 1.3),
      ];
    }

    default:
      return [baseHex];
  }
}

function generateRandomColor(): string {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

function createColorValue(hex: string, locked = false): ColorValue {
  return {
    hex: hex.toUpperCase(),
    rgb: formatRgb(hex),
    hsl: formatHsl(hex),
    locked,
  };
}

export function ColorPaletteWidget({ widget: initialWidget }: ColorPaletteWidgetProps) {
  const updateWidget = useWidgetStore(state => state.updateWidget);
  const storeWidget = useWidgetStore(
    state => state.widgets.find(w => w.id === initialWidget.id)
  );

  const widget = storeWidget || initialWidget;
  const config = widget.config as ColorPaletteConfig | undefined;

  const [baseColor, setBaseColor] = useState(config?.baseColor || "#3B82F6");
  const [harmony, setHarmony] = useState<ColorHarmony>(
    config?.currentHarmony || "complementary"
  );
  const [colors, setColors] = useState<ColorValue[]>(
    config?.currentColors || generateHarmoniousPalette(config?.baseColor || "#3B82F6", config?.currentHarmony || "complementary").map(hex => createColorValue(hex))
  );
  const [savedPalettes, setSavedPalettes] = useState<SavedPalette[]>(
    config?.savedPalettes || []
  );
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [paletteName, setPaletteName] = useState("");
  const [activeTab, setActiveTab] = useState("generator");

  // Update config when colors or saved palettes change
  useEffect(() => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        savedPalettes,
        currentColors: colors,
        currentHarmony: harmony,
        baseColor,
      },
    });
  }, [colors, savedPalettes, harmony, baseColor, widget.id]);

  const generatePalette = (newHarmony?: ColorHarmony, preserveLocked = false) => {
    const targetHarmony = newHarmony || harmony;
    const hexColors = generateHarmoniousPalette(baseColor, targetHarmony);

    const newColors = hexColors.map((hex, idx) => {
      if (preserveLocked && colors[idx]?.locked) {
        return colors[idx];
      }
      return createColorValue(hex);
    });

    setColors(newColors);
    if (newHarmony) setHarmony(newHarmony);
    toast.success("Palette generated", {
      description: `${HARMONY_LABELS[targetHarmony]} harmony`,
    });
  };

  const regenerateUnlocked = () => {
    generatePalette(harmony, true);
  };

  const shuffleBaseColor = () => {
    const newBase = generateRandomColor();
    setBaseColor(newBase);
    const hexColors = generateHarmoniousPalette(newBase, harmony);
    const newColors = hexColors.map((hex, idx) => {
      if (colors[idx]?.locked) {
        return colors[idx];
      }
      return createColorValue(hex);
    });
    setColors(newColors);
    toast.success("Base color randomized");
  };

  const toggleLock = (index: number) => {
    const newColors = [...colors];
    newColors[index] = { ...newColors[index], locked: !newColors[index].locked };
    setColors(newColors);
  };

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedValue(text);
    toast.success("Copied to clipboard", {
      description: label,
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const savePalette = () => {
    const newPalette: SavedPalette = {
      id: Date.now().toString(),
      name: paletteName || `Palette ${savedPalettes.length + 1}`,
      colors: [...colors],
      harmony,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };

    setSavedPalettes([...savedPalettes, newPalette]);
    setPaletteName("");
    setIsSaveDialogOpen(false);
    toast.success("Palette saved", {
      description: newPalette.name,
    });
  };

  const loadPalette = (palette: SavedPalette) => {
    setColors(palette.colors);
    setHarmony(palette.harmony);
    if (palette.colors.length > 0) {
      setBaseColor(palette.colors[0].hex);
    }
    setActiveTab("generator");
    toast.success("Palette loaded", {
      description: palette.name,
    });
  };

  const deletePalette = (id: string) => {
    setSavedPalettes(savedPalettes.filter(p => p.id !== id));
    toast.success("Palette deleted");
  };

  const toggleFavorite = (id: string) => {
    setSavedPalettes(
      savedPalettes.map(p =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      )
    );
  };

  const exportPalette = (format: "css" | "tailwind") => {
    let output = "";

    if (format === "css") {
      output = ":root {\n";
      colors.forEach((color, idx) => {
        output += `  --color-${idx + 1}: ${color.hex};\n`;
        output += `  --color-${idx + 1}-rgb: ${color.rgb.match(/\d+/g)?.join(", ")};\n`;
      });
      output += "}";
    } else if (format === "tailwind") {
      output = "module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n";
      colors.forEach((color, idx) => {
        output += `          ${idx + 1}: '${color.hex}',\n`;
      });
      output += "        },\n      },\n    },\n  },\n}";
    }

    copyToClipboard(output, `${format.toUpperCase()} export`);
  };

  const copyFullPalette = () => {
    const palette = colors.map(c => c.hex).join(", ");
    copyToClipboard(palette, "Full palette");
  };

  return (
    <div className="h-full w-full flex flex-col @container">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mb-2">
          <TabsTrigger value="generator" className="text-xs">
            <Palette className="w-3 h-3 mr-1" />
            Generator
          </TabsTrigger>
          <TabsTrigger value="saved" className="text-xs">
            <Save className="w-3 h-3 mr-1" />
            Saved ({savedPalettes.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generator" className="flex-1 overflow-hidden flex flex-col mt-0">
          {/* Base color picker */}
          <div className="mb-2 flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Base:</Label>
            <input
              type="color"
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-2 border-border"
            />
            <Input
              value={baseColor}
              onChange={(e) => setBaseColor(e.target.value)}
              className="font-mono text-xs h-8"
            />
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 flex-shrink-0"
              onClick={shuffleBaseColor}
              title="Randomize base color"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Harmony selector */}
          <div className="mb-2">
            <Select
              value={harmony}
              onValueChange={(value) => generatePalette(value as ColorHarmony)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(HARMONY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Color swatches */}
          <ScrollArea className="flex-1 -mx-1 px-1">
            <div className="space-y-1.5">
              <AnimatePresence>
                {colors.map((color, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.05 }}
                    className="group relative"
                  >
                    <div
                      className="rounded-lg p-2 flex items-center gap-2 transition-all hover:ring-2 hover:ring-primary/50"
                      style={{ backgroundColor: color.hex + "15" }}
                    >
                      <div
                        className="w-10 h-10 rounded-md shadow-sm flex-shrink-0 @container"
                        style={{ backgroundColor: color.hex }}
                      >
                        <div className="w-full h-full flex items-center justify-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => toggleLock(index)}
                          >
                            {color.locked ? (
                              <Lock className="w-3 h-3 text-white drop-shadow" />
                            ) : (
                              <Unlock className="w-3 h-3 text-white drop-shadow" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 @[180px]:block hidden">
                        <div className="space-y-0.5">
                          <button
                            className="text-xs font-mono hover:text-primary transition-colors block truncate"
                            onClick={() => copyToClipboard(color.hex, "HEX")}
                          >
                            {color.hex}
                          </button>
                          <button
                            className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors block truncate"
                            onClick={() => copyToClipboard(color.rgb, "RGB")}
                          >
                            {color.rgb}
                          </button>
                          <button
                            className="text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors block truncate"
                            onClick={() => copyToClipboard(color.hsl, "HSL")}
                          >
                            {color.hsl}
                          </button>
                        </div>
                      </div>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(color.hex, "HEX")}
                      >
                        {copiedValue === color.hex ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="mt-2 flex flex-wrap gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={regenerateUnlocked}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Regenerate
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs flex-1"
              onClick={() => setIsSaveDialogOpen(true)}
            >
              <Save className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>

          <div className="mt-1 flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1"
              onClick={copyFullPalette}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy All
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1"
              onClick={() => exportPalette("css")}
            >
              <Download className="w-3 h-3 mr-1" />
              CSS
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-[10px] flex-1"
              onClick={() => exportPalette("tailwind")}
            >
              <Download className="w-3 h-3 mr-1" />
              Tailwind
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="saved" className="flex-1 overflow-hidden mt-0">
          {savedPalettes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <Save className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">No saved palettes</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Generate and save palettes to see them here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="space-y-2">
                {savedPalettes.map((palette) => (
                  <motion.div
                    key={palette.id}
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
                          onClick={() => toggleFavorite(palette.id)}
                        >
                          <Star
                            className={cn(
                              "w-3 h-3",
                              palette.isFavorite && "fill-yellow-500 text-yellow-500"
                            )}
                          />
                        </Button>
                        <span className="text-xs font-medium truncate">
                          {palette.name}
                        </span>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deletePalette(palette.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>

                    <div className="flex gap-1 mb-1.5">
                      {palette.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="flex-1 h-6 rounded"
                          style={{ backgroundColor: color.hex }}
                          title={color.hex}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[9px] h-4">
                        {HARMONY_LABELS[palette.harmony]}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-5 text-[10px]"
                        onClick={() => loadPalette(palette)}
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

      {/* Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              Save Palette
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-1">
              {colors.map((color, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-12 rounded"
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="palette-name">Palette Name</Label>
              <Input
                id="palette-name"
                value={paletteName}
                onChange={(e) => setPaletteName(e.target.value)}
                placeholder={`Palette ${savedPalettes.length + 1}`}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={savePalette}>Save Palette</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
