"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Type, Copy, Check, Info } from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface TypographyScaleWidgetProps {
  widget: Widget;
}

interface ScaleRatio {
  name: string;
  value: number;
}

interface FontSize {
  name: string;
  pixels: number;
  rem: number;
  lineHeight: number;
}

// Typography scale ratios
const SCALE_RATIOS: ScaleRatio[] = [
  { name: "Minor Second", value: 1.067 },
  { name: "Major Second", value: 1.125 },
  { name: "Minor Third", value: 1.2 },
  { name: "Major Third", value: 1.25 },
  { name: "Perfect Fourth", value: 1.333 },
  { name: "Augmented Fourth", value: 1.414 },
  { name: "Perfect Fifth", value: 1.5 },
  { name: "Golden Ratio", value: 1.618 },
];

// Size labels matching common design systems
const SIZE_LABELS = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"];

// Calculate optimal line height based on font size
const calculateLineHeight = (fontSize: number): number => {
  // Larger fonts need tighter line height
  if (fontSize >= 48) return 1.0;
  if (fontSize >= 32) return 1.1;
  if (fontSize >= 24) return 1.2;
  if (fontSize >= 18) return 1.3;
  if (fontSize >= 14) return 1.5;
  return 1.6;
};

export function TypographyScaleWidget({ widget }: TypographyScaleWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config or use defaults
  const initialBaseSize = widget.config?.typographyBaseSize || 16;
  const initialRatio = widget.config?.typographyRatio || 1.25;
  const initialCustomRatio = widget.config?.typographyCustomRatio || 1.25;
  const initialSteps = widget.config?.typographySteps || 8;

  const [baseSize, setBaseSize] = useState<number>(initialBaseSize);
  const [ratio, setRatio] = useState<number>(initialRatio);
  const [customRatio, setCustomRatio] = useState<string>(initialCustomRatio.toString());
  const [steps, setSteps] = useState<number>(initialSteps);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Generate typography scale
  const typographyScale = useMemo<FontSize[]>(() => {
    const scale: FontSize[] = [];
    const actualRatio = ratio === 0 ? parseFloat(customRatio) || 1.25 : ratio;

    // Generate sizes below base (3 steps down)
    for (let i = 3; i > 0; i--) {
      const pixels = Math.round(baseSize / Math.pow(actualRatio, i));
      const rem = parseFloat((pixels / 16).toFixed(3));
      scale.push({
        name: SIZE_LABELS[3 - i] || `step-${3 - i}`,
        pixels,
        rem,
        lineHeight: calculateLineHeight(pixels),
      });
    }

    // Base size
    scale.push({
      name: "base",
      pixels: baseSize,
      rem: parseFloat((baseSize / 16).toFixed(3)),
      lineHeight: calculateLineHeight(baseSize),
    });

    // Generate sizes above base
    for (let i = 1; i < steps; i++) {
      const pixels = Math.round(baseSize * Math.pow(actualRatio, i));
      const rem = parseFloat((pixels / 16).toFixed(3));
      scale.push({
        name: SIZE_LABELS[3 + i] || `step-${3 + i}`,
        pixels,
        rem,
        lineHeight: calculateLineHeight(pixels),
      });
    }

    return scale;
  }, [baseSize, ratio, customRatio, steps]);

  // Save config
  const saveConfig = (updates: Record<string, unknown>) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...updates,
      },
    });
  };

  const handleBaseSizeChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 8 && num <= 32) {
      setBaseSize(num);
      saveConfig({ typographyBaseSize: num });
    }
  };

  const handleRatioChange = (value: string) => {
    const num = parseFloat(value);
    setRatio(num);
    saveConfig({ typographyRatio: num });
  };

  const handleCustomRatioChange = (value: string) => {
    setCustomRatio(value);
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 1 && num <= 3) {
      saveConfig({ typographyCustomRatio: num });
    }
  };

  const handleStepsChange = (value: string) => {
    const num = parseInt(value);
    if (!isNaN(num) && num >= 4 && num <= 10) {
      setSteps(num);
      saveConfig({ typographySteps: num });
    }
  };

  // Copy functions
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const generateCSSConfig = (): string => {
    return typographyScale
      .map((size) => {
        return `.text-${size.name} {\n  font-size: ${size.rem}rem;\n  line-height: ${size.lineHeight};\n}`;
      })
      .join("\n\n");
  };

  const generateTailwindConfig = (): string => {
    const sizeEntries = typographyScale
      .map((size) => `      '${size.name}': ['${size.rem}rem', { lineHeight: '${size.lineHeight}' }]`)
      .join(",\n");

    return `module.exports = {\n  theme: {\n    extend: {\n      fontSize: {\n${sizeEntries}\n      }\n    }\n  }\n}`;
  };

  const generateRemConfig = (): string => {
    return typographyScale
      .map((size) => `--font-${size.name}: ${size.rem}rem;`)
      .join("\n");
  };

  return (
    <div className="@container size-full overflow-auto">
      <div className="flex h-full flex-col gap-3 p-4 @sm:gap-4 @sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Type className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Typography Scale</h3>
            <p className="text-xs text-muted-foreground">Generate harmonious font sizes</p>
          </div>
        </div>

        {/* Controls */}
        <div className="grid gap-3 @sm:grid-cols-2">
          {/* Base Size */}
          <div className="space-y-1.5">
            <Label htmlFor={`base-size-${widget.id}`} className="text-xs font-medium">
              Base Size (px)
            </Label>
            <Input
              id={`base-size-${widget.id}`}
              type="number"
              min="8"
              max="32"
              value={baseSize}
              onChange={(e) => handleBaseSizeChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Scale Ratio */}
          <div className="space-y-1.5">
            <Label htmlFor={`ratio-${widget.id}`} className="text-xs font-medium">
              Scale Ratio
            </Label>
            <Select
              value={ratio.toString()}
              onValueChange={handleRatioChange}
            >
              <SelectTrigger id={`ratio-${widget.id}`} className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCALE_RATIOS.map((r) => (
                  <SelectItem key={r.value} value={r.value.toString()}>
                    {r.name} ({r.value})
                  </SelectItem>
                ))}
                <SelectItem value="0">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Ratio (only visible when Custom is selected) */}
          {ratio === 0 && (
            <div className="space-y-1.5 @sm:col-span-2">
              <Label htmlFor={`custom-ratio-${widget.id}`} className="text-xs font-medium">
                Custom Ratio
              </Label>
              <Input
                id={`custom-ratio-${widget.id}`}
                type="number"
                min="1"
                max="3"
                step="0.001"
                value={customRatio}
                onChange={(e) => handleCustomRatioChange(e.target.value)}
                className="h-9 text-sm"
                placeholder="1.250"
              />
            </div>
          )}

          {/* Steps */}
          <div className="space-y-1.5 @sm:col-span-2">
            <Label htmlFor={`steps-${widget.id}`} className="text-xs font-medium">
              Steps Above Base
            </Label>
            <Input
              id={`steps-${widget.id}`}
              type="number"
              min="4"
              max="10"
              value={steps}
              onChange={(e) => handleStepsChange(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Base size: <span className="font-mono font-medium">{baseSize}px</span> |
            Ratio: <span className="font-mono font-medium">
              {ratio === 0 ? customRatio : ratio}
            </span> |
            Total sizes: <span className="font-medium">{typographyScale.length}</span>
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="preview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preview" className="text-xs">
              Preview
            </TabsTrigger>
            <TabsTrigger value="export" className="text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          {/* Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto space-y-1 mt-3">
            <AnimatePresence mode="popLayout">
              {typographyScale.map((size, index) => (
                <motion.div
                  key={size.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className="group relative flex items-center gap-3 rounded-lg border border-border bg-card p-3 hover:bg-accent/50 transition-colors"
                >
                  {/* Size Preview */}
                  <div className="flex-1 min-w-0">
                    <motion.p
                      className="truncate font-medium text-foreground transition-all"
                      style={{
                        fontSize: `${Math.min(size.pixels, 32)}px`,
                        lineHeight: size.lineHeight,
                      }}
                    >
                      Typography
                    </motion.p>
                  </div>

                  {/* Size Info */}
                  <div className="flex shrink-0 flex-col items-end gap-0.5">
                    <span className="text-xs font-mono font-medium text-foreground">
                      {size.name}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {size.pixels}px / {size.rem}rem
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      LH: {size.lineHeight}
                    </span>
                  </div>

                  {/* Copy Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      copyToClipboard(
                        `font-size: ${size.rem}rem;\nline-height: ${size.lineHeight};`,
                        size.name
                      )
                    }
                    className={cn(
                      "h-8 w-8 p-0 opacity-0 transition-opacity group-hover:opacity-100",
                      copiedItem === size.name && "opacity-100"
                    )}
                  >
                    {copiedItem === size.name ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-3 mt-3">
            {/* CSS Export */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">CSS Classes</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generateCSSConfig(), "css")}
                  className="h-7 text-xs"
                >
                  {copiedItem === "css" ? (
                    <>
                      <Check className="mr-1.5 h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3 w-3" />
                      Copy CSS
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
                <code className="text-muted-foreground">{generateCSSConfig()}</code>
              </pre>
            </div>

            {/* Tailwind Config Export */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Tailwind Config</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generateTailwindConfig(), "tailwind")}
                  className="h-7 text-xs"
                >
                  {copiedItem === "tailwind" ? (
                    <>
                      <Check className="mr-1.5 h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3 w-3" />
                      Copy Config
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
                <code className="text-muted-foreground">{generateTailwindConfig()}</code>
              </pre>
            </div>

            {/* CSS Variables Export */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">CSS Variables</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(generateRemConfig(), "vars")}
                  className="h-7 text-xs"
                >
                  {copiedItem === "vars" ? (
                    <>
                      <Check className="mr-1.5 h-3 w-3 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3 w-3" />
                      Copy Vars
                    </>
                  )}
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs font-mono">
                <code className="text-muted-foreground">{generateRemConfig()}</code>
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
