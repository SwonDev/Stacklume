# Glassmorphism Widget - Required Additions to widget.ts

The GlassmorphismWidget component has been created successfully at:
`src/components/widgets/GlassmorphismWidget.tsx`

However, the following additions need to be made to `src/types/widget.ts`:

## 1. Add Interface Definition (around line 836, after TypographyScaleWidgetConfig)

```typescript
// Glassmorphism Widget Types
export interface GlassmorphismWidgetConfig {
  glassConfig?: {
    blurAmount: number;
    opacity: number;
    backgroundColor: string;
    borderRadius: number;
    borderWidth: number;
    borderColor: string;
    borderOpacity: number;
    shadowIntensity: number;
    backgroundGradient: string;
    lightText: boolean;
  };
}
```

## 2. Add to WidgetConfig extends list (around line 908, before closing brace)

Add this line before the closing brace of the `export interface WidgetConfig` extends clause:

```typescript
    Partial<TypographyScaleWidgetConfig>,
    Partial<GlassmorphismWidgetConfig> {
```

## 3. Add Widget Metadata (around line 1669, after 'typography-scale' entry)

```typescript
  'glassmorphism': {
    type: 'glassmorphism',
    label: 'Glassmorphism',
    description: 'Generador de CSS glassmorphism con efectos de vidrio',
    icon: 'Sparkles',
    defaultSize: 'medium',
    defaultTitle: 'Glassmorphism',
    configurable: true,
  },
```

## 4. Add Default Config (around line 2220, before 'default:' case in getDefaultWidgetConfig function)

```typescript
    case 'glassmorphism':
      return {
        glassConfig: {
          blurAmount: 10,
          opacity: 0.15,
          backgroundColor: '#ffffff',
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#ffffff',
          borderOpacity: 0.3,
          shadowIntensity: 0.2,
          backgroundGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          lightText: true,
        },
      };
```

## NOTE

The widget type 'glassmorphism' has already been added to the WidgetType union (line 78).

After making these changes, the widget should be fully functional and accessible through the widget selection UI.
