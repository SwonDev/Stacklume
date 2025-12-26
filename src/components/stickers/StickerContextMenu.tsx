"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trash2,
  Copy,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  RefreshCcw,
  Minus,
  Plus,
} from "lucide-react";
import { useStickerStore } from "@/stores/sticker-store";
import { PlacedSticker, STICKER_SIZE_PRESETS } from "@/types/sticker";
import { cn } from "@/lib/utils";

interface StickerContextMenuProps {
  sticker: PlacedSticker;
  position: { x: number; y: number };
  onClose: () => void;
}

interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  shortcut?: string;
}

function MenuItem({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
  shortcut,
}: MenuItemProps) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
        "hover:bg-accent focus:bg-accent focus:outline-none",
        variant === "danger" && "text-destructive hover:bg-destructive/10",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}

function MenuSeparator() {
  return <div className="h-px bg-border my-1" />;
}

function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {children}
    </div>
  );
}

export function StickerContextMenu({
  sticker: initialSticker,
  position,
  onClose,
}: StickerContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPosition, setMenuPosition] = useState(position);

  const {
    placedStickers,
    updateSticker,
    removeSticker,
    duplicateSticker,
    bringToFront,
    sendToBack,
  } = useStickerStore();

  // Get fresh sticker data from store (reactive to changes)
  const sticker = placedStickers.find(s => s.id === initialSticker.id) || initialSticker;

  // Adjust menu position to stay within viewport
  // Using a layout effect pattern to avoid setState during render
  useEffect(() => {
    const adjustPosition = () => {
      if (menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = position.x;
        let newY = position.y;

        if (position.x + rect.width > viewportWidth) {
          newX = viewportWidth - rect.width - 10;
        }

        if (position.y + rect.height > viewportHeight) {
          newY = viewportHeight - rect.height - 10;
        }

        const adjustedX = Math.max(10, newX);
        const adjustedY = Math.max(10, newY);

        // Only update if position actually changed to avoid infinite loops
        if (adjustedX !== position.x || adjustedY !== position.y) {
          setMenuPosition({ x: adjustedX, y: adjustedY });
        }
      }
    };

    // Use requestAnimationFrame to defer the measurement to after paint
    const frameId = requestAnimationFrame(adjustPosition);
    return () => cancelAnimationFrame(frameId);
  }, [position]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Rotation handlers - use fresh sticker data
  const rotateLeft = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      updateSticker(sticker.id, { rotation: current.rotation - 15 });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const rotateRight = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      updateSticker(sticker.id, { rotation: current.rotation + 15 });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const resetRotation = useCallback(() => {
    updateSticker(sticker.id, { rotation: 0 });
  }, [sticker.id, updateSticker]);

  // Size handlers - use fresh sticker data
  const increaseSize = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      const newScale = Math.min(current.scale + 0.25, 3);
      updateSticker(sticker.id, { scale: newScale });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const decreaseSize = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      const newScale = Math.max(current.scale - 0.25, 0.25);
      updateSticker(sticker.id, { scale: newScale });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const setSize = useCallback(
    (preset: keyof typeof STICKER_SIZE_PRESETS) => {
      const { width, height } = STICKER_SIZE_PRESETS[preset];
      updateSticker(sticker.id, { width, height, scale: 1 });
    },
    [sticker.id, updateSticker]
  );

  // Flip handlers - use fresh sticker data
  const toggleFlipX = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      updateSticker(sticker.id, { flipX: !current.flipX });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const toggleFlipY = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      updateSticker(sticker.id, { flipY: !current.flipY });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  // Opacity handlers - use fresh sticker data
  const increaseOpacity = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      const newOpacity = Math.min(current.opacity + 0.1, 1);
      updateSticker(sticker.id, { opacity: newOpacity });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  const decreaseOpacity = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      const newOpacity = Math.max(current.opacity - 0.1, 0.1);
      updateSticker(sticker.id, { opacity: newOpacity });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  // Lock toggle - use fresh sticker data
  const toggleLock = useCallback(() => {
    const current = placedStickers.find(s => s.id === sticker.id);
    if (current) {
      updateSticker(sticker.id, { locked: !current.locked });
    }
  }, [sticker.id, placedStickers, updateSticker]);

  // Duplicate
  const handleDuplicate = useCallback(() => {
    duplicateSticker(sticker.id);
    onClose();
  }, [sticker.id, duplicateSticker, onClose]);

  // Delete
  const handleDelete = useCallback(() => {
    removeSticker(sticker.id);
    onClose();
  }, [sticker.id, removeSticker, onClose]);

  // Layer handlers
  const handleBringToFront = useCallback(() => {
    bringToFront(sticker.id);
  }, [sticker.id, bringToFront]);

  const handleSendToBack = useCallback(() => {
    sendToBack(sticker.id);
  }, [sticker.id, sendToBack]);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.1 }}
        className={cn(
          "fixed z-[10000] min-w-[220px] max-h-[80vh] overflow-y-auto",
          "bg-popover border border-border rounded-lg shadow-lg",
          "py-1 scrollbar-thin"
        )}
        style={{
          left: menuPosition.x,
          top: menuPosition.y,
        }}
        data-sticker-context-menu
      >
        {/* Size Section */}
        <MenuLabel>Size</MenuLabel>
        <div className="px-3 py-1 flex gap-1">
          <button
            className="flex-1 p-2 rounded hover:bg-accent text-center text-xs"
            onClick={() => setSize("tiny")}
          >
            XS
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent text-center text-xs"
            onClick={() => setSize("small")}
          >
            S
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent text-center text-xs"
            onClick={() => setSize("medium")}
          >
            M
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent text-center text-xs"
            onClick={() => setSize("large")}
          >
            L
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent text-center text-xs"
            onClick={() => setSize("huge")}
          >
            XL
          </button>
        </div>
        <div className="px-3 py-1 flex gap-1">
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={decreaseSize}
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 p-2 text-center text-xs text-muted-foreground">
            {Math.round(sticker.scale * 100)}%
          </div>
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={increaseSize}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <MenuSeparator />

        {/* Rotation Section */}
        <MenuLabel>Rotation</MenuLabel>
        <div className="px-3 py-1 flex gap-1">
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={rotateLeft}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center text-xs"
            onClick={resetRotation}
          >
            {sticker.rotation}°
          </button>
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={rotateRight}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>

        <MenuSeparator />

        {/* Flip Section */}
        <MenuLabel>Flip</MenuLabel>
        <div className="px-3 py-1 flex gap-1">
          <button
            className={cn(
              "flex-1 p-2 rounded flex items-center justify-center gap-1 text-xs",
              sticker.flipX ? "bg-accent" : "hover:bg-accent"
            )}
            onClick={toggleFlipX}
          >
            <FlipHorizontal className="w-4 h-4" />
            H
          </button>
          <button
            className={cn(
              "flex-1 p-2 rounded flex items-center justify-center gap-1 text-xs",
              sticker.flipY ? "bg-accent" : "hover:bg-accent"
            )}
            onClick={toggleFlipY}
          >
            <FlipVertical className="w-4 h-4" />
            V
          </button>
        </div>

        <MenuSeparator />

        {/* Opacity Section */}
        <MenuLabel>Opacity</MenuLabel>
        <div className="px-3 py-1 flex gap-1">
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={decreaseOpacity}
          >
            <Minus className="w-4 h-4" />
          </button>
          <div className="flex-1 p-2 text-center text-xs text-muted-foreground">
            {Math.round(sticker.opacity * 100)}%
          </div>
          <button
            className="flex-1 p-2 rounded hover:bg-accent flex items-center justify-center"
            onClick={increaseOpacity}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <MenuSeparator />

        {/* Layer controls */}
        <MenuItem
          icon={<ArrowUp className="w-4 h-4" />}
          label="Bring to Front"
          onClick={handleBringToFront}
        />
        <MenuItem
          icon={<ArrowDown className="w-4 h-4" />}
          label="Send to Back"
          onClick={handleSendToBack}
        />

        <MenuSeparator />

        {/* Actions */}
        <MenuItem
          icon={<Copy className="w-4 h-4" />}
          label="Duplicate"
          onClick={handleDuplicate}
          shortcut="D"
        />
        <MenuItem
          icon={sticker.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          label={sticker.locked ? "Unlock" : "Lock"}
          onClick={toggleLock}
          shortcut="L"
        />
        <MenuItem
          icon={<RefreshCcw className="w-4 h-4" />}
          label="Reset All"
          onClick={() => {
            updateSticker(sticker.id, {
              rotation: 0,
              scale: 1,
              flipX: false,
              flipY: false,
              opacity: 1,
            });
          }}
        />

        <MenuSeparator />

        <MenuItem
          icon={<Trash2 className="w-4 h-4" />}
          label="Delete"
          onClick={handleDelete}
          variant="danger"
          shortcut="Del"
        />
      </motion.div>
    </AnimatePresence>
  );
}
