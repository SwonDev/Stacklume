"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Check, X, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export interface Position {
  x: number;
  y: number;
}

export interface GridBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  /** Number of columns in the grid */
  cols: number;
}

export interface KeyboardDragHelperProps {
  /** Whether keyboard drag mode is currently active */
  isActive: boolean;
  /** Current position of the item */
  currentPosition: Position;
  /** Title of the item being dragged */
  itemTitle: string;
  /** Index of the item in the list (1-based for display) */
  itemIndex: number;
  /** Total number of items */
  totalItems: number;
  /** Grid bounds for movement constraints */
  gridBounds: GridBounds;
  /** Called when position changes via keyboard */
  onPositionChange: (newPosition: Position) => void;
  /** Called when drag is confirmed */
  onConfirm: () => void;
  /** Called when drag is cancelled */
  onCancel: () => void;
  /** Optional className for the helper container */
  className?: string;
}

/**
 * KeyboardDragHelper - Provides keyboard-accessible drag and drop functionality
 *
 * This component renders an overlay with instructions and visual feedback
 * when a user initiates keyboard-based drag operations.
 *
 * Usage:
 * - Press Space/Enter on a focused draggable item to activate
 * - Use arrow keys to move the item
 * - Press Space/Enter to confirm the new position
 * - Press Escape to cancel and return to original position
 *
 * @example
 * ```tsx
 * const [isDragging, setIsDragging] = useState(false);
 * const [position, setPosition] = useState({ x: 0, y: 0 });
 *
 * return (
 *   <KeyboardDragHelper
 *     isActive={isDragging}
 *     currentPosition={position}
 *     itemTitle="My Widget"
 *     itemIndex={1}
 *     totalItems={10}
 *     gridBounds={{ minX: 0, maxX: 11, minY: 0, maxY: 100, cols: 12 }}
 *     onPositionChange={setPosition}
 *     onConfirm={() => {
 *       // Save position
 *       setIsDragging(false);
 *     }}
 *     onCancel={() => setIsDragging(false)}
 *   />
 * );
 * ```
 */
export function KeyboardDragHelper({
  isActive,
  currentPosition,
  itemTitle,
  itemIndex,
  totalItems,
  gridBounds,
  onPositionChange,
  onConfirm,
  onCancel,
  className,
}: KeyboardDragHelperProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Track if we've moved from the original position
  const [hasMoved, setHasMoved] = useState(false);
  const originalPositionRef = useRef<Position>(currentPosition);

  // Reset state when becoming active
  useEffect(() => {
    if (isActive) {
      const frame = requestAnimationFrame(() => {
        setHasMoved(false);
        originalPositionRef.current = currentPosition;
        // Focus the container for keyboard events
        containerRef.current?.focus();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isActive, currentPosition]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isActive) return;

      const { x, y } = currentPosition;
      const { minX, maxX, minY, maxY } = gridBounds;

      let newX = x;
      let newY = y;
      let handled = false;

      switch (event.key) {
        case "ArrowUp":
          newY = Math.max(minY, y - 1);
          handled = true;
          break;
        case "ArrowDown":
          newY = Math.min(maxY, y + 1);
          handled = true;
          break;
        case "ArrowLeft":
          newX = Math.max(minX, x - 1);
          handled = true;
          break;
        case "ArrowRight":
          newX = Math.min(maxX, x + 1);
          handled = true;
          break;
        case "Home":
          newX = minX;
          handled = true;
          break;
        case "End":
          newX = maxX;
          handled = true;
          break;
        case "PageUp":
          newY = Math.max(minY, y - 5);
          handled = true;
          break;
        case "PageDown":
          newY = Math.min(maxY, y + 5);
          handled = true;
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          onConfirm();
          return;
        case "Escape":
          event.preventDefault();
          onCancel();
          return;
        default:
          return;
      }

      if (handled) {
        event.preventDefault();
        if (newX !== x || newY !== y) {
          setHasMoved(true);
          onPositionChange({ x: newX, y: newY });
        }
      }
    },
    [isActive, currentPosition, gridBounds, onPositionChange, onConfirm, onCancel]
  );

  // Animation variants
  const containerVariants = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, y: 10, scale: 0.95 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 10, scale: 0.95 },
      };

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          ref={containerRef}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          className={cn(
            "fixed bottom-20 left-1/2 -translate-x-1/2 z-[100]",
            "bg-background/95 backdrop-blur-md border rounded-lg shadow-xl",
            "p-4 min-w-[300px] max-w-[400px]",
            "focus:outline-none focus:ring-2 focus:ring-primary",
            className
          )}
          {...containerVariants}
          transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 300 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Moviendo ${itemTitle}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 rounded-md bg-primary/10">
              <Move className="w-4 h-4 text-primary" aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Moviendo widget</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                {itemTitle}
              </p>
            </div>
          </div>

          {/* Position info */}
          <div
            className="bg-secondary/50 rounded-md p-3 mb-3"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Posicion:</span>
              <span className="font-mono font-medium">
                Columna {currentPosition.x + 1}, Fila {currentPosition.y + 1}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-muted-foreground">Elemento:</span>
              <span className="font-medium">
                {itemIndex} de {totalItems}
              </span>
            </div>
            {hasMoved && (
              <div className="text-xs text-primary mt-2 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
                Posicion modificada
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-2">
              Controles de teclado:
            </p>

            {/* Arrow keys */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  <ArrowUp className="w-3 h-3 inline" aria-hidden="true" />
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  <ArrowDown className="w-3 h-3 inline" aria-hidden="true" />
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  <ArrowLeft className="w-3 h-3 inline" aria-hidden="true" />
                </kbd>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  <ArrowRight className="w-3 h-3 inline" aria-hidden="true" />
                </kbd>
              </div>
              <span className="text-muted-foreground">Mover</span>
            </div>

            {/* Confirm */}
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  Enter
                </kbd>
                <span className="text-muted-foreground/60">o</span>
                <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                  Espacio
                </kbd>
              </div>
              <span className="text-muted-foreground flex items-center gap-1">
                <Check className="w-3 h-3 text-green-500" aria-hidden="true" />
                Confirmar
              </span>
            </div>

            {/* Cancel */}
            <div className="flex items-center gap-3 text-xs">
              <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono border">
                Esc
              </kbd>
              <span className="text-muted-foreground flex items-center gap-1">
                <X className="w-3 h-3 text-destructive" aria-hidden="true" />
                Cancelar
              </span>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-border">
            <button
              onClick={onCancel}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm font-medium",
                "bg-secondary hover:bg-secondary/80 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className={cn(
                "flex-1 px-3 py-2 rounded-md text-sm font-medium",
                "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              )}
            >
              Confirmar
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to manage keyboard drag state
 * Provides a simple API for enabling keyboard drag functionality on any element
 */
export function useKeyboardDrag(
  initialPosition: Position,
  gridBounds: GridBounds,
  onPositionConfirmed: (position: Position) => void
) {
  const [isActive, setIsActive] = useState(false);
  const [currentPosition, setCurrentPosition] = useState(initialPosition);
  const originalPositionRef = useRef(initialPosition);

  const activate = useCallback(() => {
    originalPositionRef.current = currentPosition;
    setIsActive(true);
  }, [currentPosition]);

  const deactivate = useCallback(() => {
    setIsActive(false);
  }, []);

  const confirm = useCallback(() => {
    onPositionConfirmed(currentPosition);
    setIsActive(false);
  }, [currentPosition, onPositionConfirmed]);

  const cancel = useCallback(() => {
    setCurrentPosition(originalPositionRef.current);
    setIsActive(false);
  }, []);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isActive) {
        // Activate on Space/Enter when not active
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          activate();
        }
      }
    },
    [isActive, activate]
  );

  return {
    isActive,
    currentPosition,
    setCurrentPosition,
    activate,
    deactivate,
    confirm,
    cancel,
    handleKeyDown,
  };
}
