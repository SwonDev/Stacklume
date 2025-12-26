# Widget Management System Guide

This guide explains how to use the comprehensive widget management system for your bento grid application.

## Overview

The widget system consists of:
- **Widget Types** (`src/types/widget.ts`) - TypeScript type definitions and metadata
- **Widget Store** (`src/stores/widget-store.ts`) - Zustand store for state management
- **Example Components** (`src/components/widgets/widget-manager-example.tsx`) - Reference implementations

## Features

### 8 Widget Types

1. **Favorites** - Display favorite links
2. **Recent** - Show recently added links
3. **Category** - Display links from a specific category
4. **Categories** - Overview of all categories
5. **Quick Add** - Quick link addition form
6. **Stats** - Usage statistics
7. **Clock** - Current time display
8. **Notes** - Simple note-taking widget

### 5 Widget Sizes

- **Small** - 1x2 grid units
- **Medium** - 2x3 grid units
- **Large** - 2x4 grid units
- **Wide** - 3x2 grid units
- **Tall** - 1x4 grid units

## Usage

### Basic Store Usage

```typescript
import { useWidgetStore } from '@/stores/widget-store';

function MyComponent() {
  const widgets = useWidgetStore((state) => state.widgets);
  const addWidget = useWidgetStore((state) => state.addWidget);
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const removeWidget = useWidgetStore((state) => state.removeWidget);

  // ... use the store
}
```

### Adding a Widget

```typescript
import { useWidgetStore } from '@/stores/widget-store';
import { WIDGET_TYPE_METADATA } from '@/types/widget';

function AddWidgetButton() {
  const addWidget = useWidgetStore((state) => state.addWidget);

  const handleAddFavoritesWidget = () => {
    const metadata = WIDGET_TYPE_METADATA['favorites'];

    addWidget({
      type: 'favorites',
      title: metadata.defaultTitle,
      size: metadata.defaultSize,
      config: {
        limit: 6,
        showImages: true,
      },
      layout: {
        x: 0,
        y: 0,
        w: 2,
        h: 3,
      },
    });
  };

  return <button onClick={handleAddFavoritesWidget}>Add Favorites</button>;
}
```

### Updating a Widget

```typescript
const updateWidget = useWidgetStore((state) => state.updateWidget);

// Update widget title
updateWidget('widget-id', { title: 'New Title' });

// Update widget size
updateWidget('widget-id', { size: 'large' });

// Update widget config
updateWidget('widget-id', {
  config: {
    limit: 10,
    showImages: false,
  },
});

// Update layout position
updateWidget('widget-id', {
  layout: {
    x: 2,
    y: 3,
    w: 4,
    h: 5,
  },
});
```

### Removing a Widget

```typescript
const removeWidget = useWidgetStore((state) => state.removeWidget);

removeWidget('widget-id');
```

### Syncing with react-grid-layout

```typescript
import { useWidgetStore, useWidgetLayouts } from '@/stores/widget-store';
import GridLayout, { type Layout } from 'react-grid-layout';

function WidgetGrid() {
  const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);
  const layouts = useWidgetLayouts(); // Gets layouts in react-grid-layout format

  const handleLayoutChange = (newLayout: Layout[]) => {
    // Sync layout changes back to the store
    reorderWidgets(newLayout);
  };

  return (
    <GridLayout
      layout={layouts}
      onLayoutChange={handleLayoutChange}
      cols={12}
      rowHeight={30}
      width={1200}
    >
      {/* widgets */}
    </GridLayout>
  );
}
```

### Using Modal States

```typescript
function WidgetControls() {
  const openAddModal = useWidgetStore((state) => state.openAddWidgetModal);
  const closeAddModal = useWidgetStore((state) => state.closeAddWidgetModal);
  const isAddModalOpen = useWidgetStore((state) => state.isAddWidgetModalOpen);

  const openEditModal = useWidgetStore((state) => state.openEditWidgetModal);
  const closeEditModal = useWidgetStore((state) => state.closeEditWidgetModal);
  const isEditModalOpen = useWidgetStore((state) => state.isEditWidgetModalOpen);
  const selectedWidget = useWidgetStore((state) => state.selectedWidget);

  // Example: Open edit modal for a specific widget
  const handleEdit = (widget: Widget) => {
    openEditModal(widget);
  };

  return (
    <>
      <button onClick={openAddModal}>Add Widget</button>
      {/* Modal components */}
    </>
  );
}
```

### Helper Hooks

```typescript
import { useWidget, useWidgetsByType, useFilteredWidgets, useWidgetsByProject, useCurrentProjectId } from '@/stores/widget-store';

// Get a specific widget
function WidgetComponent({ widgetId }: { widgetId: string }) {
  const widget = useWidget(widgetId);

  if (!widget) return null;

  return <div>{widget.title}</div>;
}

// Get all widgets of a specific type
function FavoritesWidgetList() {
  const favoriteWidgets = useWidgetsByType('favorites');

  return (
    <div>
      {favoriteWidgets.map(widget => (
        <div key={widget.id}>{widget.title}</div>
      ))}
    </div>
  );
}

// Get widgets filtered by current project
function ProjectWidgetGrid() {
  const filteredWidgets = useFilteredWidgets();

  return (
    <div>
      {filteredWidgets.map(widget => (
        <div key={widget.id}>{widget.title}</div>
      ))}
    </div>
  );
}

// Get widgets for a specific project
function SpecificProjectWidgets({ projectId }: { projectId: string | null }) {
  const projectWidgets = useWidgetsByProject(projectId);

  return (
    <div>
      <h3>{projectId ? 'Project Widgets' : 'Home Widgets'}</h3>
      {projectWidgets.map(widget => (
        <div key={widget.id}>{widget.title}</div>
      ))}
    </div>
  );
}

// Get current project ID
function CurrentProjectIndicator() {
  const currentProjectId = useCurrentProjectId();

  return <div>Current Project: {currentProjectId ?? 'Home'}</div>;
}
```

### Reset to Default Widgets

```typescript
const resetToDefaults = useWidgetStore((state) => state.resetToDefaults);

function ResetButton() {
  const handleReset = () => {
    if (confirm('Reset all widgets to defaults?')) {
      resetToDefaults();
    }
  };

  return <button onClick={handleReset}>Reset Widgets</button>;
}
```

## Project Filtering

The widget store supports project-based filtering, allowing you to organize widgets by projects. Each widget can belong to a specific project or the default "Home" view (when projectId is null).

### Setting the Current Project

```typescript
import { useWidgetStore } from '@/stores/widget-store';

function ProjectSwitcher({ projectId }: { projectId: string | null }) {
  const setCurrentProjectId = useWidgetStore((state) => state.setCurrentProjectId);

  const handleSwitchProject = () => {
    // Switch to the project
    setCurrentProjectId(projectId);
  };

  return (
    <button onClick={handleSwitchProject}>
      Switch to {projectId ? 'Project' : 'Home'}
    </button>
  );
}
```

### Getting Filtered Widgets

```typescript
import { useFilteredWidgets } from '@/stores/widget-store';

function WidgetDashboard() {
  // Only shows widgets for the current project
  const widgets = useFilteredWidgets();

  return (
    <div>
      {widgets.map(widget => (
        <WidgetCard key={widget.id} widget={widget} />
      ))}
    </div>
  );
}
```

### Adding Widgets to a Project

When adding a widget, it automatically uses the current project ID:

```typescript
const addWidget = useWidgetStore((state) => state.addWidget);
const currentProjectId = useWidgetStore((state) => state.currentProjectId);

// Automatically assigned to current project
addWidget({
  type: 'favorites',
  title: 'My Favorites',
  size: 'medium',
  config: {},
  layout: { x: 0, y: 0, w: 2, h: 3 },
});

// Or explicitly specify a project
addWidget({
  type: 'notes',
  title: 'Project Notes',
  size: 'medium',
  projectId: 'specific-project-id', // Override current project
  config: {},
  layout: { x: 0, y: 0, w: 2, h: 3 },
});
```

### Moving Widgets Between Projects

```typescript
const updateWidget = useWidgetStore((state) => state.updateWidget);

// Move a widget to a different project
updateWidget('widget-id', {
  projectId: 'new-project-id'
});

// Move a widget to the Home view
updateWidget('widget-id', {
  projectId: null
});
```

### Getting Widgets by Project

```typescript
import { useWidgetsByProject } from '@/stores/widget-store';

function ProjectSummary({ projectId }: { projectId: string | null }) {
  const projectWidgets = useWidgetsByProject(projectId);

  return (
    <div>
      <h3>{projectId ? 'Project' : 'Home'} Widgets</h3>
      <p>Widget count: {projectWidgets.length}</p>
      <ul>
        {projectWidgets.map(widget => (
          <li key={widget.id}>{widget.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Important Notes

- **Home View**: When `projectId` is `null`, the widget belongs to the Home/default view
- **Auto-Organization**: The `autoOrganizeWidgets()` function only organizes widgets in the current project
- **Widget Count**: The `getWidgetCount()` function returns the count of widgets in the current project only
- **New Widgets**: New widgets are automatically assigned to the current project unless explicitly specified
- **Duplicate**: When duplicating a widget, it preserves the original widget's project assignment

## Widget Configuration Options

Each widget type supports different configuration options:

### Favorites & Recent Widgets

```typescript
{
  limit: 6,                    // Max items to display
  sortBy: 'createdAt',        // Sort field
  sortOrder: 'desc',          // Sort direction
  showImages: true,           // Show link images
  showDescriptions: true,     // Show descriptions
}
```

### Category Widget

```typescript
{
  limit: 8,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  showImages: true,
  showDescriptions: false,
}
```

### Clock Widget

```typescript
{
  format24Hour: false,        // 24-hour format
  showDate: true,            // Show date
  showSeconds: true,         // Show seconds
  timezone: 'UTC',           // Timezone
}
```

### Stats Widget

```typescript
{
  statTypes: ['total', 'categories', 'tags', 'favorites'],
  displayMode: 'compact',    // 'compact' | 'detailed'
}
```

### Notes Widget

```typescript
{
  noteContent: '',           // Note text content
}
```

## Widget Metadata

Access widget metadata for UI purposes:

```typescript
import { WIDGET_TYPE_METADATA } from '@/types/widget';

// Get metadata for a specific widget type
const favoritesMetadata = WIDGET_TYPE_METADATA['favorites'];

console.log(favoritesMetadata.label);        // "Favorites"
console.log(favoritesMetadata.description);  // "Display your favorite links"
console.log(favoritesMetadata.icon);         // "Star" (Lucide icon name)
console.log(favoritesMetadata.defaultSize);  // "medium"
console.log(favoritesMetadata.defaultTitle); // "Favorite Links"
```

## Size Presets

Access size presets for layout calculations:

```typescript
import { WIDGET_SIZE_PRESETS } from '@/types/widget';

const mediumPreset = WIDGET_SIZE_PRESETS['medium'];
console.log(mediumPreset.w);     // 2
console.log(mediumPreset.h);     // 3
console.log(mediumPreset.minW);  // 1
console.log(mediumPreset.minH);  // 2
```

## Helper Functions

### Get Default Config

```typescript
import { getDefaultWidgetConfig } from '@/types/widget';

const config = getDefaultWidgetConfig('favorites');
// Returns default configuration for favorites widget
```

### Convert Size to Layout Dimensions

```typescript
import { getLayoutDimensionsFromSize } from '@/types/widget';

const dimensions = getLayoutDimensionsFromSize('medium');
// Returns { w: 2, h: 3, minW: 1, minH: 2 }
```

### Determine Size from Dimensions

```typescript
import { getSizeFromLayoutDimensions } from '@/types/widget';

const size = getSizeFromLayoutDimensions(2, 3);
// Returns 'medium'
```

## Persistence

The widget store automatically persists to localStorage under the key `stacklume-widgets`.

Only widget data is persisted - modal states are not saved and will reset on page reload.

The store includes versioning and migration support for future schema changes.

## Default Widgets

The store initializes with a default set of widgets:
- Favorites (medium, position 0,0)
- Recent (medium, position 2,0)
- Categories (wide, position 4,0)
- Quick Add (small, position 7,0)
- Stats (medium, position 0,3)
- Clock (small, position 2,3)
- Notes (medium, position 3,3)

## Store Actions Reference

### Data Actions
- `setWidgets(widgets)` - Replace all widgets
- `addWidget(widget)` - Add a new widget
- `updateWidget(id, updates)` - Update widget properties
- `removeWidget(id)` - Remove a widget
- `reorderWidgets(layouts)` - Sync with react-grid-layout
- `duplicateWidget(id)` - Duplicate an existing widget
- `clearAllWidgets()` - Remove all widgets
- `autoOrganizeWidgets()` - Auto-organize widgets with harmonious sizing

### Project Filtering Actions
- `setCurrentProjectId(id)` - Set the current project filter (null = Home view)
- `getFilteredWidgets()` - Get widgets filtered by current project
- `selectWidgetsByProject(projectId)` - Get widgets for a specific project

### Modal Actions
- `openAddWidgetModal()` - Open add widget modal
- `closeAddWidgetModal()` - Close add widget modal
- `openEditWidgetModal(widget)` - Open edit modal for widget
- `closeEditWidgetModal()` - Close edit widget modal

### Utility Actions
- `getWidgetById(id)` - Get widget by ID
- `getWidgetsByType(type)` - Get all widgets of a type
- `getWidgetCount()` - Get total widget count (filtered by current project)
- `getDefaultWidgets()` - Get default widget configuration
- `resetToDefaults()` - Reset to default widgets

## Integration with Existing Stores

The widget store follows the same patterns as your existing stores:

- Similar to `useLinksStore` for data management
- Uses `persist` middleware like `useLayoutStore`
- Compatible with your existing modal patterns
- Follows your TypeScript typing conventions

## Example: Complete Widget Implementation

See `src/components/widgets/widget-manager-example.tsx` for:
- Complete widget grid with react-grid-layout
- Widget renderer component
- Add/Edit modal implementations
- Individual widget component examples
- Drag and drop handling
- Real-time updates

## TypeScript Types

All types are fully typed with TypeScript:

```typescript
import type {
  Widget,
  WidgetType,
  WidgetSize,
  WidgetTypeMetadata,
  WidgetConfigOptions
} from '@/types/widget';
```

## Best Practices

1. **Always use helper hooks** for getting widgets instead of directly accessing the store
2. **Sync layout changes** with `reorderWidgets()` after drag/drop
3. **Validate widget data** before adding/updating
4. **Use metadata** for consistent UI rendering
5. **Handle edge cases** like missing widgets or invalid IDs
6. **Persist important data** in widget config for stateful widgets
7. **Clean up effects** in widget components (especially clock, real-time data)

## Troubleshooting

### Widgets not persisting
- Check localStorage is enabled
- Verify `stacklume-widgets` key in localStorage
- Check browser console for errors

### Layout sync issues
- Ensure `reorderWidgets()` is called in `onLayoutChange`
- Verify layout IDs match widget IDs
- Check that layout dimensions are valid

### Widget not rendering
- Verify widget ID exists in store
- Check widget type is valid
- Ensure widget component is implemented

### Modal not opening
- Check modal state in store
- Verify modal component is mounted
- Check for conflicting modal states
