"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { Heart, Shield, Zap, Droplet, Copy, Check, RotateCcw } from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface HealthBarWidgetProps {
  widget: Widget;
}

type BarType = "horizontal" | "vertical" | "circular" | "segmented";
type FillType = "solid" | "gradient";
type TextDisplay = "current-max" | "percentage" | "none";
type IconType = "heart" | "shield" | "zap" | "droplet" | "none";
type PresetStyle = "rpg" | "modern" | "pixel" | "minimal";

interface BarConfig {
  type: BarType;
  width: number;
  height: number;
  borderRadius: number;
  fillType: FillType;
  fillColor: string;
  fillColorEnd?: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  segmentCount: number;
  textDisplay: TextDisplay;
  textColor: string;
  icon: IconType;
  showIcon: boolean;
}

interface BarState {
  current: number;
  max: number;
  damageTaken: number;
  isLowHealth: boolean;
}

interface AnimationConfig {
  fillSpeed: number;
  flashSpeed: number;
  damageDelay: number;
  enableDamageBar: boolean;
  enableFlash: boolean;
  enableShake: boolean;
  lowHealthThreshold: number;
}

const defaultBarConfig: BarConfig = {
  type: "horizontal",
  width: 200,
  height: 30,
  borderRadius: 4,
  fillType: "solid",
  fillColor: "#22c55e",
  fillColorEnd: "#15803d",
  backgroundColor: "#1a1a1a",
  borderColor: "#333333",
  borderWidth: 2,
  segmentCount: 10,
  textDisplay: "current-max",
  textColor: "#ffffff",
  icon: "heart",
  showIcon: true,
};

const defaultAnimationConfig: AnimationConfig = {
  fillSpeed: 0.5,
  flashSpeed: 0.5,
  damageDelay: 0.8,
  enableDamageBar: true,
  enableFlash: true,
  enableShake: true,
  lowHealthThreshold: 30,
};

const PRESET_STYLES: Record<PresetStyle, { bar: Partial<BarConfig>; animation: Partial<AnimationConfig> }> = {
  rpg: {
    bar: {
      type: "horizontal",
      fillColor: "#dc2626",
      fillColorEnd: "#7f1d1d",
      backgroundColor: "#1a1a1a",
      borderColor: "#854d0e",
      borderWidth: 3,
      borderRadius: 2,
      textColor: "#ffffff",
      icon: "heart",
      showIcon: true,
    },
    animation: {
      fillSpeed: 0.3,
      damageDelay: 0.5,
      enableDamageBar: true,
      enableFlash: true,
      enableShake: true,
    },
  },
  modern: {
    bar: {
      type: "horizontal",
      fillColor: "#06b6d4",
      fillColorEnd: "#0e7490",
      backgroundColor: "#18181b",
      borderColor: "#27272a",
      borderWidth: 1,
      borderRadius: 12,
      textColor: "#ffffff",
      icon: "none",
      showIcon: false,
    },
    animation: {
      fillSpeed: 0.5,
      damageDelay: 0.3,
      enableDamageBar: false,
      enableFlash: false,
      enableShake: false,
    },
  },
  pixel: {
    bar: {
      type: "segmented",
      fillColor: "#22c55e",
      backgroundColor: "#000000",
      borderColor: "#ffffff",
      borderWidth: 2,
      borderRadius: 0,
      segmentCount: 8,
      textColor: "#ffffff",
      icon: "heart",
      showIcon: true,
    },
    animation: {
      fillSpeed: 0,
      damageDelay: 0,
      enableDamageBar: false,
      enableFlash: true,
      enableShake: true,
    },
  },
  minimal: {
    bar: {
      type: "horizontal",
      fillColor: "#3b82f6",
      backgroundColor: "#e5e7eb",
      borderColor: "transparent",
      borderWidth: 0,
      borderRadius: 999,
      textColor: "#1f2937",
      icon: "none",
      showIcon: false,
    },
    animation: {
      fillSpeed: 0.8,
      damageDelay: 0,
      enableDamageBar: false,
      enableFlash: false,
      enableShake: false,
    },
  },
};

const ICON_MAP = {
  heart: Heart,
  shield: Shield,
  zap: Zap,
  droplet: Droplet,
  none: null,
};

export function HealthBarWidget({ widget }: HealthBarWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load configuration from widget config
  const [barConfig, setBarConfig] = useState<BarConfig>(() => ({
    ...defaultBarConfig,
    ...widget.config?.healthBarConfig,
  }));

  const [animationConfig, setAnimationConfig] = useState<AnimationConfig>(() => ({
    ...defaultAnimationConfig,
    ...widget.config?.healthBarAnimationConfig,
  }));

  // Bar states for preview
  const [hpBar, setHpBar] = useState<BarState>({
    current: 80,
    max: 100,
    damageTaken: 0,
    isLowHealth: false,
  });

  const [mpBar, setMpBar] = useState<BarState>({
    current: 60,
    max: 100,
    damageTaken: 0,
    isLowHealth: false,
  });

  const [showMultipleBars, setShowMultipleBars] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [copied, setCopied] = useState<"css" | "react" | "json" | null>(null);

  // Save config to store with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          healthBarConfig: barConfig,
          healthBarAnimationConfig: animationConfig,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [barConfig, animationConfig, widget.id]);

  // Calculate fill percentage
  const getFillPercentage = (bar: BarState) => (bar.current / bar.max) * 100;
  const getDamageFillPercentage = (bar: BarState) => ((bar.current + bar.damageTaken) / bar.max) * 100;

  // Check low health - compute from current state to avoid infinite loop
  const hpPercentage = (hpBar.current / hpBar.max) * 100;
  const _isLowHealth = hpPercentage <= animationConfig.lowHealthThreshold;

  // Generate CSS for the bar
  const generateCSS = useMemo(() => {
    const { type, width, height, borderRadius, fillColor, fillColorEnd, backgroundColor, borderColor, borderWidth, fillType } = barConfig;

    const background = fillType === "gradient"
      ? `linear-gradient(90deg, ${fillColor}, ${fillColorEnd || fillColor})`
      : fillColor;

    if (type === "circular") {
      return `.health-bar-circular {
  width: ${width}px;
  height: ${width}px;
  border-radius: 50%;
  border: ${borderWidth}px solid ${borderColor};
  background: conic-gradient(${background} var(--percentage), ${backgroundColor} var(--percentage));
}`;
    }

    return `.health-bar {
  width: ${width}px;
  height: ${height}px;
  background: ${backgroundColor};
  border: ${borderWidth}px solid ${borderColor};
  border-radius: ${borderRadius}px;
  position: relative;
  overflow: hidden;
}

.health-bar-fill {
  width: var(--percentage);
  height: 100%;
  background: ${background};
  transition: width ${animationConfig.fillSpeed}s ease;
}`;
  }, [barConfig, animationConfig.fillSpeed]);

  // Generate React component code
  const generateReactCode = useMemo(() => {
    return `import { motion } from "motion/react";

interface HealthBarProps {
  current: number;
  max: number;
}

export function HealthBar({ current, max }: HealthBarProps) {
  const percentage = (current / max) * 100;

  return (
    <div
      className="health-bar"
      style={{
        width: "${barConfig.width}px",
        height: "${barConfig.height}px",
        background: "${barConfig.backgroundColor}",
        border: "${barConfig.borderWidth}px solid ${barConfig.borderColor}",
        borderRadius: "${barConfig.borderRadius}px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <motion.div
        className="health-bar-fill"
        initial={{ width: 0 }}
        animate={{ width: \`\${percentage}%\` }}
        transition={{ duration: ${animationConfig.fillSpeed} }}
        style={{
          height: "100%",
          background: "${barConfig.fillType === 'gradient'
            ? `linear-gradient(90deg, ${barConfig.fillColor}, ${barConfig.fillColorEnd})`
            : barConfig.fillColor}",
        }}
      />
      {${barConfig.textDisplay !== 'none'} && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span style={{ color: "${barConfig.textColor}", fontSize: "12px", fontWeight: "bold" }}>
            {${barConfig.textDisplay === 'percentage'
              ? 'Math.round(percentage)'
              : 'current'}}${barConfig.textDisplay === 'percentage' ? '%' : ''} ${barConfig.textDisplay === 'current-max' ? '/ {max}' : ''}
          </span>
        </div>
      )}
    </div>
  );
}`;
  }, [barConfig, animationConfig]);

  // Generate JSON config
  const generateJSON = useMemo(() => {
    return JSON.stringify({ barConfig, animationConfig }, null, 2);
  }, [barConfig, animationConfig]);

  // Handle damage animation
  const handleDamage = (bar: "hp" | "mp", amount: number) => {
    if (isAnimating) return;
    setIsAnimating(true);

    const setter = bar === "hp" ? setHpBar : setMpBar;

    setter(prev => {
      const newCurrent = Math.max(0, prev.current - amount);
      return { ...prev, current: newCurrent, damageTaken: amount };
    });

    // Delayed damage bar catch-up
    if (animationConfig.enableDamageBar) {
      setTimeout(() => {
        setter(prev => ({ ...prev, damageTaken: 0 }));
        setIsAnimating(false);
      }, animationConfig.damageDelay * 1000);
    } else {
      setIsAnimating(false);
    }
  };

  const handleHeal = (bar: "hp" | "mp", amount: number) => {
    const setter = bar === "hp" ? setHpBar : setMpBar;
    setter(prev => ({
      ...prev,
      current: Math.min(prev.max, prev.current + amount),
    }));
  };

  const handleReset = (bar: "hp" | "mp") => {
    const setter = bar === "hp" ? setHpBar : setMpBar;
    setter(prev => ({ ...prev, current: prev.max, damageTaken: 0 }));
  };

  const handleCopy = async (type: "css" | "react" | "json") => {
    let text = "";
    switch (type) {
      case "css":
        text = generateCSS;
        break;
      case "react":
        text = generateReactCode;
        break;
      case "json":
        text = generateJSON;
        break;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const applyPreset = (preset: PresetStyle) => {
    const presetConfig = PRESET_STYLES[preset];
    setBarConfig(prev => ({ ...prev, ...presetConfig.bar }));
    setAnimationConfig(prev => ({ ...prev, ...presetConfig.animation }));
  };

  const renderBar = (bar: BarState, label: string, color: string, icon: IconType) => {
    const IconComponent = ICON_MAP[icon];
    const fillPercent = getFillPercentage(bar);
    const damageFillPercent = getDamageFillPercentage(bar);

    // Calculate low health inline to avoid state-based re-render loops
    const barIsLow = (bar.current / bar.max) * 100 <= animationConfig.lowHealthThreshold;
    const isLow = barIsLow && animationConfig.enableFlash;

    return (
      <motion.div
        className="space-y-2"
        animate={isLow && animationConfig.enableShake ? {
          x: [0, -2, 2, -2, 2, 0],
        } : {}}
        transition={{
          repeat: isLow ? Infinity : 0,
          duration: animationConfig.flashSpeed,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {barConfig.showIcon && IconComponent && (
              <IconComponent className="h-4 w-4" style={{ color }} />
            )}
            <Label className="text-xs font-semibold">{label}</Label>
          </div>
          {barConfig.textDisplay !== "none" && (
            <span className="text-xs font-mono" style={{ color: barConfig.textColor }}>
              {barConfig.textDisplay === "percentage"
                ? `${Math.round(fillPercent)}%`
                : `${bar.current}/${bar.max}`}
            </span>
          )}
        </div>

        <div
          className="relative overflow-hidden"
          style={{
            width: `${barConfig.width}px`,
            height: `${barConfig.height}px`,
            backgroundColor: barConfig.backgroundColor,
            border: `${barConfig.borderWidth}px solid ${barConfig.borderColor}`,
            borderRadius: `${barConfig.borderRadius}px`,
          }}
        >
          {/* Damage bar (delayed) */}
          {animationConfig.enableDamageBar && bar.damageTaken > 0 && (
            <motion.div
              className="absolute inset-0"
              initial={{ width: `${damageFillPercent}%` }}
              animate={{ width: `${fillPercent}%` }}
              transition={{ duration: animationConfig.damageDelay }}
              style={{
                backgroundColor: "#ffffff",
                opacity: 0.5,
              }}
            />
          )}

          {/* Main fill */}
          <motion.div
            className="absolute inset-0"
            animate={{
              width: `${fillPercent}%`,
              opacity: isLow && animationConfig.enableFlash ? [1, 0.5, 1] : 1,
            }}
            transition={{
              width: { duration: animationConfig.fillSpeed },
              opacity: {
                repeat: isLow ? Infinity : 0,
                duration: animationConfig.flashSpeed,
              },
            }}
            style={{
              background: barConfig.fillType === "gradient"
                ? `linear-gradient(90deg, ${color}, ${barConfig.fillColorEnd || color})`
                : color,
            }}
          />

          {/* Segments overlay */}
          {barConfig.type === "segmented" && (
            <div className="absolute inset-0 flex">
              {Array.from({ length: barConfig.segmentCount }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1"
                  style={{
                    borderRight: i < barConfig.segmentCount - 1 ? `2px solid ${barConfig.borderColor}` : "none",
                  }}
                />
              ))}
            </div>
          )}

          {/* Text overlay */}
          {barConfig.textDisplay !== "none" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xs font-bold drop-shadow-md"
                style={{ color: barConfig.textColor }}
              >
                {barConfig.textDisplay === "percentage"
                  ? `${Math.round(fillPercent)}%`
                  : `${bar.current}/${bar.max}`}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => handleDamage(label.toLowerCase() as "hp" | "mp", 20)}
            disabled={isAnimating || bar.current === 0}
            className="h-7 flex-1 text-xs"
          >
            -20
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => handleHeal(label.toLowerCase() as "hp" | "mp", 20)}
            disabled={bar.current === bar.max}
            className="h-7 flex-1 text-xs"
          >
            +20
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleReset(label.toLowerCase() as "hp" | "mp")}
            className="h-7 px-2"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex h-full flex-col gap-3 p-4 @container">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-red-500" />
          <h3 className="text-sm font-semibold">Health Bar Designer</h3>
        </div>
        <Switch
          checked={showMultipleBars}
          onCheckedChange={setShowMultipleBars}
        />
      </div>

      <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="design">Design</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="flex-1 overflow-y-auto space-y-4 mt-3">
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            {renderBar(hpBar, "HP", barConfig.fillColor, barConfig.icon)}

            {showMultipleBars && (
              <>
                {renderBar(mpBar, "MP", "#3b82f6", "droplet")}
              </>
            )}
          </div>

          {/* Presets */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Preset Styles</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(PRESET_STYLES) as PresetStyle[]).map(preset => (
                <Button
                  key={preset}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="capitalize"
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Design Tab */}
        <TabsContent value="design" className="flex-1 overflow-y-auto space-y-4 mt-3">
          {/* Bar Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Bar Type</Label>
            <Select
              value={barConfig.type}
              onValueChange={(value: BarType) => setBarConfig(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="horizontal">Horizontal</SelectItem>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="segmented">Segmented</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Dimensions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs">Width: {barConfig.width}px</Label>
              <Slider
                value={[barConfig.width]}
                onValueChange={([value]) => setBarConfig(prev => ({ ...prev, width: value }))}
                min={50}
                max={400}
                step={10}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Height: {barConfig.height}px</Label>
              <Slider
                value={[barConfig.height]}
                onValueChange={([value]) => setBarConfig(prev => ({ ...prev, height: value }))}
                min={10}
                max={100}
                step={5}
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <Label className="text-xs">Border Radius: {barConfig.borderRadius}px</Label>
            <Slider
              value={[barConfig.borderRadius]}
              onValueChange={([value]) => setBarConfig(prev => ({ ...prev, borderRadius: value }))}
              min={0}
              max={50}
              step={1}
            />
          </div>

          {/* Fill Type */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Fill Type</Label>
            <Select
              value={barConfig.fillType}
              onValueChange={(value: FillType) => setBarConfig(prev => ({ ...prev, fillType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Solid</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Fill Color</Label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={barConfig.fillColor}
                  onChange={e => setBarConfig(prev => ({ ...prev, fillColor: e.target.value }))}
                  className="h-9 w-full cursor-pointer rounded border"
                />
                <span className="text-xs text-muted-foreground tabular-nums self-center">
                  {barConfig.fillColor.toUpperCase()}
                </span>
              </div>
            </div>

            {barConfig.fillType === "gradient" && (
              <div className="space-y-2">
                <Label className="text-xs">Gradient End</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={barConfig.fillColorEnd || barConfig.fillColor}
                    onChange={e => setBarConfig(prev => ({ ...prev, fillColorEnd: e.target.value }))}
                    className="h-9 w-full cursor-pointer rounded border"
                  />
                  <span className="text-xs text-muted-foreground tabular-nums self-center">
                    {(barConfig.fillColorEnd || barConfig.fillColor).toUpperCase()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs">Background</Label>
              <input
                type="color"
                value={barConfig.backgroundColor}
                onChange={e => setBarConfig(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="h-9 w-full cursor-pointer rounded border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Border Color</Label>
              <input
                type="color"
                value={barConfig.borderColor}
                onChange={e => setBarConfig(prev => ({ ...prev, borderColor: e.target.value }))}
                className="h-9 w-full cursor-pointer rounded border"
              />
            </div>
          </div>

          {/* Border Width */}
          <div className="space-y-2">
            <Label className="text-xs">Border Width: {barConfig.borderWidth}px</Label>
            <Slider
              value={[barConfig.borderWidth]}
              onValueChange={([value]) => setBarConfig(prev => ({ ...prev, borderWidth: value }))}
              min={0}
              max={10}
              step={1}
            />
          </div>

          {/* Segment Count */}
          {barConfig.type === "segmented" && (
            <div className="space-y-2">
              <Label className="text-xs">Segments: {barConfig.segmentCount}</Label>
              <Slider
                value={[barConfig.segmentCount]}
                onValueChange={([value]) => setBarConfig(prev => ({ ...prev, segmentCount: value }))}
                min={2}
                max={20}
                step={1}
              />
            </div>
          )}

          {/* Text Display */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Text Display</Label>
            <Select
              value={barConfig.textDisplay}
              onValueChange={(value: TextDisplay) => setBarConfig(prev => ({ ...prev, textDisplay: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current-max">Current / Max</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Icon */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Icon</Label>
            <Select
              value={barConfig.icon}
              onValueChange={(value: IconType) => setBarConfig(prev => ({ ...prev, icon: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heart">Heart</SelectItem>
                <SelectItem value="shield">Shield</SelectItem>
                <SelectItem value="zap">Zap</SelectItem>
                <SelectItem value="droplet">Droplet</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label className="text-xs">Show Icon</Label>
              <Switch
                checked={barConfig.showIcon}
                onCheckedChange={checked => setBarConfig(prev => ({ ...prev, showIcon: checked }))}
              />
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-xs font-semibold">Animation</Label>

            <div className="space-y-2">
              <Label className="text-xs">Fill Speed: {animationConfig.fillSpeed}s</Label>
              <Slider
                value={[animationConfig.fillSpeed]}
                onValueChange={([value]) => setAnimationConfig(prev => ({ ...prev, fillSpeed: value }))}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Flash Speed: {animationConfig.flashSpeed}s</Label>
              <Slider
                value={[animationConfig.flashSpeed]}
                onValueChange={([value]) => setAnimationConfig(prev => ({ ...prev, flashSpeed: value }))}
                min={0.1}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Damage Delay: {animationConfig.damageDelay}s</Label>
              <Slider
                value={[animationConfig.damageDelay]}
                onValueChange={([value]) => setAnimationConfig(prev => ({ ...prev, damageDelay: value }))}
                min={0}
                max={2}
                step={0.1}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Low Health: {animationConfig.lowHealthThreshold}%</Label>
              <Slider
                value={[animationConfig.lowHealthThreshold]}
                onValueChange={([value]) => setAnimationConfig(prev => ({ ...prev, lowHealthThreshold: value }))}
                min={0}
                max={50}
                step={5}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Damage Bar</Label>
                <Switch
                  checked={animationConfig.enableDamageBar}
                  onCheckedChange={checked => setAnimationConfig(prev => ({ ...prev, enableDamageBar: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Flash Warning</Label>
                <Switch
                  checked={animationConfig.enableFlash}
                  onCheckedChange={checked => setAnimationConfig(prev => ({ ...prev, enableFlash: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Shake Warning</Label>
                <Switch
                  checked={animationConfig.enableShake}
                  onCheckedChange={checked => setAnimationConfig(prev => ({ ...prev, enableShake: checked }))}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="flex-1 overflow-y-auto space-y-4 mt-3">
          {/* Export as CSS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">CSS</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("css")}
                className="h-7"
              >
                {copied === "css" ? (
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="rounded-lg border bg-muted p-3 text-[10px] overflow-x-auto">
              <code>{generateCSS}</code>
            </pre>
          </div>

          {/* Export as React */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">React Component</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("react")}
                className="h-7"
              >
                {copied === "react" ? (
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="rounded-lg border bg-muted p-3 text-[10px] overflow-x-auto max-h-[300px]">
              <code>{generateReactCode}</code>
            </pre>
          </div>

          {/* Export as JSON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">JSON Config</Label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopy("json")}
                className="h-7"
              >
                {copied === "json" ? (
                  <Check className="h-3 w-3 mr-1 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="rounded-lg border bg-muted p-3 text-[10px] overflow-x-auto">
              <code>{generateJSON}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
