"use client";

import React from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  ContextMenuCheckboxItem,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Pencil,
  Settings,
  Copy,
  Lock,
  Unlock,
  LayoutGrid,
  Download,
  Trash2,
  CheckIcon,
  AlertTriangle,
} from "lucide-react";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget, WidgetSize } from "@/types/widget";
import { WIDGET_SIZE_PRESETS, WIDGET_TYPE_METADATA } from "@/types/widget";

interface WidgetContextMenuProps {
  widget: Widget;
  children: React.ReactNode;
  onRename?: () => void;
  onConfigure?: () => void;
}

// Define complete theme data for widgets
interface WidgetTheme {
  name: string;
  value: string;
  // Visual preview
  bgClass?: string;
  // Colors for dark mode (primary use case)
  background: string;
  foreground: string; // Main text color
  muted: string; // Secondary text
  accent: string; // Highlights, icons, links
  border: string;
  // Optional gradient (overrides background)
  gradient?: string;
}

const THEME_PRESETS: WidgetTheme[] = [
  {
    name: "Default",
    value: "",
    bgClass: "bg-card",
    background: "",
    foreground: "",
    muted: "",
    accent: "",
    border: ""
  },
  {
    name: "Slate",
    value: "slate",
    bgClass: "bg-slate-100 dark:bg-slate-900",
    background: "hsl(215, 25%, 12%)",
    foreground: "hsl(210, 40%, 96%)",
    muted: "hsl(215, 20%, 65%)",
    accent: "hsl(210, 40%, 80%)",
    border: "hsl(215, 20%, 22%)"
  },
  {
    name: "Red",
    value: "red",
    bgClass: "bg-red-100 dark:bg-red-950",
    background: "hsl(0, 40%, 12%)",
    foreground: "hsl(0, 85%, 97%)",
    muted: "hsl(0, 30%, 65%)",
    accent: "hsl(0, 72%, 65%)",
    border: "hsl(0, 40%, 22%)"
  },
  {
    name: "Orange",
    value: "orange",
    bgClass: "bg-orange-100 dark:bg-orange-950",
    background: "hsl(25, 45%, 12%)",
    foreground: "hsl(25, 95%, 97%)",
    muted: "hsl(25, 35%, 65%)",
    accent: "hsl(25, 95%, 60%)",
    border: "hsl(25, 40%, 22%)"
  },
  {
    name: "Amber",
    value: "amber",
    bgClass: "bg-amber-100 dark:bg-amber-950",
    background: "hsl(38, 45%, 12%)",
    foreground: "hsl(45, 95%, 97%)",
    muted: "hsl(38, 35%, 65%)",
    accent: "hsl(38, 92%, 55%)",
    border: "hsl(38, 40%, 22%)"
  },
  {
    name: "Yellow",
    value: "yellow",
    bgClass: "bg-yellow-100 dark:bg-yellow-950",
    background: "hsl(50, 45%, 10%)",
    foreground: "hsl(55, 95%, 97%)",
    muted: "hsl(50, 35%, 60%)",
    accent: "hsl(50, 95%, 55%)",
    border: "hsl(50, 40%, 20%)"
  },
  {
    name: "Lime",
    value: "lime",
    bgClass: "bg-lime-100 dark:bg-lime-950",
    background: "hsl(80, 40%, 10%)",
    foreground: "hsl(80, 85%, 97%)",
    muted: "hsl(80, 25%, 60%)",
    accent: "hsl(80, 80%, 55%)",
    border: "hsl(80, 35%, 20%)"
  },
  {
    name: "Green",
    value: "green",
    bgClass: "bg-green-100 dark:bg-green-950",
    background: "hsl(140, 40%, 10%)",
    foreground: "hsl(140, 80%, 97%)",
    muted: "hsl(140, 25%, 60%)",
    accent: "hsl(140, 70%, 50%)",
    border: "hsl(140, 35%, 20%)"
  },
  {
    name: "Emerald",
    value: "emerald",
    bgClass: "bg-emerald-100 dark:bg-emerald-950",
    background: "hsl(160, 40%, 10%)",
    foreground: "hsl(160, 80%, 97%)",
    muted: "hsl(160, 25%, 60%)",
    accent: "hsl(160, 85%, 45%)",
    border: "hsl(160, 35%, 20%)"
  },
  {
    name: "Teal",
    value: "teal",
    bgClass: "bg-teal-100 dark:bg-teal-950",
    background: "hsl(175, 40%, 10%)",
    foreground: "hsl(175, 80%, 97%)",
    muted: "hsl(175, 25%, 60%)",
    accent: "hsl(175, 75%, 45%)",
    border: "hsl(175, 35%, 20%)"
  },
  {
    name: "Cyan",
    value: "cyan",
    bgClass: "bg-cyan-100 dark:bg-cyan-950",
    background: "hsl(190, 45%, 10%)",
    foreground: "hsl(190, 90%, 97%)",
    muted: "hsl(190, 30%, 60%)",
    accent: "hsl(190, 85%, 55%)",
    border: "hsl(190, 40%, 20%)"
  },
  {
    name: "Sky",
    value: "sky",
    bgClass: "bg-sky-100 dark:bg-sky-950",
    background: "hsl(200, 45%, 12%)",
    foreground: "hsl(200, 90%, 97%)",
    muted: "hsl(200, 30%, 65%)",
    accent: "hsl(200, 95%, 60%)",
    border: "hsl(200, 40%, 22%)"
  },
  {
    name: "Blue",
    value: "blue",
    bgClass: "bg-blue-100 dark:bg-blue-950",
    background: "hsl(220, 45%, 12%)",
    foreground: "hsl(220, 90%, 97%)",
    muted: "hsl(220, 30%, 65%)",
    accent: "hsl(220, 85%, 60%)",
    border: "hsl(220, 40%, 22%)"
  },
  {
    name: "Indigo",
    value: "indigo",
    bgClass: "bg-indigo-100 dark:bg-indigo-950",
    background: "hsl(235, 45%, 12%)",
    foreground: "hsl(235, 85%, 97%)",
    muted: "hsl(235, 30%, 65%)",
    accent: "hsl(235, 75%, 60%)",
    border: "hsl(235, 40%, 22%)"
  },
  {
    name: "Violet",
    value: "violet",
    bgClass: "bg-violet-100 dark:bg-violet-950",
    background: "hsl(260, 45%, 12%)",
    foreground: "hsl(260, 85%, 97%)",
    muted: "hsl(260, 30%, 65%)",
    accent: "hsl(260, 75%, 60%)",
    border: "hsl(260, 40%, 22%)"
  },
  {
    name: "Purple",
    value: "purple",
    bgClass: "bg-purple-100 dark:bg-purple-950",
    background: "hsl(280, 45%, 12%)",
    foreground: "hsl(280, 85%, 97%)",
    muted: "hsl(280, 30%, 65%)",
    accent: "hsl(280, 75%, 55%)",
    border: "hsl(280, 40%, 22%)"
  },
  {
    name: "Fuchsia",
    value: "fuchsia",
    bgClass: "bg-fuchsia-100 dark:bg-fuchsia-950",
    background: "hsl(295, 45%, 12%)",
    foreground: "hsl(295, 85%, 97%)",
    muted: "hsl(295, 30%, 65%)",
    accent: "hsl(295, 85%, 60%)",
    border: "hsl(295, 40%, 22%)"
  },
  {
    name: "Pink",
    value: "pink",
    bgClass: "bg-pink-100 dark:bg-pink-950",
    background: "hsl(330, 45%, 12%)",
    foreground: "hsl(330, 85%, 97%)",
    muted: "hsl(330, 30%, 65%)",
    accent: "hsl(330, 75%, 60%)",
    border: "hsl(330, 40%, 22%)"
  },
  {
    name: "Rose",
    value: "rose",
    bgClass: "bg-rose-100 dark:bg-rose-950",
    background: "hsl(350, 45%, 12%)",
    foreground: "hsl(350, 85%, 97%)",
    muted: "hsl(350, 30%, 65%)",
    accent: "hsl(350, 80%, 60%)",
    border: "hsl(350, 40%, 22%)"
  },
];

const GRADIENT_PRESETS: WidgetTheme[] = [
  {
    name: "Sunset",
    value: "sunset",
    background: "",
    gradient: "linear-gradient(135deg, hsl(270, 50%, 15%) 0%, hsl(330, 50%, 20%) 100%)",
    foreground: "hsl(330, 80%, 95%)",
    muted: "hsl(300, 30%, 70%)",
    accent: "hsl(330, 80%, 70%)",
    border: "hsl(300, 40%, 30%)"
  },
  {
    name: "Ocean",
    value: "ocean",
    background: "",
    gradient: "linear-gradient(135deg, hsl(230, 50%, 15%) 0%, hsl(180, 80%, 40%) 100%)",
    foreground: "hsl(180, 90%, 95%)",
    muted: "hsl(200, 30%, 70%)",
    accent: "hsl(180, 90%, 60%)",
    border: "hsl(200, 40%, 30%)"
  },
  {
    name: "Forest",
    value: "forest",
    background: "",
    gradient: "linear-gradient(135deg, hsl(185, 60%, 15%) 0%, hsl(140, 40%, 35%) 100%)",
    foreground: "hsl(140, 80%, 95%)",
    muted: "hsl(160, 25%, 70%)",
    accent: "hsl(140, 70%, 60%)",
    border: "hsl(160, 35%, 30%)"
  },
  {
    name: "Aurora",
    value: "aurora",
    background: "",
    gradient: "linear-gradient(135deg, hsl(190, 100%, 40%) 0%, hsl(140, 100%, 60%) 100%)",
    foreground: "hsl(140, 90%, 98%)",
    muted: "hsl(165, 30%, 75%)",
    accent: "hsl(165, 80%, 70%)",
    border: "hsl(165, 40%, 35%)"
  },
  {
    name: "Fire",
    value: "fire",
    background: "",
    gradient: "linear-gradient(135deg, hsl(0, 85%, 40%) 0%, hsl(40, 95%, 50%) 100%)",
    foreground: "hsl(40, 95%, 98%)",
    muted: "hsl(20, 35%, 75%)",
    accent: "hsl(40, 95%, 70%)",
    border: "hsl(20, 45%, 35%)"
  },
  {
    name: "Cotton Candy",
    value: "cotton-candy",
    background: "",
    gradient: "linear-gradient(135deg, hsl(180, 60%, 70%) 0%, hsl(330, 70%, 80%) 100%)",
    foreground: "hsl(300, 50%, 20%)",
    muted: "hsl(300, 25%, 40%)",
    accent: "hsl(330, 80%, 50%)",
    border: "hsl(300, 30%, 60%)"
  },
  {
    name: "Peach",
    value: "peach",
    background: "",
    gradient: "linear-gradient(135deg, hsl(330, 100%, 90%) 0%, hsl(180, 100%, 85%) 100%)",
    foreground: "hsl(200, 40%, 20%)",
    muted: "hsl(180, 20%, 45%)",
    accent: "hsl(330, 80%, 50%)",
    border: "hsl(200, 30%, 65%)"
  },
  {
    name: "Moonlight",
    value: "moonlight",
    background: "",
    gradient: "linear-gradient(135deg, hsl(190, 60%, 8%) 0%, hsl(195, 35%, 20%) 50%, hsl(195, 40%, 25%) 100%)",
    foreground: "hsl(195, 50%, 90%)",
    muted: "hsl(195, 20%, 65%)",
    accent: "hsl(195, 70%, 60%)",
    border: "hsl(195, 30%, 30%)"
  },
];

// Size configuration with labels
const SIZE_OPTIONS: Array<{ size: WidgetSize; label: string; dimensions: string }> = [
  { size: "small", label: "Small", dimensions: "1x2" },
  { size: "medium", label: "Medium", dimensions: "2x3" },
  { size: "large", label: "Large", dimensions: "2x4" },
  { size: "wide", label: "Wide", dimensions: "3x2" },
  { size: "tall", label: "Tall", dimensions: "1x4" },
];

export function WidgetContextMenu({
  widget,
  children,
  onRename,
  onConfigure,
}: WidgetContextMenuProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const duplicateWidget = useWidgetStore((state) => state.duplicateWidget);
  const removeWidget = useWidgetStore((state) => state.removeWidget);
  const toggleLock = useWidgetStore((state) => state.toggleLock);
  const autoOrganizeWidgets = useWidgetStore((state) => state.autoOrganizeWidgets);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Use widget's actual locked state
  const isLocked = widget.isLocked ?? false;

  const currentTheme = widget.config?.widgetTheme;
  const currentColor = widget.config?.customBackground || "";
  const currentGradient = widget.config?.customGradient || "";

  const handleSizeChange = async (size: WidgetSize) => {
    await updateWidget(widget.id, { size });
  };

  const handleThemeChange = async (theme: WidgetTheme) => {
    // If it's the default theme, clear everything
    if (!theme.value) {
      await updateWidget(widget.id, {
        config: {
          ...widget.config,
          widgetTheme: undefined,
          customBackground: "",
          customGradient: "",
        },
      });
      return;
    }

    // Save the complete theme data
    await updateWidget(widget.id, {
      config: {
        ...widget.config,
        widgetTheme: {
          background: theme.background,
          foreground: theme.foreground,
          muted: theme.muted,
          accent: theme.accent,
          border: theme.border,
          gradient: theme.gradient,
        },
        customBackground: "",
        customGradient: "",
      },
    });
  };

  const handleColorChange = async (colorValue: string) => {
    await updateWidget(widget.id, {
      config: {
        ...widget.config,
        customBackground: colorValue,
        customGradient: "", // Reset gradient when applying solid color
      },
    });
  };

  const handleGradientChange = async (gradientValue: string) => {
    const gradient = GRADIENT_PRESETS.find(g => g.value === gradientValue);
    if (gradient) {
      await updateWidget(widget.id, {
        config: {
          ...widget.config,
          customGradient: gradient.gradient,
          customBackground: "", // Reset solid color when applying gradient
        },
      });
    }
  };

  const handleResetColors = async () => {
    await updateWidget(widget.id, {
      config: {
        ...widget.config,
        widgetTheme: undefined,
        customBackground: "",
        customGradient: "",
      },
    });
  };

  const handleLockToggle = () => {
    toggleLock(widget.id);
  };

  const handleExportConfig = () => {
    const config = {
      type: widget.type,
      title: widget.title,
      size: widget.size,
      config: widget.config,
      layout: widget.layout,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `widget-${widget.type}-${widget.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await removeWidget(widget.id);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting widget:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get widget type label for display
  const widgetTypeLabel = WIDGET_TYPE_METADATA[widget.type]?.label || widget.type;

  return (
    <>
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {/* Quick Actions Section */}
        <ContextMenuItem onClick={onRename}>
          <Pencil className="mr-2 h-4 w-4" />
          Rename
        </ContextMenuItem>

        <ContextMenuItem onClick={onConfigure}>
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </ContextMenuItem>

        <ContextMenuItem onClick={() => duplicateWidget(widget.id)}>
          <Copy className="mr-2 h-4 w-4" />
          Duplicate
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Size Section (Submenu) */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <LayoutGrid className="mr-2 h-4 w-4" />
            Size
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            {SIZE_OPTIONS.map((option) => {
              const isCurrentSize = widget.size === option.size;
              return (
                <ContextMenuItem
                  key={option.size}
                  onClick={() => handleSizeChange(option.size)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    {isCurrentSize && <CheckIcon className="mr-2 h-4 w-4" />}
                    {!isCurrentSize && <span className="mr-6" />}
                    <span>{option.label}</span>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {option.dimensions}
                  </span>
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {/* Color/Theme Section (Submenu) */}
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <div className="mr-2 h-4 w-4 rounded-full border-2 border-border bg-gradient-to-br from-red-400 via-purple-400 to-blue-400" />
            Color & Theme
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="max-h-[400px] overflow-y-auto">
            {/* Reset/Default Option */}
            <ContextMenuItem onClick={handleResetColors}>
              <div className="mr-2 h-4 w-4 rounded border border-border bg-card" />
              Default (Reset)
            </ContextMenuItem>

            <ContextMenuSeparator />

            {/* Solid Color Themes */}
            {THEME_PRESETS.slice(1).map((theme) => {
              const isActive = currentTheme &&
                currentTheme.background === theme.background &&
                !currentTheme.gradient;
              return (
                <ContextMenuItem
                  key={theme.value}
                  onClick={() => handleThemeChange(theme)}
                  className="flex items-center"
                >
                  {isActive && <CheckIcon className="mr-2 h-4 w-4" />}
                  {!isActive && <span className="mr-6" />}
                  <div
                    className={`mr-2 h-4 w-4 rounded border border-border ${theme.bgClass}`}
                  />
                  {theme.name}
                </ContextMenuItem>
              );
            })}

            <ContextMenuSeparator />

            {/* Gradient Themes */}
            {GRADIENT_PRESETS.map((theme) => {
              const isActive = currentTheme?.gradient === theme.gradient;
              return (
                <ContextMenuItem
                  key={theme.value}
                  onClick={() => handleThemeChange(theme)}
                  className="flex items-center"
                >
                  {isActive && <CheckIcon className="mr-2 h-4 w-4" />}
                  {!isActive && <span className="mr-6" />}
                  <div
                    className="mr-2 h-4 w-4 rounded border border-border"
                    style={{ background: theme.gradient }}
                  />
                  {theme.name}
                </ContextMenuItem>
              );
            })}
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        {/* Advanced Section */}
        <ContextMenuItem onClick={handleLockToggle}>
          {isLocked ? (
            <Lock className="mr-2 h-4 w-4" />
          ) : (
            <Unlock className="mr-2 h-4 w-4" />
          )}
          {isLocked ? "Unlock Position" : "Lock Position"}
        </ContextMenuItem>

        <ContextMenuItem onClick={autoOrganizeWidgets}>
          <LayoutGrid className="mr-2 h-4 w-4" />
          Auto-organize All
        </ContextMenuItem>

        <ContextMenuItem onClick={handleExportConfig}>
          <Download className="mr-2 h-4 w-4" />
          Export Config
        </ContextMenuItem>

        <ContextMenuSeparator />

        {/* Danger Section */}
        <ContextMenuItem variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>

    <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Widget</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this {widgetTypeLabel} widget? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
