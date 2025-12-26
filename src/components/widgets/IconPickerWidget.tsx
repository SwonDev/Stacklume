"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Search,
  Copy,
  Check,
  Star,
  History,
  Grid3X3,
  Filter,
  X,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { toast } from "sonner";

interface IconPickerWidgetProps {
  widget: Widget;
}

interface IconPickerConfig {
  recentIcons?: string[];
  favoriteIcons?: string[];
  lastSearchQuery?: string;
}

// Icon categories based on Lucide's organization
const ICON_CATEGORIES: Record<string, string[]> = {
  Comun: [
    "Home", "Search", "Settings", "User", "Mail", "Bell", "Heart", "Star",
    "Check", "X", "Plus", "Minus", "ChevronRight", "ChevronLeft", "ArrowRight",
    "ArrowLeft", "Menu", "MoreHorizontal", "MoreVertical", "Edit", "Trash2",
    "Copy", "Download", "Upload", "Share", "Link", "ExternalLink", "Eye",
    "EyeOff", "Lock", "Unlock", "Key", "Shield", "AlertCircle", "Info",
  ],
  Archivos: [
    "File", "FileText", "Folder", "FolderOpen", "FolderPlus", "Archive",
    "Image", "Video", "Music", "FileCode", "FilePlus", "FileX", "Files",
    "FolderClosed", "FolderMinus", "FileJson", "FilePdf", "FileSpreadsheet",
  ],
  Comunicacion: [
    "MessageCircle", "MessageSquare", "Send", "Inbox", "Phone", "PhoneCall",
    "Video", "Camera", "Mic", "MicOff", "Volume2", "VolumeX", "Headphones",
    "Radio", "Podcast", "Megaphone", "AtSign", "Hash",
  ],
  Redes: [
    "Globe", "Wifi", "WifiOff", "Cloud", "CloudOff", "Server", "Database",
    "HardDrive", "Cpu", "Monitor", "Smartphone", "Tablet", "Laptop", "Watch",
    "Bluetooth", "Cast", "Rss", "Signal", "Router",
  ],
  Desarrollo: [
    "Code", "Terminal", "GitBranch", "GitCommit", "GitMerge", "GitPullRequest",
    "Github", "Gitlab", "Bug", "Puzzle", "Package", "Boxes", "Component",
    "Layers", "LayoutGrid", "LayoutList", "Workflow", "Webhook", "Api",
  ],
  Diseno: [
    "Palette", "Paintbrush", "Pen", "Pencil", "Brush", "Droplet", "Pipette",
    "Shapes", "Square", "Circle", "Triangle", "Hexagon", "Pentagon", "Octagon",
    "LayoutTemplate", "Frame", "Maximize", "Minimize", "Move", "Crosshair",
  ],
  Media: [
    "Play", "Pause", "Stop", "SkipBack", "SkipForward", "Rewind", "FastForward",
    "Repeat", "Shuffle", "Volume1", "VolumeX", "Music", "Film", "Tv",
    "Radio", "Headphones", "Podcast", "Mic", "Camera", "Image",
  ],
  Navegacion: [
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ChevronUp", "ChevronDown",
    "ChevronLeft", "ChevronRight", "ChevronsUp", "ChevronsDown", "CornerUpLeft",
    "CornerUpRight", "MoveUp", "MoveDown", "MoveLeft", "MoveRight", "Compass",
    "Navigation", "Map", "MapPin", "Route", "Milestone", "Signpost",
  ],
  Tiempo: [
    "Clock", "Timer", "Hourglass", "Calendar", "CalendarDays", "CalendarCheck",
    "CalendarPlus", "CalendarMinus", "CalendarX", "Sun", "Moon", "Sunrise",
    "Sunset", "Cloud", "CloudRain", "CloudSnow", "CloudSun", "Thermometer",
  ],
  Comercio: [
    "ShoppingCart", "ShoppingBag", "CreditCard", "Wallet", "DollarSign", "Euro",
    "Coins", "Banknote", "Receipt", "Tag", "Tags", "Percent", "BadgePercent",
    "Gift", "Package", "Truck", "Store", "Building",
  ],
  Social: [
    "Users", "UserPlus", "UserMinus", "UserCheck", "UserX", "Group", "Heart",
    "HeartOff", "ThumbsUp", "ThumbsDown", "Share2", "Bookmark", "Award",
    "Trophy", "Medal", "Crown", "Flame", "Sparkles", "PartyPopper",
  ],
};

// Get all icon names from Lucide
const getAllIconNames = (): string[] => {
  return Object.keys(LucideIcons).filter(
    (key) =>
      key !== "createLucideIcon" &&
      key !== "default" &&
      key !== "icons" &&
      typeof (LucideIcons as Record<string, unknown>)[key] === "function" &&
      key[0] === key[0].toUpperCase()
  );
};

const ALL_ICONS = getAllIconNames();

export function IconPickerWidget({ widget }: IconPickerWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === widget.id)
  );

  const currentWidget = storeWidget || widget;
  const config = currentWidget.config as IconPickerConfig | undefined;

  const [searchQuery, setSearchQuery] = useState(config?.lastSearchQuery || "");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [copiedValue, setCopiedValue] = useState<string | null>(null);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"browse" | "recent" | "favorites">("browse");
  const [copyFormat, setCopyFormat] = useState<"name" | "import" | "jsx">("name");

  const recentIcons = config?.recentIcons || [];
  const favoriteIcons = config?.favoriteIcons || [];

  // Filter icons based on search and category
  const filteredIcons = useMemo(() => {
    let icons: string[] = [];

    if (selectedCategory === "all") {
      icons = ALL_ICONS;
    } else {
      icons = ICON_CATEGORIES[selectedCategory] || [];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter((name) => name.toLowerCase().includes(query));
    }

    return icons.slice(0, 100); // Limit for performance
  }, [searchQuery, selectedCategory]);

  // Save search query
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateWidget(currentWidget.id, {
        config: {
          ...currentWidget.config,
          lastSearchQuery: searchQuery,
        },
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const addToRecent = (iconName: string) => {
    const newRecent = [iconName, ...recentIcons.filter((i) => i !== iconName)].slice(0, 20);
    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        recentIcons: newRecent,
      },
    });
  };

  const toggleFavorite = (iconName: string) => {
    const isFav = favoriteIcons.includes(iconName);
    const newFavorites = isFav
      ? favoriteIcons.filter((i) => i !== iconName)
      : [...favoriteIcons, iconName];

    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        favoriteIcons: newFavorites,
      },
    });

    toast.success(isFav ? "Eliminado de favoritos" : "Agregado a favoritos");
  };

  const getFormattedCopy = (iconName: string, format: string): string => {
    switch (format) {
      case "import":
        return `import { ${iconName} } from "lucide-react";`;
      case "jsx":
        return `<${iconName} className="w-4 h-4" />`;
      case "name":
      default:
        return iconName;
    }
  };

  const copyToClipboard = async (iconName: string, format?: string) => {
    const formatToUse = format || copyFormat;
    const text = getFormattedCopy(iconName, formatToUse);
    await navigator.clipboard.writeText(text);
    setCopiedValue(iconName);
    addToRecent(iconName);

    const formatLabels: Record<string, string> = {
      name: "Nombre del icono",
      import: "Import statement",
      jsx: "Componente JSX",
    };

    toast.success("Copiado al portapapeles", {
      description: formatLabels[formatToUse],
      duration: 1500,
    });
    setTimeout(() => setCopiedValue(null), 2000);
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName];
    if (!IconComponent) return null;
    return <IconComponent className="w-4 h-4" />;
  };

  const IconButton = ({ iconName, showFavorite = true }: { iconName: string; showFavorite?: boolean }) => {
    const isFav = favoriteIcons.includes(iconName);
    const isCopied = copiedValue === iconName;

    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "relative aspect-square flex items-center justify-center rounded-md",
              "border border-transparent hover:border-border hover:bg-secondary/50",
              "transition-all group",
              selectedIcon === iconName && "border-primary bg-primary/10"
            )}
            onClick={() => setSelectedIcon(iconName)}
          >
            {renderIcon(iconName)}
            {showFavorite && isFav && (
              <Star className="absolute top-0.5 right-0.5 w-2 h-2 fill-yellow-500 text-yellow-500" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2" align="center">
          <div className="space-y-2">
            <p className="text-xs font-medium text-center">{iconName}</p>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => copyToClipboard(iconName, "name")}
              >
                {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => copyToClipboard(iconName, "import")}
              >
                Import
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs"
                onClick={() => copyToClipboard(iconName, "jsx")}
              >
                JSX
              </Button>
            </div>
            <Button
              size="sm"
              variant={isFav ? "default" : "ghost"}
              className="w-full h-7 text-xs"
              onClick={() => toggleFavorite(iconName)}
            >
              <Star className={cn("w-3 h-3 mr-1", isFav && "fill-current")} />
              {isFav ? "Quitar favorito" : "Agregar a favoritos"}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <div className="h-full w-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Grid3X3 className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold">Iconos</h3>
        </div>
        <Badge variant="outline" className="text-[9px] h-4">
          {ALL_ICONS.length}+ iconos
        </Badge>
      </div>

      {/* Search */}
      <div className="relative mb-2">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar iconos..."
          className="pl-7 h-8 text-xs"
        />
        {searchQuery && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
            onClick={() => setSearchQuery("")}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-3 h-7 mb-2">
          <TabsTrigger value="browse" className="text-[10px]">
            <Grid3X3 className="w-3 h-3 mr-1" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="recent" className="text-[10px]">
            <History className="w-3 h-3 mr-1" />
            Recientes
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-[10px]">
            <Star className="w-3 h-3 mr-1" />
            Favoritos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="flex-1 overflow-hidden flex flex-col mt-0">
          {/* Category filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-7 text-xs mb-2">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos los iconos
              </SelectItem>
              {Object.keys(ICON_CATEGORIES).map((category) => (
                <SelectItem key={category} value={category} className="text-xs">
                  {category} ({ICON_CATEGORIES[category].length})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Icon grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-6 @[200px]:grid-cols-8 @[280px]:grid-cols-10 gap-0.5">
              {filteredIcons.map((iconName) => (
                <IconButton key={iconName} iconName={iconName} />
              ))}
            </div>
            {filteredIcons.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Search className="w-6 h-6 text-muted-foreground/50 mb-2" />
                <p className="text-xs text-muted-foreground">No se encontraron iconos</p>
              </div>
            )}
          </ScrollArea>

          {/* Results count */}
          <div className="mt-2 text-[10px] text-muted-foreground text-center">
            {filteredIcons.length} iconos{" "}
            {searchQuery && `para "${searchQuery}"`}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="flex-1 overflow-hidden mt-0">
          {recentIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <History className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Sin iconos recientes</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Los iconos copiados apareceran aqui
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-6 @[200px]:grid-cols-8 @[280px]:grid-cols-10 gap-0.5">
                {recentIcons.map((iconName) => (
                  <IconButton key={iconName} iconName={iconName} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
          {favoriteIcons.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Star className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Sin favoritos</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Marca iconos como favoritos
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-6 @[200px]:grid-cols-8 @[280px]:grid-cols-10 gap-0.5">
                {favoriteIcons.map((iconName) => (
                  <IconButton key={iconName} iconName={iconName} showFavorite={false} />
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
