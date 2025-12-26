"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Sparkles, Copy, Check, RotateCcw, Droplet, Circle } from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GlassmorphismWidgetProps {
  widget: Widget;
}

interface GlassConfig {
  blurAmount: number;
  opacity: number;
  backgroundColor: string;
  borderRadius: number;
  borderWidth: number;
  borderColor: string;
  borderOpacity: number;
  shadowIntensity: number;
  backgroundGradient: string;
  lightText: boolean;
}

interface Preset {
  name: string;
  config: GlassConfig;
}

const defaultConfig: GlassConfig = {
  blurAmount: 10,
  opacity: 0.15,
  backgroundColor: "#ffffff",
  borderRadius: 16,
  borderWidth: 1,
  borderColor: "#ffffff",
  borderOpacity: 0.3,
  shadowIntensity: 0.2,
  backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  lightText: true,
};

const GRADIENT_PRESETS = [
  {
    name: "Purple Dream",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    name: "Ocean Blue",
    gradient: "linear-gradient(135deg, #2E3192 0%, #1BFFFF 100%)",
  },
  {
    name: "Sunset",
    gradient: "linear-gradient(135deg, #FF6B6B 0%, #FFD93D 50%, #6BCF7F 100%)",
  },
  {
    name: "Fire",
    gradient: "linear-gradient(135deg, #FF0000 0%, #FFA500 50%, #FFFF00 100%)",
  },
  {
    name: "Pink Flamingo",
    gradient: "linear-gradient(135deg, #E94057 0%, #F27121 100%)",
  },
  {
    name: "Green Forest",
    gradient: "linear-gradient(135deg, #348F50 0%, #56B4D3 100%)",
  },
  {
    name: "Northern Lights",
    gradient: "linear-gradient(135deg, #00C9FF 0%, #92FE9D 100%)",
  },
  {
    name: "Cosmic",
    gradient: "linear-gradient(135deg, #5F2C82 0%, #49A09D 100%)",
  },
];

const GLASS_PRESETS: Preset[] = [
  {
    name: "Light Glass",
    config: {
      blurAmount: 10,
      opacity: 0.15,
      backgroundColor: "#ffffff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#ffffff",
      borderOpacity: 0.3,
      shadowIntensity: 0.2,
      backgroundGradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      lightText: true,
    },
  },
  {
    name: "Dark Glass",
    config: {
      blurAmount: 12,
      opacity: 0.25,
      backgroundColor: "#000000",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#ffffff",
      borderOpacity: 0.2,
      shadowIntensity: 0.3,
      backgroundGradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
      lightText: true,
    },
  },
  {
    name: "Frosted",
    config: {
      blurAmount: 20,
      opacity: 0.2,
      backgroundColor: "#ffffff",
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#ffffff",
      borderOpacity: 0.4,
      shadowIntensity: 0.15,
      backgroundGradient: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
      lightText: false,
    },
  },
  {
    name: "Crystal",
    config: {
      blurAmount: 8,
      opacity: 0.1,
      backgroundColor: "#ffffff",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#ffffff",
      borderOpacity: 0.5,
      shadowIntensity: 0.1,
      backgroundGradient: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
      lightText: false,
    },
  },
  {
    name: "Smoky",
    config: {
      blurAmount: 15,
      opacity: 0.3,
      backgroundColor: "#000000",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: "#ffffff",
      borderOpacity: 0.15,
      shadowIntensity: 0.4,
      backgroundGradient: "linear-gradient(135deg, #434343 0%, #000000 100%)",
      lightText: true,
    },
  },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

export function GlassmorphismWidget({ widget }: GlassmorphismWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const [glassConfig, setGlassConfig] = useState<GlassConfig>(() => {
    const saved = widget.config?.glassConfig as GlassConfig | undefined;
    return saved?.blurAmount !== undefined ? saved : defaultConfig;
  });

  const [copied, setCopied] = useState(false);

  // Save config to store when it changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          glassConfig,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [glassConfig, widget.id]);

  // Generate glassmorphism CSS
  const glassCSS = useMemo(() => {
    const bgRgb = hexToRgb(glassConfig.backgroundColor);
    const borderRgb = hexToRgb(glassConfig.borderColor);

    if (!bgRgb || !borderRgb) return {};

    const bgRgba = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${glassConfig.opacity})`;
    const borderRgba = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${glassConfig.borderOpacity})`;
    const shadowRgba = `rgba(0, 0, 0, ${glassConfig.shadowIntensity})`;

    return {
      backdropFilter: `blur(${glassConfig.blurAmount}px)`,
      WebkitBackdropFilter: `blur(${glassConfig.blurAmount}px)`,
      background: bgRgba,
      borderRadius: `${glassConfig.borderRadius}px`,
      border: `${glassConfig.borderWidth}px solid ${borderRgba}`,
      boxShadow: `0 8px 32px 0 ${shadowRgba}`,
    };
  }, [glassConfig]);

  // Generate CSS code string
  const cssCodeString = useMemo(() => {
    const bgRgb = hexToRgb(glassConfig.backgroundColor);
    const borderRgb = hexToRgb(glassConfig.borderColor);

    if (!bgRgb || !borderRgb) return "";

    const bgRgba = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${glassConfig.opacity})`;
    const borderRgba = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${glassConfig.borderOpacity})`;
    const shadowRgba = `rgba(0, 0, 0, ${glassConfig.shadowIntensity})`;

    return `.glass {
  backdrop-filter: blur(${glassConfig.blurAmount}px);
  -webkit-backdrop-filter: blur(${glassConfig.blurAmount}px);
  background: ${bgRgba};
  border-radius: ${glassConfig.borderRadius}px;
  border: ${glassConfig.borderWidth}px solid ${borderRgba};
  box-shadow: 0 8px 32px 0 ${shadowRgba};
}`;
  }, [glassConfig]);

  const handleCopyCSS = async () => {
    try {
      await navigator.clipboard.writeText(cssCodeString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleReset = () => {
    setGlassConfig(defaultConfig);
  };

  const handlePresetClick = (preset: Preset) => {
    setGlassConfig(preset.config);
  };

  const handleGradientPresetClick = (gradient: string) => {
    setGlassConfig((prev) => ({ ...prev, backgroundGradient: gradient }));
  };

  const updateConfig = (updates: Partial<GlassConfig>) => {
    setGlassConfig((prev) => ({ ...prev, ...updates }));
  };

  return (
    <div className="flex h-full flex-col gap-3 p-3 @container overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Glassmorphism Generator</h3>
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
        className="relative flex items-center justify-center rounded-lg p-8 @sm:p-10 @md:p-12 overflow-hidden"
        style={{ background: glassConfig.backgroundGradient }}
      >
        <motion.div
          layout
          className="relative p-6 @sm:p-8 @md:p-10 max-w-xs"
          style={glassCSS}
          transition={{ duration: 0.2 }}
        >
          <div className={glassConfig.lightText ? "text-white" : "text-gray-900"}>
            <h4 className="text-lg @sm:text-xl @md:text-2xl font-bold mb-2">
              Glassmorphism
            </h4>
            <p className="text-xs @sm:text-sm @md:text-base opacity-90 mb-4">
              Modern UI design with frosted glass effect and backdrop blur.
            </p>
            <div className="flex items-center gap-2">
              <Circle className="h-4 w-4 @sm:h-5 @sm:w-5" />
              <Droplet className="h-4 w-4 @sm:h-5 @sm:w-5" />
              <Sparkles className="h-4 w-4 @sm:h-5 @sm:w-5" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs for Controls and Presets */}
      <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="controls" className="text-xs">
            Controls
          </TabsTrigger>
          <TabsTrigger value="presets" className="text-xs">
            Presets
          </TabsTrigger>
          <TabsTrigger value="background" className="text-xs">
            Background
          </TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-3 mt-3">
          {/* Blur Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="blur" className="text-xs font-medium">
                Blur Amount
              </Label>
              <span className="text-xs text-muted-foreground">
                {glassConfig.blurAmount}px
              </span>
            </div>
            <Slider
              id="blur"
              value={[glassConfig.blurAmount]}
              onValueChange={(value) => updateConfig({ blurAmount: value[0] })}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="opacity" className="text-xs font-medium">
                Transparency
              </Label>
              <span className="text-xs text-muted-foreground">
                {(glassConfig.opacity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              id="opacity"
              value={[glassConfig.opacity * 100]}
              onValueChange={(value) => updateConfig({ opacity: value[0] / 100 })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <Label htmlFor="bgcolor" className="text-xs font-medium">
              Glass Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="bgcolor"
                value={glassConfig.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded border bg-background"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {glassConfig.backgroundColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="radius" className="text-xs font-medium">
                Border Radius
              </Label>
              <span className="text-xs text-muted-foreground">
                {glassConfig.borderRadius}px
              </span>
            </div>
            <Slider
              id="radius"
              value={[glassConfig.borderRadius]}
              onValueChange={(value) => updateConfig({ borderRadius: value[0] })}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>

          {/* Border Width */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="borderwidth" className="text-xs font-medium">
                Border Width
              </Label>
              <span className="text-xs text-muted-foreground">
                {glassConfig.borderWidth}px
              </span>
            </div>
            <Slider
              id="borderwidth"
              value={[glassConfig.borderWidth]}
              onValueChange={(value) => updateConfig({ borderWidth: value[0] })}
              min={0}
              max={5}
              step={0.5}
              className="w-full"
            />
          </div>

          {/* Border Color */}
          <div className="space-y-2">
            <Label htmlFor="bordercolor" className="text-xs font-medium">
              Border Color
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                id="bordercolor"
                value={glassConfig.borderColor}
                onChange={(e) => updateConfig({ borderColor: e.target.value })}
                className="h-9 w-full cursor-pointer rounded border bg-background"
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {glassConfig.borderColor.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Border Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="borderopacity" className="text-xs font-medium">
                Border Opacity
              </Label>
              <span className="text-xs text-muted-foreground">
                {(glassConfig.borderOpacity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              id="borderopacity"
              value={[glassConfig.borderOpacity * 100]}
              onValueChange={(value) => updateConfig({ borderOpacity: value[0] / 100 })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Shadow Intensity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="shadow" className="text-xs font-medium">
                Shadow Intensity
              </Label>
              <span className="text-xs text-muted-foreground">
                {(glassConfig.shadowIntensity * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              id="shadow"
              value={[glassConfig.shadowIntensity * 100]}
              onValueChange={(value) => updateConfig({ shadowIntensity: value[0] / 100 })}
              min={0}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          {/* Light/Dark Text Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="textcolor" className="text-xs font-medium">
              Light Text
            </Label>
            <Switch
              id="textcolor"
              checked={glassConfig.lightText}
              onCheckedChange={(checked) => updateConfig({ lightText: checked })}
            />
          </div>
        </TabsContent>

        <TabsContent value="presets" className="flex-1 overflow-y-auto mt-3">
          <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
            {GLASS_PRESETS.map((preset) => {
              const presetGlassCSS = (() => {
                const bgRgb = hexToRgb(preset.config.backgroundColor);
                const borderRgb = hexToRgb(preset.config.borderColor);
                if (!bgRgb || !borderRgb) return {};
                const bgRgba = `rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${preset.config.opacity})`;
                const borderRgba = `rgba(${borderRgb.r}, ${borderRgb.g}, ${borderRgb.b}, ${preset.config.borderOpacity})`;
                const shadowRgba = `rgba(0, 0, 0, ${preset.config.shadowIntensity})`;
                return {
                  backdropFilter: `blur(${preset.config.blurAmount}px)`,
                  WebkitBackdropFilter: `blur(${preset.config.blurAmount}px)`,
                  background: bgRgba,
                  borderRadius: `${preset.config.borderRadius}px`,
                  border: `${preset.config.borderWidth}px solid ${borderRgba}`,
                  boxShadow: `0 8px 32px 0 ${shadowRgba}`,
                };
              })();

              return (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePresetClick(preset)}
                  className="relative aspect-[3/2] rounded-lg overflow-hidden group cursor-pointer"
                  style={{ background: preset.config.backgroundGradient }}
                >
                  <div className="absolute inset-0 flex items-center justify-center p-4">
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={presetGlassCSS}
                    >
                      <span
                        className={`text-xs font-medium text-center ${
                          preset.config.lightText ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {preset.name}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="background" className="flex-1 overflow-y-auto mt-3">
          <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
            {GRADIENT_PRESETS.map((preset) => (
              <motion.button
                key={preset.name}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => handleGradientPresetClick(preset.gradient)}
                className="relative aspect-[3/2] rounded-lg border border-border overflow-hidden group cursor-pointer"
                style={{ background: preset.gradient }}
              >
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center px-2">
                    {preset.name}
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* CSS Output & Copy */}
      <div className="space-y-2 border-t pt-3">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">CSS Output</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyCSS}
            className="h-7 px-2 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 mr-1 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 mr-1" />
                Copy CSS
              </>
            )}
          </Button>
        </div>
        <code className="block rounded-md border bg-muted px-3 py-2 text-[10px] leading-relaxed font-mono overflow-x-auto">
          {cssCodeString}
        </code>
      </div>
    </div>
  );
}
