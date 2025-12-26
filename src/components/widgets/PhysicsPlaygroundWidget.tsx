"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
  Circle,
  Square,
  Play,
  Pause,
  RotateCcw,
  Download,
  Hand,
  MousePointer2,
  Trash2,
  Copy,
  Info,
  ChevronRight,
  Plus,
  Save,
} from "lucide-react";
import { motion } from "motion/react";

interface PhysicsPlaygroundWidgetProps {
  widget: Widget;
}

// Physics types
type ObjectType = "circle" | "rectangle" | "polygon";
type ConstraintType = "pin" | "spring" | "rope" | "distance";

interface Vector2 {
  x: number;
  y: number;
}

interface PhysicsObject {
  id: string;
  type: ObjectType;
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  angle: number;
  angularVelocity: number;
  width?: number; // for rectangle
  height?: number; // for rectangle
  radius?: number; // for circle
  vertices?: Vector2[]; // for polygon
  color: string;
  forces: Vector2[];
}

interface Constraint {
  id: string;
  type: ConstraintType;
  objectA: string;
  objectB: string | null; // null for pin to world
  anchorA: Vector2;
  anchorB?: Vector2;
  length?: number;
  stiffness?: number;
  damping?: number;
}

interface WorldSettings {
  gravity: Vector2;
  airResistance: number;
  timeScale: number;
  showVelocityVectors: boolean;
  showForceVectors: boolean;
  showCollisions: boolean;
  showTrails: boolean;
  showGround: boolean;
  showWalls: boolean;
  showConstraints: boolean;
  showGrid: boolean;
}

interface PresetScene {
  name: string;
  description: string;
  objects: Omit<PhysicsObject, "id">[];
  constraints: Omit<Constraint, "id">[];
  settings: Partial<WorldSettings>;
}

// Preset scenes
const PRESET_SCENES: Record<string, PresetScene> = {
  "newtons-cradle": {
    name: "Newton's Cradle",
    description: "Classic demonstration of conservation of momentum",
    objects: [
      {
        type: "circle",
        position: { x: 200, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 20,
        mass: 1,
        friction: 0,
        restitution: 1,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#3b82f6",
        forces: [],
      },
      {
        type: "circle",
        position: { x: 250, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 20,
        mass: 1,
        friction: 0,
        restitution: 1,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#3b82f6",
        forces: [],
      },
      {
        type: "circle",
        position: { x: 300, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 20,
        mass: 1,
        friction: 0,
        restitution: 1,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#3b82f6",
        forces: [],
      },
      {
        type: "circle",
        position: { x: 350, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 20,
        mass: 1,
        friction: 0,
        restitution: 1,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#3b82f6",
        forces: [],
      },
      {
        type: "circle",
        position: { x: 400, y: 200 },
        velocity: { x: 0, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 20,
        mass: 1,
        friction: 0,
        restitution: 1,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#3b82f6",
        forces: [],
      },
    ],
    constraints: [
      {
        type: "rope",
        objectA: "temp",
        objectB: null,
        anchorA: { x: 0, y: 0 },
        anchorB: { x: 200, y: 100 },
        length: 100,
      },
    ],
    settings: {
      gravity: { x: 0, y: 98 },
      timeScale: 1,
      showConstraints: true,
    },
  },
  pendulum: {
    name: "Pendulum",
    description: "Simple pendulum swinging",
    objects: [
      {
        type: "circle",
        position: { x: 300, y: 300 },
        velocity: { x: 50, y: 0 },
        acceleration: { x: 0, y: 0 },
        radius: 25,
        mass: 2,
        friction: 0.01,
        restitution: 0.8,
        isStatic: false,
        angle: 0,
        angularVelocity: 0,
        color: "#8b5cf6",
        forces: [],
      },
    ],
    constraints: [
      {
        type: "rope",
        objectA: "temp",
        objectB: null,
        anchorA: { x: 0, y: 0 },
        anchorB: { x: 300, y: 100 },
        length: 200,
      },
    ],
    settings: {
      gravity: { x: 0, y: 98 },
      timeScale: 1,
      showVelocityVectors: true,
      showConstraints: true,
    },
  },
  dominos: {
    name: "Dominos",
    description: "Chain reaction of falling dominos",
    objects: Array.from({ length: 10 }, (_, i) => ({
      type: "rectangle" as ObjectType,
      position: { x: 100 + i * 40, y: 350 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      width: 15,
      height: 60,
      mass: 1,
      friction: 0.5,
      restitution: 0.1,
      isStatic: false,
      angle: 0,
      angularVelocity: 0,
      color: "#f59e0b",
      forces: [],
    })),
    constraints: [],
    settings: {
      gravity: { x: 0, y: 98 },
      timeScale: 1,
      showGround: true,
    },
  },
  "ball-pit": {
    name: "Ball Pit",
    description: "Many balls bouncing around",
    objects: Array.from({ length: 20 }, (_, i) => ({
      type: "circle" as ObjectType,
      position: { x: 100 + (i % 5) * 80, y: 50 + Math.floor(i / 5) * 80 },
      velocity: { x: Math.random() * 40 - 20, y: Math.random() * 20 },
      acceleration: { x: 0, y: 0 },
      radius: 15 + Math.random() * 10,
      mass: 1,
      friction: 0.1,
      restitution: 0.7,
      isStatic: false,
      angle: 0,
      angularVelocity: 0,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      forces: [],
    })),
    constraints: [],
    settings: {
      gravity: { x: 0, y: 98 },
      timeScale: 1,
      showGround: true,
      showWalls: true,
      showCollisions: true,
    },
  },
};

export function PhysicsPlaygroundWidget({ widget }: PhysicsPlaygroundWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(0);
  const dragStartRef = useRef<Vector2 | null>(null);
  const dragObjectRef = useRef<string | null>(null);

  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [_isPaused, setIsPaused] = useState(true);
  const [objects, setObjects] = useState<PhysicsObject[]>(
    (widget.config?.physicsObjects as PhysicsObject[] | undefined) || []
  );
  const [constraints, setConstraints] = useState<Constraint[]>(
    (widget.config?.physicsConstraints as Constraint[] | undefined) || []
  );
  const [selectedObject, setSelectedObject] = useState<string | null>(null);
  const [trails, setTrails] = useState<Map<string, Vector2[]>>(new Map());

  // World settings
  const [worldSettings, setWorldSettings] = useState<WorldSettings>(
    (widget.config?.physicsWorldSettings as WorldSettings | undefined) || {
      gravity: { x: 0, y: 98 },
      airResistance: 0.01,
      timeScale: 1,
      showVelocityVectors: false,
      showForceVectors: false,
      showCollisions: true,
      showTrails: false,
      showGround: true,
      showWalls: true,
      showConstraints: true,
      showGrid: false,
    }
  );

  // View settings
  const [_zoom, _setZoom] = useState(1);
  const [_pan, _setPan] = useState<Vector2>({ x: 0, y: 0 });
  const [tool, setTool] = useState<"select" | "drag" | "force">("select");

  // UI state
  const [showInfo, setShowInfo] = useState(false);

  // Canvas dimensions
  const canvasWidth = 600;
  const canvasHeight = 400;

  // Save to config
  const saveToConfig = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        physicsObjects: objects,
        physicsConstraints: constraints,
        physicsWorldSettings: worldSettings,
      },
    });
  }, [widget.id, widget.config, objects, constraints, worldSettings]);

  // Physics utilities
  const addVectors = (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x + b.x,
    y: a.y + b.y,
  });

  const subtractVectors = (a: Vector2, b: Vector2): Vector2 => ({
    x: a.x - b.x,
    y: a.y - b.y,
  });

  const scaleVector = (v: Vector2, scale: number): Vector2 => ({
    x: v.x * scale,
    y: v.y * scale,
  });

  const vectorLength = (v: Vector2): number => Math.sqrt(v.x * v.x + v.y * v.y);

  const normalizeVector = (v: Vector2): Vector2 => {
    const len = vectorLength(v);
    return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
  };

  const dotProduct = (a: Vector2, b: Vector2): number => a.x * b.x + a.y * b.y;

  // Check collision between two circles
  const checkCircleCollision = (
    a: PhysicsObject,
    b: PhysicsObject
  ): { colliding: boolean; normal?: Vector2; depth?: number } => {
    if (!a.radius || !b.radius) return { colliding: false };

    const diff = subtractVectors(b.position, a.position);
    const distance = vectorLength(diff);
    const minDistance = a.radius + b.radius;

    if (distance < minDistance && distance > 0) {
      return {
        colliding: true,
        normal: normalizeVector(diff),
        depth: minDistance - distance,
      };
    }

    return { colliding: false };
  };

  // Resolve collision
  const resolveCollision = (a: PhysicsObject, b: PhysicsObject) => {
    const collision = checkCircleCollision(a, b);
    if (!collision.colliding || !collision.normal || !collision.depth) return;

    // Separate objects
    const totalMass = a.mass + b.mass;
    const aRatio = a.isStatic ? 0 : b.mass / totalMass;
    const bRatio = b.isStatic ? 0 : a.mass / totalMass;

    if (!a.isStatic) {
      a.position = subtractVectors(
        a.position,
        scaleVector(collision.normal, collision.depth * aRatio)
      );
    }
    if (!b.isStatic) {
      b.position = addVectors(
        b.position,
        scaleVector(collision.normal, collision.depth * bRatio)
      );
    }

    // Calculate relative velocity
    const relativeVelocity = subtractVectors(b.velocity, a.velocity);
    const velocityAlongNormal = dotProduct(relativeVelocity, collision.normal);

    if (velocityAlongNormal > 0) return;

    // Apply impulse
    const restitution = Math.min(a.restitution, b.restitution);
    const impulseScalar = -(1 + restitution) * velocityAlongNormal;
    const impulse = scaleVector(collision.normal, impulseScalar / totalMass);

    if (!a.isStatic) {
      a.velocity = subtractVectors(a.velocity, scaleVector(impulse, b.mass));
    }
    if (!b.isStatic) {
      b.velocity = addVectors(b.velocity, scaleVector(impulse, a.mass));
    }
  };

  // Physics update
  const updatePhysics = useCallback(
    (deltaTime: number) => {
      const dt = deltaTime * worldSettings.timeScale;

      setObjects((prevObjects) => {
        const newObjects = prevObjects.map((obj) => {
          if (obj.isStatic) return obj;

          const newObj = { ...obj };

          // Apply gravity
          const gravityForce = scaleVector(worldSettings.gravity, obj.mass);
          newObj.forces = [...newObj.forces, gravityForce];

          // Calculate total force
          const totalForce = newObj.forces.reduce(
            (acc, force) => addVectors(acc, force),
            { x: 0, y: 0 }
          );

          // Apply air resistance
          const airResistanceForce = scaleVector(
            newObj.velocity,
            -worldSettings.airResistance * vectorLength(newObj.velocity)
          );
          const netForce = addVectors(totalForce, airResistanceForce);

          // Update acceleration (F = ma)
          newObj.acceleration = scaleVector(netForce, 1 / obj.mass);

          // Update velocity
          newObj.velocity = addVectors(
            newObj.velocity,
            scaleVector(newObj.acceleration, dt)
          );

          // Update position
          newObj.position = addVectors(
            newObj.position,
            scaleVector(newObj.velocity, dt)
          );

          // Update angle
          newObj.angle += newObj.angularVelocity * dt;

          // Ground collision
          if (worldSettings.showGround && newObj.radius) {
            const groundY = canvasHeight - newObj.radius;
            if (newObj.position.y > groundY) {
              newObj.position.y = groundY;
              newObj.velocity.y *= -newObj.restitution;
              newObj.velocity.x *= 1 - obj.friction;
            }
          }

          // Wall collisions
          if (worldSettings.showWalls && newObj.radius) {
            if (newObj.position.x < newObj.radius) {
              newObj.position.x = newObj.radius;
              newObj.velocity.x *= -newObj.restitution;
            }
            if (newObj.position.x > canvasWidth - newObj.radius) {
              newObj.position.x = canvasWidth - newObj.radius;
              newObj.velocity.x *= -newObj.restitution;
            }
            if (newObj.position.y < newObj.radius) {
              newObj.position.y = newObj.radius;
              newObj.velocity.y *= -newObj.restitution;
            }
          }

          // Rectangle ground/wall collision
          if (newObj.type === "rectangle" && newObj.height) {
            if (worldSettings.showGround) {
              const groundY = canvasHeight - newObj.height / 2;
              if (newObj.position.y > groundY) {
                newObj.position.y = groundY;
                newObj.velocity.y *= -newObj.restitution;
                newObj.velocity.x *= 1 - obj.friction;
                newObj.angularVelocity *= 1 - obj.friction;
              }
            }
          }

          // Clear forces for next frame
          newObj.forces = [];

          return newObj;
        });

        // Check collisions between all objects
        for (let i = 0; i < newObjects.length; i++) {
          for (let j = i + 1; j < newObjects.length; j++) {
            if (newObjects[i].type === "circle" && newObjects[j].type === "circle") {
              resolveCollision(newObjects[i], newObjects[j]);
            }
          }
        }

        // Apply constraints
        constraints.forEach((constraint) => {
          const objA = newObjects.find((o) => o.id === constraint.objectA);
          if (!objA) return;

          if (constraint.type === "rope" && constraint.anchorB && constraint.length) {
            const diff = subtractVectors(objA.position, constraint.anchorB);
            const distance = vectorLength(diff);

            if (distance > constraint.length) {
              const correction = scaleVector(
                normalizeVector(diff),
                distance - constraint.length
              );
              if (!objA.isStatic) {
                objA.position = subtractVectors(objA.position, correction);
              }
            }
          }

          if (constraint.type === "spring" && constraint.objectB && constraint.length) {
            const objB = newObjects.find((o) => o.id === constraint.objectB);
            if (!objB) return;

            const diff = subtractVectors(objB.position, objA.position);
            const distance = vectorLength(diff);
            const springForce =
              (distance - constraint.length) * (constraint.stiffness || 0.1);

            const force = scaleVector(normalizeVector(diff), springForce);

            if (!objA.isStatic) {
              objA.forces.push(force);
            }
            if (!objB.isStatic) {
              objB.forces.push(scaleVector(force, -1));
            }
          }
        });

        return newObjects;
      });

      // Update trails
      if (worldSettings.showTrails) {
        setTrails((prevTrails) => {
          const newTrails = new Map(prevTrails);
          objects.forEach((obj) => {
            const trail = newTrails.get(obj.id) || [];
            trail.push({ ...obj.position });
            if (trail.length > 50) trail.shift();
            newTrails.set(obj.id, trail);
          });
          return newTrails;
        });
      }
    },
    [worldSettings, constraints, canvasHeight, canvasWidth, objects]
  );

  // Animation loop
  useEffect(() => {
    if (!isPlaying) return;

    const animate = (currentTime: number) => {
      const deltaTime = lastTimeRef.current
        ? (currentTime - lastTimeRef.current) / 1000
        : 0.016;
      lastTimeRef.current = currentTime;

      updatePhysics(deltaTime);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updatePhysics]);

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw grid
    if (worldSettings.showGrid) {
      ctx.strokeStyle = "#222";
      ctx.lineWidth = 1;
      for (let x = 0; x < canvasWidth; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
      }
      for (let y = 0; y < canvasHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
      }
    }

    // Draw ground
    if (worldSettings.showGround) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, canvasHeight - 5, canvasWidth, 5);
    }

    // Draw walls
    if (worldSettings.showWalls) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, 0, 5, canvasHeight);
      ctx.fillRect(canvasWidth - 5, 0, 5, canvasHeight);
      ctx.fillRect(0, 0, canvasWidth, 5);
    }

    // Draw trails
    if (worldSettings.showTrails) {
      trails.forEach((trail, objId) => {
        const obj = objects.find((o) => o.id === objId);
        if (!obj) return;

        ctx.strokeStyle = obj.color + "40";
        ctx.lineWidth = 2;
        ctx.beginPath();
        trail.forEach((point, i) => {
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.stroke();
      });
    }

    // Draw constraints
    if (worldSettings.showConstraints) {
      constraints.forEach((constraint) => {
        const objA = objects.find((o) => o.id === constraint.objectA);
        if (!objA) return;

        ctx.strokeStyle = "#666";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();

        if (constraint.anchorB) {
          ctx.moveTo(objA.position.x, objA.position.y);
          ctx.lineTo(constraint.anchorB.x, constraint.anchorB.y);
        } else if (constraint.objectB) {
          const objB = objects.find((o) => o.id === constraint.objectB);
          if (objB) {
            ctx.moveTo(objA.position.x, objA.position.y);
            ctx.lineTo(objB.position.x, objB.position.y);
          }
        }

        ctx.stroke();
        ctx.setLineDash([]);

        // Draw anchor point
        if (constraint.anchorB) {
          ctx.fillStyle = "#888";
          ctx.beginPath();
          ctx.arc(constraint.anchorB.x, constraint.anchorB.y, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Draw objects
    objects.forEach((obj) => {
      ctx.save();

      // Translate and rotate
      ctx.translate(obj.position.x, obj.position.y);
      ctx.rotate(obj.angle);

      // Draw based on type
      if (obj.type === "circle" && obj.radius) {
        ctx.fillStyle = obj.color;
        ctx.beginPath();
        ctx.arc(0, 0, obj.radius, 0, Math.PI * 2);
        ctx.fill();

        // Draw line to show rotation
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(obj.radius, 0);
        ctx.stroke();
      } else if (obj.type === "rectangle" && obj.width && obj.height) {
        ctx.fillStyle = obj.color;
        ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);

        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        ctx.strokeRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
      }

      // Selection outline
      if (obj.id === selectedObject) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        if (obj.type === "circle" && obj.radius) {
          ctx.beginPath();
          ctx.arc(0, 0, obj.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        } else if (obj.type === "rectangle" && obj.width && obj.height) {
          ctx.strokeRect(
            -obj.width / 2 - 5,
            -obj.height / 2 - 5,
            obj.width + 10,
            obj.height + 10
          );
        }
        ctx.setLineDash([]);
      }

      ctx.restore();

      // Draw velocity vector
      if (worldSettings.showVelocityVectors && !obj.isStatic) {
        const velocityScale = 0.1;
        ctx.strokeStyle = "#00ff00";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obj.position.x, obj.position.y);
        ctx.lineTo(
          obj.position.x + obj.velocity.x * velocityScale,
          obj.position.y + obj.velocity.y * velocityScale
        );
        ctx.stroke();
      }
    });
  }, [objects, selectedObject, worldSettings, constraints, trails, canvasWidth, canvasHeight]);

  // Add object
  const addObject = useCallback((type: ObjectType) => {
    const newObject: PhysicsObject = {
      id: `obj-${Date.now()}`,
      type,
      position: { x: canvasWidth / 2, y: canvasHeight / 4 },
      velocity: { x: 0, y: 0 },
      acceleration: { x: 0, y: 0 },
      mass: 1,
      friction: 0.5,
      restitution: 0.7,
      isStatic: false,
      angle: 0,
      angularVelocity: 0,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      forces: [],
    };

    if (type === "circle") {
      newObject.radius = 25;
    } else if (type === "rectangle") {
      newObject.width = 50;
      newObject.height = 50;
    }

    setObjects((prev) => [...prev, newObject]);
  }, [canvasWidth, canvasHeight]);

  // Canvas mouse handlers
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked on an object
    for (const obj of objects) {
      if (obj.type === "circle" && obj.radius) {
        const distance = vectorLength(subtractVectors({ x, y }, obj.position));
        if (distance < obj.radius) {
          if (tool === "select") {
            setSelectedObject(obj.id);
            dragObjectRef.current = obj.id;
            dragStartRef.current = { x, y };
          } else if (tool === "drag") {
            dragObjectRef.current = obj.id;
            dragStartRef.current = { x, y };
          }
          return;
        }
      } else if (obj.type === "rectangle" && obj.width && obj.height) {
        const dx = Math.abs(x - obj.position.x);
        const dy = Math.abs(y - obj.position.y);
        if (dx < obj.width / 2 && dy < obj.height / 2) {
          if (tool === "select") {
            setSelectedObject(obj.id);
            dragObjectRef.current = obj.id;
            dragStartRef.current = { x, y };
          } else if (tool === "drag") {
            dragObjectRef.current = obj.id;
            dragStartRef.current = { x, y };
          }
          return;
        }
      }
    }

    setSelectedObject(null);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragObjectRef.current || !dragStartRef.current) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setObjects((prev) =>
      prev.map((obj) =>
        obj.id === dragObjectRef.current
          ? { ...obj, position: { x, y }, velocity: { x: 0, y: 0 } }
          : obj
      )
    );

    dragStartRef.current = { x, y };
  };

  const handleCanvasMouseUp = () => {
    dragObjectRef.current = null;
    dragStartRef.current = null;
  };

  // Load preset scene
  const loadPreset = useCallback((presetKey: string) => {
    const preset = PRESET_SCENES[presetKey];
    if (!preset) return;

    const newObjects = preset.objects.map((obj, i) => ({
      ...obj,
      id: `obj-${Date.now()}-${i}`,
    }));

    setObjects(newObjects);

    const newConstraints = preset.constraints.map((constraint, i) => ({
      ...constraint,
      id: `constraint-${Date.now()}-${i}`,
      objectA: constraint.objectA === "temp" ? newObjects[0].id : constraint.objectA,
    }));

    setConstraints(newConstraints);

    setWorldSettings((prev) => ({ ...prev, ...preset.settings }));
    setTrails(new Map());
    setSelectedObject(null);
  }, []);

  // Export scene
  const exportScene = useCallback(() => {
    const scene = {
      objects,
      constraints,
      worldSettings,
    };

    const blob = new Blob([JSON.stringify(scene, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "physics-scene.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [objects, constraints, worldSettings]);

  // Reset simulation
  const reset = useCallback(() => {
    setObjects([]);
    setConstraints([]);
    setTrails(new Map());
    setSelectedObject(null);
    setIsPlaying(false);
    setIsPaused(true);
  }, []);

  return (
    <div className="@container h-full w-full overflow-hidden">
      <div className="flex h-full flex-col gap-3 p-4">
        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isPlaying ? "secondary" : "default"}
              onClick={() => {
                setIsPlaying(!isPlaying);
                setIsPaused(!isPlaying);
              }}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button size="sm" variant="outline" onClick={reset}>
              <RotateCcw className="size-4" />
            </Button>

            <div className="mx-2 h-6 w-px bg-border" />

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={tool === "select" ? "secondary" : "ghost"}
                onClick={() => setTool("select")}
              >
                <MousePointer2 className="size-4" />
              </Button>
              <Button
                size="sm"
                variant={tool === "drag" ? "secondary" : "ghost"}
                onClick={() => setTool("drag")}
              >
                <Hand className="size-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="size-4" />
                  Add Object
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="grid gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => addObject("circle")}
                  >
                    <Circle className="mr-2 size-4" />
                    Circle
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="justify-start"
                    onClick={() => addObject("rectangle")}
                  >
                    <Square className="mr-2 size-4" />
                    Rectangle
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button size="sm" variant="outline" onClick={() => setShowInfo(!showInfo)}>
              <Info className="size-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="grid flex-1 gap-3 @2xl:grid-cols-[1fr_280px]">
          {/* Canvas */}
          <div className="relative overflow-hidden rounded-lg border bg-background">
            <canvas
              ref={canvasRef}
              width={canvasWidth}
              height={canvasHeight}
              className="h-full w-full cursor-crosshair"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
            />

            {/* Stats overlay */}
            {showInfo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-4 top-4 rounded-lg border bg-background/95 p-3 text-xs backdrop-blur-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Objects:</span>
                    <span className="font-mono">{objects.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Constraints:</span>
                    <span className="font-mono">{constraints.length}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Time Scale:</span>
                    <span className="font-mono">{worldSettings.timeScale.toFixed(1)}x</span>
                  </div>
                  {selectedObject && (
                    <>
                      <div className="my-2 h-px bg-border" />
                      {(() => {
                        const obj = objects.find((o) => o.id === selectedObject);
                        if (!obj) return null;
                        return (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Velocity:</span>
                              <span className="font-mono">
                                {vectorLength(obj.velocity).toFixed(1)} px/s
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Mass:</span>
                              <span className="font-mono">{obj.mass.toFixed(1)} kg</span>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Settings panel */}
          <ScrollArea className="h-full rounded-lg border bg-card">
            <div className="p-4">
              <Tabs defaultValue="world" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="world">World</TabsTrigger>
                  <TabsTrigger value="object">Object</TabsTrigger>
                  <TabsTrigger value="presets">Presets</TabsTrigger>
                </TabsList>

                <TabsContent value="world" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Gravity Y</Label>
                    <Slider
                      value={[worldSettings.gravity.y]}
                      onValueChange={([y]) =>
                        setWorldSettings((prev) => ({
                          ...prev,
                          gravity: { ...prev.gravity, y },
                        }))
                      }
                      min={-200}
                      max={200}
                      step={1}
                      className="py-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {worldSettings.gravity.y.toFixed(0)} px/s²
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Gravity X</Label>
                    <Slider
                      value={[worldSettings.gravity.x]}
                      onValueChange={([x]) =>
                        setWorldSettings((prev) => ({
                          ...prev,
                          gravity: { ...prev.gravity, x },
                        }))
                      }
                      min={-200}
                      max={200}
                      step={1}
                      className="py-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {worldSettings.gravity.x.toFixed(0)} px/s²
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Time Scale</Label>
                    <Slider
                      value={[worldSettings.timeScale]}
                      onValueChange={([timeScale]) =>
                        setWorldSettings((prev) => ({ ...prev, timeScale }))
                      }
                      min={0.1}
                      max={3}
                      step={0.1}
                      className="py-2"
                    />
                    <div className="text-xs text-muted-foreground">
                      {worldSettings.timeScale.toFixed(1)}x
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Air Resistance</Label>
                    <Slider
                      value={[worldSettings.airResistance]}
                      onValueChange={([airResistance]) =>
                        setWorldSettings((prev) => ({ ...prev, airResistance }))
                      }
                      min={0}
                      max={0.5}
                      step={0.01}
                      className="py-2"
                    />
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Velocity</Label>
                      <Switch
                        checked={worldSettings.showVelocityVectors}
                        onCheckedChange={(showVelocityVectors) =>
                          setWorldSettings((prev) => ({ ...prev, showVelocityVectors }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Trails</Label>
                      <Switch
                        checked={worldSettings.showTrails}
                        onCheckedChange={(showTrails) => {
                          setWorldSettings((prev) => ({ ...prev, showTrails }));
                          if (!showTrails) setTrails(new Map());
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Ground</Label>
                      <Switch
                        checked={worldSettings.showGround}
                        onCheckedChange={(showGround) =>
                          setWorldSettings((prev) => ({ ...prev, showGround }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Walls</Label>
                      <Switch
                        checked={worldSettings.showWalls}
                        onCheckedChange={(showWalls) =>
                          setWorldSettings((prev) => ({ ...prev, showWalls }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Grid</Label>
                      <Switch
                        checked={worldSettings.showGrid}
                        onCheckedChange={(showGrid) =>
                          setWorldSettings((prev) => ({ ...prev, showGrid }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Show Constraints</Label>
                      <Switch
                        checked={worldSettings.showConstraints}
                        onCheckedChange={(showConstraints) =>
                          setWorldSettings((prev) => ({ ...prev, showConstraints }))
                        }
                      />
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={saveToConfig}
                  >
                    <Save className="mr-2 size-4" />
                    Save Settings
                  </Button>
                </TabsContent>

                <TabsContent value="object" className="space-y-4 pt-4">
                  {selectedObject ? (
                    <>
                      {(() => {
                        const obj = objects.find((o) => o.id === selectedObject);
                        if (!obj) return <p className="text-sm text-muted-foreground">No object selected</p>;

                        return (
                          <>
                            <div className="space-y-2">
                              <Label className="text-xs">Mass (kg)</Label>
                              <Input
                                type="number"
                                value={obj.mass}
                                onChange={(e) => {
                                  const mass = parseFloat(e.target.value);
                                  setObjects((prev) =>
                                    prev.map((o) =>
                                      o.id === selectedObject ? { ...o, mass } : o
                                    )
                                  );
                                }}
                                step={0.1}
                                min={0.1}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Restitution (Bounciness)</Label>
                              <Slider
                                value={[obj.restitution]}
                                onValueChange={([restitution]) => {
                                  setObjects((prev) =>
                                    prev.map((o) =>
                                      o.id === selectedObject ? { ...o, restitution } : o
                                    )
                                  );
                                }}
                                min={0}
                                max={1}
                                step={0.05}
                                className="py-2"
                              />
                              <div className="text-xs text-muted-foreground">
                                {obj.restitution.toFixed(2)}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Friction</Label>
                              <Slider
                                value={[obj.friction]}
                                onValueChange={([friction]) => {
                                  setObjects((prev) =>
                                    prev.map((o) =>
                                      o.id === selectedObject ? { ...o, friction } : o
                                    )
                                  );
                                }}
                                min={0}
                                max={1}
                                step={0.05}
                                className="py-2"
                              />
                              <div className="text-xs text-muted-foreground">
                                {obj.friction.toFixed(2)}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <Label className="text-xs">Static</Label>
                              <Switch
                                checked={obj.isStatic}
                                onCheckedChange={(isStatic) => {
                                  setObjects((prev) =>
                                    prev.map((o) =>
                                      o.id === selectedObject
                                        ? { ...o, isStatic, velocity: { x: 0, y: 0 } }
                                        : o
                                    )
                                  );
                                }}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-xs">Color</Label>
                              <Input
                                type="color"
                                value={obj.color}
                                onChange={(e) => {
                                  setObjects((prev) =>
                                    prev.map((o) =>
                                      o.id === selectedObject
                                        ? { ...o, color: e.target.value }
                                        : o
                                    )
                                  );
                                }}
                              />
                            </div>

                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setObjects((prev) => [
                                    ...prev,
                                    { ...obj, id: `obj-${Date.now()}` },
                                  ]);
                                }}
                              >
                                <Copy className="mr-2 size-4" />
                                Duplicate
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setObjects((prev) =>
                                    prev.filter((o) => o.id !== selectedObject)
                                  );
                                  setSelectedObject(null);
                                }}
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select an object to edit its properties
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="presets" className="space-y-2 pt-4">
                  {Object.entries(PRESET_SCENES).map(([key, preset]) => (
                    <Button
                      key={key}
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loadPreset(key)}
                    >
                      <ChevronRight className="mr-2 size-4" />
                      <div className="flex flex-col items-start gap-1">
                        <span className="font-medium">{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {preset.description}
                        </span>
                      </div>
                    </Button>
                  ))}

                  <div className="pt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={exportScene}
                    >
                      <Download className="mr-2 size-4" />
                      Export Scene
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
