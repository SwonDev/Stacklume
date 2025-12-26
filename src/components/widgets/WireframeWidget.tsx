"use client";

import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Square,
  Type,
  Circle,
  Minus,
  Image as ImageIcon,
  Trash2,
  Grid3x3,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

type ElementType = "rectangle" | "text" | "button" | "input" | "image" | "circle" | "line";

interface WireframeElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  fill?: string;
  stroke?: string;
}

interface WireframeConfig {
  elements: WireframeElement[];
  showGrid: boolean;
  zoom: number;
}

interface WireframeWidgetProps {
  widget: Widget;
}

const GRID_SIZE = 20;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;

// Generate unique ID for elements
function generateElementId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15);
}

const ELEMENT_DEFAULTS: Record<ElementType, Partial<WireframeElement>> = {
  rectangle: { width: 120, height: 80, fill: "#ffffff", stroke: "#666666" },
  text: { width: 100, height: 30, content: "Text", fill: "#000000", stroke: "none" },
  button: { width: 100, height: 40, content: "Button", fill: "#e5e5e5", stroke: "#666666" },
  input: { width: 200, height: 40, content: "Input", fill: "#ffffff", stroke: "#999999" },
  image: { width: 150, height: 150, fill: "#f5f5f5", stroke: "#999999" },
  circle: { width: 80, height: 80, fill: "#ffffff", stroke: "#666666" },
  line: { width: 100, height: 2, fill: "none", stroke: "#666666" },
};

const DEFAULT_CONFIG: WireframeConfig = {
  elements: [],
  showGrid: true,
  zoom: 1,
};

export function WireframeWidget({ widget }: WireframeWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = useMemo<WireframeConfig>(() => {
    const widgetConfig = widget.config as unknown as WireframeConfig | undefined;
    return widgetConfig || DEFAULT_CONFIG;
  }, [widget.config]);

  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<ElementType | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState<WireframeElement[][]>([config.elements]);
  const canvasRef = useRef<HTMLDivElement>(null);

  const updateConfig = useCallback((updates: Partial<WireframeConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  }, [widget, config, updateWidget]);

  const snapToGrid = useCallback((value: number) => {
    if (!config.showGrid) return value;
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }, [config.showGrid]);

  const addElement = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!activeTool || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = snapToGrid((e.clientX - rect.left) / config.zoom);
    const y = snapToGrid((e.clientY - rect.top) / config.zoom);

    const newElement: WireframeElement = {
      id: generateElementId(),
      type: activeTool,
      x,
      y,
      ...ELEMENT_DEFAULTS[activeTool],
    } as WireframeElement;

    const newElements = [...config.elements, newElement];
    updateConfig({ elements: newElements });
    setHistory([...history, newElements]);
    setActiveTool(null);
    setSelectedElement(newElement.id);
  }, [activeTool, config.zoom, config.elements, history, updateConfig, snapToGrid]);

  const startDrag = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setIsDragging(true);
    const element = config.elements.find((el) => el.id === elementId);
    if (element) {
      setDragStart({
        x: e.clientX / config.zoom - element.x,
        y: e.clientY / config.zoom - element.y,
      });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedElement) return;

    const newX = snapToGrid(e.clientX / config.zoom - dragStart.x);
    const newY = snapToGrid(e.clientY / config.zoom - dragStart.y);

    const newElements = config.elements.map((el) =>
      el.id === selectedElement ? { ...el, x: newX, y: newY } : el
    );
    updateConfig({ elements: newElements });
  };

  const onMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setHistory([...history, config.elements]);
    }
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    const newElements = config.elements.filter((el) => el.id !== selectedElement);
    updateConfig({ elements: newElements });
    setHistory([...history, newElements]);
    setSelectedElement(null);
  };

  const updateElement = (updates: Partial<WireframeElement>) => {
    if (!selectedElement) return;
    const newElements = config.elements.map((el) =>
      el.id === selectedElement ? { ...el, ...updates } : el
    );
    updateConfig({ elements: newElements });
  };

  const clearCanvas = () => {
    updateConfig({ elements: [] });
    setHistory([[]]);
    setSelectedElement(null);
  };

  const undo = () => {
    if (history.length > 1) {
      const newHistory = history.slice(0, -1);
      setHistory(newHistory);
      updateConfig({ elements: newHistory[newHistory.length - 1] });
      setSelectedElement(null);
    }
  };

  const adjustZoom = (delta: number) => {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, config.zoom + delta));
    updateConfig({ zoom: newZoom });
  };

  const selectedElementData = config.elements.find((el) => el.id === selectedElement);

  const tools: { type: ElementType; icon: React.ReactNode; label: string }[] = [
    { type: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectangle" },
    { type: "circle", icon: <Circle className="h-4 w-4" />, label: "Circle" },
    { type: "text", icon: <Type className="h-4 w-4" />, label: "Text" },
    { type: "button", icon: <Square className="h-4 w-4" />, label: "Button" },
    { type: "input", icon: <Minus className="h-4 w-4" />, label: "Input" },
    { type: "image", icon: <ImageIcon className="h-4 w-4" />, label: "Image" },
    { type: "line", icon: <Minus className="h-4 w-4" />, label: "Line" },
  ];

  return (
    <div className="@container flex h-full flex-col bg-background">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b p-2">
        {tools.map((tool) => (
          <Button
            key={tool.type}
            variant={activeTool === tool.type ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTool(activeTool === tool.type ? null : tool.type)}
            title={tool.label}
            className="h-8 w-8 p-0 @md:h-9 @md:w-auto @md:px-3"
          >
            {tool.icon}
            <span className="ml-2 hidden @md:inline">{tool.label}</span>
          </Button>
        ))}

        <div className="mx-2 h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateConfig({ showGrid: !config.showGrid })}
          title="Toggle Grid"
          className={cn("h-8 w-8 p-0", config.showGrid && "bg-accent")}
        >
          <Grid3x3 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustZoom(-ZOOM_STEP)}
          disabled={config.zoom <= MIN_ZOOM}
          title="Zoom Out"
          className="h-8 w-8 p-0"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <span className="hidden text-xs text-muted-foreground @md:inline">
          {Math.round(config.zoom * 100)}%
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustZoom(ZOOM_STEP)}
          disabled={config.zoom >= MAX_ZOOM}
          title="Zoom In"
          className="h-8 w-8 p-0"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        <Button
          variant="ghost"
          size="sm"
          onClick={undo}
          disabled={history.length <= 1}
          title="Undo"
          className="h-8 w-8 p-0"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={deleteElement}
          disabled={!selectedElement}
          title="Delete"
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={clearCanvas}
          disabled={config.elements.length === 0}
          title="Clear All"
          className="hidden @md:inline-flex"
        >
          Clear
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="relative flex-1 overflow-auto">
          <div
            ref={canvasRef}
            className={cn(
              "relative h-full min-h-[400px] w-full",
              activeTool && "cursor-crosshair",
              config.showGrid && "bg-grid"
            )}
            onClick={activeTool ? addElement : undefined}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{
              backgroundSize: config.showGrid
                ? `${GRID_SIZE * config.zoom}px ${GRID_SIZE * config.zoom}px`
                : undefined,
            }}
          >
            <AnimatePresence>
              {config.elements.map((element) => (
                <motion.div
                  key={element.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "absolute cursor-move select-none",
                    selectedElement === element.id && "ring-2 ring-blue-500"
                  )}
                  style={{
                    left: element.x * config.zoom,
                    top: element.y * config.zoom,
                    width: element.width * config.zoom,
                    height: element.height * config.zoom,
                  }}
                  onMouseDown={(e) => startDrag(e, element.id)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedElement(element.id);
                  }}
                >
                  {element.type === "rectangle" && (
                    <div
                      className="h-full w-full border-2 border-dashed"
                      style={{
                        backgroundColor: element.fill,
                        borderColor: element.stroke,
                      }}
                    />
                  )}

                  {element.type === "circle" && (
                    <div
                      className="h-full w-full rounded-full border-2 border-dashed"
                      style={{
                        backgroundColor: element.fill,
                        borderColor: element.stroke,
                      }}
                    />
                  )}

                  {element.type === "text" && (
                    <div
                      className="flex h-full w-full items-center justify-center text-sm font-medium"
                      style={{ color: element.fill }}
                    >
                      {element.content}
                    </div>
                  )}

                  {element.type === "button" && (
                    <div
                      className="flex h-full w-full items-center justify-center rounded border-2 text-sm font-medium"
                      style={{
                        backgroundColor: element.fill,
                        borderColor: element.stroke,
                      }}
                    >
                      {element.content}
                    </div>
                  )}

                  {element.type === "input" && (
                    <div
                      className="flex h-full w-full items-center border-2 px-2 text-xs text-muted-foreground"
                      style={{
                        backgroundColor: element.fill,
                        borderColor: element.stroke,
                      }}
                    >
                      {element.content}
                    </div>
                  )}

                  {element.type === "image" && (
                    <div
                      className="flex h-full w-full items-center justify-center border-2 border-dashed"
                      style={{
                        backgroundColor: element.fill,
                        borderColor: element.stroke,
                      }}
                    >
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  {element.type === "line" && (
                    <div
                      className="h-full w-full border-t-2"
                      style={{ borderColor: element.stroke }}
                    />
                  )}

                  {selectedElement === element.id && (
                    <>
                      <div className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-blue-500" />
                      <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500" />
                      <div className="absolute -bottom-1 -left-1 h-2 w-2 rounded-full bg-blue-500" />
                      <div className="absolute -bottom-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Properties Panel */}
        <AnimatePresence>
          {selectedElementData && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "auto", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden border-l bg-muted/30 @lg:block"
            >
              <div className="w-48 space-y-4 p-4">
                <div>
                  <h3 className="mb-2 font-semibold">Properties</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedElementData.type.charAt(0).toUpperCase() +
                      selectedElementData.type.slice(1)}
                  </p>
                </div>

                {(selectedElementData.type === "text" ||
                  selectedElementData.type === "button" ||
                  selectedElementData.type === "input") && (
                  <div className="space-y-2">
                    <Label className="text-xs">Content</Label>
                    <Input
                      value={selectedElementData.content || ""}
                      onChange={(e) => updateElement({ content: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Width</Label>
                    <Input
                      type="number"
                      value={selectedElementData.width}
                      onChange={(e) =>
                        updateElement({ width: parseInt(e.target.value) || 0 })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Height</Label>
                    <Input
                      type="number"
                      value={selectedElementData.height}
                      onChange={(e) =>
                        updateElement({ height: parseInt(e.target.value) || 0 })
                      }
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {selectedElementData.fill !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Fill</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedElementData.fill || "#ffffff"}
                        onChange={(e) => updateElement({ fill: e.target.value })}
                        className="h-8 w-12 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={selectedElementData.fill || "#ffffff"}
                        onChange={(e) => updateElement({ fill: e.target.value })}
                        className="h-8 flex-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                {selectedElementData.stroke !== "none" && (
                  <div className="space-y-2">
                    <Label className="text-xs">Stroke</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={selectedElementData.stroke || "#666666"}
                        onChange={(e) => updateElement({ stroke: e.target.value })}
                        className="h-8 w-12 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={selectedElementData.stroke || "#666666"}
                        onChange={(e) => updateElement({ stroke: e.target.value })}
                        className="h-8 flex-1 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx global>{`
        .bg-grid {
          background-image:
            linear-gradient(to right, rgb(229 231 235 / 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(229 231 235 / 0.3) 1px, transparent 1px);
        }

        [data-theme="dark"] .bg-grid {
          background-image:
            linear-gradient(to right, rgb(39 39 42 / 0.5) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(39 39 42 / 0.5) 1px, transparent 1px);
        }
      `}</style>
    </div>
  );
}
