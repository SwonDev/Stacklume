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
  Spline,
  Copy,
  Check,
  Download,
  Play,
  Pause,
  RefreshCw,
  Grid3x3,
  Move,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { Switch } from "@/components/ui/switch";

interface BezierCurveWidgetProps {
  widget: Widget;
}

interface Point {
  id: string;
  x: number;
  y: number;
}

type ExportFormat = "points" | "svg" | "bezier" | "code";

// Preset curves
const CURVE_PRESETS = [
  {
    name: "Linear",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 33, y: 67 },
      { x: 67, y: 33 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "Ease In",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 42, y: 100 },
      { x: 100, y: 58 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "Ease Out",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 0, y: 42 },
      { x: 58, y: 0 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "Ease In-Out",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 42, y: 100 },
      { x: 58, y: 0 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "S-Curve",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 25, y: 75 },
      { x: 75, y: 25 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "Bounce",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 50, y: 150 },
      { x: 80, y: -20 },
      { x: 100, y: 0 },
    ],
  },
  {
    name: "Elastic",
    type: "cubic" as const,
    points: [
      { x: 0, y: 100 },
      { x: 20, y: 120 },
      { x: 100, y: -10 },
      { x: 100, y: 0 },
    ],
  },
];

interface BezierConfig {
  bezierCurveType?: "quadratic" | "cubic";
  bezierPoints?: Array<{ x: number; y: number }>;
  bezierShowGrid?: boolean;
  bezierSnapToGrid?: boolean;
  bezierShowHandles?: boolean;
  bezierShowTangents?: boolean;
  bezierSampleCount?: number;
}

const DEFAULT_POINTS = [
  { x: 0, y: 100 },
  { x: 33, y: 67 },
  { x: 67, y: 33 },
  { x: 100, y: 0 },
];

export function BezierCurveWidget({ widget }: BezierCurveWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const config = (widget.config || {}) as BezierConfig;

  // Initialize from widget config
  const initialCurveType = config.bezierCurveType || "cubic";
  const initialPoints = config.bezierPoints || DEFAULT_POINTS;

  const [curveType, setCurveType] = useState<"quadratic" | "cubic">(initialCurveType);
  const [points, setPoints] = useState<Point[]>(
    initialPoints.map((p, i) => ({
      id: `point-${i}`,
      x: p.x,
      y: p.y,
    }))
  );
  const [showGrid, setShowGrid] = useState(config.bezierShowGrid !== false);
  const [snapToGrid, setSnapToGrid] = useState(config.bezierSnapToGrid !== false);
  const [showHandles, setShowHandles] = useState(config.bezierShowHandles !== false);
  const [showTangents, setShowTangents] = useState(config.bezierShowTangents || false);
  const [animationT, setAnimationT] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sampleCount, setSampleCount] = useState(config.bezierSampleCount || 50);
  const [copied, setCopied] = useState(false);
  const [draggedPoint, setDraggedPoint] = useState<string | null>(null);

  // Save config
  const saveConfig = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        bezierCurveType: curveType,
        bezierPoints: points.map((p) => ({ x: p.x, y: p.y })),
        bezierShowGrid: showGrid,
        bezierSnapToGrid: snapToGrid,
        bezierShowHandles: showHandles,
        bezierShowTangents: showTangents,
        bezierSampleCount: sampleCount,
      },
    });
  };

  useEffect(() => {
    saveConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curveType, points, showGrid, snapToGrid, showHandles, showTangents, sampleCount]);

  // Animation loop
  useEffect(() => {
    if (!isAnimating) return;

    const interval = setInterval(() => {
      setAnimationT((prev) => {
        if (prev >= 1) {
          setIsAnimating(false);
          return 0;
        }
        return prev + 0.01;
      });
    }, 30);

    return () => clearInterval(interval);
  }, [isAnimating]);

  // Calculate point on bezier curve at t
  const getPointOnCurve = (t: number): { x: number; y: number } => {
    if (curveType === "quadratic" && points.length >= 3) {
      const [p0, p1, p2] = points;
      const x = (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t ** 2 * p2.x;
      const y = (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t ** 2 * p2.y;
      return { x, y };
    } else if (curveType === "cubic" && points.length >= 4) {
      const [p0, p1, p2, p3] = points;
      const x =
        (1 - t) ** 3 * p0.x +
        3 * (1 - t) ** 2 * t * p1.x +
        3 * (1 - t) * t ** 2 * p2.x +
        t ** 3 * p3.x;
      const y =
        (1 - t) ** 3 * p0.y +
        3 * (1 - t) ** 2 * t * p1.y +
        3 * (1 - t) * t ** 2 * p2.y +
        t ** 3 * p3.y;
      return { x, y };
    }
    return { x: 0, y: 0 };
  };

  // Calculate tangent vector at t
  const getTangentAtT = (t: number): { x: number; y: number } => {
    if (curveType === "quadratic" && points.length >= 3) {
      const [p0, p1, p2] = points;
      const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
      const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
      const length = Math.sqrt(x * x + y * y);
      return { x: x / length, y: y / length };
    } else if (curveType === "cubic" && points.length >= 4) {
      const [p0, p1, p2, p3] = points;
      const x =
        3 * (1 - t) ** 2 * (p1.x - p0.x) +
        6 * (1 - t) * t * (p2.x - p1.x) +
        3 * t ** 2 * (p3.x - p2.x);
      const y =
        3 * (1 - t) ** 2 * (p1.y - p0.y) +
        6 * (1 - t) * t * (p2.y - p1.y) +
        3 * t ** 2 * (p3.y - p2.y);
      const length = Math.sqrt(x * x + y * y);
      return { x: x / length, y: y / length };
    }
    return { x: 0, y: 0 };
  };

  // Sample points along curve
  const sampleCurve = useMemo(() => {
    const samples: { x: number; y: number }[] = [];
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      samples.push(getPointOnCurve(t));
    }
    return samples;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, curveType, sampleCount]);

  // Draw on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw grid
    if (showGrid) {
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 0.5;
      for (let i = 0; i <= 10; i++) {
        const x = (i / 10) * width;
        const y = (i / 10) * height;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }

    // Draw curve
    ctx.strokeStyle = "#3B82F6";
    ctx.lineWidth = 2;
    ctx.beginPath();
    sampleCurve.forEach((point, index) => {
      const x = (point.x / 100) * width;
      const y = (point.y / 100) * height;
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw control handles
    if (showHandles) {
      ctx.strokeStyle = "#64748B";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      if (curveType === "quadratic" && points.length >= 3) {
        const [p0, p1, p2] = points;
        ctx.beginPath();
        ctx.moveTo((p0.x / 100) * width, (p0.y / 100) * height);
        ctx.lineTo((p1.x / 100) * width, (p1.y / 100) * height);
        ctx.lineTo((p2.x / 100) * width, (p2.y / 100) * height);
        ctx.stroke();
      } else if (curveType === "cubic" && points.length >= 4) {
        const [p0, p1, p2, p3] = points;
        ctx.beginPath();
        ctx.moveTo((p0.x / 100) * width, (p0.y / 100) * height);
        ctx.lineTo((p1.x / 100) * width, (p1.y / 100) * height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo((p2.x / 100) * width, (p2.y / 100) * height);
        ctx.lineTo((p3.x / 100) * width, (p3.y / 100) * height);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw control points
    points.forEach((point, index) => {
      const x = (point.x / 100) * width;
      const y = (point.y / 100) * height;

      ctx.fillStyle = index === 0 || index === points.length - 1 ? "#3B82F6" : "#8B5CF6";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw animation point and tangent
    if (isAnimating || animationT > 0) {
      const animPoint = getPointOnCurve(animationT);
      const x = (animPoint.x / 100) * width;
      const y = (animPoint.y / 100) * height;

      // Animated point
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tangent vector
      if (showTangents) {
        const tangent = getTangentAtT(animationT);
        const tangentLength = 30;
        ctx.strokeStyle = "#F59E0B";
        ctx.lineWidth = 2;
        ctx.setLineDash([]);

        // Tangent line
        ctx.beginPath();
        ctx.moveTo(x - tangent.x * tangentLength, y - tangent.y * tangentLength);
        ctx.lineTo(x + tangent.x * tangentLength, y + tangent.y * tangentLength);
        ctx.stroke();

        // Normal line
        ctx.strokeStyle = "#10B981";
        ctx.beginPath();
        ctx.moveTo(x - tangent.y * tangentLength, y + tangent.x * tangentLength);
        ctx.lineTo(x + tangent.y * tangentLength, y - tangent.x * tangentLength);
        ctx.stroke();
      }

      // T value label
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "12px monospace";
      ctx.fillText(`t = ${animationT.toFixed(2)}`, x + 12, y - 12);
    }
  }, [points, showGrid, showHandles, showTangents, sampleCurve, animationT, isAnimating, curveType]);

  // Handle canvas mouse interactions
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Find closest point
    const threshold = 5;
    const closestPoint = points.find((p) => {
      const distance = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
      return distance < threshold;
    });

    if (closestPoint) {
      setDraggedPoint(closestPoint.id);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!draggedPoint) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    // Snap to grid
    if (snapToGrid) {
      x = Math.round(x / 10) * 10;
      y = Math.round(y / 10) * 10;
    }

    // Clamp values
    x = Math.max(0, Math.min(100, x));
    y = Math.max(-20, Math.min(120, y)); // Allow some overflow for bounce effects

    setPoints((prev) => prev.map((p) => (p.id === draggedPoint ? { ...p, x, y } : p)));
  };

  const handleCanvasMouseUp = () => {
    setDraggedPoint(null);
  };

  // Export functions
  const exportAsPoints = () => {
    return JSON.stringify(sampleCurve, null, 2);
  };

  const exportAsSVG = () => {
    let pathData = "";
    if (curveType === "quadratic" && points.length >= 3) {
      const [p0, p1, p2] = points;
      pathData = `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`;
    } else if (curveType === "cubic" && points.length >= 4) {
      const [p0, p1, p2, p3] = points;
      pathData = `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y} ${p2.x} ${p2.y} ${p3.x} ${p3.y}`;
    }
    return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">\n  <path d="${pathData}" fill="none" stroke="currentColor" stroke-width="2" />\n</svg>`;
  };

  const exportAsBezier = () => {
    return JSON.stringify(
      {
        type: curveType,
        controlPoints: points.map((p) => ({ x: p.x, y: p.y })),
      },
      null,
      2
    );
  };

  const exportAsCode = () => {
    const pointsStr = points.map((p) => `{ x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)} }`).join(",\n  ");
    return `// Bezier ${curveType} curve\nconst bezierPoints = [\n  ${pointsStr}\n];\n\n// Calculate point at t (0-1)\nfunction getPointOnCurve(t: number) {\n${curveType === "cubic" ? "  // Cubic Bezier formula\n  const [p0, p1, p2, p3] = bezierPoints;\n  return {\n    x: Math.pow(1-t, 3) * p0.x + 3 * Math.pow(1-t, 2) * t * p1.x + 3 * (1-t) * Math.pow(t, 2) * p2.x + Math.pow(t, 3) * p3.x,\n    y: Math.pow(1-t, 3) * p0.y + 3 * Math.pow(1-t, 2) * t * p1.y + 3 * (1-t) * Math.pow(t, 2) * p2.y + Math.pow(t, 3) * p3.y\n  };" : "  // Quadratic Bezier formula\n  const [p0, p1, p2] = bezierPoints;\n  return {\n    x: Math.pow(1-t, 2) * p0.x + 2 * (1-t) * t * p1.x + Math.pow(t, 2) * p2.x,\n    y: Math.pow(1-t, 2) * p0.y + 2 * (1-t) * t * p1.y + Math.pow(t, 2) * p2.y\n  };"}\n}`;
  };

  const handleExport = async (format: ExportFormat) => {
    let content = "";
    switch (format) {
      case "points":
        content = exportAsPoints();
        break;
      case "svg":
        content = exportAsSVG();
        break;
      case "bezier":
        content = exportAsBezier();
        break;
      case "code":
        content = exportAsCode();
        break;
    }

    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: ExportFormat) => {
    let content = "";
    let filename = "";
    let mimeType = "text/plain";

    switch (format) {
      case "points":
        content = exportAsPoints();
        filename = "bezier-points.json";
        mimeType = "application/json";
        break;
      case "svg":
        content = exportAsSVG();
        filename = "bezier-curve.svg";
        mimeType = "image/svg+xml";
        break;
      case "bezier":
        content = exportAsBezier();
        filename = "bezier-data.json";
        mimeType = "application/json";
        break;
      case "code":
        content = exportAsCode();
        filename = "bezier-code.ts";
        mimeType = "text/typescript";
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (preset: typeof CURVE_PRESETS[0]) => {
    const newPoints = preset.points.map((p, i) => ({
      id: `point-${i}`,
      x: p.x,
      y: p.y,
    }));
    setCurveType(preset.type);
    setPoints(newPoints);
  };

  const handleReset = () => {
    const defaultPoints =
      curveType === "cubic"
        ? [
            { id: "point-0", x: 0, y: 100 },
            { id: "point-1", x: 33, y: 67 },
            { id: "point-2", x: 67, y: 33 },
            { id: "point-3", x: 100, y: 0 },
          ]
        : [
            { id: "point-0", x: 0, y: 100 },
            { id: "point-1", x: 50, y: 0 },
            { id: "point-2", x: 100, y: 100 },
          ];
    setPoints(defaultPoints);
  };

  // Calculate approximate curve length
  const curveLength = useMemo(() => {
    let length = 0;
    for (let i = 1; i < sampleCurve.length; i++) {
      const dx = sampleCurve[i].x - sampleCurve[i - 1].x;
      const dy = sampleCurve[i].y - sampleCurve[i - 1].y;
      length += Math.sqrt(dx * dx + dy * dy);
    }
    return length.toFixed(2);
  }, [sampleCurve]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-6 h-6 @sm:w-7 @sm:h-7 @md:w-8 @md:h-8 rounded-lg bg-primary/10">
              <Spline className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 @md:w-4 @md:h-4 text-primary" />
            </div>
            <h3 className="text-xs @sm:text-sm @md:text-base font-semibold text-foreground">
              Bezier Curve Editor
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsAnimating(!isAnimating)}
              className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
            >
              {isAnimating ? (
                <Pause className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              ) : (
                <Play className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className="h-6 @sm:h-7 w-6 @sm:w-7 p-0"
            >
              <RefreshCw className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="relative w-full aspect-square rounded-lg border border-border overflow-hidden bg-slate-900">
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
          />
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 text-[10px] @sm:text-xs">
          <div className="flex items-center justify-between px-2 py-1 rounded bg-muted">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-medium capitalize">{curveType}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded bg-muted">
            <span className="text-muted-foreground">Length:</span>
            <span className="font-medium font-mono">{curveLength}</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="controls" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3 h-7 @sm:h-8">
            <TabsTrigger value="controls" className="text-[10px] @sm:text-xs">
              Controls
            </TabsTrigger>
            <TabsTrigger value="presets" className="text-[10px] @sm:text-xs">
              Presets
            </TabsTrigger>
            <TabsTrigger value="export" className="text-[10px] @sm:text-xs">
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="controls" className="flex-1 overflow-y-auto space-y-2 @sm:space-y-3 mt-2">
            {/* Curve Type */}
            <div className="space-y-1 @sm:space-y-1.5">
              <Label className="text-[10px] @sm:text-xs">Curve Type</Label>
              <Select
                value={curveType}
                onValueChange={(value) => {
                  const newType = value as "quadratic" | "cubic";
                  setCurveType(newType);
                  if (newType === "quadratic" && points.length > 3) {
                    setPoints(points.slice(0, 3));
                  } else if (newType === "cubic" && points.length < 4) {
                    setPoints([...points, { id: `point-${points.length}`, x: 100, y: 0 }]);
                  }
                }}
              >
                <SelectTrigger className="h-7 @sm:h-8 text-[10px] @sm:text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quadratic">Quadratic (3 points)</SelectItem>
                  <SelectItem value="cubic">Cubic (4 points)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sample Count */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Sample Points</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {sampleCount}
                </span>
              </div>
              <Slider
                value={[sampleCount]}
                onValueChange={([value]) => setSampleCount(value)}
                min={10}
                max={100}
                step={5}
              />
            </div>

            {/* Display Options */}
            <div className="space-y-2">
              <Label className="text-[10px] @sm:text-xs">Display Options</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Grid3x3 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-muted-foreground" />
                    <span className="text-[10px] @sm:text-xs">Show Grid</span>
                  </div>
                  <Switch checked={showGrid} onCheckedChange={setShowGrid} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Move className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-muted-foreground" />
                    <span className="text-[10px] @sm:text-xs">Snap to Grid</span>
                  </div>
                  <Switch checked={snapToGrid} onCheckedChange={setSnapToGrid} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Spline className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-muted-foreground" />
                    <span className="text-[10px] @sm:text-xs">Show Handles</span>
                  </div>
                  <Switch checked={showHandles} onCheckedChange={setShowHandles} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 @sm:w-3.5 @sm:h-3.5 text-muted-foreground" />
                    <span className="text-[10px] @sm:text-xs">Show Tangents</span>
                  </div>
                  <Switch checked={showTangents} onCheckedChange={setShowTangents} />
                </div>
              </div>
            </div>

            {/* Animation T Slider */}
            <div className="space-y-1 @sm:space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[10px] @sm:text-xs">Position (t)</Label>
                <span className="text-[10px] @sm:text-xs text-muted-foreground font-mono">
                  {animationT.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[animationT]}
                onValueChange={([value]) => setAnimationT(value)}
                min={0}
                max={1}
                step={0.01}
              />
            </div>
          </TabsContent>

          <TabsContent value="presets" className="flex-1 overflow-y-auto mt-2">
            <div className="grid grid-cols-2 gap-2 @sm:gap-2.5">
              {CURVE_PRESETS.map((preset) => (
                <motion.button
                  key={preset.name}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => applyPreset(preset)}
                  className="relative aspect-square rounded-lg border border-border overflow-hidden group cursor-pointer bg-slate-900 p-2"
                >
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
                  <svg
                    viewBox="0 0 100 100"
                    className="w-full h-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {preset.type === "cubic" ? (
                      <path
                        d={`M ${preset.points[0].x} ${preset.points[0].y} C ${preset.points[1].x} ${preset.points[1].y} ${preset.points[2].x} ${preset.points[2].y} ${preset.points[3].x} ${preset.points[3].y}`}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                      />
                    ) : (
                      <path
                        d={`M ${preset.points[0].x} ${preset.points[0].y} Q ${preset.points[1].x} ${preset.points[1].y} ${preset.points[2].x} ${preset.points[2].y}`}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2"
                      />
                    )}
                  </svg>
                  <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-[10px] @sm:text-xs font-medium text-white bg-black/50 px-2 py-1 rounded">
                      {preset.name}
                    </span>
                  </div>
                </motion.button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="export" className="flex-1 overflow-y-auto space-y-2 mt-2">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("points")}
                  className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
                >
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy Points
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload("points")}
                  className="h-7 @sm:h-8 w-7 @sm:w-8 p-0"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("svg")}
                  className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
                >
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy SVG
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload("svg")}
                  className="h-7 @sm:h-8 w-7 @sm:w-8 p-0"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("bezier")}
                  className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
                >
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy Bezier
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload("bezier")}
                  className="h-7 @sm:h-8 w-7 @sm:w-8 p-0"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport("code")}
                  className="flex-1 h-7 @sm:h-8 text-[10px] @sm:text-xs"
                >
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy Code
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload("code")}
                  className="h-7 @sm:h-8 w-7 @sm:w-8 p-0"
                >
                  <Download className="w-3 h-3" />
                </Button>
              </div>

              {copied && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center gap-2 p-2 rounded bg-primary/10 text-primary"
                >
                  <Check className="w-4 h-4" />
                  <span className="text-xs font-medium">Copied to clipboard!</span>
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
