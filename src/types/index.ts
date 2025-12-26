/**
 * Centralized Type Exports
 *
 * Export all types from a single entry point for easier imports
 */

// Widget types
export type {
  Widget,
  WidgetType,
  WidgetSize,
  WidgetTypeMetadata,
  WidgetConfigOptions,
} from './widget';

export {
  WIDGET_SIZE_PRESETS,
  WIDGET_TYPE_METADATA,
  getDefaultWidgetConfig,
  getLayoutDimensionsFromSize,
  getSizeFromLayoutDimensions,
} from './widget';

// Widget utilities
export {
  isValidWidget,
  isValidWidgetType,
  isValidWidgetSize,
  createWidget,
  cloneWidget,
  widgetRequiresCategory,
  isWidgetConfigurable,
  getWidgetIcon,
  getWidgetLabel,
  getWidgetDescription,
  getWidgetArea,
  widgetsOverlap,
  sortWidgetsByPosition,
  sortWidgetsByCreation,
  groupWidgetsByType,
  filterWidgetsBySize,
  filterWidgetsByCategory,
  getTotalWidgetArea,
  findNextAvailablePosition,
  compactWidgets,
  isLayoutInBounds,
  constrainLayoutToBounds,
  exportWidgets,
  importWidgets,
  getWidgetSummary,
  getWidgetStatistics,
  mergeWidgetConfig,
  hasCategory,
  hasConfig,
} from './widget-utils';
