"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Upload,
  Square,
  Circle,
  Pentagon,
  Move,
  Trash2,
  Copy,
  Download,
  Play,
  Pause,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Code,
  FileJson,
  Save,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface HitboxEditorWidgetProps {
  widget: Widget;
}

type HitboxShape = "rectangle" | "circle" | "polygon";
type HitboxLayer = "hurt" | "hit" | "collision";
type Tool = "select" | "draw-rect" | "draw-circle" | "draw-polygon";

interface Point {
  x: number;
  y: number;
}

interface Hitbox {
  id: string;
  name: string;
  shape: HitboxShape;
  layer: HitboxLayer;
  // Rectangle/general position
  x: number;
  y: number;
  width: number;
  height: number;
  // Circle
  radius?: number;
  // Polygon
  points?: Point[];
  // Visibility
  visible: boolean;
}

interface Frame {
  id: string;
  name: string;
  hitboxes: Hitbox[];
}

interface HistoryState {
  frames: Frame[];
  currentFrameIndex: number;
}

const LAYER_COLORS: Record<HitboxLayer, string> = {
  hurt: "rgba(255, 0, 0, 0.4)",
  hit: "rgba(0, 255, 0, 0.4)",
  collision: "rgba(0, 100, 255, 0.4)",
};

const LAYER_BORDER_COLORS: Record<HitboxLayer, string> = {
  hurt: "#ff0000",
  hit: "#00ff00",
  collision: "#0064ff",
};

export function HitboxEditorWidget({ widget }: HitboxEditorWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Widget config state
  const [spriteUrl, setSpriteUrl] = useState<string>(widget.config?.hitboxSpriteUrl || "");
  const [frames, setFrames] = useState<Frame[]>(
    widget.config?.hitboxFrames || [
      { id: "frame-1", name: "Frame 1", hitboxes: [] }
    ]
  );
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [zoom, setZoom] = useState<number>(widget.config?.hitboxZoom || 1);
  const [showGrid, setShowGrid] = useState(true);
  const [gridSnap, setGridSnap] = useState(true);
  const [gridSize, setGridSize] = useState(8);

  // Tool state
  const [tool, setTool] = useState<Tool>("select");
  const [selectedLayer, setSelectedLayer] = useState<HitboxLayer>("hurt");
  const [selectedHitboxId, setSelectedHitboxId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Point[]>([]);
  const [dragOffset, setDragOffset] = useState<Point | null>(null);
  const [_resizeHandle, _setResizeHandle] = useState<string | null>(null);

  // Animation
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const animationRef = useRef<number | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([
    { frames, currentFrameIndex }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Canvas dimensions
  const [canvasSize, setCanvasSize] = useState({ width: 400, height: 400 });

  // Current frame
  const currentFrame = frames[currentFrameIndex];
  const selectedHitbox = currentFrame?.hitboxes.find(h => h.id === selectedHitboxId);

  // Save config
  const saveConfig = useCallback(() => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        hitboxSpriteUrl: spriteUrl,
        hitboxFrames: frames,
        hitboxZoom: zoom,
      },
    });
  }, [updateWidget, widget.id, widget.config, spriteUrl, frames, zoom]);

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(saveConfig, 1000);
    return () => clearTimeout(timer);
  }, [frames, spriteUrl, zoom, saveConfig]);

  // Add to history
  const addToHistory = useCallback((newFrames: Frame[], newFrameIndex: number) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ frames: newFrames, currentFrameIndex: newFrameIndex });
    setHistory(newHistory.slice(-50)); // Keep last 50 states
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setFrames(prevState.frames);
      setCurrentFrameIndex(prevState.currentFrameIndex);
      setHistoryIndex(historyIndex - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setFrames(nextState.frames);
      setCurrentFrameIndex(nextState.currentFrameIndex);
      setHistoryIndex(historyIndex + 1);
    }
  }, [history, historyIndex]);

  // Grid snapping
  const snapToGrid = useCallback((value: number) => {
    if (!gridSnap) return value;
    return Math.round(value / gridSize) * gridSize;
  }, [gridSnap, gridSize]);

  // Load sprite image
  useEffect(() => {
    if (!spriteUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      imgRef.current = img;
      setCanvasSize({ width: img.width, height: img.height });
      // drawCanvas will be called automatically via the useEffect that depends on canvasSize
    };

    img.onerror = () => {
      console.error("Failed to load sprite image");
    };

    img.src = spriteUrl;
  }, [spriteUrl]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const overlayCanvas = overlayCanvasRef.current;
    if (!canvas || !overlayCanvas) return;

    const ctx = canvas.getContext("2d");
    const overlayCtx = overlayCanvas.getContext("2d");
    if (!ctx || !overlayCtx) return;

    // Set canvas size
    canvas.width = canvasSize.width * zoom;
    canvas.height = canvasSize.height * zoom;
    overlayCanvas.width = canvasSize.width * zoom;
    overlayCanvas.height = canvasSize.height * zoom;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

    // Draw sprite if loaded
    if (imgRef.current) {
      ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Checkerboard background
      const tileSize = 16 * zoom;
      for (let y = 0; y < canvas.height; y += tileSize) {
        for (let x = 0; x < canvas.width; x += tileSize) {
          ctx.fillStyle = (x / tileSize + y / tileSize) % 2 === 0 ? "#ddd" : "#fff";
          ctx.fillRect(x, y, tileSize, tileSize);
        }
      }
    }

    // Draw grid
    if (showGrid) {
      overlayCtx.strokeStyle = "rgba(0, 0, 0, 0.1)";
      overlayCtx.lineWidth = 1;
      for (let x = 0; x < overlayCanvas.width; x += gridSize * zoom) {
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, 0);
        overlayCtx.lineTo(x, overlayCanvas.height);
        overlayCtx.stroke();
      }
      for (let y = 0; y < overlayCanvas.height; y += gridSize * zoom) {
        overlayCtx.beginPath();
        overlayCtx.moveTo(0, y);
        overlayCtx.lineTo(overlayCanvas.width, y);
        overlayCtx.stroke();
      }
    }

    // Draw hitboxes
    if (currentFrame) {
      currentFrame.hitboxes.forEach(hitbox => {
        if (!hitbox.visible) return;

        overlayCtx.fillStyle = LAYER_COLORS[hitbox.layer];
        overlayCtx.strokeStyle = LAYER_BORDER_COLORS[hitbox.layer];
        overlayCtx.lineWidth = 2;

        if (hitbox.shape === "rectangle") {
          overlayCtx.fillRect(
            hitbox.x * zoom,
            hitbox.y * zoom,
            hitbox.width * zoom,
            hitbox.height * zoom
          );
          overlayCtx.strokeRect(
            hitbox.x * zoom,
            hitbox.y * zoom,
            hitbox.width * zoom,
            hitbox.height * zoom
          );
        } else if (hitbox.shape === "circle" && hitbox.radius) {
          overlayCtx.beginPath();
          overlayCtx.arc(
            (hitbox.x + hitbox.radius) * zoom,
            (hitbox.y + hitbox.radius) * zoom,
            hitbox.radius * zoom,
            0,
            Math.PI * 2
          );
          overlayCtx.fill();
          overlayCtx.stroke();
        } else if (hitbox.shape === "polygon" && hitbox.points && hitbox.points.length > 2) {
          overlayCtx.beginPath();
          overlayCtx.moveTo(
            (hitbox.x + hitbox.points[0].x) * zoom,
            (hitbox.y + hitbox.points[0].y) * zoom
          );
          for (let i = 1; i < hitbox.points.length; i++) {
            overlayCtx.lineTo(
              (hitbox.x + hitbox.points[i].x) * zoom,
              (hitbox.y + hitbox.points[i].y) * zoom
            );
          }
          overlayCtx.closePath();
          overlayCtx.fill();
          overlayCtx.stroke();
        }

        // Draw selection handles for selected hitbox
        if (selectedHitboxId === hitbox.id) {
          overlayCtx.fillStyle = "#fff";
          overlayCtx.strokeStyle = "#000";
          overlayCtx.lineWidth = 1;

          if (hitbox.shape === "rectangle") {
            const handles = [
              { x: hitbox.x, y: hitbox.y, id: "nw" },
              { x: hitbox.x + hitbox.width / 2, y: hitbox.y, id: "n" },
              { x: hitbox.x + hitbox.width, y: hitbox.y, id: "ne" },
              { x: hitbox.x + hitbox.width, y: hitbox.y + hitbox.height / 2, id: "e" },
              { x: hitbox.x + hitbox.width, y: hitbox.y + hitbox.height, id: "se" },
              { x: hitbox.x + hitbox.width / 2, y: hitbox.y + hitbox.height, id: "s" },
              { x: hitbox.x, y: hitbox.y + hitbox.height, id: "sw" },
              { x: hitbox.x, y: hitbox.y + hitbox.height / 2, id: "w" },
            ];

            handles.forEach(handle => {
              overlayCtx.fillRect(
                handle.x * zoom - 4,
                handle.y * zoom - 4,
                8,
                8
              );
              overlayCtx.strokeRect(
                handle.x * zoom - 4,
                handle.y * zoom - 4,
                8,
                8
              );
            });
          }
        }

        // Draw label
        overlayCtx.fillStyle = "#000";
        overlayCtx.font = `${12 * zoom}px sans-serif`;
        overlayCtx.fillText(
          hitbox.name,
          hitbox.x * zoom + 4,
          hitbox.y * zoom - 4
        );
      });
    }
  }, [canvasSize, zoom, showGrid, gridSize, currentFrame, selectedHitboxId]);

  // Redraw when dependencies change
  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Handle sprite upload
  const handleSpriteUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const url = event.target?.result as string;
      setSpriteUrl(url);
    };
    reader.readAsDataURL(file);
  };

  // Canvas mouse handlers
  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: snapToGrid((e.clientX - rect.left) / zoom),
      y: snapToGrid((e.clientY - rect.top) / zoom),
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasCoordinates(e);

    if (tool === "select") {
      // Check if clicking on a hitbox
      const clickedHitbox = currentFrame?.hitboxes.find(hitbox => {
        if (hitbox.shape === "rectangle") {
          return pos.x >= hitbox.x && pos.x <= hitbox.x + hitbox.width &&
                 pos.y >= hitbox.y && pos.y <= hitbox.y + hitbox.height;
        }
        return false;
      });

      if (clickedHitbox) {
        setSelectedHitboxId(clickedHitbox.id);
        setDragOffset({ x: pos.x - clickedHitbox.x, y: pos.y - clickedHitbox.y });
        setIsDrawing(true);
      } else {
        setSelectedHitboxId(null);
      }
    } else if (tool === "draw-rect" || tool === "draw-circle") {
      setIsDrawing(true);
      setDrawStart(pos);
    } else if (tool === "draw-polygon") {
      setPolygonPoints([...polygonPoints, pos]);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasCoordinates(e);

    if (tool === "select" && selectedHitbox && dragOffset) {
      // Move hitbox
      const newFrames = [...frames];
      const hitboxIndex = newFrames[currentFrameIndex].hitboxes.findIndex(
        h => h.id === selectedHitboxId
      );

      if (hitboxIndex !== -1) {
        newFrames[currentFrameIndex].hitboxes[hitboxIndex] = {
          ...selectedHitbox,
          x: snapToGrid(pos.x - dragOffset.x),
          y: snapToGrid(pos.y - dragOffset.y),
        };
        setFrames(newFrames);
      }
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pos = getCanvasCoordinates(e);

    if (tool === "draw-rect" && drawStart) {
      const newHitbox: Hitbox = {
        id: `hitbox-${Date.now()}`,
        name: `Hitbox ${currentFrame.hitboxes.length + 1}`,
        shape: "rectangle",
        layer: selectedLayer,
        x: Math.min(drawStart.x, pos.x),
        y: Math.min(drawStart.y, pos.y),
        width: Math.abs(pos.x - drawStart.x),
        height: Math.abs(pos.y - drawStart.y),
        visible: true,
      };

      const newFrames = [...frames];
      newFrames[currentFrameIndex].hitboxes.push(newHitbox);
      setFrames(newFrames);
      addToHistory(newFrames, currentFrameIndex);
      setSelectedHitboxId(newHitbox.id);
    } else if (tool === "draw-circle" && drawStart) {
      const radius = Math.sqrt(
        Math.pow(pos.x - drawStart.x, 2) + Math.pow(pos.y - drawStart.y, 2)
      );

      const newHitbox: Hitbox = {
        id: `hitbox-${Date.now()}`,
        name: `Hitbox ${currentFrame.hitboxes.length + 1}`,
        shape: "circle",
        layer: selectedLayer,
        x: drawStart.x - radius,
        y: drawStart.y - radius,
        width: radius * 2,
        height: radius * 2,
        radius: radius,
        visible: true,
      };

      const newFrames = [...frames];
      newFrames[currentFrameIndex].hitboxes.push(newHitbox);
      setFrames(newFrames);
      addToHistory(newFrames, currentFrameIndex);
      setSelectedHitboxId(newHitbox.id);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setDragOffset(null);
  };

  // Finish polygon drawing
  const finishPolygon = () => {
    if (polygonPoints.length < 3) {
      setPolygonPoints([]);
      return;
    }

    const minX = Math.min(...polygonPoints.map(p => p.x));
    const minY = Math.min(...polygonPoints.map(p => p.y));
    const maxX = Math.max(...polygonPoints.map(p => p.x));
    const maxY = Math.max(...polygonPoints.map(p => p.y));

    const newHitbox: Hitbox = {
      id: `hitbox-${Date.now()}`,
      name: `Hitbox ${currentFrame.hitboxes.length + 1}`,
      shape: "polygon",
      layer: selectedLayer,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      points: polygonPoints.map(p => ({ x: p.x - minX, y: p.y - minY })),
      visible: true,
    };

    const newFrames = [...frames];
    newFrames[currentFrameIndex].hitboxes.push(newHitbox);
    setFrames(newFrames);
    addToHistory(newFrames, currentFrameIndex);
    setSelectedHitboxId(newHitbox.id);
    setPolygonPoints([]);
  };

  // Delete hitbox
  const deleteHitbox = (id: string) => {
    const newFrames = [...frames];
    newFrames[currentFrameIndex].hitboxes = newFrames[currentFrameIndex].hitboxes.filter(
      h => h.id !== id
    );
    setFrames(newFrames);
    addToHistory(newFrames, currentFrameIndex);
    setSelectedHitboxId(null);
  };

  // Toggle hitbox visibility
  const toggleHitboxVisibility = (id: string) => {
    const newFrames = [...frames];
    const hitboxIndex = newFrames[currentFrameIndex].hitboxes.findIndex(h => h.id === id);
    if (hitboxIndex !== -1) {
      newFrames[currentFrameIndex].hitboxes[hitboxIndex].visible =
        !newFrames[currentFrameIndex].hitboxes[hitboxIndex].visible;
      setFrames(newFrames);
    }
  };

  // Copy hitbox to other frames
  const copyHitboxToFrames = (hitboxId: string, targetFrameIndices: number[]) => {
    const hitbox = currentFrame.hitboxes.find(h => h.id === hitboxId);
    if (!hitbox) return;

    const newFrames = [...frames];
    targetFrameIndices.forEach(index => {
      if (index !== currentFrameIndex && index < newFrames.length) {
        newFrames[index].hitboxes.push({
          ...hitbox,
          id: `hitbox-${Date.now()}-${index}`,
        });
      }
    });
    setFrames(newFrames);
    addToHistory(newFrames, currentFrameIndex);
  };

  // Add new frame
  const addFrame = () => {
    const newFrame: Frame = {
      id: `frame-${Date.now()}`,
      name: `Frame ${frames.length + 1}`,
      hitboxes: [],
    };
    const newFrames = [...frames, newFrame];
    setFrames(newFrames);
    setCurrentFrameIndex(frames.length);
    addToHistory(newFrames, frames.length);
  };

  // Export as JSON
  const exportAsJSON = () => {
    const data = {
      frames: frames.map(frame => ({
        name: frame.name,
        hitboxes: frame.hitboxes.map(hitbox => ({
          name: hitbox.name,
          shape: hitbox.shape,
          layer: hitbox.layer,
          x: hitbox.x,
          y: hitbox.y,
          width: hitbox.width,
          height: hitbox.height,
          radius: hitbox.radius,
          points: hitbox.points,
        })),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hitboxes.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as JavaScript
  const exportAsJS = () => {
    const data = `export const hitboxData = ${JSON.stringify({
      frames: frames.map(frame => ({
        name: frame.name,
        hitboxes: frame.hitboxes.map(hitbox => ({
          name: hitbox.name,
          shape: hitbox.shape,
          layer: hitbox.layer,
          x: hitbox.x,
          y: hitbox.y,
          width: hitbox.width,
          height: hitbox.height,
          radius: hitbox.radius,
          points: hitbox.points,
        })),
      })),
    }, null, 2)};`;

    const blob = new Blob([data], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hitboxes.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Animation playback
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    let lastTime = Date.now();
    const frameDelay = 1000 / fps;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - lastTime;

      if (elapsed >= frameDelay) {
        setCurrentFrameIndex(prev => (prev + 1) % frames.length);
        lastTime = now;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, fps, frames.length]);

  return (
    <div className="h-full flex flex-col @container">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border flex-wrap">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleSpriteUpload}
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-1" />
          Sprite
        </Button>

        <div className="h-4 w-px bg-border" />

        <ToggleGroup type="single" value={tool} onValueChange={(v) => v && setTool(v as Tool)}>
          <ToggleGroupItem value="select" size="sm">
            <Move className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="draw-rect" size="sm">
            <Square className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="draw-circle" size="sm">
            <Circle className="w-4 h-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="draw-polygon" size="sm">
            <Pentagon className="w-4 h-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {tool === "draw-polygon" && polygonPoints.length > 0 && (
          <Button size="sm" variant="outline" onClick={finishPolygon}>
            Finish ({polygonPoints.length} points)
          </Button>
        )}

        <div className="h-4 w-px bg-border" />

        <Select value={selectedLayer} onValueChange={(v) => setSelectedLayer(v as HitboxLayer)}>
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="hurt">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.hurt }} />
                Hurt Box
              </div>
            </SelectItem>
            <SelectItem value="hit">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.hit }} />
                Hit Box
              </div>
            </SelectItem>
            <SelectItem value="collision">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: LAYER_COLORS.collision }} />
                Collision Box
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        <div className="h-4 w-px bg-border" />

        <Button size="sm" variant="ghost" onClick={undo} disabled={historyIndex === 0}>
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={redo} disabled={historyIndex === history.length - 1}>
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button size="sm" variant="ghost" onClick={() => setShowGrid(!showGrid)}>
          <Grid3x3 className={cn("w-4 h-4", showGrid && "text-primary")} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}>
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <Button size="sm" variant="ghost" onClick={() => setZoom(Math.min(4, zoom + 0.25))}>
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="flex-1" />

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={exportAsJSON}>
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button size="sm" variant="outline" onClick={exportAsJS}>
                <Code className="w-4 h-4 mr-2" />
                JavaScript
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button size="sm" variant="outline" onClick={saveConfig}>
          <Save className="w-4 h-4 mr-1" />
          Save
        </Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 overflow-auto bg-muted/20 p-4">
          <div className="relative inline-block">
            <canvas
              ref={canvasRef}
              className="absolute top-0 left-0"
            />
            <canvas
              ref={overlayCanvasRef}
              className="relative cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
            />
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-64 border-l border-border flex flex-col">
          <Tabs defaultValue="hitboxes" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="hitboxes">Hitboxes</TabsTrigger>
              <TabsTrigger value="frames">Frames</TabsTrigger>
            </TabsList>

            <TabsContent value="hitboxes" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-2">
                  {currentFrame?.hitboxes.map(hitbox => (
                    <motion.div
                      key={hitbox.id}
                      layout
                      className={cn(
                        "p-2 rounded border cursor-pointer",
                        selectedHitboxId === hitbox.id ? "border-primary bg-primary/10" : "border-border"
                      )}
                      onClick={() => setSelectedHitboxId(hitbox.id)}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded"
                            style={{ backgroundColor: LAYER_COLORS[hitbox.layer] }}
                          />
                          <span className="text-sm font-medium">{hitbox.name}</span>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleHitboxVisibility(hitbox.id);
                            }}
                          >
                            {hitbox.visible ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteHitbox(hitbox.id);
                            }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hitbox.shape} • {Math.round(hitbox.width)}x{Math.round(hitbox.height)}
                      </div>
                      {selectedHitboxId === hitbox.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="mt-2 pt-2 border-t space-y-2"
                        >
                          <Input
                            value={hitbox.name}
                            onChange={(e) => {
                              const newFrames = [...frames];
                              const idx = newFrames[currentFrameIndex].hitboxes.findIndex(
                                h => h.id === hitbox.id
                              );
                              if (idx !== -1) {
                                newFrames[currentFrameIndex].hitboxes[idx].name = e.target.value;
                                setFrames(newFrames);
                              }
                            }}
                            className="h-7 text-xs"
                            placeholder="Name"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7"
                            onClick={() => {
                              const targetIndices = frames.map((_, i) => i).filter(i => i !== currentFrameIndex);
                              copyHitboxToFrames(hitbox.id, targetIndices);
                            }}
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy to all frames
                          </Button>
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="frames" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-2 space-y-2">
                  <Button size="sm" variant="outline" className="w-full" onClick={addFrame}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Frame
                  </Button>

                  {frames.map((frame, index) => (
                    <motion.div
                      key={frame.id}
                      layout
                      className={cn(
                        "p-2 rounded border cursor-pointer",
                        currentFrameIndex === index ? "border-primary bg-primary/10" : "border-border"
                      )}
                      onClick={() => setCurrentFrameIndex(index)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{frame.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {frame.hitboxes.length} hitboxes
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Animation controls */}
          {frames.length > 1 && (
            <div className="p-2 border-t border-border space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentFrameIndex(Math.max(0, currentFrameIndex - 1))}
                  disabled={currentFrameIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex-1"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentFrameIndex(Math.min(frames.length - 1, currentFrameIndex + 1))}
                  disabled={currentFrameIndex === frames.length - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">FPS: {fps}</Label>
                <Slider
                  value={[fps]}
                  onValueChange={(v) => setFps(v[0])}
                  min={1}
                  max={60}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
