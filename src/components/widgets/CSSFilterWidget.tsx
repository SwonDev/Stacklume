"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  Image as ImageIcon,
  Copy,
  Check,
  RotateCcw,
  Sliders,
  Eye,
  EyeOff,
  MoveHorizontal,
} from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CSSFilterWidgetProps {
  widget: Widget;
}

interface FilterValues {
  blur: number;
  brightness: number;
  contrast: number;
  grayscale: number;
  hueRotate: number;
  invert: number;
  opacity: number;
  saturate: number;
  sepia: number;
  dropShadowX: number;
  dropShadowY: number;
  dropShadowBlur: number;
  dropShadowColor: string;
}

interface FilterPreset {
  name: string;
  values: FilterValues;
}

const DEFAULT_FILTERS: FilterValues = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  opacity: 100,
  saturate: 100,
  sepia: 0,
  dropShadowX: 0,
  dropShadowY: 0,
  dropShadowBlur: 0,
  dropShadowColor: "#000000",
};

const FILTER_PRESETS: FilterPreset[] = [
  {
    name: "Vintage",
    values: {
      ...DEFAULT_FILTERS,
      brightness: 110,
      contrast: 90,
      saturate: 130,
      sepia: 30,
      hueRotate: 350,
    },
  },
  {
    name: "Noir",
    values: {
      ...DEFAULT_FILTERS,
      grayscale: 100,
      contrast: 150,
      brightness: 90,
    },
  },
  {
    name: "Warm",
    values: {
      ...DEFAULT_FILTERS,
      brightness: 110,
      saturate: 120,
      hueRotate: 15,
      sepia: 10,
    },
  },
  {
    name: "Cool",
    values: {
      ...DEFAULT_FILTERS,
      brightness: 105,
      saturate: 110,
      hueRotate: 200,
    },
  },
  {
    name: "High Contrast",
    values: {
      ...DEFAULT_FILTERS,
      contrast: 180,
      brightness: 95,
      saturate: 120,
    },
  },
  {
    name: "Faded",
    values: {
      ...DEFAULT_FILTERS,
      brightness: 115,
      contrast: 85,
      saturate: 70,
      opacity: 85,
    },
  },
  {
    name: "Dramatic",
    values: {
      ...DEFAULT_FILTERS,
      contrast: 200,
      saturate: 140,
      brightness: 80,
      dropShadowX: 4,
      dropShadowY: 4,
      dropShadowBlur: 8,
      dropShadowColor: "#000000",
    },
  },
  {
    name: "Glow",
    values: {
      ...DEFAULT_FILTERS,
      brightness: 120,
      saturate: 150,
      blur: 1,
      dropShadowX: 0,
      dropShadowY: 0,
      dropShadowBlur: 15,
      dropShadowColor: "#ffffff",
    },
  },
  {
    name: "Inverted",
    values: {
      ...DEFAULT_FILTERS,
      invert: 100,
      hueRotate: 180,
    },
  },
  {
    name: "Sepia Dream",
    values: {
      ...DEFAULT_FILTERS,
      sepia: 80,
      brightness: 110,
      contrast: 90,
    },
  },
];

const DEFAULT_IMAGE_URL = "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80";

export function CSSFilterWidget({ widget }: CSSFilterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Initialize from widget config
  const [filters, setFilters] = useState<FilterValues>(() => {
    const saved = widget.config?.cssFilters as FilterValues | undefined;
    return saved?.blur !== undefined ? saved : DEFAULT_FILTERS;
  });

  const [imageUrl, setImageUrl] = useState<string>(() => {
    return (widget.config?.cssFilterImageUrl as string) || DEFAULT_IMAGE_URL;
  });

  const [tempImageUrl, setTempImageUrl] = useState(imageUrl);
  const [copied, setCopied] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const compareRef = useRef<HTMLDivElement>(null);

  // Generate CSS filter string
  const filterCSS = useMemo(() => {
    const parts: string[] = [];

    if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
    if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
    if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale}%)`);
    if (filters.hueRotate !== 0) parts.push(`hue-rotate(${filters.hueRotate}deg)`);
    if (filters.invert > 0) parts.push(`invert(${filters.invert}%)`);
    if (filters.opacity !== 100) parts.push(`opacity(${filters.opacity}%)`);
    if (filters.saturate !== 100) parts.push(`saturate(${filters.saturate}%)`);
    if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`);
    if (filters.dropShadowBlur > 0) {
      parts.push(
        `drop-shadow(${filters.dropShadowX}px ${filters.dropShadowY}px ${filters.dropShadowBlur}px ${filters.dropShadowColor})`
      );
    }

    return parts.length > 0 ? parts.join(" ") : "none";
  }, [filters]);

  // Save config to store (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          cssFilters: filters,
          cssFilterImageUrl: imageUrl,
        },
      });
    }, 300);
    return () => clearTimeout(timeoutId);
     
  }, [filters, imageUrl, widget.id]);

  const handleCopyCSS = async () => {
    try {
      await navigator.clipboard.writeText(`filter: ${filterCSS};`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy CSS:", error);
    }
  };

  const handleResetAll = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleResetFilter = (filterName: keyof FilterValues) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: DEFAULT_FILTERS[filterName],
    }));
  };

  const updateFilter = (updates: Partial<FilterValues>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  const applyPreset = (preset: FilterPreset) => {
    setFilters(preset.values);
  };

  const handleImageUrlChange = () => {
    if (tempImageUrl.trim()) {
      setImageUrl(tempImageUrl.trim());
    }
  };

  // Comparison slider handlers
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !compareRef.current) return;

    const rect = compareRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setComparePosition(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      window.addEventListener("mouseup", handleGlobalMouseUp);
      return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
    }
  }, [isDragging]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <Sliders className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              CSS Filter Generator
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComparison(!showComparison)}
              className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
              title={showComparison ? "Hide comparison" : "Show comparison"}
            >
              {showComparison ? (
                <EyeOff className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              ) : (
                <Eye className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetAll}
              className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Image URL Input */}
        <div className="flex items-center gap-2">
          <Input
            value={tempImageUrl}
            onChange={(e) => setTempImageUrl(e.target.value)}
            onBlur={handleImageUrlChange}
            onKeyDown={(e) => e.key === "Enter" && handleImageUrlChange()}
            placeholder="Enter image URL..."
            className="h-7 @sm:h-8 text-[10px] @sm:text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleImageUrlChange}
            className="h-7 @sm:h-8 px-2 text-[10px] @sm:text-xs shrink-0"
          >
            <ImageIcon className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
          </Button>
        </div>

        {/* Live Preview */}
        {showComparison ? (
          <div
            ref={compareRef}
            className="relative w-full aspect-[16/10] @md:aspect-[16/9] rounded-lg border border-border overflow-hidden cursor-ew-resize select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {/* Filtered Image */}
            <div className="absolute inset-0">
              <img
                src={imageUrl}
                alt="Filtered"
                className="w-full h-full object-cover"
                style={{ filter: filterCSS }}
                draggable={false}
              />
            </div>

            {/* Original Image (clipped) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - comparePosition}% 0 0)` }}
            >
              <img
                src={imageUrl}
                alt="Original"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>

            {/* Slider Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize"
              style={{ left: `${comparePosition}%` }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                <MoveHorizontal className="w-4 h-4 text-gray-700" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
              <span className="text-[10px] @sm:text-xs font-medium text-white">Original</span>
            </div>
            <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/60 backdrop-blur-sm">
              <span className="text-[10px] @sm:text-xs font-medium text-white">Filtered</span>
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="relative w-full aspect-[16/10] @md:aspect-[16/9] rounded-lg border border-border overflow-hidden"
          >
            <img
              src={imageUrl}
              alt="Preview"
              className="w-full h-full object-cover"
              style={{ filter: filterCSS }}
            />
          </motion.div>
        )}

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-7 @sm:h-8">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-2.5 mt-2">
            {/* Blur */}
            <FilterControl
              label="Blur"
              value={filters.blur}
              onChange={(value) => updateFilter({ blur: value })}
              onReset={() => handleResetFilter("blur")}
              min={0}
              max={20}
              step={0.5}
              unit="px"
            />

            {/* Brightness */}
            <FilterControl
              label="Brightness"
              value={filters.brightness}
              onChange={(value) => updateFilter({ brightness: value })}
              onReset={() => handleResetFilter("brightness")}
              min={0}
              max={200}
              step={1}
              unit="%"
            />

            {/* Contrast */}
            <FilterControl
              label="Contrast"
              value={filters.contrast}
              onChange={(value) => updateFilter({ contrast: value })}
              onReset={() => handleResetFilter("contrast")}
              min={0}
              max={200}
              step={1}
              unit="%"
            />

            {/* Grayscale */}
            <FilterControl
              label="Grayscale"
              value={filters.grayscale}
              onChange={(value) => updateFilter({ grayscale: value })}
              onReset={() => handleResetFilter("grayscale")}
              min={0}
              max={100}
              step={1}
              unit="%"
            />

            {/* Hue Rotate */}
            <FilterControl
              label="Hue Rotate"
              value={filters.hueRotate}
              onChange={(value) => updateFilter({ hueRotate: value })}
              onReset={() => handleResetFilter("hueRotate")}
              min={0}
              max={360}
              step={1}
              unit="deg"
            />

            {/* Invert */}
            <FilterControl
              label="Invert"
              value={filters.invert}
              onChange={(value) => updateFilter({ invert: value })}
              onReset={() => handleResetFilter("invert")}
              min={0}
              max={100}
              step={1}
              unit="%"
            />

            {/* Opacity */}
            <FilterControl
              label="Opacity"
              value={filters.opacity}
              onChange={(value) => updateFilter({ opacity: value })}
              onReset={() => handleResetFilter("opacity")}
              min={0}
              max={100}
              step={1}
              unit="%"
            />

            {/* Saturate */}
            <FilterControl
              label="Saturate"
              value={filters.saturate}
              onChange={(value) => updateFilter({ saturate: value })}
              onReset={() => handleResetFilter("saturate")}
              min={0}
              max={200}
              step={1}
              unit="%"
            />

            {/* Sepia */}
            <FilterControl
              label="Sepia"
              value={filters.sepia}
              onChange={(value) => updateFilter({ sepia: value })}
              onReset={() => handleResetFilter("sepia")}
              min={0}
              max={100}
              step={1}
              unit="%"
            />

            {/* Drop Shadow */}
            <div className="pt-2 border-t border-border space-y-2">
              <Label className="text-[10px] @sm:text-xs font-medium">Drop Shadow</Label>

              <FilterControl
                label="X Offset"
                value={filters.dropShadowX}
                onChange={(value) => updateFilter({ dropShadowX: value })}
                onReset={() => handleResetFilter("dropShadowX")}
                min={-20}
                max={20}
                step={1}
                unit="px"
              />

              <FilterControl
                label="Y Offset"
                value={filters.dropShadowY}
                onChange={(value) => updateFilter({ dropShadowY: value })}
                onReset={() => handleResetFilter("dropShadowY")}
                min={-20}
                max={20}
                step={1}
                unit="px"
              />

              <FilterControl
                label="Blur"
                value={filters.dropShadowBlur}
                onChange={(value) => updateFilter({ dropShadowBlur: value })}
                onReset={() => handleResetFilter("dropShadowBlur")}
                min={0}
                max={30}
                step={1}
                unit="px"
              />

              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">Color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={filters.dropShadowColor}
                    onChange={(e) => updateFilter({ dropShadowColor: e.target.value })}
                    className="w-8 h-8 @sm:w-9 @sm:h-9 rounded border border-border cursor-pointer"
                  />
                  <span className="text-[10px] @sm:text-xs font-mono text-muted-foreground">
                    {filters.dropShadowColor.toUpperCase()}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetFilter("dropShadowColor")}
                    className="h-6 w-6 p-0 ml-auto"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2">
            <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
              {FILTER_PRESETS.map((preset) => {
                const presetFilterCSS = (() => {
                  const parts: string[] = [];
                  if (preset.values.blur > 0) parts.push(`blur(${preset.values.blur}px)`);
                  if (preset.values.brightness !== 100)
                    parts.push(`brightness(${preset.values.brightness}%)`);
                  if (preset.values.contrast !== 100) parts.push(`contrast(${preset.values.contrast}%)`);
                  if (preset.values.grayscale > 0) parts.push(`grayscale(${preset.values.grayscale}%)`);
                  if (preset.values.hueRotate !== 0) parts.push(`hue-rotate(${preset.values.hueRotate}deg)`);
                  if (preset.values.invert > 0) parts.push(`invert(${preset.values.invert}%)`);
                  if (preset.values.opacity !== 100) parts.push(`opacity(${preset.values.opacity}%)`);
                  if (preset.values.saturate !== 100) parts.push(`saturate(${preset.values.saturate}%)`);
                  if (preset.values.sepia > 0) parts.push(`sepia(${preset.values.sepia}%)`);
                  if (preset.values.dropShadowBlur > 0) {
                    parts.push(
                      `drop-shadow(${preset.values.dropShadowX}px ${preset.values.dropShadowY}px ${preset.values.dropShadowBlur}px ${preset.values.dropShadowColor})`
                    );
                  }
                  return parts.length > 0 ? parts.join(" ") : "none";
                })();

                return (
                  <motion.button
                    key={preset.name}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => applyPreset(preset)}
                    className="relative aspect-[4/3] rounded-lg border border-border overflow-hidden group cursor-pointer"
                  >
                    <img
                      src={imageUrl}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                      style={{ filter: presetFilterCSS }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] @sm:text-xs font-medium text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center px-2">
                        {preset.name}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* CSS Output & Copy Button */}
        <div className="space-y-2">
          <Label className="text-[10px] @sm:text-xs font-medium">CSS Output</Label>
          <div className="flex items-start gap-2">
            <code className="flex-1 rounded-md border bg-muted px-2 @sm:px-3 py-1.5 @sm:py-2 text-[9px] @sm:text-[10px] @md:text-xs overflow-x-auto">
              filter: {filterCSS};
            </code>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCSS}
              className="h-7 @sm:h-8 w-7 @sm:w-8 p-0 shrink-0"
              title="Copy CSS"
            >
              {copied ? (
                <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Control Component
interface FilterControlProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onReset: () => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}

function FilterControl({
  label,
  value,
  onChange,
  onReset,
  min,
  max,
  step,
  unit,
}: FilterControlProps) {
  const isDefault =
    value ===
    (label === "Brightness" ||
    label === "Contrast" ||
    label === "Opacity" ||
    label === "Saturate"
      ? 100
      : 0);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] @sm:text-xs">{label}</Label>
        <div className="flex items-center gap-1">
          <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono tabular-nums">
            {value.toFixed(step < 1 ? 1 : 0)}
            {unit}
          </span>
          {!isDefault && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-5 w-5 p-0"
              title={`Reset ${label}`}
            >
              <RotateCcw className="w-2.5 h-2.5" />
            </Button>
          )}
        </div>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} />
    </div>
  );
}
