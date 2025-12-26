"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Play,
  Pause,
  Grid3x3,
  Image as ImageIcon,
  Download,
  ZoomIn,
  Settings2,
  X,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SpriteSheetWidgetProps {
  widget: Widget;
}

interface SpriteFrame {
  x: number;
  y: number;
  width: number;
  height: number;
  index: number;
}

type GridMode = "rows-cols" | "frame-size";

export function SpriteSheetWidget({ widget }: SpriteSheetWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Widget config state
  const [imageUrl, setImageUrl] = useState<string>(widget.config?.spriteImageUrl || "");
  const [gridMode, setGridMode] = useState<GridMode>(widget.config?.spriteGridMode || "rows-cols");
  const [rows, setRows] = useState<number>(widget.config?.spriteRows || 1);
  const [cols, setCols] = useState<number>(widget.config?.spriteCols || 1);
  const [frameWidth, setFrameWidth] = useState<number>(widget.config?.spriteFrameWidth || 32);
  const [frameHeight, setFrameHeight] = useState<number>(widget.config?.spriteFrameHeight || 32);
  const [offsetX, setOffsetX] = useState<number>(widget.config?.spriteOffsetX || 0);
  const [offsetY, setOffsetY] = useState<number>(widget.config?.spriteOffsetY || 0);
  const [paddingX, setPaddingX] = useState<number>(widget.config?.spritePaddingX || 0);
  const [paddingY, setPaddingY] = useState<number>(widget.config?.spritePaddingY || 0);

  // Local state
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFrames, setSelectedFrames] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState<number>(12);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [zoom, setZoom] = useState<number>(1);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Save config to widget store
  const saveConfig = useCallback(() => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        spriteImageUrl: imageUrl,
        spriteGridMode: gridMode,
        spriteRows: rows,
        spriteCols: cols,
        spriteFrameWidth: frameWidth,
        spriteFrameHeight: frameHeight,
        spriteOffsetX: offsetX,
        spriteOffsetY: offsetY,
        spritePaddingX: paddingX,
        spritePaddingY: paddingY,
      },
    });
  }, [updateWidget, widget.id, widget.config, imageUrl, gridMode, rows, cols, frameWidth, frameHeight, offsetX, offsetY, paddingX, paddingY]);

  // Calculate frames based on grid mode
  const frames = useMemo<SpriteFrame[]>(() => {
    if (!imageDimensions) return [];

    const frames: SpriteFrame[] = [];

    if (gridMode === "rows-cols") {
      const cellWidth = (imageDimensions.width - offsetX - (paddingX * (cols - 1))) / cols;
      const cellHeight = (imageDimensions.height - offsetY - (paddingY * (rows - 1))) / rows;

      let index = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          frames.push({
            x: offsetX + col * (cellWidth + paddingX),
            y: offsetY + row * (cellHeight + paddingY),
            width: cellWidth,
            height: cellHeight,
            index: index++,
          });
        }
      }
    } else {
      // frame-size mode
      const totalCols = Math.floor((imageDimensions.width - offsetX) / (frameWidth + paddingX));
      const totalRows = Math.floor((imageDimensions.height - offsetY) / (frameHeight + paddingY));

      let index = 0;
      for (let row = 0; row < totalRows; row++) {
        for (let col = 0; col < totalCols; col++) {
          frames.push({
            x: offsetX + col * (frameWidth + paddingX),
            y: offsetY + row * (frameHeight + paddingY),
            width: frameWidth,
            height: frameHeight,
            index: index++,
          });
        }
      }
    }

    return frames;
  }, [imageDimensions, gridMode, rows, cols, frameWidth, frameHeight, offsetX, offsetY, paddingX, paddingY]);

  // Load image and draw grid
  useEffect(() => {
    if (!imageUrl || !canvasRef.current) return;

    // Reset image loaded state when URL changes (wrapped to avoid setState during render)
    const rafId = requestAnimationFrame(() => {
      setImageLoaded(false);
    });

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      cancelAnimationFrame(rafId);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      imgRef.current = img;
      setImageDimensions({ width: img.width, height: img.height });
      setImageLoaded(true);

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Draw grid overlay
      ctx.strokeStyle = "rgba(0, 255, 0, 0.8)";
      ctx.lineWidth = 2;

      frames.forEach((spriteFrame, index) => {
        ctx.strokeRect(spriteFrame.x, spriteFrame.y, spriteFrame.width, spriteFrame.height);

        // Draw frame number
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(spriteFrame.x, spriteFrame.y, 24, 18);
        ctx.fillStyle = "#00ff00";
        ctx.font = "12px monospace";
        ctx.fillText(String(index), spriteFrame.x + 4, spriteFrame.y + 13);

        // Highlight selected frames
        if (selectedFrames.includes(index)) {
          ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
          ctx.fillRect(spriteFrame.x, spriteFrame.y, spriteFrame.width, spriteFrame.height);
        }
      });
    };

    img.onerror = () => {
      console.error("Failed to load sprite sheet image");
    };

    img.src = imageUrl;

    return () => cancelAnimationFrame(rafId);
  }, [imageUrl, frames, selectedFrames]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || selectedFrames.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    let lastTime = performance.now();
    const frameDelay = 1000 / fps;

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;

      if (deltaTime >= frameDelay) {
        setCurrentFrame((prev) => {
          const nextFrame = (prev + 1) % selectedFrames.length;
          return nextFrame;
        });
        lastTime = currentTime;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, fps, selectedFrames]);

  // File upload handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImageUrl(url);
        saveConfig();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        setImageUrl(url);
        saveConfig();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Canvas click handler for frame selection
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const clickedFrame = frames.find(
      (frame) =>
        x >= frame.x &&
        x <= frame.x + frame.width &&
        y >= frame.y &&
        y <= frame.y + frame.height
    );

    if (clickedFrame) {
      setSelectedFrames((prev) => {
        if (prev.includes(clickedFrame.index)) {
          return prev.filter((i) => i !== clickedFrame.index);
        } else {
          return [...prev, clickedFrame.index].sort((a, b) => a - b);
        }
      });
    }
  };

  // Export frame data as JSON
  const handleExportJSON = () => {
    const exportData = {
      imageUrl,
      gridMode,
      dimensions: imageDimensions,
      gridSettings: {
        rows,
        cols,
        frameWidth,
        frameHeight,
        offsetX,
        offsetY,
        paddingX,
        paddingY,
      },
      frames: frames.map((frame) => ({
        index: frame.index,
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
      })),
      selectedFrames,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "spritesheet-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setSelectedFrames([]);
    setCurrentFrame(0);
    setIsPlaying(false);
    setZoom(1);
  };

  const selectedFrame = selectedFrames.length > 0 ? frames[selectedFrames[currentFrame]] : null;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 rounded-lg bg-primary/10">
              <Grid3x3 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              Sprite Sheet Cutter
            </h3>
          </div>
          {imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
            >
              <RotateCcw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
              Reset
            </Button>
          )}
        </div>

        <Tabs defaultValue="upload" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8">
            <TabsTrigger value="upload" className="text-[10px] @sm:text-xs">
              <Upload className="w-3 h-3 mr-1" />
              Upload
            </TabsTrigger>
            <TabsTrigger value="grid" className="text-[10px] @sm:text-xs" disabled={!imageUrl}>
              <Settings2 className="w-3 h-3 mr-1" />
              Grid
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-[10px] @sm:text-xs" disabled={!imageUrl || selectedFrames.length === 0}>
              <Play className="w-3 h-3 mr-1" />
              Preview
            </TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="flex-1 overflow-y-auto mt-2 space-y-2">
            {!imageUrl ? (
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 @sm:p-6 @md:p-8 flex flex-col items-center justify-center min-h-[200px] transition-colors ${
                  isDragging ? "border-primary bg-primary/5" : "border-border"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 @sm:w-14 @sm:h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 @sm:w-7 @sm:h-7 text-primary" />
                </div>
                <h4 className="text-sm @sm:text-base font-medium mb-1">Upload Sprite Sheet</h4>
                <p className="text-xs @sm:text-sm text-muted-foreground mb-4 text-center">
                  Drag and drop an image or click to browse
                </p>
                <Button size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                  Choose File
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs @sm:text-sm">Sprite Sheet</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setImageUrl("")}
                    className="h-6 px-2 text-[10px] @sm:text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Remove
                  </Button>
                </div>
                <div className="relative border rounded-lg overflow-hidden bg-muted/20">
                  <canvas
                    ref={canvasRef}
                    onClick={handleCanvasClick}
                    className="w-full h-auto cursor-crosshair"
                    style={{ imageRendering: "pixelated" }}
                  />
                </div>
                {imageDimensions && (
                  <div className="text-xs text-muted-foreground">
                    Image: {imageDimensions.width}x{imageDimensions.height}px • Frames: {frames.length}
                    {selectedFrames.length > 0 && ` • Selected: ${selectedFrames.length}`}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* Grid Settings Tab */}
          <TabsContent value="grid" className="flex-1 overflow-y-auto mt-2 space-y-3">
            {/* Grid Mode */}
            <div className="space-y-1.5">
              <Label className="text-xs @sm:text-sm">Grid Mode</Label>
              <Select value={gridMode} onValueChange={(value: GridMode) => { setGridMode(value); saveConfig(); }}>
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rows-cols">Rows x Columns</SelectItem>
                  <SelectItem value="frame-size">Fixed Frame Size</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {gridMode === "rows-cols" ? (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs @sm:text-sm">Rows</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={rows}
                      onChange={(e) => { setRows(Number(e.target.value)); saveConfig(); }}
                      className="h-7 @sm:h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs @sm:text-sm">Columns</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={cols}
                      onChange={(e) => { setCols(Number(e.target.value)); saveConfig(); }}
                      className="h-7 @sm:h-8 text-xs"
                    />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs @sm:text-sm">Frame Width</Label>
                    <Input
                      type="number"
                      min={1}
                      value={frameWidth}
                      onChange={(e) => { setFrameWidth(Number(e.target.value)); saveConfig(); }}
                      className="h-7 @sm:h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs @sm:text-sm">Frame Height</Label>
                    <Input
                      type="number"
                      min={1}
                      value={frameHeight}
                      onChange={(e) => { setFrameHeight(Number(e.target.value)); saveConfig(); }}
                      className="h-7 @sm:h-8 text-xs"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Offset */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs @sm:text-sm">Offset X</Label>
                <Input
                  type="number"
                  min={0}
                  value={offsetX}
                  onChange={(e) => { setOffsetX(Number(e.target.value)); saveConfig(); }}
                  className="h-7 @sm:h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs @sm:text-sm">Offset Y</Label>
                <Input
                  type="number"
                  min={0}
                  value={offsetY}
                  onChange={(e) => { setOffsetY(Number(e.target.value)); saveConfig(); }}
                  className="h-7 @sm:h-8 text-xs"
                />
              </div>
            </div>

            {/* Padding */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs @sm:text-sm">Padding X</Label>
                <Input
                  type="number"
                  min={0}
                  value={paddingX}
                  onChange={(e) => { setPaddingX(Number(e.target.value)); saveConfig(); }}
                  className="h-7 @sm:h-8 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs @sm:text-sm">Padding Y</Label>
                <Input
                  type="number"
                  min={0}
                  value={paddingY}
                  onChange={(e) => { setPaddingY(Number(e.target.value)); saveConfig(); }}
                  className="h-7 @sm:h-8 text-xs"
                />
              </div>
            </div>

            <Button onClick={handleExportJSON} className="w-full h-7 @sm:h-8 text-xs">
              <Download className="w-3 h-3 mr-1.5" />
              Export JSON
            </Button>
          </TabsContent>

          {/* Animation Preview Tab */}
          <TabsContent value="preview" className="flex-1 overflow-y-auto mt-2 space-y-3">
            {selectedFrame && imageLoaded && (
              <>
                {/* Preview Canvas */}
                <div className="space-y-1.5">
                  <Label className="text-xs @sm:text-sm">Preview (Frame {selectedFrames[currentFrame]})</Label>
                  <div className="relative border rounded-lg overflow-hidden bg-muted/20 flex items-center justify-center p-4" style={{ minHeight: "120px" }}>
                    <canvas
                      ref={(canvas) => {
                        if (canvas && selectedFrame && imgRef.current) {
                          const ctx = canvas.getContext("2d");
                          if (ctx) {
                            canvas.width = selectedFrame.width;
                            canvas.height = selectedFrame.height;
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            ctx.drawImage(
                              imgRef.current,
                              selectedFrame.x,
                              selectedFrame.y,
                              selectedFrame.width,
                              selectedFrame.height,
                              0,
                              0,
                              selectedFrame.width,
                              selectedFrame.height
                            );
                          }
                        }
                      }}
                      style={{
                        imageRendering: "pixelated",
                        transform: `scale(${zoom})`,
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Size: {Math.round(selectedFrame.width)}x{Math.round(selectedFrame.height)}px •
                    Position: ({Math.round(selectedFrame.x)}, {Math.round(selectedFrame.y)})
                  </div>
                </div>

                {/* Zoom Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs @sm:text-sm">Zoom</Label>
                    <span className="text-xs text-muted-foreground">{zoom.toFixed(1)}x</span>
                  </div>
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={1}
                    max={8}
                    step={0.5}
                    className="w-full"
                  />
                </div>

                {/* FPS Control */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs @sm:text-sm">Animation FPS</Label>
                    <span className="text-xs text-muted-foreground">{fps}</span>
                  </div>
                  <Slider
                    value={[fps]}
                    onValueChange={(value) => setFps(value[0])}
                    min={1}
                    max={60}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Animation Controls */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex-1 h-7 @sm:h-8 text-xs"
                    variant={isPlaying ? "destructive" : "default"}
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="w-3 h-3 mr-1.5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1.5" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentFrame(0)}
                    className="h-7 @sm:h-8 px-3 text-xs"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>

                {/* Selected Frames Info */}
                <div className="text-xs text-muted-foreground">
                  Playing {selectedFrames.length} frames: [{selectedFrames.join(", ")}]
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
