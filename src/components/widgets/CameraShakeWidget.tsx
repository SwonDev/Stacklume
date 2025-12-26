"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Camera,
  Play,
  Pause,
  RotateCcw,
  Download,
  Copy,
  Check,
  Plus,
  Trash2,
  Link2
} from "lucide-react";

interface CameraShakeWidgetProps {
  widget: Widget;
}

type DecayType = "linear" | "exponential" | "none";
type DirectionType = "horizontal" | "vertical" | "both" | "rotational";
type PresetType = "explosion" | "earthquake" | "hit-impact" | "footstep" | "ambient";

interface ShakeConfig {
  // Core parameters
  intensityX: number;
  intensityY: number;
  frequency: number;
  duration: number;
  decayType: DecayType;
  direction: DirectionType;

  // Trauma system
  trauma: number;
  traumaDecay: number;

  // Noise-based
  usePerlinNoise: boolean;
  noiseScale: number;

  // Link intensities
  linkIntensities: boolean;

  // Rotation
  rotationIntensity: number;
}

interface ShakeSource {
  id: string;
  name: string;
  config: ShakeConfig;
  weight: number;
}

interface KeyframePoint {
  time: number;
  intensity: number;
}

// Preset configurations
const PRESETS: Record<PresetType, Partial<ShakeConfig>> = {
  explosion: {
    intensityX: 15,
    intensityY: 15,
    frequency: 30,
    duration: 0.8,
    decayType: "exponential",
    direction: "both",
    rotationIntensity: 5,
    usePerlinNoise: false,
    trauma: 1.0,
    traumaDecay: 3.0,
  },
  earthquake: {
    intensityX: 8,
    intensityY: 10,
    frequency: 5,
    duration: 2.5,
    decayType: "linear",
    direction: "both",
    rotationIntensity: 2,
    usePerlinNoise: true,
    noiseScale: 0.5,
    trauma: 0.8,
    traumaDecay: 1.5,
  },
  "hit-impact": {
    intensityX: 12,
    intensityY: 8,
    frequency: 40,
    duration: 0.3,
    decayType: "exponential",
    direction: "horizontal",
    rotationIntensity: 3,
    usePerlinNoise: false,
    trauma: 0.6,
    traumaDecay: 5.0,
  },
  footstep: {
    intensityX: 2,
    intensityY: 4,
    frequency: 15,
    duration: 0.15,
    decayType: "exponential",
    direction: "vertical",
    rotationIntensity: 0.5,
    usePerlinNoise: false,
    trauma: 0.2,
    traumaDecay: 8.0,
  },
  ambient: {
    intensityX: 1.5,
    intensityY: 1.5,
    frequency: 2,
    duration: 999,
    decayType: "none",
    direction: "both",
    rotationIntensity: 0.3,
    usePerlinNoise: true,
    noiseScale: 0.3,
    trauma: 0.1,
    traumaDecay: 0,
  },
};

const DEFAULT_CONFIG: ShakeConfig = {
  intensityX: 10,
  intensityY: 10,
  frequency: 20,
  duration: 1.0,
  decayType: "exponential",
  direction: "both",
  trauma: 0.5,
  traumaDecay: 2.0,
  usePerlinNoise: false,
  noiseScale: 0.5,
  linkIntensities: true,
  rotationIntensity: 2,
};

// Simple Perlin-like noise for shake
class SimpleNoise {
  private seed: number;

  constructor(seed: number = Math.random()) {
    this.seed = seed;
  }

  noise(x: number): number {
    const xi = Math.floor(x);
    const t = x - xi;
    const fade = t * t * (3 - 2 * t);

    const a = this.hash(xi);
    const b = this.hash(xi + 1);

    return this.lerp(fade, a, b) * 2 - 1;
  }

  private hash(n: number): number {
    let h = (n * 374761393 + this.seed * 668265263) & 0x7fffffff;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return h / 0x7fffffff;
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }
}

export function CameraShakeWidget({ widget }: CameraShakeWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const noiseGeneratorRef = useRef(new SimpleNoise());

  // Load config from widget
  const savedConfig = widget.config?.shakeConfig as ShakeConfig | undefined;
  const [config, setConfig] = useState<ShakeConfig>(savedConfig || DEFAULT_CONFIG);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentTrauma, setCurrentTrauma] = useState(config.trauma);

  // Multiple shake sources
  const savedSources = widget.config?.shakeSources as ShakeSource[] | undefined;
  const [shakeSources, setShakeSources] = useState<ShakeSource[]>(savedSources || []);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  // Custom curve
  const savedCurve = widget.config?.shakeKeyframes as KeyframePoint[] | undefined;
  const [keyframes, setKeyframes] = useState<KeyframePoint[]>(
    savedCurve || [
      { time: 0, intensity: 1 },
      { time: 1, intensity: 0 },
    ]
  );

  const [copiedJSON, setCopiedJSON] = useState(false);
  const [copiedJS, setCopiedJS] = useState(false);
  const [copiedCSS, setCopiedCSS] = useState(false);

  // Save to widget store
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          shakeConfig: config,
          shakeSources,
          shakeKeyframes: keyframes,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [config, shakeSources, keyframes, widget.id]);

  const updateConfig = useCallback((updates: Partial<ShakeConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const applyPreset = useCallback((preset: PresetType) => {
    const presetConfig = PRESETS[preset];
    setConfig((prev) => ({ ...prev, ...presetConfig }));
  }, []);

  // Calculate shake intensity based on decay and curve
  const getIntensityAtTime = useCallback((t: number): number => {
    if (t > config.duration && config.decayType !== "none") return 0;

    const normalizedTime = Math.min(t / config.duration, 1);

    // Apply custom curve
    let curveMultiplier = 1;
    if (keyframes.length >= 2) {
      for (let i = 0; i < keyframes.length - 1; i++) {
        const current = keyframes[i];
        const next = keyframes[i + 1];
        if (normalizedTime >= current.time && normalizedTime <= next.time) {
          const segmentT = (normalizedTime - current.time) / (next.time - current.time);
          curveMultiplier = current.intensity + (next.intensity - current.intensity) * segmentT;
          break;
        }
      }
    }

    // Apply decay
    let decayMultiplier = 1;
    if (config.decayType === "linear") {
      decayMultiplier = 1 - normalizedTime;
    } else if (config.decayType === "exponential") {
      decayMultiplier = Math.pow(1 - normalizedTime, 3);
    }

    // Apply trauma system
    const traumaMultiplier = Math.pow(currentTrauma, 2);

    return curveMultiplier * decayMultiplier * traumaMultiplier;
  }, [config.duration, config.decayType, keyframes, currentTrauma]);

  // Generate shake offset
  const getShakeOffset = useCallback((time: number): { x: number; y: number; rotation: number } => {
    const intensity = getIntensityAtTime(time);

    let offsetX = 0;
    let offsetY = 0;
    let rotation = 0;

    if (config.usePerlinNoise) {
      const noiseX = noiseGeneratorRef.current.noise(time * config.frequency * config.noiseScale);
      const noiseY = noiseGeneratorRef.current.noise(time * config.frequency * config.noiseScale + 100);
      const noiseR = noiseGeneratorRef.current.noise(time * config.frequency * config.noiseScale + 200);

      offsetX = noiseX * config.intensityX * intensity;
      offsetY = noiseY * config.intensityY * intensity;
      rotation = noiseR * config.rotationIntensity * intensity;
    } else {
      const shake = Math.sin(time * config.frequency * Math.PI * 2);
      const shake2 = Math.sin(time * config.frequency * Math.PI * 2 + Math.PI / 4);

      offsetX = shake * config.intensityX * intensity;
      offsetY = shake2 * config.intensityY * intensity;
      rotation = shake * config.rotationIntensity * intensity;
    }

    // Apply direction constraints
    if (config.direction === "horizontal") {
      offsetY = 0;
      rotation = 0;
    } else if (config.direction === "vertical") {
      offsetX = 0;
      rotation = 0;
    } else if (config.direction === "rotational") {
      offsetX = 0;
      offsetY = 0;
    }

    return { x: offsetX, y: offsetY, rotation };
  }, [config, getIntensityAtTime]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    let startTime = performance.now();
    let elapsed = currentTime;

    const animate = (timestamp: number) => {
      const deltaTime = (timestamp - startTime) / 1000;
      startTime = timestamp;

      elapsed += deltaTime;
      setCurrentTime(elapsed);

      // Update trauma decay
      if (currentTrauma > 0) {
        const newTrauma = Math.max(0, currentTrauma - config.traumaDecay * deltaTime);
        setCurrentTrauma(newTrauma);
      }

      // Render shake
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) {
        const { x, y, rotation } = getShakeOffset(elapsed);

        // Clear
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background grid
        ctx.save();
        ctx.strokeStyle = "rgba(100, 100, 100, 0.2)";
        ctx.lineWidth = 1;
        for (let i = 0; i <= canvas.width; i += 40) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, canvas.height);
          ctx.stroke();
        }
        for (let i = 0; i <= canvas.height; i += 40) {
          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.lineTo(canvas.width, i);
          ctx.stroke();
        }
        ctx.restore();

        // Draw scene with shake applied
        ctx.save();
        ctx.translate(canvas.width / 2 + x, canvas.height / 2 + y);
        ctx.rotate((rotation * Math.PI) / 180);

        // Draw sample scene elements
        // Building
        ctx.fillStyle = "hsl(220, 20%, 30%)";
        ctx.fillRect(-80, -60, 60, 80);
        ctx.fillStyle = "hsl(220, 20%, 40%)";
        ctx.fillRect(-80, -60, 60, 10);

        // Windows
        ctx.fillStyle = "hsl(45, 100%, 60%)";
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 4; j++) {
            ctx.fillRect(-70 + j * 15, -50 + i * 20, 8, 12);
          }
        }

        // Tree
        ctx.fillStyle = "hsl(30, 40%, 30%)";
        ctx.fillRect(30, -20, 10, 40);
        ctx.fillStyle = "hsl(120, 40%, 35%)";
        ctx.beginPath();
        ctx.arc(35, -25, 20, 0, Math.PI * 2);
        ctx.fill();

        // Ground line
        ctx.strokeStyle = "hsl(0, 0%, 50%)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-canvas.width / 2, 20);
        ctx.lineTo(canvas.width / 2, 20);
        ctx.stroke();

        ctx.restore();

        // Draw crosshair at center (unshaken)
        ctx.strokeStyle = "hsl(0, 100%, 50%)";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 10, canvas.height / 2);
        ctx.lineTo(canvas.width / 2 + 10, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, canvas.height / 2 - 10);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 + 10);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Continue if not finished
      if (elapsed < config.duration || config.decayType === "none") {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsPlaying(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, config, currentTime, currentTrauma, getShakeOffset]);

  const handlePlay = () => {
    setCurrentTime(0);
    setCurrentTrauma(config.trauma);
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    setCurrentTime(0);
    setCurrentTrauma(config.trauma);
    setIsPlaying(true);
  };

  // Export functions
  const exportJSON = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "camera-shake-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyJSON = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedJSON(true);
    setTimeout(() => setCopiedJSON(false), 2000);
  };

  const generateJSCode = useMemo(() => {
    return `class CameraShake {
  constructor(config) {
    this.config = ${JSON.stringify(config, null, 4)};
    this.startTime = 0;
    this.trauma = this.config.trauma;
  }

  update(deltaTime) {
    this.startTime += deltaTime;

    // Decay trauma
    if (this.trauma > 0) {
      this.trauma = Math.max(0, this.trauma - this.config.traumaDecay * deltaTime);
    }

    return this.getShake(this.startTime);
  }

  getShake(time) {
    const normalizedTime = Math.min(time / this.config.duration, 1);

    // Apply decay
    let decayMultiplier = 1;
    if (this.config.decayType === 'linear') {
      decayMultiplier = 1 - normalizedTime;
    } else if (this.config.decayType === 'exponential') {
      decayMultiplier = Math.pow(1 - normalizedTime, 3);
    }

    const traumaMultiplier = Math.pow(this.trauma, 2);
    const intensity = decayMultiplier * traumaMultiplier;

    // Generate shake
    const shake = Math.sin(time * this.config.frequency * Math.PI * 2);
    const shake2 = Math.sin(time * this.config.frequency * Math.PI * 2 + Math.PI / 4);

    return {
      x: shake * this.config.intensityX * intensity,
      y: shake2 * this.config.intensityY * intensity,
      rotation: shake * this.config.rotationIntensity * intensity
    };
  }

  addTrauma(amount) {
    this.trauma = Math.min(1, this.trauma + amount);
  }
}

// Usage:
// const shake = new CameraShake(config);
// In your game loop:
// const offset = shake.update(deltaTime);
// camera.position.x += offset.x;
// camera.position.y += offset.y;
// camera.rotation += offset.rotation;`;
  }, [config]);

  const copyJSCode = async () => {
    await navigator.clipboard.writeText(generateJSCode);
    setCopiedJS(true);
    setTimeout(() => setCopiedJS(false), 2000);
  };

  // Generate CSS keyframes using pure sin-based calculation (no refs)
  const generateCSSKeyframes = useMemo(() => {
    const frames: string[] = [];
    const steps = 20;

    // Pure function for CSS generation - uses sin-based shake only
    const getCSSShakeOffset = (time: number): { x: number; y: number; rotation: number } => {
      const intensity = getIntensityAtTime(time);
      const shake = Math.sin(time * config.frequency * Math.PI * 2);
      const shake2 = Math.sin(time * config.frequency * Math.PI * 2 + Math.PI / 4);

      let offsetX = shake * config.intensityX * intensity;
      let offsetY = shake2 * config.intensityY * intensity;
      let rotation = shake * config.rotationIntensity * intensity;

      // Apply direction constraints
      if (config.direction === "horizontal") {
        offsetY = 0;
        rotation = 0;
      } else if (config.direction === "vertical") {
        offsetX = 0;
        rotation = 0;
      } else if (config.direction === "rotational") {
        offsetX = 0;
        offsetY = 0;
      }

      return { x: offsetX, y: offsetY, rotation };
    };

    for (let i = 0; i <= steps; i++) {
      const time = (i / steps) * config.duration;
      const { x, y, rotation } = getCSSShakeOffset(time);
      const percent = (i / steps) * 100;
      frames.push(`  ${percent.toFixed(0)}% {
    transform: translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg);
  }`);
    }

    return `@keyframes cameraShake {
${frames.join('\n')}
}

.shake-animation {
  animation: cameraShake ${config.duration}s ease-out;
}`;
  }, [config, getIntensityAtTime]);

  const copyCSSCode = async () => {
    await navigator.clipboard.writeText(generateCSSKeyframes);
    setCopiedCSS(true);
    setTimeout(() => setCopiedCSS(false), 2000);
  };

  // Shake sources management
  const addShakeSource = () => {
    const newSource: ShakeSource = {
      id: `source-${Date.now()}`,
      name: `Shake Source ${shakeSources.length + 1}`,
      config: { ...config },
      weight: 1.0,
    };
    setShakeSources([...shakeSources, newSource]);
  };

  const removeShakeSource = (id: string) => {
    setShakeSources(shakeSources.filter(s => s.id !== id));
    if (selectedSourceId === id) setSelectedSourceId(null);
  };

  // Keyframe management
  const addKeyframe = () => {
    const newKeyframes = [...keyframes, { time: 0.5, intensity: 0.5 }]
      .sort((a, b) => a.time - b.time);
    setKeyframes(newKeyframes);
  };

  const removeKeyframe = (index: number) => {
    if (keyframes.length <= 2) return; // Keep at least 2 keyframes
    setKeyframes(keyframes.filter((_, i) => i !== index));
  };

  const updateKeyframe = (index: number, updates: Partial<KeyframePoint>) => {
    const newKeyframes = [...keyframes];
    newKeyframes[index] = { ...newKeyframes[index], ...updates };
    setKeyframes(newKeyframes.sort((a, b) => a.time - b.time));
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <Camera className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            Camera Shake Designer
          </h3>
        </div>

        {/* Canvas Preview */}
        <div className="relative w-full aspect-[2/1] rounded-lg border border-border overflow-hidden bg-muted/20">
          <canvas
            ref={canvasRef}
            width={600}
            height={300}
            className="w-full h-full"
          />

          {/* Playback controls */}
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
            <div className="flex gap-1 @sm:gap-1.5">
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

            <div className="flex gap-2 items-center px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <span className="text-[10px] @sm:text-xs text-white/80 font-mono">
                {currentTime.toFixed(2)}s
              </span>
              <span className="text-[10px] @sm:text-xs text-white/60">|</span>
              <span className="text-[10px] @sm:text-xs text-white/80 font-mono">
                Trauma: {(currentTrauma * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Controls Tabs */}
        <Tabs defaultValue="parameters" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-5 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="parameters" className="text-[10px] @sm:text-xs">
              Parameters
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
              Presets
            </TabsTrigger>
            <TabsTrigger value="curve" className="text-[10px] @sm:text-xs">
              Curve
            </TabsTrigger>
            <TabsTrigger value="sources" className="text-[10px] @sm:text-xs">
              Layers
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] @sm:text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Parameters Tab */}
          <TabsContent value="parameters" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Intensity Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs font-semibold">Intensity</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={config.linkIntensities}
                    onCheckedChange={(checked) => updateConfig({ linkIntensities: checked })}
                    className="scale-75"
                  />
                  <Link2 className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs">X Amplitude</Label>
                  <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                    {config.intensityX.toFixed(1)}
                  </span>
                </div>
                <Slider
                  value={[config.intensityX]}
                  onValueChange={(v) => {
                    const updates: Partial<ShakeConfig> = { intensityX: v[0] };
                    if (config.linkIntensities) updates.intensityY = v[0];
                    updateConfig(updates);
                  }}
                  min={0}
                  max={50}
                  step={0.5}
                />
              </div>

              {!config.linkIntensities && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs">Y Amplitude</Label>
                    <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                      {config.intensityY.toFixed(1)}
                    </span>
                  </div>
                  <Slider
                    value={[config.intensityY]}
                    onValueChange={(v) => updateConfig({ intensityY: v[0] })}
                    min={0}
                    max={50}
                    step={0.5}
                  />
                </div>
              )}
            </div>

            {/* Frequency/Speed */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Frequency</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.frequency.toFixed(1)} Hz
                </span>
              </div>
              <Slider
                value={[config.frequency]}
                onValueChange={(v) => updateConfig({ frequency: v[0] })}
                min={0.5}
                max={60}
                step={0.5}
              />
            </div>

            {/* Duration */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Duration</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.duration.toFixed(2)}s
                </span>
              </div>
              <Slider
                value={[config.duration]}
                onValueChange={(v) => updateConfig({ duration: v[0] })}
                min={0.1}
                max={5}
                step={0.1}
              />
            </div>

            {/* Rotation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Rotation Intensity</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.rotationIntensity.toFixed(1)}°
                </span>
              </div>
              <Slider
                value={[config.rotationIntensity]}
                onValueChange={(v) => updateConfig({ rotationIntensity: v[0] })}
                min={0}
                max={20}
                step={0.5}
              />
            </div>

            {/* Decay Type */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">Decay Type</Label>
              <Select
                value={config.decayType}
                onValueChange={(value: DecayType) => updateConfig({ decayType: value })}
              >
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear</SelectItem>
                  <SelectItem value="exponential">Exponential</SelectItem>
                  <SelectItem value="none">None (Continuous)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Direction */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">Direction</Label>
              <ToggleGroup
                type="single"
                value={config.direction}
                onValueChange={(value: DirectionType) => value && updateConfig({ direction: value })}
                className="grid grid-cols-2 gap-1"
              >
                <ToggleGroupItem value="horizontal" className="text-[10px] h-7">
                  Horizontal
                </ToggleGroupItem>
                <ToggleGroupItem value="vertical" className="text-[10px] h-7">
                  Vertical
                </ToggleGroupItem>
                <ToggleGroupItem value="both" className="text-[10px] h-7">
                  Both
                </ToggleGroupItem>
                <ToggleGroupItem value="rotational" className="text-[10px] h-7">
                  Rotation
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Trauma System */}
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-[10px] @sm:text-xs font-semibold">Trauma System</Label>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs">Initial Trauma</Label>
                  <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                    {(config.trauma * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[config.trauma]}
                  onValueChange={(v) => updateConfig({ trauma: v[0] })}
                  min={0}
                  max={1}
                  step={0.05}
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs">Trauma Decay Rate</Label>
                  <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                    {config.traumaDecay.toFixed(1)}/s
                  </span>
                </div>
                <Slider
                  value={[config.traumaDecay]}
                  onValueChange={(v) => updateConfig({ traumaDecay: v[0] })}
                  min={0}
                  max={10}
                  step={0.1}
                />
              </div>
            </div>

            {/* Noise */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs font-semibold">Perlin Noise</Label>
                <Switch
                  checked={config.usePerlinNoise}
                  onCheckedChange={(checked) => updateConfig({ usePerlinNoise: checked })}
                />
              </div>

              {config.usePerlinNoise && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs">Noise Scale</Label>
                    <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                      {config.noiseScale.toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[config.noiseScale]}
                    onValueChange={(v) => updateConfig({ noiseScale: v[0] })}
                    min={0.1}
                    max={2}
                    step={0.05}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Presets Tab */}
          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESETS) as PresetType[]).map((preset) => (
                <Button
                  key={preset}
                  variant="outline"
                  onClick={() => applyPreset(preset)}
                  className="h-auto py-3 flex flex-col items-start"
                >
                  <span className="text-[10px] @sm:text-xs font-semibold capitalize">
                    {preset.replace("-", " ")}
                  </span>
                  <span className="text-[9px] text-muted-foreground">
                    {preset === "explosion" && "High intensity, short burst"}
                    {preset === "earthquake" && "Low frequency, long duration"}
                    {preset === "hit-impact" && "Quick horizontal shake"}
                    {preset === "footstep" && "Subtle vertical bounce"}
                    {preset === "ambient" && "Continuous gentle shake"}
                  </span>
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Curve Editor Tab */}
          <TabsContent value="curve" className="flex-1 overflow-y-auto space-y-2 mt-2 @sm:mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] @sm:text-xs font-semibold">Custom Intensity Curve</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addKeyframe}
                className="h-6 px-2 text-[10px]"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Point
              </Button>
            </div>

            {/* Curve graph visual */}
            <div className="relative w-full h-32 rounded-lg border border-border bg-muted/20 p-2">
              <svg className="w-full h-full">
                <polyline
                  points={keyframes
                    .map(kf => `${kf.time * 100}%,${(1 - kf.intensity) * 100}%`)
                    .join(" ")}
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                />
                {keyframes.map((kf, i) => (
                  <circle
                    key={i}
                    cx={`${kf.time * 100}%`}
                    cy={`${(1 - kf.intensity) * 100}%`}
                    r="4"
                    fill="hsl(var(--primary))"
                    className="cursor-pointer"
                  />
                ))}
              </svg>
            </div>

            {/* Keyframe list */}
            <div className="space-y-1">
              {keyframes.map((kf, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border border-border">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] w-12">Time</Label>
                      <Slider
                        value={[kf.time]}
                        onValueChange={(v) => updateKeyframe(i, { time: v[0] })}
                        min={0}
                        max={1}
                        step={0.01}
                        className="flex-1"
                      />
                      <span className="text-[9px] font-mono w-10 text-right">
                        {kf.time.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px] w-12">Value</Label>
                      <Slider
                        value={[kf.intensity]}
                        onValueChange={(v) => updateKeyframe(i, { intensity: v[0] })}
                        min={0}
                        max={1}
                        step={0.01}
                        className="flex-1"
                      />
                      <span className="text-[9px] font-mono w-10 text-right">
                        {kf.intensity.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {keyframes.length > 2 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeKeyframe(i)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Shake Sources/Layers Tab */}
          <TabsContent value="sources" className="flex-1 overflow-y-auto space-y-2 mt-2 @sm:mt-3">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] @sm:text-xs font-semibold">Shake Layers</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={addShakeSource}
                className="h-6 px-2 text-[10px]"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Layer
              </Button>
            </div>

            {shakeSources.length === 0 ? (
              <div className="p-4 text-center text-[10px] text-muted-foreground">
                No shake layers yet. Add layers to combine multiple shake sources.
              </div>
            ) : (
              <div className="space-y-2">
                {shakeSources.map((source) => (
                  <div
                    key={source.id}
                    className="p-2 rounded border border-border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <Input
                        value={source.name}
                        onChange={(e) => {
                          const updated = shakeSources.map(s =>
                            s.id === source.id ? { ...s, name: e.target.value } : s
                          );
                          setShakeSources(updated);
                        }}
                        className="h-6 text-[10px] flex-1 mr-2"
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeShakeSource(source.id)}
                        className="h-6 w-6 p-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-[9px]">Weight</Label>
                      <Slider
                        value={[source.weight]}
                        onValueChange={(v) => {
                          const updated = shakeSources.map(s =>
                            s.id === source.id ? { ...s, weight: v[0] } : s
                          );
                          setShakeSources(updated);
                        }}
                        min={0}
                        max={2}
                        step={0.1}
                        className="flex-1"
                      />
                      <span className="text-[9px] font-mono w-8 text-right">
                        {source.weight.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[9px] text-muted-foreground pt-2">
              Layer multiple shake sources to create complex shake effects.
              Each layer can have different parameters and weights.
            </p>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-2 mt-2 @sm:mt-3">
            <Button
              onClick={exportJSON}
              variant="default"
              className="w-full h-8 text-[10px] @sm:text-xs"
            >
              <Download className="w-3 h-3 mr-2" />
              Download JSON Config
            </Button>

            <Button
              onClick={copyJSON}
              variant="outline"
              className="w-full h-8 text-[10px] @sm:text-xs"
            >
              {copiedJSON ? (
                <>
                  <Check className="w-3 h-3 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-2" />
                  Copy JSON
                </>
              )}
            </Button>

            <Button
              onClick={copyJSCode}
              variant="outline"
              className="w-full h-8 text-[10px] @sm:text-xs"
            >
              {copiedJS ? (
                <>
                  <Check className="w-3 h-3 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-2" />
                  Copy JavaScript Class
                </>
              )}
            </Button>

            <Button
              onClick={copyCSSCode}
              variant="outline"
              className="w-full h-8 text-[10px] @sm:text-xs"
            >
              {copiedCSS ? (
                <>
                  <Check className="w-3 h-3 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-2" />
                  Copy CSS Keyframes
                </>
              )}
            </Button>

            <div className="pt-2 border-t">
              <p className="text-[9px] @sm:text-[10px] text-muted-foreground leading-relaxed">
                Export your camera shake configuration as JSON, or copy ready-to-use JavaScript/CSS code
                for implementation in your game or web project.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
