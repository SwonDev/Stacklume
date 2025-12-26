/**
 * Widget Utility Functions
 *
 * Type-safe utility functions for working with widgets
 */

import type {
  Widget,
  WidgetType,
  WidgetSize,
  WidgetConfigOptions,
} from './widget';
import {
  WIDGET_SIZE_PRESETS,
  WIDGET_TYPE_METADATA,
  getDefaultWidgetConfig,
} from './widget';

/**
 * Validate widget data
 */
export function isValidWidget(widget: unknown): widget is Widget {
  if (!widget || typeof widget !== 'object') return false;
  const w = widget as Record<string, unknown>;
  return (
    typeof w.id === 'string' &&
    typeof w.type === 'string' &&
    typeof w.title === 'string' &&
    typeof w.size === 'string' &&
    w.layout !== null &&
    typeof w.layout === 'object' &&
    typeof (w.layout as Record<string, unknown>).x === 'number' &&
    typeof (w.layout as Record<string, unknown>).y === 'number' &&
    typeof (w.layout as Record<string, unknown>).w === 'number' &&
    typeof (w.layout as Record<string, unknown>).h === 'number'
  );
}

/**
 * Validate widget type
 */
export function isValidWidgetType(type: string): type is WidgetType {
  return type in WIDGET_TYPE_METADATA;
}

/**
 * Validate widget size
 */
export function isValidWidgetSize(size: string): size is WidgetSize {
  return size in WIDGET_SIZE_PRESETS;
}

/**
 * Create a new widget with defaults
 */
export function createWidget(
  type: WidgetType,
  overrides?: Partial<Omit<Widget, 'id' | 'type'>>
): Omit<Widget, 'id'> {
  const metadata = WIDGET_TYPE_METADATA[type];
  const defaultConfig = getDefaultWidgetConfig(type);
  const sizePreset = WIDGET_SIZE_PRESETS[overrides?.size || metadata.defaultSize];

  return {
    type,
    title: overrides?.title || metadata.defaultTitle,
    size: overrides?.size || metadata.defaultSize,
    categoryId: overrides?.categoryId,
    config: { ...defaultConfig, ...(overrides?.config || {}) },
    layout: {
      x: overrides?.layout?.x ?? 0,
      y: overrides?.layout?.y ?? 0,
      w: overrides?.layout?.w ?? sizePreset.w,
      h: overrides?.layout?.h ?? sizePreset.h,
    },
  };
}

/**
 * Clone a widget with a new ID
 */
export function cloneWidget(widget: Widget): Omit<Widget, 'id'> {
  return {
    type: widget.type,
    title: `${widget.title} (Copy)`,
    size: widget.size,
    categoryId: widget.categoryId,
    config: widget.config ? { ...widget.config } : undefined,
    layout: { ...widget.layout },
  };
}

/**
 * Check if widget requires a category
 */
export function widgetRequiresCategory(type: WidgetType): boolean {
  return WIDGET_TYPE_METADATA[type].requiresCategory || false;
}

/**
 * Check if widget is configurable
 */
export function isWidgetConfigurable(type: WidgetType): boolean {
  return WIDGET_TYPE_METADATA[type].configurable || false;
}

/**
 * Get widget icon name (Lucide)
 */
export function getWidgetIcon(type: WidgetType): string {
  return WIDGET_TYPE_METADATA[type].icon;
}

/**
 * Get widget display label
 */
export function getWidgetLabel(type: WidgetType): string {
  return WIDGET_TYPE_METADATA[type].label;
}

/**
 * Get widget description
 */
export function getWidgetDescription(type: WidgetType): string {
  return WIDGET_TYPE_METADATA[type].description;
}

/**
 * Calculate widget area (grid cells)
 */
export function getWidgetArea(widget: Widget): number {
  return widget.layout.w * widget.layout.h;
}

/**
 * Check if two widgets overlap
 */
export function widgetsOverlap(widget1: Widget, widget2: Widget): boolean {
  const w1 = widget1.layout;
  const w2 = widget2.layout;

  return !(
    w1.x + w1.w <= w2.x ||
    w2.x + w2.w <= w1.x ||
    w1.y + w1.h <= w2.y ||
    w2.y + w2.h <= w1.y
  );
}

/**
 * Sort widgets by position (top to bottom, left to right)
 */
export function sortWidgetsByPosition(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    if (a.layout.y !== b.layout.y) {
      return a.layout.y - b.layout.y;
    }
    return a.layout.x - b.layout.x;
  });
}

/**
 * Sort widgets by creation (assumes ID contains timestamp)
 */
export function sortWidgetsByCreation(widgets: Widget[]): Widget[] {
  return [...widgets].sort((a, b) => {
    // Extract timestamp from ID if present (format: widget-{timestamp}-{random})
    const getTimestamp = (id: string): number => {
      const match = id.match(/widget-(\d+)-/);
      return match ? parseInt(match[1]) : 0;
    };

    return getTimestamp(a.id) - getTimestamp(b.id);
  });
}

/**
 * Group widgets by type
 */
export function groupWidgetsByType(widgets: Widget[]): Record<WidgetType, Widget[]> {
  const groups = {} as Record<WidgetType, Widget[]>;

  widgets.forEach((widget) => {
    if (!groups[widget.type]) {
      groups[widget.type] = [];
    }
    groups[widget.type].push(widget);
  });

  return groups;
}

/**
 * Filter widgets by size
 */
export function filterWidgetsBySize(widgets: Widget[], size: WidgetSize): Widget[] {
  return widgets.filter((w) => w.size === size);
}

/**
 * Filter widgets by category
 */
export function filterWidgetsByCategory(widgets: Widget[], categoryId: string): Widget[] {
  return widgets.filter((w) => w.categoryId === categoryId);
}

/**
 * Get total grid space used by widgets
 */
export function getTotalWidgetArea(widgets: Widget[]): number {
  return widgets.reduce((total, widget) => total + getWidgetArea(widget), 0);
}

/**
 * Find next available position in grid
 */
export function findNextAvailablePosition(
  existingWidgets: Widget[],
  width: number,
  height: number,
  cols: number = 12
): { x: number; y: number } {
  // Sort widgets by position
  const sorted = sortWidgetsByPosition(existingWidgets);

  // If no widgets, return origin
  if (sorted.length === 0) {
    return { x: 0, y: 0 };
  }

  // Try to find space in each row
  const maxY = Math.max(...sorted.map((w) => w.layout.y + w.layout.h));

  for (let y = 0; y <= maxY; y++) {
    // Get widgets in this row
    const rowWidgets = sorted.filter(
      (w) => w.layout.y <= y && w.layout.y + w.layout.h > y
    );

    // Try each x position
    for (let x = 0; x <= cols - width; x++) {
      const testWidget: Widget = {
        id: 'test',
        type: 'favorites',
        title: 'test',
        size: 'medium',
        layout: { x, y, w: width, h: height },
      };

      const hasOverlap = rowWidgets.some((w) => widgetsOverlap(w, testWidget));

      if (!hasOverlap) {
        return { x, y };
      }
    }
  }

  // If no space found, place at bottom
  return { x: 0, y: maxY };
}

/**
 * Compact widgets vertically (remove gaps)
 */
export function compactWidgets(widgets: Widget[], _cols: number = 12): Widget[] {
  const sorted = sortWidgetsByPosition(widgets);
  const compacted: Widget[] = [];

  sorted.forEach((widget) => {
    let y = 0;
    const x = widget.layout.x;

    // Find lowest Y position that doesn't overlap
    while (true) {
      const testWidget: Widget = {
        ...widget,
        layout: { ...widget.layout, x, y },
      };

      const hasOverlap = compacted.some((w) => widgetsOverlap(w, testWidget));

      if (!hasOverlap) {
        compacted.push({
          ...widget,
          layout: { ...widget.layout, x, y },
        });
        break;
      }

      y++;
    }
  });

  return compacted;
}

/**
 * Validate widget layout bounds
 */
export function isLayoutInBounds(
  layout: { x: number; y: number; w: number; h: number },
  cols: number = 12
): boolean {
  return (
    layout.x >= 0 &&
    layout.y >= 0 &&
    layout.w > 0 &&
    layout.h > 0 &&
    layout.x + layout.w <= cols
  );
}

/**
 * Ensure widget layout is within bounds
 */
export function constrainLayoutToBounds(
  layout: { x: number; y: number; w: number; h: number },
  cols: number = 12
): { x: number; y: number; w: number; h: number } {
  const w = Math.min(layout.w, cols);
  const h = Math.max(layout.h, 1);
  const x = Math.max(0, Math.min(layout.x, cols - w));
  const y = Math.max(0, layout.y);

  return { x, y, w, h };
}

/**
 * Export widgets to JSON
 */
export function exportWidgets(widgets: Widget[]): string {
  return JSON.stringify(widgets, null, 2);
}

/**
 * Import widgets from JSON
 */
export function importWidgets(json: string): Widget[] {
  try {
    const parsed = JSON.parse(json);

    if (!Array.isArray(parsed)) {
      throw new Error('Invalid widget data: not an array');
    }

    const validated = parsed.filter(isValidWidget);

    if (validated.length !== parsed.length) {
      console.warn(
        `Imported ${validated.length} of ${parsed.length} widgets (${parsed.length - validated.length} invalid)`
      );
    }

    return validated;
  } catch (error) {
    console.error('Failed to import widgets:', error);
    return [];
  }
}

/**
 * Create a widget summary for display
 */
export function getWidgetSummary(widget: Widget): string {
  const metadata = WIDGET_TYPE_METADATA[widget.type];
  return `${widget.title} (${metadata.label}) - ${widget.size}`;
}

/**
 * Get widget statistics
 */
export function getWidgetStatistics(widgets: Widget[]): {
  total: number;
  byType: Record<string, number>;
  bySize: Record<string, number>;
  totalArea: number;
  averageArea: number;
} {
  const byType: Record<string, number> = {};
  const bySize: Record<string, number> = {};
  let totalArea = 0;

  widgets.forEach((widget) => {
    byType[widget.type] = (byType[widget.type] || 0) + 1;
    bySize[widget.size] = (bySize[widget.size] || 0) + 1;
    totalArea += getWidgetArea(widget);
  });

  return {
    total: widgets.length,
    byType,
    bySize,
    totalArea,
    averageArea: widgets.length > 0 ? totalArea / widgets.length : 0,
  };
}

/**
 * Merge widget config with defaults
 */
export function mergeWidgetConfig(
  type: WidgetType,
  userConfig?: Record<string, unknown>
): WidgetConfigOptions {
  const defaultConfig = getDefaultWidgetConfig(type);
  return { ...defaultConfig, ...(userConfig || {}) };
}

/**
 * Type guard for widget with category
 */
export function hasCategory(widget: Widget): widget is Widget & { categoryId: string } {
  return widget.categoryId !== undefined && widget.categoryId !== null;
}

/**
 * Type guard for widget with config
 */
export function hasConfig(widget: Widget): widget is Widget & { config: Record<string, unknown> } {
  return widget.config !== undefined && widget.config !== null;
}
