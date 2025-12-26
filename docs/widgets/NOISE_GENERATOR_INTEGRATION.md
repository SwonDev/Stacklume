# Noise Generator Widget - Integration Guide

The NoiseGeneratorWidget has been successfully created at:
`src/components/widgets/NoiseGeneratorWidget.tsx`

## Remaining Integration Steps

Due to file locking/linting, please make the following manual changes:

### 1. Add to `src/types/widget.ts`

#### A. Add to WidgetType union (around line 89-93):
```typescript
  | 'pixel-art'       // Pixel art canvas for game asset sketching
  | 'noise-generator'; // Procedural noise generator and visualizer
```

#### B. Add config interface (after SpriteSheetWidgetConfig, around line 862):
```typescript
// Noise Generator Widget Types
export type NoiseType = 'perlin' | 'simplex' | 'worley' | 'value' | 'white';
export type NoiseColorMapping = 'grayscale' | 'terrain' | 'heat' | 'ocean' | 'forest' | 'custom';
export type NoiseDimensionMode = '1d' | '2d';

export interface NoiseGeneratorWidgetConfig {
  noiseType?: NoiseType;
  scale?: number;
  octaves?: number;
  persistence?: number;
  lacunarity?: number;
  seed?: number;
  colorMapping?: NoiseColorMapping;
  tileable?: boolean;
  dimensionMode?: NoiseDimensionMode;
  customGradient?: Array<{ position: number; color: string }>;
  canvasWidth?: number;
  canvasHeight?: number;
}
```

#### C. Add to WidgetConfig interface (around line 935):
```typescript
    Partial<SpriteSheetWidgetConfig>,
    Partial<NoiseGeneratorWidgetConfig> {
```

#### D. Add to WIDGET_TYPE_METADATA (around line 1770):
```typescript
  'noise-generator': {
    type: 'noise-generator',
    label: 'Noise Generator',
    description: 'Procedural noise generator with Perlin, Simplex, Worley algorithms',
    icon: 'Waves',
    defaultSize: 'large',
    defaultTitle: 'Noise Generator',
    configurable: true,
  },
```

#### E. Add to getDefaultWidgetConfig function (before default case, around line 2450):
```typescript
    case 'noise-generator':
      return {
        noiseType: 'perlin',
        scale: 50,
        octaves: 4,
        persistence: 0.5,
        lacunarity: 2,
        seed: Math.floor(Math.random() * 10000),
        colorMapping: 'grayscale',
        tileable: false,
        dimensionMode: '2d',
        canvasWidth: 400,
        canvasHeight: 300,
      };
```

### 2. Add to `src/components/widgets/LazyWidgets.tsx`

#### A. Add lazy import (around line 93):
```typescript
const ClipPathWidget = lazy(() => import("./ClipPathWidget").then(m => ({ default: m.ClipPathWidget })));
const NoiseGeneratorWidget = lazy(() => import("./NoiseGeneratorWidget").then(m => ({ default: m.NoiseGeneratorWidget })));
```

#### B. Add to widgetMap (around line 178):
```typescript
  "clip-path-generator": ClipPathWidget,
  "noise-generator": NoiseGeneratorWidget,
};
```

#### C. Add to getSkeletonVariant switch (around line 232):
```typescript
    case "clip-path-generator":
    case "noise-generator":
      return "notes";
```

#### D. Add to exports (around line 365):
```typescript
  ClipPathWidget,
  NoiseGeneratorWidget,
};
```

#### E. Add to specialWidgetTypes array (around line 388):
```typescript
  "glassmorphism", "neumorphism", "css-animation", "tailwind-colors", "css-filter", "css-transform", "clip-path-generator",
  "noise-generator"
];
```

## Widget Features

The NoiseGeneratorWidget includes:

### Noise Algorithms
- **Perlin Noise**: Classic gradient noise for natural-looking patterns
- **Simplex Noise**: Improved Perlin with fewer directional artifacts
- **Worley/Voronoi Noise**: Cellular patterns based on distance fields
- **Value Noise**: Simpler interpolation-based noise
- **White Noise**: Pure random noise

### Features
- **Real-time canvas preview** (400x300px, pixelated rendering)
- **Adjustable parameters**:
  - Scale (1-200)
  - Octaves (1-8) for fractal noise
  - Persistence (0-1) controls amplitude falloff
  - Lacunarity (1-4) controls frequency increase
  - Seed input for reproducible results
- **Color mappings**:
  - Grayscale
  - Terrain (water, beach, grass, forest, mountain, snow)
  - Heat map (blue → red → orange → yellow)
  - Ocean (deep → mid → shallow)
  - Forest (dark → mid → light)
- **Visualization modes**:
  - 2D noise visualization
  - 1D noise (horizontal strips)
- **Tileable/seamless** noise option using domain warping
- **Export as PNG** with automatic filename
- **Copy generation code** to clipboard
- **Responsive design** with @container queries
- **Config persistence** via widget store

### Use Cases
- Procedural texture generation
- Terrain height maps
- Cloud patterns
- Organic textures
- Game development
- Creative coding
- Data visualization

All noise algorithms are implemented from scratch with proper seeded random number generation for reproducibility.
