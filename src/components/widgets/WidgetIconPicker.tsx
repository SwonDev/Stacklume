"use client";

import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { RefreshCw, Upload, RotateCcw, Search as SearchIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { ICON_MAP, DynamicWidgetIcon } from "@/components/widgets/DynamicWidgetIcon";
import { WIDGET_TYPE_METADATA } from "@/types/widget";

// Lista curada de iconos para el picker (ordenados por frecuencia de uso)
const CURATED_ICONS = [
  "Star", "Bookmark", "Heart", "Home", "Folder", "FolderOpen", "FolderTree",
  "Link", "Globe", "Globe2", "ExternalLink",
  "Clock", "Clock3", "Calendar", "CalendarDays", "AlarmClock", "Timer",
  "BarChart3", "BarChart2", "PieChart", "TrendingUp", "LineChart", "Activity", "BarChartBig",
  "CheckSquare", "CheckCircle", "Check", "CheckCheck", "ListTodo",
  "Sparkles", "Zap", "Flame", "Sun", "Moon",
  "Code", "Code2", "Terminal", "FileCode", "FileJson", "Binary", "Regex",
  "Database", "Network", "Server", "Cloud", "Cpu",
  "Play", "Video", "Film", "Youtube", "Tv2", "Music", "Headphones", "Volume2",
  "Github", "Twitter", "Rss", "Share2",
  "Search", "Filter", "Tag", "Hash", "Inbox",
  "Settings", "Sliders", "SlidersHorizontal", "Wrench", "Puzzle",
  "Bell", "Mail", "MessageSquare", "Send",
  "Image", "Camera", "Palette", "Brush", "Pipette",
  "Gamepad2", "Joystick", "Dices", "Trophy", "Target", "Swords",
  "Pencil", "PenLine", "Edit3", "FileText", "FileEdit", "NotebookPen",
  "Users", "UserCheck", "Smile", "Bot", "Brain", "BrainCircuit",
  "Wallet", "DollarSign", "Briefcase", "BadgePercent", "ShoppingCart",
  "Map", "MapPin", "Compass", "Navigation", "LocateFixed",
  "Monitor", "LayoutGrid", "LayoutDashboard", "Layout", "KanbanSquare",
  "Package", "Box", "Boxes", "Layers", "Layers3",
  "Shield", "Lock", "LockKeyhole", "Key", "Fingerprint",
  "Coffee", "Gift", "Umbrella", "Lightbulb", "Megaphone",
  "Newspaper", "BookOpen", "Scroll",
  "Calculator", "Gauge", "Sigma", "ArrowLeftRight",
  "QrCode", "ClipboardList", "Clipboard", "Pin",
  "Upload", "Download", "RefreshCw", "Power",
  "Contrast", "Blend", "Waves",
  "FlaskConical", "TestTube", "Diff",
  "Info", "Flag", "Eye", "Grid2X2",
] as const;

// Filtrar solo los que existen en el ICON_MAP
const AVAILABLE_ICONS = CURATED_ICONS.filter((name) => name in ICON_MAP);

interface WidgetIconPickerProps {
  widget: Widget;
  open: boolean;
  onClose: () => void;
  position?: { x: number; y: number };
}

export function WidgetIconPicker({ widget, open, onClose, position }: WidgetIconPickerProps) {
  const [search, setSearch] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset search cuando se abre
  useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const filteredIcons = useMemo(() => {
    if (!search.trim()) return AVAILABLE_ICONS;
    const q = search.toLowerCase();
    return AVAILABLE_ICONS.filter((name) => name.toLowerCase().includes(q));
  }, [search]);

  const currentCustomIcon = widget.config?.customIcon as string | undefined;
  const defaultIconName = WIDGET_TYPE_METADATA[widget.type]?.icon ?? "FolderOpen";

  const saveIcon = useCallback(
    (value: string | undefined) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: { ...widget.config, customIcon: value },
      });
      onClose();
    },
    [widget, onClose]
  );

  const handleSelectIcon = useCallback(
    (name: string) => {
      saveIcon(name);
    },
    [saveIcon]
  );

  const handleReset = useCallback(() => {
    saveIcon(undefined);
  }, [saveIcon]);

  // Redimensionar imagen con Canvas a máximo 48×48 px y convertir a base64
  const resizeImageToDataUrl = useCallback(
    (file: File): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          const img = new window.Image();
          img.onload = () => {
            const MAX = 48;
            let { width, height } = img;
            if (width > MAX || height > MAX) {
              if (width > height) {
                height = Math.round((height * MAX) / width);
                width = MAX;
              } else {
                width = Math.round((width * MAX) / height);
                height = MAX;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) return reject(new Error("Canvas no disponible"));
            ctx.drawImage(img, 0, 0, width, height);
            let dataUrl = canvas.toDataURL("image/jpeg", 0.8);
            // Si supera 50 KB, reducir calidad
            if (dataUrl.length > 50 * 1024) {
              dataUrl = canvas.toDataURL("image/jpeg", 0.6);
            }
            resolve(dataUrl);
          };
          img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
          img.src = src;
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo"));
        reader.readAsDataURL(file);
      }),
    []
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploading(true);
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        saveIcon(dataUrl);
      } catch (err) {
        console.log("[WidgetIconPicker] Error al procesar imagen:", err);
      } finally {
        setIsUploading(false);
        // Limpiar el input para permitir seleccionar el mismo archivo otra vez
        e.target.value = "";
      }
    },
    [resizeImageToDataUrl, saveIcon]
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="sm:max-w-md glass p-0 gap-0 overflow-hidden"
        style={(() => {
          if (!position) return undefined;
          // Inline styles tienen mayor especificidad que clases Tailwind sin !important,
          // por lo que left/top/transform sobrescriben left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]
          const W = 460; // sm:max-w-md + padding
          const H = 460; // header + búsqueda + grid + footer
          const MARGIN = 16;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const left = Math.max(MARGIN, Math.min(position.x, vw - W - MARGIN));
          const top  = Math.max(MARGIN, Math.min(position.y, vh - H - MARGIN));
          // "translate" es la propiedad CSS individual que usa Tailwind v4 para translate-x/y.
          // El inline `transform: none` no la sobrescribe, hay que anularla explícitamente.
          return { position: "fixed" as const, left, top, transform: "none", translate: "0px 0px", margin: 0 };
        })()}
      >
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="flex items-center gap-2 text-sm">
            <DynamicWidgetIcon
              iconValue={currentCustomIcon ?? defaultIconName}
              className="text-primary"
            />
            Cambiar icono del widget
          </DialogTitle>
        </DialogHeader>

        {/* Barra de búsqueda */}
        <div className="px-4 pb-2">
          <div className="relative">
            <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar icono..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
              autoFocus
            />
          </div>
        </div>

        {/* Grid de iconos */}
        <ScrollArea className="h-64 px-4">
          {filteredIcons.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-8">
              No se encontraron iconos
            </div>
          ) : (
            <div className="grid grid-cols-8 gap-1 pb-2">
              {filteredIcons.map((name) => {
                const isSelected = currentCustomIcon === name;
                return (
                  <Tooltip key={name}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleSelectIcon(name)}
                        className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-md transition-all",
                          "hover:bg-accent hover:text-accent-foreground",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-foreground/70"
                        )}
                        type="button"
                        aria-label={name}
                      >
                        <DynamicWidgetIcon iconValue={name} className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {name}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Acciones: subir imagen y restablecer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border/50">
          {/* Subir imagen */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 mr-1.5" />
            )}
            Subir imagen
          </Button>

          {/* Vista previa del icono actual si es imagen */}
          {currentCustomIcon?.startsWith("data:") && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentCustomIcon}
                alt="Icono actual"
                className="w-5 h-5 object-contain rounded-sm border border-border/50"
              />
              <span>Actual</span>
            </div>
          )}

          {/* Restablecer al icono por defecto */}
          {currentCustomIcon && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Restablecer icono predeterminado
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
