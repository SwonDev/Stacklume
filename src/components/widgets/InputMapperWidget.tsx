"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Gamepad2,
  Plus,
  Download,
  FileJson,
  FileCode,
  AlertTriangle,
  Settings,
  Trash2,
  Copy,
  CheckCircle2,
  Zap,
  Play,
  Printer,
  Info,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface InputMapperWidgetProps {
  widget: Widget;
}

type ControllerType = "xbox" | "playstation" | "nintendo" | "keyboard";
type InputType = "button" | "axis" | "trigger" | "dpad";
type PressType = "press" | "hold" | "double-tap";
type ActionCategory = "movement" | "combat" | "ui" | "interaction" | "camera" | "system" | "custom";

interface InputAction {
  id: string;
  name: string;
  category: ActionCategory;
  description?: string;
}

interface InputBinding {
  actionId: string;
  controllerType: ControllerType;
  buttonKey: string;
  buttonLabel: string;
  inputType: InputType;
  pressType: PressType;
  axisDirection?: "positive" | "negative" | "both";
  deadZone?: number;
  sensitivity?: number;
  isRebindable: boolean;
  isAlternative?: boolean;
}

interface InputMapperConfig {
  actions: InputAction[];
  bindings: InputBinding[];
  selectedController: ControllerType;
  showConflicts: boolean;
  deadZoneGlobal: number;
  sensitivityGlobal: number;
  previewMode: boolean;
  highlightedAction: string | null;
}

// Preset templates
const PRESET_TEMPLATES: Record<string, { actions: InputAction[]; bindings: InputBinding[] }> = {
  platformer: {
    actions: [
      { id: "move_left", name: "Move Left", category: "movement" },
      { id: "move_right", name: "Move Right", category: "movement" },
      { id: "jump", name: "Jump", category: "movement", description: "Jump or double jump" },
      { id: "dash", name: "Dash", category: "movement" },
      { id: "attack", name: "Attack", category: "combat" },
      { id: "pause", name: "Pause", category: "ui" },
    ],
    bindings: [
      { actionId: "move_left", controllerType: "xbox", buttonKey: "left_stick_x", buttonLabel: "Left Stick X", inputType: "axis", pressType: "press", axisDirection: "negative", deadZone: 0.2, isRebindable: true },
      { actionId: "move_right", controllerType: "xbox", buttonKey: "left_stick_x", buttonLabel: "Left Stick X", inputType: "axis", pressType: "press", axisDirection: "positive", deadZone: 0.2, isRebindable: true },
      { actionId: "jump", controllerType: "xbox", buttonKey: "a", buttonLabel: "A", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "dash", controllerType: "xbox", buttonKey: "x", buttonLabel: "X", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "attack", controllerType: "xbox", buttonKey: "b", buttonLabel: "B", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "pause", controllerType: "xbox", buttonKey: "start", buttonLabel: "Start", inputType: "button", pressType: "press", isRebindable: false },
    ],
  },
  fps: {
    actions: [
      { id: "move_forward", name: "Move Forward", category: "movement" },
      { id: "move_backward", name: "Move Backward", category: "movement" },
      { id: "move_left", name: "Strafe Left", category: "movement" },
      { id: "move_right", name: "Strafe Right", category: "movement" },
      { id: "look_x", name: "Look Horizontal", category: "camera" },
      { id: "look_y", name: "Look Vertical", category: "camera" },
      { id: "shoot", name: "Shoot", category: "combat" },
      { id: "aim", name: "Aim", category: "combat" },
      { id: "reload", name: "Reload", category: "combat" },
      { id: "jump", name: "Jump", category: "movement" },
      { id: "crouch", name: "Crouch", category: "movement" },
      { id: "sprint", name: "Sprint", category: "movement" },
    ],
    bindings: [
      { actionId: "move_forward", controllerType: "keyboard", buttonKey: "w", buttonLabel: "W", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "move_backward", controllerType: "keyboard", buttonKey: "s", buttonLabel: "S", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "move_left", controllerType: "keyboard", buttonKey: "a", buttonLabel: "A", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "move_right", controllerType: "keyboard", buttonKey: "d", buttonLabel: "D", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "shoot", controllerType: "keyboard", buttonKey: "mouse_left", buttonLabel: "Left Mouse", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "aim", controllerType: "keyboard", buttonKey: "mouse_right", buttonLabel: "Right Mouse", inputType: "button", pressType: "hold", isRebindable: true },
      { actionId: "reload", controllerType: "keyboard", buttonKey: "r", buttonLabel: "R", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "jump", controllerType: "keyboard", buttonKey: "space", buttonLabel: "Space", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "crouch", controllerType: "keyboard", buttonKey: "ctrl", buttonLabel: "Ctrl", inputType: "button", pressType: "hold", isRebindable: true },
      { actionId: "sprint", controllerType: "keyboard", buttonKey: "shift", buttonLabel: "Shift", inputType: "button", pressType: "hold", isRebindable: true },
    ],
  },
  fighting: {
    actions: [
      { id: "light_attack", name: "Light Attack", category: "combat" },
      { id: "heavy_attack", name: "Heavy Attack", category: "combat" },
      { id: "special_attack", name: "Special Attack", category: "combat" },
      { id: "block", name: "Block", category: "combat" },
      { id: "grab", name: "Grab", category: "combat" },
      { id: "jump", name: "Jump", category: "movement" },
      { id: "move", name: "Movement", category: "movement" },
    ],
    bindings: [
      { actionId: "light_attack", controllerType: "xbox", buttonKey: "x", buttonLabel: "X", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "heavy_attack", controllerType: "xbox", buttonKey: "y", buttonLabel: "Y", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "special_attack", controllerType: "xbox", buttonKey: "b", buttonLabel: "B", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "block", controllerType: "xbox", buttonKey: "rt", buttonLabel: "RT", inputType: "trigger", pressType: "hold", isRebindable: true },
      { actionId: "grab", controllerType: "xbox", buttonKey: "a", buttonLabel: "A", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "jump", controllerType: "xbox", buttonKey: "lb", buttonLabel: "LB", inputType: "button", pressType: "press", isRebindable: true },
    ],
  },
  racing: {
    actions: [
      { id: "accelerate", name: "Accelerate", category: "movement" },
      { id: "brake", name: "Brake", category: "movement" },
      { id: "steer", name: "Steer", category: "movement" },
      { id: "handbrake", name: "Handbrake", category: "movement" },
      { id: "shift_up", name: "Shift Up", category: "system" },
      { id: "shift_down", name: "Shift Down", category: "system" },
      { id: "look_back", name: "Look Back", category: "camera" },
      { id: "reset_car", name: "Reset Car", category: "system" },
    ],
    bindings: [
      { actionId: "accelerate", controllerType: "xbox", buttonKey: "rt", buttonLabel: "RT", inputType: "trigger", pressType: "press", sensitivity: 1, isRebindable: true },
      { actionId: "brake", controllerType: "xbox", buttonKey: "lt", buttonLabel: "LT", inputType: "trigger", pressType: "press", sensitivity: 1, isRebindable: true },
      { actionId: "steer", controllerType: "xbox", buttonKey: "left_stick_x", buttonLabel: "Left Stick X", inputType: "axis", pressType: "press", deadZone: 0.1, sensitivity: 1, isRebindable: true },
      { actionId: "handbrake", controllerType: "xbox", buttonKey: "a", buttonLabel: "A", inputType: "button", pressType: "hold", isRebindable: true },
      { actionId: "shift_up", controllerType: "xbox", buttonKey: "rb", buttonLabel: "RB", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "shift_down", controllerType: "xbox", buttonKey: "lb", buttonLabel: "LB", inputType: "button", pressType: "press", isRebindable: true },
      { actionId: "look_back", controllerType: "xbox", buttonKey: "b", buttonLabel: "B", inputType: "button", pressType: "hold", isRebindable: true },
      { actionId: "reset_car", controllerType: "xbox", buttonKey: "y", buttonLabel: "Y", inputType: "button", pressType: "press", isRebindable: true },
    ],
  },
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  movement: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  combat: "bg-red-500/20 text-red-400 border-red-500/30",
  ui: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  interaction: "bg-green-500/20 text-green-400 border-green-500/30",
  camera: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  system: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  custom: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export function InputMapperWidget({ widget }: InputMapperWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const config: InputMapperConfig = {
    actions: widget.config?.inputMapperActions ?? [],
    bindings: widget.config?.inputMapperBindings ?? [],
    selectedController: widget.config?.inputMapperSelectedController ?? "xbox",
    showConflicts: widget.config?.inputMapperShowConflicts ?? true,
    deadZoneGlobal: widget.config?.inputMapperDeadZoneGlobal ?? 0.2,
    sensitivityGlobal: widget.config?.inputMapperSensitivityGlobal ?? 1,
    previewMode: widget.config?.inputMapperPreviewMode ?? false,
    highlightedAction: widget.config?.inputMapperHighlightedAction ?? null,
  };

  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [isAddBindingOpen, setIsAddBindingOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [_selectedAction, _setSelectedAction] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // New action form state
  const [newActionName, setNewActionName] = useState("");
  const [newActionCategory, setNewActionCategory] = useState<ActionCategory>("movement");
  const [newActionDescription, setNewActionDescription] = useState("");

  // New binding form state
  const [newBindingAction, setNewBindingAction] = useState("");
  const [newBindingController, setNewBindingController] = useState<ControllerType>(config.selectedController);
  const [newBindingButton, setNewBindingButton] = useState("");
  const [newBindingInputType, setNewBindingInputType] = useState<InputType>("button");
  const [newBindingPressType, setNewBindingPressType] = useState<PressType>("press");

  const saveConfig = useCallback((updates: Partial<InputMapperConfig>) => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        inputMapperActions: updates.actions ?? config.actions,
        inputMapperBindings: updates.bindings ?? config.bindings,
        inputMapperSelectedController: updates.selectedController ?? config.selectedController,
        inputMapperShowConflicts: updates.showConflicts ?? config.showConflicts,
        inputMapperDeadZoneGlobal: updates.deadZoneGlobal ?? config.deadZoneGlobal,
        inputMapperSensitivityGlobal: updates.sensitivityGlobal ?? config.sensitivityGlobal,
        inputMapperPreviewMode: updates.previewMode ?? config.previewMode,
        inputMapperHighlightedAction: updates.highlightedAction ?? config.highlightedAction,
      },
    });
  }, [widget, config]);

  // Add action
  const handleAddAction = () => {
    if (!newActionName) return;

    const newAction: InputAction = {
      id: `action_${Date.now()}`,
      name: newActionName,
      category: newActionCategory,
      description: newActionDescription || undefined,
    };

    saveConfig({ actions: [...config.actions, newAction] });
    setNewActionName("");
    setNewActionDescription("");
    setIsAddActionOpen(false);
  };

  // Delete action
  const handleDeleteAction = (actionId: string) => {
    saveConfig({
      actions: config.actions.filter(a => a.id !== actionId),
      bindings: config.bindings.filter(b => b.actionId !== actionId),
    });
  };

  // Add binding
  const handleAddBinding = () => {
    if (!newBindingAction || !newBindingButton) return;

    const newBinding: InputBinding = {
      actionId: newBindingAction,
      controllerType: newBindingController,
      buttonKey: newBindingButton.toLowerCase().replace(/\s+/g, "_"),
      buttonLabel: newBindingButton,
      inputType: newBindingInputType,
      pressType: newBindingPressType,
      deadZone: newBindingInputType === "axis" || newBindingInputType === "trigger" ? config.deadZoneGlobal : undefined,
      sensitivity: newBindingInputType === "axis" || newBindingInputType === "trigger" ? config.sensitivityGlobal : undefined,
      isRebindable: true,
    };

    saveConfig({ bindings: [...config.bindings, newBinding] });
    setNewBindingButton("");
    setIsAddBindingOpen(false);
  };

  // Delete binding
  const handleDeleteBinding = (index: number) => {
    const newBindings = [...config.bindings];
    newBindings.splice(index, 1);
    saveConfig({ bindings: newBindings });
  };

  // Load preset template
  const handleLoadPreset = (presetName: string) => {
    const preset = PRESET_TEMPLATES[presetName];
    if (preset) {
      saveConfig({
        actions: preset.actions,
        bindings: preset.bindings,
      });
    }
  };

  // Detect conflicts
  const conflicts = useMemo(() => {
    const conflictMap = new Map<string, string[]>();

    config.bindings.forEach((binding, _index) => {
      const key = `${binding.controllerType}-${binding.buttonKey}-${binding.pressType}`;
      if (!conflictMap.has(key)) {
        conflictMap.set(key, []);
      }
      conflictMap.get(key)!.push(binding.actionId);
    });

    return Array.from(conflictMap.entries())
      .filter(([, actions]) => actions.length > 1)
      .map(([key, actions]) => ({
        key,
        actions: actions.map(actionId => config.actions.find(a => a.id === actionId)?.name ?? actionId),
      }));
  }, [config.bindings, config.actions]);

  // Export as JSON
  const handleExportJSON = () => {
    const exportData = {
      actions: config.actions,
      bindings: config.bindings,
      settings: {
        deadZone: config.deadZoneGlobal,
        sensitivity: config.sensitivityGlobal,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "input-mapping.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as JavaScript
  const handleExportJS = () => {
    const jsCode = `// Input Mapping Configuration
const inputMapping = {
  actions: ${JSON.stringify(config.actions, null, 2)},
  bindings: ${JSON.stringify(config.bindings, null, 2)},
  settings: {
    deadZone: ${config.deadZoneGlobal},
    sensitivity: ${config.sensitivityGlobal},
  },
};

// Helper function to get bindings for an action
function getBindingsForAction(actionId, controllerType) {
  return inputMapping.bindings.filter(
    b => b.actionId === actionId && b.controllerType === controllerType
  );
}

// Helper function to check if action is triggered
function isActionTriggered(actionId, inputState, controllerType) {
  const bindings = getBindingsForAction(actionId, controllerType);
  return bindings.some(binding => {
    const value = inputState[binding.buttonKey];
    if (binding.inputType === 'axis' || binding.inputType === 'trigger') {
      return Math.abs(value) > (binding.deadZone || 0.2);
    }
    return value === true;
  });
}

export { inputMapping, getBindingsForAction, isActionTriggered };
`;

    const blob = new Blob([jsCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "input-mapping.js";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(type);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Print-friendly layout
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Input Mapping - ${widget.title}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { border-bottom: 2px solid #333; padding-bottom: 10px; }
          h2 { margin-top: 30px; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .category { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; margin-right: 5px; }
          .movement { background-color: #3b82f6; color: white; }
          .combat { background-color: #ef4444; color: white; }
          .ui { background-color: #a855f7; color: white; }
          .interaction { background-color: #10b981; color: white; }
          .camera { background-color: #f59e0b; color: white; }
          .system { background-color: #6b7280; color: white; }
          .custom { background-color: #06b6d4; color: white; }
          .conflict { background-color: #fee; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Input Mapping Configuration</h1>
        <p><strong>Controller Type:</strong> ${config.selectedController.toUpperCase()}</p>
        <p><strong>Dead Zone:</strong> ${config.deadZoneGlobal}</p>
        <p><strong>Sensitivity:</strong> ${config.sensitivityGlobal}</p>

        <h2>Actions</h2>
        <table>
          <thead>
            <tr>
              <th>Action</th>
              <th>Category</th>
              <th>Description</th>
              <th>Bindings</th>
            </tr>
          </thead>
          <tbody>
            ${config.actions.map(action => {
              const bindings = config.bindings.filter(b => b.actionId === action.id);
              return `
                <tr>
                  <td><strong>${action.name}</strong></td>
                  <td><span class="category ${action.category}">${action.category}</span></td>
                  <td>${action.description || '-'}</td>
                  <td>
                    ${bindings.map(b => `${b.buttonLabel} (${b.pressType})`).join(', ') || 'No bindings'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        ${conflicts.length > 0 ? `
          <h2>Conflicts</h2>
          <table class="conflict">
            <thead>
              <tr>
                <th>Button</th>
                <th>Conflicting Actions</th>
              </tr>
            </thead>
            <tbody>
              ${conflicts.map(c => `
                <tr>
                  <td>${c.key}</td>
                  <td>${c.actions.join(', ')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  // Get bindings for current controller
  const currentBindings = useMemo(() => {
    return config.bindings.filter(b => b.controllerType === config.selectedController);
  }, [config.bindings, config.selectedController]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @md:p-4 @lg:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 @md:mb-4">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 @md:w-5 @md:h-5 text-primary" />
            <h3 className="text-sm @md:text-base font-semibold">Input Mapper</h3>
            {conflicts.length > 0 && config.showConflicts && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {conflicts.length}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{conflicts.length} binding conflicts detected</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => saveConfig({ previewMode: !config.previewMode })}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              {config.previewMode ? (
                <Play className="w-3 h-3 @md:w-4 @md:h-4" />
              ) : (
                <Zap className="w-3 h-3 @md:w-4 @md:h-4" />
              )}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 @md:h-8 @md:w-8">
                  <Settings className="w-3 h-3 @md:w-4 @md:h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Controller Type</Label>
                    <Select
                      value={config.selectedController}
                      onValueChange={(value: ControllerType) => saveConfig({ selectedController: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xbox">Xbox</SelectItem>
                        <SelectItem value="playstation">PlayStation</SelectItem>
                        <SelectItem value="nintendo">Nintendo Switch</SelectItem>
                        <SelectItem value="keyboard">Keyboard/Mouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Global Dead Zone: {config.deadZoneGlobal.toFixed(2)}</Label>
                    <Slider
                      value={[config.deadZoneGlobal]}
                      onValueChange={([value]) => saveConfig({ deadZoneGlobal: value })}
                      min={0}
                      max={1}
                      step={0.01}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Global Sensitivity: {config.sensitivityGlobal.toFixed(2)}</Label>
                    <Slider
                      value={[config.sensitivityGlobal]}
                      onValueChange={([value]) => saveConfig({ sensitivityGlobal: value })}
                      min={0.1}
                      max={3}
                      step={0.1}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="show-conflicts"
                      checked={config.showConflicts}
                      onChange={(e) => saveConfig({ showConflicts: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="show-conflicts">Show conflict warnings</Label>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <Label>Load Preset Template</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.keys(PRESET_TEMPLATES).map(presetName => (
                        <Button
                          key={presetName}
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadPreset(presetName)}
                          className="capitalize"
                        >
                          {presetName}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrint}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              <Printer className="w-3 h-3 @md:w-4 @md:h-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleExportJSON}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              <Download className="w-3 h-3 @md:w-4 @md:h-4" />
            </Button>
          </div>
        </div>

        {/* Main content */}
        <ScrollArea className="flex-1">
          <Tabs defaultValue="actions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="actions" className="text-xs @md:text-sm">
                Actions
              </TabsTrigger>
              <TabsTrigger value="bindings" className="text-xs @md:text-sm">
                Bindings
              </TabsTrigger>
              <TabsTrigger value="export" className="text-xs @md:text-sm">
                Export
              </TabsTrigger>
            </TabsList>

            {/* Actions Tab */}
            <TabsContent value="actions" className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {config.actions.length} actions defined
                </p>
                <Dialog open={isAddActionOpen} onOpenChange={setIsAddActionOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-3 h-3 mr-1" />
                      Add Action
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Action</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="action-name">Action Name</Label>
                        <Input
                          id="action-name"
                          placeholder="e.g., Jump, Attack, Pause"
                          value={newActionName}
                          onChange={(e) => setNewActionName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="action-category">Category</Label>
                        <Select
                          value={newActionCategory}
                          onValueChange={(value: ActionCategory) => setNewActionCategory(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="movement">Movement</SelectItem>
                            <SelectItem value="combat">Combat</SelectItem>
                            <SelectItem value="ui">UI</SelectItem>
                            <SelectItem value="interaction">Interaction</SelectItem>
                            <SelectItem value="camera">Camera</SelectItem>
                            <SelectItem value="system">System</SelectItem>
                            <SelectItem value="custom">Custom</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="action-description">Description (optional)</Label>
                        <Input
                          id="action-description"
                          placeholder="Brief description"
                          value={newActionDescription}
                          onChange={(e) => setNewActionDescription(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddAction}>Add Action</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {config.actions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Info className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No actions defined yet.</p>
                  <p className="text-xs mt-1">Click &ldquo;Add Action&rdquo; to get started.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {config.actions.map(action => (
                    <motion.div
                      key={action.id}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors ${
                        config.highlightedAction === action.id ? "ring-2 ring-primary" : ""
                      }`}
                      onMouseEnter={() => config.previewMode && saveConfig({ highlightedAction: action.id })}
                      onMouseLeave={() => config.previewMode && saveConfig({ highlightedAction: null })}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{action.name}</h4>
                            <Badge className={`text-xs ${CATEGORY_COLORS[action.category]}`}>
                              {action.category}
                            </Badge>
                          </div>
                          {action.description && (
                            <p className="text-xs text-muted-foreground">{action.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {config.bindings
                              .filter(b => b.actionId === action.id)
                              .map((binding, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {binding.buttonLabel}
                                  {binding.pressType !== "press" && ` (${binding.pressType})`}
                                </Badge>
                              ))}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAction(action.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Bindings Tab */}
            <TabsContent value="bindings" className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">
                  {currentBindings.length} bindings for {config.selectedController}
                </p>
                <Dialog open={isAddBindingOpen} onOpenChange={setIsAddBindingOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={config.actions.length === 0}>
                      <Plus className="w-3 h-3 mr-1" />
                      Add Binding
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Binding</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Action</Label>
                        <Select value={newBindingAction} onValueChange={setNewBindingAction}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select action" />
                          </SelectTrigger>
                          <SelectContent>
                            {config.actions.map(action => (
                              <SelectItem key={action.id} value={action.id}>
                                {action.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Controller Type</Label>
                        <Select
                          value={newBindingController}
                          onValueChange={(value: ControllerType) => setNewBindingController(value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="xbox">Xbox</SelectItem>
                            <SelectItem value="playstation">PlayStation</SelectItem>
                            <SelectItem value="nintendo">Nintendo Switch</SelectItem>
                            <SelectItem value="keyboard">Keyboard/Mouse</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Button/Key</Label>
                        <Input
                          placeholder="e.g., A, Space, Left Stick X"
                          value={newBindingButton}
                          onChange={(e) => setNewBindingButton(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Input Type</Label>
                          <Select
                            value={newBindingInputType}
                            onValueChange={(value: InputType) => setNewBindingInputType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="button">Button</SelectItem>
                              <SelectItem value="axis">Axis</SelectItem>
                              <SelectItem value="trigger">Trigger</SelectItem>
                              <SelectItem value="dpad">D-Pad</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Press Type</Label>
                          <Select
                            value={newBindingPressType}
                            onValueChange={(value: PressType) => setNewBindingPressType(value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="press">Press</SelectItem>
                              <SelectItem value="hold">Hold</SelectItem>
                              <SelectItem value="double-tap">Double Tap</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleAddBinding}>Add Binding</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {currentBindings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Gamepad2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No bindings for {config.selectedController}.</p>
                  <p className="text-xs mt-1">Click &ldquo;Add Binding&rdquo; to create one.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentBindings.map((binding, index) => {
                    const action = config.actions.find(a => a.id === binding.actionId);
                    const hasConflict = conflicts.some(c =>
                      c.key.includes(binding.buttonKey) && c.actions.includes(action?.name ?? "")
                    );

                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`p-3 rounded-lg border bg-card ${
                          hasConflict && config.showConflicts ? "border-destructive/50 bg-destructive/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{action?.name ?? "Unknown"}</h4>
                              {hasConflict && config.showConflicts && (
                                <AlertTriangle className="w-3 h-3 text-destructive" />
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              <div>Button: <span className="text-foreground font-medium">{binding.buttonLabel}</span></div>
                              <div>Type: <span className="text-foreground">{binding.inputType}</span></div>
                              <div>Press: <span className="text-foreground">{binding.pressType}</span></div>
                              {binding.deadZone !== undefined && (
                                <div>Dead Zone: <span className="text-foreground">{binding.deadZone.toFixed(2)}</span></div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteBinding(index)}
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {conflicts.length > 0 && config.showConflicts && (
                <div className="mt-4 p-3 rounded-lg border border-destructive/50 bg-destructive/5">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                    <h4 className="font-medium text-sm">Binding Conflicts</h4>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {conflicts.map((conflict, idx) => (
                      <div key={idx}>
                        {conflict.actions.join(" & ")} share the same button
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Export as JSON</Label>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        handleCopyToClipboard(
                          JSON.stringify(
                            {
                              actions: config.actions,
                              bindings: config.bindings,
                              settings: { deadZone: config.deadZoneGlobal, sensitivity: config.sensitivityGlobal },
                            },
                            null,
                            2
                          ),
                          "json"
                        )
                      }
                    >
                      {copiedText === "json" ? (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      ) : (
                        <Copy className="w-3 h-3 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <FileJson className="w-3 h-3 mr-1" />
                      Download
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-40 rounded-md border bg-muted/30 p-3">
                  <pre className="text-xs font-mono">
                    {JSON.stringify(
                      {
                        actions: config.actions,
                        bindings: config.bindings,
                        settings: { deadZone: config.deadZoneGlobal, sensitivity: config.sensitivityGlobal },
                      },
                      null,
                      2
                    )}
                  </pre>
                </ScrollArea>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-medium">Export as JavaScript</Label>
                  <Button variant="outline" size="sm" onClick={handleExportJS}>
                    <FileCode className="w-3 h-3 mr-1" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Includes helper functions for game integration
                </p>
              </div>

              <div>
                <Button variant="outline" className="w-full" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Layout
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Generate a print-friendly reference sheet
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </div>
  );
}
