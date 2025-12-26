import type { Layout, Layouts } from "react-grid-layout";
import type { Widget } from "@/types/widget";

// Breakpoint configuration
export const BREAKPOINTS = { lg: 1200, md: 996, sm: 768 };
export const COLS = { lg: 12, md: 10, sm: 6 };

type Breakpoint = keyof typeof COLS;

/**
 * Generates a responsive layout for a specific breakpoint based on the source layout.
 * Maintains relative positions and ensures widgets fill the available width.
 */
function generateBreakpointLayout(
  sourceLayout: Layout[],
  sourceCols: number,
  targetCols: number
): Layout[] {
  if (sourceCols === targetCols) {
    return sourceLayout.map(item => ({ ...item }));
  }

  // Sort by Y first, then X to maintain reading order
  const sortedSource = [...sourceLayout].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // Group widgets by their row (same Y position)
  const rowGroups = new Map<number, Layout[]>();
  for (const item of sortedSource) {
    const row = item.y;
    if (!rowGroups.has(row)) {
      rowGroups.set(row, []);
    }
    rowGroups.get(row)!.push(item);
  }

  // Process each row to distribute widths evenly
  const scaledItems: Layout[] = [];

  for (const [, rowItems] of rowGroups) {
    // Sort items in this row by X position
    rowItems.sort((a, b) => a.x - b.x);

    // Check if this row fills the full width
    const rowStartX = rowItems[0].x;
    const lastItem = rowItems[rowItems.length - 1];
    const rowEndX = lastItem.x + lastItem.w;
    const rowFillsWidth = rowStartX === 0 && rowEndX === sourceCols;

    // Calculate scaled widths with proper distribution
    let currentX = 0;

    for (let i = 0; i < rowItems.length; i++) {
      const item = rowItems[i];
      const isLastInRow = i === rowItems.length - 1;

      // Scale width proportionally
      let newW = Math.max(1, Math.round((item.w / sourceCols) * targetCols));

      // If this row should fill the width and this is the last item,
      // extend it to fill the remaining space
      if (rowFillsWidth && isLastInRow) {
        newW = targetCols - currentX;
      } else {
        // Ensure width doesn't exceed remaining space
        newW = Math.min(newW, targetCols - currentX);
      }

      // If widget was at the right edge, keep it at the right edge
      const wasAtRightEdge = item.x + item.w === sourceCols;
      if (wasAtRightEdge && !rowFillsWidth) {
        // This widget should extend to the right edge
        newW = targetCols - currentX;
      }

      scaledItems.push({
        ...item,
        x: currentX,
        y: item.y,
        w: newW,
        h: item.h,
      });

      currentX += newW;
    }
  }

  // Now we need to handle vertical compaction and collision detection
  // Sort by Y then X
  scaledItems.sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // Track occupied cells for collision detection
  const grid: boolean[][] = [];
  const maxRows = 100;
  for (let y = 0; y < maxRows; y++) {
    grid[y] = new Array(targetCols).fill(false);
  }

  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    if (x < 0 || x + w > targetCols) return false;
    if (y < 0 || y + h > maxRows) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy]?.[x + dx]) return false;
      }
    }
    return true;
  };

  const occupy = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy]) {
          grid[y + dy][x + dx] = true;
        }
      }
    }
  };

  const findBestPosition = (
    preferredX: number,
    preferredY: number,
    w: number,
    h: number
  ): { x: number; y: number } => {
    // Try preferred position first
    if (canPlace(preferredX, preferredY, w, h)) {
      return { x: preferredX, y: preferredY };
    }

    // Try same row, different column
    for (let x = 0; x <= targetCols - w; x++) {
      if (canPlace(x, preferredY, w, h)) {
        return { x, y: preferredY };
      }
    }

    // Find next available position (top-left priority)
    for (let y = 0; y < maxRows; y++) {
      for (let x = 0; x <= targetCols - w; x++) {
        if (canPlace(x, y, w, h)) {
          return { x, y };
        }
      }
    }

    // Fallback: place at end
    const maxOccupiedY = grid.findIndex(row => row.every(cell => !cell));
    return { x: 0, y: maxOccupiedY >= 0 ? maxOccupiedY : 0 };
  };

  // Place items with collision detection
  return scaledItems.map(item => {
    const position = findBestPosition(item.x, item.y, item.w, item.h);
    occupy(position.x, position.y, item.w, item.h);

    return {
      ...item,
      x: position.x,
      y: position.y,
    };
  });
}

/**
 * Generates responsive layouts for all breakpoints based on the stored widget layouts.
 * The stored layout (in database) is treated as the "lg" layout reference.
 * Locked widgets have static: true to prevent drag/resize.
 */
export function generateResponsiveLayouts(widgets: Widget[]): Layouts {
  // Create a map of widget id to locked state for quick lookup
  const lockedWidgets = new Map(
    widgets.map(w => [w.id, w.isLocked === true])
  );

  // Create the base layout from widgets (this is the "lg" layout stored in DB)
  const lgLayout: Layout[] = widgets.map(widget => ({
    i: widget.id,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: 1,
    minH: 2,
    static: widget.isLocked === true, // Prevent drag/resize for locked widgets
  }));

  // Generate adapted layouts for smaller breakpoints
  // We need to preserve the static property when generating breakpoint layouts
  const mdLayout = generateBreakpointLayout(lgLayout, COLS.lg, COLS.md).map(item => ({
    ...item,
    static: lockedWidgets.get(item.i) ?? false,
  }));
  const smLayout = generateBreakpointLayout(lgLayout, COLS.lg, COLS.sm).map(item => ({
    ...item,
    static: lockedWidgets.get(item.i) ?? false,
  }));

  return {
    lg: lgLayout,
    md: mdLayout,
    sm: smLayout,
  };
}

/**
 * Converts a layout from any breakpoint back to the "lg" reference layout.
 * Used when saving layouts to database.
 */
export function normalizeLayoutToLg(
  layout: Layout[],
  sourceBreakpoint: Breakpoint
): Layout[] {
  const sourceCols = COLS[sourceBreakpoint];
  const targetCols = COLS.lg;

  if (sourceCols === targetCols) {
    return layout.map(item => ({ ...item }));
  }

  return layout.map(item => {
    // Scale width proportionally
    let newW = Math.round((item.w / sourceCols) * targetCols);
    newW = Math.max(1, Math.min(newW, targetCols));

    // Scale X position proportionally
    let newX = Math.round((item.x / sourceCols) * targetCols);
    newX = Math.max(0, Math.min(newX, targetCols - newW));

    return {
      ...item,
      x: newX,
      y: item.y,
      w: newW,
      h: item.h,
    };
  });
}

/**
 * Gets the current breakpoint based on window width.
 */
export function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= BREAKPOINTS.lg) return "lg";
  if (width >= BREAKPOINTS.md) return "md";
  return "sm";
}

/**
 * Compacts a layout vertically to remove gaps.
 * This is similar to react-grid-layout's compactType="vertical".
 */
export function compactLayout(layout: Layout[], cols: number): Layout[] {
  // Sort by Y then X
  const sorted = [...layout].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const grid: boolean[][] = [];
  const maxRows = 100;
  for (let y = 0; y < maxRows; y++) {
    grid[y] = new Array(cols).fill(false);
  }

  const canPlace = (x: number, y: number, w: number, h: number): boolean => {
    if (x < 0 || x + w > cols) return false;
    if (y < 0 || y + h > maxRows) return false;
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy]?.[x + dx]) return false;
      }
    }
    return true;
  };

  const occupy = (x: number, y: number, w: number, h: number) => {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (grid[y + dy]) {
          grid[y + dy][x + dx] = true;
        }
      }
    }
  };

  return sorted.map(item => {
    // Try to move item up as much as possible while maintaining X
    let newY = 0;
    while (newY < item.y && !canPlace(item.x, newY, item.w, item.h)) {
      newY++;
    }

    // If can't place at preferred X, find first available position
    if (!canPlace(item.x, newY, item.w, item.h)) {
      for (let y = 0; y < maxRows; y++) {
        if (canPlace(item.x, y, item.w, item.h)) {
          newY = y;
          break;
        }
      }
    }

    occupy(item.x, newY, item.w, item.h);

    return {
      ...item,
      y: newY,
    };
  });
}
