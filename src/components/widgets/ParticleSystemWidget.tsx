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
import { Sparkles, Play, Pause, RotateCcw, Download, Copy, Check, Flame } from "lucide-react";
import { motion as _motion } from "motion/react";

interface ParticleSystemWidgetProps {
  widget: Widget;
}

type PresetEffect =
  | "fire"
  | "smoke"
  | "sparks"
  | "explosion"
  | "rain"
  | "snow"
  | "magic"
  | "confetti";

type BlendMode = "normal" | "additive";

interface ParticleConfig {
  // Emission
  emissionRate: number; // particles per second
  burstCount: number; // particles per burst
  lifetime: number; // seconds

  // Motion
  speed: number;
  speedVariation: number; // 0-1
  direction: number; // degrees
  spreadAngle: number; // degrees
  gravity: number;

  // Size
  startSize: number;
  endSize: number;

  // Color
  startColor: string;
  endColor: string;

  // Alpha
  fadeIn: number; // 0-1
  fadeOut: number; // 0-1

  // Rotation
  rotation: number; // initial degrees
  angularVelocity: number; // degrees per second

  // Rendering
  blendMode: BlendMode;

  // Preset
  preset?: PresetEffect;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  age: number;
  lifetime: number;
  startSize: number;
  endSize: number;
  startColor: { r: number; g: number; b: number };
  endColor: { r: number; g: number; b: number };
  fadeIn: number;
  fadeOut: number;
  angularVelocity: number;
}

// Preset configurations
const PRESETS: Record<PresetEffect, Partial<ParticleConfig>> = {
  fire: {
    emissionRate: 50,
    lifetime: 1.5,
    speed: 60,
    speedVariation: 0.3,
    direction: 270,
    spreadAngle: 30,
    gravity: -20,
    startSize: 20,
    endSize: 5,
    startColor: "#FF4400",
    endColor: "#FFAA00",
    fadeIn: 0.1,
    fadeOut: 0.7,
    angularVelocity: 50,
    blendMode: "additive",
  },
  smoke: {
    emissionRate: 20,
    lifetime: 3,
    speed: 30,
    speedVariation: 0.4,
    direction: 270,
    spreadAngle: 40,
    gravity: -10,
    startSize: 15,
    endSize: 40,
    startColor: "#888888",
    endColor: "#CCCCCC",
    fadeIn: 0.2,
    fadeOut: 0.8,
    angularVelocity: 20,
    blendMode: "normal",
  },
  sparks: {
    emissionRate: 100,
    lifetime: 0.8,
    speed: 150,
    speedVariation: 0.6,
    direction: 270,
    spreadAngle: 360,
    gravity: 300,
    startSize: 4,
    endSize: 1,
    startColor: "#FFFF00",
    endColor: "#FF6600",
    fadeIn: 0.05,
    fadeOut: 0.5,
    angularVelocity: 0,
    blendMode: "additive",
  },
  explosion: {
    emissionRate: 0,
    burstCount: 200,
    lifetime: 1.2,
    speed: 200,
    speedVariation: 0.5,
    direction: 0,
    spreadAngle: 360,
    gravity: 100,
    startSize: 8,
    endSize: 2,
    startColor: "#FF8800",
    endColor: "#FF0000",
    fadeIn: 0.05,
    fadeOut: 0.6,
    angularVelocity: 100,
    blendMode: "additive",
  },
  rain: {
    emissionRate: 80,
    lifetime: 2,
    speed: 300,
    speedVariation: 0.2,
    direction: 180,
    spreadAngle: 5,
    gravity: 200,
    startSize: 3,
    endSize: 3,
    startColor: "#4488FF",
    endColor: "#88CCFF",
    fadeIn: 0.1,
    fadeOut: 0.1,
    angularVelocity: 0,
    blendMode: "normal",
  },
  snow: {
    emissionRate: 40,
    lifetime: 4,
    speed: 30,
    speedVariation: 0.3,
    direction: 180,
    spreadAngle: 20,
    gravity: 20,
    startSize: 6,
    endSize: 4,
    startColor: "#FFFFFF",
    endColor: "#DDDDFF",
    fadeIn: 0.2,
    fadeOut: 0.3,
    angularVelocity: 30,
    blendMode: "normal",
  },
  magic: {
    emissionRate: 60,
    lifetime: 2,
    speed: 80,
    speedVariation: 0.5,
    direction: 270,
    spreadAngle: 60,
    gravity: -30,
    startSize: 12,
    endSize: 2,
    startColor: "#FF00FF",
    endColor: "#00FFFF",
    fadeIn: 0.1,
    fadeOut: 0.7,
    angularVelocity: 80,
    blendMode: "additive",
  },
  confetti: {
    emissionRate: 0,
    burstCount: 150,
    lifetime: 3,
    speed: 250,
    speedVariation: 0.4,
    direction: 270,
    spreadAngle: 120,
    gravity: 200,
    startSize: 10,
    endSize: 10,
    startColor: "#FF00FF",
    endColor: "#FFFF00",
    fadeIn: 0.05,
    fadeOut: 0.2,
    angularVelocity: 300,
    blendMode: "normal",
  },
};

const DEFAULT_CONFIG: ParticleConfig = {
  emissionRate: 30,
  burstCount: 50,
  lifetime: 2,
  speed: 100,
  speedVariation: 0.3,
  direction: 270,
  spreadAngle: 45,
  gravity: 50,
  startSize: 10,
  endSize: 5,
  startColor: "#3B82F6",
  endColor: "#8B5CF6",
  fadeIn: 0.1,
  fadeOut: 0.5,
  rotation: 0,
  angularVelocity: 50,
  blendMode: "normal",
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function ParticleSystemWidget({ widget }: ParticleSystemWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const nextParticleIdRef = useRef(0);
  const lastTimeRef = useRef(0);
  const accumulatorRef = useRef(0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Initialize config from widget or use defaults
  const [config, setConfig] = useState<ParticleConfig>(() => {
    const savedConfig = widget.config?.particleConfig as ParticleConfig | undefined;
    return savedConfig || DEFAULT_CONFIG;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [particleCount, setParticleCount] = useState(0);
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Save config to widget store (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          particleConfig: config,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [config, widget.id]);

  const updateConfig = useCallback((updates: Partial<ParticleConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const applyPreset = useCallback((preset: PresetEffect) => {
    const presetConfig = PRESETS[preset];
    setConfig((prev) => ({
      ...prev,
      ...presetConfig,
      preset,
    }));
  }, []);

  const createParticle = useCallback((): Particle => {
    const canvas = canvasRef.current;
    if (!canvas) return {} as Particle;

    const angle = (config.direction + (Math.random() - 0.5) * config.spreadAngle) * (Math.PI / 180);
    const speedVar = 1 + (Math.random() - 0.5) * config.speedVariation;
    const speed = config.speed * speedVar;

    const startColor = hexToRgb(config.startColor);
    const endColor = hexToRgb(config.endColor);

    return {
      id: nextParticleIdRef.current++,
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: config.startSize,
      rotation: config.rotation + (Math.random() - 0.5) * 360,
      age: 0,
      lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
      startSize: config.startSize,
      endSize: config.endSize,
      startColor,
      endColor,
      fadeIn: config.fadeIn,
      fadeOut: config.fadeOut,
      angularVelocity: config.angularVelocity * (Math.random() - 0.5) * 2,
    };
  }, [config]);

  const emitBurst = useCallback(() => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < config.burstCount; i++) {
      newParticles.push(createParticle());
    }
    particlesRef.current.push(...newParticles);
  }, [config.burstCount, createParticle]);

  const updateParticles = useCallback((deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update existing particles
    particlesRef.current = particlesRef.current.filter((particle) => {
      particle.age += deltaTime;

      if (particle.age >= particle.lifetime) {
        return false;
      }

      // Update velocity with gravity
      particle.vy += config.gravity * deltaTime;

      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Update rotation
      particle.rotation += particle.angularVelocity * deltaTime;

      // Update size
      const t = particle.age / particle.lifetime;
      particle.size = lerp(particle.startSize, particle.endSize, t);

      return true;
    });

    // Emit new particles based on emission rate
    if (config.emissionRate > 0) {
      accumulatorRef.current += deltaTime * config.emissionRate;
      while (accumulatorRef.current >= 1) {
        particlesRef.current.push(createParticle());
        accumulatorRef.current -= 1;
      }
    }
  }, [config.gravity, config.emissionRate, createParticle]);

  const renderParticles = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set blend mode
    ctx.globalCompositeOperation = config.blendMode === "additive" ? "lighter" : "source-over";

    // Render particles
    particlesRef.current.forEach((particle) => {
      const t = particle.age / particle.lifetime;

      // Calculate alpha with fade in/out
      let alpha = 1;
      if (t < particle.fadeIn) {
        alpha = t / particle.fadeIn;
      } else if (t > 1 - particle.fadeOut) {
        alpha = (1 - t) / particle.fadeOut;
      }

      // Interpolate color
      const r = Math.round(lerp(particle.startColor.r, particle.endColor.r, t));
      const g = Math.round(lerp(particle.startColor.g, particle.endColor.g, t));
      const b = Math.round(lerp(particle.startColor.b, particle.endColor.b, t));

      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate((particle.rotation * Math.PI) / 180);
      ctx.globalAlpha = alpha;

      // Draw particle as a circle
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.beginPath();
      ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    });
  }, [config.blendMode]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    lastTimeRef.current = 0;

    const animate = (currentTime: number) => {
      if (!isPlaying) return;

      const deltaTime = lastTimeRef.current ? (currentTime - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = currentTime;

      updateParticles(deltaTime);
      renderParticles();
      setParticleCount(particlesRef.current.length);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateParticles, renderParticles]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    particlesRef.current = [];
    accumulatorRef.current = 0;
    lastTimeRef.current = 0;
    setIsPlaying(true);
  };

  const handleExportJSON = () => {
    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "particle-config.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const generateParticleSystemCode = useMemo(() => {
    return `class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.config = ${JSON.stringify(config, null, 4)};
    this.lastTime = 0;
    this.accumulator = 0;
    this.nextParticleId = 0;
  }

  createParticle() {
    const angle = (this.config.direction + (Math.random() - 0.5) * this.config.spreadAngle) * (Math.PI / 180);
    const speedVar = 1 + (Math.random() - 0.5) * this.config.speedVariation;
    const speed = this.config.speed * speedVar;

    return {
      id: this.nextParticleId++,
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: this.config.startSize,
      rotation: this.config.rotation + (Math.random() - 0.5) * 360,
      age: 0,
      lifetime: this.config.lifetime * (0.8 + Math.random() * 0.4),
      startSize: this.config.startSize,
      endSize: this.config.endSize,
      startColor: this.hexToRgb(this.config.startColor),
      endColor: this.hexToRgb(this.config.endColor),
      fadeIn: this.config.fadeIn,
      fadeOut: this.config.fadeOut,
      angularVelocity: this.config.angularVelocity * (Math.random() - 0.5) * 2,
    };
  }

  emitBurst() {
    for (let i = 0; i < this.config.burstCount; i++) {
      this.particles.push(this.createParticle());
    }
  }

  update(deltaTime) {
    this.particles = this.particles.filter(particle => {
      particle.age += deltaTime;
      if (particle.age >= particle.lifetime) return false;

      particle.vy += this.config.gravity * deltaTime;
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;
      particle.rotation += particle.angularVelocity * deltaTime;

      const t = particle.age / particle.lifetime;
      particle.size = this.lerp(particle.startSize, particle.endSize, t);

      return true;
    });

    if (this.config.emissionRate > 0) {
      this.accumulator += deltaTime * this.config.emissionRate;
      while (this.accumulator >= 1) {
        this.particles.push(this.createParticle());
        this.accumulator -= 1;
      }
    }
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.globalCompositeOperation = this.config.blendMode === 'additive' ? 'lighter' : 'source-over';

    this.particles.forEach(particle => {
      const t = particle.age / particle.lifetime;
      let alpha = 1;
      if (t < particle.fadeIn) alpha = t / particle.fadeIn;
      else if (t > 1 - particle.fadeOut) alpha = (1 - t) / particle.fadeOut;

      const r = Math.round(this.lerp(particle.startColor.r, particle.endColor.r, t));
      const g = Math.round(this.lerp(particle.startColor.g, particle.endColor.g, t));
      const b = Math.round(this.lerp(particle.startColor.b, particle.endColor.b, t));

      this.ctx.save();
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate((particle.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = \`rgb(\${r}, \${g}, \${b})\`;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });
  }

  animate(currentTime) {
    const deltaTime = this.lastTime ? (currentTime - this.lastTime) / 1000 : 0;
    this.lastTime = currentTime;
    this.update(deltaTime);
    this.render();
    requestAnimationFrame((t) => this.animate(t));
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    } : { r: 0, g: 0, b: 0 };
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }
}

// Usage:
// const canvas = document.getElementById('particles');
// const system = new ParticleSystem(canvas);
// system.animate(0);`;
  }, [config]);

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(generateParticleSystemCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
            Particle System Editor
          </h3>
        </div>

        {/* Canvas Preview */}
        <div className="relative w-full aspect-[2/1] @md:aspect-[3/1] rounded-lg border border-border overflow-hidden bg-black/90">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-full"
          />

          {/* Playback controls overlay */}
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
              <Button
                size="sm"
                variant="secondary"
                onClick={emitBurst}
                className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
              >
                <Flame className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Burst
              </Button>
            </div>

            <div className="px-2 py-1 rounded-md bg-black/50 backdrop-blur-sm">
              <span className="text-[10px] @sm:text-xs text-white/80 font-mono">
                {particleCount} particles
              </span>
            </div>
          </div>
        </div>

        {/* Tabs for Controls */}
        <Tabs defaultValue="presets" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
            <TabsTrigger value="emission" className="text-[10px] @sm:text-xs @md:text-sm">
              Emission
            </TabsTrigger>
            <TabsTrigger value="appearance" className="text-[10px] @sm:text-xs @md:text-sm">
              Appearance
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] @sm:text-xs @md:text-sm">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Presets Tab */}
          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-2 @sm:grid-cols-4 gap-1.5 @sm:gap-2">
              {(Object.keys(PRESETS) as PresetEffect[]).map((preset) => (
                <Button
                  key={preset}
                  variant={config.preset === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="h-auto py-2 text-[10px] @sm:text-xs capitalize"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </TabsContent>

          {/* Emission Tab */}
          <TabsContent value="emission" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Emission Rate */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Emission Rate</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.emissionRate.toFixed(0)}/s
                </span>
              </div>
              <Slider
                value={[config.emissionRate]}
                onValueChange={(value) => updateConfig({ emissionRate: value[0] })}
                min={0}
                max={200}
                step={5}
              />
            </div>

            {/* Burst Count */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Burst Count</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.burstCount}
                </span>
              </div>
              <Slider
                value={[config.burstCount]}
                onValueChange={(value) => updateConfig({ burstCount: value[0] })}
                min={10}
                max={500}
                step={10}
              />
            </div>

            {/* Lifetime */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Lifetime</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.lifetime.toFixed(1)}s
                </span>
              </div>
              <Slider
                value={[config.lifetime]}
                onValueChange={(value) => updateConfig({ lifetime: value[0] })}
                min={0.1}
                max={10}
                step={0.1}
              />
            </div>

            {/* Speed */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Speed</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.speed.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[config.speed]}
                onValueChange={(value) => updateConfig({ speed: value[0] })}
                min={0}
                max={500}
                step={10}
              />
            </div>

            {/* Speed Variation */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Speed Variation</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {(config.speedVariation * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.speedVariation]}
                onValueChange={(value) => updateConfig({ speedVariation: value[0] })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Direction */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Direction</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.direction}°
                </span>
              </div>
              <Slider
                value={[config.direction]}
                onValueChange={(value) => updateConfig({ direction: value[0] })}
                min={0}
                max={360}
                step={5}
              />
            </div>

            {/* Spread Angle */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Spread Angle</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.spreadAngle}°
                </span>
              </div>
              <Slider
                value={[config.spreadAngle]}
                onValueChange={(value) => updateConfig({ spreadAngle: value[0] })}
                min={0}
                max={360}
                step={5}
              />
            </div>

            {/* Gravity */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Gravity</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.gravity.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[config.gravity]}
                onValueChange={(value) => updateConfig({ gravity: value[0] })}
                min={-200}
                max={500}
                step={10}
              />
            </div>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Start Size */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Start Size</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.startSize.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[config.startSize]}
                onValueChange={(value) => updateConfig({ startSize: value[0] })}
                min={1}
                max={50}
                step={1}
              />
            </div>

            {/* End Size */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">End Size</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.endSize.toFixed(0)}
                </span>
              </div>
              <Slider
                value={[config.endSize]}
                onValueChange={(value) => updateConfig({ endSize: value[0] })}
                min={1}
                max={50}
                step={1}
              />
            </div>

            {/* Start Color */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Start Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.startColor}
                  onChange={(e) => updateConfig({ startColor: e.target.value })}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={config.startColor}
                  onChange={(e) => updateConfig({ startColor: e.target.value })}
                  className="flex-1 h-8 text-[10px] @sm:text-xs font-mono"
                />
              </div>
            </div>

            {/* End Color */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">End Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.endColor}
                  onChange={(e) => updateConfig({ endColor: e.target.value })}
                  className="w-10 h-10 rounded border border-border cursor-pointer"
                />
                <Input
                  value={config.endColor}
                  onChange={(e) => updateConfig({ endColor: e.target.value })}
                  className="flex-1 h-8 text-[10px] @sm:text-xs font-mono"
                />
              </div>
            </div>

            {/* Fade In */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Fade In</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {(config.fadeIn * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.fadeIn]}
                onValueChange={(value) => updateConfig({ fadeIn: value[0] })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Fade Out */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Fade Out</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {(config.fadeOut * 100).toFixed(0)}%
                </span>
              </div>
              <Slider
                value={[config.fadeOut]}
                onValueChange={(value) => updateConfig({ fadeOut: value[0] })}
                min={0}
                max={1}
                step={0.05}
              />
            </div>

            {/* Angular Velocity */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Rotation Speed</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {config.angularVelocity.toFixed(0)}°/s
                </span>
              </div>
              <Slider
                value={[config.angularVelocity]}
                onValueChange={(value) => updateConfig({ angularVelocity: value[0] })}
                min={0}
                max={360}
                step={10}
              />
            </div>

            {/* Blend Mode */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Blend Mode</Label>
              <Select
                value={config.blendMode}
                onValueChange={(value) => updateConfig({ blendMode: value as BlendMode })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="additive">Additive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            <div className="space-y-2">
              <Button
                onClick={handleExportJSON}
                variant="outline"
                className="w-full h-8 @sm:h-9 text-[10px] @sm:text-xs"
              >
                <Download className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                Download Config (JSON)
              </Button>

              <Button
                onClick={handleCopyConfig}
                variant="outline"
                className="w-full h-8 @sm:h-9 text-[10px] @sm:text-xs"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                    Copy Config (JSON)
                  </>
                )}
              </Button>

              <Button
                onClick={handleCopyCode}
                variant="default"
                className="w-full h-8 @sm:h-9 text-[10px] @sm:text-xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                    Copy Particle System Code
                  </>
                )}
              </Button>
            </div>

            <div className="pt-2 border-t">
              <p className="text-[10px] @sm:text-xs text-muted-foreground">
                Export your particle system configuration as JSON or copy the complete JavaScript class implementation.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
