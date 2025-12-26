"use client";

import { useCallback, useRef, useMemo } from "react";

/**
 * Announcements for screen readers during drag operations
 * Uses aria-live regions to announce drag state changes
 */
export interface DragAnnouncement {
  /** Announced when drag operation starts */
  onDragStart: (itemTitle: string, position: number, total: number) => void;
  /** Announced when item is over a valid drop zone */
  onDragOver: (itemTitle: string, targetPosition: number, total: number) => void;
  /** Announced when item is dropped successfully */
  onDrop: (itemTitle: string, newPosition: number, total: number) => void;
  /** Announced when drag operation is cancelled */
  onDragCancel: (itemTitle: string) => void;
  /** Announced for invalid drop zones */
  onInvalidDrop: (reason: string) => void;
}

export interface UseDragAnnouncementsReturn {
  /** Announcement functions for drag events */
  announcements: DragAnnouncement;
  /** ID to use for aria-describedby on draggable items */
  dragInstructionsId: string;
  /** Component to render live region and instructions (must be rendered in DOM) */
  LiveRegion: React.FC;
}

// Define LiveRegion component outside the hook to avoid hooks-in-callbacks error
interface LiveRegionProps {
  instructionsId: string;
  liveRegionId: string;
  liveRegionRef: React.RefObject<HTMLDivElement | null>;
}

function LiveRegionComponent({ instructionsId, liveRegionId, liveRegionRef }: LiveRegionProps) {
  return (
    <>
      {/* Hidden instructions for screen readers */}
      <div
        id={instructionsId}
        className="sr-only"
      >
        Para reordenar, presiona Espacio o Enter para iniciar el arrastre.
        Usa las teclas de flecha para mover el elemento.
        Presiona Espacio o Enter para soltar, o Escape para cancelar.
      </div>

      {/* Live region for announcements */}
      <div
        ref={liveRegionRef}
        id={liveRegionId}
        role="status"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}

/**
 * Hook for providing accessible announcements during drag and drop operations.
 * Creates an aria-live region that announces drag state changes for screen readers.
 *
 * @example
 * ```tsx
 * const { announcements, dragInstructionsId, LiveRegion } = useDragAnnouncements();
 *
 * return (
 *   <>
 *     <LiveRegion />
 *     <div
 *       draggable
 *       aria-describedby={dragInstructionsId}
 *       onDragStart={() => announcements.onDragStart("Widget", 1, 5)}
 *     >
 *       Widget
 *     </div>
 *   </>
 * );
 * ```
 */
export function useDragAnnouncements(): UseDragAnnouncementsReturn {
  const liveRegionRef = useRef<HTMLDivElement | null>(null);
  const instructionsId = "drag-instructions";
  const liveRegionId = "drag-live-region";

  // Announce a message to screen readers via the live region
  const announce = useCallback((message: string, priority: "polite" | "assertive" = "assertive") => {
    if (liveRegionRef.current) {
      // Clear and re-set to ensure announcement is made
      liveRegionRef.current.textContent = "";
      // Use requestAnimationFrame to ensure DOM update is processed
      requestAnimationFrame(() => {
        if (liveRegionRef.current) {
          liveRegionRef.current.setAttribute("aria-live", priority);
          liveRegionRef.current.textContent = message;
        }
      });
    }
  }, []);

  const announcements: DragAnnouncement = {
    onDragStart: useCallback((itemTitle: string, position: number, total: number) => {
      announce(
        `Arrastrando ${itemTitle}. Posicion ${position} de ${total}. ` +
        `Usa las teclas de flecha para mover. Presiona Escape para cancelar.`,
        "assertive"
      );
    }, [announce]),

    onDragOver: useCallback((itemTitle: string, targetPosition: number, total: number) => {
      announce(
        `${itemTitle} sobre la posicion ${targetPosition} de ${total}.`,
        "polite"
      );
    }, [announce]),

    onDrop: useCallback((itemTitle: string, newPosition: number, total: number) => {
      announce(
        `${itemTitle} colocado en la posicion ${newPosition} de ${total}.`,
        "assertive"
      );
    }, [announce]),

    onDragCancel: useCallback((itemTitle: string) => {
      announce(
        `Arrastre de ${itemTitle} cancelado. El elemento volvio a su posicion original.`,
        "assertive"
      );
    }, [announce]),

    onInvalidDrop: useCallback((reason: string) => {
      announce(
        `No se puede soltar aqui. ${reason}`,
        "assertive"
      );
    }, [announce]),
  };

  // Create a stable LiveRegion component reference
  const LiveRegion = useMemo(() => {
    const Component: React.FC = () => (
      <LiveRegionComponent
        instructionsId={instructionsId}
        liveRegionId={liveRegionId}
        liveRegionRef={liveRegionRef}
      />
    );
    return Component;
  }, []);

  return {
    announcements,
    dragInstructionsId: instructionsId,
    LiveRegion,
  };
}

/**
 * Utility to get position information for announcements
 */
export function getPositionInfo(
  items: Array<{ id: string }>,
  itemId: string
): { position: number; total: number } {
  const index = items.findIndex((item) => item.id === itemId);
  return {
    position: index + 1,
    total: items.length,
  };
}
