"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Ruler, Copy, Check, Download, RefreshCw } from "lucide-react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface SpacingCalculatorWidgetProps {
  widget: Widget;
}

interface SpacingValue {
  multiplier: number;
  px: number;
  rem: number;
  tailwind: string;
  useCase: string;
}

// Tailwind spacing scale multipliers
const TAILWIND_MULTIPLIERS = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 40, 48, 56, 64];

// Common use cases for each spacing size
const USE_CASES: Record<number, string> = {
  0: "No spacing",
  1: "Tight gaps",
  2: "Component padding",
  3: "Small margins",
  4: "Base spacing",
  5: "Medium padding",
  6: "Card padding",
  8: "Section padding",
  10: "Large gaps",
  12: "Container padding",
  14: "Section spacing",
  16: "Page margins",
  20: "Large sections",
  24: "Hero padding",
  28: "Extra spacing",
  32: "Layout gaps",
  40: "Major sections",
  48: "Hero sections",
  56: "Large layouts",
  64: "Max spacing",
};

export function SpacingCalculatorWidget({ widget }: SpacingCalculatorWidgetProps) {
  const { updateWidget } = useWidgetStore();

  // Load config
  const baseUnit = widget.config?.spacingBaseUnit ?? 4;
  const use8pxBase = widget.config?.spacingUse8pxBase ?? false;
  const customMultiplier = widget.config?.spacingCustomMultiplier ?? 1;

  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<"css" | "tailwind">("css");

  // Calculate spacing scale
  const calculateSpacing = useCallback(
    (multiplier: number): SpacingValue => {
      const px = baseUnit * multiplier;
      const rem = px / 16;
      const tailwind = `spacing-${multiplier}`;

      return {
        multiplier,
        px,
        rem: Math.round(rem * 10000) / 10000, // Round to 4 decimals
        tailwind,
        useCase: USE_CASES[multiplier] || "Custom spacing",
      };
    },
    [baseUnit]
  );

  const spacingScale = TAILWIND_MULTIPLIERS.map(calculateSpacing);
  const customSpacing = calculateSpacing(customMultiplier);

  // Toggle between 4px and 8px base
  const toggleBaseSystem = () => {
    const newBase = use8pxBase ? 4 : 8;
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        spacingUse8pxBase: !use8pxBase,
        spacingBaseUnit: newBase,
      },
    });
  };

  // Update base unit manually
  const updateBaseUnit = (value: number) => {
    if (value > 0 && value <= 32) {
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          spacingBaseUnit: value,
          spacingUse8pxBase: value === 8,
        },
      });
    }
  };

  // Update custom multiplier
  const updateCustomMultiplier = (value: number) => {
    if (value >= 0 && value <= 128) {
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          spacingCustomMultiplier: value,
        },
      });
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedValue(id);
      setTimeout(() => setCopiedValue(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Export as CSS custom properties
  const exportAsCSS = () => {
    const cssVariables = spacingScale
      .map(
        (s) =>
          `  --spacing-${s.multiplier}: ${s.rem}rem; /* ${s.px}px - ${s.useCase} */`
      )
      .join("\n");

    const css = `:root {\n${cssVariables}\n}`;
    copyToClipboard(css, "css-export");
  };

  // Export as Tailwind config
  const exportAsTailwind = () => {
    const spacingConfig = spacingScale
      .map(
        (s) =>
          `    '${s.multiplier}': '${s.rem}rem', // ${s.px}px - ${s.useCase}`
      )
      .join("\n");

    const config = `// Tailwind spacing config\nmodule.exports = {\n  theme: {\n    extend: {\n      spacing: {\n${spacingConfig}\n      },\n    },\n  },\n};`;
    copyToClipboard(config, "tailwind-export");
  };

  // Get color based on spacing size
  const getSpacingColor = (multiplier: number) => {
    if (multiplier === 0) return "bg-zinc-500";
    if (multiplier <= 2) return "bg-blue-500";
    if (multiplier <= 4) return "bg-cyan-500";
    if (multiplier <= 8) return "bg-green-500";
    if (multiplier <= 16) return "bg-yellow-500";
    if (multiplier <= 32) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="@container size-full">
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col gap-3 p-4 @sm:gap-4 @sm:p-6">
          {/* Header Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Ruler className="size-4 text-muted-foreground @sm:size-5" />
                <span className="text-sm font-medium @sm:text-base">
                  Base Unit: {baseUnit}px / {(baseUnit / 16).toFixed(3)}rem
                </span>
              </div>
              <Button
                onClick={toggleBaseSystem}
                size="sm"
                variant="outline"
                className="h-8 @sm:h-9"
              >
                <RefreshCw className="size-3 @sm:mr-2" />
                <span className="hidden @sm:inline">
                  {use8pxBase ? "4px" : "8px"} Base
                </span>
              </Button>
            </div>

            {/* Custom Base Unit Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`base-${widget.id}`} className="text-xs">
                  Custom Base (px)
                </Label>
                <Input
                  id={`base-${widget.id}`}
                  type="number"
                  min="1"
                  max="32"
                  value={baseUnit}
                  onChange={(e) =>
                    updateBaseUnit(parseInt(e.target.value) || 4)
                  }
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`multiplier-${widget.id}`} className="text-xs">
                  Custom Multiplier
                </Label>
                <Input
                  id={`multiplier-${widget.id}`}
                  type="number"
                  min="0"
                  max="128"
                  value={customMultiplier}
                  onChange={(e) =>
                    updateCustomMultiplier(parseFloat(e.target.value) || 1)
                  }
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Custom Multiplier Result */}
            {customMultiplier > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-primary/20 bg-primary/5 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium">
                      {customSpacing.multiplier}× = {customSpacing.px}px /{" "}
                      {customSpacing.rem}rem
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {customSpacing.useCase}
                    </div>
                  </div>
                  <Button
                    onClick={() =>
                      copyToClipboard(
                        `${customSpacing.px}px / ${customSpacing.rem}rem`,
                        `custom-${customMultiplier}`
                      )
                    }
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    {copiedValue === `custom-${customMultiplier}` ? (
                      <Check className="size-4 text-green-500" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={exportAsCSS}
              size="sm"
              variant="outline"
              className="h-8 flex-1 @sm:flex-none"
            >
              <Download className="size-3 @sm:mr-2" />
              <span className="hidden @sm:inline">Export CSS</span>
              <span className="@sm:hidden">CSS</span>
            </Button>
            <Button
              onClick={exportAsTailwind}
              size="sm"
              variant="outline"
              className="h-8 flex-1 @sm:flex-none"
            >
              <Download className="size-3 @sm:mr-2" />
              <span className="hidden @sm:inline">Export Tailwind</span>
              <span className="@sm:hidden">Tailwind</span>
            </Button>
            {(copiedValue === "css-export" ||
              copiedValue === "tailwind-export") && (
              <motion.span
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1 text-xs text-green-500"
              >
                <Check className="size-3" />
                Copied!
              </motion.span>
            )}
          </div>

          {/* Spacing Scale */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Spacing Scale</Label>
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {spacingScale.map((spacing, index) => (
                  <motion.div
                    key={spacing.multiplier}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="group relative overflow-hidden rounded-lg border border-border bg-secondary/30 p-2.5 @sm:p-3 transition-all hover:border-border/80 hover:bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      {/* Visual Bar */}
                      <div className="relative h-8 flex-1 overflow-hidden rounded border border-border/50 bg-secondary @sm:h-10">
                        <motion.div
                          className={cn(
                            "h-full rounded transition-all",
                            getSpacingColor(spacing.multiplier)
                          )}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.min((spacing.px / 256) * 100, 100)}%`,
                          }}
                          transition={{ duration: 0.5, delay: index * 0.03 }}
                        />
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-xs font-medium text-foreground mix-blend-difference @sm:text-sm">
                            {spacing.multiplier}
                          </span>
                        </div>
                      </div>

                      {/* Values */}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <div className="flex items-baseline gap-2 text-xs font-medium">
                          <span className="font-mono">{spacing.px}px</span>
                          <span className="font-mono text-muted-foreground">
                            {spacing.rem}rem
                          </span>
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {spacing.useCase}
                        </div>
                      </div>

                      {/* Copy Buttons */}
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          onClick={() =>
                            copyToClipboard(
                              `${spacing.px}px`,
                              `px-${spacing.multiplier}`
                            )
                          }
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Copy px value"
                        >
                          {copiedValue === `px-${spacing.multiplier}` ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <span className="text-xs">px</span>
                          )}
                        </Button>
                        <Button
                          onClick={() =>
                            copyToClipboard(
                              `${spacing.rem}rem`,
                              `rem-${spacing.multiplier}`
                            )
                          }
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Copy rem value"
                        >
                          {copiedValue === `rem-${spacing.multiplier}` ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <span className="text-xs">rem</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* Tailwind Class Reference */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Tailwind Classes</Label>
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
              <div className="space-y-1.5 font-mono text-xs">
                <div className="text-muted-foreground">
                  p-{"{"}n{"}"} - padding
                </div>
                <div className="text-muted-foreground">
                  m-{"{"}n{"}"} - margin
                </div>
                <div className="text-muted-foreground">
                  gap-{"{"}n{"}"} - gap
                </div>
                <div className="text-muted-foreground">
                  space-{"{"}x|y{"}"}-{"{"}n{"}"} - space between
                </div>
                <div className="mt-2 text-xs text-muted-foreground/70">
                  Where n = {TAILWIND_MULTIPLIERS.join(", ")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
