"use client";

import { useState, useMemo } from "react";
import { Palette, Copy, Check, Heart, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget, ColorOfDayWidgetConfig } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface ColorOfDayWidgetProps {
  widget: Widget;
}

// Color name database
const COLOR_NAMES: Record<string, string> = {
  "#FF6B6B": "Coral Vivo",
  "#4ECDC4": "Turquesa Tropical",
  "#45B7D1": "Azul Cielo",
  "#96CEB4": "Verde Menta",
  "#FFEAA7": "Amarillo Sol",
  "#DDA0DD": "Ciruela Suave",
  "#98D8C8": "Verde Espuma",
  "#F7DC6F": "Dorado Suave",
  "#BB8FCE": "Lila Elegante",
  "#85C1E9": "Azul Serenidad",
  "#F8B500": "Naranja Atardecer",
  "#FF7F50": "Coral Intenso",
  "#6B5B95": "Violeta Ultra",
  "#88B04B": "Verde Greenery",
  "#F7CAC9": "Rosa Cuarzo",
  "#92A8D1": "Azul Serenity",
  "#955251": "Marsala",
  "#B565A7": "Orquidea Radiante",
  "#009B77": "Esmeralda",
  "#DD4124": "Rojo Tangerine",
  "#D65076": "Madreselva",
  "#45B8AC": "Turquesa",
  "#EFC050": "Mimosa",
  "#5B5EA6": "Azul Iris",
  "#9B2335": "Chili Pepper",
  "#DFCFBE": "Arena",
  "#55B4B0": "Aqua Sky",
  "#E15D44": "Cayenne",
  "#7FCDCD": "Cristal Verde",
  "#BC243C": "True Red",
};

// Generate a deterministic color based on date
function generateColorFromDate(date: Date): string {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  const hue = (seed * 137.508) % 360;
  const saturation = 60 + (seed % 30);
  const lightness = 50 + (seed % 20);
  return hslToHex(hue, saturation, lightness);
}

// Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

// Convert HEX to RGB
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm:
        h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
        break;
      case gNorm:
        h = ((bNorm - rNorm) / d + 2) / 6;
        break;
      case bNorm:
        h = ((rNorm - gNorm) / d + 4) / 6;
        break;
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

// Generate complementary color
function getComplementary(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + 180) % 360, s, l);
}

// Generate analogous colors
function getAnalogous(hex: string): [string, string] {
  const { h, s, l } = hexToHsl(hex);
  return [
    hslToHex((h + 30) % 360, s, l),
    hslToHex((h - 30 + 360) % 360, s, l),
  ];
}

// Generate triadic colors
function getTriadic(hex: string): [string, string] {
  const { h, s, l } = hexToHsl(hex);
  return [
    hslToHex((h + 120) % 360, s, l),
    hslToHex((h + 240) % 360, s, l),
  ];
}

// Get or generate color name
function getColorName(hex: string): string {
  if (COLOR_NAMES[hex.toUpperCase()]) {
    return COLOR_NAMES[hex.toUpperCase()];
  }
  const { h, s, l } = hexToHsl(hex);

  // Generate descriptive name based on HSL values
  let hueName = "";
  if (h < 15 || h >= 345) hueName = "Rojo";
  else if (h < 45) hueName = "Naranja";
  else if (h < 75) hueName = "Amarillo";
  else if (h < 150) hueName = "Verde";
  else if (h < 195) hueName = "Cyan";
  else if (h < 255) hueName = "Azul";
  else if (h < 285) hueName = "Violeta";
  else if (h < 345) hueName = "Magenta";

  let modifier = "";
  if (l < 30) modifier = "Oscuro";
  else if (l > 70) modifier = "Claro";
  else if (s < 30) modifier = "Gris";
  else if (s > 80) modifier = "Vibrante";

  return modifier ? `${hueName} ${modifier}` : hueName;
}

export function ColorOfDayWidget({ widget }: ColorOfDayWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === widget.id)
  );

  const currentWidget = storeWidget || widget;
  const config = currentWidget.config as ColorOfDayWidgetConfig | undefined;

  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);

  // Get or generate today's color
  const targetDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + dateOffset);
    return date;
  }, [dateOffset]);

  const colorOfDay = useMemo(() => {
    return generateColorFromDate(targetDate);
  }, [targetDate]);

  const colorName = useMemo(() => getColorName(colorOfDay), [colorOfDay]);
  const complementary = useMemo(() => getComplementary(colorOfDay), [colorOfDay]);
  const analogous = useMemo(() => getAnalogous(colorOfDay), [colorOfDay]);
  const triadic = useMemo(() => getTriadic(colorOfDay), [colorOfDay]);

  const rgb = useMemo(() => {
    const { r, g, b } = hexToRgb(colorOfDay);
    return `rgb(${r}, ${g}, ${b})`;
  }, [colorOfDay]);

  const hsl = useMemo(() => {
    const { h, s, l } = hexToHsl(colorOfDay);
    return `hsl(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%)`;
  }, [colorOfDay]);

  const favoriteColors = config?.favoriteColors || [];

  const isFavorite = favoriteColors.some((f) => f.hex === colorOfDay);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedValue(text);
    toast.success("Copiado al portapapeles", {
      description: label,
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const toggleFavorite = () => {
    const newFavorites = isFavorite
      ? favoriteColors.filter((f) => f.hex !== colorOfDay)
      : [
          ...favoriteColors,
          {
            hex: colorOfDay,
            name: colorName,
            date: targetDate.toISOString().split("T")[0],
          },
        ].slice(-20); // Keep last 20 favorites

    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        favoriteColors: newFavorites,
      },
    });

    toast.success(isFavorite ? "Eliminado de favoritos" : "Agregado a favoritos");
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const isToday = dateOffset === 0;

  return (
    <div className="h-full w-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Palette className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold">Color del Dia</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={() => setShowFavorites(!showFavorites)}
            title={showFavorites ? "Ver color del dia" : "Ver favoritos"}
          >
            <Heart
              className={cn(
                "w-3.5 h-3.5",
                showFavorites && "fill-red-500 text-red-500"
              )}
            />
          </Button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {showFavorites ? (
          <motion.div
            key="favorites"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 overflow-hidden"
          >
            <h4 className="text-xs font-medium text-muted-foreground mb-2">
              Favoritos ({favoriteColors.length})
            </h4>
            {favoriteColors.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-center">
                <Heart className="w-6 h-6 text-muted-foreground/50 mb-1" />
                <p className="text-xs text-muted-foreground">Sin favoritos aun</p>
              </div>
            ) : (
              <ScrollArea className="h-[calc(100%-2rem)]">
                <div className="grid grid-cols-4 gap-1.5">
                  {favoriteColors.map((fav) => (
                    <button
                      key={fav.hex}
                      className="group relative aspect-square rounded-md overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all"
                      style={{ backgroundColor: fav.hex }}
                      onClick={() => copyToClipboard(fav.hex, fav.name)}
                      title={`${fav.name} - ${fav.date}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                        {copiedValue === fav.hex ? (
                          <Check className="w-3 h-3 text-white" />
                        ) : (
                          <Copy className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="color-of-day"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Date navigation */}
            <div className="flex items-center justify-between mb-2">
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setDateOffset((d) => d - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground capitalize">
                {isToday ? "Hoy" : formatDate(targetDate)}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6"
                onClick={() => setDateOffset((d) => d + 1)}
                disabled={dateOffset >= 7}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Main color display */}
            <motion.div
              key={colorOfDay}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="relative rounded-lg overflow-hidden mb-2 flex-shrink-0"
              style={{ backgroundColor: colorOfDay }}
            >
              <div className="aspect-[3/2] flex flex-col items-center justify-center p-3">
                <Sparkles className="w-5 h-5 text-white/80 mb-1 drop-shadow" />
                <span className="text-lg font-bold text-white drop-shadow-md">
                  {colorName}
                </span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-7 w-7 bg-black/20 hover:bg-black/40"
                onClick={toggleFavorite}
              >
                <Heart
                  className={cn(
                    "w-4 h-4 text-white",
                    isFavorite && "fill-red-500 text-red-500"
                  )}
                />
              </Button>
            </motion.div>

            {/* Color values */}
            <div className="space-y-1 mb-2">
              <button
                className="w-full flex items-center justify-between p-1.5 rounded bg-secondary/50 hover:bg-secondary transition-colors text-xs"
                onClick={() => copyToClipboard(colorOfDay, "HEX")}
              >
                <span className="font-mono text-muted-foreground">HEX</span>
                <span className="font-mono font-medium">{colorOfDay}</span>
              </button>
              <button
                className="w-full flex items-center justify-between p-1.5 rounded bg-secondary/50 hover:bg-secondary transition-colors text-xs"
                onClick={() => copyToClipboard(rgb, "RGB")}
              >
                <span className="font-mono text-muted-foreground">RGB</span>
                <span className="font-mono font-medium">{rgb}</span>
              </button>
              <button
                className="w-full flex items-center justify-between p-1.5 rounded bg-secondary/50 hover:bg-secondary transition-colors text-xs @[200px]:block hidden"
                onClick={() => copyToClipboard(hsl, "HSL")}
              >
                <span className="font-mono text-muted-foreground">HSL</span>
                <span className="font-mono font-medium">{hsl}</span>
              </button>
            </div>

            {/* Harmonies */}
            <div className="mt-auto">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">
                Armonias
              </span>
              <div className="flex gap-1">
                {/* Complementary */}
                <button
                  className="flex-1 aspect-[2/1] rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group relative"
                  style={{ backgroundColor: complementary }}
                  onClick={() => copyToClipboard(complementary, "Complementario")}
                  title="Complementario"
                >
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                    <span className="text-[8px] text-white font-mono">{complementary}</span>
                  </span>
                </button>
                {/* Analogous */}
                {analogous.map((color, idx) => (
                  <button
                    key={`analogous-${idx}`}
                    className="flex-1 aspect-[2/1] rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group relative"
                    style={{ backgroundColor: color }}
                    onClick={() => copyToClipboard(color, "Analogo")}
                    title="Analogo"
                  >
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="text-[8px] text-white font-mono">{color}</span>
                    </span>
                  </button>
                ))}
                {/* Triadic */}
                {triadic.map((color, idx) => (
                  <button
                    key={`triadic-${idx}`}
                    className="flex-1 aspect-[2/1] rounded overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all group relative @[180px]:block hidden"
                    style={{ backgroundColor: color }}
                    onClick={() => copyToClipboard(color, "Triadico")}
                    title="Triadico"
                  >
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity">
                      <span className="text-[8px] text-white font-mono">{color}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
