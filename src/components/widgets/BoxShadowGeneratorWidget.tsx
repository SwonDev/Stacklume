"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Square, Copy, Check, RotateCcw } from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface BoxShadowGeneratorWidgetProps {
  widget: Widget;
}

interface ShadowConfig {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

interface Preset {
  name: string;
  config: ShadowConfig;
}

const defaultConfig: ShadowConfig = {
  offsetX: 4,
  offsetY: 4,
  blur: 10,
  spread: 0,
  color: "#000000",
  opacity: 0.25,
  inset: false,
};

const presets: Preset[] = [
  {
    name: "Subtle",
    config: {
      offsetX: 0,
      offsetY: 1,
      blur: 3,
      spread: 0,
      color: "#000000",
      opacity: 0.12,
      inset: false,
    },
  },
  {
    name: "Soft",
    config: {
      offsetX: 0,
      offsetY: 4,
      blur: 6,
      spread: -1,
      color: "#000000",
      opacity: 0.1,
      inset: false,
    },
  },
  {
    name: "Medium",
    config: {
      offsetX: 0,
      offsetY: 10,
      blur: 15,
      spread: -3,
      color: "#000000",
      opacity: 0.2,
      inset: false,
    },
  },
  {
    name: "Large",
    config: {
      offsetX: 0,
      offsetY: 20,
      blur: 25,
      spread: -5,
      color: "#000000",
      opacity: 0.25,
      inset: false,
    },
  },
  {
    name: "Elevated",
    config: {
      offsetX: 0,
      offsetY: 8,
      blur: 20,
      spread: 0,
      color: "#000000",
      opacity: 0.15,
      inset: false,
    },
  },
  {
    name: "Inset Soft",
    config: {
      offsetX: 0,
      offsetY: 2,
      blur: 4,
      spread: 0,
      color: "#000000",
      opacity: 0.2,
      inset: true,
    },
  },
  {
    name: "Colored Glow",
    config: {
      offsetX: 0,
      offsetY: 0,
      blur: 20,
      spread: 0,
      color: "#3b82f6",
      opacity: 0.6,
      inset: false,
    },
  },
  {
    name: "Sharp",
    config: {
      offsetX: 8,
      offsetY: 8,
      blur: 0,
      spread: 0,
      color: "#000000",
      opacity: 0.3,
      inset: false,
    },
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function generateBoxShadow(config: ShadowConfig): string {
  const rgb = hexToRgb(config.color);
  if (!rgb) return "none";

  const rgba = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${config.opacity})`;
  const insetPrefix = config.inset ? "inset " : "";

  return `${insetPrefix}${config.offsetX}px ${config.offsetY}px ${config.blur}px ${config.spread}px ${rgba}`;
}

export function BoxShadowGeneratorWidget({
  widget,
}: BoxShadowGeneratorWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [shadowConfig, setShadowConfig] = useState<ShadowConfig>(() => {
    const saved = widget.config?.shadowConfig as ShadowConfig | undefined;
    return saved?.offsetX !== undefined ? saved : defaultConfig;
  });

  const [copied, setCopied] = useState(false);

  // Save config to store when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          shadowConfig,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [shadowConfig, widget.id]);

  const boxShadowCSS = generateBoxShadow(shadowConfig);

  const handleCopyCSS = async () => {
    try {
      await navigator.clipboard.writeText(`box-shadow: ${boxShadowCSS};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleReset = () => {
    setShadowConfig(defaultConfig);
  };

  const handlePresetClick = (preset: Preset) => {
    setShadowConfig(preset.config);
  };

  const updateConfig = (updates: Partial<ShadowConfig>) => {
    setShadowConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Square className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Box Shadow Generator</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="h-7 w-7"
          title="Reset to defaults"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Preview Box */}
      <div className="flex items-center justify-center rounded-lg border bg-muted/30 p-8">
        <motion.div
          layout
          className="h-24 w-24 rounded-lg bg-background"
          style={{
            boxShadow: boxShadowCSS,
          }}
          transition={{ duration: 0.2 }}
        />
      </div>

      {/* Controls */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {/* Offset X */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="offsetX" className="text-xs font-medium">
              Offset X
            </Label>
            <span className="text-xs text-muted-foreground">
              {shadowConfig.offsetX}px
            </span>
          </div>
          <Slider
            id="offsetX"
            value={[shadowConfig.offsetX]}
            onValueChange={(value) => updateConfig({ offsetX: value[0] })}
            min={-50}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Offset Y */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="offsetY" className="text-xs font-medium">
              Offset Y
            </Label>
            <span className="text-xs text-muted-foreground">
              {shadowConfig.offsetY}px
            </span>
          </div>
          <Slider
            id="offsetY"
            value={[shadowConfig.offsetY]}
            onValueChange={(value) => updateConfig({ offsetY: value[0] })}
            min={-50}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Blur Radius */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="blur" className="text-xs font-medium">
              Blur Radius
            </Label>
            <span className="text-xs text-muted-foreground">
              {shadowConfig.blur}px
            </span>
          </div>
          <Slider
            id="blur"
            value={[shadowConfig.blur]}
            onValueChange={(value) => updateConfig({ blur: value[0] })}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Spread Radius */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="spread" className="text-xs font-medium">
              Spread Radius
            </Label>
            <span className="text-xs text-muted-foreground">
              {shadowConfig.spread}px
            </span>
          </div>
          <Slider
            id="spread"
            value={[shadowConfig.spread]}
            onValueChange={(value) => updateConfig({ spread: value[0] })}
            min={-50}
            max={50}
            step={1}
            className="w-full"
          />
        </div>

        {/* Color Picker */}
        <div className="space-y-2">
          <Label htmlFor="color" className="text-xs font-medium">
            Shadow Color
          </Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="color"
              value={shadowConfig.color}
              onChange={(e) => updateConfig({ color: e.target.value })}
              className="h-9 w-full cursor-pointer rounded border bg-background"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {shadowConfig.color.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Opacity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="opacity" className="text-xs font-medium">
              Opacity
            </Label>
            <span className="text-xs text-muted-foreground">
              {(shadowConfig.opacity * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            id="opacity"
            value={[shadowConfig.opacity * 100]}
            onValueChange={(value) => updateConfig({ opacity: value[0] / 100 })}
            min={0}
            max={100}
            step={1}
            className="w-full"
          />
        </div>

        {/* Inset Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <Label htmlFor="inset" className="text-xs font-medium">
            Inset Shadow
          </Label>
          <Switch
            id="inset"
            checked={shadowConfig.inset}
            onCheckedChange={(checked) => updateConfig({ inset: checked })}
          />
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Presets</Label>
          <div className="grid grid-cols-2 gap-2 @sm:grid-cols-3 @md:grid-cols-4">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => handlePresetClick(preset)}
                className="h-auto flex-col gap-1 py-2 text-xs"
              >
                <div
                  className="h-6 w-6 rounded bg-background"
                  style={{
                    boxShadow: generateBoxShadow(preset.config),
                  }}
                />
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* CSS Output & Copy */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">CSS Output</Label>
        <div className="flex items-start gap-2">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs">
            box-shadow: {boxShadowCSS};
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
