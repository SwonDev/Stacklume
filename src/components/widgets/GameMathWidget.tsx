"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calculator, Copy, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface GameMathWidgetProps {
  widget: Widget;
}

// Game dev constants
const MATH_CONSTANTS = {
  PI: Math.PI,
  TAU: Math.PI * 2,
  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,
  SQRT2: Math.SQRT2,
  SQRT1_2: Math.SQRT1_2,
  E: Math.E,
  PHI: (1 + Math.sqrt(5)) / 2, // Golden ratio
};

// Vector operations
function vectorAdd(x1: number, y1: number, x2: number, y2: number) {
  return { x: x1 + x2, y: y1 + y2 };
}

function vectorSubtract(x1: number, y1: number, x2: number, y2: number) {
  return { x: x1 - x2, y: y1 - y2 };
}

function vectorMagnitude(x: number, y: number) {
  return Math.sqrt(x * x + y * y);
}

function vectorNormalize(x: number, y: number) {
  const mag = vectorMagnitude(x, y);
  if (mag === 0) return { x: 0, y: 0 };
  return { x: x / mag, y: y / mag };
}

function vectorDot(x1: number, y1: number, x2: number, y2: number) {
  return x1 * x2 + y1 * y2;
}

function vectorCross(x1: number, y1: number, x2: number, y2: number) {
  return x1 * y2 - y1 * x2;
}

function vectorDistance(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// Interpolation
function lerp(start: number, end: number, t: number) {
  return start + (end - start) * t;
}

function inverseLerp(start: number, end: number, value: number) {
  if (start === end) return 0;
  return (value - start) / (end - start);
}

function smoothstep(start: number, end: number, t: number) {
  const x = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return x * x * (3 - 2 * x);
}

// Angle operations
function degreesToRadians(degrees: number) {
  return degrees * MATH_CONSTANTS.DEG_TO_RAD;
}

function radiansToDegrees(radians: number) {
  return radians * MATH_CONSTANTS.RAD_TO_DEG;
}

function angleBetweenVectors(x1: number, y1: number, x2: number, y2: number) {
  const dot = vectorDot(x1, y1, x2, y2);
  const mag1 = vectorMagnitude(x1, y1);
  const mag2 = vectorMagnitude(x2, y2);
  if (mag1 === 0 || mag2 === 0) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

function rotatePoint(x: number, y: number, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos,
  };
}

// Random with seed
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }

  pointInCircle(radius: number) {
    const angle = this.next() * Math.PI * 2;
    const r = Math.sqrt(this.next()) * radius;
    return {
      x: r * Math.cos(angle),
      y: r * Math.sin(angle),
    };
  }
}

// Collision detection
function pointInRect(px: number, py: number, rx: number, ry: number, rw: number, rh: number) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

function circleCircleCollision(x1: number, y1: number, r1: number, x2: number, y2: number, r2: number) {
  const distance = vectorDistance(x1, y1, x2, y2);
  return distance <= r1 + r2;
}

function aabbOverlap(x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

export function GameMathWidget({ widget: _widget }: GameMathWidgetProps) {
  const [activeTab, setActiveTab] = useState("vectors");
  const [copiedFormula, setCopiedFormula] = useState<string | null>(null);

  // Vector inputs
  const [v1x, setV1x] = useState("1");
  const [v1y, setV1y] = useState("0");
  const [v2x, setV2x] = useState("0");
  const [v2y, setV2y] = useState("1");

  // Lerp inputs
  const [lerpStart, setLerpStart] = useState("0");
  const [lerpEnd, setLerpEnd] = useState("100");
  const [lerpT, setLerpT] = useState("0.5");

  // Angle inputs
  const [angleDegrees, setAngleDegrees] = useState("90");
  const [angleRadians, setAngleRadians] = useState(String(Math.PI / 2));
  const [rotateX, setRotateX] = useState("1");
  const [rotateY, setRotateY] = useState("0");
  const [rotateAngle, setRotateAngle] = useState("45");

  // Random inputs
  const [randomSeed, setRandomSeed] = useState("12345");
  const [randomMin, setRandomMin] = useState("0");
  const [randomMax, setRandomMax] = useState("100");
  const [randomRadius, setRandomRadius] = useState("10");

  // Collision inputs
  const [pointX, setPointX] = useState("5");
  const [pointY, setPointY] = useState("5");
  const [rectX, setRectX] = useState("0");
  const [rectY, setRectY] = useState("0");
  const [rectW, setRectW] = useState("10");
  const [rectH, setRectH] = useState("10");
  const [c1x, setC1x] = useState("0");
  const [c1y, setC1y] = useState("0");
  const [c1r, setC1r] = useState("5");
  const [c2x, setC2x] = useState("8");
  const [c2y, setC2y] = useState("0");
  const [c2r, setC2r] = useState("5");

  const copyToClipboard = async (text: string, formula: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedFormula(formula);
    setTimeout(() => setCopiedFormula(null), 2000);
  };

  const formatNumber = (num: number, decimals = 4) => {
    return Number(num.toFixed(decimals));
  };

  // Parse inputs safely
  const parse = (val: string) => parseFloat(val) || 0;

  return (
    <div className="@container h-full w-full overflow-hidden">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3 @sm:gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-sm @sm:text-base">Game Math Calculator</h3>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-5 h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="vectors" className="text-xs @sm:text-sm px-1 @sm:px-3">
              Vectors
            </TabsTrigger>
            <TabsTrigger value="lerp" className="text-xs @sm:text-sm px-1 @sm:px-3">
              Lerp
            </TabsTrigger>
            <TabsTrigger value="angles" className="text-xs @sm:text-sm px-1 @sm:px-3">
              Angles
            </TabsTrigger>
            <TabsTrigger value="random" className="text-xs @sm:text-sm px-1 @sm:px-3">
              Random
            </TabsTrigger>
            <TabsTrigger value="collision" className="text-xs @sm:text-sm px-1 @sm:px-3">
              Collision
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-3 @sm:mt-4">
            {/* VECTORS TAB */}
            <TabsContent value="vectors" className="mt-0 space-y-3 @sm:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Vector A</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={v1x}
                      onChange={(e) => setV1x(e.target.value)}
                      placeholder="x"
                      className="text-xs @sm:text-sm"
                    />
                    <Input
                      type="number"
                      value={v1y}
                      onChange={(e) => setV1y(e.target.value)}
                      placeholder="y"
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Vector B</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={v2x}
                      onChange={(e) => setV2x(e.target.value)}
                      placeholder="x"
                      className="text-xs @sm:text-sm"
                    />
                    <Input
                      type="number"
                      value={v2y}
                      onChange={(e) => setV2y(e.target.value)}
                      placeholder="y"
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const v1 = { x: parse(v1x), y: parse(v1y) };
                  const v2 = { x: parse(v2x), y: parse(v2y) };
                  const add = vectorAdd(v1.x, v1.y, v2.x, v2.y);
                  const sub = vectorSubtract(v1.x, v1.y, v2.x, v2.y);
                  const mag1 = vectorMagnitude(v1.x, v1.y);
                  const _mag2 = vectorMagnitude(v2.x, v2.y);
                  const norm1 = vectorNormalize(v1.x, v1.y);
                  const _norm2 = vectorNormalize(v2.x, v2.y);
                  const dot = vectorDot(v1.x, v1.y, v2.x, v2.y);
                  const cross = vectorCross(v1.x, v1.y, v2.x, v2.y);
                  const dist = vectorDistance(v1.x, v1.y, v2.x, v2.y);

                  return (
                    <>
                      <ResultCard
                        title="Add"
                        result={`(${formatNumber(add.x)}, ${formatNumber(add.y)})`}
                        formula="A + B"
                        onCopy={() => copyToClipboard(`{x: ${formatNumber(add.x)}, y: ${formatNumber(add.y)}}`, "add")}
                        copied={copiedFormula === "add"}
                      />
                      <ResultCard
                        title="Subtract"
                        result={`(${formatNumber(sub.x)}, ${formatNumber(sub.y)})`}
                        formula="A - B"
                        onCopy={() => copyToClipboard(`{x: ${formatNumber(sub.x)}, y: ${formatNumber(sub.y)}}`, "sub")}
                        copied={copiedFormula === "sub"}
                      />
                      <ResultCard
                        title="Magnitude A"
                        result={formatNumber(mag1).toString()}
                        formula="√(x² + y²)"
                        onCopy={() => copyToClipboard(formatNumber(mag1).toString(), "mag1")}
                        copied={copiedFormula === "mag1"}
                      />
                      <ResultCard
                        title="Normalize A"
                        result={`(${formatNumber(norm1.x)}, ${formatNumber(norm1.y)})`}
                        formula="A / |A|"
                        onCopy={() =>
                          copyToClipboard(`{x: ${formatNumber(norm1.x)}, y: ${formatNumber(norm1.y)}}`, "norm1")
                        }
                        copied={copiedFormula === "norm1"}
                      />
                      <ResultCard
                        title="Dot Product"
                        result={formatNumber(dot).toString()}
                        formula="A·B = Ax·Bx + Ay·By"
                        onCopy={() => copyToClipboard(formatNumber(dot).toString(), "dot")}
                        copied={copiedFormula === "dot"}
                      />
                      <ResultCard
                        title="Cross Product (2D)"
                        result={formatNumber(cross).toString()}
                        formula="Ax·By - Ay·Bx"
                        onCopy={() => copyToClipboard(formatNumber(cross).toString(), "cross")}
                        copied={copiedFormula === "cross"}
                      />
                      <ResultCard
                        title="Distance"
                        result={formatNumber(dist).toString()}
                        formula="√((Bx-Ax)² + (By-Ay)²)"
                        onCopy={() => copyToClipboard(formatNumber(dist).toString(), "dist")}
                        copied={copiedFormula === "dist"}
                      />
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            {/* LERP TAB */}
            <TabsContent value="lerp" className="mt-0 space-y-3 @sm:space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Start</Label>
                  <Input
                    type="number"
                    value={lerpStart}
                    onChange={(e) => setLerpStart(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">End</Label>
                  <Input
                    type="number"
                    value={lerpEnd}
                    onChange={(e) => setLerpEnd(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">T (0-1)</Label>
                  <Input
                    type="number"
                    value={lerpT}
                    onChange={(e) => setLerpT(e.target.value)}
                    step="0.1"
                    className="text-xs @sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const start = parse(lerpStart);
                  const end = parse(lerpEnd);
                  const t = parse(lerpT);
                  const lerpResult = lerp(start, end, t);
                  const smoothResult = smoothstep(start, end, t);
                  const invLerpResult = inverseLerp(start, end, lerpResult);

                  return (
                    <>
                      <ResultCard
                        title="Linear Interpolation"
                        result={formatNumber(lerpResult).toString()}
                        formula="start + (end - start) × t"
                        onCopy={() => copyToClipboard(formatNumber(lerpResult).toString(), "lerp")}
                        copied={copiedFormula === "lerp"}
                      />
                      <ResultCard
                        title="Smoothstep"
                        result={formatNumber(smoothResult).toString()}
                        formula="t² × (3 - 2t) where t = (value - start) / (end - start)"
                        onCopy={() => copyToClipboard(formatNumber(smoothResult).toString(), "smooth")}
                        copied={copiedFormula === "smooth"}
                      />
                      <ResultCard
                        title="Inverse Lerp"
                        result={formatNumber(invLerpResult).toString()}
                        formula="(value - start) / (end - start)"
                        onCopy={() => copyToClipboard(formatNumber(invLerpResult).toString(), "invlerp")}
                        copied={copiedFormula === "invlerp"}
                      />

                      {/* Visual preview */}
                      <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                        <Label className="text-xs text-muted-foreground mb-2 block">Visual Preview</Label>
                        <div className="relative h-8 bg-muted rounded-md overflow-hidden">
                          <motion.div
                            className="absolute top-0 left-0 h-full bg-primary/30"
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.max(0, Math.min(100, t * 100))}%` }}
                            transition={{ duration: 0.3 }}
                          />
                          <motion.div
                            className="absolute top-1/2 -translate-y-1/2 w-1 h-full bg-primary"
                            initial={{ left: "0%" }}
                            animate={{ left: `${Math.max(0, Math.min(100, t * 100))}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{start}</span>
                          <span className="text-primary font-medium">{formatNumber(lerpResult)}</span>
                          <span>{end}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            {/* ANGLES TAB */}
            <TabsContent value="angles" className="mt-0 space-y-3 @sm:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Degrees</Label>
                  <Input
                    type="number"
                    value={angleDegrees}
                    onChange={(e) => {
                      setAngleDegrees(e.target.value);
                      setAngleRadians(String(degreesToRadians(parseFloat(e.target.value) || 0)));
                    }}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Radians</Label>
                  <Input
                    type="number"
                    value={angleRadians}
                    onChange={(e) => {
                      setAngleRadians(e.target.value);
                      setAngleDegrees(String(radiansToDegrees(parseFloat(e.target.value) || 0)));
                    }}
                    step="0.01"
                    className="text-xs @sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs @sm:text-sm">Rotate Point</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    value={rotateX}
                    onChange={(e) => setRotateX(e.target.value)}
                    placeholder="x"
                    className="text-xs @sm:text-sm"
                  />
                  <Input
                    type="number"
                    value={rotateY}
                    onChange={(e) => setRotateY(e.target.value)}
                    placeholder="y"
                    className="text-xs @sm:text-sm"
                  />
                  <Input
                    type="number"
                    value={rotateAngle}
                    onChange={(e) => setRotateAngle(e.target.value)}
                    placeholder="angle (deg)"
                    className="text-xs @sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const v1 = { x: parse(v1x), y: parse(v1y) };
                  const v2 = { x: parse(v2x), y: parse(v2y) };
                  const angleBetween = angleBetweenVectors(v1.x, v1.y, v2.x, v2.y);
                  const rotated = rotatePoint(parse(rotateX), parse(rotateY), degreesToRadians(parse(rotateAngle)));

                  return (
                    <>
                      <ResultCard
                        title="Angle Between Vectors"
                        result={`${formatNumber(radiansToDegrees(angleBetween))}° (${formatNumber(angleBetween)} rad)`}
                        formula="acos(A·B / (|A|·|B|))"
                        onCopy={() =>
                          copyToClipboard(
                            `{degrees: ${formatNumber(radiansToDegrees(angleBetween))}, radians: ${formatNumber(angleBetween)}}`,
                            "anglebetween"
                          )
                        }
                        copied={copiedFormula === "anglebetween"}
                      />
                      <ResultCard
                        title="Rotated Point"
                        result={`(${formatNumber(rotated.x)}, ${formatNumber(rotated.y)})`}
                        formula="x' = x·cos(θ) - y·sin(θ), y' = x·sin(θ) + y·cos(θ)"
                        onCopy={() =>
                          copyToClipboard(`{x: ${formatNumber(rotated.x)}, y: ${formatNumber(rotated.y)}}`, "rotated")
                        }
                        copied={copiedFormula === "rotated"}
                      />

                      {/* Common constants */}
                      <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                        <Label className="text-xs text-muted-foreground mb-2 block">Game Dev Constants</Label>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">PI:</span>
                            <span>{formatNumber(MATH_CONSTANTS.PI)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">TAU:</span>
                            <span>{formatNumber(MATH_CONSTANTS.TAU)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">DEG→RAD:</span>
                            <span>{formatNumber(MATH_CONSTANTS.DEG_TO_RAD)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">RAD→DEG:</span>
                            <span>{formatNumber(MATH_CONSTANTS.RAD_TO_DEG)}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            {/* RANDOM TAB */}
            <TabsContent value="random" className="mt-0 space-y-3 @sm:space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs @sm:text-sm">Seed</Label>
                  <Input
                    type="number"
                    value={randomSeed}
                    onChange={(e) => setRandomSeed(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Min</Label>
                  <Input
                    type="number"
                    value={randomMin}
                    onChange={(e) => setRandomMin(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs @sm:text-sm">Max</Label>
                  <Input
                    type="number"
                    value={randomMax}
                    onChange={(e) => setRandomMax(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs @sm:text-sm">Circle Radius</Label>
                  <Input
                    type="number"
                    value={randomRadius}
                    onChange={(e) => setRandomRadius(e.target.value)}
                    className="text-xs @sm:text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const rng = new SeededRandom(parseInt(randomSeed) || 0);
                  const randomValue = rng.next();
                  const randomRange = rng.range(parse(randomMin), parse(randomMax));
                  const randomPoint = rng.pointInCircle(parse(randomRadius));

                  return (
                    <>
                      <ResultCard
                        title="Random (0-1)"
                        result={formatNumber(randomValue).toString()}
                        formula="Seeded LCG: (seed × 9301 + 49297) % 233280 / 233280"
                        onCopy={() => copyToClipboard(formatNumber(randomValue).toString(), "random")}
                        copied={copiedFormula === "random"}
                      />
                      <ResultCard
                        title="Random Range"
                        result={formatNumber(randomRange).toString()}
                        formula="min + random() × (max - min)"
                        onCopy={() => copyToClipboard(formatNumber(randomRange).toString(), "range")}
                        copied={copiedFormula === "range"}
                      />
                      <ResultCard
                        title="Random Point in Circle"
                        result={`(${formatNumber(randomPoint.x)}, ${formatNumber(randomPoint.y)})`}
                        formula="angle = random() × 2π, r = √random() × radius"
                        onCopy={() =>
                          copyToClipboard(
                            `{x: ${formatNumber(randomPoint.x)}, y: ${formatNumber(randomPoint.y)}}`,
                            "circle"
                          )
                        }
                        copied={copiedFormula === "circle"}
                      />

                      <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">
                            Seeded random ensures reproducible results. Change the seed to get different values.
                          </p>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            {/* COLLISION TAB */}
            <TabsContent value="collision" className="mt-0 space-y-3 @sm:space-y-4">
              <div className="space-y-3">
                <Label className="text-xs @sm:text-sm font-semibold">Point in Rectangle</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Point X</Label>
                    <Input
                      type="number"
                      value={pointX}
                      onChange={(e) => setPointX(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Point Y</Label>
                    <Input
                      type="number"
                      value={pointY}
                      onChange={(e) => setPointY(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rect X</Label>
                    <Input
                      type="number"
                      value={rectX}
                      onChange={(e) => setRectX(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Rect Y</Label>
                    <Input
                      type="number"
                      value={rectY}
                      onChange={(e) => setRectY(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Width</Label>
                    <Input
                      type="number"
                      value={rectW}
                      onChange={(e) => setRectW(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Height</Label>
                    <Input
                      type="number"
                      value={rectH}
                      onChange={(e) => setRectH(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                </div>

                <Label className="text-xs @sm:text-sm font-semibold mt-4 block">Circle-Circle Collision</Label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C1 X</Label>
                    <Input
                      type="number"
                      value={c1x}
                      onChange={(e) => setC1x(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C1 Y</Label>
                    <Input
                      type="number"
                      value={c1y}
                      onChange={(e) => setC1y(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C1 R</Label>
                    <Input
                      type="number"
                      value={c1r}
                      onChange={(e) => setC1r(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C2 X</Label>
                    <Input
                      type="number"
                      value={c2x}
                      onChange={(e) => setC2x(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C2 Y</Label>
                    <Input
                      type="number"
                      value={c2y}
                      onChange={(e) => setC2y(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">C2 R</Label>
                    <Input
                      type="number"
                      value={c2r}
                      onChange={(e) => setC2r(e.target.value)}
                      className="text-xs @sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {(() => {
                  const pointInRectResult = pointInRect(
                    parse(pointX),
                    parse(pointY),
                    parse(rectX),
                    parse(rectY),
                    parse(rectW),
                    parse(rectH)
                  );
                  const circleCollision = circleCircleCollision(
                    parse(c1x),
                    parse(c1y),
                    parse(c1r),
                    parse(c2x),
                    parse(c2y),
                    parse(c2r)
                  );
                  const aabbResult = aabbOverlap(
                    parse(rectX),
                    parse(rectY),
                    parse(rectW),
                    parse(rectH),
                    parse(c1x),
                    parse(c1y),
                    parse(c1r) * 2,
                    parse(c1r) * 2
                  );

                  return (
                    <>
                      <ResultCard
                        title="Point in Rectangle"
                        result={pointInRectResult ? "TRUE" : "FALSE"}
                        formula="px ≥ rx && px ≤ rx+rw && py ≥ ry && py ≤ ry+rh"
                        onCopy={() => copyToClipboard(String(pointInRectResult), "pointrect")}
                        copied={copiedFormula === "pointrect"}
                        highlight={pointInRectResult}
                      />
                      <ResultCard
                        title="Circle-Circle Collision"
                        result={circleCollision ? "TRUE" : "FALSE"}
                        formula="distance(c1, c2) ≤ r1 + r2"
                        onCopy={() => copyToClipboard(String(circleCollision), "circlecircle")}
                        copied={copiedFormula === "circlecircle"}
                        highlight={circleCollision}
                      />
                      <ResultCard
                        title="AABB Overlap"
                        result={aabbResult ? "TRUE" : "FALSE"}
                        formula="x1 < x2+w2 && x1+w1 > x2 && y1 < y2+h2 && y1+h1 > y2"
                        onCopy={() => copyToClipboard(String(aabbResult), "aabb")}
                        copied={copiedFormula === "aabb"}
                        highlight={aabbResult}
                      />
                    </>
                  );
                })()}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

interface ResultCardProps {
  title: string;
  result: string;
  formula: string;
  onCopy: () => void;
  copied: boolean;
  highlight?: boolean;
}

function ResultCard({ title, result, formula, onCopy, copied, highlight }: ResultCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-secondary/30 rounded-lg p-3 border transition-colors",
        highlight !== undefined
          ? highlight
            ? "border-primary/50 bg-primary/5"
            : "border-border/50"
          : "border-border/50"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-xs @sm:text-sm font-semibold text-foreground mb-1">{title}</h4>
          <p className="text-lg @sm:text-xl font-mono font-bold text-primary break-all">{result}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCopy}
          className="h-8 w-8 p-0 flex-shrink-0"
          title="Copy to clipboard"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Copy className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground font-mono bg-muted/30 rounded px-2 py-1">{formula}</p>
    </motion.div>
  );
}
