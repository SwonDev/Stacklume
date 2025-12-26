"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { Waves, Download, RefreshCw, Copy, Check } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface NoiseGeneratorWidgetProps {
  widget: Widget;
}

type NoiseType = "perlin" | "simplex" | "worley" | "value" | "white";
type ColorMapping = "grayscale" | "terrain" | "heat" | "ocean" | "forest" | "custom";
type DimensionMode = "1d" | "2d";

interface NoiseConfig {
  noiseType?: NoiseType;
  scale?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  seed?: number;
  colorMapping?: ColorMapping;
  tileable?: boolean;
  dimensionMode?: DimensionMode;
  customGradient?: Array<{ position: number; color: string }>;
  canvasWidth?: number;
  canvasHeight?: number;
}

// Perlin Noise Implementation
class PerlinNoise {
  private permutation: number[];
  private p: number[];

  constructor(seed: number) {
    this.permutation = this.generatePermutation(seed);
    this.p = [...this.permutation, ...this.permutation];
  }

  private generatePermutation(seed: number): number[] {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let random = seed;

    // Seeded shuffle
    for (let i = p.length - 1; i > 0; i--) {
      random = (random * 16807) % 2147483647;
      const j = Math.floor((random / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    return p;
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : 0;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.p[X] + Y;
    const aa = this.p[a];
    const ab = this.p[a + 1];
    const b = this.p[X + 1] + Y;
    const ba = this.p[b];
    const bb = this.p[b + 1];

    return this.lerp(
      v,
      this.lerp(u, this.grad(this.p[aa], x, y), this.grad(this.p[ba], x - 1, y)),
      this.lerp(u, this.grad(this.p[ab], x, y - 1), this.grad(this.p[bb], x - 1, y - 1))
    );
  }
}

// Simplex Noise Implementation (simplified 2D)
class SimplexNoise {
  private perm: number[];
  private grad3: number[][];

  constructor(seed: number) {
    this.grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    ];

    const p = Array.from({ length: 256 }, (_, i) => i);
    let random = seed;

    for (let i = p.length - 1; i > 0; i--) {
      random = (random * 16807) % 2147483647;
      const j = Math.floor((random / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.perm = [...p, ...p];
  }

  noise(xin: number, yin: number): number {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    let n0 = 0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    let n1 = 0;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    let n2 = 0;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }

  private dot(g: number[], x: number, y: number): number {
    return g[0] * x + g[1] * y;
  }
}

// Worley/Voronoi Noise
class WorleyNoise {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  private hash(x: number, y: number): { x: number; y: number } {
    let h = (x * 374761393 + y * 668265263 + this.seed) ^ (this.seed + 374761393);
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    const random = (h >>> 0) / 4294967296;

    h = ((x + 1) * 374761393 + (y + 1) * 668265263 + this.seed) ^ (this.seed + 668265263);
    h = (h ^ (h >>> 13)) * 1274126177;
    h = h ^ (h >>> 16);
    const random2 = (h >>> 0) / 4294967296;

    return { x: random, y: random2 };
  }

  noise(x: number, y: number): number {
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    let minDist = Infinity;

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const neighborX = cellX + i;
        const neighborY = cellY + j;
        const point = this.hash(neighborX, neighborY);
        const pointX = neighborX + point.x;
        const pointY = neighborY + point.y;
        const dx = x - pointX;
        const dy = y - pointY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        minDist = Math.min(minDist, dist);
      }
    }

    return Math.min(1, minDist * 2);
  }
}

// Value Noise
class ValueNoise {
  private permutation: number[];

  constructor(seed: number) {
    const p = Array.from({ length: 256 }, (_, i) => i);
    let random = seed;

    for (let i = p.length - 1; i > 0; i--) {
      random = (random * 16807) % 2147483647;
      const j = Math.floor((random / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    this.permutation = [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(t: number, a: number, b: number): number {
    return a + t * (b - a);
  }

  noise(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const a = this.permutation[X] + Y;
    const b = this.permutation[X + 1] + Y;

    const aa = this.permutation[a];
    const ab = this.permutation[a + 1];
    const ba = this.permutation[b];
    const bb = this.permutation[b + 1];

    const v1 = aa / 255;
    const v2 = ba / 255;
    const v3 = ab / 255;
    const v4 = bb / 255;

    return this.lerp(v, this.lerp(u, v1, v2), this.lerp(u, v3, v4)) * 2 - 1;
  }
}

// White Noise
class WhiteNoise {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  noise(x: number, y: number): number {
    const n = Math.floor(x) * 374761393 + Math.floor(y) * 668265263 + this.seed;
    const random = ((n ^ (n >>> 13)) * 1274126177) >>> 0;
    return (random / 4294967296) * 2 - 1;
  }
}

export function NoiseGeneratorWidget({ widget }: NoiseGeneratorWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize from widget config or use defaults
  const config = widget.config as NoiseConfig | undefined;
  const [noiseType, setNoiseType] = useState<NoiseType>(config?.noiseType || "perlin");
  const [scale, setScale] = useState<number>(config?.scale || 50);
  const [octaves, setOctaves] = useState<number>(config?.octaves || 4);
  const [persistence, setPersistence] = useState<number>(config?.persistence || 0.5);
  const [lacunarity, setLacunarity] = useState<number>(config?.lacunarity || 2);
  const [seed, setSeed] = useState<number>(() => config?.seed || Math.floor(Math.random() * 10000));
  const [seedInput, setSeedInput] = useState<string>(String(config?.seed || seed));
  const [colorMapping, setColorMapping] = useState<ColorMapping>(config?.colorMapping || "grayscale");
  const [tileable, setTileable] = useState<boolean>(config?.tileable || false);
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>(config?.dimensionMode || "2d");
  const [copied, setCopied] = useState<string | null>(null);

  // Save config to widget store
  const saveConfig = () => {
    updateWidget(widget.id, {
      config: {
        noiseType,
        scale,
        octaves,
        persistence,
        lacunarity,
        seed,
        colorMapping,
        tileable,
        dimensionMode,
      },
    });
  };

  // Color mapping functions
  const getColor = (value: number, mapping: ColorMapping): [number, number, number] => {
    const normalized = (value + 1) / 2; // Convert from [-1, 1] to [0, 1]

    switch (mapping) {
      case "grayscale": {
        const gray = Math.floor(normalized * 255);
        return [gray, gray, gray];
      }
      case "terrain": {
        if (normalized < 0.3) return [0, 100, 200]; // Deep water
        if (normalized < 0.4) return [50, 150, 255]; // Shallow water
        if (normalized < 0.45) return [238, 214, 175]; // Beach
        if (normalized < 0.6) return [34, 139, 34]; // Grass
        if (normalized < 0.75) return [107, 142, 35]; // Forest
        if (normalized < 0.85) return [139, 137, 137]; // Mountain
        return [255, 255, 255]; // Snow
      }
      case "heat": {
        if (normalized < 0.25) return [0, 0, 128]; // Dark blue
        if (normalized < 0.5) return [255, 0, 0]; // Red
        if (normalized < 0.75) return [255, 165, 0]; // Orange
        return [255, 255, 0]; // Yellow
      }
      case "ocean": {
        if (normalized < 0.33) return [0, 20, 60]; // Deep ocean
        if (normalized < 0.66) return [0, 80, 150]; // Mid ocean
        return [50, 150, 200]; // Shallow
      }
      case "forest": {
        if (normalized < 0.33) return [10, 50, 10]; // Dark forest
        if (normalized < 0.66) return [34, 139, 34]; // Mid forest
        return [144, 238, 144]; // Light forest
      }
      default:
        return [Math.floor(normalized * 255), Math.floor(normalized * 255), Math.floor(normalized * 255)];
    }
  };

  // Generate noise with octaves
  const generateNoise = useMemo(() => {
    return (x: number, y: number, noiseGenerator: PerlinNoise | SimplexNoise | WorleyNoise | ValueNoise | WhiteNoise): number => {
      let total = 0;
      let frequency = 1;
      let amplitude = 1;
      let maxValue = 0;

      for (let i = 0; i < octaves; i++) {
        const sampleX = (x / scale) * frequency;
        const sampleY = (y / scale) * frequency;

        const noiseValue = noiseGenerator.noise(sampleX, sampleY);
        total += noiseValue * amplitude;

        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
      }

      return total / maxValue;
    };
  }, [octaves, persistence, lacunarity, scale]);

  // Render noise to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.createImageData(width, height);

    let noiseGenerator: PerlinNoise | SimplexNoise | WorleyNoise | ValueNoise | WhiteNoise;

    switch (noiseType) {
      case "perlin":
        noiseGenerator = new PerlinNoise(seed);
        break;
      case "simplex":
        noiseGenerator = new SimplexNoise(seed);
        break;
      case "worley":
        noiseGenerator = new WorleyNoise(seed);
        break;
      case "value":
        noiseGenerator = new ValueNoise(seed);
        break;
      case "white":
        noiseGenerator = new WhiteNoise(seed);
        break;
    }

    if (dimensionMode === "2d") {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let noiseValue: number;

          if (tileable) {
            // Tileable noise using domain warping
            const nx = x / width;
            const ny = y / height;
            const sampleX = Math.cos(nx * 2 * Math.PI) * width / (2 * Math.PI);
            const sampleY = Math.sin(nx * 2 * Math.PI) * width / (2 * Math.PI);
            const sampleZ = Math.cos(ny * 2 * Math.PI) * height / (2 * Math.PI);
            const sampleW = Math.sin(ny * 2 * Math.PI) * height / (2 * Math.PI);

            const noise1 = generateNoise(sampleX, sampleY, noiseGenerator);
            const noise2 = generateNoise(sampleZ, sampleW, noiseGenerator);
            noiseValue = (noise1 + noise2) / 2;
          } else {
            noiseValue = generateNoise(x, y, noiseGenerator);
          }

          const [r, g, b] = getColor(noiseValue, colorMapping);
          const index = (y * width + x) * 4;
          imageData.data[index] = r;
          imageData.data[index + 1] = g;
          imageData.data[index + 2] = b;
          imageData.data[index + 3] = 255;
        }
      }
    } else {
      // 1D visualization - show as horizontal strips
      for (let x = 0; x < width; x++) {
        const noiseValue = generateNoise(x, 0, noiseGenerator);
        const [r, g, b] = getColor(noiseValue, colorMapping);

        for (let y = 0; y < height; y++) {
          const index = (y * width + x) * 4;
          imageData.data[index] = r;
          imageData.data[index + 1] = g;
          imageData.data[index + 2] = b;
          imageData.data[index + 3] = 255;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [noiseType, scale, octaves, persistence, lacunarity, seed, colorMapping, tileable, dimensionMode, generateNoise]);

  const handleRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 10000);
    setSeed(newSeed);
    setSeedInput(String(newSeed));
    saveConfig();
  };

  const handleSeedInputChange = (value: string) => {
    setSeedInput(value);
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed)) {
      setSeed(parsed);
      saveConfig();
    }
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `noise-${noiseType}-${seed}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Noise exported as PNG");
    });
  };

  const handleCopyCode = () => {
    const code = `// ${noiseType.charAt(0).toUpperCase() + noiseType.slice(1)} Noise Generator
const config = {
  type: "${noiseType}",
  scale: ${scale},
  octaves: ${octaves},
  persistence: ${persistence},
  lacunarity: ${lacunarity},
  seed: ${seed},
  tileable: ${tileable}
};

// Usage example:
// const noise = generateNoise(x, y, config);
`;

    navigator.clipboard.writeText(code);
    setCopied("code");
    setTimeout(() => setCopied(null), 2000);
    toast.success("Code copied to clipboard");
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <Waves className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              Noise Generator
            </h3>
          </div>
        </div>

        {/* Canvas Preview */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full aspect-[4/3] rounded-lg border border-border overflow-hidden bg-muted"
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={300}
            className="w-full h-full"
            style={{ imageRendering: "pixelated" }}
          />
        </motion.div>

        {/* Tabs for Controls */}
        <Tabs defaultValue="basic" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="basic" className="text-[10px] @sm:text-xs @md:text-sm">
              Basic
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-[10px] @sm:text-xs @md:text-sm">
              Advanced
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] @sm:text-xs @md:text-sm">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Basic Controls */}
          <TabsContent value="basic" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Noise Type */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Noise Type</Label>
              <Select value={noiseType} onValueChange={(value: NoiseType) => { setNoiseType(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="perlin">Perlin Noise</SelectItem>
                  <SelectItem value="simplex">Simplex Noise</SelectItem>
                  <SelectItem value="worley">Worley/Voronoi</SelectItem>
                  <SelectItem value="value">Value Noise</SelectItem>
                  <SelectItem value="white">White Noise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Scale */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Scale</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {scale}
                </span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={(v) => setScale(v[0])}
                onValueCommit={saveConfig}
                min={1}
                max={200}
                step={1}
                className="w-full"
              />
            </div>

            {/* Seed */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Seed</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={seedInput}
                  onChange={(e) => handleSeedInputChange(e.target.value)}
                  className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRandomSeed}
                  className="h-7 @sm:h-8 @md:h-9 px-2"
                >
                  <RefreshCw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                </Button>
              </div>
            </div>

            {/* Color Mapping */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Color Mapping</Label>
              <Select value={colorMapping} onValueChange={(value: ColorMapping) => { setColorMapping(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grayscale">Grayscale</SelectItem>
                  <SelectItem value="terrain">Terrain</SelectItem>
                  <SelectItem value="heat">Heat Map</SelectItem>
                  <SelectItem value="ocean">Ocean</SelectItem>
                  <SelectItem value="forest">Forest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dimension Mode */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Visualization</Label>
              <Select value={dimensionMode} onValueChange={(value: DimensionMode) => { setDimensionMode(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2d">2D Noise</SelectItem>
                  <SelectItem value="1d">1D Noise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          {/* Advanced Controls */}
          <TabsContent value="advanced" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            {/* Octaves */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Octaves</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {octaves}
                </span>
              </div>
              <Slider
                value={[octaves]}
                onValueChange={(v) => setOctaves(v[0])}
                onValueCommit={saveConfig}
                min={1}
                max={8}
                step={1}
                className="w-full"
              />
            </div>

            {/* Persistence */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Persistence</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {persistence.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[persistence]}
                onValueChange={(v) => setPersistence(v[0])}
                onValueCommit={saveConfig}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Lacunarity */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Lacunarity</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {lacunarity.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[lacunarity]}
                onValueChange={(v) => setLacunarity(v[0])}
                onValueCommit={saveConfig}
                min={1}
                max={4}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Tileable */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Tileable/Seamless</Label>
                <p className="text-[9px] @sm:text-[10px] text-muted-foreground">
                  Generate seamless tiling noise
                </p>
              </div>
              <Switch
                checked={tileable}
                onCheckedChange={(checked) => {
                  setTileable(checked);
                  saveConfig();
                }}
              />
            </div>

            {/* Info */}
            <div className="p-2 @sm:p-3 rounded-lg bg-muted/50 border border-border">
              <p className="text-[9px] @sm:text-[10px] text-muted-foreground leading-relaxed">
                <strong>Octaves:</strong> More layers = more detail<br />
                <strong>Persistence:</strong> Controls amplitude decrease<br />
                <strong>Lacunarity:</strong> Controls frequency increase
              </p>
            </div>
          </TabsContent>

          {/* Export Controls */}
          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2 @sm:mt-3">
            <Button
              onClick={handleExportPNG}
              variant="default"
              className="w-full h-8 @sm:h-9 text-[10px] @sm:text-xs @md:text-sm"
            >
              <Download className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-2" />
              Export as PNG
            </Button>

            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="w-full h-8 @sm:h-9 text-[10px] @sm:text-xs @md:text-sm"
            >
              {copied === "code" ? (
                <>
                  <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-2" />
                  Copy Generation Code
                </>
              )}
            </Button>

            {/* Current Settings Display */}
            <div className="p-2 @sm:p-3 rounded-lg bg-muted border border-border">
              <h4 className="text-[10px] @sm:text-xs font-semibold mb-2">Current Settings</h4>
              <div className="space-y-1 text-[9px] @sm:text-[10px] font-mono text-muted-foreground">
                <div>Type: {noiseType}</div>
                <div>Scale: {scale}</div>
                <div>Octaves: {octaves}</div>
                <div>Persistence: {persistence.toFixed(2)}</div>
                <div>Lacunarity: {lacunarity.toFixed(2)}</div>
                <div>Seed: {seed}</div>
                <div>Tileable: {tileable ? "Yes" : "No"}</div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
