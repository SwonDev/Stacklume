"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Grid,
  Paintbrush,
  Eraser,
  Layers,
  Download,
  Upload,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Copy,
  Check,
  PaintBucket,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface TilemapWidgetProps {
  widget: Widget;
}

type TileType = "empty" | "ground" | "wall" | "water" | "lava" | "grass" | "sand" | "stone" | "wood";
type LayerType = "background" | "collision" | "foreground";
type BrushSize = "1x1" | "2x2" | "3x3";
type Tool = "brush" | "eraser" | "fill";

interface TileConfig {
  type: TileType;
  color: string;
  label: string;
}

interface HistoryEntry {
  layer: LayerType;
  tiles: TileType[][];
}

const TILE_TYPES: TileConfig[] = [
  { type: "empty", color: "#1a1a1a", label: "Empty" },
  { type: "ground", color: "#8B4513", label: "Ground" },
  { type: "wall", color: "#696969", label: "Wall" },
  { type: "water", color: "#4682B4", label: "Water" },
  { type: "lava", color: "#FF4500", label: "Lava" },
  { type: "grass", color: "#228B22", label: "Grass" },
  { type: "sand", color: "#F4A460", label: "Sand" },
  { type: "stone", color: "#778899", label: "Stone" },
  { type: "wood", color: "#D2691E", label: "Wood" },
];

const DEFAULT_GRID_SIZE = 16;
const DEFAULT_TILE_SIZE = 32;
const MIN_GRID_SIZE = 8;
const MAX_GRID_SIZE = 64;

interface TilemapConfig {
  tilemapGridSize?: number;
  tilemapTileSize?: number;
  tilemapBackgroundLayer?: TileType[][];
  tilemapCollisionLayer?: TileType[][];
  tilemapForegroundLayer?: TileType[][];
}

export function TilemapWidget({ widget }: TilemapWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load config
  const config = (widget.config || {}) as TilemapConfig;
  const initialGridSize = config.tilemapGridSize ?? DEFAULT_GRID_SIZE;
  const initialTileSize = config.tilemapTileSize ?? DEFAULT_TILE_SIZE;

  // State
  const [gridSize, setGridSize] = useState(initialGridSize);
  const [tileSize, setTileSize] = useState(initialTileSize);
  const [currentTile, setCurrentTile] = useState<TileType>("ground");
  const [currentLayer, setCurrentLayer] = useState<LayerType>("collision");
  const [tool, setTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState<BrushSize>("1x1");
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [autoTile, setAutoTile] = useState(false);
  const [copied, setCopied] = useState(false);

  // Layer visibility
  const [layerVisibility, setLayerVisibility] = useState({
    background: true,
    collision: true,
    foreground: true,
  });

  // Initialize tilemap layers
  const createEmptyLayer = useCallback(
    () => Array(gridSize).fill(null).map(() => Array(gridSize).fill("empty" as TileType)),
    [gridSize]
  );

  const [backgroundLayer, setBackgroundLayer] = useState<TileType[][]>(() =>
    config.tilemapBackgroundLayer || createEmptyLayer()
  );
  const [collisionLayer, setCollisionLayer] = useState<TileType[][]>(() =>
    config.tilemapCollisionLayer || createEmptyLayer()
  );
  const [foregroundLayer, setForegroundLayer] = useState<TileType[][]>(() =>
    config.tilemapForegroundLayer || createEmptyLayer()
  );

  // History for undo/redo
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Get current layer
  const getCurrentLayerData = useCallback(() => {
    switch (currentLayer) {
      case "background":
        return backgroundLayer;
      case "collision":
        return collisionLayer;
      case "foreground":
        return foregroundLayer;
    }
  }, [currentLayer, backgroundLayer, collisionLayer, foregroundLayer]);

  // Set current layer
  const setCurrentLayerData = useCallback((data: TileType[][]) => {
    switch (currentLayer) {
      case "background":
        setBackgroundLayer(data);
        break;
      case "collision":
        setCollisionLayer(data);
        break;
      case "foreground":
        setForegroundLayer(data);
        break;
    }
  }, [currentLayer]);

  // Save to history
  const saveToHistory = useCallback((layerData: TileType[][]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      layer: currentLayer,
      tiles: layerData.map(row => [...row]),
    });
    setHistory(newHistory.slice(-50)); // Keep last 50 operations
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, currentLayer]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevEntry = history[historyIndex - 1];
      setCurrentLayerData(prevEntry.tiles);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history, setCurrentLayerData]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextEntry = history[historyIndex + 1];
      setCurrentLayerData(nextEntry.tiles);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history, setCurrentLayerData]);

  // Auto-tile logic: detect neighbors and suggest tile types
  const getAutoTileSuggestion = useCallback((x: number, y: number, tiles: TileType[][]): TileType => {
    if (!autoTile) return currentTile;

    const neighbors = {
      top: y > 0 ? tiles[y - 1][x] : "empty",
      bottom: y < gridSize - 1 ? tiles[y + 1][x] : "empty",
      left: x > 0 ? tiles[y][x - 1] : "empty",
      right: x < gridSize - 1 ? tiles[y][x + 1] : "empty",
    };

    // Simple auto-tile logic: if surrounded by walls, place wall
    const surroundedByWalls = Object.values(neighbors).filter(n => n === "wall").length >= 3;
    if (surroundedByWalls && currentTile === "ground") {
      return "wall";
    }

    return currentTile;
  }, [autoTile, currentTile, gridSize]);

  // Fill tool (flood fill algorithm)
  const floodFill = useCallback((x: number, y: number, tiles: TileType[][], targetTile: TileType, replacementTile: TileType) => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return tiles;
    if (tiles[y][x] !== targetTile) return tiles;
    if (targetTile === replacementTile) return tiles;

    const newTiles = tiles.map(row => [...row]);
    const stack: [number, number][] = [[x, y]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) continue;
      if (newTiles[cy][cx] !== targetTile) continue;

      newTiles[cy][cx] = replacementTile;

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    return newTiles;
  }, [gridSize]);

  // Place tile(s) based on brush size
  const placeTiles = useCallback((x: number, y: number, tiles: TileType[][], tileType: TileType) => {
    const newTiles = tiles.map(row => [...row]);
    const brushSizeNum = parseInt(brushSize.split("x")[0]);

    for (let dy = 0; dy < brushSizeNum; dy++) {
      for (let dx = 0; dx < brushSizeNum; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
          const suggestedTile = getAutoTileSuggestion(nx, ny, newTiles);
          newTiles[ny][nx] = suggestedTile;
        }
      }
    }

    return newTiles;
  }, [brushSize, gridSize, getAutoTileSuggestion]);

  // Handle canvas click/drag
  const handleCanvasInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / (tileSize * zoom));
    const y = Math.floor((e.clientY - rect.top) / (tileSize * zoom));

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;

    const currentLayerData = getCurrentLayerData();
    let newLayerData: TileType[][];

    if (tool === "brush") {
      newLayerData = placeTiles(x, y, currentLayerData, currentTile);
    } else if (tool === "eraser") {
      newLayerData = placeTiles(x, y, currentLayerData, "empty");
    } else if (tool === "fill") {
      const targetTile = currentLayerData[y][x];
      newLayerData = floodFill(x, y, currentLayerData, targetTile, currentTile);
    } else {
      return;
    }

    setCurrentLayerData(newLayerData);
    if (e.type === "mousedown") {
      saveToHistory(newLayerData);
    }
  }, [tool, currentTile, tileSize, zoom, gridSize, getCurrentLayerData, setCurrentLayerData, placeTiles, floodFill, saveToHistory]);

  // Handle right-click to erase
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const prevTool = tool;
    setTool("eraser");
    handleCanvasInteraction(e);
    setTool(prevTool);
  }, [tool, handleCanvasInteraction]);

  // Export as JSON array
  const exportAsJSON = useCallback(() => {
    const data = {
      gridSize,
      tileSize,
      layers: {
        background: backgroundLayer,
        collision: collisionLayer,
        foreground: foregroundLayer,
      },
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tilemap.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [gridSize, tileSize, backgroundLayer, collisionLayer, foregroundLayer]);

  // Export as CSV
  const exportAsCSV = useCallback(() => {
    const currentLayerData = getCurrentLayerData();
    const csv = currentLayerData
      .map(row => row.map(tile => TILE_TYPES.findIndex(t => t.type === tile)).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tilemap-${currentLayer}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentLayer, getCurrentLayerData]);

  // Export as Base64
  const exportAsBase64 = useCallback(() => {
    const currentLayerData = getCurrentLayerData();
    const json = JSON.stringify(currentLayerData);
    const base64 = btoa(json);
    navigator.clipboard.writeText(base64);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [getCurrentLayerData]);

  // Import from JSON
  const importFromJSON = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.layers) {
          setBackgroundLayer(data.layers.background || createEmptyLayer());
          setCollisionLayer(data.layers.collision || createEmptyLayer());
          setForegroundLayer(data.layers.foreground || createEmptyLayer());
          if (data.gridSize) setGridSize(data.gridSize);
          if (data.tileSize) setTileSize(data.tileSize);
        } else if (Array.isArray(data)) {
          setCurrentLayerData(data);
        }
      } catch (error) {
        console.error("Failed to import tilemap:", error);
      }
    };
    reader.readAsText(file);
  }, [createEmptyLayer, setCurrentLayerData]);

  // Draw tilemap on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const scaledTileSize = tileSize * zoom;
    canvas.width = gridSize * scaledTileSize;
    canvas.height = gridSize * scaledTileSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw layers
    const layers = [
      { data: backgroundLayer, visible: layerVisibility.background, opacity: 0.6 },
      { data: collisionLayer, visible: layerVisibility.collision, opacity: 1 },
      { data: foregroundLayer, visible: layerVisibility.foreground, opacity: 0.8 },
    ];

    layers.forEach(({ data, visible, opacity }) => {
      if (!visible) return;

      ctx.globalAlpha = opacity;
      data.forEach((row, y) => {
        row.forEach((tile, x) => {
          if (tile === "empty") return;

          const tileConfig = TILE_TYPES.find(t => t.type === tile);
          if (tileConfig) {
            ctx.fillStyle = tileConfig.color;
            ctx.fillRect(x * scaledTileSize, y * scaledTileSize, scaledTileSize, scaledTileSize);
          }
        });
      });
      ctx.globalAlpha = 1;
    });

    // Draw grid lines
    if (showGrid) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;

      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * scaledTileSize, 0);
        ctx.lineTo(i * scaledTileSize, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i * scaledTileSize);
        ctx.lineTo(canvas.width, i * scaledTileSize);
        ctx.stroke();
      }
    }
  }, [gridSize, tileSize, zoom, showGrid, backgroundLayer, collisionLayer, foregroundLayer, layerVisibility]);

  // Save config
  const saveConfig = useCallback(() => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        tilemapGridSize: gridSize,
        tilemapTileSize: tileSize,
        tilemapBackgroundLayer: backgroundLayer,
        tilemapCollisionLayer: collisionLayer,
        tilemapForegroundLayer: foregroundLayer,
      },
    });
  }, [widget.id, widget.config, updateWidget, gridSize, tileSize, backgroundLayer, collisionLayer, foregroundLayer]);

  // Auto-save on changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveConfig();
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [backgroundLayer, collisionLayer, foregroundLayer, saveConfig]);

  // Handle grid size change
  const handleGridSizeChange = useCallback((newSize: number) => {
    setGridSize(newSize);
    setBackgroundLayer(createEmptyLayer());
    setCollisionLayer(createEmptyLayer());
    setForegroundLayer(createEmptyLayer());
  }, [createEmptyLayer]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 gap-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 rounded-lg bg-primary/10">
              <Grid className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm font-semibold text-foreground">
              Tilemap Editor
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={historyIndex <= 0}
              className="h-6 w-6 @sm:h-7 @sm:w-7 p-0"
              title="Undo"
            >
              <Undo2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className="h-6 w-6 @sm:h-7 @sm:w-7 p-0"
              title="Redo"
            >
              <Redo2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
            <ToggleGroupItem value="brush" size="sm" className="h-7 px-2">
              <Paintbrush className="w-3 h-3 mr-1" />
              <span className="text-xs hidden @sm:inline">Brush</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="eraser" size="sm" className="h-7 px-2">
              <Eraser className="w-3 h-3 mr-1" />
              <span className="text-xs hidden @sm:inline">Erase</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="fill" size="sm" className="h-7 px-2">
              <PaintBucket className="w-3 h-3 mr-1" />
              <span className="text-xs hidden @sm:inline">Fill</span>
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="h-5 w-px bg-border" />

          <ToggleGroup type="single" value={brushSize} onValueChange={(v) => v && setBrushSize(v as BrushSize)}>
            <ToggleGroupItem value="1x1" size="sm" className="h-7 px-2 text-xs">1x1</ToggleGroupItem>
            <ToggleGroupItem value="2x2" size="sm" className="h-7 px-2 text-xs">2x2</ToggleGroupItem>
            <ToggleGroupItem value="3x3" size="sm" className="h-7 px-2 text-xs">3x3</ToggleGroupItem>
          </ToggleGroup>

          <div className="h-5 w-px bg-border" />

          <Button
            variant={showGrid ? "default" : "outline"}
            size="sm"
            onClick={() => setShowGrid(!showGrid)}
            className="h-7 px-2"
          >
            <Grid className="w-3 h-3" />
          </Button>

          <Button
            variant={autoTile ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoTile(!autoTile)}
            className="h-7 px-2"
            title="Auto-tile suggestions"
          >
            <Sparkles className="w-3 h-3" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-2 min-h-0">
          <canvas
            ref={canvasRef}
            onMouseDown={handleCanvasInteraction}
            onMouseMove={(e) => e.buttons === 1 && handleCanvasInteraction(e)}
            onContextMenu={handleContextMenu}
            className="cursor-crosshair"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Controls Tabs */}
        <Tabs defaultValue="tiles" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-7">
            <TabsTrigger value="tiles" className="text-[10px] @sm:text-xs">Tiles</TabsTrigger>
            <TabsTrigger value="layers" className="text-[10px] @sm:text-xs">Layers</TabsTrigger>
            <TabsTrigger value="settings" className="text-[10px] @sm:text-xs">Settings</TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] @sm:text-xs">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="tiles" className="space-y-2 mt-2">
            <div className="grid grid-cols-3 gap-1.5">
              {TILE_TYPES.filter(t => t.type !== "empty").map((tile) => (
                <Button
                  key={tile.type}
                  variant={currentTile === tile.type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentTile(tile.type)}
                  className="h-auto py-2 flex flex-col items-center gap-1"
                >
                  <div
                    className="w-6 h-6 rounded border border-border"
                    style={{ backgroundColor: tile.color }}
                  />
                  <span className="text-[9px] @sm:text-[10px]">{tile.label}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="layers" className="space-y-2 mt-2">
            <div className="space-y-1.5">
              {(["background", "collision", "foreground"] as LayerType[]).map((layer) => (
                <div
                  key={layer}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer",
                    currentLayer === layer
                      ? "bg-primary/10 border-primary"
                      : "bg-muted/30 border-border hover:border-primary/50"
                  )}
                  onClick={() => setCurrentLayer(layer)}
                >
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium capitalize">{layer}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }));
                    }}
                    className="h-6 w-6 p-0"
                  >
                    {layerVisibility[layer] ? (
                      <Eye className="w-3 h-3" />
                    ) : (
                      <EyeOff className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-2 mt-2">
            <div className="space-y-2">
              <Label className="text-xs">Grid Size: {gridSize}x{gridSize}</Label>
              <Slider
                value={[gridSize]}
                onValueChange={(v) => handleGridSizeChange(v[0])}
                min={MIN_GRID_SIZE}
                max={MAX_GRID_SIZE}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Tile Size: {tileSize}px</Label>
              <Slider
                value={[tileSize]}
                onValueChange={(v) => setTileSize(v[0])}
                min={16}
                max={64}
                step={8}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Zoom: {Math.round(zoom * 100)}%</Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  className="h-7 flex-1"
                >
                  <ZoomOut className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  className="h-7 flex-1"
                >
                  <ZoomIn className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-1.5 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsJSON}
              className="w-full h-7 text-xs"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export as JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsCSV}
              className="w-full h-7 text-xs"
            >
              <Download className="w-3 h-3 mr-1.5" />
              Export as CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportAsBase64}
              className="w-full h-7 text-xs"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Copied to Clipboard!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy as Base64
                </>
              )}
            </Button>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={importFromJSON}
                className="absolute inset-0 opacity-0 cursor-pointer"
                id="import-tilemap"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs pointer-events-none"
              >
                <Upload className="w-3 h-3 mr-1.5" />
                Import JSON
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="flex items-center gap-1 flex-wrap">
          {TILE_TYPES.slice(0, 5).map((tile) => (
            <div key={tile.type} className="flex items-center gap-1">
              <div
                className="w-3 h-3 rounded border border-border/50"
                style={{ backgroundColor: tile.color }}
              />
              <span className="text-[9px] text-muted-foreground">{tile.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
