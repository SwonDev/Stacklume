# Particle System Widget Integration Guide

## Created Widget File

**File:** `C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\ParticleSystemWidget.tsx`

This is a complete, production-ready particle system widget with:
- Canvas-based real-time particle rendering
- 8 preset effects: fire, smoke, sparks, explosion, rain, snow, magic, confetti
- Full parameter controls for emission, motion, appearance
- Burst mode for one-time emissions
- Blend modes (normal, additive)
- Export configuration as JSON
- Copy complete JavaScript class code
- Real-time preview with play/pause/restart controls
- Responsive design with @container queries
- Persistent configuration storage

## Required Integration Steps

###  1. Add Widget Type to `src/types/widget.ts`

Add `'particle-system'` to the WidgetType union (around line 89):

```typescript
  | 'typography-scale' // Typography scale calculator for web designers
  | 'particle-system' // Particle system VFX preview/editor for game development
  | 'easing-functions' // Easing functions visualizer for game developers
```

### 2. Add Config Interface to `src/types/widget.ts`

Add after `TypographyScaleWidgetConfig` (around line 851):

```typescript
// Particle System Widget Types
export interface ParticleSystemWidgetConfig {
  particleConfig?: {
    // Emission
    emissionRate: number;
    burstCount: number;
    lifetime: number;

    // Motion
    speed: number;
    speedVariation: number;
    direction: number;
    spreadAngle: number;
    gravity: number;

    // Size
    startSize: number;
    endSize: number;

    // Color
    startColor: string;
    endColor: string;

    // Alpha
    fadeIn: number;
    fadeOut: number;

    // Rotation
    rotation: number;
    angularVelocity: number;

    // Rendering
    blendMode: 'normal' | 'additive';

    // Preset
    preset?: 'fire' | 'smoke' | 'sparks' | 'explosion' | 'rain' | 'snow' | 'magic' | 'confetti';
  };
}
```

### 3. Add to WidgetConfig Interface

In the `WidgetConfig` interface (around line 914), add:

```typescript
export interface WidgetConfig
  extends Partial<BaseWidgetConfig>,
    // ... other partial configs ...
    Partial<ParticleSystemWidgetConfig>,
```

### 4. Add Widget Metadata

In `WIDGET_TYPE_METADATA` object (around line 1705), add:

```typescript
'particle-system': {
  type: 'particle-system',
  label: 'Particle System',
  description: 'VFX particle system preview and editor for game development',
  icon: 'Sparkles',
  defaultSize: 'large',
  defaultTitle: 'Particle System',
  configurable: true,
},
```

### 5. Add Default Config

In `getDefaultWidgetConfig` function (around line 2350), add:

```typescript
case 'particle-system':
  return {
    particleConfig: {
      emissionRate: 30,
      burstCount: 50,
      lifetime: 2,
      speed: 100,
      speedVariation: 0.3,
      direction: 270,
      spreadAngle: 45,
      gravity: 50,
      startSize: 10,
      endSize: 5,
      startColor: '#3B82F6',
      endColor: '#8B5CF6',
      fadeIn: 0.1,
      fadeOut: 0.5,
      rotation: 0,
      angularVelocity: 50,
      blendMode: 'normal',
    },
  };
```

### 6. Update `src/components/widgets/LazyWidgets.tsx`

Add lazy import (around line 92):

```typescript
const ParticleSystemWidget = lazy(() => import("./ParticleSystemWidget").then(m => ({ default: m.ParticleSystemWidget })));
```

Add to widgetMap (around line 177):

```typescript
const widgetMap: Record<string, LazyWidgetComponent> = {
  // ... other widgets ...
  "particle-system": ParticleSystemWidget,
};
```

Add to exports (around line 364):

```typescript
export {
  // ... other exports ...
  ParticleSystemWidget,
};
```

Add to specialWidgetTypes array (around line 388):

```typescript
export const specialWidgetTypes = [
  // ... other types ...
  "particle-system",
];
```

Add skeleton variant mapping in `getSkeletonVariant` function (around line 220):

```typescript
case "particle-system":
  return "notes";
```

## Features Implemented

### Particle System Controls

**Emission Tab:**
- Emission Rate (0-200 particles/second)
- Burst Count (10-500 particles)
- Lifetime (0.1-10 seconds)
- Speed (0-500 pixels/second)
- Speed Variation (0-100%)
- Direction (0-360 degrees)
- Spread Angle (0-360 degrees)
- Gravity (-200 to 500)

**Appearance Tab:**
- Start Size (1-50 pixels)
- End Size (1-50 pixels)
- Start Color (color picker + hex input)
- End Color (color picker + hex input)
- Fade In (0-100%)
- Fade Out (0-100%)
- Rotation Speed (0-360 degrees/second)
- Blend Mode (Normal/Additive)

**Presets Tab:**
- Fire
- Smoke
- Sparks
- Explosion
- Rain
- Snow
- Magic
- Confetti

**Export Tab:**
- Download Configuration (JSON file)
- Copy Configuration (JSON to clipboard)
- Copy Particle System Code (Complete JavaScript class)

### Technical Implementation

- **Canvas Rendering:** Uses HTML5 Canvas with requestAnimationFrame for smooth 60fps animation
- **Performance:** Efficient particle pooling and cleanup
- **Particle Physics:**
  - Velocity-based movement
  - Gravity simulation
  - Rotation with angular velocity
  - Size interpolation over lifetime
  - Color gradients over lifetime
  - Alpha fading (fade in/out)
- **Responsive:** Uses @container queries for adaptive sizing
- **State Management:** Persists configuration to widget store with debouncing
- **Real-time Preview:** Live particle count display
- **Playback Controls:** Play, Pause, Restart, Burst emission

### Code Export

The widget can export a complete, standalone JavaScript class:
- Full `ParticleSystem` class implementation
- All particle physics and rendering logic
- Helper functions (hexToRgb, lerp)
- Usage example
- Ready to copy-paste into any JavaScript/TypeScript game project

## Usage

1. Add widget from widget picker
2. Select a preset or customize parameters
3. Click Play to start particle emission
4. Use Burst button for one-time emissions
5. Adjust parameters in real-time
6. Export configuration or code when satisfied

## Technical Notes

- Default canvas size: 800x400 pixels (responsive to container)
- Particle system spawns from canvas center
- Uses linear interpolation for smooth transitions
- Additive blend mode creates glowing effects (great for fire, magic, sparks)
- Normal blend mode better for smoke, rain, snow
- Configuration auto-saves with 300ms debounce

## File Paths Summary

**Created:**
- `C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\ParticleSystemWidget.tsx`

**To Edit:**
- `C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\types\widget.ts`
- `C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\LazyWidgets.tsx`

All integration steps are clearly documented above with exact line numbers and code snippets.
