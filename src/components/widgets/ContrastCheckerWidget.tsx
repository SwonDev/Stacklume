"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Eye, Check, X, ArrowLeftRight, Copy, Lightbulb, Pipette } from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContrastCheckerWidgetProps {
  widget: Widget;
}

interface WCAGLevel {
  name: string;
  ratio: number;
  passed: boolean;
}

// Utility functions for color conversion
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

// Calculate relative luminance using WCAG formula
const getLuminance = (r: number, g: number, b: number): number => {
  // Convert to 0-1 range
  const [rs, gs, bs] = [r / 255, g / 255, b / 255];

  // Apply gamma correction
  const [R, G, B] = [rs, gs, bs].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );

  // Calculate luminance
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
};

// Calculate contrast ratio using WCAG formula
const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Find closest accessible color
const findAccessibleColor = (
  foreground: string,
  background: string,
  targetRatio: number,
  _adjustForeground: boolean = true
): string => {
  const bgRgb = hexToRgb(background);
  const fgRgb = hexToRgb(foreground);

  if (!bgRgb || !fgRgb) return foreground;

  const bgLum = getLuminance(bgRgb.r, bgRgb.g, bgRgb.b);
  const shouldBeLighter = bgLum < 0.5;

  let bestColor = foreground;
  let bestRatio = getContrastRatio(foreground, background);

  // Try adjusting brightness
  for (let adjustment = 0; adjustment <= 100; adjustment += 5) {
    const factor = shouldBeLighter ? 1 + adjustment / 100 : 1 - adjustment / 100;

    const newR = Math.max(0, Math.min(255, fgRgb.r * factor));
    const newG = Math.max(0, Math.min(255, fgRgb.g * factor));
    const newB = Math.max(0, Math.min(255, fgRgb.b * factor));

    const newColor = rgbToHex(newR, newG, newB);
    const ratio = getContrastRatio(newColor, background);

    if (ratio >= targetRatio && ratio < bestRatio + 2) {
      bestColor = newColor;
      bestRatio = ratio;
      if (ratio >= targetRatio && ratio <= targetRatio + 1) break;
    }
  }

  // If still not accessible, try pure white or black
  if (bestRatio < targetRatio) {
    const whiteRatio = getContrastRatio("#FFFFFF", background);
    const blackRatio = getContrastRatio("#000000", background);

    bestColor = whiteRatio > blackRatio ? "#FFFFFF" : "#000000";
  }

  return bestColor;
};

export function ContrastCheckerWidget({ widget }: ContrastCheckerWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Initialize colors from config or defaults
  const [foregroundColor, setForegroundColor] = useState(
    widget.config?.foregroundColor || "#000000"
  );
  const [backgroundColor, setBackgroundColor] = useState(
    widget.config?.backgroundColor || "#FFFFFF"
  );
  const [copiedItem, setCopiedItem] = useState<string | null>(null);
  const [_showSuggestion, setShowSuggestion] = useState(false);

  // Save colors to config when they change
  useEffect(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        foregroundColor,
        backgroundColor,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foregroundColor, backgroundColor, widget.id]);

  // Calculate contrast ratio
  const contrastRatio = getContrastRatio(foregroundColor, backgroundColor);

  // WCAG compliance levels
  const wcagLevels: WCAGLevel[] = [
    { name: "AA Normal Text", ratio: 4.5, passed: contrastRatio >= 4.5 },
    { name: "AA Large Text", ratio: 3.0, passed: contrastRatio >= 3.0 },
    { name: "AAA Normal Text", ratio: 7.0, passed: contrastRatio >= 7.0 },
    { name: "AAA Large Text", ratio: 4.5, passed: contrastRatio >= 4.5 },
  ];

  // Get RGB values for display
  const foregroundRgb = hexToRgb(foregroundColor);
  const backgroundRgb = hexToRgb(backgroundColor);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, item: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(item);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Swap colors
  const swapColors = useCallback(() => {
    const temp = foregroundColor;
    setForegroundColor(backgroundColor);
    setBackgroundColor(temp);
  }, [foregroundColor, backgroundColor]);

  // Get suggested accessible color
  const suggestedColor = findAccessibleColor(foregroundColor, backgroundColor, 4.5);
  const suggestionNeeded = contrastRatio < 4.5 && suggestedColor !== foregroundColor;

  return (
    <div className="@container size-full overflow-auto">
      <div className="flex h-full flex-col gap-3 p-4 @sm:gap-4 @sm:p-6">
        {/* Color Inputs */}
        <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
          {/* Foreground Color */}
          <div className="space-y-2">
            <Label htmlFor={`fg-${widget.id}`} className="text-xs font-medium flex items-center gap-2">
              <Pipette className="size-3" />
              Foreground (Text)
            </Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={foregroundColor}
                onChange={(e) => setForegroundColor(e.target.value.toUpperCase())}
                className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background"
                style={{ colorScheme: "light dark" }}
              />
              <Input
                id={`fg-${widget.id}`}
                value={foregroundColor}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (/^#[0-9A-F]{0,6}$/.test(val) || val === "#") {
                    setForegroundColor(val);
                  }
                }}
                placeholder="#000000"
                className="flex-1 font-mono text-sm"
                maxLength={7}
              />
            </div>
            {foregroundRgb && (
              <div className="text-xs text-muted-foreground font-mono">
                RGB: {foregroundRgb.r}, {foregroundRgb.g}, {foregroundRgb.b}
              </div>
            )}
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor={`bg-${widget.id}`} className="text-xs font-medium flex items-center gap-2">
              <Pipette className="size-3" />
              Background
            </Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value.toUpperCase())}
                className="h-10 w-16 cursor-pointer rounded-md border border-input bg-background"
                style={{ colorScheme: "light dark" }}
              />
              <Input
                id={`bg-${widget.id}`}
                value={backgroundColor}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  if (/^#[0-9A-F]{0,6}$/.test(val) || val === "#") {
                    setBackgroundColor(val);
                  }
                }}
                placeholder="#FFFFFF"
                className="flex-1 font-mono text-sm"
                maxLength={7}
              />
            </div>
            {backgroundRgb && (
              <div className="text-xs text-muted-foreground font-mono">
                RGB: {backgroundRgb.r}, {backgroundRgb.g}, {backgroundRgb.b}
              </div>
            )}
          </div>
        </div>

        {/* Swap Button */}
        <Button
          onClick={swapColors}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <ArrowLeftRight className="mr-2 size-4" />
          Swap Colors
        </Button>

        {/* Contrast Ratio Display */}
        <motion.div
          className="relative overflow-hidden rounded-lg border border-border bg-secondary/20 p-4 text-center"
          animate={{
            borderColor: contrastRatio >= 4.5 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)",
          }}
          transition={{ duration: 0.3 }}
        >
          <div className="mb-2 text-sm font-medium text-muted-foreground">
            Contrast Ratio
          </div>
          <motion.div
            key={contrastRatio.toFixed(2)}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-4xl font-bold @sm:text-5xl"
          >
            {contrastRatio.toFixed(2)}:1
          </motion.div>
          <Button
            onClick={() => copyToClipboard(`${contrastRatio.toFixed(2)}:1`, "ratio")}
            variant="ghost"
            size="sm"
            className="mt-2"
          >
            {copiedItem === "ratio" ? (
              <Check className="mr-2 size-4 text-green-500" />
            ) : (
              <Copy className="mr-2 size-4" />
            )}
            {copiedItem === "ratio" ? "Copied!" : "Copy Ratio"}
          </Button>
        </motion.div>

        {/* WCAG Compliance Levels */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">WCAG Compliance</Label>
          <div className="grid grid-cols-1 gap-2 @sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {wcagLevels.map((level) => (
                <motion.div
                  key={level.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-3 transition-colors",
                    level.passed
                      ? "border-green-500/50 bg-green-500/10"
                      : "border-red-500/50 bg-red-500/10"
                  )}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{level.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {level.ratio}:1 required
                    </span>
                  </div>
                  <Badge
                    variant={level.passed ? "default" : "destructive"}
                    className={cn(
                      "gap-1",
                      level.passed && "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    {level.passed ? (
                      <>
                        <Check className="size-3" />
                        Pass
                      </>
                    ) : (
                      <>
                        <X className="size-3" />
                        Fail
                      </>
                    )}
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Live Preview */}
        <div className="space-y-2">
          <Label className="text-xs font-medium flex items-center gap-2">
            <Eye className="size-3" />
            Live Preview
          </Label>
          <motion.div
            className="rounded-lg border border-border p-6 text-center"
            animate={{ backgroundColor }}
            transition={{ duration: 0.3 }}
          >
            <motion.p
              className="text-sm @sm:text-base"
              animate={{ color: foregroundColor }}
              transition={{ duration: 0.3 }}
            >
              The quick brown fox jumps over the lazy dog
            </motion.p>
            <motion.p
              className="mt-2 text-2xl font-bold @sm:text-3xl"
              animate={{ color: foregroundColor }}
              transition={{ duration: 0.3 }}
            >
              Large Text Example
            </motion.p>
          </motion.div>
        </div>

        {/* Accessibility Suggestion */}
        <AnimatePresence>
          {suggestionNeeded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="mt-0.5 size-5 text-yellow-600" />
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Accessibility Suggestion</p>
                      <p className="text-xs text-muted-foreground">
                        The current color combination does not meet WCAG AA standards.
                        Try this suggested color:
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="size-8 rounded border border-border"
                        style={{ backgroundColor: suggestedColor }}
                      />
                      <code className="flex-1 rounded bg-secondary px-2 py-1 text-xs font-mono">
                        {suggestedColor}
                      </code>
                      <Button
                        onClick={() => {
                          setForegroundColor(suggestedColor);
                          setShowSuggestion(false);
                        }}
                        size="sm"
                        variant="outline"
                      >
                        Apply
                      </Button>
                      <Button
                        onClick={() => copyToClipboard(suggestedColor, "suggestion")}
                        size="sm"
                        variant="outline"
                      >
                        {copiedItem === "suggestion" ? (
                          <Check className="size-4 text-green-500" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
