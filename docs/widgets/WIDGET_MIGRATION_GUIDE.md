# Widget System Migration Guide

This guide helps you integrate the new widget management system into your existing Stacklume application.

## Prerequisites

Ensure you have the following dependencies installed:

```bash
npm install zustand react-grid-layout
npm install -D @types/react-grid-layout
```

## Files Created

The widget system consists of these new files:

### Type Definitions
- `src/types/widget.ts` - Core widget types and metadata
- `src/types/widget-utils.ts` - Utility functions
- `src/types/index.ts` - Centralized exports

### Store
- `src/stores/widget-store.ts` - Zustand store for widget management

### Components
- `src/components/widgets/widget-manager-example.tsx` - Basic examples
- `src/components/widgets/widget-integration-example.tsx` - Full integration examples

### Tests
- `src/stores/__tests__/widget-store.test.ts` - Unit tests

### Documentation
- `src/stores/WIDGET_STORE_GUIDE.md` - Detailed usage guide
- `WIDGET_SYSTEM.md` - System overview
- `WIDGET_MIGRATION_GUIDE.md` - This file

## Integration Steps

### Step 1: Verify Imports Work

First, test that the new files can be imported:

```typescript
// In any component
import { useWidgetStore } from '@/stores/widget-store';
import type { Widget, WidgetType } from '@/types/widget';

console.log('Widget store loaded:', useWidgetStore.getState().widgets);
```

If you see TypeScript errors, verify your `tsconfig.json` has the correct path mappings:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

### Step 2: Add react-grid-layout Styles

Add the required CSS to your main stylesheet or import in your layout component:

```typescript
// In your main App.tsx or layout component
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
```

Or add to your global CSS:

```css
/* Import react-grid-layout styles */
@import 'react-grid-layout/css/styles.css';
@import 'react-resizable/css/styles.css';

/* Custom widget styles */
.widget-wrapper {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.widget-wrapper.edit-mode {
  cursor: move;
  border: 2px dashed #ccc;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.widget-drag-handle {
  cursor: grab;
}

.widget-drag-handle:active {
  cursor: grabbing;
}
```

### Step 3: Update Existing Layout Store (Optional)

If you want to sync the widget store with your existing `layout-store.ts`, you can add these helpers:

```typescript
// In src/stores/layout-store.ts

import { useWidgetStore } from './widget-store';

// Add this action to your layout store
export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      // ... existing state

      // New action to sync with widget store
      syncWidgetLayouts: () => {
        const widgets = useWidgetStore.getState().widgets;
        const layouts = widgets.map(w => ({
          i: w.id,
          x: w.layout.x,
          y: w.layout.y,
          w: w.layout.w,
          h: w.layout.h,
        }));

        set({ layouts: { lg: layouts, md: layouts, sm: layouts } });
      },
    }),
    // ... existing persist config
  )
);
```

### Step 4: Create Your First Widget Page

Create a new page to test the widget system:

```typescript
// src/app/dashboard/page.tsx (or similar)
'use client';

import { WidgetDashboard } from '@/components/widgets/widget-integration-example';

export default function DashboardPage() {
  return (
    <div className="container">
      <WidgetDashboard />
    </div>
  );
}
```

### Step 5: Replace Hardcoded Widgets

If you have existing hardcoded widgets, migrate them to the widget store:

**Before:**
```typescript
// Hardcoded widgets
const widgets = [
  { id: '1', type: 'favorites', ... },
  { id: '2', type: 'recent', ... },
];
```

**After:**
```typescript
// Use widget store
const widgets = useWidgetStore((state) => state.widgets);
const addWidget = useWidgetStore((state) => state.addWidget);
const updateWidget = useWidgetStore((state) => state.updateWidget);
```

### Step 6: Implement Individual Widget Components

Create actual implementations for each widget type by referencing the examples:

```typescript
// src/components/widgets/FavoritesWidget.tsx
import { useLinksStore } from '@/stores/links-store';
import type { Widget } from '@/types/widget';

export function FavoritesWidget({ widget }: { widget: Widget }) {
  const links = useLinksStore((state) => state.links);
  const favoriteLinks = links.filter(link => link.isFavorite);

  // Your implementation
  return (
    <div className="widget favorites-widget">
      {/* ... */}
    </div>
  );
}
```

### Step 7: Add Widget Modals

Implement the add/edit modals using your existing modal patterns:

```typescript
// src/components/modals/AddWidgetModal.tsx
import { useWidgetStore } from '@/stores/widget-store';
import { WIDGET_TYPE_METADATA } from '@/types/widget';

export function AddWidgetModal() {
  const isOpen = useWidgetStore((state) => state.isAddWidgetModalOpen);
  const closeModal = useWidgetStore((state) => state.closeAddWidgetModal);
  const addWidget = useWidgetStore((state) => state.addWidget);

  // Your modal implementation following existing patterns
  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      {/* Modal content */}
    </Dialog>
  );
}
```

### Step 8: Add Widget Controls to UI

Add controls to your existing UI for managing widgets:

```typescript
// In your header/toolbar component
import { useWidgetStore } from '@/stores/widget-store';
import { useLayoutStore } from '@/stores/layout-store';

export function Toolbar() {
  const isEditMode = useLayoutStore((state) => state.isEditMode);
  const toggleEditMode = useLayoutStore((state) => state.toggleEditMode);
  const openAddModal = useWidgetStore((state) => state.openAddWidgetModal);

  return (
    <div className="toolbar">
      <button onClick={toggleEditMode}>
        {isEditMode ? 'Done' : 'Edit Layout'}
      </button>
      <button onClick={openAddModal} disabled={!isEditMode}>
        Add Widget
      </button>
    </div>
  );
}
```

## Common Integration Patterns

### Pattern 1: Widget Data Loading

Load data for widgets from your existing stores:

```typescript
function MyWidget({ widget }: { widget: Widget }) {
  const links = useLinksStore((state) => state.links);
  const isLoading = useLinksStore((state) => state.isLoading);

  // Filter links based on widget config
  const widgetLinks = React.useMemo(() => {
    return links
      .filter(/* your filter logic */)
      .slice(0, widget.config?.limit || 10);
  }, [links, widget.config]);

  if (isLoading) return <WidgetSkeleton />;

  return <div>{/* render widget */}</div>;
}
```

### Pattern 2: Widget Actions

Integrate widget actions with existing store actions:

```typescript
function LinkWidget({ widget }: { widget: Widget }) {
  const openEditLinkModal = useLinksStore((state) => state.openEditLinkModal);

  const handleLinkClick = (link: Link) => {
    openEditLinkModal(link);
  };

  return (
    <div>
      {links.map(link => (
        <div key={link.id} onClick={() => handleLinkClick(link)}>
          {link.title}
        </div>
      ))}
    </div>
  );
}
```

### Pattern 3: Widget Settings

Save widget-specific settings in the widget config:

```typescript
function SettingsModal({ widget }: { widget: Widget }) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const [limit, setLimit] = React.useState(widget.config?.limit || 10);

  const handleSave = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        limit,
        // other settings
      },
    });
  };

  return <div>{/* settings form */}</div>;
}
```

## Compatibility Notes

### With Existing Layout Store

The widget store is designed to work alongside your existing `layout-store.ts`:

- Widget positions are stored in the widget store
- Layout/grid configuration stays in layout store
- Edit mode should be managed by layout store
- Both stores can coexist without conflicts

### With Links Store

The widget store complements the links store:

- Links store manages link data
- Widget store manages widget layout and config
- Widgets display data from links store
- No circular dependencies

### With Database Schema

The widget system extends your existing schema:

```typescript
// Your schema already has a widgets table
export const widgets = pgTable("widgets", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 100 }),
  config: json("config").$type<WidgetConfig>(),
  // ...
});

// The widget store types extend this
import type { Widget } from '@/types/widget';
// This Widget type is compatible with your schema Widget type
```

## Testing Integration

### Test 1: Basic Store Operations

```typescript
import { useWidgetStore } from '@/stores/widget-store';

// In a test component or console
const store = useWidgetStore.getState();

console.log('Widgets:', store.widgets);
console.log('Count:', store.getWidgetCount());

// Add a widget
store.addWidget({
  type: 'clock',
  title: 'Test Clock',
  size: 'small',
  layout: { x: 0, y: 0, w: 1, h: 2 },
});

console.log('After add:', store.getWidgetCount());
```

### Test 2: Layout Sync

```typescript
// Test that layout changes sync correctly
const reorderWidgets = useWidgetStore((state) => state.reorderWidgets);

const newLayouts = [
  { i: 'widget-id', x: 5, y: 5, w: 2, h: 3 },
  // ... other layouts
];

reorderWidgets(newLayouts);

const widget = useWidgetStore.getState().getWidgetById('widget-id');
console.log('New position:', widget?.layout);
```

### Test 3: Persistence

```typescript
// Add widgets
useWidgetStore.getState().addWidget({ /* ... */ });

// Refresh page
location.reload();

// Check widgets are still there
console.log('After reload:', useWidgetStore.getState().widgets);
```

## Troubleshooting

### Issue: TypeScript errors on imports

**Solution:** Verify path aliases in `tsconfig.json` and restart TypeScript server.

### Issue: Widgets not persisting

**Solution:** Check localStorage is enabled and `stacklume-widgets` key exists.

### Issue: Layout not syncing

**Solution:** Ensure `reorderWidgets()` is called in `onLayoutChange` callback.

### Issue: Styles not applying

**Solution:** Import react-grid-layout CSS files in your app.

### Issue: Widgets overlapping

**Solution:** Use the `compactWidgets()` utility from `widget-utils.ts`.

## Next Steps

After integration:

1. **Customize widget styles** to match your design system
2. **Implement remaining widget types** specific to your app
3. **Add widget templates** for common configurations
4. **Create widget presets** for different use cases
5. **Add analytics** to track widget usage
6. **Implement sharing** to export/import widget configs

## Rollback Plan

If you need to rollback:

1. Remove widget store imports from your components
2. Delete widget-related files
3. Restore previous hardcoded widget implementation
4. Clear localStorage key: `stacklume-widgets`

The widget system is completely isolated and can be removed without affecting existing functionality.

## Support

- Check examples: `src/components/widgets/widget-integration-example.tsx`
- Read guide: `src/stores/WIDGET_STORE_GUIDE.md`
- Run tests: `npm test widget-store.test.ts`
- Review types: `src/types/widget.ts`

---

**Migration Version**: 1.0.0
**Last Updated**: 2025-12-08
