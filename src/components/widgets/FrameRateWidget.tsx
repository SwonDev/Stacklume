"use client";

import { useState, useCallback, useMemo, type ReactElement } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Timer,
  Gauge,
  Copy,
  Monitor,
  ArrowLeftRight,
  Activity,
  Zap,
  Clock,
  Info,
  Check,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FrameRateWidgetProps {
  widget: Widget;
}

// Common frame rates
const COMMON_FPS = [30, 60, 120, 144, 165, 240, 360];

// Frame time breakdown preset
interface FrameBudget {
  name: string;
  percentage: number;
  color: string;
}

export function FrameRateWidget({ widget: _widget }: FrameRateWidgetProps) {
  const { updateWidget: _updateWidget } = useWidgetStore();

  // State
  const [fps, setFps] = useState<number>(60);
  const [ms, setMs] = useState<number>(16.67);
  const [timeScale, setTimeScale] = useState<number>(1);
  const [refreshRate, setRefreshRate] = useState<number>(60);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("converter");

  // Frame budget breakdown
  const [frameBudgets, setFrameBudgets] = useState<FrameBudget[]>([
    { name: "Render", percentage: 50, color: "hsl(var(--chart-1))" },
    { name: "Physics", percentage: 30, color: "hsl(var(--chart-2))" },
    { name: "AI/Logic", percentage: 15, color: "hsl(var(--chart-3))" },
    { name: "Other", percentage: 5, color: "hsl(var(--chart-4))" },
  ]);

  // FPS to milliseconds conversion
  const fpsToMs = useCallback((fps: number): number => {
    return fps > 0 ? 1000 / fps : 0;
  }, []);

  // Milliseconds to FPS conversion
  const msToFps = useCallback((ms: number): number => {
    return ms > 0 ? 1000 / ms : 0;
  }, []);

  // Update FPS (and sync ms)
  const handleFpsChange = useCallback((value: number) => {
    const newFps = Math.max(1, Math.min(1000, value));
    setFps(newFps);
    setMs(parseFloat(fpsToMs(newFps).toFixed(2)));
  }, [fpsToMs]);

  // Update ms (and sync FPS)
  const handleMsChange = useCallback((value: number) => {
    const newMs = Math.max(0.01, Math.min(1000, value));
    setMs(newMs);
    setFps(parseFloat(msToFps(newMs).toFixed(2)));
  }, [msToFps]);

  // Calculate delta time
  const deltaTime = useMemo(() => {
    return ms / 1000;
  }, [ms]);

  // Calculate scaled time
  const scaledMs = useMemo(() => {
    return ms * timeScale;
  }, [ms, timeScale]);

  // Calculate V-Sync info
  const vsyncInfo = useMemo(() => {
    const frameTime = fpsToMs(fps);
    const refreshTime = fpsToMs(refreshRate);
    const ratio = frameTime / refreshTime;
    const nearestMultiple = Math.round(ratio);
    const effectiveFps = refreshRate / Math.max(1, nearestMultiple);
    const isSynced = Math.abs(fps - effectiveFps) < 1;

    return {
      effectiveFps,
      isSynced,
      framesMissed: nearestMultiple - 1,
      recommendation: fps > refreshRate ? "Reduce FPS to match refresh rate" : isSynced ? "Perfect sync!" : "Consider capping to divisor of refresh rate"
    };
  }, [fps, refreshRate, fpsToMs]);

  // Calculate fixed timestep info
  const fixedTimestep = useMemo(() => {
    const targetDt = 1 / fps;
    const accumulator = targetDt * 1.5; // Simulated accumulator
    const iterations = Math.floor(accumulator / targetDt);
    const remainder = accumulator % targetDt;

    return {
      targetDt,
      accumulator,
      iterations,
      remainder
    };
  }, [fps]);

  // Calculate frame budget in milliseconds
  const frameBudgetMs = useMemo(() => {
    return frameBudgets.map(budget => ({
      ...budget,
      ms: (ms * budget.percentage) / 100
    }));
  }, [frameBudgets, ms]);

  // Copy to clipboard helper
  const copyToClipboard = useCallback((text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  // Update budget percentage
  const updateBudgetPercentage = useCallback((index: number, newPercentage: number) => {
    const newBudgets = [...frameBudgets];
    newBudgets[index].percentage = newPercentage;

    // Normalize to 100%
    const total = newBudgets.reduce((sum, b) => sum + b.percentage, 0);
    if (total > 0) {
      newBudgets.forEach(b => b.percentage = (b.percentage / total) * 100);
    }

    setFrameBudgets(newBudgets);
  }, [frameBudgets]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 @md:p-5">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-4 @md:grid-cols-4 mb-3">
            <TabsTrigger value="converter" className="text-xs @sm:text-sm">
              <ArrowLeftRight className="w-3 h-3 mr-1" />
              <span className="hidden @sm:inline">Convert</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="text-xs @sm:text-sm">
              <Activity className="w-3 h-3 mr-1" />
              <span className="hidden @sm:inline">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="vsync" className="text-xs @sm:text-sm">
              <Monitor className="w-3 h-3 mr-1" />
              <span className="hidden @sm:inline">V-Sync</span>
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs @sm:text-sm">
              <Zap className="w-3 h-3 mr-1" />
              <span className="hidden @sm:inline">Advanced</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            {/* CONVERTER TAB */}
            <TabsContent value="converter" className="mt-0 space-y-4 pr-3">
              {/* Main Conversion Display */}
              <div className="grid grid-cols-2 gap-3 @md:gap-4">
                {/* FPS Input */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    FPS (Frames/Second)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={fps}
                      onChange={(e) => handleFpsChange(parseFloat(e.target.value) || 0)}
                      className="text-lg @md:text-xl font-bold pr-12"
                      min={1}
                      max={1000}
                      step={1}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      fps
                    </div>
                  </div>
                </div>

                {/* MS Input */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1">
                    <Timer className="w-3 h-3" />
                    Frame Time (ms)
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={ms}
                      onChange={(e) => handleMsChange(parseFloat(e.target.value) || 0)}
                      className="text-lg @md:text-xl font-bold pr-12"
                      min={0.01}
                      max={1000}
                      step={0.01}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      ms
                    </div>
                  </div>
                </div>
              </div>

              {/* Common FPS Presets */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Common Frame Rates</Label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_FPS.map((preset, _index) => (
                    <Button
                      key={preset}
                      variant={fps === preset ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleFpsChange(preset)}
                      className={cn(
                        "text-xs @md:text-sm",
                        fps === preset && "ring-2 ring-primary ring-offset-2"
                      )}
                    >
                      {preset} FPS
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Delta Time */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Delta Time (for game loops)
                </Label>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border">
                  <div>
                    <div className="text-sm font-medium">dt = {deltaTime.toFixed(6)}s</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Time between frames in seconds
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => copyToClipboard(`const deltaTime = ${deltaTime.toFixed(6)};`, 0)}
                    className="h-8 w-8"
                  >
                    {copiedIndex === 0 ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Performance Recommendations */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Performance Targets
                </Label>
                <div className="space-y-2">
                  {[
                    { target: 60, desc: "Standard smooth gameplay", priority: "recommended" },
                    { target: 30, desc: "Minimum acceptable for most games", priority: "minimum" },
                    { target: 120, desc: "High refresh rate gaming", priority: "high" },
                    { target: 144, desc: "Competitive gaming standard", priority: "high" },
                  ].map((item) => (
                    <div
                      key={item.target}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-md border transition-colors",
                        fps >= item.target
                          ? "bg-green-500/10 border-green-500/30"
                          : "bg-muted/20 border-border/50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full",
                          fps >= item.target ? "bg-green-500" : "bg-muted-foreground"
                        )} />
                        <div className="text-xs">
                          <div className="font-medium">{item.target} FPS</div>
                          <div className="text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                      <div className="text-xs font-mono">
                        {fpsToMs(item.target).toFixed(2)}ms
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* BUDGET TAB */}
            <TabsContent value="budget" className="mt-0 space-y-4 pr-3">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Frame Time Budget at {fps} FPS ({ms.toFixed(2)}ms total)
                </Label>

                {/* Pie Chart Visualization */}
                <div className="relative aspect-square max-w-[200px] mx-auto">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    {frameBudgetMs.reduce((acc, budget, index) => {
                      const startAngle = index === 0 ? 0 : acc.endAngle;
                      const angle = (budget.percentage / 100) * 360;
                      const endAngle = startAngle + angle;

                      const startX = 50 + 40 * Math.cos((startAngle * Math.PI) / 180);
                      const startY = 50 + 40 * Math.sin((startAngle * Math.PI) / 180);
                      const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
                      const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

                      const largeArc = angle > 180 ? 1 : 0;

                      acc.elements.push(
                        <path
                          key={index}
                          d={`M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArc} 1 ${endX} ${endY} Z`}
                          fill={budget.color}
                          opacity={0.8}
                          className="transition-opacity hover:opacity-100"
                        />
                      );

                      acc.endAngle = endAngle;
                      return acc;
                    }, { elements: [] as ReactElement[], endAngle: 0 }).elements}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{ms.toFixed(1)}</div>
                      <div className="text-xs text-muted-foreground">ms</div>
                    </div>
                  </div>
                </div>

                {/* Budget Breakdown */}
                <div className="space-y-3 mt-4">
                  {frameBudgetMs.map((budget, index) => (
                    <div key={budget.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-sm"
                            style={{ backgroundColor: budget.color }}
                          />
                          <Label className="text-xs font-medium">{budget.name}</Label>
                        </div>
                        <div className="text-xs font-mono">
                          {budget.ms.toFixed(2)}ms ({budget.percentage.toFixed(1)}%)
                        </div>
                      </div>
                      <Slider
                        value={[budget.percentage]}
                        onValueChange={(value) => updateBudgetPercentage(index, value[0])}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                {/* Copy Budget as Code */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const code = frameBudgetMs.map(b =>
                      `const ${b.name.toLowerCase().replace(/\//g, '_')}_budget = ${b.ms.toFixed(2)}; // ${b.percentage.toFixed(1)}%`
                    ).join('\n');
                    copyToClipboard(code, 1);
                  }}
                >
                  {copiedIndex === 1 ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy as Constants
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* V-SYNC TAB */}
            <TabsContent value="vsync" className="mt-0 space-y-4 pr-3">
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Display Refresh Rate</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={refreshRate}
                    onChange={(e) => setRefreshRate(parseFloat(e.target.value) || 60)}
                    className="flex-1"
                    min={30}
                    max={360}
                    step={1}
                  />
                  <div className="flex gap-1">
                    {[60, 120, 144, 165, 240].map(rate => (
                      <Button
                        key={rate}
                        variant={refreshRate === rate ? "default" : "outline"}
                        size="sm"
                        onClick={() => setRefreshRate(rate)}
                        className="text-xs"
                      >
                        {rate}
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* V-Sync Analysis */}
                <div className="space-y-3">
                  <div className={cn(
                    "p-3 rounded-lg border",
                    vsyncInfo.isSynced
                      ? "bg-green-500/10 border-green-500/30"
                      : "bg-yellow-500/10 border-yellow-500/30"
                  )}>
                    <div className="flex items-start gap-2">
                      <Info className={cn(
                        "w-4 h-4 mt-0.5 shrink-0",
                        vsyncInfo.isSynced ? "text-green-500" : "text-yellow-500"
                      )} />
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {vsyncInfo.isSynced ? "Synced!" : "Not Optimal"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {vsyncInfo.recommendation}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Target FPS</div>
                      <div className="text-lg font-bold">{fps}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Effective FPS</div>
                      <div className="text-lg font-bold">{vsyncInfo.effectiveFps.toFixed(0)}</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Refresh Rate</div>
                      <div className="text-lg font-bold">{refreshRate} Hz</div>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/30 border">
                      <div className="text-xs text-muted-foreground mb-1">Frames Skipped</div>
                      <div className="text-lg font-bold">{vsyncInfo.framesMissed}</div>
                    </div>
                  </div>

                  {/* Common divisors for refresh rate */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Recommended FPS Caps for {refreshRate}Hz
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {[1, 2, 3, 4, 6, 8].map(divisor => {
                        const recommendedFps = refreshRate / divisor;
                        return (
                          <Button
                            key={divisor}
                            variant={Math.abs(fps - recommendedFps) < 1 ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleFpsChange(recommendedFps)}
                            className="text-xs"
                          >
                            {recommendedFps.toFixed(0)} FPS
                            <span className="text-xs text-muted-foreground ml-1">
                              (/{divisor})
                            </span>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* ADVANCED TAB */}
            <TabsContent value="advanced" className="mt-0 space-y-4 pr-3">
              {/* Time Scale */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  Time Scale (Slow-mo / Fast-forward)
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs w-12">0.1x</span>
                    <Slider
                      value={[timeScale]}
                      onValueChange={(value) => setTimeScale(value[0])}
                      min={0.1}
                      max={5}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-xs w-12 text-right">5.0x</span>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{timeScale.toFixed(1)}x</div>
                    <div className="text-xs text-muted-foreground">
                      {timeScale < 1 ? "Slow Motion" : timeScale > 1 ? "Fast Forward" : "Normal Speed"}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Scaled Frame Time:</span>
                      <span className="font-mono font-bold">{scaledMs.toFixed(2)}ms</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Effective FPS:</span>
                      <span className="font-mono font-bold">
                        {(1000 / scaledMs).toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[0.25, 0.5, 1, 2, 3].map(scale => (
                      <Button
                        key={scale}
                        variant={timeScale === scale ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTimeScale(scale)}
                        className="flex-1 text-xs"
                      >
                        {scale}x
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Fixed Timestep */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  Fixed Timestep Calculator
                </Label>
                <div className="p-3 rounded-lg bg-muted/30 border space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Target dt:</span>
                    <span className="font-mono">{fixedTimestep.targetDt.toFixed(6)}s</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Accumulator:</span>
                    <span className="font-mono">{fixedTimestep.accumulator.toFixed(6)}s</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Update Iterations:</span>
                    <span className="font-mono font-bold text-primary">
                      {fixedTimestep.iterations}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Remainder:</span>
                    <span className="font-mono">{fixedTimestep.remainder.toFixed(6)}s</span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const code = `// Fixed timestep game loop
const FIXED_DT = ${fixedTimestep.targetDt.toFixed(6)};
let accumulator = 0;

function gameLoop(deltaTime) {
  accumulator += deltaTime;

  while (accumulator >= FIXED_DT) {
    fixedUpdate(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  render(accumulator / FIXED_DT); // interpolation alpha
}`;
                    copyToClipboard(code, 2);
                  }}
                >
                  {copiedIndex === 2 ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Game Loop Code
                    </>
                  )}
                </Button>
              </div>

              <Separator />

              {/* Code Constants Export */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Export as Constants</Label>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    const code = `// Frame timing constants
const TARGET_FPS = ${fps};
const FRAME_TIME_MS = ${ms.toFixed(2)};
const DELTA_TIME = ${deltaTime.toFixed(6)};
const TIME_SCALE = ${timeScale.toFixed(1)};

// Performance monitoring
const MIN_FPS = 30;
const TARGET_FRAME_TIME = ${fpsToMs(60).toFixed(2)};
const MAX_FRAME_TIME = ${fpsToMs(30).toFixed(2)};`;
                    copyToClipboard(code, 3);
                  }}
                >
                  {copiedIndex === 3 ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-500" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All Constants
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
