"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import {
  Move3D,
  Copy,
  Check,
  Maximize,
  RotateCcw,
  Play,
  Pause,
} from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface CSSTransformWidgetProps {
  widget: Widget;
}

interface TransformConfig {
  // 2D Rotation
  rotate: number;
  // 3D Rotation
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  // Scale
  scale: number;
  scaleX: number;
  scaleY: number;
  // Translate
  translateX: number;
  translateY: number;
  // Skew
  skewX: number;
  skewY: number;
  // Transform origin
  transformOrigin: string;
  // 3D settings
  perspective: number;
  enable3D: boolean;
}

interface Preset {
  name: string;
  config: Partial<TransformConfig>;
}

const defaultConfig: TransformConfig = {
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  rotateZ: 0,
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  translateX: 0,
  translateY: 0,
  skewX: 0,
  skewY: 0,
  transformOrigin: "center",
  perspective: 1000,
  enable3D: false,
};

const presets: Preset[] = [
  {
    name: "Flip Horizontal",
    config: { rotateY: 180, enable3D: true },
  },
  {
    name: "Flip Vertical",
    config: { rotateX: 180, enable3D: true },
  },
  {
    name: "Rotate 45°",
    config: { rotate: 45 },
  },
  {
    name: "Zoom In",
    config: { scale: 1.5 },
  },
  {
    name: "Zoom Out",
    config: { scale: 0.7 },
  },
  {
    name: "Skew Left",
    config: { skewX: -15, skewY: 5 },
  },
  {
    name: "3D Flip Card",
    config: { rotateY: 180, rotateX: 20, enable3D: true, perspective: 1000 },
  },
  {
    name: "Perspective Tilt",
    config: { rotateX: 25, rotateY: -15, enable3D: true, perspective: 800 },
  },
];

const transformOrigins = [
  { value: "top left", label: "↖" },
  { value: "top center", label: "↑" },
  { value: "top right", label: "↗" },
  { value: "center left", label: "←" },
  { value: "center", label: "●" },
  { value: "center right", label: "→" },
  { value: "bottom left", label: "↙" },
  { value: "bottom center", label: "↓" },
  { value: "bottom right", label: "↘" },
];

function generateTransformCSS(config: TransformConfig): string {
  const transforms: string[] = [];

  // Add transforms in order
  if (config.translateX !== 0 || config.translateY !== 0) {
    transforms.push(`translate(${config.translateX}px, ${config.translateY}px)`);
  }

  if (config.rotate !== 0) {
    transforms.push(`rotate(${config.rotate}deg)`);
  }

  if (config.enable3D) {
    if (config.rotateX !== 0) transforms.push(`rotateX(${config.rotateX}deg)`);
    if (config.rotateY !== 0) transforms.push(`rotateY(${config.rotateY}deg)`);
    if (config.rotateZ !== 0) transforms.push(`rotateZ(${config.rotateZ}deg)`);
  }

  // Handle scale
  if (config.scale !== 1 && config.scaleX === 1 && config.scaleY === 1) {
    transforms.push(`scale(${config.scale.toFixed(2)})`);
  } else if (config.scaleX !== 1 || config.scaleY !== 1) {
    transforms.push(`scale(${config.scaleX.toFixed(2)}, ${config.scaleY.toFixed(2)})`);
  }

  if (config.skewX !== 0 || config.skewY !== 0) {
    transforms.push(`skew(${config.skewX}deg, ${config.skewY}deg)`);
  }

  return transforms.length > 0 ? transforms.join(" ") : "none";
}

export function CSSTransformWidget({ widget }: CSSTransformWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [config, setConfig] = useState<TransformConfig>(() => {
    const saved = widget.config?.transformConfig as TransformConfig | undefined;
    return saved?.rotate !== undefined ? saved : defaultConfig;
  });

  const [copied, setCopied] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Save config to store when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          transformConfig: config,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [config, widget.id]);

  const transformCSS = useMemo(() => generateTransformCSS(config), [config]);

  const handleCopyCSS = async () => {
    try {
      const cssLines: string[] = [];
      cssLines.push(`transform: ${transformCSS};`);
      if (config.transformOrigin !== "center") {
        cssLines.push(`transform-origin: ${config.transformOrigin};`);
      }
      if (config.enable3D && config.perspective !== 1000) {
        cssLines.push(`perspective: ${config.perspective}px;`);
      }

      await navigator.clipboard.writeText(cssLines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleReset = () => {
    setConfig(defaultConfig);
  };

  const handleResetTransform = (key: keyof TransformConfig) => {
    setConfig((prev) => ({
      ...prev,
      [key]: defaultConfig[key],
    }));
  };

  const handlePresetClick = (preset: Preset) => {
    setConfig((_prev) => ({
      ...defaultConfig,
      ...preset.config,
    }));
  };

  const updateConfig = (updates: Partial<TransformConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const toggleAnimation = () => {
    setIsAnimating(!isAnimating);
  };

  return (
    <div className="flex h-full flex-col gap-3 @sm:gap-4 p-3 @sm:p-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Move3D className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs @sm:text-sm font-semibold">CSS Transform Generator</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleAnimation}
            className="h-7 w-7"
            title={isAnimating ? "Pause animation" : "Animate transform"}
          >
            {isAnimating ? (
              <Pause className="h-3.5 w-3.5" />
            ) : (
              <Play className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-7 w-7"
            title="Reset all"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Live Preview */}
      <div
        className="relative flex items-center justify-center rounded-lg border bg-muted/30 p-8 @sm:p-12 overflow-hidden"
        style={config.enable3D ? { perspective: `${config.perspective}px` } : {}}
      >
        <motion.div
          className="h-16 w-16 @sm:h-20 @sm:w-20 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg"
          style={{
            transform: transformCSS,
            transformOrigin: config.transformOrigin,
          }}
          animate={isAnimating ? {
            transform: [transformCSS, "none", transformCSS],
          } : {}}
          transition={isAnimating ? {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          } : { duration: 0.2 }}
        >
          <Maximize className="h-6 w-6 @sm:h-8 @sm:w-8 text-primary-foreground" />
        </motion.div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="2d" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-8 @sm:h-9">
          <TabsTrigger value="2d" className="text-[10px] @sm:text-xs">
            2D
          </TabsTrigger>
          <TabsTrigger value="3d" className="text-[10px] @sm:text-xs">
            3D
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
            Presets
          </TabsTrigger>
        </TabsList>

        {/* 2D Controls */}
        <TabsContent value="2d" className="flex-1 overflow-y-auto space-y-3 @sm:space-y-4 mt-2 @sm:mt-3">
          {/* Rotate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="rotate" className="text-xs font-medium">
                Rotate
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.rotate}°
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("rotate")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="rotate"
              value={[config.rotate]}
              onValueChange={(value) => updateConfig({ rotate: value[0] })}
              min={0}
              max={360}
              step={1}
              className="w-full"
            />
          </div>

          {/* Scale (Uniform) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scale" className="text-xs font-medium">
                Scale
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.scale.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("scale")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="scale"
              value={[config.scale]}
              onValueChange={(value) => updateConfig({ scale: value[0] })}
              min={0.1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Scale X */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scaleX" className="text-xs font-medium">
                Scale X
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.scaleX.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("scaleX")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="scaleX"
              value={[config.scaleX]}
              onValueChange={(value) => updateConfig({ scaleX: value[0] })}
              min={0.1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Scale Y */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scaleY" className="text-xs font-medium">
                Scale Y
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.scaleY.toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("scaleY")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="scaleY"
              value={[config.scaleY]}
              onValueChange={(value) => updateConfig({ scaleY: value[0] })}
              min={0.1}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          {/* Translate X */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="translateX" className="text-xs font-medium">
                Translate X
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.translateX}px
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("translateX")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="translateX"
              value={[config.translateX]}
              onValueChange={(value) => updateConfig({ translateX: value[0] })}
              min={-200}
              max={200}
              step={1}
              className="w-full"
            />
          </div>

          {/* Translate Y */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="translateY" className="text-xs font-medium">
                Translate Y
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.translateY}px
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("translateY")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="translateY"
              value={[config.translateY]}
              onValueChange={(value) => updateConfig({ translateY: value[0] })}
              min={-200}
              max={200}
              step={1}
              className="w-full"
            />
          </div>

          {/* Skew X */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="skewX" className="text-xs font-medium">
                Skew X
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.skewX}°
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("skewX")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="skewX"
              value={[config.skewX]}
              onValueChange={(value) => updateConfig({ skewX: value[0] })}
              min={-45}
              max={45}
              step={1}
              className="w-full"
            />
          </div>

          {/* Skew Y */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="skewY" className="text-xs font-medium">
                Skew Y
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums">
                  {config.skewY}°
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleResetTransform("skewY")}
                  className="h-5 w-5"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Slider
              id="skewY"
              value={[config.skewY]}
              onValueChange={(value) => updateConfig({ skewY: value[0] })}
              min={-45}
              max={45}
              step={1}
              className="w-full"
            />
          </div>

          {/* Transform Origin */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Transform Origin</Label>
            <div className="grid grid-cols-3 gap-1 p-2 rounded-lg border bg-muted/30">
              {transformOrigins.map((origin) => (
                <button
                  key={origin.value}
                  onClick={() => updateConfig({ transformOrigin: origin.value })}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded text-sm font-medium transition-colors",
                    config.transformOrigin === origin.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent"
                  )}
                  title={origin.value}
                >
                  {origin.label}
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* 3D Controls */}
        <TabsContent value="3d" className="flex-1 overflow-y-auto space-y-3 @sm:space-y-4 mt-2 @sm:mt-3">
          {/* Enable 3D */}
          <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
            <Label htmlFor="enable3d" className="text-xs font-medium">
              Enable 3D Transforms
            </Label>
            <Switch
              id="enable3d"
              checked={config.enable3D}
              onCheckedChange={(checked) => updateConfig({ enable3D: checked })}
            />
          </div>

          {config.enable3D && (
            <>
              {/* Perspective */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="perspective" className="text-xs font-medium">
                    Perspective
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {config.perspective}px
                  </span>
                </div>
                <Slider
                  id="perspective"
                  value={[config.perspective]}
                  onValueChange={(value) => updateConfig({ perspective: value[0] })}
                  min={100}
                  max={2000}
                  step={50}
                  className="w-full"
                />
              </div>

              {/* Rotate X */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rotateX" className="text-xs font-medium">
                    Rotate X
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {config.rotateX}°
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetTransform("rotateX")}
                      className="h-5 w-5"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Slider
                  id="rotateX"
                  value={[config.rotateX]}
                  onValueChange={(value) => updateConfig({ rotateX: value[0] })}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Rotate Y */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rotateY" className="text-xs font-medium">
                    Rotate Y
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {config.rotateY}°
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetTransform("rotateY")}
                      className="h-5 w-5"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Slider
                  id="rotateY"
                  value={[config.rotateY]}
                  onValueChange={(value) => updateConfig({ rotateY: value[0] })}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Rotate Z */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="rotateZ" className="text-xs font-medium">
                    Rotate Z
                  </Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {config.rotateZ}°
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResetTransform("rotateZ")}
                      className="h-5 w-5"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Slider
                  id="rotateZ"
                  value={[config.rotateZ]}
                  onValueChange={(value) => updateConfig({ rotateZ: value[0] })}
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>
            </>
          )}

          {!config.enable3D && (
            <div className="flex items-center justify-center p-8 text-center text-xs text-muted-foreground">
              Enable 3D transforms to access rotateX, rotateY, rotateZ, and perspective controls
            </div>
          )}
        </TabsContent>

        {/* Presets */}
        <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
          <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
            {presets.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                onClick={() => handlePresetClick(preset)}
                className="h-auto flex-col gap-2 py-3 text-xs"
              >
                <div
                  className="relative h-12 w-12 flex items-center justify-center"
                  style={preset.config.enable3D ? { perspective: "200px" } : {}}
                >
                  <div
                    className="h-8 w-8 rounded bg-primary/80 transition-transform duration-300"
                    style={{
                      transform: generateTransformCSS({
                        ...defaultConfig,
                        ...preset.config,
                      } as TransformConfig),
                    }}
                  />
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
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-md border bg-muted px-2 @sm:px-3 py-2 text-[10px] @sm:text-xs font-mono overflow-x-auto">
              transform: {transformCSS};
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
          {config.transformOrigin !== "center" && (
            <code className="rounded-md border bg-muted px-2 @sm:px-3 py-2 text-[10px] @sm:text-xs font-mono">
              transform-origin: {config.transformOrigin};
            </code>
          )}
          {config.enable3D && (
            <code className="rounded-md border bg-muted px-2 @sm:px-3 py-2 text-[10px] @sm:text-xs font-mono">
              perspective: {config.perspective}px;
            </code>
          )}
        </div>
      </div>
    </div>
  );
}
