"use client";

import { useState, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, RotateCcw, Copy, Check, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CSSAnimationWidgetProps {
  widget: Widget;
}

type PresetAnimationType =
  | "fade-in"
  | "fade-out"
  | "slide-in-left"
  | "slide-in-right"
  | "slide-in-top"
  | "slide-in-bottom"
  | "slide-out-left"
  | "slide-out-right"
  | "slide-out-top"
  | "slide-out-bottom"
  | "bounce"
  | "pulse"
  | "shake"
  | "spin"
  | "flip"
  | "zoom-in"
  | "zoom-out"
  | "swing";

type TimingFunction = "ease" | "ease-in" | "ease-out" | "ease-in-out" | "linear" | "cubic-bezier";
type Direction = "normal" | "reverse" | "alternate" | "alternate-reverse";
type FillMode = "none" | "forwards" | "backwards" | "both";

interface AnimationConfig {
  presetAnimation?: PresetAnimationType;
  duration: number; // in seconds
  timingFunction: TimingFunction;
  customBezier?: string;
  delay: number; // in seconds
  iterationCount: number | "infinite";
  direction: Direction;
  fillMode: FillMode;
  customKeyframes?: string;
}

// Preset animation keyframes
const PRESET_KEYFRAMES: Record<PresetAnimationType, string> = {
  "fade-in": `@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}`,
  "fade-out": `@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}`,
  "slide-in-left": `@keyframes slide-in-left {
  from {
    opacity: 0;
    transform: translateX(-100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`,
  "slide-in-right": `@keyframes slide-in-right {
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}`,
  "slide-in-top": `@keyframes slide-in-top {
  from {
    opacity: 0;
    transform: translateY(-100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  "slide-in-bottom": `@keyframes slide-in-bottom {
  from {
    opacity: 0;
    transform: translateY(100%);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}`,
  "slide-out-left": `@keyframes slide-out-left {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(-100%);
  }
}`,
  "slide-out-right": `@keyframes slide-out-right {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}`,
  "slide-out-top": `@keyframes slide-out-top {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(-100%);
  }
}`,
  "slide-out-bottom": `@keyframes slide-out-bottom {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0;
    transform: translateY(100%);
  }
}`,
  bounce: `@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-30px);
  }
  60% {
    transform: translateY(-15px);
  }
}`,
  pulse: `@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}`,
  shake: `@keyframes shake {
  0%, 100% {
    transform: translateX(0);
  }
  10%, 30%, 50%, 70%, 90% {
    transform: translateX(-10px);
  }
  20%, 40%, 60%, 80% {
    transform: translateX(10px);
  }
}`,
  spin: `@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}`,
  flip: `@keyframes flip {
  from {
    transform: perspective(400px) rotateY(0);
  }
  to {
    transform: perspective(400px) rotateY(360deg);
  }
}`,
  "zoom-in": `@keyframes zoom-in {
  from {
    opacity: 0;
    transform: scale(0);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}`,
  "zoom-out": `@keyframes zoom-out {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0);
  }
}`,
  swing: `@keyframes swing {
  20% {
    transform: rotate(15deg);
  }
  40% {
    transform: rotate(-10deg);
  }
  60% {
    transform: rotate(5deg);
  }
  80% {
    transform: rotate(-5deg);
  }
  100% {
    transform: rotate(0deg);
  }
}`,
};

const DEFAULT_CONFIG: AnimationConfig = {
  presetAnimation: "fade-in",
  duration: 1,
  timingFunction: "ease",
  delay: 0,
  iterationCount: 1,
  direction: "normal",
  fillMode: "forwards",
};

export function CSSAnimationWidget({ widget }: CSSAnimationWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Initialize from widget config or use defaults
  const [config, setConfig] = useState<AnimationConfig>(() => {
    const savedConfig = widget.config?.animationConfig as AnimationConfig | undefined;
    return savedConfig || DEFAULT_CONFIG;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedShorthand, setCopiedShorthand] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Save config to widget store (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          animationConfig: config,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [config, widget.id]);

  // Generate animation name
  const animationName = useMemo(() => {
    if (isCustomMode && config.customKeyframes) {
      // Extract animation name from custom keyframes
      const match = config.customKeyframes.match(/@keyframes\s+([a-zA-Z0-9-_]+)/);
      return match ? match[1] : "custom-animation";
    }
    return config.presetAnimation || "fade-in";
  }, [config.presetAnimation, config.customKeyframes, isCustomMode]);

  // Generate keyframes CSS
  const keyframesCSS = useMemo(() => {
    if (isCustomMode && config.customKeyframes) {
      return config.customKeyframes;
    }
    return config.presetAnimation ? PRESET_KEYFRAMES[config.presetAnimation] : PRESET_KEYFRAMES["fade-in"];
  }, [config.presetAnimation, config.customKeyframes, isCustomMode]);

  // Generate animation shorthand property
  const animationShorthand = useMemo(() => {
    const timingFunc =
      config.timingFunction === "cubic-bezier" && config.customBezier
        ? `cubic-bezier(${config.customBezier})`
        : config.timingFunction;

    const iteration = config.iterationCount === "infinite" ? "infinite" : config.iterationCount;

    return `${animationName} ${config.duration}s ${timingFunc} ${config.delay}s ${iteration} ${config.direction} ${config.fillMode}`;
  }, [animationName, config]);

  const updateConfig = (updates: Partial<AnimationConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const handlePlay = () => {
    setIsPlaying(true);
    setAnimationKey((prev) => prev + 1);

    // Auto-pause after one iteration if not infinite
    if (config.iterationCount !== "infinite") {
      const totalDuration = (config.duration + config.delay) * (config.iterationCount as number) * 1000;
      setTimeout(() => {
        setIsPlaying(false);
      }, totalDuration);
    }
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setIsPlaying(false);
    setTimeout(() => {
      setAnimationKey((prev) => prev + 1);
      setIsPlaying(true);

      if (config.iterationCount !== "infinite") {
        const totalDuration = (config.duration + config.delay) * (config.iterationCount as number) * 1000;
        setTimeout(() => {
          setIsPlaying(false);
        }, totalDuration);
      }
    }, 50);
  };

  const handleCopyKeyframes = async () => {
    await navigator.clipboard.writeText(keyframesCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShorthand = async () => {
    await navigator.clipboard.writeText(`animation: ${animationShorthand};`);
    setCopiedShorthand(true);
    setTimeout(() => setCopiedShorthand(false), 2000);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3 @md:gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <Sparkles className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            CSS Animation Generator
          </h3>
        </div>

        {/* Live Preview */}
        <div className="relative w-full aspect-[2/1] @md:aspect-[3/1] rounded-lg border border-border overflow-hidden bg-muted/30 flex items-center justify-center">
          <style>{keyframesCSS}</style>
          <AnimatePresence mode="wait">
            <motion.div
              key={animationKey}
              className="w-16 h-16 @sm:w-20 @sm:h-20 @md:w-24 @md:h-24 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center"
              style={
                isPlaying
                  ? {
                      animation: animationShorthand,
                    }
                  : undefined
              }
            >
              <Sparkles className="w-6 h-6 @sm:w-8 @sm:h-8 @md:w-10 @md:h-10 text-primary-foreground" />
            </motion.div>
          </AnimatePresence>

          {/* Playback controls */}
          <div className="absolute bottom-2 right-2 flex gap-1 @sm:gap-1.5">
            {!isPlaying ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePlay}
                className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
              >
                <Play className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={handlePause}
                className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
              >
                <Pause className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              onClick={handleRestart}
              className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
            >
              <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Tabs for Presets and Custom */}
        <Tabs
          defaultValue="presets"
          className="flex-1 overflow-hidden flex flex-col"
          onValueChange={(value) => setIsCustomMode(value === "custom")}
        >
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs @md:text-sm">
              Controls
            </TabsTrigger>
            <TabsTrigger value="custom" className="text-[10px] @sm:text-xs @md:text-sm">
              Custom
            </TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-2 @sm:grid-cols-3 gap-1.5 @sm:gap-2">
              {Object.keys(PRESET_KEYFRAMES).map((preset) => (
                <Button
                  key={preset}
                  variant={config.presetAnimation === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateConfig({ presetAnimation: preset as PresetAnimationType })}
                  className="h-auto py-2 text-[10px] @sm:text-xs"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Controls Tab */}
          <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Duration */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Duration</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {config.duration.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[config.duration]}
                onValueChange={(value) => updateConfig({ duration: value[0] })}
                min={0.1}
                max={5}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Timing Function */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Timing Function</Label>
              <Select
                value={config.timingFunction}
                onValueChange={(value) => updateConfig({ timingFunction: value as TimingFunction })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ease">ease</SelectItem>
                  <SelectItem value="ease-in">ease-in</SelectItem>
                  <SelectItem value="ease-out">ease-out</SelectItem>
                  <SelectItem value="ease-in-out">ease-in-out</SelectItem>
                  <SelectItem value="linear">linear</SelectItem>
                  <SelectItem value="cubic-bezier">cubic-bezier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Bezier */}
            {config.timingFunction === "cubic-bezier" && (
              <div className="space-y-1 @sm:space-y-1.5">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Cubic Bezier</Label>
                <input
                  type="text"
                  placeholder="0.42, 0, 0.58, 1"
                  value={config.customBezier || ""}
                  onChange={(e) => updateConfig({ customBezier: e.target.value })}
                  className="w-full h-7 @sm:h-8 @md:h-9 px-2 text-[10px] @sm:text-xs @md:text-sm rounded-md border border-input bg-background"
                />
              </div>
            )}

            {/* Delay */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Delay</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {config.delay.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[config.delay]}
                onValueChange={(value) => updateConfig({ delay: value[0] })}
                min={0}
                max={2}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Iteration Count */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Iteration Count</Label>
              <Select
                value={config.iterationCount.toString()}
                onValueChange={(value) =>
                  updateConfig({ iterationCount: value === "infinite" ? "infinite" : parseInt(value) })
                }
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="infinite">infinite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direction */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Direction</Label>
              <Select
                value={config.direction}
                onValueChange={(value) => updateConfig({ direction: value as Direction })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">normal</SelectItem>
                  <SelectItem value="reverse">reverse</SelectItem>
                  <SelectItem value="alternate">alternate</SelectItem>
                  <SelectItem value="alternate-reverse">alternate-reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Fill Mode */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Fill Mode</Label>
              <Select
                value={config.fillMode}
                onValueChange={(value) => updateConfig({ fillMode: value as FillMode })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">none</SelectItem>
                  <SelectItem value="forwards">forwards</SelectItem>
                  <SelectItem value="backwards">backwards</SelectItem>
                  <SelectItem value="both">both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Custom Keyframes Tab */}
          <TabsContent value="custom" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Custom Keyframes</Label>
              <Textarea
                placeholder={`@keyframes my-animation {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
  }
}`}
                value={config.customKeyframes || ""}
                onChange={(e) => updateConfig({ customKeyframes: e.target.value })}
                className="min-h-[120px] @sm:min-h-[150px] @md:min-h-[180px] font-mono text-[10px] @sm:text-xs resize-none"
              />
              <p className="text-[9px] @sm:text-[10px] text-muted-foreground">
                Enter your custom @keyframes CSS. The animation name will be auto-detected.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* CSS Output */}
        <div className="space-y-1.5 @sm:space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] @sm:text-xs @md:text-sm">@keyframes CSS</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyKeyframes}
              className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <pre className="p-2 @sm:p-2.5 @md:p-3 rounded-md border bg-muted text-[9px] @sm:text-[10px] @md:text-xs overflow-x-auto font-mono">
            {keyframesCSS}
          </pre>
        </div>

        {/* Animation Shorthand */}
        <div className="space-y-1.5 @sm:space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] @sm:text-xs @md:text-sm">Animation Property</Label>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCopyShorthand}
              className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
            >
              {copiedShorthand ? (
                <>
                  <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <code className="block p-2 @sm:p-2.5 @md:p-3 rounded-md border bg-muted text-[9px] @sm:text-[10px] @md:text-xs overflow-x-auto">
            animation: {animationShorthand};
          </code>
        </div>
      </div>
    </div>
  );
}
