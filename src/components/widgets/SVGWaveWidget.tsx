"use client";

import { useState, useMemo } from "react";
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
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Waves, Copy, Check, FlipVertical2, FlipHorizontal2, Download, Code } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

interface SVGWaveWidgetProps {
  widget: Widget;
}

type WaveType = "sine" | "zigzag" | "bumps" | "layered";
type Position = "top" | "bottom";

interface WaveConfig {
  waveType?: WaveType;
  peaks?: number;
  height?: number;
  amplitude?: number;
  complexity?: number;
  flipVertical?: boolean;
  flipHorizontal?: boolean;
  color1?: string;
  color2?: string;
  useGradient?: boolean;
  opacity?: number;
  position?: Position;
  previewBg?: string;
}

// Preset configurations
const WAVE_PRESETS = [
  {
    name: "Gentle Wave",
    waveType: "sine" as WaveType,
    peaks: 2,
    height: 100,
    amplitude: 40,
    complexity: 1,
    flipVertical: false,
    flipHorizontal: false,
    color1: "#3B82F6",
    color2: "#8B5CF6",
    useGradient: false,
    opacity: 1,
    position: "bottom" as Position,
  },
  {
    name: "Ocean",
    waveType: "layered" as WaveType,
    peaks: 3,
    height: 150,
    amplitude: 50,
    complexity: 3,
    flipVertical: false,
    flipHorizontal: false,
    color1: "#0EA5E9",
    color2: "#06B6D4",
    useGradient: true,
    opacity: 0.8,
    position: "bottom" as Position,
  },
  {
    name: "Mountains",
    waveType: "zigzag" as WaveType,
    peaks: 5,
    height: 200,
    amplitude: 80,
    complexity: 1,
    flipVertical: false,
    flipHorizontal: false,
    color1: "#64748B",
    color2: "#475569",
    useGradient: true,
    opacity: 1,
    position: "bottom" as Position,
  },
  {
    name: "Clouds",
    waveType: "bumps" as WaveType,
    peaks: 4,
    height: 120,
    amplitude: 60,
    complexity: 2,
    flipVertical: false,
    flipHorizontal: false,
    color1: "#E0E7FF",
    color2: "#C7D2FE",
    useGradient: true,
    opacity: 0.9,
    position: "top" as Position,
  },
  {
    name: "Minimal",
    waveType: "sine" as WaveType,
    peaks: 1,
    height: 80,
    amplitude: 30,
    complexity: 1,
    flipVertical: false,
    flipHorizontal: false,
    color1: "#000000",
    color2: "#000000",
    useGradient: false,
    opacity: 1,
    position: "bottom" as Position,
  },
];

export function SVGWaveWidget({ widget }: SVGWaveWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config or use defaults
  const config = widget.config as WaveConfig | undefined;
  const [waveType, setWaveType] = useState<WaveType>(config?.waveType || "sine");
  const [peaks, setPeaks] = useState<number>(config?.peaks || 2);
  const [height, setHeight] = useState<number>(config?.height || 100);
  const [amplitude, setAmplitude] = useState<number>(config?.amplitude || 40);
  const [complexity, setComplexity] = useState<number>(config?.complexity || 1);
  const [flipVertical, setFlipVertical] = useState<boolean>(config?.flipVertical || false);
  const [flipHorizontal, setFlipHorizontal] = useState<boolean>(config?.flipHorizontal || false);
  const [color1, setColor1] = useState<string>(config?.color1 || "#3B82F6");
  const [color2, setColor2] = useState<string>(config?.color2 || "#8B5CF6");
  const [useGradient, setUseGradient] = useState<boolean>(config?.useGradient || false);
  const [opacity, setOpacity] = useState<number>(config?.opacity || 1);
  const [position, setPosition] = useState<Position>(config?.position || "bottom");
  const [previewBg, setPreviewBg] = useState<string>(config?.previewBg || "#F1F5F9");
  const [copied, setCopied] = useState<string | null>(null);

  // Generate SVG path based on wave type
  const generateWavePath = (
    type: WaveType,
    peakCount: number,
    amp: number,
    viewBoxWidth = 1200,
    viewBoxHeight = 200
  ): string => {
    const centerY = viewBoxHeight / 2;
    const wavelength = viewBoxWidth / peakCount;

    switch (type) {
      case "sine": {
        let path = `M 0 ${centerY}`;
        for (let i = 0; i <= viewBoxWidth; i += 2) {
          const y = centerY + Math.sin((i / wavelength) * Math.PI * 2) * amp;
          path += ` L ${i} ${y}`;
        }
        return path;
      }

      case "zigzag": {
        let path = `M 0 ${centerY}`;
        for (let i = 0; i <= peakCount; i++) {
          const x = (i * wavelength) + (wavelength / 2);
          const y = i % 2 === 0 ? centerY - amp : centerY + amp;
          path += ` L ${x} ${y}`;
        }
        path += ` L ${viewBoxWidth} ${centerY}`;
        return path;
      }

      case "bumps": {
        let path = `M 0 ${centerY}`;
        for (let i = 0; i <= peakCount; i++) {
          const x1 = i * wavelength;
          const x2 = x1 + wavelength / 2;
          const x3 = x1 + wavelength;
          const y = centerY - amp;
          path += ` Q ${x2} ${y}, ${x3} ${centerY}`;
        }
        return path;
      }

      case "layered": {
        let path = `M 0 ${centerY}`;
        for (let i = 0; i <= viewBoxWidth; i += 2) {
          const wave1 = Math.sin((i / wavelength) * Math.PI * 2) * amp;
          const wave2 = Math.sin((i / wavelength) * Math.PI * 4) * (amp / 3);
          const y = centerY + wave1 + wave2;
          path += ` L ${i} ${y}`;
        }
        return path;
      }

      default:
        return `M 0 ${centerY} L ${viewBoxWidth} ${centerY}`;
    }
  };

  // Generate complete SVG
  const generateSVG = useMemo(() => {
    const viewBoxWidth = 1200;
    const viewBoxHeight = 200;
    const centerY = viewBoxHeight / 2;

    const paths: string[] = [];
    const gradientId = `wave-gradient-${widget.id}`;

    // Generate paths based on complexity
    for (let i = 0; i < complexity; i++) {
      const layerAmplitude = amplitude * (1 - i * 0.2);
      const layerOpacity = opacity * (1 - i * 0.15);
      const wavePath = generateWavePath(waveType, peaks, layerAmplitude, viewBoxWidth, viewBoxHeight);

      // Close the path to fill
      const closedPath = position === "bottom"
        ? `${wavePath} L ${viewBoxWidth} ${viewBoxHeight} L 0 ${viewBoxHeight} Z`
        : `${wavePath} L ${viewBoxWidth} 0 L 0 0 Z`;

      const fillColor = useGradient ? `url(#${gradientId})` : color1;

      paths.push(`<path d="${closedPath}" fill="${fillColor}" opacity="${layerOpacity}" />`);
    }

    const transformStyle = `${flipVertical ? 'scale(1, -1)' : ''} ${flipHorizontal ? 'scale(-1, 1)' : ''}`.trim();
    const transformAttr = transformStyle ? ` transform="${transformStyle}" transform-origin="center"` : '';

    const gradient = useGradient
      ? `<defs>
      <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
      </linearGradient>
    </defs>`
      : '';

    return `<svg viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"${transformAttr}>
  ${gradient}
  ${paths.join('\n  ')}
</svg>`;
  }, [waveType, peaks, height, amplitude, complexity, flipVertical, flipHorizontal, color1, color2, useGradient, opacity, position, widget.id]);

  // Save config to widget store
  const saveConfig = () => {
    updateWidget(widget.id, {
      config: {
        waveType,
        peaks,
        height,
        amplitude,
        complexity,
        flipVertical,
        flipHorizontal,
        color1,
        color2,
        useGradient,
        opacity,
        position,
        previewBg,
      },
    });
  };

  // Auto-save on changes
  const handleChange = (updater: () => void) => {
    updater();
    setTimeout(saveConfig, 100);
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    toast.success("Copiado al portapapeles", {
      description: type === "svg" ? "Código SVG" : type === "css" ? "CSS background-image" : "Componente React",
      duration: 2000,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCopySVG = () => {
    copyToClipboard(generateSVG, "svg");
  };

  const handleCopyCSS = () => {
    const encodedSVG = encodeURIComponent(generateSVG.replace(/\s+/g, ' ').trim());
    const cssCode = `background-image: url('data:image/svg+xml,${encodedSVG}');
background-repeat: no-repeat;
background-size: 100% ${height}px;
background-position: ${position};`;
    copyToClipboard(cssCode, "css");
  };

  const handleCopyReact = () => {
    const reactComponent = `export function WaveDivider() {
  return (
    <div
      style={{
        width: '100%',
        height: '${height}px',
        position: 'relative'
      }}
      dangerouslySetInnerHTML={{
        __html: \`${generateSVG.replace(/`/g, '\\`')}\`
      }}
    />
  );
}`;
    copyToClipboard(reactComponent, "react");
  };

  const applyPreset = (preset: typeof WAVE_PRESETS[0]) => {
    setWaveType(preset.waveType);
    setPeaks(preset.peaks);
    setHeight(preset.height);
    setAmplitude(preset.amplitude);
    setComplexity(preset.complexity);
    setFlipVertical(preset.flipVertical);
    setFlipHorizontal(preset.flipHorizontal);
    setColor1(preset.color1);
    setColor2(preset.color2);
    setUseGradient(preset.useGradient);
    setOpacity(preset.opacity);
    setPosition(preset.position);
    setTimeout(saveConfig, 100);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <Waves className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            SVG Wave Generator
          </h3>
        </div>

        {/* Live Preview */}
        <div
          className="relative w-full rounded-lg border border-border overflow-hidden shadow-sm"
          style={{
            height: `${Math.max(height, 80)}px`,
            backgroundColor: previewBg
          }}
        >
          <div
            style={{
              position: 'absolute',
              [position]: 0,
              left: 0,
              right: 0,
              height: `${height}px`,
            }}
            dangerouslySetInnerHTML={{ __html: generateSVG }}
          />
        </div>

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs @md:text-sm">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-2.5 mt-2 @sm:mt-3">
            {/* Wave Type */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Wave Type</Label>
              <Select value={waveType} onValueChange={(value) => handleChange(() => setWaveType(value as WaveType))}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sine">Smooth Sine Wave</SelectItem>
                  <SelectItem value="zigzag">Sharp Zigzag</SelectItem>
                  <SelectItem value="bumps">Rounded Bumps</SelectItem>
                  <SelectItem value="layered">Layered Waves</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Peaks */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Peaks</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {peaks}
                </span>
              </div>
              <Slider
                value={[peaks]}
                onValueChange={(value) => handleChange(() => setPeaks(value[0]))}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>

            {/* Height */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Height</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {height}px
                </span>
              </div>
              <Slider
                value={[height]}
                onValueChange={(value) => handleChange(() => setHeight(value[0]))}
                min={50}
                max={300}
                step={10}
                className="w-full"
              />
            </div>

            {/* Amplitude */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Amplitude</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {amplitude}
                </span>
              </div>
              <Slider
                value={[amplitude]}
                onValueChange={(value) => handleChange(() => setAmplitude(value[0]))}
                min={10}
                max={100}
                step={5}
                className="w-full"
              />
            </div>

            {/* Complexity */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Complexity</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {complexity} layer{complexity > 1 ? 's' : ''}
                </span>
              </div>
              <Slider
                value={[complexity]}
                onValueChange={(value) => handleChange(() => setComplexity(value[0]))}
                min={1}
                max={3}
                step={1}
                className="w-full"
              />
            </div>

            {/* Colors */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Colors</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={color1}
                  onChange={(e) => handleChange(() => setColor1(e.target.value))}
                  className="w-8 h-8 @sm:w-9 @sm:h-9 rounded border border-border cursor-pointer"
                />
                {useGradient && (
                  <input
                    type="color"
                    value={color2}
                    onChange={(e) => handleChange(() => setColor2(e.target.value))}
                    className="w-8 h-8 @sm:w-9 @sm:h-9 rounded border border-border cursor-pointer"
                  />
                )}
                <div className="flex items-center gap-2 flex-1">
                  <Switch
                    checked={useGradient}
                    onCheckedChange={(checked) => handleChange(() => setUseGradient(checked))}
                  />
                  <Label className="text-[10px] @sm:text-xs cursor-pointer">Gradient</Label>
                </div>
              </div>
            </div>

            {/* Opacity */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Opacity</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {opacity.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={(value) => handleChange(() => setOpacity(value[0]))}
                min={0.1}
                max={1}
                step={0.05}
                className="w-full"
              />
            </div>

            {/* Position */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Position</Label>
              <Select value={position} onValueChange={(value) => handleChange(() => setPosition(value as Position))}>
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top Divider</SelectItem>
                  <SelectItem value="bottom">Bottom Divider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preview Background */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Preview Background</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={previewBg}
                  onChange={(e) => handleChange(() => setPreviewBg(e.target.value))}
                  className="w-8 h-8 @sm:w-9 @sm:h-9 rounded border border-border cursor-pointer"
                />
                <span className="text-[10px] @sm:text-xs font-mono text-muted-foreground">
                  {previewBg.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Flip Options */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={flipVertical ? "default" : "outline"}
                onClick={() => handleChange(() => setFlipVertical(!flipVertical))}
                className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                <FlipVertical2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Flip V
              </Button>
              <Button
                size="sm"
                variant={flipHorizontal ? "default" : "outline"}
                onClick={() => handleChange(() => setFlipHorizontal(!flipHorizontal))}
                className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                <FlipHorizontal2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Flip H
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-1 gap-2 @sm:gap-2.5">
              {WAVE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyPreset(preset)}
                  className="relative h-20 rounded-lg border border-border overflow-hidden group cursor-pointer bg-slate-100"
                >
                  <div
                    style={{
                      position: 'absolute',
                      [preset.position]: 0,
                      left: 0,
                      right: 0,
                      height: `${preset.height * 0.4}px`,
                    }}
                    dangerouslySetInnerHTML={{
                      __html: `<svg viewBox="0 0 1200 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="preview-${preset.name}" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style="stop-color:${preset.color1};stop-opacity:1" />
                            <stop offset="100%" style="stop-color:${preset.color2};stop-opacity:1" />
                          </linearGradient>
                        </defs>
                        <path d="M0,100 Q150,50,300,100 T600,100 T900,100 T1200,100 L1200,200 L0,200 Z" fill="${preset.useGradient ? `url(#preview-${preset.name})` : preset.color1}" opacity="${preset.opacity}" />
                      </svg>`
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-200">
                    <span className="text-xs @sm:text-sm font-medium text-foreground bg-background/80 px-2 py-1 rounded">
                      {preset.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Export Buttons */}
        <div className="grid grid-cols-3 gap-1 @sm:gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-7 @sm:h-8 text-[10px] @sm:text-xs"
              >
                <Download className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="start">
              <div className="space-y-1">
                <Button
                  onClick={handleCopySVG}
                  variant={copied === "svg" ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                >
                  {copied === "svg" ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                  SVG Code
                </Button>
                <Button
                  onClick={handleCopyCSS}
                  variant={copied === "css" ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                >
                  {copied === "css" ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                  CSS Background
                </Button>
                <Button
                  onClick={handleCopyReact}
                  variant={copied === "react" ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                >
                  {copied === "react" ? <Check className="w-3 h-3 mr-2" /> : <Code className="w-3 h-3 mr-2" />}
                  React Component
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            onClick={handleCopySVG}
            variant="outline"
            className="h-7 @sm:h-8 text-[10px] @sm:text-xs"
          >
            {copied === "svg" ? (
              <>
                <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                SVG
              </>
            )}
          </Button>
          <Button
            onClick={handleCopyCSS}
            variant="outline"
            className="h-7 @sm:h-8 text-[10px] @sm:text-xs"
          >
            {copied === "css" ? (
              <>
                <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                CSS
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
