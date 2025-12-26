"use client";

import { useState, useRef, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  GripVertical,
  MoreHorizontal,
  Settings,
  Trash2,
  Pencil,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Copy,
  Columns3,
  Ruler,
} from "lucide-react";
import type { Widget } from "@/types/widget";
import {
  DEFAULT_KANBAN_HEIGHT,
  MIN_KANBAN_HEIGHT,
  MAX_KANBAN_HEIGHT,
} from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useSortedColumns } from "@/stores/kanban-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Import all widget components
import { ClockWidget } from "@/components/widgets/ClockWidget";
import { StatsWidget } from "@/components/widgets/StatsWidget";
import { LinkAnalyticsWidget } from "@/components/widgets/LinkAnalyticsWidget";
import { NotesWidget } from "@/components/widgets/NotesWidget";
import { QuickAddWidget } from "@/components/widgets/QuickAddWidget";
import { ProgressWidget } from "@/components/widgets/ProgressWidget";
import { WeatherWidget } from "@/components/widgets/WeatherWidget";
import { QuoteWidget } from "@/components/widgets/QuoteWidget";
import { PomodoroWidget } from "@/components/widgets/PomodoroWidget";
import { CalendarWidget } from "@/components/widgets/CalendarWidget";
import { CustomWidget } from "@/components/widgets/CustomWidget";
import { SearchWidget } from "@/components/widgets/SearchWidget";
import { BookmarksWidget } from "@/components/widgets/BookmarksWidget";
import { ImageWidget } from "@/components/widgets/ImageWidget";
import { TodoWidget } from "@/components/widgets/TodoWidget";
import { CountdownWidget } from "@/components/widgets/CountdownWidget";
import { HabitTrackerWidget } from "@/components/widgets/HabitTrackerWidget";
import { TagCloudWidget } from "@/components/widgets/TagCloudWidget";
import { RandomLinkWidget } from "@/components/widgets/RandomLinkWidget";
import { GitHubActivityWidget } from "@/components/widgets/GitHubActivityWidget";
import { BookmarkGrowthWidget } from "@/components/widgets/BookmarkGrowthWidget";
import { RSSFeedWidget } from "@/components/widgets/RSSFeedWidget";
import { ReadingStreakWidget } from "@/components/widgets/ReadingStreakWidget";
import { GitHubTrendingWidget } from "@/components/widgets/GithubTrendingWidget";
import { SteamGamesWidget } from "@/components/widgets/SteamGamesWidget";
import { NintendoDealsWidget } from "@/components/widgets/NintendoDealsWidget";
import { GithubSearchWidget } from "@/components/widgets/GithubSearchWidget";
import { CodePenWidget } from "@/components/widgets/CodePenWidget";
import { SpotifyWidget } from "@/components/widgets/SpotifyWidget";
import { YouTubeWidget } from "@/components/widgets/YouTubeWidget";
import { CryptoWidget } from "@/components/widgets/CryptoWidget";
import { WorldClockWidget } from "@/components/widgets/WorldClockWidget";
import { ColorPaletteWidget } from "@/components/widgets/ColorPaletteWidget";
import { UnsplashWidget } from "@/components/widgets/UnsplashWidget";
import { QRCodeWidget } from "@/components/widgets/QRCodeWidget";
import { WebsiteMonitorWidget } from "@/components/widgets/WebsiteMonitorWidget";
import { EmbedWidget } from "@/components/widgets/EmbedWidget";
import { ShadcnBuilderWidget } from "@/components/widgets/ShadcnBuilderWidget";
import { LazyWidgetRenderer } from "@/components/widgets/LazyWidgets";
import { KanbanLinkListWidget } from "./KanbanLinkListWidget";

interface KanbanCardProps {
  widget: Widget;
  isDragging?: boolean;
}

export function KanbanCard({ widget, isDragging }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: widget.id,
    data: {
      type: "widget",
      widget,
    },
  });

  const openEditWidgetModal = useWidgetStore((state) => state.openEditWidgetModal);
  const removeWidget = useWidgetStore((state) => state.removeWidget);
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const duplicateWidget = useWidgetStore((state) => state.duplicateWidget);
  const isEditMode = useLayoutStore((state) => state.isEditMode);
  const columns = useSortedColumns();
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const currentHeight = widget.kanbanHeight ?? DEFAULT_KANBAN_HEIGHT;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isResizing ? "none" : transition,
    height: `${currentHeight}px`,
  };

  // Handle resize start
  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

      setIsResizing(true);
      resizeRef.current = {
        startY: clientY,
        startHeight: currentHeight,
      };

      const handleMouseMove = (moveEvent: MouseEvent | TouchEvent) => {
        if (!resizeRef.current) return;

        const currentY =
          "touches" in moveEvent
            ? moveEvent.touches[0].clientY
            : moveEvent.clientY;
        const deltaY = currentY - resizeRef.current.startY;
        const newHeight = Math.min(
          MAX_KANBAN_HEIGHT,
          Math.max(MIN_KANBAN_HEIGHT, resizeRef.current.startHeight + deltaY)
        );

        if (cardRef.current) {
          cardRef.current.style.height = `${newHeight}px`;
        }
      };

      const handleMouseUp = (upEvent: MouseEvent | TouchEvent) => {
        if (!resizeRef.current) return;

        const currentY =
          "touches" in upEvent
            ? upEvent.changedTouches[0].clientY
            : upEvent.clientY;
        const deltaY = currentY - resizeRef.current.startY;
        const newHeight = Math.min(
          MAX_KANBAN_HEIGHT,
          Math.max(MIN_KANBAN_HEIGHT, resizeRef.current.startHeight + deltaY)
        );

        updateWidget(widget.id, { kanbanHeight: newHeight });

        setIsResizing(false);
        resizeRef.current = null;

        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleMouseMove);
        document.removeEventListener("touchend", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleMouseMove);
      document.addEventListener("touchend", handleMouseUp);
    },
    [currentHeight, widget.id, updateWidget]
  );

  // Quick resize buttons
  const setHeight = useCallback(
    (height: number) => {
      updateWidget(widget.id, { kanbanHeight: height });
    },
    [widget.id, updateWidget]
  );

  // Move to another column
  const handleMoveToColumn = useCallback(
    (columnId: string) => {
      if (columnId === widget.kanbanColumnId) return;
      updateWidget(widget.id, { kanbanColumnId: columnId, kanbanOrder: 0 });
      const targetColumn = columns.find((c) => c.id === columnId);
      toast.success(`Movido a "${targetColumn?.title}"`);
    },
    [widget.id, widget.kanbanColumnId, updateWidget, columns]
  );

  // Duplicate widget
  const handleDuplicate = useCallback(() => {
    if (duplicateWidget) {
      duplicateWidget(widget.id);
      toast.success("Widget duplicado");
    }
  }, [widget.id, duplicateWidget]);

  // Size presets
  const SIZE_PRESETS = [
    { label: "Pequeño", height: MIN_KANBAN_HEIGHT },
    { label: "Mediano", height: 280 },
    { label: "Grande", height: 400 },
    { label: "Máximo", height: MAX_KANBAN_HEIGHT },
  ];

  const renderWidgetContent = () => {
    // Render each widget type
    switch (widget.type) {
      case "clock":
        return <ClockWidget />;
      case "stats":
        return <StatsWidget />;
      case "link-analytics":
        return <LinkAnalyticsWidget />;
      case "notes":
        return <NotesWidget widget={widget} />;
      case "quick-add":
        return <QuickAddWidget />;
      case "progress":
        return <ProgressWidget widget={widget} />;
      case "weather":
        return <WeatherWidget widget={widget} />;
      case "quote":
        return <QuoteWidget widget={widget} />;
      case "pomodoro":
        return <PomodoroWidget widget={widget} />;
      case "calendar":
        return <CalendarWidget />;
      case "custom":
        return <CustomWidget widget={widget} />;
      case "search":
        return <SearchWidget widget={widget} />;
      case "bookmarks":
        return <BookmarksWidget widget={widget} />;
      case "image":
        return <ImageWidget widget={widget} />;
      case "todo":
        return <TodoWidget widget={widget} />;
      case "countdown":
        return <CountdownWidget widget={widget} />;
      case "habit-tracker":
        return <HabitTrackerWidget widget={widget} />;
      case "tag-cloud":
        return <TagCloudWidget widget={widget} />;
      case "random-link":
        return <RandomLinkWidget widget={widget} />;
      case "github-activity":
        return <GitHubActivityWidget widget={widget} />;
      case "bookmark-growth":
        return <BookmarkGrowthWidget widget={widget} />;
      case "rss-feed":
        return <RSSFeedWidget widget={widget} />;
      case "reading-streak":
        return <ReadingStreakWidget widget={widget} />;
      case "github-trending":
        return <GitHubTrendingWidget widget={widget} />;
      case "steam-games":
        return <SteamGamesWidget widget={widget} />;
      case "nintendo-deals":
        return <NintendoDealsWidget widget={widget} />;
      case "github-search":
        return <GithubSearchWidget widget={widget} />;
      case "codepen":
        return <CodePenWidget widget={widget} />;
      case "spotify":
        return <SpotifyWidget widget={widget} />;
      case "youtube":
        return <YouTubeWidget widget={widget} />;
      case "crypto":
        return <CryptoWidget widget={widget} />;
      case "world-clock":
        return <WorldClockWidget widget={widget} />;
      case "color-palette":
        return <ColorPaletteWidget widget={widget} />;
      case "unsplash":
        return <UnsplashWidget widget={widget} />;
      case "qr-code":
        return <QRCodeWidget widget={widget} />;
      case "website-monitor":
        return <WebsiteMonitorWidget widget={widget} />;
      case "embed":
        return <EmbedWidget widget={widget} />;
      case "shadcn-builder":
        return <ShadcnBuilderWidget widget={widget} />;
      // Link list widgets (favorites, recent, category, tag, categories)
      case "favorites":
      case "recent":
      case "category":
      case "tag":
      case "categories":
        return <KanbanLinkListWidget widget={widget} />;
      default:
        // Use LazyWidgetRenderer for all other widget types
        return <LazyWidgetRenderer widget={widget} />;
    }
  };

  return (
    <Card
      ref={(node) => {
        setNodeRef(node);
        (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      style={style}
      className={cn(
        "w-full transition-all duration-200 glass overflow-hidden flex flex-col group",
        (isDragging || isSortableDragging) &&
          "opacity-50 shadow-xl scale-[1.02] rotate-1",
        isResizing && "ring-2 ring-primary",
        "hover:shadow-md"
      )}
    >
      <CardHeader className="!py-2 !px-3 !pb-1.5 !gap-0 flex-row items-center justify-between space-y-0 border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Drag handle - always visible in kanban mode */}
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing flex-shrink-0 touch-none"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
          </div>
          <CardTitle className="text-sm font-medium truncate">
            {widget.title}
          </CardTitle>
        </div>

        <div className="flex items-center gap-1">
          {/* Quick resize buttons - visible in edit mode or on hover */}
          <div
            className={cn(
              "flex items-center gap-0.5 transition-opacity",
              isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setHeight(MIN_KANBAN_HEIGHT)}
              title="Tamaño pequeño"
            >
              <Minimize2 className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setHeight(MAX_KANBAN_HEIGHT)}
              title="Tamaño grande"
            >
              <Maximize2 className="w-3 h-3" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 flex-shrink-0 transition-opacity",
                  isEditMode
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                )}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => openEditWidgetModal(widget)}>
                <Pencil className="w-3.5 h-3.5 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditWidgetModal(widget)}>
                <Settings className="w-3.5 h-3.5 mr-2" />
                Configurar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Move to Column */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Columns3 className="w-3.5 h-3.5 mr-2" />
                  Mover a columna
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs">Seleccionar columna</DropdownMenuLabel>
                  {columns.map((col) => (
                    <DropdownMenuItem
                      key={col.id}
                      onClick={() => handleMoveToColumn(col.id)}
                      disabled={col.id === widget.kanbanColumnId}
                    >
                      <div
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className={col.id === widget.kanbanColumnId ? "text-muted-foreground" : ""}>
                        {col.title}
                      </span>
                      {col.id === widget.kanbanColumnId && (
                        <span className="ml-auto text-xs text-muted-foreground">(actual)</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Size Presets */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Ruler className="w-3.5 h-3.5 mr-2" />
                  Cambiar tamaño
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuLabel className="text-xs">Tamaño del widget</DropdownMenuLabel>
                  {SIZE_PRESETS.map((preset) => (
                    <DropdownMenuItem
                      key={preset.label}
                      onClick={() => setHeight(preset.height)}
                    >
                      <span className={currentHeight === preset.height ? "font-medium" : ""}>
                        {preset.label}
                      </span>
                      {currentHeight === preset.height && (
                        <span className="ml-auto text-xs text-primary">✓</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Duplicate */}
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="w-3.5 h-3.5 mr-2" />
                Duplicar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                onClick={() => removeWidget(widget.id)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-2 overflow-hidden min-h-0">
        <div className="h-full w-full overflow-auto scrollbar-thin">
          {renderWidgetContent()}
        </div>
      </CardContent>

      {/* Resize handle - visible in edit mode or on hover */}
      <div
        className={cn(
          "flex-shrink-0 h-3 flex items-center justify-center cursor-ns-resize border-t border-border/50 bg-secondary/30 hover:bg-primary/20 transition-colors",
          isEditMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}
        onMouseDown={handleResizeStart}
        onTouchStart={handleResizeStart}
      >
        <GripHorizontal className="w-4 h-4 text-muted-foreground" />
      </div>
    </Card>
  );
}
