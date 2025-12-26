"use client";

import { useState, useMemo, useCallback } from "react";
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
import { Grid3x3, Copy, Check, Plus, Minus, RotateCcw, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface CSSGridWidgetProps {
  widget: Widget;
}

interface GridConfig {
  templateColumns: string;
  templateRows: string;
  gap: number;
  rowGap: number;
  columnGap: number;
  justifyItems: string;
  alignItems: string;
  justifyContent: string;
  alignContent: string;
}

interface GridPreset {
  name: string;
  description: string;
  templateColumns: string;
  templateRows: string;
  gap: number;
  justifyItems: string;
  alignItems: string;
  justifyContent: string;
  alignContent: string;
}

// Grid layout presets
const GRID_PRESETS: GridPreset[] = [
  {
    name: "Holy Grail",
    description: "Classic header, sidebar, content, footer layout",
    templateColumns: "200px 1fr 200px",
    templateRows: "auto 1fr auto",
    gap: 16,
    justifyItems: "stretch",
    alignItems: "stretch",
    justifyContent: "start",
    alignContent: "start",
  },
  {
    name: "Dashboard",
    description: "4-column responsive dashboard grid",
    templateColumns: "repeat(4, 1fr)",
    templateRows: "auto auto 1fr",
    gap: 16,
    justifyItems: "stretch",
    alignItems: "start",
    justifyContent: "start",
    alignContent: "start",
  },
  {
    name: "Gallery",
    description: "3-column photo gallery grid",
    templateColumns: "repeat(3, 1fr)",
    templateRows: "repeat(3, 200px)",
    gap: 12,
    justifyItems: "center",
    alignItems: "center",
    justifyContent: "start",
    alignContent: "start",
  },
  {
    name: "Magazine",
    description: "Magazine-style asymmetric layout",
    templateColumns: "2fr 1fr 1fr",
    templateRows: "300px 200px 200px",
    gap: 20,
    justifyItems: "stretch",
    alignItems: "stretch",
    justifyContent: "start",
    alignContent: "start",
  },
  {
    name: "Card Grid",
    description: "Auto-fit responsive card grid",
    templateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    templateRows: "auto",
    gap: 16,
    justifyItems: "stretch",
    alignItems: "start",
    justifyContent: "start",
    alignContent: "start",
  },
];

export function CSSGridWidget({ widget }: CSSGridWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config or use defaults
  const configData = widget.config as { gridConfig?: GridConfig } | undefined;
  const initialConfig: GridConfig = configData?.gridConfig || {
    templateColumns: "repeat(3, 1fr)",
    templateRows: "repeat(3, 100px)",
    gap: 16,
    rowGap: 16,
    columnGap: 16,
    justifyItems: "stretch",
    alignItems: "stretch",
    justifyContent: "start",
    alignContent: "start",
  };

  const [templateColumns, setTemplateColumns] = useState<string>(initialConfig.templateColumns);
  const [templateRows, setTemplateRows] = useState<string>(initialConfig.templateRows);
  const [gap, setGap] = useState<number>(initialConfig.gap);
  const [rowGap, setRowGap] = useState<number>(initialConfig.rowGap);
  const [columnGap, setColumnGap] = useState<number>(initialConfig.columnGap);
  const [justifyItems, setJustifyItems] = useState<string>(initialConfig.justifyItems);
  const [alignItems, setAlignItems] = useState<string>(initialConfig.alignItems);
  const [justifyContent, setJustifyContent] = useState<string>(initialConfig.justifyContent);
  const [alignContent, setAlignContent] = useState<string>(initialConfig.alignContent);
  const [useUnifiedGap, setUseUnifiedGap] = useState<boolean>(true);
  const [copied, setCopied] = useState(false);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());

  // Calculate grid dimensions from template strings
  const gridDimensions = useMemo(() => {
    // Simple parser for repeat() and fr values
    const parseTemplate = (template: string): number => {
      const repeatMatch = template.match(/repeat\((\d+)/);
      if (repeatMatch) return parseInt(repeatMatch[1]);

      const parts = template.split(/\s+/).filter(p => p.trim());
      return parts.length;
    };

    const cols = parseTemplate(templateColumns);
    const rows = parseTemplate(templateRows);

    return { cols: Math.max(1, Math.min(cols, 12)), rows: Math.max(1, Math.min(rows, 12)) };
  }, [templateColumns, templateRows]);

  // Generate CSS code
  const gridCSS = useMemo(() => {
    const css: string[] = [];
    css.push(".grid-container {");
    css.push("  display: grid;");
    css.push(`  grid-template-columns: ${templateColumns};`);
    css.push(`  grid-template-rows: ${templateRows};`);

    if (useUnifiedGap) {
      css.push(`  gap: ${gap}px;`);
    } else {
      css.push(`  row-gap: ${rowGap}px;`);
      css.push(`  column-gap: ${columnGap}px;`);
    }

    if (justifyItems !== "stretch") css.push(`  justify-items: ${justifyItems};`);
    if (alignItems !== "stretch") css.push(`  align-items: ${alignItems};`);
    if (justifyContent !== "start") css.push(`  justify-content: ${justifyContent};`);
    if (alignContent !== "start") css.push(`  align-content: ${alignContent};`);
    css.push("}");

    return css.join("\n");
  }, [templateColumns, templateRows, gap, rowGap, columnGap, useUnifiedGap, justifyItems, alignItems, justifyContent, alignContent]);

  // Save config to widget store
  const saveConfig = useCallback(() => {
    updateWidget(widget.id, {
      config: {
        gridConfig: {
          templateColumns,
          templateRows,
          gap,
          rowGap,
          columnGap,
          justifyItems,
          alignItems,
          justifyContent,
          alignContent,
        },
      },
    });
  }, [widget.id, updateWidget, templateColumns, templateRows, gap, rowGap, columnGap, justifyItems, alignItems, justifyContent, alignContent]);

  const handleCopyCSS = async () => {
    await navigator.clipboard.writeText(gridCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setTemplateColumns("repeat(3, 1fr)");
    setTemplateRows("repeat(3, 100px)");
    setGap(16);
    setRowGap(16);
    setColumnGap(16);
    setJustifyItems("stretch");
    setAlignItems("stretch");
    setJustifyContent("start");
    setAlignContent("start");
    setUseUnifiedGap(true);
  };

  const applyPreset = (preset: GridPreset) => {
    setTemplateColumns(preset.templateColumns);
    setTemplateRows(preset.templateRows);
    setGap(preset.gap);
    setRowGap(preset.gap);
    setColumnGap(preset.gap);
    setJustifyItems(preset.justifyItems);
    setAlignItems(preset.alignItems);
    setJustifyContent(preset.justifyContent);
    setAlignContent(preset.alignContent);
    setUseUnifiedGap(true);
  };

  const addColumn = () => {
    if (gridDimensions.cols >= 12) return;
    const currentCols = gridDimensions.cols;
    setTemplateColumns(`repeat(${currentCols + 1}, 1fr)`);
  };

  const removeColumn = () => {
    if (gridDimensions.cols <= 1) return;
    const currentCols = gridDimensions.cols;
    setTemplateColumns(`repeat(${currentCols - 1}, 1fr)`);
  };

  const addRow = () => {
    if (gridDimensions.rows >= 12) return;
    const currentRows = gridDimensions.rows;
    setTemplateRows(`repeat(${currentRows + 1}, 100px)`);
  };

  const removeRow = () => {
    if (gridDimensions.rows <= 1) return;
    const currentRows = gridDimensions.rows;
    setTemplateRows(`repeat(${currentRows - 1}, 100px)`);
  };

  const toggleCellSelection = (col: number, row: number) => {
    const cellId = `${col}-${row}`;
    setSelectedCells(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cellId)) {
        newSet.delete(cellId);
      } else {
        newSet.add(cellId);
      }
      return newSet;
    });
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <Grid3x3 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              CSS Grid Generator
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
          </Button>
        </div>

        {/* Live Preview */}
        <div className="relative w-full rounded-lg border border-border bg-muted/30 p-2 @sm:p-3 overflow-auto">
          <div
            className="grid min-h-[200px] @sm:min-h-[250px] @md:min-h-[300px] w-full"
            style={{
              gridTemplateColumns: templateColumns,
              gridTemplateRows: templateRows,
              gap: useUnifiedGap ? `${gap}px` : `${rowGap}px ${columnGap}px`,
              justifyItems,
              alignItems,
              justifyContent,
              alignContent,
            }}
          >
            {Array.from({ length: gridDimensions.cols * gridDimensions.rows }).map((_, index) => {
              const col = (index % gridDimensions.cols) + 1;
              const row = Math.floor(index / gridDimensions.cols) + 1;
              const cellId = `${col}-${row}`;
              const isSelected = selectedCells.has(cellId);

              return (
                <motion.div
                  key={cellId}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.01 }}
                  onClick={() => toggleCellSelection(col, row)}
                  className={cn(
                    "relative rounded border-2 cursor-pointer transition-all duration-200 hover:border-primary/50",
                    isSelected
                      ? "bg-primary/20 border-primary"
                      : "bg-card border-border/50"
                  )}
                >
                  {/* Grid line numbers */}
                  <div className="absolute top-0.5 left-0.5 text-[8px] @sm:text-[9px] @md:text-[10px] font-mono text-muted-foreground/50">
                    {col},{row}
                  </div>
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-[10px] @sm:text-xs font-medium text-primary">
                        Selected
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Grid dimensions indicator */}
          <div className="absolute bottom-1 right-1 px-2 py-0.5 rounded bg-black/50 backdrop-blur-sm">
            <span className="text-[9px] @sm:text-[10px] font-mono text-white">
              {gridDimensions.cols}×{gridDimensions.rows}
            </span>
          </div>
        </div>

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="grid" className="flex-1 overflow-hidden flex flex-col" onValueChange={saveConfig}>
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8">
            <TabsTrigger value="grid" className="text-[10px] @sm:text-xs">
              Grid
            </TabsTrigger>
            <TabsTrigger value="alignment" className="text-[10px] @sm:text-xs">
              Align
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="grid" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* Columns/Rows controls */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">Columns</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeColumn}
                    disabled={gridDimensions.cols <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="flex-1 flex items-center justify-center border rounded-md text-xs font-mono">
                    {gridDimensions.cols}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addColumn}
                    disabled={gridDimensions.cols >= 12}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[10px] @sm:text-xs">Rows</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={removeRow}
                    disabled={gridDimensions.rows <= 1}
                    className="h-7 w-7 p-0"
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <div className="flex-1 flex items-center justify-center border rounded-md text-xs font-mono">
                    {gridDimensions.rows}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addRow}
                    disabled={gridDimensions.rows >= 12}
                    className="h-7 w-7 p-0"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Template Columns */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">grid-template-columns</Label>
              <Input
                value={templateColumns}
                onChange={(e) => setTemplateColumns(e.target.value)}
                onBlur={saveConfig}
                className="h-7 @sm:h-8 text-[10px] @sm:text-xs font-mono"
                placeholder="e.g., repeat(3, 1fr)"
              />
            </div>

            {/* Template Rows */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">grid-template-rows</Label>
              <Input
                value={templateRows}
                onChange={(e) => setTemplateRows(e.target.value)}
                onBlur={saveConfig}
                className="h-7 @sm:h-8 text-[10px] @sm:text-xs font-mono"
                placeholder="e.g., repeat(3, 100px)"
              />
            </div>

            {/* Gap Controls */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">
                  {useUnifiedGap ? "Gap" : "Row Gap"}
                </Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUseUnifiedGap(!useUnifiedGap)}
                  className="h-5 px-2 text-[9px] @sm:text-[10px]"
                >
                  {useUnifiedGap ? "Split" : "Unify"}
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Slider
                  value={[useUnifiedGap ? gap : rowGap]}
                  onValueChange={(value) => {
                    if (useUnifiedGap) {
                      setGap(value[0]);
                      setRowGap(value[0]);
                      setColumnGap(value[0]);
                    } else {
                      setRowGap(value[0]);
                    }
                  }}
                  onValueCommit={saveConfig}
                  min={0}
                  max={64}
                  step={1}
                  className="flex-1 mr-2"
                />
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono w-8 text-right">
                  {useUnifiedGap ? gap : rowGap}px
                </span>
              </div>
            </div>

            {!useUnifiedGap && (
              <div className="space-y-2">
                <Label className="text-[10px] @sm:text-xs">Column Gap</Label>
                <div className="flex items-center justify-between">
                  <Slider
                    value={[columnGap]}
                    onValueChange={(value) => setColumnGap(value[0])}
                    onValueCommit={saveConfig}
                    min={0}
                    max={64}
                    step={1}
                    className="flex-1 mr-2"
                  />
                  <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono w-8 text-right">
                    {columnGap}px
                  </span>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="alignment" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* justify-items */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">justify-items</Label>
              <Select value={justifyItems} onValueChange={(value) => { setJustifyItems(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">start</SelectItem>
                  <SelectItem value="end">end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="stretch">stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* align-items */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">align-items</Label>
              <Select value={alignItems} onValueChange={(value) => { setAlignItems(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">start</SelectItem>
                  <SelectItem value="end">end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="stretch">stretch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* justify-content */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">justify-content</Label>
              <Select value={justifyContent} onValueChange={(value) => { setJustifyContent(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">start</SelectItem>
                  <SelectItem value="end">end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="stretch">stretch</SelectItem>
                  <SelectItem value="space-around">space-around</SelectItem>
                  <SelectItem value="space-between">space-between</SelectItem>
                  <SelectItem value="space-evenly">space-evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* align-content */}
            <div className="space-y-1">
              <Label className="text-[10px] @sm:text-xs">align-content</Label>
              <Select value={alignContent} onValueChange={(value) => { setAlignContent(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="start">start</SelectItem>
                  <SelectItem value="end">end</SelectItem>
                  <SelectItem value="center">center</SelectItem>
                  <SelectItem value="stretch">stretch</SelectItem>
                  <SelectItem value="space-around">space-around</SelectItem>
                  <SelectItem value="space-between">space-between</SelectItem>
                  <SelectItem value="space-evenly">space-evenly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2">
            <div className="space-y-2">
              {GRID_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => applyPreset(preset)}
                  className="w-full text-left p-2 @sm:p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-accent/50 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 @sm:w-4 @sm:h-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-[11px] @sm:text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                        {preset.name}
                      </h4>
                      <p className="text-[9px] @sm:text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                        {preset.description}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <code className="text-[8px] @sm:text-[9px] px-1 py-0.5 rounded bg-muted font-mono">
                          {preset.templateColumns}
                        </code>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* CSS Output & Copy Button */}
        <div className="space-y-1.5">
          <div className="relative">
            <pre className="text-[9px] @sm:text-[10px] font-mono bg-muted/50 border border-border rounded-md p-2 overflow-x-auto max-h-20 @sm:max-h-24">
              {gridCSS}
            </pre>
          </div>
          <Button
            onClick={handleCopyCSS}
            variant="default"
            className="w-full h-7 @sm:h-8 text-[10px] @sm:text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1.5" />
                Copy CSS
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
