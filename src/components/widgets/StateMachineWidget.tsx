"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Circle,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  Download,
  Plus,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  FileJson,
  FileCode,
  Copy,
  CheckCircle2,
  MapPin,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface StateMachineWidgetProps {
  widget: Widget;
}

type StateType = "idle" | "action" | "transition";

interface FSMState {
  id: string;
  name: string;
  type: StateType;
  x: number;
  y: number;
}

interface FSMTransition {
  id: string;
  from: string;
  to: string;
  condition: string;
}

interface StateMachine {
  states: FSMState[];
  transitions: FSMTransition[];
  initialStateId: string | null;
  currentStateId: string | null;
}

const STATE_TYPE_COLORS = {
  idle: "hsl(var(--muted))",
  action: "hsl(var(--primary))",
  transition: "hsl(var(--warning))",
};

const PRESETS: Record<string, StateMachine> = {
  player: {
    states: [
      { id: "1", name: "Idle", type: "idle", x: 100, y: 200 },
      { id: "2", name: "Walking", type: "action", x: 300, y: 200 },
      { id: "3", name: "Running", type: "action", x: 500, y: 200 },
      { id: "4", name: "Jumping", type: "action", x: 300, y: 50 },
      { id: "5", name: "Falling", type: "transition", x: 500, y: 50 },
    ],
    transitions: [
      { id: "t1", from: "1", to: "2", condition: "move" },
      { id: "t2", from: "2", to: "3", condition: "sprint" },
      { id: "t3", from: "2", to: "1", condition: "stop" },
      { id: "t4", from: "2", to: "4", condition: "jump" },
      { id: "t5", from: "4", to: "5", condition: "peak" },
      { id: "t6", from: "5", to: "1", condition: "land" },
    ],
    initialStateId: "1",
    currentStateId: "1",
  },
  enemy: {
    states: [
      { id: "1", name: "Patrol", type: "idle", x: 100, y: 200 },
      { id: "2", name: "Alert", type: "transition", x: 300, y: 100 },
      { id: "3", name: "Chase", type: "action", x: 500, y: 100 },
      { id: "4", name: "Attack", type: "action", x: 500, y: 300 },
      { id: "5", name: "Return", type: "transition", x: 300, y: 300 },
    ],
    transitions: [
      { id: "t1", from: "1", to: "2", condition: "playerDetected" },
      { id: "t2", from: "2", to: "3", condition: "confirm" },
      { id: "t3", from: "3", to: "4", condition: "inRange" },
      { id: "t4", from: "4", to: "3", condition: "outOfRange" },
      { id: "t5", from: "3", to: "5", condition: "lostPlayer" },
      { id: "t6", from: "5", to: "1", condition: "reachedHome" },
    ],
    initialStateId: "1",
    currentStateId: "1",
  },
  menu: {
    states: [
      { id: "1", name: "MainMenu", type: "idle", x: 200, y: 200 },
      { id: "2", name: "Settings", type: "idle", x: 400, y: 100 },
      { id: "3", name: "PlayGame", type: "action", x: 400, y: 300 },
      { id: "4", name: "Pause", type: "idle", x: 600, y: 300 },
    ],
    transitions: [
      { id: "t1", from: "1", to: "2", condition: "clickSettings" },
      { id: "t2", from: "1", to: "3", condition: "clickPlay" },
      { id: "t3", from: "2", to: "1", condition: "back" },
      { id: "t4", from: "3", to: "4", condition: "pause" },
      { id: "t5", from: "4", to: "3", condition: "resume" },
      { id: "t6", from: "4", to: "1", condition: "quit" },
    ],
    initialStateId: "1",
    currentStateId: "1",
  },
  animation: {
    states: [
      { id: "1", name: "Idle", type: "idle", x: 150, y: 200 },
      { id: "2", name: "FadeIn", type: "transition", x: 350, y: 100 },
      { id: "3", name: "Active", type: "action", x: 550, y: 200 },
      { id: "4", name: "FadeOut", type: "transition", x: 350, y: 300 },
    ],
    transitions: [
      { id: "t1", from: "1", to: "2", condition: "start" },
      { id: "t2", from: "2", to: "3", condition: "complete" },
      { id: "t3", from: "3", to: "4", condition: "end" },
      { id: "t4", from: "4", to: "1", condition: "complete" },
    ],
    initialStateId: "1",
    currentStateId: "1",
  },
};

export function StateMachineWidget({ widget }: StateMachineWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load state machine from widget config
  const savedMachine = widget.config?.stateMachine as StateMachine | undefined;
  const [machine, setMachine] = useState<StateMachine>(
    savedMachine || {
      states: [],
      transitions: [],
      initialStateId: null,
      currentStateId: null,
    }
  );

  // UI State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [draggingState, setDraggingState] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "js" | "mermaid">("json");
  const [exportCode, setExportCode] = useState("");
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Save machine to widget config
  const saveMachine = useCallback(
    (updatedMachine: StateMachine) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          stateMachine: updatedMachine,
        },
      });
    },
     
    [widget.id]
  );

  // Auto-save when machine changes
  useEffect(() => {
    const timer = setTimeout(() => {
      saveMachine(machine);
    }, 500);
    return () => clearTimeout(timer);
  }, [machine, saveMachine]);

  // State Management
  const addState = useCallback(() => {
    const newState: FSMState = {
      id: Date.now().toString(),
      name: `State ${machine.states.length + 1}`,
      type: "idle",
      x: 300 + machine.states.length * 50,
      y: 200,
    };
    const updatedMachine = { ...machine, states: [...machine.states, newState] };
    if (!machine.initialStateId) {
      updatedMachine.initialStateId = newState.id;
      updatedMachine.currentStateId = newState.id;
    }
    setMachine(updatedMachine);
  }, [machine]);

  const removeState = useCallback(
    (id: string) => {
      const updatedMachine = {
        ...machine,
        states: machine.states.filter((s) => s.id !== id),
        transitions: machine.transitions.filter((t) => t.from !== id && t.to !== id),
      };
      if (machine.initialStateId === id) {
        updatedMachine.initialStateId = updatedMachine.states[0]?.id || null;
      }
      if (machine.currentStateId === id) {
        updatedMachine.currentStateId = updatedMachine.initialStateId;
      }
      setMachine(updatedMachine);
      setSelectedState(null);
    },
    [machine]
  );

  const updateState = useCallback(
    (id: string, updates: Partial<FSMState>) => {
      setMachine({
        ...machine,
        states: machine.states.map((s) => (s.id === id ? { ...s, ...updates } : s)),
      });
    },
    [machine]
  );

  const addTransition = useCallback(
    (from: string, to: string) => {
      const newTransition: FSMTransition = {
        id: Date.now().toString(),
        from,
        to,
        condition: "event",
      };
      setMachine({
        ...machine,
        transitions: [...machine.transitions, newTransition],
      });
    },
    [machine]
  );

  const removeTransition = useCallback(
    (id: string) => {
      setMachine({
        ...machine,
        transitions: machine.transitions.filter((t) => t.id !== id),
      });
    },
    [machine]
  );

  const updateTransition = useCallback(
    (id: string, condition: string) => {
      setMachine({
        ...machine,
        transitions: machine.transitions.map((t) => (t.id === id ? { ...t, condition } : t)),
      });
    },
    [machine]
  );

  const setInitialState = useCallback(
    (id: string) => {
      setMachine({ ...machine, initialStateId: id, currentStateId: id });
    },
    [machine]
  );

  // Simulation
  const simulateTransition = useCallback(
    (transitionId: string) => {
      if (!isSimulating) return;
      const transition = machine.transitions.find((t) => t.id === transitionId);
      if (transition && machine.currentStateId === transition.from) {
        setMachine({ ...machine, currentStateId: transition.to });
      }
    },
    [machine, isSimulating]
  );

  const resetSimulation = useCallback(() => {
    setMachine({ ...machine, currentStateId: machine.initialStateId });
    setIsSimulating(false);
  }, [machine]);

  // Validation
  const validation = useCallback(() => {
    const issues: string[] = [];

    // Check for unreachable states
    const reachableStates = new Set<string>();
    if (machine.initialStateId) {
      const visited = new Set<string>();
      const queue = [machine.initialStateId];

      while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        reachableStates.add(current);

        machine.transitions
          .filter((t) => t.from === current)
          .forEach((t) => queue.push(t.to));
      }
    }

    const unreachable = machine.states.filter((s) => !reachableStates.has(s.id));
    if (unreachable.length > 0) {
      issues.push(`${unreachable.length} unreachable state(s): ${unreachable.map((s) => s.name).join(", ")}`);
    }

    // Check for states without transitions
    const statesWithoutTransitions = machine.states.filter(
      (s) => !machine.transitions.some((t) => t.from === s.id)
    );
    if (statesWithoutTransitions.length > 0 && machine.states.length > 1) {
      issues.push(`${statesWithoutTransitions.length} state(s) have no outgoing transitions`);
    }

    return issues;
  }, [machine]);

  // Export Functions
  const generateExport = useCallback(
    (format: "json" | "js" | "mermaid") => {
      if (format === "json") {
        return JSON.stringify(
          {
            states: machine.states.map((s) => ({ id: s.id, name: s.name, type: s.type })),
            transitions: machine.transitions,
            initialState: machine.initialStateId,
          },
          null,
          2
        );
      } else if (format === "js") {
        return `class StateMachine {
  constructor() {
    this.currentState = "${machine.states.find((s) => s.id === machine.initialStateId)?.name || ""}";
    this.states = {
${machine.states.map((s) => `      "${s.name}": { type: "${s.type}" }`).join(",\n")}
    };
    this.transitions = [
${machine.transitions.map((t) => {
  const from = machine.states.find((s) => s.id === t.from)?.name;
  const to = machine.states.find((s) => s.id === t.to)?.name;
  return `      { from: "${from}", to: "${to}", on: "${t.condition}" }`;
}).join(",\n")}
    ];
  }

  transition(event) {
    const transition = this.transitions.find(
      t => t.from === this.currentState && t.on === event
    );
    if (transition) {
      this.currentState = transition.to;
      return true;
    }
    return false;
  }

  getCurrentState() {
    return this.currentState;
  }
}

export default StateMachine;`;
      } else {
        // Mermaid diagram
        let mermaid = "stateDiagram-v2\n";
        const initialState = machine.states.find((s) => s.id === machine.initialStateId);
        if (initialState) {
          mermaid += `    [*] --> ${initialState.name}\n`;
        }
        machine.transitions.forEach((t) => {
          const from = machine.states.find((s) => s.id === t.from)?.name;
          const to = machine.states.find((s) => s.id === t.to)?.name;
          mermaid += `    ${from} --> ${to}: ${t.condition}\n`;
        });
        return mermaid;
      }
    },
    [machine]
  );

  const handleExport = useCallback(() => {
    const code = generateExport(exportFormat);
    setExportCode(code);
    setExportDialogOpen(true);
  }, [exportFormat, generateExport]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(exportCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [exportCode]);

  // Preset Loading
  const loadPreset = useCallback((presetKey: string) => {
    const preset = PRESETS[presetKey];
    if (preset) {
      setMachine(preset);
    }
  }, []);

  // Canvas Interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-state]")) return;
    setSelectedState(null);
    setConnectingFrom(null);
  }, []);

  const handleStateMouseDown = useCallback(
    (e: React.MouseEvent, stateId: string) => {
      e.stopPropagation();
      if (connectingFrom) {
        if (connectingFrom !== stateId) {
          addTransition(connectingFrom, stateId);
        }
        setConnectingFrom(null);
      } else {
        setDraggingState(stateId);
        setSelectedState(stateId);
      }
    },
    [connectingFrom, addTransition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x, y });

      if (draggingState) {
        updateState(draggingState, { x, y });
      }
    },
    [draggingState, pan, zoom, updateState]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingState(null);
  }, []);

  const validationIssues = validation();
  const selectedStateData = machine.states.find((s) => s.id === selectedState);

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/20">
        <Button variant="outline" size="sm" onClick={addState}>
          <Plus className="w-3 h-3 mr-1" />
          State
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant={isSimulating ? "default" : "outline"}
          size="sm"
          onClick={() => setIsSimulating(!isSimulating)}
          disabled={!machine.initialStateId}
        >
          {isSimulating ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
          {isSimulating ? "Stop" : "Simulate"}
        </Button>

        <Button variant="outline" size="sm" onClick={resetSimulation} disabled={!isSimulating}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConnectingFrom(selectedState)}
          disabled={!selectedState}
        >
          <ArrowRight className="w-3 h-3 mr-1" />
          Connect
        </Button>

        <div className="flex-1" />

        <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(zoom + 0.1, 2))}>
          <ZoomIn className="w-3 h-3" />
        </Button>
        <span className="text-xs text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</span>
        <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}>
          <ZoomOut className="w-3 h-3" />
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings className="w-3 h-3" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Presets & Settings</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Load Preset</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadPreset("player")}>
                    Player FSM
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadPreset("enemy")}>
                    Enemy AI
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadPreset("menu")}>
                    Menu System
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadPreset("animation")}>
                    Animation States
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={showMinimap ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowMinimap(!showMinimap)}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Mini-map
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-muted/5" onClick={handleCanvasClick}>
        <div
          ref={canvasRef}
          className="absolute inset-0 cursor-move"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            backgroundImage:
              "radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {/* Draw transitions */}
            {machine.transitions.map((transition) => {
              const fromState = machine.states.find((s) => s.id === transition.from);
              const toState = machine.states.find((s) => s.id === transition.to);
              if (!fromState || !toState) return null;

              const isCurrent = isSimulating && machine.currentStateId === fromState.id;

              return (
                <g key={transition.id}>
                  <motion.line
                    x1={fromState.x + 30}
                    y1={fromState.y + 30}
                    x2={toState.x + 30}
                    y2={toState.y + 30}
                    stroke={isCurrent ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                    strokeWidth={isCurrent ? 3 : 2}
                    markerEnd="url(#arrowhead)"
                    className="pointer-events-auto cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSimulating) {
                        simulateTransition(transition.id);
                      }
                    }}
                    animate={{
                      strokeDasharray: isCurrent ? "5,5" : "0,0",
                      strokeDashoffset: isCurrent ? 10 : 0,
                    }}
                    transition={{
                      repeat: isCurrent ? Infinity : 0,
                      duration: 1,
                      ease: "linear",
                    }}
                  />
                  {/* Transition label */}
                  <text
                    x={(fromState.x + toState.x) / 2 + 30}
                    y={(fromState.y + toState.y) / 2 + 20}
                    fill="hsl(var(--foreground))"
                    fontSize="12"
                    className="pointer-events-none select-none"
                    textAnchor="middle"
                  >
                    {transition.condition}
                  </text>
                </g>
              );
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3, 0 6"
                  fill="hsl(var(--muted-foreground))"
                />
              </marker>
            </defs>

            {/* Draw connecting line while dragging */}
            {connectingFrom && (
              <line
                x1={
                  (machine.states.find((s) => s.id === connectingFrom)?.x || 0) + 30
                }
                y1={
                  (machine.states.find((s) => s.id === connectingFrom)?.y || 0) + 30
                }
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="5,5"
                className="pointer-events-none"
              />
            )}
          </svg>

          {/* Draw states */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {machine.states.map((state) => {
              const isInitial = state.id === machine.initialStateId;
              const isCurrent = state.id === machine.currentStateId;
              const isSelected = state.id === selectedState;

              return (
                <motion.div
                  key={state.id}
                  data-state={state.id}
                  className={`absolute w-16 h-16 rounded-full flex items-center justify-center cursor-pointer select-none
                    ${isSelected ? "ring-2 ring-primary" : ""}
                    ${isCurrent && isSimulating ? "ring-2 ring-green-500" : ""}`}
                  style={{
                    left: state.x,
                    top: state.y,
                    backgroundColor: STATE_TYPE_COLORS[state.type],
                  }}
                  onMouseDown={(e) => handleStateMouseDown(e, state.id)}
                  animate={{
                    scale: isCurrent && isSimulating ? [1, 1.1, 1] : 1,
                  }}
                  transition={{
                    repeat: isCurrent && isSimulating ? Infinity : 0,
                    duration: 1,
                  }}
                >
                  <div className="text-center">
                    {isInitial && (
                      <div className="absolute -top-2 -left-2 bg-primary rounded-full p-1">
                        <Circle className="w-3 h-3 text-primary-foreground" fill="currentColor" />
                      </div>
                    )}
                    <div className="text-xs font-medium text-foreground truncate px-1">
                      {state.name}
                    </div>
                    <div className="text-[10px] text-muted-foreground">{state.type}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mini-map */}
        {showMinimap && (
          <div className="absolute bottom-4 right-4 w-48 h-32 border-2 border-border rounded-lg bg-background/90 backdrop-blur-sm p-2">
            <div className="relative w-full h-full">
              {machine.states.map((state) => (
                <div
                  key={state.id}
                  className="absolute w-2 h-2 rounded-full"
                  style={{
                    left: `${(state.x / 800) * 100}%`,
                    top: `${(state.y / 600) * 100}%`,
                    backgroundColor: STATE_TYPE_COLORS[state.type],
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      <div className="border-t border-border bg-muted/10">
        <AnimatePresence mode="wait">
          {selectedStateData ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Edit State</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeState(selectedStateData.id)}
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={selectedStateData.name}
                    onChange={(e) => updateState(selectedStateData.id, { name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={selectedStateData.type}
                    onValueChange={(value: StateType) =>
                      updateState(selectedStateData.id, { type: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="idle">Idle</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                      <SelectItem value="transition">Transition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setInitialState(selectedStateData.id)}
                  disabled={machine.initialStateId === selectedStateData.id}
                >
                  Set as Initial
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="validation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3"
            >
              <div className="flex items-start gap-2">
                {validationIssues.length > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                    <div className="space-y-1 flex-1">
                      <p className="text-xs font-medium text-warning">Validation Issues:</p>
                      {validationIssues.map((issue, i) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          • {issue}
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    <p className="text-xs text-muted-foreground">
                      State machine is valid. {machine.states.length} states, {machine.transitions.length} transitions.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Export State Machine</DialogTitle>
          </DialogHeader>
          <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as "json" | "js" | "mermaid")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="json">
                <FileJson className="w-3 h-3 mr-1" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="js">
                <FileCode className="w-3 h-3 mr-1" />
                JavaScript
              </TabsTrigger>
              <TabsTrigger value="mermaid">
                <GitBranch className="w-3 h-3 mr-1" />
                Mermaid
              </TabsTrigger>
            </TabsList>
            <TabsContent value="json" className="space-y-4">
              <ScrollArea className="h-64 w-full rounded-md border p-4">
                <pre className="text-xs">{generateExport("json")}</pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="js" className="space-y-4">
              <ScrollArea className="h-64 w-full rounded-md border p-4">
                <pre className="text-xs">{generateExport("js")}</pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="mermaid" className="space-y-4">
              <ScrollArea className="h-64 w-full rounded-md border p-4">
                <pre className="text-xs">{generateExport("mermaid")}</pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={copyToClipboard}>
              {copied ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1" />
                  Copy
                </>
              )}
            </Button>
            <Button onClick={() => setExportDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
