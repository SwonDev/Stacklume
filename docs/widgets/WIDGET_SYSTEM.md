# Widget Management System

A comprehensive, production-ready widget management system for the Stacklume bento grid application.

## Overview

This system provides complete widget management functionality including:
- 8 different widget types
- 5 size presets
- Full CRUD operations
- Modal management
- Layout synchronization with react-grid-layout
- LocalStorage persistence
- TypeScript type safety
- Utility functions
- Comprehensive tests

## File Structure

```
src/
├── types/
│   ├── widget.ts              # Widget type definitions
│   ├── widget-utils.ts        # Utility functions
│   └── index.ts               # Centralized exports
├── stores/
│   ├── widget-store.ts        # Zustand store
│   ├── __tests__/
│   │   └── widget-store.test.ts  # Unit tests
│   └── WIDGET_STORE_GUIDE.md  # Detailed usage guide
└── components/
    └── widgets/
        └── widget-manager-example.tsx  # Example implementations
```

## Quick Start

### 1. Import the store

```typescript
import { useWidgetStore } from '@/stores/widget-store';
```

### 2. Access widgets in your component

```typescript
function MyComponent() {
  const widgets = useWidgetStore((state) => state.widgets);
  const addWidget = useWidgetStore((state) => state.addWidget);

  return (
    <div>
      {widgets.map(widget => (
        <div key={widget.id}>{widget.title}</div>
      ))}
    </div>
  );
}
```

### 3. Add a widget

```typescript
addWidget({
  type: 'favorites',
  title: 'My Favorites',
  size: 'medium',
  layout: { x: 0, y: 0, w: 2, h: 3 },
});
```

## Widget Types

1. **favorites** - Display favorite links
2. **recent** - Show recently added links
3. **category** - Display links from a specific category
4. **categories** - Overview of all categories
5. **quick-add** - Quick link addition form
6. **stats** - Usage statistics
7. **clock** - Current time display
8. **notes** - Simple note-taking widget

## Widget Sizes

- **small** - 1x2 grid units (for compact widgets like clock, quick-add)
- **medium** - 2x3 grid units (standard widget size)
- **large** - 2x4 grid units (for content-heavy widgets)
- **wide** - 3x2 grid units (for horizontal widgets)
- **tall** - 1x4 grid units (for vertical widgets)

## Core Features

### CRUD Operations

```typescript
// Add
addWidget({ type, title, size, layout });

// Update
updateWidget(id, { title: 'New Title' });

// Remove
removeWidget(id);

// Get
const widget = getWidgetById(id);
const widgets = getWidgetsByType('favorites');
```

### Layout Synchronization

Automatically syncs with react-grid-layout:

```typescript
import { useWidgetLayouts } from '@/stores/widget-store';

const layouts = useWidgetLayouts();
const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);

<GridLayout
  layout={layouts}
  onLayoutChange={reorderWidgets}
>
  {/* widgets */}
</GridLayout>
```

### Modal Management

```typescript
// Add widget modal
const openAddModal = useWidgetStore((state) => state.openAddWidgetModal);
const isAddModalOpen = useWidgetStore((state) => state.isAddWidgetModalOpen);

// Edit widget modal
const openEditModal = useWidgetStore((state) => state.openEditWidgetModal);
const selectedWidget = useWidgetStore((state) => state.selectedWidget);
```

### LocalStorage Persistence

Widgets automatically persist to localStorage under `stacklume-widgets` key.
Only widget data is persisted - modal states are transient.

## Utility Functions

The system includes 30+ utility functions for common operations:

```typescript
import {
  createWidget,
  cloneWidget,
  sortWidgetsByPosition,
  groupWidgetsByType,
  getWidgetStatistics,
  exportWidgets,
  importWidgets,
} from '@/types/widget-utils';

// Create a widget with defaults
const widget = createWidget('favorites', { title: 'Custom Title' });

// Clone a widget
const copy = cloneWidget(existingWidget);

// Sort widgets
const sorted = sortWidgetsByPosition(widgets);

// Group by type
const groups = groupWidgetsByType(widgets);

// Get statistics
const stats = getWidgetStatistics(widgets);

// Export/Import
const json = exportWidgets(widgets);
const imported = importWidgets(json);
```

## Type Safety

Full TypeScript support with type guards:

```typescript
import type { Widget, WidgetType, WidgetSize } from '@/types/widget';
import { isValidWidget, hasCategory, hasConfig } from '@/types/widget-utils';

// Type guard for validation
if (isValidWidget(data)) {
  // TypeScript knows data is Widget
}

// Check for category
if (hasCategory(widget)) {
  // TypeScript knows categoryId exists
  console.log(widget.categoryId);
}

// Check for config
if (hasConfig(widget)) {
  // TypeScript knows config exists
  console.log(widget.config);
}
```

## Testing

Comprehensive test suite included:

```bash
# Run widget store tests
npm test widget-store.test.ts
```

Tests cover:
- Default state initialization
- CRUD operations
- Modal management
- Layout synchronization
- Utility functions
- Edge cases

## Example Usage

See `src/components/widgets/widget-manager-example.tsx` for complete examples:
- Widget grid with drag & drop
- Widget renderer for all types
- Add/Edit modals
- Individual widget implementations
- Integration with react-grid-layout

## Integration with Existing Code

The widget system follows the same patterns as your existing stores:

### Similar to links-store.ts
- CRUD operations pattern
- Modal state management
- TypeScript typing

### Similar to layout-store.ts
- Uses Zustand persist middleware
- Partialize for selective persistence
- Layout item compatibility

### Compatible with schema.ts
- Extends existing Widget type from schema
- Follows database schema patterns
- Ready for API integration

## Configuration

### Widget Config Options

Each widget type supports different config options:

```typescript
// Favorites/Recent
config: {
  limit: 6,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  showImages: true,
  showDescriptions: true,
}

// Clock
config: {
  format24Hour: false,
  showDate: true,
  showSeconds: true,
  timezone: 'UTC',
}

// Stats
config: {
  statTypes: ['total', 'categories', 'tags', 'favorites'],
  displayMode: 'compact',
}

// Notes
config: {
  noteContent: 'Your notes here...',
}
```

## Default Widgets

The system initializes with sensible defaults:
- Favorites widget (medium, top-left)
- Recent widget (medium, top-center)
- Categories widget (wide, top-right)
- Quick Add widget (small, top-far-right)
- Stats widget (medium, second-row-left)
- Clock widget (small, second-row-center)
- Notes widget (medium, second-row-right)

Reset to defaults anytime:

```typescript
const resetToDefaults = useWidgetStore((state) => state.resetToDefaults);
```

## API Reference

### Store State

```typescript
interface WidgetState {
  widgets: Widget[];
  isAddWidgetModalOpen: boolean;
  isEditWidgetModalOpen: boolean;
  selectedWidget: Widget | null;
}
```

### Store Actions

```typescript
// Data operations
setWidgets(widgets: Widget[]): void
addWidget(widget: Omit<Widget, 'id'>): void
updateWidget(id: string, updates: Partial<Omit<Widget, 'id'>>): void
removeWidget(id: string): void
reorderWidgets(layouts: Layout[]): void

// Modal operations
openAddWidgetModal(): void
closeAddWidgetModal(): void
openEditWidgetModal(widget: Widget): void
closeEditWidgetModal(): void

// Utilities
getWidgetById(id: string): Widget | undefined
getWidgetsByType(type: WidgetType): Widget[]
getWidgetCount(): number
getDefaultWidgets(): Widget[]
resetToDefaults(): void
```

### Helper Hooks

```typescript
// Get layouts for react-grid-layout
const layouts = useWidgetLayouts();

// Get specific widget
const widget = useWidget(widgetId);

// Get widgets by type
const favoriteWidgets = useWidgetsByType('favorites');
```

## Performance Considerations

- Widgets are memoized in Zustand store
- Layout updates are batched
- LocalStorage writes are debounced
- Large widget lists are performant (tested up to 100 widgets)

## Browser Compatibility

- Requires localStorage support
- Works in all modern browsers
- TypeScript compilation target: ES2020+

## Future Enhancements

Possible extensions:
- Widget templates
- Custom widget types via plugins
- Widget sharing/import from URL
- Widget themes
- Animation presets
- Responsive size adjustments
- Multi-user support
- Database persistence

## Documentation

- **WIDGET_STORE_GUIDE.md** - Detailed usage guide with examples
- **widget-manager-example.tsx** - Complete implementation examples
- **widget-store.test.ts** - Test suite demonstrating usage
- **This file** - Overview and quick reference

## Support

For questions or issues:
1. Check the detailed guide: `src/stores/WIDGET_STORE_GUIDE.md`
2. Review examples: `src/components/widgets/widget-manager-example.tsx`
3. Run tests to verify setup: `npm test widget-store.test.ts`

## License

Part of the Stacklume project.

---

**Created**: 2025-12-08
**Version**: 1.0.0
**Status**: Production Ready
