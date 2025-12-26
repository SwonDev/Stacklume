"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Zap,
  Sword,
  Shield,
  Sparkles,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Settings,
  ZoomIn,
  ZoomOut,
  Download,
  FileJson,
  FileCode,
  RotateCcw,
  Eye,
  EyeOff,
  Star,
  Target,
  Flame,
  Heart,
  Wand2,
  TrendingUp,
  Copy,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Unlink,
  ChevronRight,
  Save,
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
  DialogDescription,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface SkillTreeWidgetProps {
  widget: Widget;
}

type SkillCategory = "combat" | "magic" | "utility" | "passive";

interface SkillNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  cost: number;
  maxLevel: number;
  currentLevel: number;
  category: SkillCategory;
  prerequisites: string[];
  position: { x: number; y: number };
  tier: number;
  statBonuses: StatBonus[];
}

interface StatBonus {
  stat: string;
  value: number;
  perLevel: boolean;
}

interface SkillConnection {
  from: string;
  to: string;
}

interface SkillTreeConfig {
  nodes: SkillNode[];
  connections: SkillConnection[];
  availablePoints: number;
  spentPoints: number;
  totalStats: Record<string, number>;
  isPreviewMode: boolean;
  previewSnapshot?: {
    nodes: SkillNode[];
    availablePoints: number;
    spentPoints: number;
  };
}

// Emoji picker for skill icons
const EMOJI_PRESETS = [
  "⚔️", "🛡️", "🏹", "🗡️", "🔨", "⚡", "🔥", "❄️", "💧", "🌪️",
  "✨", "🌟", "💫", "🔮", "📖", "🧪", "🎯", "🎲", "💎", "👑",
  "🦅", "🐺", "🦁", "🐲", "🦖", "🧙", "🧝", "⚗️", "🗝️", "💰",
  "❤️", "💪", "🧠", "👁️", "🦴", "🩸", "⚙️", "🔧", "🔩", "⛏️",
  "🌿", "🌾", "🍃", "🌺", "🌸", "🎨", "🎭", "🎪", "🎬", "🎼",
];

const CATEGORY_CONFIG: Record<SkillCategory, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  combat: { label: "Combate", color: "text-red-500", icon: Sword },
  magic: { label: "Magia", color: "text-purple-500", icon: Sparkles },
  utility: { label: "Utilidad", color: "text-blue-500", icon: Target },
  passive: { label: "Pasiva", color: "text-green-500", icon: Shield },
};

// Preset skill trees
const PRESET_TREES: Record<string, Partial<SkillTreeConfig>> = {
  warrior: {
    nodes: [
      {
        id: "w1",
        name: "Golpe Básico",
        description: "+10% daño físico",
        icon: "⚔️",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "combat",
        prerequisites: [],
        position: { x: 200, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Daño Físico", value: 10, perLevel: true }],
      },
      {
        id: "w2",
        name: "Resistencia",
        description: "+5% vida máxima",
        icon: "🛡️",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "passive",
        prerequisites: [],
        position: { x: 100, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Vida Máxima", value: 5, perLevel: true }],
      },
      {
        id: "w3",
        name: "Golpe Crítico",
        description: "+2% probabilidad de crítico",
        icon: "💫",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "combat",
        prerequisites: ["w1"],
        position: { x: 200, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Prob. Crítico", value: 2, perLevel: true }],
      },
      {
        id: "w4",
        name: "Bloqueo",
        description: "+10% probabilidad de bloqueo",
        icon: "🛡️",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "passive",
        prerequisites: ["w2"],
        position: { x: 100, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Bloqueo", value: 10, perLevel: true }],
      },
      {
        id: "w5",
        name: "Golpe Devastador",
        description: "+50% daño crítico",
        icon: "💥",
        cost: 3,
        maxLevel: 1,
        currentLevel: 0,
        category: "combat",
        prerequisites: ["w3"],
        position: { x: 200, y: 300 },
        tier: 3,
        statBonuses: [{ stat: "Daño Crítico", value: 50, perLevel: false }],
      },
    ],
    connections: [
      { from: "w1", to: "w3" },
      { from: "w2", to: "w4" },
      { from: "w3", to: "w5" },
    ],
    availablePoints: 15,
    spentPoints: 0,
    totalStats: {},
    isPreviewMode: false,
  },
  mage: {
    nodes: [
      {
        id: "m1",
        name: "Rayo Arcano",
        description: "+15% daño mágico",
        icon: "⚡",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "magic",
        prerequisites: [],
        position: { x: 200, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Daño Mágico", value: 15, perLevel: true }],
      },
      {
        id: "m2",
        name: "Concentración",
        description: "+5% maná máximo",
        icon: "🔮",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "passive",
        prerequisites: [],
        position: { x: 100, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Maná Máximo", value: 5, perLevel: true }],
      },
      {
        id: "m3",
        name: "Bola de Fuego",
        description: "Habilidad: Daño de área",
        icon: "🔥",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "magic",
        prerequisites: ["m1"],
        position: { x: 200, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Daño de Área", value: 20, perLevel: true }],
      },
      {
        id: "m4",
        name: "Regeneración Mágica",
        description: "+2 maná/segundo",
        icon: "✨",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "passive",
        prerequisites: ["m2"],
        position: { x: 100, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Regen. Maná", value: 2, perLevel: true }],
      },
      {
        id: "m5",
        name: "Tormenta Arcana",
        description: "Habilidad definitiva",
        icon: "🌪️",
        cost: 3,
        maxLevel: 1,
        currentLevel: 0,
        category: "magic",
        prerequisites: ["m3"],
        position: { x: 200, y: 300 },
        tier: 3,
        statBonuses: [{ stat: "Poder Definitivo", value: 100, perLevel: false }],
      },
    ],
    connections: [
      { from: "m1", to: "m3" },
      { from: "m2", to: "m4" },
      { from: "m3", to: "m5" },
    ],
    availablePoints: 15,
    spentPoints: 0,
    totalStats: {},
    isPreviewMode: false,
  },
  rogue: {
    nodes: [
      {
        id: "r1",
        name: "Sigilo",
        description: "+10% velocidad de movimiento",
        icon: "🌿",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "utility",
        prerequisites: [],
        position: { x: 200, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Velocidad", value: 10, perLevel: true }],
      },
      {
        id: "r2",
        name: "Agilidad",
        description: "+5% evasión",
        icon: "💨",
        cost: 1,
        maxLevel: 5,
        currentLevel: 0,
        category: "passive",
        prerequisites: [],
        position: { x: 100, y: 100 },
        tier: 1,
        statBonuses: [{ stat: "Evasión", value: 5, perLevel: true }],
      },
      {
        id: "r3",
        name: "Golpe Furtivo",
        description: "+30% daño desde sigilo",
        icon: "🗡️",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "combat",
        prerequisites: ["r1"],
        position: { x: 200, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Daño Furtivo", value: 30, perLevel: true }],
      },
      {
        id: "r4",
        name: "Reflejos",
        description: "+15% prob. contraataque",
        icon: "⚡",
        cost: 2,
        maxLevel: 3,
        currentLevel: 0,
        category: "passive",
        prerequisites: ["r2"],
        position: { x: 100, y: 200 },
        tier: 2,
        statBonuses: [{ stat: "Contraataque", value: 15, perLevel: true }],
      },
      {
        id: "r5",
        name: "Asesinar",
        description: "Mata instantáneamente bajo 20% vida",
        icon: "💀",
        cost: 3,
        maxLevel: 1,
        currentLevel: 0,
        category: "combat",
        prerequisites: ["r3", "r4"],
        position: { x: 150, y: 300 },
        tier: 3,
        statBonuses: [{ stat: "Ejecución", value: 1, perLevel: false }],
      },
    ],
    connections: [
      { from: "r1", to: "r3" },
      { from: "r2", to: "r4" },
      { from: "r3", to: "r5" },
      { from: "r4", to: "r5" },
    ],
    availablePoints: 15,
    spentPoints: 0,
    totalStats: {},
    isPreviewMode: false,
  },
};

export function SkillTreeWidget({ widget }: SkillTreeWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config || {}) as Partial<SkillTreeConfig>;

  const [nodes, setNodes] = useState<SkillNode[]>(config.nodes || []);
  const [connections, setConnections] = useState<SkillConnection[]>(config.connections || []);
  const [availablePoints, setAvailablePoints] = useState(config.availablePoints || 10);
  const [spentPoints, setSpentPoints] = useState(config.spentPoints || 0);
  const [isPreviewMode, setIsPreviewMode] = useState(config.isPreviewMode || false);
  const [previewSnapshot, setPreviewSnapshot] = useState(config.previewSnapshot);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Modals and UI state
  const [showAddNode, setShowAddNode] = useState(false);
  const [showEditNode, setShowEditNode] = useState(false);
  const [editingNode, setEditingNode] = useState<SkillNode | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showConnectionMode, setShowConnectionMode] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  // Form state for new/edit node
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "⚔️",
    cost: 1,
    maxLevel: 1,
    category: "combat" as SkillCategory,
    tier: 1,
    position: { x: 200, y: 200 },
    statBonuses: [] as StatBonus[],
  });

  // Calculate total stats from allocated skills
  const calculateTotalStats = useCallback((nodeList: SkillNode[]) => {
    const stats: Record<string, number> = {};
    nodeList.forEach((node) => {
      if (node.currentLevel > 0) {
        node.statBonuses.forEach((bonus) => {
          const value = bonus.perLevel ? bonus.value * node.currentLevel : bonus.value;
          stats[bonus.stat] = (stats[bonus.stat] || 0) + value;
        });
      }
    });
    return stats;
  }, []);

  const totalStats = calculateTotalStats(nodes);

  // Check if a skill can be unlocked
  const canUnlockSkill = useCallback(
    (node: SkillNode) => {
      if (node.currentLevel >= node.maxLevel) return false;
      if (availablePoints < node.cost) return false;

      // Check prerequisites
      return node.prerequisites.every((prereqId) => {
        const prereq = nodes.find((n) => n.id === prereqId);
        return prereq && prereq.currentLevel > 0;
      });
    },
    [nodes, availablePoints]
  );

  // Allocate skill point
  const allocateSkillPoint = useCallback(
    (nodeId: string) => {
      const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
      if (nodeIndex === -1) return;

      const node = nodes[nodeIndex];
      if (!canUnlockSkill(node)) return;

      const newNodes = [...nodes];
      newNodes[nodeIndex] = {
        ...node,
        currentLevel: node.currentLevel + 1,
      };

      setNodes(newNodes);
      setAvailablePoints((prev) => prev - node.cost);
      setSpentPoints((prev) => prev + node.cost);

      toast.success(`${node.name} mejorada a nivel ${node.currentLevel + 1}`);
    },
    [nodes, canUnlockSkill]
  );

  // Refund skill point
  const refundSkillPoint = useCallback(
    (nodeId: string) => {
      const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
      if (nodeIndex === -1) return;

      const node = nodes[nodeIndex];
      if (node.currentLevel === 0) return;

      // Check if any dependent skills are allocated
      const dependents = nodes.filter(
        (n) => n.prerequisites.includes(nodeId) && n.currentLevel > 0
      );
      if (dependents.length > 0) {
        toast.error("Debes quitar puntos de habilidades dependientes primero");
        return;
      }

      const newNodes = [...nodes];
      newNodes[nodeIndex] = {
        ...node,
        currentLevel: node.currentLevel - 1,
      };

      setNodes(newNodes);
      setAvailablePoints((prev) => prev + node.cost);
      setSpentPoints((prev) => prev - node.cost);
    },
    [nodes]
  );

  // Reset all allocated points
  const resetAllPoints = useCallback(() => {
    const newNodes = nodes.map((node) => ({ ...node, currentLevel: 0 }));
    setNodes(newNodes);
    setAvailablePoints(spentPoints + availablePoints);
    setSpentPoints(0);
    toast.success("Árbol de habilidades reiniciado");
  }, [nodes, spentPoints, availablePoints]);

  // Enter/exit preview mode
  const togglePreviewMode = useCallback(() => {
    if (!isPreviewMode) {
      // Entering preview mode - save snapshot
      setPreviewSnapshot({
        nodes: JSON.parse(JSON.stringify(nodes)),
        availablePoints,
        spentPoints,
      });
      setIsPreviewMode(true);
      toast.info("Modo de prueba activado");
    } else {
      // Exiting preview mode - restore snapshot
      if (previewSnapshot) {
        setNodes(previewSnapshot.nodes);
        setAvailablePoints(previewSnapshot.availablePoints);
        setSpentPoints(previewSnapshot.spentPoints);
      }
      setIsPreviewMode(false);
      setPreviewSnapshot(undefined);
      toast.info("Modo de prueba desactivado");
    }
  }, [isPreviewMode, nodes, availablePoints, spentPoints, previewSnapshot]);

  // Add new node
  const handleAddNode = useCallback(() => {
    const newNode: SkillNode = {
      id: `skill-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      cost: formData.cost,
      maxLevel: formData.maxLevel,
      currentLevel: 0,
      category: formData.category,
      prerequisites: [],
      position: formData.position,
      tier: formData.tier,
      statBonuses: formData.statBonuses,
    };

    setNodes((prev) => [...prev, newNode]);
    setShowAddNode(false);
    toast.success("Habilidad añadida");

    // Reset form
    setFormData({
      name: "",
      description: "",
      icon: "⚔️",
      cost: 1,
      maxLevel: 1,
      category: "combat",
      tier: 1,
      position: { x: 200, y: 200 },
      statBonuses: [],
    });
  }, [formData]);

  // Edit node
  const handleEditNode = useCallback(() => {
    if (!editingNode) return;

    const nodeIndex = nodes.findIndex((n) => n.id === editingNode.id);
    if (nodeIndex === -1) return;

    const newNodes = [...nodes];
    newNodes[nodeIndex] = {
      ...editingNode,
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      cost: formData.cost,
      maxLevel: formData.maxLevel,
      category: formData.category,
      tier: formData.tier,
      statBonuses: formData.statBonuses,
    };

    setNodes(newNodes);
    setShowEditNode(false);
    setEditingNode(null);
    toast.success("Habilidad actualizada");
  }, [editingNode, formData, nodes]);

  // Delete node
  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setConnections((prev) =>
        prev.filter((c) => c.from !== nodeId && c.to !== nodeId)
      );
      toast.success("Habilidad eliminada");
    },
    []
  );

  // Connection mode handlers
  const handleNodeClickForConnection = useCallback(
    (nodeId: string) => {
      if (!showConnectionMode) return;

      if (!connectionStart) {
        setConnectionStart(nodeId);
        toast.info("Selecciona la habilidad destino");
      } else {
        if (connectionStart === nodeId) {
          setConnectionStart(null);
          toast.info("Conexión cancelada");
          return;
        }

        // Create connection
        const existingConnection = connections.find(
          (c) => c.from === connectionStart && c.to === nodeId
        );

        if (existingConnection) {
          // Remove connection
          setConnections((prev) =>
            prev.filter((c) => !(c.from === connectionStart && c.to === nodeId))
          );
          toast.success("Conexión eliminada");
        } else {
          // Add connection
          setConnections((prev) => [...prev, { from: connectionStart, to: nodeId }]);

          // Update prerequisites
          const nodeIndex = nodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex !== -1) {
            const newNodes = [...nodes];
            if (!newNodes[nodeIndex].prerequisites.includes(connectionStart)) {
              newNodes[nodeIndex].prerequisites.push(connectionStart);
              setNodes(newNodes);
            }
          }

          toast.success("Conexión creada");
        }

        setConnectionStart(null);
      }
    },
    [showConnectionMode, connectionStart, connections, nodes]
  );

  // Pan and zoom handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
    }
  }, [pan]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        setPan({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((prev) => Math.min(Math.max(prev * delta, 0.5), 2));
  }, []);

  // Load preset
  const loadPreset = useCallback((presetKey: string) => {
    const preset = PRESET_TREES[presetKey];
    if (!preset) return;

    setNodes(preset.nodes || []);
    setConnections(preset.connections || []);
    setAvailablePoints(preset.availablePoints || 10);
    setSpentPoints(preset.spentPoints || 0);
    setIsPreviewMode(false);
    setPreviewSnapshot(undefined);

    toast.success(`Plantilla "${presetKey}" cargada`);
  }, []);

  // Export functions
  const exportAsJSON = useCallback(() => {
    const exportData = {
      nodes,
      connections,
      availablePoints,
      spentPoints,
      totalStats,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skill-tree-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Árbol exportado como JSON");
  }, [nodes, connections, availablePoints, spentPoints, totalStats]);

  const exportAsJavaScript = useCallback(() => {
    const jsCode = `// Skill Tree Configuration
const skillTree = {
  nodes: ${JSON.stringify(nodes, null, 2)},
  connections: ${JSON.stringify(connections, null, 2)},
  availablePoints: ${availablePoints},
  spentPoints: ${spentPoints},
  totalStats: ${JSON.stringify(totalStats, null, 2)},
};

export default skillTree;
`;

    const blob = new Blob([jsCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `skill-tree-${Date.now()}.js`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("Árbol exportado como JavaScript");
  }, [nodes, connections, availablePoints, spentPoints, totalStats]);

  // Copy to clipboard
  const copyToClipboard = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Copiado al portapapeles");
    },
    []
  );

  // Save config
  useEffect(() => {
    const timer = setTimeout(() => {
      updateWidget(widget.id, {
        config: {
          ...config,
          nodes,
          connections,
          availablePoints,
          spentPoints,
          totalStats,
          isPreviewMode,
          previewSnapshot,
        },
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [nodes, connections, availablePoints, spentPoints, totalStats, isPreviewMode, previewSnapshot]);

  // Render SVG connection line
  const renderConnection = (connection: SkillConnection) => {
    const fromNode = nodes.find((n) => n.id === connection.from);
    const toNode = nodes.find((n) => n.id === connection.to);

    if (!fromNode || !toNode) return null;

    const x1 = fromNode.position.x * zoom + pan.x + 30;
    const y1 = fromNode.position.y * zoom + pan.y + 30;
    const x2 = toNode.position.x * zoom + pan.x + 30;
    const y2 = toNode.position.y * zoom + pan.y + 30;

    const isUnlocked = fromNode.currentLevel > 0;
    const strokeColor = isUnlocked
      ? "rgb(34, 197, 94)"
      : "rgb(100, 116, 139)";

    return (
      <line
        key={`${connection.from}-${connection.to}`}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={isUnlocked ? "0" : "5,5"}
        opacity={0.6}
      />
    );
  };

  return (
    <TooltipProvider>
      <div className="@container h-full flex flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-sm">Árbol de Habilidades</h3>
            {isPreviewMode && (
              <Badge variant="secondary" className="text-xs">
                <Eye className="w-3 h-3 mr-1" />
                Modo Prueba
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Dialog open={showSettings} onOpenChange={setShowSettings}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
                <DialogHeader>
                  <DialogTitle>Configuración</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Puntos Disponibles</Label>
                    <Input
                      type="number"
                      min={0}
                      value={availablePoints}
                      onChange={(e) =>
                        setAvailablePoints(parseInt(e.target.value) || 0)
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label>Cargar Plantilla</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPreset("warrior")}
                      >
                        <Sword className="w-4 h-4 mr-1" />
                        Guerrero
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPreset("mage")}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Mago
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadPreset("rogue")}
                      >
                        <Target className="w-4 h-4 mr-1" />
                        Pícaro
                      </Button>
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-muted/50 rounded-md px-2 py-1.5 border">
            <div className="text-muted-foreground">Disponibles</div>
            <div className="font-semibold text-amber-500">{availablePoints}</div>
          </div>
          <div className="bg-muted/50 rounded-md px-2 py-1.5 border">
            <div className="text-muted-foreground">Gastados</div>
            <div className="font-semibold text-blue-500">{spentPoints}</div>
          </div>
          <div className="bg-muted/50 rounded-md px-2 py-1.5 border">
            <div className="text-muted-foreground">Total</div>
            <div className="font-semibold">
              {spentPoints + availablePoints}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-1 flex-wrap">
          <Dialog open={showAddNode} onOpenChange={setShowAddNode}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Añadir Habilidad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
              <DialogHeader>
                <DialogTitle>Nueva Habilidad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nombre</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Golpe Poderoso"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Icono</Label>
                    <div className="flex gap-2 mt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-2xl h-9 w-9 p-0"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      >
                        {formData.icon}
                      </Button>
                      {showEmojiPicker && (
                        <div className="absolute z-50 bg-background border rounded-lg p-2 grid grid-cols-10 gap-1 shadow-lg">
                          {EMOJI_PRESETS.map((emoji) => (
                            <button
                              key={emoji}
                              className="text-xl hover:bg-muted rounded p-1"
                              onClick={() => {
                                setFormData({ ...formData, icon: emoji });
                                setShowEmojiPicker(false);
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Descripción</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="+10% daño físico"
                    className="mt-1"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Categoría</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: SkillCategory) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                              {cfg.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Coste</Label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.cost}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cost: parseInt(e.target.value) || 1,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Nivel Máx.</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={formData.maxLevel}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxLevel: parseInt(e.target.value) || 1,
                        })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label>Bonificaciones de Estadística</Label>
                  <div className="space-y-2 mt-2">
                    {formData.statBonuses.map((bonus, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          placeholder="Nombre stat"
                          value={bonus.stat}
                          onChange={(e) => {
                            const newBonuses = [...formData.statBonuses];
                            newBonuses[index].stat = e.target.value;
                            setFormData({ ...formData, statBonuses: newBonuses });
                          }}
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          placeholder="Valor"
                          value={bonus.value}
                          onChange={(e) => {
                            const newBonuses = [...formData.statBonuses];
                            newBonuses[index].value = parseInt(e.target.value) || 0;
                            setFormData({ ...formData, statBonuses: newBonuses });
                          }}
                          className="w-20"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "w-24",
                            bonus.perLevel && "bg-primary/10 border-primary/30"
                          )}
                          onClick={() => {
                            const newBonuses = [...formData.statBonuses];
                            newBonuses[index].perLevel = !newBonuses[index].perLevel;
                            setFormData({ ...formData, statBonuses: newBonuses });
                          }}
                        >
                          {bonus.perLevel ? "Por Nivel" : "Total"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const newBonuses = formData.statBonuses.filter(
                              (_, i) => i !== index
                            );
                            setFormData({ ...formData, statBonuses: newBonuses });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          statBonuses: [
                            ...formData.statBonuses,
                            { stat: "", value: 0, perLevel: true },
                          ],
                        });
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Añadir Bonificación
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowAddNode(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddNode}
                  disabled={!formData.name || !formData.description}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Añadir
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant={showConnectionMode ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              setShowConnectionMode(!showConnectionMode);
              setConnectionStart(null);
            }}
          >
            {showConnectionMode ? (
              <>
                <Unlink className="w-3 h-3 mr-1" />
                Desactivar Conexiones
              </>
            ) : (
              <>
                <LinkIcon className="w-3 h-3 mr-1" />
                Conectar
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={togglePreviewMode}
          >
            {isPreviewMode ? (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                Salir Prueba
              </>
            ) : (
              <>
                <Eye className="w-3 h-3 mr-1" />
                Modo Prueba
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={resetAllPoints}
            disabled={spentPoints === 0}
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reiniciar
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom((prev) => Math.max(prev - 0.1, 0.5))}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setZoom((prev) => Math.min(prev + 0.1, 2))}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={exportAsJSON}
          >
            <FileJson className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={exportAsJavaScript}
          >
            <FileCode className="w-4 h-4" />
          </Button>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden rounded-lg border bg-muted/20">
          <div
            ref={canvasRef}
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            {/* SVG for connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map((connection) => renderConnection(connection))}
            </svg>

            {/* Skill nodes */}
            <AnimatePresence>
              {nodes.map((node) => {
                const canUnlock = canUnlockSkill(node);
                const isLocked = node.currentLevel === 0 && !canUnlock;
                const isMaxed = node.currentLevel === node.maxLevel;
                const CategoryIcon = CATEGORY_CONFIG[node.category].icon;

                return (
                  <Tooltip key={node.id}>
                    <TooltipTrigger asChild>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className={cn(
                          "absolute w-16 h-16 rounded-xl border-2 cursor-pointer transition-all",
                          "flex flex-col items-center justify-center",
                          isLocked &&
                            "bg-muted/50 border-muted-foreground/20 opacity-50",
                          !isLocked &&
                            node.currentLevel === 0 &&
                            "bg-background border-primary/30 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/20",
                          node.currentLevel > 0 &&
                            !isMaxed &&
                            "bg-primary/20 border-primary hover:border-primary hover:shadow-lg hover:shadow-primary/30",
                          isMaxed &&
                            "bg-green-500/20 border-green-500 shadow-lg shadow-green-500/30",
                          connectionStart === node.id &&
                            "ring-2 ring-blue-500 ring-offset-2",
                          hoveredNode === node.id && "scale-110"
                        )}
                        style={{
                          left: node.position.x * zoom + pan.x,
                          top: node.position.y * zoom + pan.y,
                          transform: `scale(${zoom})`,
                        }}
                        onClick={() => {
                          if (showConnectionMode) {
                            handleNodeClickForConnection(node.id);
                          } else {
                            setSelectedNode(node.id);
                          }
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setEditingNode(node);
                          setFormData({
                            name: node.name,
                            description: node.description,
                            icon: node.icon,
                            cost: node.cost,
                            maxLevel: node.maxLevel,
                            category: node.category,
                            tier: node.tier,
                            position: node.position,
                            statBonuses: node.statBonuses,
                          });
                          setShowEditNode(true);
                        }}
                        onMouseEnter={() => setHoveredNode(node.id)}
                        onMouseLeave={() => setHoveredNode(null)}
                      >
                        <div className="text-2xl mb-1">{node.icon}</div>
                        <div className="flex items-center gap-1">
                          {isLocked && <Lock className="w-3 h-3 opacity-50" />}
                          {node.currentLevel > 0 && (
                            <div className="text-[10px] font-bold">
                              {node.currentLevel}/{node.maxLevel}
                            </div>
                          )}
                        </div>
                        {node.currentLevel > 0 && isMaxed && (
                          <Star className="absolute top-0 right-0 w-3 h-3 text-yellow-500 fill-yellow-500 -translate-y-1 translate-x-1" />
                        )}
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="text-xl">{node.icon}</div>
                          <div>
                            <div className="font-semibold">{node.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Tier {node.tier} • {CATEGORY_CONFIG[node.category].label}
                            </div>
                          </div>
                        </div>
                        <div className="text-sm">{node.description}</div>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Nivel:</span>
                            <span className="font-semibold">
                              {node.currentLevel}/{node.maxLevel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Coste:</span>
                            <span className="font-semibold">{node.cost}</span>
                          </div>
                          {node.statBonuses.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {node.statBonuses.map((bonus, i) => (
                                <div key={i} className="flex items-center justify-between text-green-400">
                                  <span>{bonus.stat}:</span>
                                  <span className="font-semibold">
                                    +{bonus.perLevel ? bonus.value * Math.max(1, node.currentLevel) : bonus.value}
                                    {bonus.perLevel && ` (${bonus.value}/nivel)`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {node.prerequisites.length > 0 && (
                            <div className="mt-2">
                              <div className="text-muted-foreground mb-1">Requiere:</div>
                              {node.prerequisites.map((prereqId) => {
                                const prereq = nodes.find((n) => n.id === prereqId);
                                return prereq ? (
                                  <div key={prereqId} className="flex items-center gap-1">
                                    <CheckCircle2 className={cn(
                                      "w-3 h-3",
                                      prereq.currentLevel > 0 ? "text-green-500" : "text-muted-foreground"
                                    )} />
                                    <span>{prereq.name}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                        {!isPreviewMode && (
                          <div className="flex gap-2 pt-2 border-t">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => allocateSkillPoint(node.id)}
                              disabled={!canUnlock}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Mejorar
                            </Button>
                            {node.currentLevel > 0 && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => refundSkillPoint(node.id)}
                              >
                                <RotateCcw className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Connection mode hint */}
          {showConnectionMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium shadow-lg">
              {connectionStart
                ? "Selecciona la habilidad destino"
                : "Selecciona la habilidad inicial"}
            </div>
          )}
        </div>

        {/* Total Stats */}
        {Object.keys(totalStats).length > 0 && (
          <div className="bg-muted/50 rounded-lg border p-3">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="font-semibold text-sm">Estadísticas Totales</span>
            </div>
            <div className="grid grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4 gap-2 text-xs">
              {Object.entries(totalStats).map(([stat, value]) => (
                <div
                  key={stat}
                  className="flex items-center justify-between bg-background rounded px-2 py-1"
                >
                  <span className="text-muted-foreground">{stat}</span>
                  <span className="font-semibold text-green-500">+{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Node Dialog */}
        <Dialog open={showEditNode} onOpenChange={setShowEditNode}>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Editar Habilidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nombre</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Icono</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-2xl h-9 w-9 p-0"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    >
                      {formData.icon}
                    </Button>
                    {showEmojiPicker && (
                      <div className="absolute z-50 bg-background border rounded-lg p-2 grid grid-cols-10 gap-1 shadow-lg">
                        {EMOJI_PRESETS.map((emoji) => (
                          <button
                            key={emoji}
                            className="text-xl hover:bg-muted rounded p-1"
                            onClick={() => {
                              setFormData({ ...formData, icon: emoji });
                              setShowEmojiPicker(false);
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="mt-1"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Categoría</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value: SkillCategory) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <cfg.icon className={cn("w-4 h-4", cfg.color)} />
                            {cfg.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Coste</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.cost}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        cost: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Nivel Máx.</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.maxLevel}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxLevel: parseInt(e.target.value) || 1,
                      })
                    }
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Bonificaciones de Estadística</Label>
                <div className="space-y-2 mt-2">
                  {formData.statBonuses.map((bonus, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        placeholder="Nombre stat"
                        value={bonus.stat}
                        onChange={(e) => {
                          const newBonuses = [...formData.statBonuses];
                          newBonuses[index].stat = e.target.value;
                          setFormData({ ...formData, statBonuses: newBonuses });
                        }}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Valor"
                        value={bonus.value}
                        onChange={(e) => {
                          const newBonuses = [...formData.statBonuses];
                          newBonuses[index].value = parseInt(e.target.value) || 0;
                          setFormData({ ...formData, statBonuses: newBonuses });
                        }}
                        className="w-20"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-24",
                          bonus.perLevel && "bg-primary/10 border-primary/30"
                        )}
                        onClick={() => {
                          const newBonuses = [...formData.statBonuses];
                          newBonuses[index].perLevel = !newBonuses[index].perLevel;
                          setFormData({ ...formData, statBonuses: newBonuses });
                        }}
                      >
                        {bonus.perLevel ? "Por Nivel" : "Total"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          const newBonuses = formData.statBonuses.filter(
                            (_, i) => i !== index
                          );
                          setFormData({ ...formData, statBonuses: newBonuses });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        statBonuses: [
                          ...formData.statBonuses,
                          { stat: "", value: 0, perLevel: true },
                        ],
                      });
                    }}
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Añadir Bonificación
                  </Button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="destructive"
                onClick={() => {
                  if (editingNode) {
                    handleDeleteNode(editingNode.id);
                    setShowEditNode(false);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Eliminar
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowEditNode(false)}
              >
                Cancelar
              </Button>
              <Button onClick={handleEditNode}>
                <Save className="w-4 h-4 mr-1" />
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
