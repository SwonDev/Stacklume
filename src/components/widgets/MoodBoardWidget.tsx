"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ImagePlus,
  Type,
  Link as LinkIcon,
  Palette,
  Grid,
  ZoomIn,
  ZoomOut,
  Trash2,
  ArrowUp,
  ArrowDown,
  Edit2,
  Check,
  X,
  Download,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface MoodBoardItem {
  id: string;
  type: "image" | "color" | "note" | "link";
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: string;
  color?: string;
  linkPreview?: {
    title?: string;
    image?: string;
  };
}

interface MoodBoardConfig {
  boardName?: string;
  backgroundColor?: string;
  moodBoardItems?: MoodBoardItem[];
  showGrid?: boolean;
  zoom?: number;
}

interface MoodBoardWidgetProps {
  widget: Widget;
}

export default function MoodBoardWidget({ widget }: MoodBoardWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config || {}) as MoodBoardConfig;

  const [boardName, setBoardName] = useState(config.boardName || "Mood Board");
  const [isEditingName, setIsEditingName] = useState(false);
  const [backgroundColor, setBackgroundColor] = useState(
    config.backgroundColor || "#ffffff"
  );
  const [items, setItems] = useState<MoodBoardItem[]>(config.moodBoardItems || []);
  const [showGrid, setShowGrid] = useState(config.showGrid ?? true);
  const [zoom, setZoom] = useState(config.zoom || 1);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Add item form states
  const [showImageInput, setShowImageInput] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [noteValue, setNoteValue] = useState("");
  const [linkValue, setLinkValue] = useState("");
  const [colorValue, setColorValue] = useState("#ff6b6b");

  const canvasRef = useRef<HTMLDivElement>(null);

  // Save config to store
  const saveConfig = useCallback(
    (updates: Partial<MoodBoardConfig>) => {
      const newConfig = {
        boardName,
        backgroundColor,
        moodBoardItems: items,
        showGrid,
        zoom,
        ...updates,
      };
      updateWidget(widget.id, { config: newConfig });
    },
    [widget.id, updateWidget, boardName, backgroundColor, items, showGrid, zoom]
  );

  // Auto-save when items change
  useEffect(() => {
    const timer = setTimeout(() => {
      saveConfig({ moodBoardItems: items });
    }, 500);
    return () => clearTimeout(timer);
  }, [items, saveConfig]);

  // Add item functions
  const addImage = () => {
    if (!inputValue.trim()) return;
    const newItem: MoodBoardItem = {
      id: Date.now().toString(),
      type: "image",
      x: 50,
      y: 50,
      width: 200,
      height: 200,
      zIndex: items.length,
      content: inputValue,
    };
    setItems([...items, newItem]);
    setInputValue("");
    setShowImageInput(false);
  };

  const addNote = () => {
    if (!noteValue.trim()) return;
    const newItem: MoodBoardItem = {
      id: Date.now().toString(),
      type: "note",
      x: 50,
      y: 50,
      width: 200,
      height: 150,
      zIndex: items.length,
      content: noteValue,
    };
    setItems([...items, newItem]);
    setNoteValue("");
    setShowNoteInput(false);
  };

  const addLink = async () => {
    if (!linkValue.trim()) return;
    const newItem: MoodBoardItem = {
      id: Date.now().toString(),
      type: "link",
      x: 50,
      y: 50,
      width: 250,
      height: 120,
      zIndex: items.length,
      content: linkValue,
      linkPreview: {
        title: linkValue,
      },
    };

    // Try to fetch link preview
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkValue }),
      });
      if (response.ok) {
        const data = await response.json();
        newItem.linkPreview = {
          title: data.title || linkValue,
          image: data.image,
        };
      }
    } catch (error) {
      console.error("Failed to fetch link preview:", error);
    }

    setItems([...items, newItem]);
    setLinkValue("");
    setShowLinkInput(false);
  };

  const addColor = () => {
    const newItem: MoodBoardItem = {
      id: Date.now().toString(),
      type: "color",
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      zIndex: items.length,
      content: colorValue,
      color: colorValue,
    };
    setItems([...items, newItem]);
    setShowColorPicker(false);
  };

  // Item manipulation
  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
    setSelectedItemId(null);
  };

  const bringToFront = (id: string) => {
    const maxZ = Math.max(...items.map((i) => i.zIndex), 0);
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, zIndex: maxZ + 1 } : item
      )
    );
  };

  const sendToBack = (id: string) => {
    const minZ = Math.min(...items.map((i) => i.zIndex), 0);
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, zIndex: minZ - 1 } : item
      )
    );
  };

  // Drag handlers
  const handleMouseDown = (
    e: React.MouseEvent,
    itemId: string,
    isResizeHandle: boolean = false
  ) => {
    e.stopPropagation();
    setSelectedItemId(itemId);
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;

    if (isResizeHandle) {
      setIsResizing(true);
      setResizeStart({
        x: e.clientX,
        y: e.clientY,
        w: item.width,
        h: item.height,
      });
    } else {
      setIsDragging(true);
      setDragOffset({
        x: (e.clientX - canvasRect.left) / zoom - item.x,
        y: (e.clientY - canvasRect.top) / zoom - item.y,
      });
    }
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!selectedItemId) return;

      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (!canvasRect) return;

      if (isDragging) {
        const x = (e.clientX - canvasRect.left) / zoom - dragOffset.x;
        const y = (e.clientY - canvasRect.top) / zoom - dragOffset.y;

        // Snap to grid if enabled
        const snappedX = showGrid ? Math.round(x / 20) * 20 : x;
        const snappedY = showGrid ? Math.round(y / 20) * 20 : y;

        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedItemId
              ? { ...item, x: snappedX, y: snappedY }
              : item
          )
        );
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        const newWidth = Math.max(50, resizeStart.w + deltaX / zoom);
        const newHeight = Math.max(50, resizeStart.h + deltaY / zoom);

        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedItemId
              ? { ...item, width: newWidth, height: newHeight }
              : item
          )
        );
      }
    },
    [
      selectedItemId,
      isDragging,
      isResizing,
      dragOffset,
      resizeStart,
      zoom,
      showGrid,
    ]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  // Zoom controls
  const handleZoomIn = () => {
    const newZoom = Math.min(zoom + 0.1, 2);
    setZoom(newZoom);
    saveConfig({ zoom: newZoom });
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoom - 0.1, 0.5);
    setZoom(newZoom);
    saveConfig({ zoom: newZoom });
  };

  // Export as image (placeholder)
  const handleExport = () => {
    alert("Export functionality coming soon!");
  };

  // Render item based on type
  const renderItem = (item: MoodBoardItem) => {
    const isSelected = selectedItemId === item.id;

    return (
      <motion.div
        key={item.id}
        className={cn(
          "absolute cursor-move rounded-lg border-2 overflow-hidden",
          isSelected
            ? "border-blue-500 shadow-lg"
            : "border-transparent hover:border-gray-300"
        )}
        style={{
          left: item.x,
          top: item.y,
          width: item.width,
          height: item.height,
          zIndex: item.zIndex,
        }}
        onMouseDown={(e) => handleMouseDown(e, item.id)}
      >
        {/* Content based on type */}
        {item.type === "image" && (
          <img
            src={item.content}
            alt="Mood board item"
            className="w-full h-full object-cover"
            draggable={false}
          />
        )}

        {item.type === "color" && (
          <div
            className="w-full h-full"
            style={{ backgroundColor: item.color }}
          />
        )}

        {item.type === "note" && (
          <div className="w-full h-full p-3 bg-yellow-100 dark:bg-yellow-900">
            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
              {item.content}
            </p>
          </div>
        )}

        {item.type === "link" && (
          <div className="w-full h-full bg-white dark:bg-gray-800 overflow-hidden">
            {item.linkPreview?.image && (
              <img
                src={item.linkPreview.image}
                alt={item.linkPreview.title}
                className="w-full h-2/3 object-cover"
                draggable={false}
              />
            )}
            <div className="p-2">
              <p className="text-xs font-medium truncate">
                {item.linkPreview?.title || item.content}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.content}
              </p>
            </div>
          </div>
        )}

        {/* Resize handle */}
        {isSelected && (
          <div
            className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize"
            onMouseDown={(e) => handleMouseDown(e, item.id, true)}
          />
        )}
      </motion.div>
    );
  };

  const selectedItem = items.find((item) => item.id === selectedItemId);

  return (
    <div className="@container h-full flex flex-col bg-background">
      {/* Header with board name */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b">
        {isEditingName ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              value={boardName}
              onChange={(e) => setBoardName(e.target.value)}
              className="h-7 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setIsEditingName(false);
                  saveConfig({ boardName });
                }
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditingName(false);
                saveConfig({ boardName });
              }}
            >
              <Check className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setBoardName(config.boardName || "Mood Board");
                setIsEditingName(false);
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2 hover:bg-accent px-2 py-1 rounded"
          >
            <h3 className="font-semibold text-sm">{boardName}</h3>
            <Edit2 className="w-3 h-3 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b flex-wrap">
        {/* Add items */}
        <Popover open={showImageInput} onOpenChange={setShowImageInput}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Add Image">
              <ImagePlus className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Add Image</h4>
              <Input
                placeholder="Enter image URL"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addImage()}
              />
              <Button onClick={addImage} size="sm" className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={showNoteInput} onOpenChange={setShowNoteInput}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Add Note">
              <Type className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Add Note</h4>
              <Textarea
                placeholder="Enter note text"
                value={noteValue}
                onChange={(e) => setNoteValue(e.target.value)}
                rows={3}
              />
              <Button onClick={addNote} size="sm" className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={showLinkInput} onOpenChange={setShowLinkInput}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Add Link">
              <LinkIcon className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Add Link</h4>
              <Input
                placeholder="Enter URL"
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addLink()}
              />
              <Button onClick={addLink} size="sm" className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={showColorPicker} onOpenChange={setShowColorPicker}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" title="Add Color">
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Add Color Swatch</h4>
              <Input
                type="color"
                value={colorValue}
                onChange={(e) => setColorValue(e.target.value)}
                className="h-20 cursor-pointer"
              />
              <Button onClick={addColor} size="sm" className="w-full">
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Grid toggle */}
        <Button
          variant={showGrid ? "secondary" : "ghost"}
          size="sm"
          onClick={() => {
            setShowGrid(!showGrid);
            saveConfig({ showGrid: !showGrid });
          }}
          title="Toggle Grid"
        >
          <Grid className="w-4 h-4" />
        </Button>

        {/* Zoom controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs text-muted-foreground px-1">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={handleZoomIn} title="Zoom In">
          <ZoomIn className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Background color */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              title="Background Color"
              className="gap-2"
            >
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor }}
              />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Background Color</h4>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => {
                  setBackgroundColor(e.target.value);
                  saveConfig({ backgroundColor: e.target.value });
                }}
                className="h-20 cursor-pointer"
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Export */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleExport}
          title="Export as Image"
          className="ml-auto"
        >
          <Download className="w-4 h-4" />
        </Button>

        {/* Selected item controls */}
        {selectedItem && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => bringToFront(selectedItem.id)}
              title="Bring to Front"
            >
              <ArrowUp className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendToBack(selectedItem.id)}
              title="Send to Back"
            >
              <ArrowDown className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteItem(selectedItem.id)}
              title="Delete"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto relative">
        <div
          ref={canvasRef}
          className="relative min-h-full"
          style={{
            backgroundColor,
            backgroundImage: showGrid
              ? `repeating-linear-gradient(0deg, transparent, transparent ${
                  20 * zoom - 1
                }px, rgba(128, 128, 128, 0.1) ${20 * zoom - 1}px, rgba(128, 128, 128, 0.1) ${
                  20 * zoom
                }px),
                 repeating-linear-gradient(90deg, transparent, transparent ${
                   20 * zoom - 1
                 }px, rgba(128, 128, 128, 0.1) ${20 * zoom - 1}px, rgba(128, 128, 128, 0.1) ${
                  20 * zoom
                }px)`
              : undefined,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedItemId(null);
            }
          }}
        >
          {/* Render items sorted by zIndex */}
          {items
            .sort((a, b) => a.zIndex - b.zIndex)
            .map((item) => renderItem(item))}

          {/* Empty state */}
          {items.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Palette className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Your mood board is empty</p>
                <p className="text-xs">Add images, notes, colors, or links to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
