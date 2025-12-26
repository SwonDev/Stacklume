"use client";

import React, { useCallback, useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import Image from "next/image";
import { useStickerStore } from "@/stores/sticker-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useProjectsStore } from "@/stores/projects-store";
import { PlacedSticker } from "@/types/sticker";
import { StickerContextMenu } from "./StickerContextMenu";
import { cn } from "@/lib/utils";
import { RotateCw } from "lucide-react";
import { useStickerSounds } from "@/hooks/useStickerSounds";

interface DragPreviewPosition {
  x: number;
  y: number;
}


interface RotateState {
  stickerId: string;
  initialRotation: number;
  centerX: number;
  centerY: number;
  startAngleDeg: number;
}

interface DragState {
  stickerId: string;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  // For attached stickers
  isAttached: boolean;
  initialOffsetX?: number;
  initialOffsetY?: number;
}

interface ResizeState {
  stickerId: string;
  corner: string;
  startX: number;
  startY: number;
  initialScale: number;
}

// Utility to find widget element at a given position relative to container
function findWidgetAtPosition(
  containerX: number,
  containerY: number,
  scrollContainer: HTMLElement | null
): { widgetId: string; element: HTMLElement; offsetX: number; offsetY: number } | null {
  if (!scrollContainer) return null;

  // Get all widget elements
  const widgetElements = scrollContainer.querySelectorAll('[data-widget-id]');

  for (const widget of widgetElements) {
    const rect = widget.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();
    const scrollX = scrollContainer.scrollLeft || 0;
    const scrollY = scrollContainer.scrollTop || 0;

    // Calculate widget bounds in container coordinates
    const widgetLeft = rect.left - containerRect.left + scrollX;
    const widgetTop = rect.top - containerRect.top + scrollY;
    const widgetRight = widgetLeft + rect.width;
    const widgetBottom = widgetTop + rect.height;

    if (
      containerX >= widgetLeft &&
      containerX <= widgetRight &&
      containerY >= widgetTop &&
      containerY <= widgetBottom
    ) {
      const widgetId = widget.getAttribute('data-widget-id');
      if (widgetId) {
        return {
          widgetId,
          element: widget as HTMLElement,
          offsetX: containerX - widgetLeft,
          offsetY: containerY - widgetTop,
        };
      }
    }
  }

  return null;
}

// Get widget position in container coordinates
function getWidgetPosition(
  widgetId: string,
  scrollContainer: HTMLElement | null
): { x: number; y: number } | null {
  if (!scrollContainer) return null;

  const widget = scrollContainer.querySelector(`[data-widget-id="${widgetId}"]`);
  if (!widget) return null;

  const rect = widget.getBoundingClientRect();
  const containerRect = scrollContainer.getBoundingClientRect();
  const scrollX = scrollContainer.scrollLeft || 0;
  const scrollY = scrollContainer.scrollTop || 0;

  return {
    x: rect.left - containerRect.left + scrollX,
    y: rect.top - containerRect.top + scrollY,
  };
}

// Individual placed sticker component - receives transform handlers from parent
function PlacedStickerItem({
  sticker,
  isSelected,
  onSelect,
  onContextMenu,
  onDoubleClick,
  playFallAnimation,
  animationDelay,
  onStartMove,
  onStartResize,
  onStartRotate,
  calculatedPosition,
}: {
  sticker: PlacedSticker;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDoubleClick: (e: React.MouseEvent) => void;
  playFallAnimation: boolean;
  animationDelay: number;
  onStartMove: (stickerId: string, e: React.MouseEvent) => void;
  onStartResize: (stickerId: string, corner: string, e: React.MouseEvent) => void;
  onStartRotate: (stickerId: string, e: React.MouseEvent) => void;
  calculatedPosition?: { x: number; y: number };
}) {
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sticker.locked) return;
      if (e.button === 2) return;

      const target = e.target as HTMLElement;
      if (target.closest('[data-rotate-handle]') || target.closest('[data-resize-handle]')) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onStartMove(sticker.id, e);
      onSelect();
    },
    [sticker.locked, sticker.id, onStartMove, onSelect]
  );

  const handleResizeMouseDown = useCallback(
    (e: React.MouseEvent, corner: string) => {
      if (sticker.locked) return;
      e.preventDefault();
      e.stopPropagation();
      onStartResize(sticker.id, corner, e);
    },
    [sticker.locked, sticker.id, onStartResize]
  );

  const handleRotateMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (sticker.locked) return;
      e.preventDefault();
      e.stopPropagation();
      onStartRotate(sticker.id, e);
    },
    [sticker.locked, sticker.id, onStartRotate]
  );

  // Use Framer Motion's style props directly instead of CSS transform
  // to avoid conflicts with the animation system
  const flipScaleX = sticker.flipX ? -1 : 1;
  const flipScaleY = sticker.flipY ? -1 : 1;

  const fallVariants = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: sticker.opacity },
    fall: {
      y: [0, -15, 5, -3, 0],
      scale: [1, 1.05, 0.98, 1.02, 1],
      opacity: sticker.opacity,
      transition: {
        duration: 0.6,
        delay: animationDelay,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const actualWidth = sticker.width * sticker.scale;
  const actualHeight = sticker.height * sticker.scale;

  // Use calculated position if provided (for attached stickers), otherwise use sticker's stored position
  const displayX = calculatedPosition?.x ?? sticker.x;
  const displayY = calculatedPosition?.y ?? sticker.y;

  return (
    <motion.div
      initial="initial"
      animate={playFallAnimation ? "fall" : "animate"}
      variants={fallVariants}
      className={cn(
        "absolute cursor-move select-none",
        isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-transparent rounded-lg",
        sticker.locked && "cursor-not-allowed opacity-80"
      )}
      style={{
        left: displayX,
        top: displayY,
        width: actualWidth,
        height: actualHeight,
        zIndex: sticker.zIndex,
        opacity: sticker.opacity,
        rotate: sticker.rotation,
        scaleX: flipScaleX,
        scaleY: flipScaleY,
        transformOrigin: "center center",
      }}
      onMouseDown={handleMouseDown}
      onContextMenu={onContextMenu}
      onDoubleClick={onDoubleClick}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
    >
      <Image
        src={`/stickers/${sticker.filename}`}
        alt="Sticker"
        fill
        className="object-contain pointer-events-none"
        draggable={false}
      />

      {isSelected && !sticker.locked && (
        <>
          <div
            data-resize-handle="tl"
            className="absolute -top-2 -left-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-sm cursor-nw-resize hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeMouseDown(e, "tl")}
          />
          <div
            data-resize-handle="tr"
            className="absolute -top-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-sm cursor-ne-resize hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeMouseDown(e, "tr")}
          />
          <div
            data-resize-handle="bl"
            className="absolute -bottom-2 -left-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-sm cursor-sw-resize hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeMouseDown(e, "bl")}
          />
          <div
            data-resize-handle="br"
            className="absolute -bottom-2 -right-2 w-4 h-4 bg-primary rounded-full border-2 border-white shadow-sm cursor-se-resize hover:scale-125 transition-transform z-10"
            onMouseDown={(e) => handleResizeMouseDown(e, "br")}
          />

          <div
            data-rotate-handle="true"
            className="absolute -top-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-amber-500 rounded-full border-2 border-white shadow-md cursor-grab hover:scale-125 transition-transform z-10 flex items-center justify-center"
            onMouseDown={handleRotateMouseDown}
          >
            <RotateCw className="w-3 h-3 text-white pointer-events-none" />
          </div>
          <div className="absolute -top-6 left-1/2 w-0.5 h-4 bg-amber-500 -translate-x-1/2 pointer-events-none" />
        </>
      )}
    </motion.div>
  );
}

function useScrollContainer() {
  const [scrollContainer, setScrollContainer] = useState<HTMLElement | null>(() => {
    // Initialize synchronously if we're in the browser
    if (typeof document !== 'undefined') {
      return document.querySelector('[data-sticker-container]') as HTMLElement | null;
    }
    return null;
  });

  useEffect(() => {
    // Re-check after mount in case the container wasn't available initially
    // Use requestAnimationFrame to defer the update and avoid setState in render
    const frameId = requestAnimationFrame(() => {
      const container = document.querySelector('[data-sticker-container]') as HTMLElement;
      if (container) {
        setScrollContainer((prev) => (prev !== container ? container : prev));
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return scrollContainer;
}

export function StickerLayer() {
  const [isMounted, setIsMounted] = useState(false);
  const { playGrab, playDrop } = useStickerSounds();
  const {
    placedStickers,
    isDragging,
    draggedSticker,
    placeSticker,
    selectSticker,
    selectedStickerId,
    endDrag,
    shouldPlayFallAnimation,
    resetFallAnimation,
    isDropOutsideBook,
    updateSticker,
    attachToWidget,
    detachFromWidget,
    getStickersForContext,
  } = useStickerStore();

  // Get current view mode and project
  const { viewMode } = useSettingsStore();
  const { activeProjectId } = useProjectsStore();

  // Current view mode for stickers - supports bento, kanban, and list views
  const currentViewMode: 'bento' | 'kanban' | 'list' = viewMode === 'kanban' ? 'kanban' : viewMode === 'list' ? 'list' : 'bento';
  const currentProjectId = activeProjectId || null;

  // Filter stickers by current context (view mode and project)
  // Note: placedStickers is intentionally included because getStickersForContext
  // depends on the current state of placedStickers to filter correctly
  const filteredStickers = useMemo(() => {
    return getStickersForContext(currentViewMode, currentProjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getStickersForContext, currentViewMode, currentProjectId, placedStickers]);

  // State to force re-render when widgets move
  const [widgetPositionsVersion, setWidgetPositionsVersion] = useState(0);

  const [dragPosition, setDragPosition] = useState<DragPreviewPosition | null>(null);
  const [contextMenuSticker, setContextMenuSticker] = useState<PlacedSticker | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const layerRef = useRef<HTMLDivElement>(null);
  const scrollContainer = useScrollContainer();
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Transform states - managed at parent level like Cryalis
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [rotateState, setRotateState] = useState<RotateState | null>(null);

  // Keep scroll container ref updated
  useEffect(() => {
    scrollContainerRef.current = scrollContainer;
  }, [scrollContainer]);

  // Hydration guard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Observe widget position changes (when react-grid-layout moves them)
  useEffect(() => {
    if (!scrollContainer) return;

    const observer = new MutationObserver(() => {
      // Use requestAnimationFrame to batch updates and avoid setState during render
      requestAnimationFrame(() => {
        setWidgetPositionsVersion((v) => v + 1);
      });
    });

    observer.observe(scrollContainer, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, [scrollContainer]);

  // Calculate sticker position based on attached widget
  const getCalculatedPosition = useCallback(
    (sticker: PlacedSticker): { x: number; y: number } | undefined => {
      if (!sticker.attachedToWidgetId || sticker.widgetOffsetX === undefined || sticker.widgetOffsetY === undefined) {
        return undefined;
      }

      const widgetPos = getWidgetPosition(sticker.attachedToWidgetId, scrollContainerRef.current);
      if (!widgetPos) {
        // Widget not found, return stored position
        return undefined;
      }

      return {
        x: widgetPos.x + sticker.widgetOffsetX,
        y: widgetPos.y + sticker.widgetOffsetY,
      };
    },
    // widgetPositionsVersion is used to trigger recalculation when widgets move
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetPositionsVersion]
  );

  // Handle double-click to attach/detach sticker from widget
  const handleStickerDoubleClick = useCallback(
    (sticker: PlacedSticker, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (sticker.locked) return;

      if (sticker.attachedToWidgetId) {
        // Already attached - detach it
        // Update sticker position to current calculated position so it stays in place
        const currentPos = getCalculatedPosition(sticker);
        if (currentPos) {
          updateSticker(sticker.id, { x: currentPos.x, y: currentPos.y });
        }
        detachFromWidget(sticker.id);
      } else {
        // Not attached - try to attach to widget under the sticker
        const stickerCenterX = sticker.x + (sticker.width * sticker.scale) / 2;
        const stickerCenterY = sticker.y + (sticker.height * sticker.scale) / 2;

        const widgetInfo = findWidgetAtPosition(stickerCenterX, stickerCenterY, scrollContainerRef.current);
        if (widgetInfo) {
          // Get widget position to calculate proper offset
          const widgetPos = getWidgetPosition(widgetInfo.widgetId, scrollContainerRef.current);
          if (widgetPos) {
            const relativeOffsetX = sticker.x - widgetPos.x;
            const relativeOffsetY = sticker.y - widgetPos.y;
            attachToWidget(sticker.id, widgetInfo.widgetId, relativeOffsetX, relativeOffsetY);
          }
        }
      }
    },
    [attachToWidget, detachFromWidget, updateSticker, getCalculatedPosition]
  );

  // Handle all transforms at parent level - like Cryalis Creation
  const handleStartMove = useCallback((stickerId: string, e: React.MouseEvent) => {
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    // Play grab sound when starting to move a placed sticker
    playGrab();

    const scrollX = container.scrollLeft || 0;
    const scrollY = container.scrollTop || 0;
    const rect = container.getBoundingClientRect();

    const mouseX = e.clientX - rect.left + scrollX;
    const mouseY = e.clientY - rect.top + scrollY;

    const isAttached = !!sticker.attachedToWidgetId;

    setDragState({
      stickerId,
      startX: mouseX,
      startY: mouseY,
      initialX: sticker.x,
      initialY: sticker.y,
      isAttached,
      initialOffsetX: sticker.widgetOffsetX,
      initialOffsetY: sticker.widgetOffsetY,
    });
  }, [placedStickers, playGrab]);

  const handleStartResize = useCallback((stickerId: string, corner: string, e: React.MouseEvent) => {
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollX = container.scrollLeft || 0;
    const scrollY = container.scrollTop || 0;
    const rect = container.getBoundingClientRect();

    const mouseX = e.clientX - rect.left + scrollX;
    const mouseY = e.clientY - rect.top + scrollY;

    setResizeState({
      stickerId,
      corner,
      startX: mouseX,
      startY: mouseY,
      initialScale: sticker.scale,
    });
  }, [placedStickers]);

  const handleStartRotate = useCallback((stickerId: string, e: React.MouseEvent) => {
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (!sticker) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollX = container.scrollLeft || 0;
    const scrollY = container.scrollTop || 0;
    const rect = container.getBoundingClientRect();

    // Calculate sticker center
    const actualWidth = sticker.width * sticker.scale;
    const actualHeight = sticker.height * sticker.scale;
    const centerX = sticker.x + actualWidth / 2;
    const centerY = sticker.y + actualHeight / 2;

    // Calculate mouse position in container coordinates
    const mouseX = e.clientX - rect.left + scrollX;
    const mouseY = e.clientY - rect.top + scrollY;

    // Calculate initial angle
    const dx = mouseX - centerX;
    const dy = mouseY - centerY;
    const startAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

    setRotateState({
      stickerId,
      initialRotation: sticker.rotation,
      centerX,
      centerY,
      startAngleDeg,
    });
  }, [placedStickers]);

  // Global mouse move/up handlers for transforms
  useEffect(() => {
    if (!dragState && !resizeState && !rotateState) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollX = container.scrollLeft || 0;
      const scrollY = container.scrollTop || 0;
      const rect = container.getBoundingClientRect();

      const mouseX = e.clientX - rect.left + scrollX;
      const mouseY = e.clientY - rect.top + scrollY;

      if (dragState) {
        const deltaX = mouseX - dragState.startX;
        const deltaY = mouseY - dragState.startY;

        if (dragState.isAttached && dragState.initialOffsetX !== undefined && dragState.initialOffsetY !== undefined) {
          // For attached stickers, update the widget offset
          updateSticker(dragState.stickerId, {
            widgetOffsetX: dragState.initialOffsetX + deltaX,
            widgetOffsetY: dragState.initialOffsetY + deltaY,
          });
        } else {
          // For non-attached stickers, update absolute position
          updateSticker(dragState.stickerId, {
            x: dragState.initialX + deltaX,
            y: dragState.initialY + deltaY,
          });
        }
      }

      if (resizeState) {
        const deltaX = mouseX - resizeState.startX;
        const deltaY = mouseY - resizeState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const direction = resizeState.corner.includes("br") || resizeState.corner.includes("tr") ? 1 : -1;
        const sign = (deltaX > 0 || deltaY > 0) ? 1 : -1;
        const scaleDelta = (distance / 100) * direction * sign;
        const newScale = Math.max(0.2, Math.min(3, resizeState.initialScale + scaleDelta));
        updateSticker(resizeState.stickerId, { scale: newScale });
      }

      if (rotateState) {
        const dx = mouseX - rotateState.centerX;
        const dy = mouseY - rotateState.centerY;
        const currentAngleDeg = Math.atan2(dy, dx) * (180 / Math.PI);

        let delta = currentAngleDeg - rotateState.startAngleDeg;

        // Handle 0/360 degree crossing
        if (delta > 180) {
          delta -= 360;
        } else if (delta < -180) {
          delta += 360;
        }

        let rotation = rotateState.initialRotation + delta;
        rotation = ((rotation % 360) + 360) % 360;

        // Snap to 15 degrees when holding Shift
        if (e.shiftKey) {
          rotation = Math.round(rotation / 15) * 15;
        }

        updateSticker(rotateState.stickerId, { rotation });
      }
    };

    const handleMouseUp = () => {
      // Play drop sound when releasing a placed sticker (only for move, not resize/rotate)
      if (dragState) {
        playDrop();
      }
      setDragState(null);
      setResizeState(null);
      setRotateState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragState, resizeState, rotateState, updateSticker, playDrop]);

  // Global click handler to deselect stickers
  useEffect(() => {
    if (!isMounted) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isOnSticker = target.closest('[data-sticker-item]');
      const isOnContextMenu = target.closest('[data-sticker-context-menu]');
      const isOnStickerBook = target.closest('[data-sticker-book]');

      if (!isOnSticker && !isOnContextMenu && !isOnStickerBook) {
        selectSticker(null);
        setContextMenuSticker(null);
      }
    };

    document.addEventListener("click", handleGlobalClick, true);
    return () => document.removeEventListener("click", handleGlobalClick, true);
  }, [isMounted, selectSticker]);

  // Reset fall animation after it plays
  useEffect(() => {
    if (shouldPlayFallAnimation) {
      const maxDelay = filteredStickers.length * 0.05;
      const animationDuration = 0.6;
      const totalTime = (maxDelay + animationDuration) * 1000;

      const timer = setTimeout(() => {
        resetFallAnimation();
      }, totalTime);

      return () => clearTimeout(timer);
    }
  }, [shouldPlayFallAnimation, filteredStickers.length, resetFallAnimation]);

  // Handle drag preview movement for new stickers from book
  useEffect(() => {
    if (!isDragging || !draggedSticker) {
      setDragPosition(null);
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      setDragPosition({
        x: e.clientX - 36,
        y: e.clientY - 36,
      });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (draggedSticker) {
        if (isDropOutsideBook(e.clientX, e.clientY)) {
          const scrollX = scrollContainerRef.current?.scrollLeft || 0;
          const scrollY = scrollContainerRef.current?.scrollTop || 0;
          const containerRect = scrollContainerRef.current?.getBoundingClientRect();
          const offsetX = containerRect?.left || 0;
          const offsetY = containerRect?.top || 0;

          placeSticker(
            draggedSticker.sticker.id,
            draggedSticker.sticker.filename,
            e.clientX - 36 - offsetX + scrollX,
            e.clientY - 36 - offsetY + scrollY,
            currentViewMode,
            currentProjectId
          );

          // Play drop sound when placing a sticker from the book
          playDrop();
        }
      }
      endDrag();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        endDrag();
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDragging, draggedSticker, placeSticker, endDrag, isDropOutsideBook, currentViewMode, currentProjectId, playDrop]);

  // Handle touch events for mobile
  useEffect(() => {
    if (!isDragging || !draggedSticker) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      setDragPosition({
        x: touch.clientX - 36,
        y: touch.clientY - 36,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      if (draggedSticker) {
        if (isDropOutsideBook(touch.clientX, touch.clientY)) {
          const scrollX = scrollContainerRef.current?.scrollLeft || 0;
          const scrollY = scrollContainerRef.current?.scrollTop || 0;
          const containerRect = scrollContainerRef.current?.getBoundingClientRect();
          const offsetX = containerRect?.left || 0;
          const offsetY = containerRect?.top || 0;

          placeSticker(
            draggedSticker.sticker.id,
            draggedSticker.sticker.filename,
            touch.clientX - 36 - offsetX + scrollX,
            touch.clientY - 36 - offsetY + scrollY,
            currentViewMode,
            currentProjectId
          );

          // Play drop sound when placing a sticker from the book (touch)
          playDrop();
        }
      }
      endDrag();
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isDragging, draggedSticker, placeSticker, endDrag, isDropOutsideBook, currentViewMode, currentProjectId, playDrop]);

  const handleStickerContextMenu = useCallback(
    (sticker: PlacedSticker, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuSticker(sticker);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
      selectSticker(sticker.id);
    },
    [selectSticker]
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuSticker(null);
  }, []);

  // Render stickers in all view modes (bento, kanban, list)
  const shouldRenderContent = isMounted && (filteredStickers.length > 0 || isDragging);

  if (!shouldRenderContent) {
    return <></>;
  }

  return (
    <>
      {scrollContainer && createPortal(
        <div
          ref={layerRef}
          className="absolute inset-0 z-[900] pointer-events-none"
          style={{ minHeight: "100%", minWidth: "100%" }}
        >
          {filteredStickers.map((sticker, index) => (
            <div key={sticker.id} className="pointer-events-auto" data-sticker-item>
              <PlacedStickerItem
                sticker={sticker}
                isSelected={selectedStickerId === sticker.id}
                onSelect={() => selectSticker(sticker.id)}
                onContextMenu={(e) => handleStickerContextMenu(sticker, e)}
                onDoubleClick={(e) => handleStickerDoubleClick(sticker, e)}
                playFallAnimation={shouldPlayFallAnimation}
                animationDelay={index * 0.05}
                onStartMove={handleStartMove}
                onStartResize={handleStartResize}
                onStartRotate={handleStartRotate}
                calculatedPosition={getCalculatedPosition(sticker)}
              />
            </div>
          ))}
        </div>,
        scrollContainer
      )}

      {isDragging && draggedSticker && dragPosition && (
        <div
          className="fixed pointer-events-none z-[10001]"
          style={{
            left: dragPosition.x,
            top: dragPosition.y,
            width: 72,
            height: 72,
          }}
        >
          <motion.div
            initial={{ scale: 1.2, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full h-full relative"
          >
            <Image
              src={draggedSticker.sticker.path}
              alt="Dragging sticker"
              fill
              className="object-contain drop-shadow-lg"
              draggable={false}
            />
          </motion.div>
        </div>
      )}

      {contextMenuSticker && (
        <StickerContextMenu
          sticker={contextMenuSticker}
          position={contextMenuPosition}
          onClose={handleCloseContextMenu}
        />
      )}
    </>
  );
}
