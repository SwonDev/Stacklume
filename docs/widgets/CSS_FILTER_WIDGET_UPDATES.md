# CSS Filter Widget - Required Updates to widget.ts

The CSSFilterWidget.tsx has been created successfully. Now you need to add the following to `src/types/widget.ts`:

## 1. Add to WidgetType union (around line 74-75, after 'word-counter')

```typescript
  | 'word-counter'    // Word/character counter
  | 'css-filter'      // CSS filter property generator for image effects
```

## 2. Add CSSFilterWidgetConfig interface (after WordCounterWidgetConfig, around line 743)

```typescript
// CSS Filter Widget Types
export interface CSSFilterWidgetConfig {
  cssFilters?: {
    blur: number;
    brightness: number;
    contrast: number;
    grayscale: number;
    hueRotate: number;
    invert: number;
    opacity: number;
    saturate: number;
    sepia: number;
    dropShadowX: number;
    dropShadowY: number;
    dropShadowBlur: number;
    dropShadowColor: string;
  };
  cssFilterImageUrl?: string;
}
```

## 3. Add to WidgetConfig interface extends list (around line 840)

Add `Partial<CSSFilterWidgetConfig>` to the interface extends list

## 4. Add to WIDGET_TYPE_METADATA (after 'word-counter', around line 1603)

```typescript
  'css-filter': {
    type: 'css-filter',
    label: 'CSS Filter',
    description: 'Genera filtros CSS para efectos de imagen con vista previa',
    icon: 'Sliders',
    defaultSize: 'large',
    defaultTitle: 'CSS Filter Generator',
    configurable: true,
  },
```

## 5. Add to getDefaultWidgetConfig function (add new case around line 2110)

```typescript
    case 'css-filter':
      return {
        cssFilters: {
          blur: 0,
          brightness: 100,
          contrast: 100,
          grayscale: 0,
          hueRotate: 0,
          invert: 0,
          opacity: 100,
          saturate: 100,
          sepia: 0,
          dropShadowX: 0,
          dropShadowY: 0,
          dropShadowBlur: 0,
          dropShadowColor: '#000000',
        },
        cssFilterImageUrl: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
      };
```

## 6. Update widget-store.ts typePriority (around line 450)

Add this entry somewhere in the typePriority object:
```typescript
      'css-filter': -15,
```

## 7. Add to LazyWidgets.tsx

Import and export the CSSFilterWidget component in `src/components/widgets/LazyWidgets.tsx`

That's it! Once these changes are applied, the CSS Filter widget will be fully integrated into the system.
