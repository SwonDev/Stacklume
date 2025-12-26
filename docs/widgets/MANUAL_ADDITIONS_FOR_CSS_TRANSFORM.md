# Manual Additions Required for CSS Transform Widget

Due to continuous linter/formatter activity, these additions need to be made manually:

## 1. Add to src/types/widget.ts

### Add the config interface (after TypographyScaleWidgetConfig, around line 836):

```typescript
// CSS Transform Widget Types
export interface CSSTransformWidgetConfig {
  transformConfig?: {
    rotate: number;
    rotateX: number;
    rotateY: number;
    rotateZ: number;
    scale: number;
    scaleX: number;
    scaleY: number;
    translateX: number;
    translateY: number;
    skewX: number;
    skewY: number;
    transformOrigin: string;
    perspective: number;
    enable3D: boolean;
  };
}
```

### Add to the WidgetConfig interface extends (after Partial<TypographyScaleWidgetConfig>, around line 907):

```typescript
    Partial<CSSTransformWidgetConfig>,
```

### Add to WIDGET_TYPE_METADATA (after 'typography-scale', around line 1678):

```typescript
  'css-transform': {
    type: 'css-transform',
    label: 'CSS Transform',
    description: 'CSS transform property generator with 2D/3D controls',
    icon: 'Move3D',
    defaultSize: 'medium',
    defaultTitle: 'CSS Transform',
    configurable: true,
  },
```

### The default config case was already added successfully (around line 2185)

## 2. Add to src/components/widgets/LazyWidgets.tsx

### Add the lazy import (after CSSGridWidget, around line 82):

```typescript
const CSSTransformWidget = lazy(() => import("./CSSTransformWidget").then(m => ({ default: m.CSSTransformWidget })));
```

### Add to widgetMap object (after "css-grid", around line 155):

```typescript
  "css-transform": CSSTransformWidget,
```

### Add to getSkeletonVariant function (in the "notes" case, around line 198):

```typescript
    case "css-transform":
```

### Add to exports (after CSSGridWidget, around line 320):

```typescript
  CSSTransformWidget,
```

### Add to specialWidgetTypes array (after "css-grid", around line 342):

```typescript
  "css-transform"
```

## Files Created

1. **C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\CSSTransformWidget.tsx** - COMPLETE AND READY
2. **C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\types\widget.ts** - Partially updated (default config added, still needs interface, metadata, and WidgetConfig extension)

## Widget Features

The CSS Transform Widget includes:

- Live preview box showing all transforms applied
- Individual transform function controls:
  - rotate (0-360deg) with slider
  - rotateX, rotateY, rotateZ for 3D (0-360deg each)
  - scale (0.1 to 3) - uniform scaling
  - scaleX, scaleY for non-uniform scaling
  - translateX, translateY (-200px to 200px)
  - skewX, skewY (-45deg to 45deg)
- Transform origin selector (9-point grid)
- Perspective slider for 3D transforms (100px - 2000px)
- Toggle 3D mode on/off
- Reset individual transforms or reset all
- 8 Presets: Flip Horizontal, Flip Vertical, Rotate 45°, Zoom In, Zoom Out, Skew Left, 3D Flip Card, Perspective Tilt
- Generated CSS transform property
- Generated transform-origin if not default
- Copy CSS to clipboard
- Animate toggle to see transform as animation
- Responsive using @container queries
- Config persistence via widget store

All code follows the existing widget patterns and uses shadcn/ui components, motion/react for animations, and lucide-react icons.
