"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Copy, Plus, Pipette, Check, Trash2 } from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ColorConverterWidgetProps {
  widget: Widget;
}

interface ColorFormats {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

interface SavedColor {
  hex: string;
  name?: string;
}

// Color conversion utilities
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const sanitized = hex.replace("#", "");

  // Handle 3-digit hex
  if (sanitized.length === 3) {
    const r = parseInt(sanitized[0] + sanitized[0], 16);
    const g = parseInt(sanitized[1] + sanitized[1], 16);
    const b = parseInt(sanitized[2] + sanitized[2], 16);
    return { r, g, b };
  }

  // Handle 6-digit hex
  if (sanitized.length === 6) {
    const r = parseInt(sanitized.substring(0, 2), 16);
    const g = parseInt(sanitized.substring(2, 4), 16);
    const b = parseInt(sanitized.substring(4, 6), 16);
    return { r, g, b };
  }

  return null;
};

const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => {
    const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

const rgbToHsl = (r: number, g: number, b: number): { h: number; s: number; l: number } => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
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

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
};

const hslToRgb = (h: number, s: number, l: number): { r: number; g: number; b: number } => {
  h = h / 360;
  s = s / 100;
  l = l / 100;

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

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

const parseRgbString = (rgb: string): { r: number; g: number; b: number } | null => {
  const match = rgb.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (match) {
    return {
      r: parseInt(match[1]),
      g: parseInt(match[2]),
      b: parseInt(match[3]),
    };
  }
  return null;
};

const parseHslString = (hsl: string): { h: number; s: number; l: number } | null => {
  const match = hsl.match(/hsl\s*\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?\s*\)/i);
  if (match) {
    return {
      h: parseInt(match[1]),
      s: parseInt(match[2]),
      l: parseInt(match[3]),
    };
  }
  return null;
};

export function ColorConverterWidget({ widget }: ColorConverterWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize with saved colors or default (convert from string[] to SavedColor[])
  const configColors = widget.config?.savedColors || [];
  const savedColors: SavedColor[] = configColors.map((c: string) => ({ hex: c }));
  const initialColor = savedColors.length > 0 ? savedColors[0].hex : "#3B82F6";

  const [currentColor, setCurrentColor] = useState<ColorFormats>(() => {
    const rgb = hexToRgb(initialColor)!;
    return {
      hex: initialColor,
      rgb,
      hsl: rgbToHsl(rgb.r, rgb.g, rgb.b),
    };
  });

  const [hexInput, setHexInput] = useState(initialColor);
  const [rgbInput, setRgbInput] = useState(`rgb(${currentColor.rgb.r}, ${currentColor.rgb.g}, ${currentColor.rgb.b})`);
  const [hslInput, setHslInput] = useState(`hsl(${currentColor.hsl.h}, ${currentColor.hsl.s}%, ${currentColor.hsl.l}%)`);
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null);

  // Update color from any source
  const updateColorFromHex = useCallback((hex: string) => {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
      setCurrentColor({ hex, rgb, hsl });
      setHexInput(hex);
      setRgbInput(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      setHslInput(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
    }
  }, []);

  const updateColorFromRgb = useCallback((r: number, g: number, b: number) => {
    const hex = rgbToHex(r, g, b);
    const hsl = rgbToHsl(r, g, b);
    setCurrentColor({ hex, rgb: { r, g, b }, hsl });
    setHexInput(hex);
    setRgbInput(`rgb(${r}, ${g}, ${b})`);
    setHslInput(`hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`);
  }, []);

  const updateColorFromHsl = useCallback((h: number, s: number, l: number) => {
    const rgb = hslToRgb(h, s, l);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    setCurrentColor({ hex, rgb, hsl: { h, s, l } });
    setHexInput(hex);
    setRgbInput(`rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
    setHslInput(`hsl(${h}, ${s}%, ${l}%)`);
  }, []);

  // Handle input changes
  const handleHexChange = (value: string) => {
    setHexInput(value);
    if (/^#[0-9A-Fa-f]{3}$/.test(value) || /^#[0-9A-Fa-f]{6}$/.test(value)) {
      updateColorFromHex(value);
    }
  };

  const handleRgbChange = (value: string) => {
    setRgbInput(value);
    const parsed = parseRgbString(value);
    if (parsed) {
      updateColorFromRgb(parsed.r, parsed.g, parsed.b);
    }
  };

  const handleHslChange = (value: string) => {
    setHslInput(value);
    const parsed = parseHslString(value);
    if (parsed) {
      updateColorFromHsl(parsed.h, parsed.s, parsed.l);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, format: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFormat(format);
      setTimeout(() => setCopiedFormat(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Save color to palette
  const saveColor = () => {
    const newSavedColors = [...savedColors];

    // Check if color already exists
    if (!newSavedColors.some(c => c.hex.toLowerCase() === currentColor.hex.toLowerCase())) {
      if (newSavedColors.length >= 8) {
        newSavedColors.shift(); // Remove oldest
      }
      newSavedColors.push({ hex: currentColor.hex });

      // Convert SavedColor[] back to string[] for config storage
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          savedColors: newSavedColors.map(c => c.hex),
        },
      });
    }
  };

  // Load saved color
  const loadColor = (hex: string) => {
    updateColorFromHex(hex);
  };

  // Remove saved color
  const removeSavedColor = (index: number) => {
    const newSavedColors = savedColors.filter((_, i) => i !== index);
    // Convert SavedColor[] back to string[] for config storage
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        savedColors: newSavedColors.map(c => c.hex),
      },
    });
  };

  return (
    <div className="@container size-full overflow-auto">
      <div className="flex h-full flex-col gap-3 p-4 @sm:gap-4 @sm:p-6">
        {/* Color Preview Swatch */}
        <motion.div
          className="relative h-24 w-full overflow-hidden rounded-lg border border-border shadow-sm @sm:h-32"
          animate={{ backgroundColor: currentColor.hex }}
          transition={{ duration: 0.3 }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-md bg-black/50 px-3 py-1.5 backdrop-blur-sm">
              <span className="text-sm font-medium text-white @sm:text-base">
                {currentColor.hex}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Native Color Picker */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <input
              type="color"
              value={currentColor.hex}
              onChange={(e) => updateColorFromHex(e.target.value)}
              className="h-10 w-full cursor-pointer rounded-md border border-input bg-background @sm:h-12"
              style={{ colorScheme: "light dark" }}
            />
            <Pipette className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Button
            onClick={saveColor}
            size="sm"
            variant="outline"
            className="h-10 @sm:h-12"
          >
            <Plus className="size-4 @sm:mr-2" />
            <span className="hidden @sm:inline">Save</span>
          </Button>
        </div>

        {/* Color Format Inputs */}
        <div className="space-y-3">
          {/* HEX */}
          <div className="space-y-1.5">
            <Label htmlFor={`hex-${widget.id}`} className="text-xs font-medium">
              HEX
            </Label>
            <div className="flex gap-2">
              <Input
                id={`hex-${widget.id}`}
                value={hexInput}
                onChange={(e) => handleHexChange(e.target.value)}
                placeholder="#3B82F6"
                className="font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(currentColor.hex, "hex")}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                {copiedFormat === "hex" ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* RGB */}
          <div className="space-y-1.5">
            <Label htmlFor={`rgb-${widget.id}`} className="text-xs font-medium">
              RGB
            </Label>
            <div className="flex gap-2">
              <Input
                id={`rgb-${widget.id}`}
                value={rgbInput}
                onChange={(e) => handleRgbChange(e.target.value)}
                placeholder="rgb(59, 130, 246)"
                className="font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(rgbInput, "rgb")}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                {copiedFormat === "rgb" ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          {/* HSL */}
          <div className="space-y-1.5">
            <Label htmlFor={`hsl-${widget.id}`} className="text-xs font-medium">
              HSL
            </Label>
            <div className="flex gap-2">
              <Input
                id={`hsl-${widget.id}`}
                value={hslInput}
                onChange={(e) => handleHslChange(e.target.value)}
                placeholder="hsl(217, 91%, 60%)"
                className="font-mono text-sm"
              />
              <Button
                onClick={() => copyToClipboard(hslInput, "hsl")}
                size="sm"
                variant="outline"
                className="shrink-0"
              >
                {copiedFormat === "hsl" ? (
                  <Check className="size-4 text-green-500" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Saved Colors Palette */}
        {savedColors.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-medium">Saved Colors</Label>
            <div className="grid grid-cols-4 gap-2 @sm:grid-cols-8">
              <AnimatePresence mode="popLayout">
                {savedColors.map((color, index) => (
                  <motion.div
                    key={color.hex}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="group relative"
                  >
                    <button
                      onClick={() => loadColor(color.hex)}
                      className={cn(
                        "relative h-10 w-full overflow-hidden rounded-md border-2 transition-all hover:scale-105 @sm:h-12",
                        currentColor.hex.toLowerCase() === color.hex.toLowerCase()
                          ? "border-foreground shadow-lg"
                          : "border-border hover:border-foreground/50"
                      )}
                      style={{ backgroundColor: color.hex }}
                      title={color.hex}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSavedColor(index);
                      }}
                      size="sm"
                      variant="destructive"
                      className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 opacity-0 shadow-md transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
