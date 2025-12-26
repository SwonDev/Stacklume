"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { Type, Copy, Check, Plus, Trash2, GripVertical, RotateCcw } from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TextShadowWidgetProps {
  widget: Widget;
}

interface ShadowLayer {
  id: string;
  offsetX: number;
  offsetY: number;
  blur: number;
  color: string;
  opacity: number;
}

interface TextStyleConfig {
  sampleText: string;
  fontSize: number;
  textColor: string;
  fontWeight: string;
  backgroundColor: string;
}

interface Preset {
  name: string;
  shadows: Omit<ShadowLayer, "id">[];
  textStyle?: Partial<TextStyleConfig>;
}

const defaultTextStyle: TextStyleConfig = {
  sampleText: "Text Shadow",
  fontSize: 48,
  textColor: "#ffffff",
  fontWeight: "700",
  backgroundColor: "#1a1a1a",
};

const defaultShadow: Omit<ShadowLayer, "id"> = {
  offsetX: 2,
  offsetY: 2,
  blur: 4,
  color: "#000000",
  opacity: 0.5,
};

const presets: Preset[] = [
  {
    name: "Neon Glow",
    shadows: [
      { offsetX: 0, offsetY: 0, blur: 10, color: "#00ffff", opacity: 1 },
      { offsetX: 0, offsetY: 0, blur: 20, color: "#00ffff", opacity: 0.8 },
      { offsetX: 0, offsetY: 0, blur: 30, color: "#00ffff", opacity: 0.6 },
    ],
    textStyle: { textColor: "#00ffff", backgroundColor: "#0a0a0a" },
  },
  {
    name: "Retro 3D",
    shadows: [
      { offsetX: 1, offsetY: 1, blur: 0, color: "#ff00ff", opacity: 1 },
      { offsetX: 2, offsetY: 2, blur: 0, color: "#00ffff", opacity: 1 },
      { offsetX: 3, offsetY: 3, blur: 0, color: "#ffff00", opacity: 1 },
      { offsetX: 4, offsetY: 4, blur: 0, color: "#ff0000", opacity: 1 },
    ],
    textStyle: { textColor: "#ffffff", backgroundColor: "#1a1a1a" },
  },
  {
    name: "Letterpress",
    shadows: [
      { offsetX: 0, offsetY: 1, blur: 0, color: "#ffffff", opacity: 0.3 },
      { offsetX: 0, offsetY: -1, blur: 0, color: "#000000", opacity: 0.7 },
    ],
    textStyle: { textColor: "#555555", backgroundColor: "#cccccc" },
  },
  {
    name: "Fire",
    shadows: [
      { offsetX: 0, offsetY: 0, blur: 4, color: "#ff0000", opacity: 1 },
      { offsetX: 0, offsetY: 0, blur: 10, color: "#ff7700", opacity: 0.8 },
      { offsetX: 0, offsetY: 0, blur: 20, color: "#ffaa00", opacity: 0.6 },
      { offsetX: 0, offsetY: -5, blur: 30, color: "#ffff00", opacity: 0.4 },
    ],
    textStyle: { textColor: "#ffff00", backgroundColor: "#1a0000" },
  },
  {
    name: "Long Shadow",
    shadows: [
      { offsetX: 1, offsetY: 1, blur: 0, color: "#000000", opacity: 0.2 },
      { offsetX: 2, offsetY: 2, blur: 0, color: "#000000", opacity: 0.18 },
      { offsetX: 3, offsetY: 3, blur: 0, color: "#000000", opacity: 0.16 },
      { offsetX: 4, offsetY: 4, blur: 0, color: "#000000", opacity: 0.14 },
      { offsetX: 5, offsetY: 5, blur: 0, color: "#000000", opacity: 0.12 },
      { offsetX: 6, offsetY: 6, blur: 0, color: "#000000", opacity: 0.1 },
      { offsetX: 7, offsetY: 7, blur: 0, color: "#000000", opacity: 0.08 },
      { offsetX: 8, offsetY: 8, blur: 0, color: "#000000", opacity: 0.06 },
    ],
    textStyle: { textColor: "#ffffff", backgroundColor: "#3b82f6" },
  },
  {
    name: "Outline",
    shadows: [
      { offsetX: -1, offsetY: -1, blur: 0, color: "#000000", opacity: 1 },
      { offsetX: 1, offsetY: -1, blur: 0, color: "#000000", opacity: 1 },
      { offsetX: -1, offsetY: 1, blur: 0, color: "#000000", opacity: 1 },
      { offsetX: 1, offsetY: 1, blur: 0, color: "#000000", opacity: 1 },
    ],
    textStyle: { textColor: "#ffffff", backgroundColor: "#1a1a1a" },
  },
  {
    name: "Multiple Layers",
    shadows: [
      { offsetX: 2, offsetY: 2, blur: 0, color: "#ff0000", opacity: 1 },
      { offsetX: 4, offsetY: 4, blur: 0, color: "#00ff00", opacity: 1 },
      { offsetX: 6, offsetY: 6, blur: 0, color: "#0000ff", opacity: 1 },
      { offsetX: 8, offsetY: 8, blur: 10, color: "#000000", opacity: 0.5 },
    ],
    textStyle: { textColor: "#ffffff", backgroundColor: "#1a1a1a" },
  },
];

function hexToRgba(hex: string, opacity: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return `rgba(0, 0, 0, ${opacity})`;

  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function generateTextShadow(shadows: ShadowLayer[]): string {
  return shadows
    .map((shadow) => {
      const color = hexToRgba(shadow.color, shadow.opacity);
      return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${color}`;
    })
    .join(", ");
}

export function TextShadowWidget({ widget }: TextShadowWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [textStyle, setTextStyle] = useState<TextStyleConfig>(() => {
    const saved = widget.config?.textShadowTextStyle as TextStyleConfig | undefined;
    return saved?.sampleText !== undefined ? saved : defaultTextStyle;
  });

  const [shadows, setShadows] = useState<ShadowLayer[]>(() => {
    const saved = widget.config?.textShadowLayers as ShadowLayer[] | undefined;
    return saved && saved.length > 0
      ? saved
      : [{ ...defaultShadow, id: `shadow-${Date.now()}` }];
  });

  const [copied, setCopied] = useState(false);

  // Save config to store when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          textShadowTextStyle: textStyle,
          textShadowLayers: shadows,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [textStyle, shadows, widget.id]);

  const textShadowCSS = generateTextShadow(shadows);

  const handleCopyCSS = async () => {
    try {
      await navigator.clipboard.writeText(`text-shadow: ${textShadowCSS};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleReset = () => {
    setTextStyle(defaultTextStyle);
    setShadows([{ ...defaultShadow, id: `shadow-${Date.now()}` }]);
  };

  const handleAddShadow = () => {
    const newShadow: ShadowLayer = {
      ...defaultShadow,
      id: `shadow-${Date.now()}`,
    };
    setShadows([...shadows, newShadow]);
  };

  const handleRemoveShadow = (id: string) => {
    if (shadows.length <= 1) return; // Keep at least one shadow
    setShadows(shadows.filter((s) => s.id !== id));
  };

  const handleUpdateShadow = (id: string, updates: Partial<ShadowLayer>) => {
    setShadows(shadows.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const handleApplyPreset = (preset: Preset) => {
    const newShadows = preset.shadows.map((shadow, index) => ({
      ...shadow,
      id: `shadow-${Date.now()}-${index}`,
    }));
    setShadows(newShadows);

    if (preset.textStyle) {
      setTextStyle((prev) => ({ ...prev, ...preset.textStyle }));
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 p-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Text Shadow Generator</h3>
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

      {/* Live Preview */}
      <div
        className="flex items-center justify-center rounded-lg border p-8 transition-colors"
        style={{ backgroundColor: textStyle.backgroundColor }}
      >
        <motion.h1
          layout
          className="text-center break-words max-w-full"
          style={{
            fontSize: `${textStyle.fontSize}px`,
            color: textStyle.textColor,
            fontWeight: textStyle.fontWeight,
            textShadow: textShadowCSS,
            lineHeight: 1.2,
          }}
          transition={{ duration: 0.2 }}
        >
          {textStyle.sampleText}
        </motion.h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="shadows" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shadows" className="text-xs">
            Shadows
          </TabsTrigger>
          <TabsTrigger value="style" className="text-xs">
            Text Style
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">
            Presets
          </TabsTrigger>
        </TabsList>

        {/* Shadows Tab */}
        <TabsContent value="shadows" className="flex-1 overflow-y-auto space-y-3 mt-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Shadow Layers</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddShadow}
              className="h-7 text-xs"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Layer
            </Button>
          </div>

          <Reorder.Group
            axis="y"
            values={shadows}
            onReorder={setShadows}
            className="space-y-3"
          >
            <AnimatePresence mode="popLayout">
              {shadows.map((shadow) => (
                <Reorder.Item
                  key={shadow.id}
                  value={shadow}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg border bg-card p-3 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                      <span className="text-xs font-medium">Layer</span>
                    </div>
                    {shadows.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveShadow(shadow.id)}
                        className="h-6 w-6"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Horizontal Offset */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Horizontal</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {shadow.offsetX}px
                      </span>
                    </div>
                    <Slider
                      value={[shadow.offsetX]}
                      onValueChange={(value) =>
                        handleUpdateShadow(shadow.id, { offsetX: value[0] })
                      }
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Vertical Offset */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Vertical</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {shadow.offsetY}px
                      </span>
                    </div>
                    <Slider
                      value={[shadow.offsetY]}
                      onValueChange={(value) =>
                        handleUpdateShadow(shadow.id, { offsetY: value[0] })
                      }
                      min={-50}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Blur Radius */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Blur</Label>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {shadow.blur}px
                      </span>
                    </div>
                    <Slider
                      value={[shadow.blur]}
                      onValueChange={(value) =>
                        handleUpdateShadow(shadow.id, { blur: value[0] })
                      }
                      min={0}
                      max={50}
                      step={1}
                    />
                  </div>

                  {/* Color & Opacity */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Color</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={shadow.color}
                          onChange={(e) =>
                            handleUpdateShadow(shadow.id, { color: e.target.value })
                          }
                          className="h-9 w-full cursor-pointer rounded border"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Opacity</Label>
                        <span className="text-xs text-muted-foreground">
                          {(shadow.opacity * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Slider
                        value={[shadow.opacity * 100]}
                        onValueChange={(value) =>
                          handleUpdateShadow(shadow.id, { opacity: value[0] / 100 })
                        }
                        min={0}
                        max={100}
                        step={1}
                      />
                    </div>
                  </div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        </TabsContent>

        {/* Text Style Tab */}
        <TabsContent value="style" className="flex-1 overflow-y-auto space-y-4 mt-3">
          {/* Sample Text */}
          <div className="space-y-2">
            <Label htmlFor="sampleText" className="text-xs font-medium">
              Sample Text
            </Label>
            <Input
              id="sampleText"
              value={textStyle.sampleText}
              onChange={(e) =>
                setTextStyle({ ...textStyle, sampleText: e.target.value })
              }
              placeholder="Enter text..."
              className="text-sm"
            />
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="fontSize" className="text-xs font-medium">
                Font Size
              </Label>
              <span className="text-xs text-muted-foreground tabular-nums">
                {textStyle.fontSize}px
              </span>
            </div>
            <Slider
              id="fontSize"
              value={[textStyle.fontSize]}
              onValueChange={(value) =>
                setTextStyle({ ...textStyle, fontSize: value[0] })
              }
              min={12}
              max={120}
              step={1}
            />
          </div>

          {/* Font Weight */}
          <div className="space-y-2">
            <Label htmlFor="fontWeight" className="text-xs font-medium">
              Font Weight
            </Label>
            <Select
              value={textStyle.fontWeight}
              onValueChange={(value) =>
                setTextStyle({ ...textStyle, fontWeight: value })
              }
            >
              <SelectTrigger id="fontWeight" className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="300">Light (300)</SelectItem>
                <SelectItem value="400">Regular (400)</SelectItem>
                <SelectItem value="500">Medium (500)</SelectItem>
                <SelectItem value="600">Semibold (600)</SelectItem>
                <SelectItem value="700">Bold (700)</SelectItem>
                <SelectItem value="800">Extrabold (800)</SelectItem>
                <SelectItem value="900">Black (900)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Color */}
          <div className="space-y-2">
            <Label htmlFor="textColor" className="text-xs font-medium">
              Text Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="textColor"
                value={textStyle.textColor}
                onChange={(e) =>
                  setTextStyle({ ...textStyle, textColor: e.target.value })
                }
                className="h-9 w-full cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {textStyle.textColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor="backgroundColor" className="text-xs font-medium">
              Background Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="backgroundColor"
                value={textStyle.backgroundColor}
                onChange={(e) =>
                  setTextStyle({ ...textStyle, backgroundColor: e.target.value })
                }
                className="h-9 w-full cursor-pointer rounded border"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {textStyle.backgroundColor.toUpperCase()}
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="flex-1 overflow-y-auto mt-3">
          <div className="grid grid-cols-2 gap-3">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                onClick={() => handleApplyPreset(preset)}
                className="h-auto flex-col gap-2 p-4 text-xs"
              >
                <div
                  className="w-full h-16 rounded flex items-center justify-center font-bold text-xl"
                  style={{
                    backgroundColor: preset.textStyle?.backgroundColor || defaultTextStyle.backgroundColor,
                    color: preset.textStyle?.textColor || defaultTextStyle.textColor,
                    textShadow: generateTextShadow(
                      preset.shadows.map((s, i) => ({ ...s, id: `preview-${i}` }))
                    ),
                  }}
                >
                  Aa
                </div>
                {preset.name}
              </Button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CSS Output & Copy */}
      <div className="space-y-2">
        <Label className="text-xs font-medium">CSS Output</Label>
        <div className="flex items-start gap-2">
          <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs break-all">
            text-shadow: {textShadowCSS};
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
