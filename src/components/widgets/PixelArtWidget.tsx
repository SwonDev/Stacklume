"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Pencil,
  Eraser,
  PaintBucket,
  Grid3x3,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Play,
  Pause,
  Plus,
  Minus,
  Copy,
  Upload,
  FlipHorizontal,
  FlipVertical,
  Palette,
  Square,
  Move,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "motion/react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface PixelArtWidgetProps {
  widget: Widget;
}

type Tool = "pencil" | "eraser" | "fill" | "line" | "rectangle";
type PaletteMode = "full" | "gameboy" | "nes" | "custom";
type MirrorMode = "none" | "horizontal" | "vertical" | "both";

interface Frame {
  id: string;
  data: string[][];
  thumbnail?: string;
}

interface HistoryState {
  data: string[][];
  frameIndex: number;
}

// Predefined palettes
const PALETTES: Record<PaletteMode, string[]> = {
  full: [],
  gameboy: ["#0f380f", "#306230", "#8bac0f", "#9bbc0f"],
  nes: [
    "#000000", "#fcfcfc", "#f8f8f8", "#bcbcbc", "#7c7c7c", "#a4e4fc",
    "#3cbcfc", "#0078f8", "#0000fc", "#b8b8f8", "#6888fc", "#0058f8",
    "#0000bc", "#d8b8f8", "#9878f8", "#6844fc",
  ],
  custom: [
    "#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff", "#ffff00",
    "#ff00ff", "#00ffff", "#ff8800", "#88ff00", "#0088ff", "#8800ff",
    "#ff0088", "#00ff88", "#888888", "#444444",
  ],
};

export function PixelArtWidget({ widget }: PixelArtWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const _previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grid settings
  const [gridSize, setGridSize] = useState<number>(
    widget.config?.pixelGridSize || 16
  );
  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState<number>(widget.config?.pixelZoom || 1);

  // Tools
  const [tool, setTool] = useState<Tool>("pencil");
  const [color, setColor] = useState("#000000");
  const [paletteMode, setPaletteMode] = useState<PaletteMode>(
    widget.config?.pixelPaletteMode || "custom"
  );
  const [recentColors, setRecentColors] = useState<string[]>(
    widget.config?.pixelRecentColors || ["#000000", "#ffffff"]
  );

  // Canvas state
  const [pixels, setPixels] = useState<string[][]>(() => {
    const saved = widget.config?.pixelData;
    if (saved && Array.isArray(saved)) return saved;
    return Array(gridSize).fill(null).map(() => Array(gridSize).fill("transparent"));
  });

  // Animation
  const [frames, setFrames] = useState<Frame[]>(
    widget.config?.pixelFrames || [{ id: "frame-1", data: pixels }]
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState<number>(widget.config?.pixelFps || 8);
  const [onionSkin, setOnionSkin] = useState(false);

  // Mirror mode
  const [mirrorMode, setMirrorMode] = useState<MirrorMode>("none");

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([
    { data: pixels, frameIndex: 0 },
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(null);
  const [previewPixels, setPreviewPixels] = useState<string[][] | null>(null);

  // Palette
  const currentPalette = paletteMode === "full" ? recentColors : PALETTES[paletteMode];

  // Save to config
  const saveToConfig = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        pixelData: pixels,
        pixelGridSize: gridSize,
        pixelZoom: zoom,
        pixelRecentColors: recentColors,
        pixelFrames: frames,
        pixelFps: fps,
        pixelPaletteMode: paletteMode,
      },
    });
  }, [widget.id, widget.config, pixels, gridSize, zoom, recentColors, frames, fps, paletteMode]);

  // Auto-save on changes
   
  useEffect(() => {
    const timer = setTimeout(() => {
      saveToConfig();
    }, 1000);
    return () => clearTimeout(timer);
  }, [pixels, frames]);

  // Draw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellSize = Math.floor(canvas.width / gridSize) * zoom;
    canvas.width = gridSize * cellSize;
    canvas.height = gridSize * cellSize;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw onion skin (previous frame)
    if (onionSkin && currentFrameIndex > 0) {
      const prevFrame = frames[currentFrameIndex - 1];
      if (prevFrame) {
        prevFrame.data.forEach((row, y) => {
          row.forEach((pixelColor, x) => {
            if (pixelColor !== "transparent") {
              ctx.globalAlpha = 0.3;
              ctx.fillStyle = pixelColor;
              ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
              ctx.globalAlpha = 1;
            }
          });
        });
      }
    }

    // Draw current pixels (or preview)
    const pixelsToDraw = previewPixels || pixels;
    pixelsToDraw.forEach((row, y) => {
      row.forEach((pixelColor, x) => {
        if (pixelColor !== "transparent") {
          ctx.fillStyle = pixelColor;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      });
    });

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "rgba(128, 128, 128, 0.2)";
      ctx.lineWidth = 1;
      for (let i = 0; i <= gridSize; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
      }
    }
  }, [pixels, gridSize, zoom, showGrid, onionSkin, currentFrameIndex, frames, previewPixels]);

  // Animation playback
  useEffect(() => {
    if (!isPlaying || frames.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) => {
        const next = (prev + 1) % frames.length;
        setPixels(frames[next].data);
        return next;
      });
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, frames, fps]);

  // Add to history
  const addToHistory = useCallback((newPixels: string[][]) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ data: newPixels, frameIndex: currentFrameIndex });
      return newHistory.slice(-10); // Keep last 10 states
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 9));
  }, [historyIndex, currentFrameIndex]);

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setPixels(prevState.data);
      setCurrentFrameIndex(prevState.frameIndex);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setPixels(nextState.data);
      setCurrentFrameIndex(nextState.frameIndex);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Fill bucket algorithm
  const floodFill = (x: number, y: number, targetColor: string, fillColor: string) => {
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;
    if (pixels[y][x] !== targetColor) return;
    if (targetColor === fillColor) return;

    const newPixels = pixels.map((row) => [...row]);
    const stack = [[x, y]];

    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      if (cx < 0 || cx >= gridSize || cy < 0 || cy >= gridSize) continue;
      if (newPixels[cy][cx] !== targetColor) continue;

      newPixels[cy][cx] = fillColor;

      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }

    return newPixels;
  };

  // Draw line (Bresenham's algorithm)
  const drawLine = (x0: number, y0: number, x1: number, y1: number, drawColor: string) => {
    const newPixels = pixels.map((row) => [...row]);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x0 >= 0 && x0 < gridSize && y0 >= 0 && y0 < gridSize) {
        newPixels[y0][x0] = drawColor;
        applyMirror(newPixels, x0, y0, drawColor);
      }

      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }

    return newPixels;
  };

  // Draw rectangle
  const drawRectangle = (x0: number, y0: number, x1: number, y1: number, drawColor: string) => {
    const newPixels = pixels.map((row) => [...row]);
    const minX = Math.max(0, Math.min(x0, x1));
    const maxX = Math.min(gridSize - 1, Math.max(x0, x1));
    const minY = Math.max(0, Math.min(y0, y1));
    const maxY = Math.min(gridSize - 1, Math.max(y0, y1));

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        newPixels[y][x] = drawColor;
        applyMirror(newPixels, x, y, drawColor);
      }
    }

    return newPixels;
  };

  // Apply mirror mode
  const applyMirror = (pixelArray: string[][], x: number, y: number, drawColor: string) => {
    if (mirrorMode === "horizontal" || mirrorMode === "both") {
      const mirrorX = gridSize - 1 - x;
      if (mirrorX >= 0 && mirrorX < gridSize) {
        pixelArray[y][mirrorX] = drawColor;
      }
    }
    if (mirrorMode === "vertical" || mirrorMode === "both") {
      const mirrorY = gridSize - 1 - y;
      if (mirrorY >= 0 && mirrorY < gridSize) {
        pixelArray[mirrorY][x] = drawColor;
      }
    }
    if (mirrorMode === "both") {
      const mirrorX = gridSize - 1 - x;
      const mirrorY = gridSize - 1 - y;
      if (mirrorX >= 0 && mirrorX < gridSize && mirrorY >= 0 && mirrorY < gridSize) {
        pixelArray[mirrorY][mirrorX] = drawColor;
      }
    }
  };

  // Handle canvas click
  const handleCanvasInteraction = (e: React.MouseEvent<HTMLCanvasElement>, isStart: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cellSize = (canvas.width / gridSize);
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);

    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return;

    if (tool === "pencil" || tool === "eraser") {
      const drawColor = tool === "eraser" ? "transparent" : color;
      const newPixels = pixels.map((row) => [...row]);
      newPixels[y][x] = drawColor;
      applyMirror(newPixels, x, y, drawColor);
      setPixels(newPixels);

      if (isStart) {
        addToHistory(newPixels);
        if (tool === "pencil" && !recentColors.includes(color)) {
          setRecentColors([color, ...recentColors.slice(0, 15)]);
        }
      }
    } else if (tool === "fill" && isStart) {
      const targetColor = pixels[y][x];
      const newPixels = floodFill(x, y, targetColor, color);
      if (newPixels) {
        setPixels(newPixels);
        addToHistory(newPixels);
        if (!recentColors.includes(color)) {
          setRecentColors([color, ...recentColors.slice(0, 15)]);
        }
      }
    } else if ((tool === "line" || tool === "rectangle") && isStart) {
      setLineStart({ x, y });
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCanvasInteraction(e, true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    if (tool === "line" && lineStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cellSize = canvas.width / gridSize;
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);
      const preview = drawLine(lineStart.x, lineStart.y, x, y, color);
      setPreviewPixels(preview);
    } else if (tool === "rectangle" && lineStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cellSize = canvas.width / gridSize;
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);
      const preview = drawRectangle(lineStart.x, lineStart.y, x, y, color);
      setPreviewPixels(preview);
    } else {
      handleCanvasInteraction(e, false);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && (tool === "line" || tool === "rectangle") && lineStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cellSize = canvas.width / gridSize;
      const x = Math.floor((e.clientX - rect.left) / cellSize);
      const y = Math.floor((e.clientY - rect.top) / cellSize);

      let newPixels: string[][];
      if (tool === "line") {
        newPixels = drawLine(lineStart.x, lineStart.y, x, y, color);
      } else {
        newPixels = drawRectangle(lineStart.x, lineStart.y, x, y, color);
      }

      setPixels(newPixels);
      addToHistory(newPixels);
      setLineStart(null);
      setPreviewPixels(null);

      if (!recentColors.includes(color)) {
        setRecentColors([color, ...recentColors.slice(0, 15)]);
      }
    }
    setIsDrawing(false);
  };

  // Clear canvas
  const clearCanvas = () => {
    const newPixels = Array(gridSize)
      .fill(null)
      .map(() => Array(gridSize).fill("transparent"));
    setPixels(newPixels);
    addToHistory(newPixels);
  };

  // Change grid size
  const changeGridSize = (newSize: number) => {
    const newPixels = Array(newSize)
      .fill(null)
      .map(() => Array(newSize).fill("transparent"));

    // Copy old pixels to new grid (top-left aligned)
    const minSize = Math.min(gridSize, newSize);
    for (let y = 0; y < minSize; y++) {
      for (let x = 0; x < minSize; x++) {
        newPixels[y][x] = pixels[y][x];
      }
    }

    setPixels(newPixels);
    setGridSize(newSize);
    addToHistory(newPixels);
  };

  // Export canvas
  const exportCanvas = (scale: number = 1) => {
    const exportCanvas = document.createElement("canvas");
    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    exportCanvas.width = gridSize * scale;
    exportCanvas.height = gridSize * scale;

    pixels.forEach((row, y) => {
      row.forEach((pixelColor, x) => {
        if (pixelColor !== "transparent") {
          ctx.fillStyle = pixelColor;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      });
    });

    exportCanvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pixel-art-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  // Frame management
  const addFrame = () => {
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      data: pixels.map((row) => [...row]),
    };
    setFrames([...frames, newFrame]);
    setCurrentFrameIndex(frames.length);
  };

  const duplicateFrame = () => {
    const currentFrame = frames[currentFrameIndex];
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      data: currentFrame.data.map((row) => [...row]),
    };
    const newFrames = [...frames];
    newFrames.splice(currentFrameIndex + 1, 0, newFrame);
    setFrames(newFrames);
    setCurrentFrameIndex(currentFrameIndex + 1);
  };

  const deleteFrame = () => {
    if (frames.length <= 1) return;
    const newFrames = frames.filter((_, i) => i !== currentFrameIndex);
    setFrames(newFrames);
    setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1));
    setPixels(newFrames[Math.max(0, currentFrameIndex - 1)].data);
  };

  const selectFrame = (index: number) => {
    setCurrentFrameIndex(index);
    setPixels(frames[index].data);
  };

  // Import reference image
  const importImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = gridSize;
        tempCanvas.height = gridSize;
        const ctx = tempCanvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, gridSize, gridSize);
        const imageData = ctx.getImageData(0, 0, gridSize, gridSize);
        const newPixels = Array(gridSize)
          .fill(null)
          .map(() => Array(gridSize).fill("transparent"));

        for (let y = 0; y < gridSize; y++) {
          for (let x = 0; x < gridSize; x++) {
            const i = (y * gridSize + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            if (a > 128) {
              newPixels[y][x] = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
            }
          }
        }

        setPixels(newPixels);
        addToHistory(newPixels);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-muted/30 flex-wrap">
        {/* Tools */}
        <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
          <ToggleGroupItem value="pencil" size="sm" title="Pencil">
            <Pencil className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="eraser" size="sm" title="Eraser">
            <Eraser className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="fill" size="sm" title="Fill Bucket">
            <PaintBucket className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="line" size="sm" title="Line">
            <Move className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="rectangle" size="sm" title="Rectangle">
            <Square className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="w-px h-6 bg-border" />

        {/* Grid size */}
        <Select value={gridSize.toString()} onValueChange={(v) => changeGridSize(parseInt(v))}>
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8">8x8</SelectItem>
            <SelectItem value="16">16x16</SelectItem>
            <SelectItem value="32">32x32</SelectItem>
            <SelectItem value="64">64x64</SelectItem>
          </SelectContent>
        </Select>

        {/* Grid toggle */}
        <Button
          variant={showGrid ? "default" : "outline"}
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
          title="Toggle Grid"
        >
          <Grid3x3 className="w-4 h-4" />
        </Button>

        {/* Zoom */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs">{Math.round(zoom * 100)}%</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setZoom(Math.min(3, zoom + 0.25))}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Undo/Redo */}
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={historyIndex === 0}
          title="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={historyIndex === history.length - 1}
          title="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        {/* Mirror mode */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Mirror Mode">
              {mirrorMode === "horizontal" && <FlipHorizontal className="w-4 h-4" />}
              {mirrorMode === "vertical" && <FlipVertical className="w-4 h-4" />}
              {mirrorMode === "both" && (
                <>
                  <FlipHorizontal className="w-3 h-3" />
                  <FlipVertical className="w-3 h-3" />
                </>
              )}
              {mirrorMode === "none" && <Move className="w-4 h-4" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="space-y-2">
              <Button
                variant={mirrorMode === "none" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setMirrorMode("none")}
              >
                None
              </Button>
              <Button
                variant={mirrorMode === "horizontal" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setMirrorMode("horizontal")}
              >
                <FlipHorizontal className="w-4 h-4 mr-2" />
                Horizontal
              </Button>
              <Button
                variant={mirrorMode === "vertical" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setMirrorMode("vertical")}
              >
                <FlipVertical className="w-4 h-4 mr-2" />
                Vertical
              </Button>
              <Button
                variant={mirrorMode === "both" ? "default" : "ghost"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setMirrorMode("both")}
              >
                Both
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" title="Export">
              <Download className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-40">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportCanvas(1)}
              >
                1x Scale
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportCanvas(2)}
              >
                2x Scale
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => exportCanvas(4)}
              >
                4x Scale
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Import */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          title="Import Image"
        >
          <Upload className="w-4 h-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={importImage}
          className="hidden"
        />

        {/* Clear */}
        <Button
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          title="Clear Canvas"
        >
          <Trash2 className="w-4 h-4" />
        </Button>

        {/* Save */}
        <Button
          variant="default"
          size="sm"
          onClick={saveToConfig}
          title="Save"
          className="ml-auto"
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex gap-2 p-2 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center overflow-auto bg-muted/20 rounded-lg">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsDrawing(false);
              setPreviewPixels(null);
            }}
            className="cursor-crosshair"
            style={{
              imageRendering: "pixelated",
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
        </div>

        {/* Right panel - Color picker & Palette */}
        <div className="w-48 flex flex-col gap-2">
          {/* Current color */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <label className="text-xs font-medium mb-2 block">Color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-12 h-12 rounded cursor-pointer"
              />
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 px-2 py-1 text-xs rounded bg-background border"
              />
            </div>
          </div>

          {/* Palette mode */}
          <div className="p-3 bg-muted/30 rounded-lg">
            <label className="text-xs font-medium mb-2 block">Palette</label>
            <Select value={paletteMode} onValueChange={(v) => setPaletteMode(v as PaletteMode)}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Recent Colors</SelectItem>
                <SelectItem value="gameboy">Game Boy</SelectItem>
                <SelectItem value="nes">NES</SelectItem>
                <SelectItem value="custom">Custom 16</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Palette colors */}
          <ScrollArea className="flex-1 p-3 bg-muted/30 rounded-lg">
            <div className="grid grid-cols-4 gap-2">
              {currentPalette.map((c, i) => (
                <button
                  key={i}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded border-2 transition-transform hover:scale-110",
                    c === color ? "border-primary" : "border-border"
                  )}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Animation controls */}
      <div className="border-t bg-muted/30 p-2">
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? "default" : "outline"}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={frames.length <= 1}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs">FPS:</span>
            <Slider
              value={[fps]}
              onValueChange={([v]) => setFps(v)}
              min={1}
              max={30}
              step={1}
              className="w-24"
            />
            <span className="text-xs w-8">{fps}</span>
          </div>

          <Button
            variant={onionSkin ? "default" : "outline"}
            size="sm"
            onClick={() => setOnionSkin(!onionSkin)}
            disabled={currentFrameIndex === 0}
            title="Onion Skin"
          >
            <Palette className="w-4 h-4" />
          </Button>

          <div className="w-px h-6 bg-border" />

          {/* Frame controls */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto">
            {frames.map((frame, i) => (
              <Button
                key={frame.id}
                variant={i === currentFrameIndex ? "default" : "outline"}
                size="sm"
                onClick={() => selectFrame(i)}
                className="min-w-12"
              >
                {i + 1}
              </Button>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addFrame} title="Add Frame">
            <Plus className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={duplicateFrame} title="Duplicate Frame">
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={deleteFrame}
            disabled={frames.length <= 1}
            title="Delete Frame"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
