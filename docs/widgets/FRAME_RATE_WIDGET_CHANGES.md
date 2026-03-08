# Frame Rate Widget Integration Guide

The FrameRateWidget.tsx has been created successfully at:
`C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\FrameRateWidget.tsx`

## Remaining Manual Changes Required

Due to file modification conflicts (likely a linter/formatter running), please manually apply these changes:

### 1. Update `src/types/widget.ts`

#### Add to WidgetType union (around line 90):
```typescript
  | 'css-grid'        // CSS Grid visual generator
  | 'typography-scale' // Typography scale calculator for web designers
  | 'sprite-sheet'    // Sprite sheet cutter and animation previewer
  | 'frame-rate';     // Frame rate/time calculator for game optimization  <-- ADD THIS LINE
```

#### Add to WIDGET_TYPE_METADATA object (around line 1826):
```typescript
  'sprite-sheet': {
    type: 'sprite-sheet',
    label: 'Sprite Sheet',
    description: 'Corta sprite sheets y previsualiza animaciones para desarrollo de juegos',
    icon: 'Grid3x3',
    defaultSize: 'large',
    defaultTitle: 'Sprite Sheet Cutter',
    configurable: true,
  },
  'frame-rate': {                                                    // <-- ADD THIS ENTRY
    type: 'frame-rate',
    label: 'Frame Rate Calculator',
    description: 'FPS/ms converter and game optimization toolkit',
    icon: 'Gauge',
    defaultSize: 'medium',
    defaultTitle: 'Frame Rate Calculator',
    configurable: false,
  },
};
```

#### Add to getDefaultWidgetConfig function (around line 2517):
```typescript
    case 'sprite-sheet':
      return {
        spriteImageUrl: '',
        spriteGridMode: 'rows-cols',
        spriteRows: 1,
        spriteCols: 1,
        spriteFrameWidth: 32,
        spriteFrameHeight: 32,
        spriteOffsetX: 0,
        spriteOffsetY: 0,
        spritePaddingX: 0,
        spritePaddingY: 0,
      };

    case 'frame-rate':                  // <-- ADD THIS CASE
      return {};

    default:
      return {};
```

### 2. Update `src/components/widgets/LazyWidgets.tsx`

#### Add lazy import (around line 92):
```typescript
const ClipPathWidget = lazy(() => import("./ClipPathWidget").then(m => ({ default: m.ClipPathWidget })));
const FrameRateWidget = lazy(() => import("./FrameRateWidget").then(m => ({ default: m.FrameRateWidget })));  // <-- ADD THIS LINE
```

#### Add to widgetMap (around line 177):
```typescript
  "css-transform": CSSTransformWidget,
  "clip-path-generator": ClipPathWidget,
  "frame-rate": FrameRateWidget,           // <-- ADD THIS LINE
};
```

#### Add to getSkeletonVariant function (around line 200):
```typescript
    case "aspect-ratio":
    case "age-calculator":
    case "contrast-checker":
    case "spacing-calculator":
    case "typography-scale":
    case "frame-rate":                      // <-- ADD THIS LINE
      return "clock";
```

#### Add to specialWidgetTypes array (around line 388):
```typescript
  "uuid-generator", "number-converter", "gradient-generator", "box-shadow-generator",
  "text-shadow-generator", "aspect-ratio", "jwt-decoder", "age-calculator", "word-counter",
  "svg-wave", "contrast-checker", "spacing-calculator", "typography-scale", "css-grid", "flexbox-playground",
  "glassmorphism", "neumorphism", "css-animation", "tailwind-colors", "css-filter", "css-transform", "clip-path-generator",
  "frame-rate"                              // <-- ADD THIS TO THE END
];
```

#### Add to export list (around line 364):
```typescript
  CSSFilterWidget,
  CSSTransformWidget,
  ClipPathWidget,
  FrameRateWidget,                          // <-- ADD THIS LINE
};
```

## Widget Features

The FrameRateWidget includes:
- **Convert Tab**: FPS ↔ ms bidirectional converter with common presets (30, 60, 120, 144, 240 FPS)
- **Budget Tab**: Frame time budget breakdown with pie chart visualization and adjustable percentages
- **V-Sync Tab**: Display refresh rate matching calculator with sync recommendations
- **Advanced Tab**:
  - Time scale slider for slow-mo/fast-forward simulations
  - Fixed timestep calculator with code export
  - Export all values as code constants

All values are live-calculated and can be copied as code constants for game development.

## Testing

After making the changes above, run:
```bash
cd C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume
pnpm dev
```

Then add a Frame Rate Calculator widget from the widget menu to test all functionality.
