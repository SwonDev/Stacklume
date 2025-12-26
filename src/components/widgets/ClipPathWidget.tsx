"use client";

import { useState, useMemo, useRef, useEffect } from "react";
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
import {
  Scissors,
  Copy,
  Check,
  Plus,
  Trash2,
  Circle,
  Triangle,
  Pentagon,
  Hexagon,
  Star,
  ArrowLeft,
  ArrowRight,
  MessageSquare,
  Heart,
  Square,
  Diamond,
  ChevronRight,
  X as CrossIcon,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

interface ClipPathWidgetProps {
  widget: Widget;
}

interface Point {
  id: string;
  x: number;
  y: number;
}

type ShapeType = "circle" | "ellipse" | "inset" | "polygon";
type UnitType = "%" | "px";

// Polygon presets
const POLYGON_PRESETS = [
  {
    name: "Triangle",
    icon: Triangle,
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 },
    ],
  },
  {
    name: "Diamond",
    icon: Diamond,
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 50 },
      { x: 50, y: 100 },
      { x: 0, y: 50 },
    ],
  },
  {
    name: "Pentagon",
    icon: Pentagon,
    points: [
      { x: 50, y: 0 },
      { x: 100, y: 38 },
      { x: 82, y: 100 },
      { x: 18, y: 100 },
      { x: 0, y: 38 },
    ],
  },
  {
    name: "Hexagon",
    icon: Hexagon,
    points: [
      { x: 50, y: 0 },
      { x: 95, y: 25 },
      { x: 95, y: 75 },
      { x: 50, y: 100 },
      { x: 5, y: 75 },
      { x: 5, y: 25 },
    ],
  },
  {
    name: "Star",
    icon: Star,
    points: [
      { x: 50, y: 0 },
      { x: 61, y: 35 },
      { x: 98, y: 35 },
      { x: 68, y: 57 },
      { x: 79, y: 91 },
      { x: 50, y: 70 },
      { x: 21, y: 91 },
      { x: 32, y: 57 },
      { x: 2, y: 35 },
      { x: 39, y: 35 },
    ],
  },
  {
    name: "Arrow Left",
    icon: ArrowLeft,
    points: [
      { x: 40, y: 0 },
      { x: 40, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 60 },
      { x: 40, y: 60 },
      { x: 40, y: 100 },
      { x: 0, y: 50 },
    ],
  },
  {
    name: "Arrow Right",
    icon: ArrowRight,
    points: [
      { x: 0, y: 40 },
      { x: 60, y: 40 },
      { x: 60, y: 0 },
      { x: 100, y: 50 },
      { x: 60, y: 100 },
      { x: 60, y: 60 },
      { x: 0, y: 60 },
    ],
  },
  {
    name: "Chevron",
    icon: ChevronRight,
    points: [
      { x: 75, y: 0 },
      { x: 100, y: 50 },
      { x: 75, y: 100 },
      { x: 25, y: 100 },
      { x: 50, y: 50 },
      { x: 25, y: 0 },
    ],
  },
  {
    name: "Cross",
    icon: CrossIcon,
    points: [
      { x: 40, y: 0 },
      { x: 60, y: 0 },
      { x: 60, y: 40 },
      { x: 100, y: 40 },
      { x: 100, y: 60 },
      { x: 60, y: 60 },
      { x: 60, y: 100 },
      { x: 40, y: 100 },
      { x: 40, y: 60 },
      { x: 0, y: 60 },
      { x: 0, y: 40 },
      { x: 40, y: 40 },
    ],
  },
  {
    name: "Message Bubble",
    icon: MessageSquare,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 75 },
      { x: 25, y: 75 },
      { x: 15, y: 100 },
      { x: 15, y: 75 },
      { x: 0, y: 75 },
    ],
  },
  {
    name: "Heart",
    icon: Heart,
    points: [
      { x: 50, y: 100 },
      { x: 0, y: 50 },
      { x: 0, y: 30 },
      { x: 25, y: 0 },
      { x: 50, y: 20 },
      { x: 75, y: 0 },
      { x: 100, y: 30 },
      { x: 100, y: 50 },
    ],
  },
];

// Simple clip-path presets
const SIMPLE_PRESETS = [
  {
    name: "Circle",
    icon: Circle,
    type: "circle" as const,
    config: { radius: 50, x: 50, y: 50 },
  },
  {
    name: "Oval",
    icon: Circle,
    type: "ellipse" as const,
    config: { rx: 50, ry: 35, x: 50, y: 50 },
  },
  {
    name: "Rounded Square",
    icon: Square,
    type: "inset" as const,
    config: { top: 10, right: 10, bottom: 10, left: 10, radius: 20 },
  },
];

export function ClipPathWidget({ widget }: ClipPathWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Initialize from widget config
  const [shapeType, setShapeType] = useState<ShapeType>(
    (widget.config?.clipPathShape as ShapeType) || "circle"
  );
  const [unitType, setUnitType] = useState<UnitType>(
    (widget.config?.clipPathUnit as UnitType) || "%"
  );

  // Circle/Ellipse properties
  const [circleRadius, setCircleRadius] = useState<number>(
    widget.config?.clipPathCircleRadius || 50
  );
  const [circleX, setCircleX] = useState<number>(widget.config?.clipPathCircleX || 50);
  const [circleY, setCircleY] = useState<number>(widget.config?.clipPathCircleY || 50);
  const [ellipseRx, setEllipseRx] = useState<number>(widget.config?.clipPathEllipseRx || 50);
  const [ellipseRy, setEllipseRy] = useState<number>(widget.config?.clipPathEllipseRy || 35);

  // Inset properties
  const [insetTop, setInsetTop] = useState<number>(widget.config?.clipPathInsetTop || 10);
  const [insetRight, setInsetRight] = useState<number>(widget.config?.clipPathInsetRight || 10);
  const [insetBottom, setInsetBottom] = useState<number>(
    widget.config?.clipPathInsetBottom || 10
  );
  const [insetLeft, setInsetLeft] = useState<number>(widget.config?.clipPathInsetLeft || 10);
  const [insetRadius, setInsetRadius] = useState<number>(
    widget.config?.clipPathInsetRadius || 20
  );

  // Polygon properties
  const [polygonPoints, setPolygonPoints] = useState<Point[]>(() => {
    const savedPoints = widget.config?.clipPathPolygonPoints;
    if (savedPoints && Array.isArray(savedPoints)) {
      return savedPoints.map((p: { x: number; y: number }, idx: number) => ({
        id: `point-${idx}`,
        x: p.x,
        y: p.y,
      }));
    }
    return [
      { id: "point-0", x: 50, y: 0 },
      { id: "point-1", x: 100, y: 100 },
      { id: "point-2", x: 0, y: 100 },
    ];
  });

  // Background image option
  const [backgroundImage, setBackgroundImage] = useState<string>(
    widget.config?.clipPathBackgroundImage || ""
  );
  const [useImage, setUseImage] = useState<boolean>(widget.config?.clipPathUseImage || false);

  // UI states
  const [copied, setCopied] = useState(false);
  const [draggedPointId, setDraggedPointId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Generate clip-path CSS
  const clipPathCSS = useMemo(() => {
    const unit = unitType;

    switch (shapeType) {
      case "circle":
        return `clip-path: circle(${circleRadius}${unit} at ${circleX}${unit} ${circleY}${unit});`;

      case "ellipse":
        return `clip-path: ellipse(${ellipseRx}${unit} ${ellipseRy}${unit} at ${circleX}${unit} ${circleY}${unit});`;

      case "inset":
        return `clip-path: inset(${insetTop}${unit} ${insetRight}${unit} ${insetBottom}${unit} ${insetLeft}${unit} round ${insetRadius}${unit});`;

      case "polygon":
        const pointsStr = polygonPoints.map((p) => `${p.x}${unit} ${p.y}${unit}`).join(", ");
        return `clip-path: polygon(${pointsStr});`;

      default:
        return "";
    }
  }, [
    shapeType,
    unitType,
    circleRadius,
    circleX,
    circleY,
    ellipseRx,
    ellipseRy,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    insetRadius,
    polygonPoints,
  ]);

  // Save config
  const saveConfig = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        clipPathShape: shapeType,
        clipPathUnit: unitType,
        clipPathCircleRadius: circleRadius,
        clipPathCircleX: circleX,
        clipPathCircleY: circleY,
        clipPathEllipseRx: ellipseRx,
        clipPathEllipseRy: ellipseRy,
        clipPathInsetTop: insetTop,
        clipPathInsetRight: insetRight,
        clipPathInsetBottom: insetBottom,
        clipPathInsetLeft: insetLeft,
        clipPathInsetRadius: insetRadius,
        clipPathPolygonPoints: polygonPoints.map((p) => ({ x: p.x, y: p.y })),
        clipPathBackgroundImage: backgroundImage,
        clipPathUseImage: useImage,
      },
    });
  };

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(saveConfig, 300);
    return () => clearTimeout(timer);
  }, [
    shapeType,
    unitType,
    circleRadius,
    circleX,
    circleY,
    ellipseRx,
    ellipseRy,
    insetTop,
    insetRight,
    insetBottom,
    insetLeft,
    insetRadius,
    polygonPoints,
    backgroundImage,
    useImage,
  ]);

  const handleCopyCSS = async () => {
    await navigator.clipboard.writeText(clipPathCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Polygon point management
  const handleAddPoint = () => {
    const newPoint: Point = {
      id: `point-${Date.now()}`,
      x: 50,
      y: 50,
    };
    setPolygonPoints([...polygonPoints, newPoint]);
  };

  const handleRemovePoint = (id: string) => {
    if (polygonPoints.length <= 3) return; // Keep at least 3 points
    setPolygonPoints(polygonPoints.filter((p) => p.id !== id));
  };

  const handlePointDragStart = (id: string) => {
    setDraggedPointId(id);
  };

  const handlePointDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedPointId || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    setPolygonPoints(
      polygonPoints.map((p) =>
        p.id === draggedPointId
          ? {
              ...p,
              x: Math.max(0, Math.min(100, x)),
              y: Math.max(0, Math.min(100, y)),
            }
          : p
      )
    );
  };

  const handlePointDragEnd = () => {
    setDraggedPointId(null);
  };

  // Apply polygon preset
  const applyPolygonPreset = (preset: typeof POLYGON_PRESETS[0]) => {
    const newPoints = preset.points.map((p, idx) => ({
      id: `point-${Date.now()}-${idx}`,
      x: p.x,
      y: p.y,
    }));
    setPolygonPoints(newPoints);
    setShapeType("polygon");
  };

  // Apply simple preset
  const applySimplePreset = (preset: typeof SIMPLE_PRESETS[0]) => {
    setShapeType(preset.type);
    if (preset.type === "circle") {
      setCircleRadius(preset.config.radius);
      setCircleX(preset.config.x);
      setCircleY(preset.config.y);
    } else if (preset.type === "ellipse") {
      setEllipseRx(preset.config.rx);
      setEllipseRy(preset.config.ry);
      setCircleX(preset.config.x);
      setCircleY(preset.config.y);
    } else if (preset.type === "inset") {
      setInsetTop(preset.config.top);
      setInsetRight(preset.config.right);
      setInsetBottom(preset.config.bottom);
      setInsetLeft(preset.config.left);
      setInsetRadius(preset.config.radius);
    }
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3 @md:gap-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
            <Scissors className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
          </div>
          <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
            CSS Clip-Path Generator
          </h3>
        </div>

        {/* Live Preview */}
        <div
          ref={previewRef}
          className="relative w-full aspect-square @md:aspect-[4/3] rounded-lg border border-border overflow-hidden shadow-sm bg-muted"
          onMouseMove={shapeType === "polygon" && draggedPointId ? handlePointDrag : undefined}
          onMouseUp={handlePointDragEnd}
          onMouseLeave={handlePointDragEnd}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-4 @sm:inset-6 @md:inset-8"
            style={{
              clipPath:
                shapeType === "circle"
                  ? `circle(${circleRadius}% at ${circleX}% ${circleY}%)`
                  : shapeType === "ellipse"
                  ? `ellipse(${ellipseRx}% ${ellipseRy}% at ${circleX}% ${circleY}%)`
                  : shapeType === "inset"
                  ? `inset(${insetTop}% ${insetRight}% ${insetBottom}% ${insetLeft}% round ${insetRadius}%)`
                  : shapeType === "polygon"
                  ? `polygon(${polygonPoints.map((p) => `${p.x}% ${p.y}%`).join(", ")})`
                  : undefined,
              background: useImage && backgroundImage
                ? `url(${backgroundImage})`
                : "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.6) 100%)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />

          {/* Polygon point indicators */}
          {shapeType === "polygon" &&
            polygonPoints.map((point) => (
              <motion.div
                key={point.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute w-3 h-3 @sm:w-4 @sm:h-4 -translate-x-1/2 -translate-y-1/2 bg-primary rounded-full border-2 border-background cursor-move hover:scale-125 transition-transform z-10"
                style={{
                  left: `${point.x}%`,
                  top: `${point.y}%`,
                }}
                onMouseDown={() => handlePointDragStart(point.id)}
              />
            ))}
        </div>

        {/* Tabs for Controls and Presets */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-7 @sm:h-8 @md:h-9">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs @md:text-sm">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs @md:text-sm">
              Presets
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="controls"
            className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 @md:space-y-4 mt-2 @sm:mt-3"
          >
            {/* Shape Type */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Shape Type</Label>
              <Select
                value={shapeType}
                onValueChange={(value) => setShapeType(value as ShapeType)}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="circle">Circle</SelectItem>
                  <SelectItem value="ellipse">Ellipse</SelectItem>
                  <SelectItem value="inset">Inset</SelectItem>
                  <SelectItem value="polygon">Polygon</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Unit Type */}
            <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
              <Label className="text-[10px] @sm:text-xs @md:text-sm">Unit Type</Label>
              <Select
                value={unitType}
                onValueChange={(value) => setUnitType(value as UnitType)}
              >
                <SelectTrigger className="h-7 @sm:h-8 @md:h-9 text-[10px] @sm:text-xs @md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="%">Percentage (%)</SelectItem>
                  <SelectItem value="px">Pixels (px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Circle Controls */}
            {shapeType === "circle" && (
              <>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Radius</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {circleRadius}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[circleRadius]}
                    onValueChange={(v) => setCircleRadius(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Position X</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {circleX}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[circleX]}
                    onValueChange={(v) => setCircleX(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Position Y</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {circleY}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[circleY]}
                    onValueChange={(v) => setCircleY(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
              </>
            )}

            {/* Ellipse Controls */}
            {shapeType === "ellipse" && (
              <>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Radius X</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {ellipseRx}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[ellipseRx]}
                    onValueChange={(v) => setEllipseRx(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Radius Y</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {ellipseRy}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[ellipseRy]}
                    onValueChange={(v) => setEllipseRy(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Position X</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {circleX}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[circleX]}
                    onValueChange={(v) => setCircleX(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Position Y</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {circleY}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[circleY]}
                    onValueChange={(v) => setCircleY(v[0])}
                    min={0}
                    max={unitType === "%" ? 100 : 500}
                    step={1}
                  />
                </div>
              </>
            )}

            {/* Inset Controls */}
            {shapeType === "inset" && (
              <>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Top</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {insetTop}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[insetTop]}
                    onValueChange={(v) => setInsetTop(v[0])}
                    min={0}
                    max={unitType === "%" ? 50 : 250}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Right</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {insetRight}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[insetRight]}
                    onValueChange={(v) => setInsetRight(v[0])}
                    min={0}
                    max={unitType === "%" ? 50 : 250}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Bottom</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {insetBottom}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[insetBottom]}
                    onValueChange={(v) => setInsetBottom(v[0])}
                    min={0}
                    max={unitType === "%" ? 50 : 250}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Left</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {insetLeft}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[insetLeft]}
                    onValueChange={(v) => setInsetLeft(v[0])}
                    min={0}
                    max={unitType === "%" ? 50 : 250}
                    step={1}
                  />
                </div>
                <div className="space-y-1 @sm:space-y-1.5 @md:space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] @sm:text-xs @md:text-sm">Border Radius</Label>
                    <span className="text-[10px] @sm:text-xs @md:text-sm text-muted-foreground font-mono">
                      {insetRadius}
                      {unitType}
                    </span>
                  </div>
                  <Slider
                    value={[insetRadius]}
                    onValueChange={(v) => setInsetRadius(v[0])}
                    min={0}
                    max={unitType === "%" ? 50 : 100}
                    step={1}
                  />
                </div>
              </>
            )}

            {/* Polygon Controls */}
            {shapeType === "polygon" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] @sm:text-xs @md:text-sm">
                    Points ({polygonPoints.length})
                  </Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddPoint}
                    className="h-6 @sm:h-7 px-2 text-[10px] @sm:text-xs"
                  >
                    <Plus className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
                <p className="text-[10px] @sm:text-xs text-muted-foreground">
                  Drag points on the preview to position them
                </p>
                <div className="space-y-2 max-h-32 @sm:max-h-40 overflow-y-auto">
                  <AnimatePresence mode="popLayout">
                    {polygonPoints.map((point, idx) => (
                      <motion.div
                        key={point.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-2 text-[10px] @sm:text-xs font-mono"
                      >
                        <span className="w-4 text-muted-foreground">#{idx + 1}</span>
                        <span className="flex-1">
                          {point.x.toFixed(0)}%, {point.y.toFixed(0)}%
                        </span>
                        {polygonPoints.length > 3 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemovePoint(point.id)}
                            className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Background Image Option */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Use Background Image</Label>
                <Switch checked={useImage} onCheckedChange={setUseImage} />
              </div>
              {useImage && (
                <div className="space-y-1">
                  <Label className="text-[10px] @sm:text-xs @md:text-sm">Image URL</Label>
                  <div className="flex gap-2">
                    <Input
                      value={backgroundImage}
                      onChange={(e) => setBackgroundImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="h-7 @sm:h-8 text-[10px] @sm:text-xs flex-1"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 @sm:h-8 px-2"
                      title="Insert sample image"
                      onClick={() =>
                        setBackgroundImage(
                          "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400"
                        )
                      }
                    >
                      <ImageIcon className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2 @sm:mt-3">
            <div className="space-y-3 @sm:space-y-4">
              {/* Simple Presets */}
              <div className="space-y-2">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Simple Shapes</Label>
                <div className="grid grid-cols-3 gap-2">
                  {SIMPLE_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <motion.button
                        key={preset.name}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => applySimplePreset(preset)}
                        className="flex flex-col items-center gap-1.5 p-2 @sm:p-3 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <Icon className="w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 text-primary" />
                        <span className="text-[9px] @sm:text-[10px] @md:text-xs font-medium text-center">
                          {preset.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Polygon Presets */}
              <div className="space-y-2">
                <Label className="text-[10px] @sm:text-xs @md:text-sm">Polygon Shapes</Label>
                <div className="grid grid-cols-3 gap-2">
                  {POLYGON_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    return (
                      <motion.button
                        key={preset.name}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => applyPolygonPreset(preset)}
                        className="flex flex-col items-center gap-1.5 p-2 @sm:p-3 rounded-lg border border-border hover:border-primary transition-colors"
                      >
                        <Icon className="w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 text-primary" />
                        <span className="text-[9px] @sm:text-[10px] @md:text-xs font-medium text-center">
                          {preset.name}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* CSS Output & Copy Button */}
        <div className="space-y-2">
          <div className="rounded-lg bg-muted/50 p-2 @sm:p-3 border border-border">
            <code className="text-[9px] @sm:text-[10px] @md:text-xs font-mono text-foreground break-all">
              {clipPathCSS}
            </code>
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
      </div>
    </div>
  );
}
