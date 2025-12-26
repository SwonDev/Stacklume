"use client";

import { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { Monitor, Smartphone, Tablet, Copy, Check, Gamepad2, Eye, Maximize2 } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface ScreenResolutionWidgetProps {
  widget: Widget;
}

interface Resolution {
  name: string;
  width: number;
  height: number;
  aspectRatio: string;
  category: "hd" | "mobile" | "console" | "cinema";
}

interface SafeAreaConfig {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

// Calculate GCD for aspect ratio
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

// Calculate aspect ratio from dimensions
function calculateAspectRatio(width: number, height: number): string {
  if (!width || !height || width <= 0 || height <= 0) return "0:0";
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
}

// Common game resolutions database
const RESOLUTIONS: Resolution[] = [
  // HD/Desktop
  { name: "HD (720p)", width: 1280, height: 720, aspectRatio: "16:9", category: "hd" },
  { name: "Full HD (1080p)", width: 1920, height: 1080, aspectRatio: "16:9", category: "hd" },
  { name: "2K (QHD)", width: 2560, height: 1440, aspectRatio: "16:9", category: "hd" },
  { name: "4K (UHD)", width: 3840, height: 2160, aspectRatio: "16:9", category: "hd" },
  { name: "8K", width: 7680, height: 4320, aspectRatio: "16:9", category: "hd" },
  { name: "Ultrawide (QHD)", width: 3440, height: 1440, aspectRatio: "21:9", category: "hd" },
  { name: "Super Ultrawide", width: 5120, height: 1440, aspectRatio: "32:9", category: "hd" },
  { name: "Standard (4:3)", width: 1024, height: 768, aspectRatio: "4:3", category: "hd" },

  // Mobile Devices
  { name: "iPhone 15 Pro", width: 1179, height: 2556, aspectRatio: "19.5:9", category: "mobile" },
  { name: "iPhone 15", width: 1170, height: 2532, aspectRatio: "19.5:9", category: "mobile" },
  { name: "iPhone SE", width: 750, height: 1334, aspectRatio: "16:9", category: "mobile" },
  { name: "iPad Pro 12.9", width: 2048, height: 2732, aspectRatio: "4:3", category: "mobile" },
  { name: "iPad Air", width: 1640, height: 2360, aspectRatio: "3:4", category: "mobile" },
  { name: "Samsung Galaxy S24", width: 1080, height: 2340, aspectRatio: "19.5:9", category: "mobile" },
  { name: "Pixel 8 Pro", width: 1344, height: 2992, aspectRatio: "20:9", category: "mobile" },
  { name: "Android Standard", width: 1080, height: 1920, aspectRatio: "16:9", category: "mobile" },

  // Gaming Consoles
  { name: "Nintendo Switch (Docked)", width: 1920, height: 1080, aspectRatio: "16:9", category: "console" },
  { name: "Nintendo Switch (Handheld)", width: 1280, height: 720, aspectRatio: "16:9", category: "console" },
  { name: "PlayStation 5", width: 3840, height: 2160, aspectRatio: "16:9", category: "console" },
  { name: "Xbox Series X", width: 3840, height: 2160, aspectRatio: "16:9", category: "console" },
  { name: "Steam Deck", width: 1280, height: 800, aspectRatio: "16:10", category: "console" },

  // Cinema/Film
  { name: "DCI 2K", width: 2048, height: 1080, aspectRatio: "256:135", category: "cinema" },
  { name: "DCI 4K", width: 4096, height: 2160, aspectRatio: "256:135", category: "cinema" },
  { name: "Cinemascope", width: 2048, height: 858, aspectRatio: "2.39:1", category: "cinema" },
];

const COMMON_ASPECT_RATIOS = [
  { label: "16:9", w: 16, h: 9, name: "Widescreen" },
  { label: "4:3", w: 4, h: 3, name: "Standard" },
  { label: "21:9", w: 21, h: 9, name: "Ultrawide" },
  { label: "1:1", w: 1, h: 1, name: "Square" },
  { label: "9:16", w: 9, h: 16, name: "Portrait" },
  { label: "16:10", w: 16, h: 10, name: "PC/Mac" },
  { label: "19.5:9", w: 19.5, h: 9, name: "Mobile" },
];

export function ScreenResolutionWidget({ widget }: ScreenResolutionWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const [activeTab, setActiveTab] = useState<string>("calculator");
  const [width, setWidth] = useState<string>("1920");
  const [height, setHeight] = useState<string>("1080");
  const [targetAspectRatio, setTargetAspectRatio] = useState<string>("16:9");
  const [presetCategory, setPresetCategory] = useState<"hd" | "mobile" | "console" | "cinema">("hd");
  const [safeArea, setSafeArea] = useState<SafeAreaConfig>({ top: 44, bottom: 34, left: 0, right: 0 });
  const [dpi, setDpi] = useState<string>("96");
  const [viewportScale, setViewportScale] = useState<string>("100");
  const [copied, setCopied] = useState<string | null>(null);

  // Load from config
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (widget.config?.screenWidth) setWidth(String(widget.config.screenWidth));
      if (widget.config?.screenHeight) setHeight(String(widget.config.screenHeight));
      if (widget.config?.targetAspectRatio) setTargetAspectRatio(String(widget.config.targetAspectRatio));
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.config]);

  // Calculate derived values
  const currentAspectRatio = useMemo(() => {
    const w = parseInt(width) || 0;
    const h = parseInt(height) || 0;
    return calculateAspectRatio(w, h);
  }, [width, height]);

  const pixelCount = useMemo(() => {
    const w = parseInt(width) || 0;
    const h = parseInt(height) || 0;
    return w * h;
  }, [width, height]);

  const safeAreaDimensions = useMemo(() => {
    const w = parseInt(width) || 0;
    const h = parseInt(height) || 0;
    return {
      width: w - safeArea.left - safeArea.right,
      height: h - safeArea.top - safeArea.bottom,
    };
  }, [width, height, safeArea]);

  const physicalSize = useMemo(() => {
    const w = parseInt(width) || 0;
    const h = parseInt(height) || 0;
    const dpiValue = parseFloat(dpi) || 96;
    return {
      width: (w / dpiValue).toFixed(2),
      height: (h / dpiValue).toFixed(2),
    };
  }, [width, height, dpi]);

  // Scale resolution maintaining aspect ratio
  const scaleResolution = (baseWidth: number, baseHeight: number, scale: number) => {
    return {
      width: Math.round(baseWidth * (scale / 100)),
      height: Math.round(baseHeight * (scale / 100)),
    };
  };

  // Find matching resolutions for target aspect ratio
  const matchingResolutions = useMemo(() => {
    const targetRatio = COMMON_ASPECT_RATIOS.find(r => r.label === targetAspectRatio);
    if (!targetRatio) return [];

    return RESOLUTIONS.filter(res => {
      const ratio = calculateAspectRatio(res.width, res.height);
      return ratio === `${targetRatio.w}:${targetRatio.h}`;
    });
  }, [targetAspectRatio]);

  // Copy to clipboard
  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Apply preset resolution
  const applyPreset = (resolution: Resolution) => {
    setWidth(String(resolution.width));
    setHeight(String(resolution.height));
    saveConfig({ screenWidth: resolution.width, screenHeight: resolution.height });
  };

  // Save config
  const saveConfig = (newConfig: Record<string, unknown>) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...newConfig,
      },
    });
  };

  const filteredPresets = RESOLUTIONS.filter(r => r.category === presetCategory);

  return (
    <div className="flex h-full w-full flex-col gap-3 @container p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Monitor className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-base">Screen Resolution</h3>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="calculator" className="text-xs">Calculator</TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">Presets</TabsTrigger>
          <TabsTrigger value="safe-area" className="text-xs">Safe Area</TabsTrigger>
          <TabsTrigger value="tools" className="text-xs">Tools</TabsTrigger>
        </TabsList>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="width" className="text-xs">Width (px)</Label>
              <Input
                id="width"
                type="number"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                onBlur={() => saveConfig({ screenWidth: parseInt(width) || 0 })}
                className="h-9"
                min="1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height" className="text-xs">Height (px)</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                onBlur={() => saveConfig({ screenHeight: parseInt(height) || 0 })}
                className="h-9"
                min="1"
              />
            </div>
          </div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            {/* Aspect Ratio */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-2.5">
              <div>
                <div className="text-[10px] text-muted-foreground">Aspect Ratio</div>
                <div className="font-mono text-sm font-bold">{currentAspectRatio}</div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(currentAspectRatio, "ratio")}
                className="h-7 w-7"
              >
                {copied === "ratio" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            {/* Pixel Count */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-2.5">
              <div>
                <div className="text-[10px] text-muted-foreground">Total Pixels</div>
                <div className="font-mono text-sm font-semibold">
                  {pixelCount.toLocaleString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(`${width}, ${height}`, "code")}
                className="h-7 w-7"
                title="Copy as code (width, height)"
              >
                {copied === "code" ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            {/* Visual Preview */}
            <div className="flex flex-col items-center gap-2 rounded-lg border bg-muted/30 p-3">
              <div className="text-[10px] text-muted-foreground">Visual Preview</div>
              <div
                className="rounded border-2 border-primary bg-primary/10 transition-all"
                style={{
                  width: `${Math.min((parseInt(width) || 0) / 20, 150)}px`,
                  height: `${Math.min((parseInt(height) || 0) / 20, 150)}px`,
                }}
              />
              <div className="text-[10px] text-muted-foreground">
                {width} × {height} px
              </div>
            </div>
          </motion.div>

          {/* Scale Tool */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Scale Resolution</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={viewportScale}
                onChange={(e) => setViewportScale(e.target.value)}
                className="h-9"
                placeholder="100"
                min="1"
              />
              <Button
                size="sm"
                onClick={() => {
                  const scaled = scaleResolution(
                    parseInt(width) || 0,
                    parseInt(height) || 0,
                    parseFloat(viewportScale) || 100
                  );
                  setWidth(String(scaled.width));
                  setHeight(String(scaled.height));
                }}
                className="h-9 px-3"
              >
                Apply {viewportScale}%
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Presets Tab */}
        <TabsContent value="presets" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={presetCategory === "hd" ? "default" : "outline"}
              onClick={() => setPresetCategory("hd")}
              className="flex-1 h-8 text-xs"
            >
              <Monitor className="h-3 w-3 mr-1" />
              Desktop
            </Button>
            <Button
              size="sm"
              variant={presetCategory === "mobile" ? "default" : "outline"}
              onClick={() => setPresetCategory("mobile")}
              className="flex-1 h-8 text-xs"
            >
              <Smartphone className="h-3 w-3 mr-1" />
              Mobile
            </Button>
            <Button
              size="sm"
              variant={presetCategory === "console" ? "default" : "outline"}
              onClick={() => setPresetCategory("console")}
              className="flex-1 h-8 text-xs"
            >
              <Gamepad2 className="h-3 w-3 mr-1" />
              Console
            </Button>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {filteredPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="w-full flex items-center justify-between rounded-lg border bg-card p-2.5 hover:bg-accent transition-colors text-left"
              >
                <div>
                  <div className="font-medium text-xs">{preset.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {preset.width} × {preset.height}
                  </div>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground">
                  {preset.aspectRatio}
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* Safe Area Tab */}
        <TabsContent value="safe-area" className="space-y-3 mt-3">
          <div className="text-xs text-muted-foreground">
            Safe area for notched/curved devices
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Top</Label>
              <Input
                type="number"
                value={safeArea.top}
                onChange={(e) => setSafeArea({ ...safeArea, top: parseInt(e.target.value) || 0 })}
                className="h-9"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bottom</Label>
              <Input
                type="number"
                value={safeArea.bottom}
                onChange={(e) => setSafeArea({ ...safeArea, bottom: parseInt(e.target.value) || 0 })}
                className="h-9"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Left</Label>
              <Input
                type="number"
                value={safeArea.left}
                onChange={(e) => setSafeArea({ ...safeArea, left: parseInt(e.target.value) || 0 })}
                className="h-9"
                min="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Right</Label>
              <Input
                type="number"
                value={safeArea.right}
                onChange={(e) => setSafeArea({ ...safeArea, right: parseInt(e.target.value) || 0 })}
                className="h-9"
                min="0"
              />
            </div>
          </div>

          {/* Safe Area Result */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Safe Area</div>
              <Eye className="h-3 w-3 text-primary" />
            </div>
            <div className="font-mono text-sm font-semibold">
              {safeAreaDimensions.width} × {safeAreaDimensions.height} px
            </div>
            <div className="text-[10px] text-muted-foreground">
              Original: {width} × {height} px
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSafeArea({ top: 44, bottom: 34, left: 0, right: 0 })}
                className="h-8 text-xs"
              >
                iPhone (Notch)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSafeArea({ top: 0, bottom: 0, left: 0, right: 0 })}
                className="h-8 text-xs"
              >
                No Insets
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-3 mt-3">
          {/* DPI Calculator */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Pixel Density (DPI)</Label>
            <Input
              type="number"
              value={dpi}
              onChange={(e) => setDpi(e.target.value)}
              placeholder="96"
              className="h-9"
              min="1"
            />
            <div className="rounded-lg border bg-muted/50 p-2.5">
              <div className="text-[10px] text-muted-foreground">Physical Size</div>
              <div className="font-mono text-sm">
                {physicalSize.width} × {physicalSize.height} inches
              </div>
            </div>
          </div>

          {/* Find by Aspect Ratio */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Find by Aspect Ratio</Label>
            <Select value={targetAspectRatio} onValueChange={setTargetAspectRatio}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMON_ASPECT_RATIOS.map((ratio) => (
                  <SelectItem key={ratio.label} value={ratio.label}>
                    {ratio.label} ({ratio.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {matchingResolutions.length > 0 && (
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {matchingResolutions.slice(0, 5).map((res) => (
                  <button
                    key={res.name}
                    onClick={() => applyPreset(res)}
                    className="w-full flex items-center justify-between rounded border bg-card p-2 hover:bg-accent transition-colors text-left"
                  >
                    <span className="text-xs">{res.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {res.width}×{res.height}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Letterboxing Calculator */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Letterboxing</div>
              <Maximize2 className="h-3 w-3 text-primary" />
            </div>
            <div className="text-[10px] text-muted-foreground">
              Current: {currentAspectRatio}<br />
              {currentAspectRatio !== "16:9" && "Letterboxing may occur on 16:9 displays"}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
