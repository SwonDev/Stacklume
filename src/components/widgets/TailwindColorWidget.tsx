"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Palette, Copy, Check, Search, Star, X } from "lucide-react";
import { Widget, TailwindColorWidgetConfig } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TailwindColorWidgetProps {
  widget: Widget;
}

// Complete Tailwind CSS v3 color palette
const TAILWIND_COLORS = {
  slate: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5e1",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
    950: "#020617",
  },
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  zinc: {
    50: "#fafafa",
    100: "#f4f4f5",
    200: "#e4e4e7",
    300: "#d4d4d8",
    400: "#a1a1aa",
    500: "#71717a",
    600: "#52525b",
    700: "#3f3f46",
    800: "#27272a",
    900: "#18181b",
    950: "#09090b",
  },
  neutral: {
    50: "#fafafa",
    100: "#f5f5f5",
    200: "#e5e5e5",
    300: "#d4d4d4",
    400: "#a3a3a3",
    500: "#737373",
    600: "#525252",
    700: "#404040",
    800: "#262626",
    900: "#171717",
    950: "#0a0a0a",
  },
  stone: {
    50: "#fafaf9",
    100: "#f5f5f4",
    200: "#e7e5e4",
    300: "#d6d3d1",
    400: "#a8a29e",
    500: "#78716c",
    600: "#57534e",
    700: "#44403c",
    800: "#292524",
    900: "#1c1917",
    950: "#0c0a09",
  },
  red: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
    950: "#450a0a",
  },
  orange: {
    50: "#fff7ed",
    100: "#ffedd5",
    200: "#fed7aa",
    300: "#fdba74",
    400: "#fb923c",
    500: "#f97316",
    600: "#ea580c",
    700: "#c2410c",
    800: "#9a3412",
    900: "#7c2d12",
    950: "#431407",
  },
  amber: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
    950: "#451a03",
  },
  yellow: {
    50: "#fefce8",
    100: "#fef9c3",
    200: "#fef08a",
    300: "#fde047",
    400: "#facc15",
    500: "#eab308",
    600: "#ca8a04",
    700: "#a16207",
    800: "#854d0e",
    900: "#713f12",
    950: "#422006",
  },
  lime: {
    50: "#f7fee7",
    100: "#ecfccb",
    200: "#d9f99d",
    300: "#bef264",
    400: "#a3e635",
    500: "#84cc16",
    600: "#65a30d",
    700: "#4d7c0f",
    800: "#3f6212",
    900: "#365314",
    950: "#1a2e05",
  },
  green: {
    50: "#f0fdf4",
    100: "#dcfce7",
    200: "#bbf7d0",
    300: "#86efac",
    400: "#4ade80",
    500: "#22c55e",
    600: "#16a34a",
    700: "#15803d",
    800: "#166534",
    900: "#14532d",
    950: "#052e16",
  },
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
  teal: {
    50: "#f0fdfa",
    100: "#ccfbf1",
    200: "#99f6e4",
    300: "#5eead4",
    400: "#2dd4bf",
    500: "#14b8a6",
    600: "#0d9488",
    700: "#0f766e",
    800: "#115e59",
    900: "#134e4a",
    950: "#042f2e",
  },
  cyan: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    300: "#67e8f9",
    400: "#22d3ee",
    500: "#06b6d4",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63",
    950: "#083344",
  },
  sky: {
    50: "#f0f9ff",
    100: "#e0f2fe",
    200: "#bae6fd",
    300: "#7dd3fc",
    400: "#38bdf8",
    500: "#0ea5e9",
    600: "#0284c7",
    700: "#0369a1",
    800: "#075985",
    900: "#0c4a6e",
    950: "#082f49",
  },
  blue: {
    50: "#eff6ff",
    100: "#dbeafe",
    200: "#bfdbfe",
    300: "#93c5fd",
    400: "#60a5fa",
    500: "#3b82f6",
    600: "#2563eb",
    700: "#1d4ed8",
    800: "#1e40af",
    900: "#1e3a8a",
    950: "#172554",
  },
  indigo: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
    950: "#1e1b4b",
  },
  violet: {
    50: "#f5f3ff",
    100: "#ede9fe",
    200: "#ddd6fe",
    300: "#c4b5fd",
    400: "#a78bfa",
    500: "#8b5cf6",
    600: "#7c3aed",
    700: "#6d28d9",
    800: "#5b21b6",
    900: "#4c1d95",
    950: "#2e1065",
  },
  purple: {
    50: "#faf5ff",
    100: "#f3e8ff",
    200: "#e9d5ff",
    300: "#d8b4fe",
    400: "#c084fc",
    500: "#a855f7",
    600: "#9333ea",
    700: "#7e22ce",
    800: "#6b21a8",
    900: "#581c87",
    950: "#3b0764",
  },
  fuchsia: {
    50: "#fdf4ff",
    100: "#fae8ff",
    200: "#f5d0fe",
    300: "#f0abfc",
    400: "#e879f9",
    500: "#d946ef",
    600: "#c026d3",
    700: "#a21caf",
    800: "#86198f",
    900: "#701a75",
    950: "#4a044e",
  },
  pink: {
    50: "#fdf2f8",
    100: "#fce7f3",
    200: "#fbcfe8",
    300: "#f9a8d4",
    400: "#f472b6",
    500: "#ec4899",
    600: "#db2777",
    700: "#be185d",
    800: "#9d174d",
    900: "#831843",
    950: "#500724",
  },
  rose: {
    50: "#fff1f2",
    100: "#ffe4e6",
    200: "#fecdd3",
    300: "#fda4af",
    400: "#fb7185",
    500: "#f43f5e",
    600: "#e11d48",
    700: "#be123c",
    800: "#9f1239",
    900: "#881337",
    950: "#4c0519",
  },
};

const COLOR_GROUPS = {
  grays: ["slate", "gray", "zinc", "neutral", "stone"],
  colors: [
    "red",
    "orange",
    "amber",
    "yellow",
    "lime",
    "green",
    "emerald",
    "teal",
    "cyan",
    "sky",
    "blue",
    "indigo",
    "violet",
    "purple",
    "fuchsia",
    "pink",
    "rose",
  ],
};

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

export function TailwindColorWidget({ widget }: TailwindColorWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const config = (widget.config || {}) as TailwindColorWidgetConfig;
  const classType = config.classType || "bg";
  const recentColors = config.recentColors || [];
  const tailwindFavoriteColors = config.tailwindFavoriteColors || [];

  const [searchQuery, setSearchQuery] = useState(config.searchQuery || "");
  const [selectedColor, setSelectedColor] = useState<{
    name: string;
    shade: number;
    hex: string;
    className: string;
  } | null>(null);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Filter colors based on search
  const filteredColors = useMemo(() => {
    if (!searchQuery.trim()) {
      return { grays: COLOR_GROUPS.grays, colors: COLOR_GROUPS.colors };
    }

    const query = searchQuery.toLowerCase();
    const grays = COLOR_GROUPS.grays.filter((color) => color.includes(query));
    const colors = COLOR_GROUPS.colors.filter((color) => color.includes(query));

    return { grays, colors };
  }, [searchQuery]);

  const updateConfig = (updates: Partial<TailwindColorWidgetConfig>) => {
    updateWidget(widget.id, {
      config: {
        ...config,
        ...updates,
      },
    });
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(id);
      toast.success("Copied to clipboard", {
        description: text,
        duration: 1500,
      });
      setTimeout(() => setCopiedItem(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy");
    }
  };

  const handleColorClick = (colorName: string, shade: number, hex: string) => {
    const className = `${classType}-${colorName}-${shade}`;
    setSelectedColor({ name: colorName, shade, hex, className });

    // Add to recent colors
    const newRecent = [className, ...recentColors.filter((c) => c !== className)].slice(0, 12);
    updateConfig({ recentColors: newRecent });
  };

  const toggleFavorite = (className: string) => {
    const isFavorite = tailwindFavoriteColors.includes(className);
    const newFavorites = isFavorite
      ? tailwindFavoriteColors.filter((c) => c !== className)
      : [...tailwindFavoriteColors, className];

    updateConfig({ tailwindFavoriteColors: newFavorites });

    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites", {
      description: className,
      duration: 1500,
    });
  };

  const getColorFromClassName = (className: string) => {
    // Parse className like "bg-blue-500"
    const parts = className.split("-");
    const shade = parseInt(parts[parts.length - 1]);
    const colorName = parts.slice(1, -1).join("-");

    if (TAILWIND_COLORS[colorName as keyof typeof TAILWIND_COLORS]) {
      return {
        name: colorName,
        shade,
        hex: TAILWIND_COLORS[colorName as keyof typeof TAILWIND_COLORS][
          shade as keyof (typeof TAILWIND_COLORS)[keyof typeof TAILWIND_COLORS]
        ],
      };
    }
    return null;
  };

  const renderColorSwatch = (
    colorName: string,
    shade: number,
    hex: string,
    index: number
  ) => {
    const className = `${classType}-${colorName}-${shade}`;
    const isFavorite = tailwindFavoriteColors.includes(className);

    return (
      <motion.button
        key={`${colorName}-${shade}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.01 }}
        onClick={() => handleColorClick(colorName, shade, hex)}
        className={cn(
          "group relative h-12 w-full overflow-hidden rounded-md border-2 transition-all hover:scale-105 hover:shadow-lg",
          selectedColor?.className === className
            ? "border-foreground ring-2 ring-primary/50"
            : "border-border hover:border-foreground/30"
        )}
        style={{ backgroundColor: hex }}
        title={className}
      >
        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
          <div className="rounded bg-black/70 px-2 py-0.5 backdrop-blur-sm">
            <span
              className="text-xs font-medium"
              style={{ color: getContrastColor(hex) }}
            >
              {shade}
            </span>
          </div>
        </div>

        {isFavorite && (
          <div className="absolute right-1 top-1">
            <Star className="size-3 fill-yellow-400 text-yellow-400" />
          </div>
        )}
      </motion.button>
    );
  };

  return (
    <div className="@container size-full flex flex-col">
      <Tabs
        value={classType}
        onValueChange={(value) =>
          updateConfig({ classType: value as "bg" | "text" | "border" })
        }
        className="flex h-full flex-col"
      >
        {/* Header with search and tabs */}
        <div className="border-b border-border p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search colors..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <Button
                size="sm"
                variant="ghost"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-4" />
              </Button>
            )}
          </div>

          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bg">Background</TabsTrigger>
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="border">Border</TabsTrigger>
          </TabsList>
        </div>

        {/* Color grid */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* Recent colors */}
            {recentColors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Recent</h3>
                  <Badge variant="secondary" className="text-xs">
                    {recentColors.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-6 gap-2 @sm:grid-cols-8 @md:grid-cols-12">
                  {recentColors.map((className) => {
                    const colorData = getColorFromClassName(className);
                    if (!colorData) return null;
                    return (
                      <button
                        key={className}
                        onClick={() =>
                          handleColorClick(colorData.name, colorData.shade, colorData.hex)
                        }
                        className="h-8 w-full rounded border-2 border-border transition-all hover:scale-105 hover:border-foreground/50"
                        style={{ backgroundColor: colorData.hex }}
                        title={className}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Favorite colors */}
            {tailwindFavoriteColors.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Star className="size-4 fill-yellow-400 text-yellow-400" />
                    Favorites
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {tailwindFavoriteColors.length}
                  </Badge>
                </div>
                <div className="grid grid-cols-6 gap-2 @sm:grid-cols-8 @md:grid-cols-12">
                  {tailwindFavoriteColors.map((className) => {
                    const colorData = getColorFromClassName(className);
                    if (!colorData) return null;
                    return (
                      <button
                        key={className}
                        onClick={() =>
                          handleColorClick(colorData.name, colorData.shade, colorData.hex)
                        }
                        className="h-8 w-full rounded border-2 border-border transition-all hover:scale-105 hover:border-foreground/50"
                        style={{ backgroundColor: colorData.hex }}
                        title={className}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grays section */}
            {filteredColors.grays.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Grays</h3>
                {filteredColors.grays.map((colorName) => (
                  <div key={colorName} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {colorName}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 @sm:grid-cols-8 @md:grid-cols-11">
                      {SHADES.map((shade, index) =>
                        renderColorSwatch(
                          colorName,
                          shade,
                          TAILWIND_COLORS[colorName as keyof typeof TAILWIND_COLORS][
                            shade
                          ],
                          index
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Colors section */}
            {filteredColors.colors.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Colors</h3>
                {filteredColors.colors.map((colorName) => (
                  <div key={colorName} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium capitalize text-muted-foreground">
                        {colorName}
                      </span>
                    </div>
                    <div className="grid grid-cols-6 gap-1.5 @sm:grid-cols-8 @md:grid-cols-11">
                      {SHADES.map((shade, index) =>
                        renderColorSwatch(
                          colorName,
                          shade,
                          TAILWIND_COLORS[colorName as keyof typeof TAILWIND_COLORS][
                            shade
                          ],
                          index
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No results */}
            {filteredColors.grays.length === 0 && filteredColors.colors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Palette className="mb-3 size-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No colors found</p>
                <p className="text-xs text-muted-foreground/60">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Selected color detail panel */}
        <AnimatePresence>
          {selectedColor && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-border overflow-hidden"
            >
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Selected Color</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        toggleFavorite(selectedColor.className)
                      }
                    >
                      <Star
                        className={cn(
                          "size-4",
                          tailwindFavoriteColors.includes(selectedColor.className)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => setSelectedColor(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>

                <div
                  className="h-16 w-full rounded-md border border-border"
                  style={{ backgroundColor: selectedColor.hex }}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start font-mono text-xs"
                    onClick={() =>
                      copyToClipboard(selectedColor.className, "class")
                    }
                  >
                    {copiedItem === "class" ? (
                      <Check className="mr-1.5 size-3 text-green-500" />
                    ) : (
                      <Copy className="mr-1.5 size-3" />
                    )}
                    <span className="truncate">{selectedColor.className}</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start font-mono text-xs"
                    onClick={() =>
                      copyToClipboard(selectedColor.hex.toUpperCase(), "hex")
                    }
                  >
                    {copiedItem === "hex" ? (
                      <Check className="mr-1.5 size-3 text-green-500" />
                    ) : (
                      <Copy className="mr-1.5 size-3" />
                    )}
                    {selectedColor.hex.toUpperCase()}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="justify-start font-mono text-xs"
                    onClick={() =>
                      copyToClipboard(hexToRgb(selectedColor.hex), "rgb")
                    }
                  >
                    {copiedItem === "rgb" ? (
                      <Check className="mr-1.5 size-3 text-green-500" />
                    ) : (
                      <Copy className="mr-1.5 size-3" />
                    )}
                    <span className="truncate">{hexToRgb(selectedColor.hex)}</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Tabs>
    </div>
  );
}
