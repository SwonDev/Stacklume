"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  GitBranch,
  Play,
  Pause,
  RotateCcw,
  Download,
  Plus,
  Minus,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  FileJson,
  FileCode,
  Copy,
  CheckCircle2,
  Circle,
  Check,
  X,
  ChevronDown,
  ChevronRight,
  Search,
  Database,
  AlertCircle,
  Loader2,
  FolderTree,
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
  DialogTrigger,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface BehaviorTreeWidgetProps {
  widget: Widget;
}

type NodeType =
  | "sequence"
  | "selector"
  | "parallel"
  | "random"
  | "inverter"
  | "repeater"
  | "succeeder"
  | "until-fail"
  | "action"
  | "condition";

type NodeStatus = "idle" | "running" | "success" | "failure";

interface BTNode {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  x: number;
  y: number;
  parentId: string | null;
  children: string[];
  collapsed: boolean;
  status: NodeStatus;
  parameters?: Record<string, string | number | boolean>;
}

interface BehaviorTree {
  nodes: BTNode[];
  rootId: string | null;
  blackboard: Record<string, string | number | boolean>;
}

interface TreePreset {
  name: string;
  description: string;
  tree: BehaviorTree;
}

const NODE_COLORS: Record<NodeType, string> = {
  sequence: "hsl(210, 70%, 50%)",
  selector: "hsl(30, 90%, 55%)",
  parallel: "hsl(280, 60%, 55%)",
  random: "hsl(320, 70%, 55%)",
  inverter: "hsl(350, 70%, 55%)",
  repeater: "hsl(180, 60%, 50%)",
  succeeder: "hsl(120, 60%, 45%)",
  "until-fail": "hsl(0, 70%, 50%)",
  action: "hsl(260, 70%, 55%)",
  condition: "hsl(50, 90%, 55%)",
};

const STATUS_COLORS: Record<NodeStatus, string> = {
  idle: "hsl(var(--muted))",
  running: "hsl(210, 100%, 50%)",
  success: "hsl(142, 76%, 36%)",
  failure: "hsl(0, 84%, 60%)",
};

const NODE_CATEGORIES = {
  composite: ["sequence", "selector", "parallel", "random"],
  decorator: ["inverter", "repeater", "succeeder", "until-fail"],
  leaf: ["action", "condition"],
};

const PRESETS: Record<string, TreePreset> = {
  patrol: {
    name: "Patrol AI",
    description: "Basic enemy patrol behavior",
    tree: {
      rootId: "1",
      nodes: [
        {
          id: "1",
          type: "sequence",
          name: "Patrol Root",
          x: 400,
          y: 50,
          parentId: null,
          children: ["2", "3"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "2",
          type: "condition",
          name: "Is Alive?",
          x: 300,
          y: 150,
          parentId: "1",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "3",
          type: "selector",
          name: "Patrol or Chase",
          x: 500,
          y: 150,
          parentId: "1",
          children: ["4", "5"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "4",
          type: "sequence",
          name: "Chase Player",
          x: 400,
          y: 250,
          parentId: "3",
          children: ["6", "7"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "5",
          type: "action",
          name: "Patrol Waypoints",
          x: 600,
          y: 250,
          parentId: "3",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { speed: 2 },
        },
        {
          id: "6",
          type: "condition",
          name: "Player In Range?",
          x: 350,
          y: 350,
          parentId: "4",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { range: 10 },
        },
        {
          id: "7",
          type: "action",
          name: "Move To Player",
          x: 450,
          y: 350,
          parentId: "4",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { speed: 5 },
        },
      ],
      blackboard: {
        playerPosition: "0,0,0",
        health: 100,
        patrolSpeed: 2,
        chaseSpeed: 5,
        detectionRange: 10,
      },
    },
  },
  combat: {
    name: "Combat AI",
    description: "Advanced combat decision tree",
    tree: {
      rootId: "1",
      nodes: [
        {
          id: "1",
          type: "selector",
          name: "Combat Root",
          x: 400,
          y: 50,
          parentId: null,
          children: ["2", "3", "4"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "2",
          type: "sequence",
          name: "Flee",
          x: 200,
          y: 150,
          parentId: "1",
          children: ["5", "6"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "3",
          type: "sequence",
          name: "Attack",
          x: 400,
          y: 150,
          parentId: "1",
          children: ["7", "8"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "4",
          type: "action",
          name: "Heal",
          x: 600,
          y: 150,
          parentId: "1",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "5",
          type: "condition",
          name: "Health Low?",
          x: 150,
          y: 250,
          parentId: "2",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { threshold: 30 },
        },
        {
          id: "6",
          type: "action",
          name: "Run Away",
          x: 250,
          y: 250,
          parentId: "2",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "7",
          type: "condition",
          name: "Enemy In Range?",
          x: 350,
          y: 250,
          parentId: "3",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { range: 5 },
        },
        {
          id: "8",
          type: "action",
          name: "Melee Attack",
          x: 450,
          y: 250,
          parentId: "3",
          children: [],
          collapsed: false,
          status: "idle",
        },
      ],
      blackboard: {
        health: 100,
        maxHealth: 100,
        enemyDistance: 10,
        attackRange: 5,
        damage: 25,
      },
    },
  },
  npc: {
    name: "NPC Behavior",
    description: "General NPC daily routine",
    tree: {
      rootId: "1",
      nodes: [
        {
          id: "1",
          type: "sequence",
          name: "NPC Daily Routine",
          x: 400,
          y: 50,
          parentId: null,
          children: ["2", "3", "4"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "2",
          type: "parallel",
          name: "Morning Activities",
          x: 250,
          y: 150,
          parentId: "1",
          children: ["5", "6"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "3",
          type: "action",
          name: "Work",
          x: 400,
          y: 150,
          parentId: "1",
          children: [],
          collapsed: false,
          status: "idle",
          parameters: { duration: 8 },
        },
        {
          id: "4",
          type: "selector",
          name: "Evening Activities",
          x: 550,
          y: 150,
          parentId: "1",
          children: ["7", "8"],
          collapsed: false,
          status: "idle",
        },
        {
          id: "5",
          type: "action",
          name: "Eat Breakfast",
          x: 200,
          y: 250,
          parentId: "2",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "6",
          type: "action",
          name: "Check News",
          x: 300,
          y: 250,
          parentId: "2",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "7",
          type: "action",
          name: "Socialize",
          x: 500,
          y: 250,
          parentId: "4",
          children: [],
          collapsed: false,
          status: "idle",
        },
        {
          id: "8",
          type: "action",
          name: "Sleep",
          x: 600,
          y: 250,
          parentId: "4",
          children: [],
          collapsed: false,
          status: "idle",
        },
      ],
      blackboard: {
        timeOfDay: 0,
        energy: 100,
        hunger: 0,
        social: 50,
      },
    },
  },
};

const NODE_DESCRIPTIONS: Record<NodeType, string> = {
  sequence: "Executes children in order. Fails if any child fails.",
  selector: "Tries children until one succeeds. Fails if all fail.",
  parallel: "Executes all children simultaneously.",
  random: "Executes children in random order.",
  inverter: "Inverts the child's result (success <-> failure).",
  repeater: "Repeats the child node N times.",
  succeeder: "Always returns success regardless of child result.",
  "until-fail": "Repeats child until it fails.",
  action: "Performs an action in the game world.",
  condition: "Checks a condition and returns success/failure.",
};

export function BehaviorTreeWidget({ widget }: BehaviorTreeWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load tree from widget config
  const savedTree = widget.config?.behaviorTree as BehaviorTree | undefined;
  const [tree, setTree] = useState<BehaviorTree>(
    savedTree || {
      nodes: [],
      rootId: null,
      blackboard: {},
    }
  );

  // UI State
  const [zoom, setZoom] = useState(1);
  const [pan, _setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationSpeed, setSimulationSpeed] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMinimap, _setShowMinimap] = useState(true);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "js">("json");
  const [exportCode, setExportCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [clipboardNode, setClipboardNode] = useState<BTNode | null>(null);
  const [blackboardDialogOpen, setBlackboardDialogOpen] = useState(false);
  const [newBlackboardKey, setNewBlackboardKey] = useState("");
  const [newBlackboardValue, setNewBlackboardValue] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);
  const [_mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Save tree to widget config
  const saveTree = useCallback(
    (updatedTree: BehaviorTree) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          behaviorTree: updatedTree,
        },
      });
    },
    [widget.id, widget.config]
  );

  // Auto-save when tree changes
   
  useEffect(() => {
    const timer = setTimeout(() => {
      saveTree(tree);
    }, 500);
    return () => clearTimeout(timer);
  }, [tree]);

  // Node Management
  const addNode = useCallback(
    (type: NodeType, parentId: string | null = null) => {
      const newNode: BTNode = {
        id: Date.now().toString(),
        type,
        name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${tree.nodes.length + 1}`,
        x: 400,
        y: tree.nodes.length * 80 + 100,
        parentId,
        children: [],
        collapsed: false,
        status: "idle",
      };

      const updatedNodes = [...tree.nodes, newNode];

      // If adding to a parent, update parent's children
      if (parentId) {
        const parentIndex = updatedNodes.findIndex((n) => n.id === parentId);
        if (parentIndex !== -1) {
          updatedNodes[parentIndex] = {
            ...updatedNodes[parentIndex],
            children: [...updatedNodes[parentIndex].children, newNode.id],
          };
        }
      }

      const updatedTree = {
        ...tree,
        nodes: updatedNodes,
        rootId: tree.rootId || newNode.id,
      };

      setTree(updatedTree);
      setSelectedNode(newNode.id);
    },
    [tree]
  );

  const removeNode = useCallback(
    (id: string) => {
      const nodeToRemove = tree.nodes.find((n) => n.id === id);
      if (!nodeToRemove) return;

      // Recursively collect all descendant IDs
      const collectDescendants = (nodeId: string): string[] => {
        const node = tree.nodes.find((n) => n.id === nodeId);
        if (!node) return [];
        return [nodeId, ...node.children.flatMap(collectDescendants)];
      };

      const idsToRemove = collectDescendants(id);

      // Remove from parent's children
      const updatedNodes = tree.nodes
        .filter((n) => !idsToRemove.includes(n.id))
        .map((n) => ({
          ...n,
          children: n.children.filter((childId) => !idsToRemove.includes(childId)),
        }));

      const updatedTree = {
        ...tree,
        nodes: updatedNodes,
        rootId: tree.rootId === id ? (updatedNodes[0]?.id || null) : tree.rootId,
      };

      setTree(updatedTree);
      setSelectedNode(null);
    },
    [tree]
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<BTNode>) => {
      setTree({
        ...tree,
        nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      });
    },
    [tree]
  );

  const toggleCollapse = useCallback(
    (id: string) => {
      updateNode(id, { collapsed: !tree.nodes.find((n) => n.id === id)?.collapsed });
    },
    [tree.nodes, updateNode]
  );

  const copySubtree = useCallback(
    (id: string) => {
      const node = tree.nodes.find((n) => n.id === id);
      if (node) {
        setClipboardNode(JSON.parse(JSON.stringify(node)));
      }
    },
    [tree.nodes]
  );

  const pasteSubtree = useCallback(
    (parentId: string | null) => {
      if (!clipboardNode) return;

      const generateNewIds = (node: BTNode, parent: string | null): BTNode[] => {
        const newId = Date.now().toString() + Math.random();
        const newNode: BTNode = {
          ...node,
          id: newId,
          parentId: parent,
          x: (parent ? tree.nodes.find((n) => n.id === parent)?.x || 400 : 400) + 50,
          y: (parent ? tree.nodes.find((n) => n.id === parent)?.y || 100 : 100) + 100,
          children: [],
        };

        let allNodes = [newNode];

        node.children.forEach((childId) => {
          const childNode = tree.nodes.find((n) => n.id === childId);
          if (childNode) {
            const childNodes = generateNewIds(childNode, newId);
            allNodes = [...allNodes, ...childNodes];
            newNode.children.push(childNodes[0].id);
          }
        });

        return allNodes;
      };

      const newNodes = generateNewIds(clipboardNode, parentId);
      const updatedNodes = [...tree.nodes, ...newNodes];

      if (parentId) {
        const parentIndex = updatedNodes.findIndex((n) => n.id === parentId);
        if (parentIndex !== -1) {
          updatedNodes[parentIndex] = {
            ...updatedNodes[parentIndex],
            children: [...updatedNodes[parentIndex].children, newNodes[0].id],
          };
        }
      }

      setTree({ ...tree, nodes: updatedNodes });
    },
    [clipboardNode, tree]
  );

  // Simulation
  const simulateStep = useCallback(() => {
    if (!tree.rootId) return;

    const evaluateNode = (nodeId: string): NodeStatus => {
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (!node) return "failure";

      // Simulate based on node type
      switch (node.type) {
        case "sequence":
          for (const childId of node.children) {
            const childStatus = evaluateNode(childId);
            if (childStatus === "failure") return "failure";
            if (childStatus === "running") return "running";
          }
          return "success";

        case "selector":
          for (const childId of node.children) {
            const childStatus = evaluateNode(childId);
            if (childStatus === "success") return "success";
            if (childStatus === "running") return "running";
          }
          return "failure";

        case "parallel":
          const childStatuses = node.children.map(evaluateNode);
          if (childStatuses.some((s) => s === "failure")) return "failure";
          if (childStatuses.some((s) => s === "running")) return "running";
          return "success";

        case "random":
          if (node.children.length === 0) return "failure";
          const randomChild = node.children[Math.floor(Math.random() * node.children.length)];
          return evaluateNode(randomChild);

        case "inverter":
          if (node.children.length === 0) return "failure";
          const childResult = evaluateNode(node.children[0]);
          if (childResult === "success") return "failure";
          if (childResult === "failure") return "success";
          return childResult;

        case "succeeder":
          if (node.children.length > 0) evaluateNode(node.children[0]);
          return "success";

        case "action":
        case "condition":
          // Randomly succeed or fail for demonstration
          return Math.random() > 0.3 ? "success" : "failure";

        default:
          return "failure";
      }
    };

    const newStatus = evaluateNode(tree.rootId);

    // Update all node statuses
    const updateStatuses = (nodeId: string, status: NodeStatus) => {
      updateNode(nodeId, { status });
      const node = tree.nodes.find((n) => n.id === nodeId);
      node?.children.forEach((childId) => {
        const childNode = tree.nodes.find((n) => n.id === childId);
        if (childNode) {
          updateStatuses(childId, childNode.status);
        }
      });
    };

    updateStatuses(tree.rootId, newStatus);
  }, [tree, updateNode]);

  const resetSimulation = useCallback(() => {
    setTree({
      ...tree,
      nodes: tree.nodes.map((n) => ({ ...n, status: "idle" })),
    });
    setIsSimulating(false);
  }, [tree]);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      simulateStep();
    }, 1000 / simulationSpeed);

    return () => clearInterval(interval);
  }, [isSimulating, simulationSpeed, simulateStep]);

  // Blackboard Management
  const addBlackboardEntry = useCallback(() => {
    if (!newBlackboardKey) return;
    setTree({
      ...tree,
      blackboard: {
        ...tree.blackboard,
        [newBlackboardKey]: newBlackboardValue,
      },
    });
    setNewBlackboardKey("");
    setNewBlackboardValue("");
  }, [tree, newBlackboardKey, newBlackboardValue]);

  const removeBlackboardEntry = useCallback(
    (key: string) => {
      const newBlackboard = { ...tree.blackboard };
      delete newBlackboard[key];
      setTree({ ...tree, blackboard: newBlackboard });
    },
    [tree]
  );

  // Export Functions
  const generateExport = useCallback(
    (format: "json" | "js") => {
      if (format === "json") {
        return JSON.stringify(
          {
            nodes: tree.nodes.map((n) => ({
              id: n.id,
              type: n.type,
              name: n.name,
              parentId: n.parentId,
              children: n.children,
              parameters: n.parameters,
            })),
            rootId: tree.rootId,
            blackboard: tree.blackboard,
          },
          null,
          2
        );
      } else {
        // JavaScript class structure
        return `class BehaviorTree {
  constructor() {
    this.rootId = "${tree.rootId}";
    this.blackboard = ${JSON.stringify(tree.blackboard, null, 4)};
    this.nodes = new Map([
${tree.nodes
  .map(
    (n) => `      ["${n.id}", {
        type: "${n.type}",
        name: "${n.name}",
        children: [${n.children.map((c) => `"${c}"`).join(", ")}],
        execute: function(blackboard) {
          // Implement ${n.type} logic here
          return "success"; // or "failure" or "running"
        }
      }]`
  )
  .join(",\n")}
    ]);
  }

  tick() {
    return this.executeNode(this.rootId);
  }

  executeNode(nodeId) {
    const node = this.nodes.get(nodeId);
    if (!node) return "failure";

    return node.execute(this.blackboard);
  }

  getBlackboard() {
    return this.blackboard;
  }

  setBlackboard(key, value) {
    this.blackboard[key] = value;
  }
}

export default BehaviorTree;`;
      }
    },
    [tree]
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
      setTree(preset.tree);
    }
  }, []);

  // Canvas Interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setSelectedNode(null);
  }, []);

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setDraggingNode(nodeId);
    setSelectedNode(nodeId);
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      setMousePos({ x, y });

      if (draggingNode) {
        updateNode(draggingNode, { x, y });
      }
    },
    [draggingNode, pan, zoom, updateNode]
  );

  const handleMouseUp = useCallback(() => {
    setDraggingNode(null);
  }, []);

  // Search filtering
  const filteredNodes =
    searchQuery.trim() === ""
      ? tree.nodes
      : tree.nodes.filter(
          (n) =>
            n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            n.type.toLowerCase().includes(searchQuery.toLowerCase())
        );

  const selectedNodeData = tree.nodes.find((n) => n.id === selectedNode);

  // Calculate tree layout
  const getNodeIcon = (type: NodeType) => {
    if (NODE_CATEGORIES.composite.includes(type)) return GitBranch;
    if (NODE_CATEGORIES.decorator.includes(type)) return Circle;
    return type === "action" ? Play : AlertCircle;
  };

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/20">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-3 h-3 mr-1" />
              Node
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Add Node</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Composite Nodes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_CATEGORIES.composite.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addNode(type as NodeType, selectedNode)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Decorator Nodes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_CATEGORIES.decorator.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addNode(type as NodeType, selectedNode)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Leaf Nodes</Label>
                <div className="grid grid-cols-2 gap-2">
                  {NODE_CATEGORIES.leaf.map((type) => (
                    <Button
                      key={type}
                      variant="outline"
                      size="sm"
                      onClick={() => addNode(type as NodeType, selectedNode)}
                    >
                      {type}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <div className="h-4 w-px bg-border" />

        <Button
          variant={isSimulating ? "default" : "outline"}
          size="sm"
          onClick={() => setIsSimulating(!isSimulating)}
          disabled={!tree.rootId}
        >
          {isSimulating ? <Pause className="w-3 h-3 mr-1" /> : <Play className="w-3 h-3 mr-1" />}
          {isSimulating ? "Stop" : "Simulate"}
        </Button>

        <Button variant="outline" size="sm" onClick={resetSimulation} disabled={!isSimulating}>
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>

        <div className="h-4 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={() => setBlackboardDialogOpen(true)}>
          <Database className="w-3 h-3 mr-1" />
          Blackboard
        </Button>

        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1 max-w-xs ml-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
        </div>

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
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(PRESETS).map(([key, preset]) => (
                    <Button
                      key={key}
                      variant="outline"
                      size="sm"
                      onClick={() => loadPreset(key)}
                      className="justify-start"
                    >
                      <div className="text-left">
                        <div className="font-medium">{preset.name}</div>
                        <div className="text-xs text-muted-foreground">{preset.description}</div>
                      </div>
                    </Button>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Simulation Speed</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSimulationSpeed(Math.max(0.5, simulationSpeed - 0.5))}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="text-sm tabular-nums">{simulationSpeed}x</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSimulationSpeed(Math.min(5, simulationSpeed + 0.5))}
                  >
                    <Plus className="w-3 h-3" />
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
            backgroundImage: "radial-gradient(circle, hsl(var(--muted)) 1px, transparent 1px)",
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        >
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {/* Draw connections */}
            {tree.nodes.map((node) =>
              node.children.map((childId) => {
                const childNode = tree.nodes.find((n) => n.id === childId);
                if (!childNode || node.collapsed) return null;

                return (
                  <motion.line
                    key={`${node.id}-${childId}`}
                    x1={node.x + 40}
                    y1={node.y + 30}
                    x2={childNode.x + 40}
                    y2={childNode.y}
                    stroke={STATUS_COLORS[node.status]}
                    strokeWidth={2}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.3 }}
                  />
                );
              })
            )}
          </svg>

          {/* Draw nodes */}
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "0 0",
            }}
          >
            {filteredNodes.map((node) => {
              const isRoot = node.id === tree.rootId;
              const isSelected = node.id === selectedNode;
              const Icon = getNodeIcon(node.type);
              const hasChildren = node.children.length > 0;

              return (
                <motion.div
                  key={node.id}
                  data-node={node.id}
                  className={cn(
                    "absolute rounded-lg px-3 py-2 cursor-pointer select-none shadow-md",
                    "border-2 transition-all",
                    isSelected && "ring-2 ring-primary ring-offset-2"
                  )}
                  style={{
                    left: node.x,
                    top: node.y,
                    backgroundColor: NODE_COLORS[node.type],
                    borderColor: STATUS_COLORS[node.status],
                    minWidth: "80px",
                  }}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  animate={{
                    scale: node.status === "running" ? [1, 1.05, 1] : 1,
                  }}
                  transition={{
                    repeat: node.status === "running" ? Infinity : 0,
                    duration: 1,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {hasChildren && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollapse(node.id);
                        }}
                      >
                        {node.collapsed ? (
                          <ChevronRight className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </Button>
                    )}
                    <Icon className="w-4 h-4 text-white" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-white truncate">{node.name}</div>
                      <div className="text-[10px] text-white/70">{node.type}</div>
                    </div>
                    {isRoot && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        Root
                      </Badge>
                    )}
                    {node.status !== "idle" && (
                      <div className="ml-1">
                        {node.status === "success" && <Check className="w-3 h-3 text-green-300" />}
                        {node.status === "failure" && <X className="w-3 h-3 text-red-300" />}
                        {node.status === "running" && (
                          <Loader2 className="w-3 h-3 text-blue-300 animate-spin" />
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Mini-map */}
        {showMinimap && tree.nodes.length > 0 && (
          <div className="absolute bottom-4 right-4 w-48 h-32 border-2 border-border rounded-lg bg-background/90 backdrop-blur-sm p-2">
            <div className="relative w-full h-full">
              {tree.nodes.map((node) => (
                <div
                  key={node.id}
                  className="absolute w-2 h-2 rounded-sm"
                  style={{
                    left: `${(node.x / 1000) * 100}%`,
                    top: `${(node.y / 800) * 100}%`,
                    backgroundColor: NODE_COLORS[node.type],
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
          {selectedNodeData ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Edit Node</h3>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => copySubtree(selectedNodeData.id)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNode(selectedNodeData.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={selectedNodeData.name}
                    onChange={(e) => updateNode(selectedNodeData.id, { name: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select
                    value={selectedNodeData.type}
                    onValueChange={(value: NodeType) =>
                      updateNode(selectedNodeData.id, { type: value })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(NODE_COLORS).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Description</Label>
                <Input
                  value={selectedNodeData.description || ""}
                  onChange={(e) => updateNode(selectedNodeData.id, { description: e.target.value })}
                  className="h-8 text-xs"
                  placeholder={NODE_DESCRIPTIONS[selectedNodeData.type]}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTree({ ...tree, rootId: selectedNodeData.id })}
                  disabled={tree.rootId === selectedNodeData.id}
                >
                  Set as Root
                </Button>
                {clipboardNode && (
                  <Button variant="outline" size="sm" onClick={() => pasteSubtree(selectedNodeData.id)}>
                    Paste Child
                  </Button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="info"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3"
            >
              <div className="text-xs text-muted-foreground">
                {tree.nodes.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>Click &ldquo;Add Node&rdquo; to start building your behavior tree</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FolderTree className="w-4 h-4" />
                    <span>
                      {tree.nodes.length} node{tree.nodes.length !== 1 ? "s" : ""} •{" "}
                      {Object.keys(tree.blackboard).length} blackboard variable
                      {Object.keys(tree.blackboard).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Blackboard Dialog */}
      <Dialog open={blackboardDialogOpen} onOpenChange={setBlackboardDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Blackboard Variables</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Add Variable</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Key"
                  value={newBlackboardKey}
                  onChange={(e) => setNewBlackboardKey(e.target.value)}
                  className="h-8 text-xs"
                />
                <Input
                  placeholder="Value"
                  value={newBlackboardValue}
                  onChange={(e) => setNewBlackboardValue(e.target.value)}
                  className="h-8 text-xs"
                />
                <Button variant="outline" size="sm" onClick={addBlackboardEntry}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
            <Separator />
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {Object.entries(tree.blackboard).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex-1">
                      <div className="text-xs font-medium">{key}</div>
                      <div className="text-xs text-muted-foreground">{String(value)}</div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeBlackboardEntry(key)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {Object.keys(tree.blackboard).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No variables yet. Add one above.
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Export Behavior Tree</DialogTitle>
          </DialogHeader>
          <Tabs value={exportFormat} onValueChange={(v) => setExportFormat(v as "json" | "js")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="json">
                <FileJson className="w-3 h-3 mr-1" />
                JSON
              </TabsTrigger>
              <TabsTrigger value="js">
                <FileCode className="w-3 h-3 mr-1" />
                JavaScript
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
