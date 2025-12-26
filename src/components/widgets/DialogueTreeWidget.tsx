"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  MessageSquare,
  GitBranch,
  User,
  Plus,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  Download,
  Upload,
  Search,
  MapPin,
  Copy,
  CheckCircle2,
  Flag,
  Package,
  FileJson,
  FileCode,
  Play,
  X,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface DialogueTreeWidgetProps {
  widget: Widget;
}

type NodeType = "dialogue" | "choice" | "condition" | "action";

interface DialogueNode {
  id: string;
  type: NodeType;
  speaker?: string; // For dialogue nodes
  text: string;
  choices?: { id: string; text: string; targetId: string | null }[]; // For choice nodes
  condition?: string; // For condition nodes
  action?: string; // For action nodes (e.g., "giveItem:sword", "setFlag:questComplete")
  x: number;
  y: number;
}

interface Connection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface DialogueVariable {
  id: string;
  name: string;
  type: "boolean" | "number" | "string";
  defaultValue: string | number | boolean;
}

interface DialogueTree {
  nodes: DialogueNode[];
  connections: Connection[];
  variables: DialogueVariable[];
  startNodeId: string | null;
}

const NODE_TYPE_COLORS = {
  dialogue: "hsl(210, 70%, 50%)",
  choice: "hsl(280, 60%, 50%)",
  condition: "hsl(40, 80%, 50%)",
  action: "hsl(140, 60%, 45%)",
};

const NODE_TYPE_ICONS = {
  dialogue: MessageSquare,
  choice: GitBranch,
  condition: Flag,
  action: Package,
};

const DIALOGUE_PRESETS: Record<string, DialogueTree> = {
  simple: {
    nodes: [
      { id: "1", type: "dialogue", speaker: "NPC", text: "Hello, traveler!", x: 100, y: 150 },
      { id: "2", type: "choice", text: "Player Response", choices: [
        { id: "c1", text: "Hello! Who are you?", targetId: "3" },
        { id: "c2", text: "I'm busy. Goodbye.", targetId: null }
      ], x: 350, y: 150 },
      { id: "3", type: "dialogue", speaker: "NPC", text: "I'm a merchant. Would you like to see my wares?", x: 600, y: 150 },
    ],
    connections: [
      { id: "conn1", from: "1", to: "2" },
    ],
    variables: [],
    startNodeId: "1",
  },
  quest: {
    nodes: [
      { id: "1", type: "dialogue", speaker: "Quest Giver", text: "Please help! Bandits stole my heirloom!", x: 100, y: 150 },
      { id: "2", type: "choice", text: "Player Response", choices: [
        { id: "c1", text: "I'll help you!", targetId: "3" },
        { id: "c2", text: "Not my problem.", targetId: "4" }
      ], x: 350, y: 150 },
      { id: "3", type: "action", text: "Start Quest", action: "setFlag:questActive", x: 600, y: 80 },
      { id: "4", type: "dialogue", speaker: "Quest Giver", text: "Please reconsider...", x: 600, y: 220 },
      { id: "5", type: "condition", text: "Check Quest Complete", condition: "questComplete == true", x: 850, y: 80 },
      { id: "6", type: "dialogue", speaker: "Quest Giver", text: "Thank you! Here's your reward.", x: 1100, y: 80 },
      { id: "7", type: "action", text: "Give Reward", action: "giveItem:gold:100", x: 1350, y: 80 },
    ],
    connections: [
      { id: "conn1", from: "1", to: "2" },
      { id: "conn2", from: "3", to: "5" },
      { id: "conn3", from: "5", to: "6", label: "true" },
      { id: "conn4", from: "6", to: "7" },
    ],
    variables: [
      { id: "v1", name: "questActive", type: "boolean", defaultValue: false },
      { id: "v2", name: "questComplete", type: "boolean", defaultValue: false },
    ],
    startNodeId: "1",
  },
  shop: {
    nodes: [
      { id: "1", type: "dialogue", speaker: "Shopkeeper", text: "Welcome to my shop!", x: 100, y: 150 },
      { id: "2", type: "choice", text: "Player Options", choices: [
        { id: "c1", text: "Show me your wares", targetId: "3" },
        { id: "c2", text: "I want to sell items", targetId: "4" },
        { id: "c3", text: "Goodbye", targetId: null }
      ], x: 350, y: 150 },
      { id: "3", type: "condition", text: "Check Gold", condition: "gold >= 50", x: 600, y: 80 },
      { id: "4", type: "dialogue", speaker: "Shopkeeper", text: "What would you like to sell?", x: 600, y: 220 },
      { id: "5", type: "dialogue", speaker: "Shopkeeper", text: "Here are my finest items!", x: 850, y: 30 },
      { id: "6", type: "dialogue", speaker: "Shopkeeper", text: "You don't have enough gold...", x: 850, y: 130 },
    ],
    connections: [
      { id: "conn1", from: "1", to: "2" },
      { id: "conn2", from: "3", to: "5", label: "true" },
      { id: "conn3", from: "3", to: "6", label: "false" },
    ],
    variables: [
      { id: "v1", name: "gold", type: "number", defaultValue: 100 },
    ],
    startNodeId: "1",
  },
};

export function DialogueTreeWidget({ widget }: DialogueTreeWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load dialogue tree from widget config
  const savedTree = widget.config?.dialogueTree as DialogueTree | undefined;
  const [tree, setTree] = useState<DialogueTree>(
    savedTree || {
      nodes: [],
      connections: [],
      variables: [],
      startNodeId: null,
    }
  );

  // UI State
  const [zoom, setZoom] = useState(1);
  const [pan, _setPan] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [draggingNode, setDraggingNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMinimap, setShowMinimap] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [currentPreviewNode, setCurrentPreviewNode] = useState<string | null>(null);
  const [showVariables, setShowVariables] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"json" | "js">("json");
  const [exportCode, setExportCode] = useState("");
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Save tree to widget config
  const saveTree = useCallback(
    (updatedTree: DialogueTree) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          dialogueTree: updatedTree,
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
  const addNode = useCallback((type: NodeType) => {
    const newNode: DialogueNode = {
      id: Date.now().toString(),
      type,
      text: type === "dialogue" ? "New dialogue text..." : type === "choice" ? "Player choice" : type === "condition" ? "variable == value" : "action:value",
      speaker: type === "dialogue" ? "Speaker" : undefined,
      choices: type === "choice" ? [{ id: `choice-${Date.now()}`, text: "Option 1", targetId: null }] : undefined,
      condition: type === "condition" ? "variable == value" : undefined,
      action: type === "action" ? "setFlag:flagName" : undefined,
      x: 300 + tree.nodes.length * 50,
      y: 200,
    };
    const updatedTree = { ...tree, nodes: [...tree.nodes, newNode] };
    if (!tree.startNodeId) {
      updatedTree.startNodeId = newNode.id;
    }
    setTree(updatedTree);
  }, [tree]);

  const removeNode = useCallback(
    (id: string) => {
      const updatedTree = {
        ...tree,
        nodes: tree.nodes.filter((n) => n.id !== id),
        connections: tree.connections.filter((c) => c.from !== id && c.to !== id),
      };
      if (tree.startNodeId === id) {
        updatedTree.startNodeId = updatedTree.nodes[0]?.id || null;
      }
      setTree(updatedTree);
      setSelectedNode(null);
    },
    [tree]
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<DialogueNode>) => {
      setTree({
        ...tree,
        nodes: tree.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
      });
    },
    [tree]
  );

  const addConnection = useCallback(
    (from: string, to: string, label?: string) => {
      const newConnection: Connection = {
        id: Date.now().toString(),
        from,
        to,
        label,
      };
      setTree({
        ...tree,
        connections: [...tree.connections, newConnection],
      });
    },
    [tree]
  );

  const removeConnection = useCallback(
    (id: string) => {
      setTree({
        ...tree,
        connections: tree.connections.filter((c) => c.id !== id),
      });
    },
    [tree]
  );

  // Choice Management
  const addChoice = useCallback(
    (nodeId: string) => {
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (node && node.type === "choice") {
        const newChoice = {
          id: `choice-${Date.now()}`,
          text: `Option ${(node.choices?.length || 0) + 1}`,
          targetId: null,
        };
        updateNode(nodeId, {
          choices: [...(node.choices || []), newChoice],
        });
      }
    },
    [tree, updateNode]
  );

  const removeChoice = useCallback(
    (nodeId: string, choiceId: string) => {
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (node && node.type === "choice") {
        updateNode(nodeId, {
          choices: node.choices?.filter((c) => c.id !== choiceId),
        });
      }
    },
    [tree, updateNode]
  );

  const updateChoice = useCallback(
    (nodeId: string, choiceId: string, updates: Partial<{ text: string; targetId: string | null }>) => {
      const node = tree.nodes.find((n) => n.id === nodeId);
      if (node && node.type === "choice") {
        updateNode(nodeId, {
          choices: node.choices?.map((c) => (c.id === choiceId ? { ...c, ...updates } : c)),
        });
      }
    },
    [tree, updateNode]
  );

  // Variable Management
  const addVariable = useCallback(() => {
    const newVariable: DialogueVariable = {
      id: Date.now().toString(),
      name: `variable${tree.variables.length + 1}`,
      type: "boolean",
      defaultValue: false,
    };
    setTree({
      ...tree,
      variables: [...tree.variables, newVariable],
    });
  }, [tree]);

  const removeVariable = useCallback(
    (id: string) => {
      setTree({
        ...tree,
        variables: tree.variables.filter((v) => v.id !== id),
      });
    },
    [tree]
  );

  const updateVariable = useCallback(
    (id: string, updates: Partial<DialogueVariable>) => {
      setTree({
        ...tree,
        variables: tree.variables.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      });
    },
    [tree]
  );

  // Search
  const searchResults = tree.nodes.filter((node) =>
    node.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (node.speaker && node.speaker.toLowerCase().includes(searchQuery.toLowerCase()))
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
              speaker: n.speaker,
              text: n.text,
              choices: n.choices,
              condition: n.condition,
              action: n.action,
            })),
            connections: tree.connections,
            variables: tree.variables,
            startNodeId: tree.startNodeId,
          },
          null,
          2
        );
      } else {
        return `class DialogueTree {
  constructor() {
    this.currentNodeId = "${tree.startNodeId || ""}";
    this.variables = {
${tree.variables.map((v) => `      ${v.name}: ${JSON.stringify(v.defaultValue)}`).join(",\n")}
    };
    this.nodes = {
${tree.nodes.map((n) => {
  let nodeStr = `      "${n.id}": {\n        type: "${n.type}",\n`;
  if (n.speaker) nodeStr += `        speaker: "${n.speaker}",\n`;
  nodeStr += `        text: "${n.text.replace(/"/g, '\\"')}"`;
  if (n.choices) {
    nodeStr += `,\n        choices: [\n${n.choices.map((c) => `          { text: "${c.text.replace(/"/g, '\\"')}", targetId: "${c.targetId || ""}" }`).join(",\n")}\n        ]`;
  }
  if (n.condition) nodeStr += `,\n        condition: "${n.condition}"`;
  if (n.action) nodeStr += `,\n        action: "${n.action}"`;
  nodeStr += "\n      }";
  return nodeStr;
}).join(",\n")}
    };
  }

  getCurrentNode() {
    return this.nodes[this.currentNodeId];
  }

  selectChoice(choiceIndex) {
    const node = this.getCurrentNode();
    if (node && node.choices && node.choices[choiceIndex]) {
      this.currentNodeId = node.choices[choiceIndex].targetId;
      return true;
    }
    return false;
  }

  evaluateCondition(condition) {
    // Simple condition evaluation (extend as needed)
    try {
      return new Function(...Object.keys(this.variables), \`return \${condition};\`)(...Object.values(this.variables));
    } catch (e) {
      return false;
    }
  }

  executeAction(action) {
    const [actionType, ...params] = action.split(":");
    if (actionType === "setFlag") {
      this.variables[params[0]] = true;
    } else if (actionType === "giveItem") {
      // Implement item system
      console.log("Give item:", params);
    }
  }

  reset() {
    this.currentNodeId = "${tree.startNodeId || ""}";
  }
}

export default DialogueTree;`;
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

  const handleImport = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            setTree(imported);
          } catch (error) {
            console.error("Failed to import dialogue tree:", error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  // Preset Loading
  const loadPreset = useCallback((presetKey: string) => {
    const preset = DIALOGUE_PRESETS[presetKey];
    if (preset) {
      setTree(preset);
    }
  }, []);

  // Preview Mode
  const startPreview = useCallback(() => {
    setPreviewMode(true);
    setCurrentPreviewNode(tree.startNodeId);
  }, [tree.startNodeId]);

  const selectPreviewChoice = useCallback((targetId: string | null) => {
    if (targetId) {
      setCurrentPreviewNode(targetId);
    } else {
      setPreviewMode(false);
      setCurrentPreviewNode(null);
    }
  }, []);

  // Canvas Interactions
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setSelectedNode(null);
    setConnectingFrom(null);
  }, []);

  const handleNodeMouseDown = useCallback(
    (e: React.MouseEvent, nodeId: string) => {
      e.stopPropagation();
      if (connectingFrom) {
        if (connectingFrom !== nodeId) {
          addConnection(connectingFrom, nodeId);
        }
        setConnectingFrom(null);
      } else {
        setDraggingNode(nodeId);
        setSelectedNode(nodeId);
      }
    },
    [connectingFrom, addConnection]
  );

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

  const selectedNodeData = tree.nodes.find((n) => n.id === selectedNode);
  const currentPreviewNodeData = tree.nodes.find((n) => n.id === currentPreviewNode);

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/20 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => addNode("dialogue")}>
            <MessageSquare className="w-3 h-3 mr-1" />
            Dialogue
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode("choice")}>
            <GitBranch className="w-3 h-3 mr-1" />
            Choice
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode("condition")}>
            <Flag className="w-3 h-3 mr-1" />
            Condition
          </Button>
          <Button variant="outline" size="sm" onClick={() => addNode("action")}>
            <Package className="w-3 h-3 mr-1" />
            Action
          </Button>
        </div>

        <div className="h-4 w-px bg-border" />

        <Button
          variant={previewMode ? "default" : "outline"}
          size="sm"
          onClick={startPreview}
          disabled={!tree.startNodeId || previewMode}
        >
          <Play className="w-3 h-3 mr-1" />
          Preview
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setConnectingFrom(selectedNode)}
          disabled={!selectedNode}
        >
          <GitBranch className="w-3 h-3 mr-1" />
          Connect
        </Button>

        <div className="flex-1" />

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 pl-7 pr-2 text-xs w-32"
          />
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
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={() => loadPreset("simple")}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Simple
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadPreset("quest")}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Quest
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => loadPreset("shop")}>
                    <Sparkles className="w-3 h-3 mr-1" />
                    Shop
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
                  <Button
                    variant={showVariables ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowVariables(!showVariables)}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    Variables
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" size="sm" onClick={handleImport}>
          <Upload className="w-3 h-3 mr-1" />
          Import
        </Button>

        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="w-3 h-3 mr-1" />
          Export
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden bg-muted/5" onClick={handleCanvasClick}>
          {!previewMode ? (
            <>
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
                  {/* Draw connections */}
                  {tree.connections.map((connection) => {
                    const fromNode = tree.nodes.find((n) => n.id === connection.from);
                    const toNode = tree.nodes.find((n) => n.id === connection.to);
                    if (!fromNode || !toNode) return null;

                    const isHighlighted = searchQuery && (
                      searchResults.some((n) => n.id === fromNode.id) ||
                      searchResults.some((n) => n.id === toNode.id)
                    );

                    return (
                      <g key={connection.id}>
                        <motion.line
                          x1={fromNode.x + 60}
                          y1={fromNode.y + 40}
                          x2={toNode.x + 60}
                          y2={toNode.y + 40}
                          stroke={isHighlighted ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"}
                          strokeWidth={isHighlighted ? 3 : 2}
                          markerEnd="url(#arrowhead)"
                          className="pointer-events-auto cursor-pointer hover:stroke-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeConnection(connection.id);
                          }}
                        />
                        {connection.label && (
                          <text
                            x={(fromNode.x + toNode.x) / 2 + 60}
                            y={(fromNode.y + toNode.y) / 2 + 30}
                            fill="hsl(var(--foreground))"
                            fontSize="10"
                            className="pointer-events-none select-none"
                            textAnchor="middle"
                          >
                            {connection.label}
                          </text>
                        )}
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
                      x1={(tree.nodes.find((n) => n.id === connectingFrom)?.x || 0) + 60}
                      y1={(tree.nodes.find((n) => n.id === connectingFrom)?.y || 0) + 40}
                      x2={mousePos.x}
                      y2={mousePos.y}
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      className="pointer-events-none"
                    />
                  )}
                </svg>

                {/* Draw nodes */}
                <div
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "0 0",
                  }}
                >
                  {tree.nodes.map((node) => {
                    const isStart = node.id === tree.startNodeId;
                    const isSelected = node.id === selectedNode;
                    const isSearchResult = searchResults.some((n) => n.id === node.id);
                    const Icon = NODE_TYPE_ICONS[node.type];

                    return (
                      <motion.div
                        key={node.id}
                        data-node={node.id}
                        className={`absolute w-30 min-h-20 rounded-lg p-2 cursor-pointer select-none shadow-md
                          ${isSelected ? "ring-2 ring-primary" : ""}
                          ${isSearchResult ? "ring-2 ring-yellow-500" : ""}`}
                        style={{
                          left: node.x,
                          top: node.y,
                          backgroundColor: NODE_TYPE_COLORS[node.type],
                          opacity: searchQuery && !isSearchResult ? 0.3 : 1,
                        }}
                        onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isStart && (
                          <div className="absolute -top-2 -left-2 bg-green-500 rounded-full p-1">
                            <Play className="w-3 h-3 text-white" fill="currentColor" />
                          </div>
                        )}
                        <div className="flex items-start gap-1 mb-1">
                          <Icon className="w-4 h-4 text-white/90 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            {node.speaker && (
                              <div className="text-xs font-bold text-white/90 truncate">
                                {node.speaker}
                              </div>
                            )}
                            <div className="text-xs text-white/80 line-clamp-2 break-words">
                              {node.text}
                            </div>
                          </div>
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1 bg-black/20 text-white"
                        >
                          {node.type}
                        </Badge>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Mini-map */}
              {showMinimap && (
                <div className="absolute bottom-4 right-4 w-48 h-32 border-2 border-border rounded-lg bg-background/90 backdrop-blur-sm p-2">
                  <div className="relative w-full h-full">
                    {tree.nodes.map((node) => (
                      <div
                        key={node.id}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{
                          left: `${(node.x / 1200) * 100}%`,
                          top: `${(node.y / 800) * 100}%`,
                          backgroundColor: NODE_TYPE_COLORS[node.type],
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Preview Mode */
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="max-w-2xl w-full space-y-4">
                {currentPreviewNodeData ? (
                  <motion.div
                    key={currentPreviewNodeData.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-lg p-6 shadow-lg"
                  >
                    {currentPreviewNodeData.speaker && (
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-primary" />
                        <span className="font-bold text-lg">{currentPreviewNodeData.speaker}</span>
                      </div>
                    )}
                    <p className="text-foreground mb-6 text-base leading-relaxed">
                      {currentPreviewNodeData.text}
                    </p>

                    {currentPreviewNodeData.type === "choice" && currentPreviewNodeData.choices && (
                      <div className="space-y-2">
                        {currentPreviewNodeData.choices.map((choice) => (
                          <Button
                            key={choice.id}
                            variant="outline"
                            className="w-full justify-start text-left"
                            onClick={() => selectPreviewChoice(choice.targetId)}
                          >
                            {choice.text}
                          </Button>
                        ))}
                      </div>
                    )}

                    {currentPreviewNodeData.type === "dialogue" && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            const nextConnection = tree.connections.find(
                              (c) => c.from === currentPreviewNodeData.id
                            );
                            if (nextConnection) {
                              setCurrentPreviewNode(nextConnection.to);
                            } else {
                              setPreviewMode(false);
                              setCurrentPreviewNode(null);
                            }
                          }}
                        >
                          Continue
                        </Button>
                      </div>
                    )}

                    {(currentPreviewNodeData.type === "condition" || currentPreviewNodeData.type === "action") && (
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            const nextConnection = tree.connections.find(
                              (c) => c.from === currentPreviewNodeData.id
                            );
                            if (nextConnection) {
                              setCurrentPreviewNode(nextConnection.to);
                            } else {
                              setPreviewMode(false);
                              setCurrentPreviewNode(null);
                            }
                          }}
                        >
                          Continue
                        </Button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <p>Dialogue complete</p>
                    <Button
                      className="mt-4"
                      onClick={() => {
                        setPreviewMode(false);
                        setCurrentPreviewNode(null);
                      }}
                    >
                      Exit Preview
                    </Button>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setPreviewMode(false);
                    setCurrentPreviewNode(null);
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Exit Preview
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Variables Panel */}
        {showVariables && !previewMode && (
          <div className="w-64 border-l border-border bg-muted/10">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">Variables</h3>
              <Button variant="ghost" size="sm" onClick={addVariable}>
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-3rem)]">
              <div className="p-3 space-y-2">
                {tree.variables.map((variable) => (
                  <div key={variable.id} className="p-2 bg-background rounded border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <Input
                        value={variable.name}
                        onChange={(e) => updateVariable(variable.id, { name: e.target.value })}
                        className="h-6 text-xs flex-1 mr-1"
                        placeholder="Variable name"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariable(variable.id)}
                      >
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                    <Select
                      value={variable.type}
                      onValueChange={(value: "boolean" | "number" | "string") =>
                        updateVariable(variable.id, { type: value })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="string">String</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={String(variable.defaultValue)}
                      onChange={(e) => {
                        let value: string | number | boolean = e.target.value;
                        if (variable.type === "boolean") value = value === "true";
                        if (variable.type === "number") value = Number(value);
                        updateVariable(variable.id, { defaultValue: value });
                      }}
                      className="h-6 text-xs"
                      placeholder="Default value"
                    />
                  </div>
                ))}
                {tree.variables.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No variables yet
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Bottom Panel - Node Editor */}
      {selectedNodeData && !previewMode && (
        <div className="border-t border-border bg-muted/10">
          <AnimatePresence mode="wait">
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="p-3 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Edit Node</h3>
                <div className="flex gap-2">
                  {selectedNodeData.id !== tree.startNodeId && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTree({ ...tree, startNodeId: selectedNodeData.id })}
                    >
                      <Play className="w-3 h-3 mr-1" />
                      Set as Start
                    </Button>
                  )}
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
                      <SelectItem value="dialogue">Dialogue</SelectItem>
                      <SelectItem value="choice">Choice</SelectItem>
                      <SelectItem value="condition">Condition</SelectItem>
                      <SelectItem value="action">Action</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedNodeData.type === "dialogue" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Speaker</Label>
                    <Input
                      value={selectedNodeData.speaker || ""}
                      onChange={(e) => updateNode(selectedNodeData.id, { speaker: e.target.value })}
                      className="h-8 text-xs"
                      placeholder="Speaker name"
                    />
                  </div>
                )}
              </div>

              {selectedNodeData.type === "dialogue" || selectedNodeData.type === "choice" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Text</Label>
                  <Textarea
                    value={selectedNodeData.text}
                    onChange={(e) => updateNode(selectedNodeData.id, { text: e.target.value })}
                    className="text-xs min-h-16"
                    placeholder="Enter dialogue text..."
                  />
                </div>
              ) : selectedNodeData.type === "condition" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Condition</Label>
                  <Input
                    value={selectedNodeData.condition || ""}
                    onChange={(e) => updateNode(selectedNodeData.id, { condition: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="e.g., gold >= 50"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <Label className="text-xs">Action</Label>
                  <Input
                    value={selectedNodeData.action || ""}
                    onChange={(e) => updateNode(selectedNodeData.id, { action: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="e.g., setFlag:questComplete"
                  />
                </div>
              )}

              {selectedNodeData.type === "choice" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Choices</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addChoice(selectedNodeData.id)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Choice
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedNodeData.choices?.map((choice) => (
                      <div key={choice.id} className="flex gap-2 items-center">
                        <Input
                          value={choice.text}
                          onChange={(e) =>
                            updateChoice(selectedNodeData.id, choice.id, { text: e.target.value })
                          }
                          className="h-7 text-xs flex-1"
                          placeholder="Choice text"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeChoice(selectedNodeData.id, choice.id)}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      )}

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Export Dialogue Tree</DialogTitle>
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
              <ScrollArea className="h-96 w-full rounded-md border p-4">
                <pre className="text-xs">{generateExport("json")}</pre>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="js" className="space-y-4">
              <ScrollArea className="h-96 w-full rounded-md border p-4">
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
