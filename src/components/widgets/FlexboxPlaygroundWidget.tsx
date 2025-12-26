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
import { LayoutGrid, Copy, Check, RotateCcw, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FlexboxPlaygroundWidgetProps {
  widget: Widget;
}

type FlexDirection = "row" | "row-reverse" | "column" | "column-reverse";
type JustifyContent =
  | "flex-start"
  | "flex-end"
  | "center"
  | "space-between"
  | "space-around"
  | "space-evenly";
type AlignItems = "flex-start" | "flex-end" | "center" | "stretch" | "baseline";
type FlexWrap = "nowrap" | "wrap" | "wrap-reverse";

interface FlexboxConfig {
  flexDirection: FlexDirection;
  justifyContent: JustifyContent;
  alignItems: AlignItems;
  flexWrap: FlexWrap;
  gap: number;
  itemCount: number;
}

interface FlexboxPreset {
  name: string;
  config: FlexboxConfig;
}

const DEFAULT_CONFIG: FlexboxConfig = {
  flexDirection: "row",
  justifyContent: "flex-start",
  alignItems: "stretch",
  flexWrap: "nowrap",
  gap: 8,
  itemCount: 4,
};

const PRESETS: FlexboxPreset[] = [
  {
    name: "Centered",
    config: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 16,
      itemCount: 3,
    },
  },
  {
    name: "Sidebar Layout",
    config: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "stretch",
      flexWrap: "nowrap",
      gap: 0,
      itemCount: 2,
    },
  },
  {
    name: "Navbar",
    config: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 12,
      itemCount: 3,
    },
  },
  {
    name: "Card Grid",
    config: {
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "flex-start",
      flexWrap: "wrap",
      gap: 16,
      itemCount: 6,
    },
  },
  {
    name: "Footer",
    config: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
      itemCount: 4,
    },
  },
  {
    name: "Column Stack",
    config: {
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      flexWrap: "nowrap",
      gap: 12,
      itemCount: 4,
    },
  },
  {
    name: "Vertical Center",
    config: {
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 8,
      itemCount: 3,
    },
  },
  {
    name: "Space Evenly",
    config: {
      flexDirection: "row",
      justifyContent: "space-evenly",
      alignItems: "center",
      flexWrap: "nowrap",
      gap: 0,
      itemCount: 5,
    },
  },
];

// Generate distinct colors for flex items
const ITEM_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F59E0B", // amber
  "#10B981", // green
  "#06B6D4", // cyan
];

export function FlexboxPlaygroundWidget({ widget }: FlexboxPlaygroundWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config or use defaults
  const initialConfig = widget.config?.flexboxConfig || DEFAULT_CONFIG;

  const [config, setConfig] = useState<FlexboxConfig>(initialConfig);
  const [copied, setCopied] = useState(false);

  // Generate CSS string
  const cssCode = useMemo(() => {
    return `.container {
  display: flex;
  flex-direction: ${config.flexDirection};
  justify-content: ${config.justifyContent};
  align-items: ${config.alignItems};
  flex-wrap: ${config.flexWrap};
  gap: ${config.gap}px;
}`;
  }, [config]);

  // Save config to widget store
  const saveConfig = (newConfig: FlexboxConfig) => {
    updateWidget(widget.id, {
      config: {
        flexboxConfig: newConfig,
      },
    });
  };

  const updateConfig = (updates: Partial<FlexboxConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    saveConfig(newConfig);
  };

  const handleCopyCSS = async () => {
    await navigator.clipboard.writeText(cssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
    saveConfig(DEFAULT_CONFIG);
  };

  const applyPreset = (preset: FlexboxPreset) => {
    setConfig(preset.config);
    saveConfig(preset.config);
  };

  const incrementItemCount = () => {
    if (config.itemCount < 6) {
      updateConfig({ itemCount: config.itemCount + 1 });
    }
  };

  const decrementItemCount = () => {
    if (config.itemCount > 3) {
      updateConfig({ itemCount: config.itemCount - 1 });
    }
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3 @md:gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <LayoutGrid className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              Flexbox Playground
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleReset}
            className="h-6 w-6 @sm:h-7 @sm:w-7"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
          </Button>
        </div>

        {/* Live Preview */}
        <div className="relative w-full border border-border rounded-lg overflow-hidden bg-muted/30 p-3 @sm:p-4 @md:p-6">
          <motion.div
            layout
            className="w-full min-h-[120px] @sm:min-h-[140px] @md:min-h-[160px] border-2 border-dashed border-primary/30 rounded-md p-2 @sm:p-3"
            style={{
              display: "flex",
              flexDirection: config.flexDirection,
              justifyContent: config.justifyContent,
              alignItems: config.alignItems,
              flexWrap: config.flexWrap,
              gap: `${config.gap}px`,
            }}
          >
            <AnimatePresence mode="popLayout">
              {Array.from({ length: config.itemCount }).map((_, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center rounded font-semibold text-white shadow-sm"
                  style={{
                    backgroundColor: ITEM_COLORS[index % ITEM_COLORS.length],
                    width: config.flexWrap === "wrap" ? "80px" : "auto",
                    minWidth: config.flexWrap === "nowrap" ? "60px" : "80px",
                    height: "60px",
                    flex: config.flexWrap === "nowrap" ? "1 1 0%" : "0 0 auto",
                  }}
                >
                  <span className="text-[10px] @sm:text-xs @md:text-sm">{index + 1}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
          <div className="absolute top-1 right-1 @sm:top-2 @sm:right-2 px-1.5 @sm:px-2 py-0.5 @sm:py-1 rounded bg-background/80 backdrop-blur-sm border border-border">
            <span className="text-[8px] @sm:text-[9px] @md:text-[10px] font-mono text-muted-foreground">
              Container
            </span>
          </div>
        </div>

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs @md:text-sm">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
            <TabsTrigger value="code" className="text-[10px] @sm:text-xs @md:text-sm">
              CSS
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="controls"
            className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 @md:space-y-4 mt-2 @sm:mt-3"
          >
            {/* Item Count */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Items ({config.itemCount})</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={decrementItemCount}
                  disabled={config.itemCount <= 3}
                  className="h-7 w-7 @sm:h-8 @sm:w-8"
                >
                  <Minus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                </Button>
                <div className="flex-1 text-center text-xs @sm:text-sm font-semibold">
                  {config.itemCount} items
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={incrementItemCount}
                  disabled={config.itemCount >= 6}
                  className="h-7 w-7 @sm:h-8 @sm:w-8"
                >
                  <Plus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                </Button>
              </div>
            </div>

            {/* Flex Direction */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">flex-direction</Label>
              <Select
                value={config.flexDirection}
                onValueChange={(value) => updateConfig({ flexDirection: value as FlexDirection })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="row">row</SelectItem>
                  <SelectItem value="row-reverse">row-reverse</SelectItem>
                  <SelectItem value="column">column</SelectItem>
                  <SelectItem value="column-reverse">column-reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Justify Content */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">justify-content</Label>
              <Select
                value={config.justifyContent}
                onValueChange={(value) => updateConfig({ justifyContent: value as JustifyContent })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex-start">flex-start</SelectItem>
                  <SelectItem value="flex-end">flex-end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="space-between">space-between</SelectItem>
                  <SelectItem value="space-around">space-around</SelectItem>
                  <SelectItem value="space-evenly">space-evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Align Items */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">align-items</Label>
              <Select
                value={config.alignItems}
                onValueChange={(value) => updateConfig({ alignItems: value as AlignItems })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flex-start">flex-start</SelectItem>
                  <SelectItem value="flex-end">flex-end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="stretch">stretch</SelectItem>
                  <SelectItem value="baseline">baseline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flex Wrap */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">flex-wrap</Label>
              <Select
                value={config.flexWrap}
                onValueChange={(value) => updateConfig({ flexWrap: value as FlexWrap })}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nowrap">nowrap</SelectItem>
                  <SelectItem value="wrap">wrap</SelectItem>
                  <SelectItem value="wrap-reverse">wrap-reverse</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gap */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">gap</Label>
                <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                  {config.gap}px
                </span>
              </div>
              <Slider
                value={[config.gap]}
                onValueChange={(value) => updateConfig({ gap: value[0] })}
                min={0}
                max={48}
                step={4}
                className="w-full"
              />
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="grid grid-cols-2 gap-2 @sm:gap-2.5 @md:gap-3">
              {PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyPreset(preset)}
                  className="relative rounded-lg border border-border overflow-hidden group cursor-pointer bg-muted/30 p-3 @sm:p-4 hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col gap-2">
                    {/* Mini preview */}
                    <div
                      className="w-full h-16 @sm:h-20 border border-dashed border-primary/20 rounded flex p-1"
                      style={{
                        flexDirection: preset.config.flexDirection.includes("column")
                          ? "column"
                          : "row",
                        justifyContent: preset.config.justifyContent,
                        alignItems: preset.config.alignItems,
                        flexWrap: preset.config.flexWrap,
                        gap: `${Math.min(preset.config.gap / 2, 4)}px`,
                      }}
                    >
                      {Array.from({ length: Math.min(preset.config.itemCount, 3) }).map((_, i) => (
                        <div
                          key={i}
                          className="rounded"
                          style={{
                            backgroundColor: ITEM_COLORS[i],
                            width: preset.config.flexWrap === "wrap" ? "24px" : "auto",
                            minWidth: "16px",
                            height: preset.config.flexDirection.includes("column") ? "16px" : "100%",
                            flex: preset.config.flexWrap === "nowrap" ? "1 1 0%" : "0 0 auto",
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] @sm:text-xs font-medium text-foreground text-center">
                      {preset.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="code" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="space-y-2 @sm:space-y-3">
              <div className="relative">
                <pre className="p-2 @sm:p-3 @md:p-4 rounded-lg bg-muted border border-border text-[10px] @sm:text-xs @md:text-sm font-mono overflow-x-auto">
                  <code>{cssCode}</code>
                </pre>
              </div>
              <Button
                onClick={handleCopyCSS}
                variant="default"
                className="w-full h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 mr-1.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 mr-1.5" />
                    Copy CSS
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
