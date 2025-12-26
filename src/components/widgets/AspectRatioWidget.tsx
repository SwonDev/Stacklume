"use client";

import { useState, useCallback } from "react";
import { motion } from "motion/react";
import { RectangleHorizontal, Lock, Unlock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface AspectRatioWidgetProps {
  widget: Widget;
}

interface AspectRatioConfig {
  width?: number;
  height?: number;
  locked?: boolean;
  lastEdited?: "width" | "height";
}

// Calculate greatest common divisor for ratio simplification
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Simplify aspect ratio to lowest terms
function simplifyRatio(width: number, height: number): { w: number; h: number; decimal: number } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { w: 0, h: 0, decimal: 0 };
  }

  const divisor = gcd(Math.round(width), Math.round(height));
  return {
    w: Math.round(width) / divisor,
    h: Math.round(height) / divisor,
    decimal: width / height,
  };
}

const COMMON_RATIOS = [
  { label: "16:9", w: 16, h: 9, name: "Widescreen" },
  { label: "4:3", w: 4, h: 3, name: "Standard" },
  { label: "1:1", w: 1, h: 1, name: "Square" },
  { label: "21:9", w: 21, h: 9, name: "Ultrawide" },
  { label: "9:16", w: 9, h: 16, name: "Portrait" },
];

export function AspectRatioWidget({ widget }: AspectRatioWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as AspectRatioConfig) || {};

  const [width, setWidth] = useState<string>(config.width?.toString() || "1920");
  const [height, setHeight] = useState<string>(config.height?.toString() || "1080");
  const [locked, setLocked] = useState<boolean>(config.locked ?? false);
  const [lastEdited, setLastEdited] = useState<"width" | "height">(config.lastEdited || "width");
  const [copied, setCopied] = useState<string | null>(null);

  const ratio = simplifyRatio(parseFloat(width) || 0, parseFloat(height) || 0);

  // Save config to store - build from current state
  const saveConfig = useCallback(
    (newConfig: Partial<AspectRatioConfig>) => {
      updateWidget(widget.id, {
        config: {
          width: parseFloat(width) || 0,
          height: parseFloat(height) || 0,
          locked,
          lastEdited,
          ...newConfig,
        },
      });
    },
    [widget.id, updateWidget, width, height, locked, lastEdited]
  );

  // Handle width change
  const handleWidthChange = (value: string) => {
    const newWidth = value;
    setWidth(newWidth);
    setLastEdited("width");

    if (locked && height) {
      const currentRatio = simplifyRatio(parseFloat(config.width?.toString() || width) || 1, parseFloat(height) || 1);
      if (currentRatio.decimal > 0) {
        const newHeight = (parseFloat(newWidth) || 0) / currentRatio.decimal;
        setHeight(newHeight > 0 ? Math.round(newHeight).toString() : "");
      }
    }
  };

  // Handle height change
  const handleHeightChange = (value: string) => {
    const newHeight = value;
    setHeight(newHeight);
    setLastEdited("height");

    if (locked && width) {
      const currentRatio = simplifyRatio(parseFloat(width) || 1, parseFloat(config.height?.toString() || height) || 1);
      if (currentRatio.decimal > 0) {
        const newWidth = (parseFloat(newHeight) || 0) * currentRatio.decimal;
        setWidth(newWidth > 0 ? Math.round(newWidth).toString() : "");
      }
    }
  };

  // Toggle lock
  const toggleLock = () => {
    const newLocked = !locked;
    setLocked(newLocked);
    saveConfig({
      locked: newLocked,
      width: parseFloat(width) || 0,
      height: parseFloat(height) || 0,
      lastEdited,
    });
  };

  // Apply preset ratio
  const applyPreset = (w: number, h: number) => {
    const currentWidth = parseFloat(width) || 1920;
    const currentHeight = parseFloat(height) || 1080;
    const presetRatio = w / h;

    if (lastEdited === "width") {
      const newHeight = Math.round(currentWidth / presetRatio);
      setHeight(newHeight.toString());
      saveConfig({ width: currentWidth, height: newHeight, lastEdited: "width" });
    } else {
      const newWidth = Math.round(currentHeight * presetRatio);
      setWidth(newWidth.toString());
      saveConfig({ width: newWidth, height: currentHeight, lastEdited: "height" });
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Save on blur
  const handleBlur = () => {
    saveConfig({
      width: parseFloat(width) || 0,
      height: parseFloat(height) || 0,
      lastEdited,
    });
  };

  // Calculate visual preview dimensions (max 100% width/height)
  const previewScale = ratio.decimal > 0 ? Math.min(1, 200 / Math.max(ratio.w * 10, ratio.h * 10)) : 0;
  const previewWidth = ratio.w * 10 * previewScale;
  const previewHeight = ratio.h * 10 * previewScale;

  return (
    <div className="flex h-full w-full flex-col gap-4 @container p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <RectangleHorizontal className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Aspect Ratio Calculator</h3>
      </div>

      {/* Input Fields */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="space-y-2">
          <Label htmlFor={`width-${widget.id}`} className="text-xs text-muted-foreground">
            Width
          </Label>
          <Input
            id={`width-${widget.id}`}
            type="number"
            value={width}
            onChange={(e) => handleWidthChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="1920"
            className="h-9"
            min="1"
          />
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLock}
          className="mb-0.5 h-9 w-9"
          title={locked ? "Unlock aspect ratio" : "Lock aspect ratio"}
        >
          {locked ? (
            <Lock className="h-4 w-4 text-primary" />
          ) : (
            <Unlock className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>

        <div className="space-y-2">
          <Label htmlFor={`height-${widget.id}`} className="text-xs text-muted-foreground">
            Height
          </Label>
          <Input
            id={`height-${widget.id}`}
            type="number"
            value={height}
            onChange={(e) => handleHeightChange(e.target.value)}
            onBlur={handleBlur}
            placeholder="1080"
            className="h-9"
            min="1"
          />
        </div>
      </div>

      {/* Ratio Display */}
      {ratio.decimal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          {/* Simplified Ratio */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Aspect Ratio</div>
              <div className="font-mono text-2xl font-bold">
                {ratio.w}:{ratio.h}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(`${ratio.w}:${ratio.h}`, "ratio")}
              className="h-8 w-8"
            >
              {copied === "ratio" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Decimal Value */}
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
            <div>
              <div className="text-xs text-muted-foreground">Decimal</div>
              <div className="font-mono text-xl font-semibold">
                {ratio.decimal.toFixed(4)}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => copyToClipboard(ratio.decimal.toFixed(4), "decimal")}
              className="h-8 w-8"
            >
              {copied === "decimal" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Visual Preview */}
      {ratio.decimal > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-4"
        >
          <div className="text-xs text-muted-foreground">Visual Preview</div>
          <div
            className="rounded border-2 border-primary bg-primary/10 transition-all"
            style={{
              width: `${previewWidth}px`,
              height: `${previewHeight}px`,
              maxWidth: "200px",
              maxHeight: "200px",
            }}
          />
          <div className="text-xs text-muted-foreground">
            {width} × {height} px
          </div>
        </motion.div>
      )}

      {/* Common Presets */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Common Ratios</Label>
        <ToggleGroup
          type="single"
          value={
            COMMON_RATIOS.find((r) => r.w === ratio.w && r.h === ratio.h)?.label || ""
          }
          onValueChange={(value) => {
            const preset = COMMON_RATIOS.find((r) => r.label === value);
            if (preset) {
              applyPreset(preset.w, preset.h);
            }
          }}
          className="grid grid-cols-3 gap-2 @sm:grid-cols-5"
        >
          {COMMON_RATIOS.map((preset) => (
            <ToggleGroupItem
              key={preset.label}
              value={preset.label}
              className="flex flex-col items-center gap-1 px-2 py-2 text-xs"
              title={preset.name}
            >
              <span className="font-mono font-semibold">{preset.label}</span>
              <span className="text-[10px] text-muted-foreground">{preset.name}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Helper Text */}
      <div className="text-xs text-muted-foreground">
        {locked ? (
          <span>🔒 Aspect ratio locked. Changes maintain proportions.</span>
        ) : (
          <span>🔓 Edit freely. Lock to maintain aspect ratio.</span>
        )}
      </div>
    </div>
  );
}
