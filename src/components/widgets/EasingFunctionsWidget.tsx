"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import { Play, Pause, RotateCcw, Copy, Check, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

interface EasingFunctionsWidgetProps {
  widget: Widget;
}

// Easing function definitions
type EasingFunction = (t: number) => number;

const EASING_FUNCTIONS: Record<string, EasingFunction> = {
  // Linear
  linear: (t) => t,

  // Quad
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  // Cubic
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

  // Quart
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - --t * t * t * t,
  easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

  // Quint
  easeInQuint: (t) => t * t * t * t * t,
  easeOutQuint: (t) => 1 + --t * t * t * t * t,
  easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),

  // Sine
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,

  // Expo
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  // Circ
  easeInCirc: (t) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t) => Math.sqrt(1 - --t * t),
  easeInOutCirc: (t) => (t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2),

  // Back
  easeInBack: (t) => {
    const c = 1.70158;
    return t * t * ((c + 1) * t - c);
  },
  easeOutBack: (t) => {
    const c = 1.70158;
    return 1 + --t * t * ((c + 1) * t + c);
  },
  easeInOutBack: (t) => {
    const c = 1.70158 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c + 1) * 2 * t - c)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c + 1) * (t * 2 - 2) + c) + 2) / 2;
  },

  // Elastic
  easeInElastic: (t) => {
    const c = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c);
  },
  easeOutElastic: (t) => {
    const c = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c) + 1;
  },
  easeInOutElastic: (t) => {
    const c = (2 * Math.PI) / 4.5;
    return t === 0 ? 0 : t === 1 ? 1 : t < 0.5
      ? -(Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * c)) / 2
      : (Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * c)) / 2 + 1;
  },

  // Bounce
  easeInBounce: (t) => 1 - EASING_FUNCTIONS.easeOutBounce(1 - t),
  easeOutBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  easeInOutBounce: (t) => (t < 0.5
    ? (1 - EASING_FUNCTIONS.easeOutBounce(1 - 2 * t)) / 2
    : (1 + EASING_FUNCTIONS.easeOutBounce(2 * t - 1)) / 2),
};

const EASING_CATEGORIES = {
  Linear: ['linear'],
  Quad: ['easeInQuad', 'easeOutQuad', 'easeInOutQuad'],
  Cubic: ['easeInCubic', 'easeOutCubic', 'easeInOutCubic'],
  Quart: ['easeInQuart', 'easeOutQuart', 'easeInOutQuart'],
  Quint: ['easeInQuint', 'easeOutQuint', 'easeInOutQuint'],
  Sine: ['easeInSine', 'easeOutSine', 'easeInOutSine'],
  Expo: ['easeInExpo', 'easeOutExpo', 'easeInOutExpo'],
  Circ: ['easeInCirc', 'easeOutCirc', 'easeInOutCirc'],
  Back: ['easeInBack', 'easeOutBack', 'easeInOutBack'],
  Elastic: ['easeInElastic', 'easeOutElastic', 'easeInOutElastic'],
  Bounce: ['easeInBounce', 'easeOutBounce', 'easeInOutBounce'],
};

// Generate code snippets
const generateCode = (easingName: string, format: 'css' | 'js' | 'glsl') => {
  if (format === 'css') {
    const cssMap: Record<string, string> = {
      linear: 'linear',
      easeInQuad: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      easeOutQuad: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      easeInOutQuad: 'cubic-bezier(0.455, 0.03, 0.515, 0.955)',
      easeInCubic: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      easeOutCubic: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
      easeInOutCubic: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      easeInQuart: 'cubic-bezier(0.895, 0.03, 0.685, 0.22)',
      easeOutQuart: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
      easeInOutQuart: 'cubic-bezier(0.77, 0, 0.175, 1)',
      easeInQuint: 'cubic-bezier(0.755, 0.05, 0.855, 0.06)',
      easeOutQuint: 'cubic-bezier(0.23, 1, 0.32, 1)',
      easeInOutQuint: 'cubic-bezier(0.86, 0, 0.07, 1)',
      easeInSine: 'cubic-bezier(0.47, 0, 0.745, 0.715)',
      easeOutSine: 'cubic-bezier(0.39, 0.575, 0.565, 1)',
      easeInOutSine: 'cubic-bezier(0.445, 0.05, 0.55, 0.95)',
      easeInExpo: 'cubic-bezier(0.95, 0.05, 0.795, 0.035)',
      easeOutExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
      easeInOutExpo: 'cubic-bezier(1, 0, 0, 1)',
      easeInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
      easeOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',
      easeInOutCirc: 'cubic-bezier(0.785, 0.135, 0.15, 0.86)',
    };
    return cssMap[easingName] || 'ease';
  } else if (format === 'js') {
    const funcBody = EASING_FUNCTIONS[easingName].toString();
    return `function ${easingName}(t) ${funcBody.substring(funcBody.indexOf('{'))}`;
  } else {
    // GLSL approximations
    const glslMap: Record<string, string> = {
      linear: 'float easing(float t) { return t; }',
      easeInQuad: 'float easing(float t) { return t * t; }',
      easeOutQuad: 'float easing(float t) { return t * (2.0 - t); }',
      easeInOutQuad: 'float easing(float t) { return t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t; }',
      easeInCubic: 'float easing(float t) { return t * t * t; }',
      easeOutCubic: 'float easing(float t) { return (--t) * t * t + 1.0; }',
      easeInOutCubic: 'float easing(float t) { return t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0; }',
      easeInSine: 'float easing(float t) { return 1.0 - cos((t * PI) / 2.0); }',
      easeOutSine: 'float easing(float t) { return sin((t * PI) / 2.0); }',
      easeInOutSine: 'float easing(float t) { return -(cos(PI * t) - 1.0) / 2.0; }',
    };
    return glslMap[easingName] || 'float easing(float t) { return t; }';
  }
};

interface EasingConfig {
  selectedEasing?: string;
  compareEasing?: string;
  duration?: number;
  compareMode?: boolean;
}

export function EasingFunctionsWidget({ widget }: EasingFunctionsWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config || {}) as EasingConfig;

  // State
  const [selectedEasing, setSelectedEasing] = useState<string>(config.selectedEasing || 'easeInOutQuad');
  const [compareEasing, setCompareEasing] = useState<string>(config.compareEasing || 'easeInOutCubic');
  const [duration, setDuration] = useState<number>(config.duration || 1000);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(config.compareMode || false);

  // Bezier editor state
  const [bezierP1, setBezierP1] = useState({ x: 0.25, y: 0.1 });
  const [bezierP2, setBezierP2] = useState({ x: 0.25, y: 1 });

  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Save config
  const saveConfig = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        selectedEasing,
        compareEasing,
        duration,
        compareMode,
      },
    });
  };

  useEffect(() => {
    saveConfig();
  }, [selectedEasing, compareEasing, duration, compareMode]);

  // Animation loop
  const animate = (timestamp: number) => {
    if (!startTimeRef.current) startTimeRef.current = timestamp;

    const elapsed = timestamp - startTimeRef.current;
    const t = Math.min(elapsed / duration, 1);

    setProgress(t);

    if (t < 1) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setIsPlaying(false);
      startTimeRef.current = null;
    }
  };

  const handlePlay = () => {
    setIsPlaying(true);
    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  };

  const handleRestart = () => {
    setProgress(0);
    startTimeRef.current = null;
    if (isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      animationRef.current = requestAnimationFrame(animate);
    }
  };

  const handleCopyCode = async (format: 'css' | 'js' | 'glsl') => {
    const code = generateCode(selectedEasing, format);
    await navigator.clipboard.writeText(code);
    setCopiedCode(format);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Calculate eased values
  const easedValue = useMemo(() => {
    return EASING_FUNCTIONS[selectedEasing](progress);
  }, [selectedEasing, progress]);

  const compareEasedValue = useMemo(() => {
    return EASING_FUNCTIONS[compareEasing](progress);
  }, [compareEasing, progress]);

  // Generate curve points for visualization
  const curvePoints = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const y = EASING_FUNCTIONS[selectedEasing](t);
      points.push(`${t * 100},${100 - y * 100}`);
    }
    return points.join(' ');
  }, [selectedEasing]);

  const compareCurvePoints = useMemo(() => {
    const points: string[] = [];
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const y = EASING_FUNCTIONS[compareEasing](t);
      points.push(`${t * 100},${100 - y * 100}`);
    }
    return points.join(' ');
  }, [compareEasing]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <TrendingUp className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            Easing Functions
          </h3>
        </div>

        <Tabs defaultValue="visualizer" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="visualizer" className="text-[10px] @sm:text-xs @md:text-sm">
              Visualizer
            </TabsTrigger>
            <TabsTrigger value="compare" className="text-[10px] @sm:text-xs @md:text-sm">
              Compare
            </TabsTrigger>
            <TabsTrigger value="bezier" className="text-[10px] @sm:text-xs @md:text-sm">
              Bezier
            </TabsTrigger>
          </TabsList>

          {/* Visualizer Tab */}
          <TabsContent value="visualizer" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* Animation Preview */}
            <div className="relative w-full h-20 @sm:h-24 @md:h-28 bg-muted rounded-lg border border-border overflow-hidden">
              <motion.div
                className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 @sm:w-8 @sm:h-8 rounded-full bg-primary shadow-lg"
                style={{
                  x: `${easedValue * 100}%`,
                }}
              />
              <div className="absolute bottom-1 left-2 right-2 text-[10px] @sm:text-xs text-muted-foreground font-mono">
                Progress: {(progress * 100).toFixed(0)}% | Eased: {(easedValue * 100).toFixed(0)}%
              </div>
            </div>

            {/* Graph */}
            <div className="relative w-full aspect-square bg-muted rounded-lg border border-border p-2 @sm:p-3">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Grid */}
                <g className="opacity-20">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <g key={v}>
                      <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.5" />
                    </g>
                  ))}
                </g>

                {/* Curve */}
                <polyline
                  points={curvePoints}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Current position indicator */}
                <circle
                  cx={progress * 100}
                  cy={100 - easedValue * 100}
                  r="3"
                  fill="hsl(var(--primary))"
                  className="drop-shadow-lg"
                />
              </svg>
            </div>

            {/* Easing Selection */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Easing Function</Label>
              <Select value={selectedEasing} onValueChange={setSelectedEasing}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EASING_CATEGORIES).map(([category, easings]) => (
                    <div key={category}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">{category}</div>
                      {easings.map((easing) => (
                        <SelectItem key={easing} value={easing} className="text-[10px] @sm:text-xs">
                          {easing}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Slider */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Duration</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {duration}ms
                </span>
              </div>
              <Slider
                value={[duration]}
                onValueChange={(v) => setDuration(v[0])}
                min={100}
                max={3000}
                step={100}
                className="w-full"
              />
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                onClick={isPlaying ? handlePause : handlePlay}
                variant="default"
                size="sm"
                className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Play
                  </>
                )}
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="h-7 @sm:h-8 px-2"
              >
                <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>

            {/* Copy Code Buttons */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Copy Code</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['css', 'js', 'glsl'] as const).map((format) => (
                  <Button
                    key={format}
                    onClick={() => handleCopyCode(format)}
                    variant="outline"
                    size="sm"
                    className="h-7 @sm:h-8 text-[10px] @sm:text-xs uppercase"
                  >
                    {copiedCode === format ? (
                      <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    ) : (
                      <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    )}
                    {format}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Compare Tab */}
          <TabsContent value="compare" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* Side-by-side Animation */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">{selectedEasing}</Label>
                <div className="relative w-full h-20 @sm:h-24 bg-muted rounded-lg border border-border overflow-hidden">
                  <motion.div
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 @sm:w-6 @sm:h-6 rounded-full bg-primary shadow-lg"
                    style={{ x: `${easedValue * 85}%` }}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">{compareEasing}</Label>
                <div className="relative w-full h-20 @sm:h-24 bg-muted rounded-lg border border-border overflow-hidden">
                  <motion.div
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-5 h-5 @sm:w-6 @sm:h-6 rounded-full bg-violet-500 shadow-lg"
                    style={{ x: `${compareEasedValue * 85}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Overlay Graph */}
            <div className="relative w-full aspect-square bg-muted rounded-lg border border-border p-2 @sm:p-3">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Grid */}
                <g className="opacity-20">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <g key={v}>
                      <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.5" />
                    </g>
                  ))}
                </g>

                {/* Primary Curve */}
                <polyline
                  points={curvePoints}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Compare Curve */}
                <polyline
                  points={compareCurvePoints}
                  fill="none"
                  stroke="rgb(139, 92, 246)"
                  strokeWidth="2"
                  strokeDasharray="4 2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>

            {/* Compare Easing Selection */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Compare With</Label>
              <Select value={compareEasing} onValueChange={setCompareEasing}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EASING_CATEGORIES).map(([category, easings]) => (
                    <div key={category}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground">{category}</div>
                      {easings.map((easing) => (
                        <SelectItem key={easing} value={easing} className="text-[10px] @sm:text-xs">
                          {easing}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                onClick={isPlaying ? handlePause : handlePlay}
                variant="default"
                size="sm"
                className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Play
                  </>
                )}
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                size="sm"
                className="h-7 @sm:h-8 px-2"
              >
                <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              </Button>
            </div>
          </TabsContent>

          {/* Bezier Editor Tab */}
          <TabsContent value="bezier" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            <div className="relative w-full aspect-square bg-muted rounded-lg border border-border p-4">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                {/* Grid */}
                <g className="opacity-20">
                  {[0, 25, 50, 75, 100].map((v) => (
                    <g key={v}>
                      <line x1={v} y1="0" x2={v} y2="100" stroke="currentColor" strokeWidth="0.5" />
                      <line x1="0" y1={v} x2="100" y2={v} stroke="currentColor" strokeWidth="0.5" />
                    </g>
                  ))}
                </g>

                {/* Bezier curve */}
                <path
                  d={`M 0 100 C ${bezierP1.x * 100} ${100 - bezierP1.y * 100}, ${bezierP2.x * 100} ${100 - bezierP2.y * 100}, 100 0`}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Control lines */}
                <line
                  x1="0"
                  y1="100"
                  x2={bezierP1.x * 100}
                  y2={100 - bezierP1.y * 100}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
                <line
                  x1="100"
                  y1="0"
                  x2={bezierP2.x * 100}
                  y2={100 - bezierP2.y * 100}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* Control points */}
                <circle
                  cx={bezierP1.x * 100}
                  cy={100 - bezierP1.y * 100}
                  r="4"
                  fill="hsl(var(--primary))"
                  className="cursor-move"
                />
                <circle
                  cx={bezierP2.x * 100}
                  cy={100 - bezierP2.y * 100}
                  r="4"
                  fill="hsl(var(--primary))"
                  className="cursor-move"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">P1: ({bezierP1.x.toFixed(2)}, {bezierP1.y.toFixed(2)})</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">X</Label>
                    <Slider
                      value={[bezierP1.x * 100]}
                      onValueChange={(v) => setBezierP1({ ...bezierP1, x: v[0] / 100 })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Y</Label>
                    <Slider
                      value={[bezierP1.y * 100]}
                      onValueChange={(v) => setBezierP1({ ...bezierP1, y: v[0] / 100 })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">P2: ({bezierP2.x.toFixed(2)}, {bezierP2.y.toFixed(2)})</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px]">X</Label>
                    <Slider
                      value={[bezierP2.x * 100]}
                      onValueChange={(v) => setBezierP2({ ...bezierP2, x: v[0] / 100 })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                  <div>
                    <Label className="text-[10px]">Y</Label>
                    <Slider
                      value={[bezierP2.y * 100]}
                      onValueChange={(v) => setBezierP2({ ...bezierP2, y: v[0] / 100 })}
                      min={0}
                      max={100}
                      step={1}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={async () => {
                  const bezierCode = `cubic-bezier(${bezierP1.x.toFixed(2)}, ${bezierP1.y.toFixed(2)}, ${bezierP2.x.toFixed(2)}, ${bezierP2.y.toFixed(2)})`;
                  await navigator.clipboard.writeText(bezierCode);
                  setCopiedCode('bezier');
                  setTimeout(() => setCopiedCode(null), 2000);
                }}
                variant="default"
                size="sm"
                className="w-full h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                {copiedCode === 'bezier' ? (
                  <>
                    <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Copy Bezier
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
