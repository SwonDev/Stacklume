# Damage Calculator Widget Integration Guide

## Files Created

1. **C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\DamageCalculatorWidget.tsx**
   - Main widget component with all features implemented

## Files Modified

### 1. src/types/widget.ts

#### Add to WidgetType union (line ~92):
```typescript
  | 'damage-calculator' // RPG Damage Formula Calculator with advanced features
```
**Status:** DONE

#### Add to WIDGET_TYPE_METADATA (after 'rpg-stats' around line 2102):
```typescript
  'damage-calculator': {
    type: 'damage-calculator',
    label: 'Damage Calculator',
    description: 'Advanced RPG damage formula calculator with presets and DPS analysis',
    icon: 'Calculator',
    defaultSize: 'large',
    defaultTitle: 'Damage Calculator',
    configurable: true,
  },
```
**Status:** NEEDS MANUAL ADD (file keeps being modified by linter)

#### Add to getDefaultWidgetConfig function (after 'rpg-stats' case around line 2841):
```typescript
    case 'damage-calculator':
      return {};
```
**Status:** NEEDS MANUAL ADD

### 2. src/components/widgets/LazyWidgets.tsx

#### Add lazy import (line ~105):
```typescript
const DamageCalculatorWidget = lazy(() => import("./DamageCalculatorWidget").then(m => ({ default: m.DamageCalculatorWidget })));
```
**Status:** DONE

#### Add to widgetMap (line ~208):
```typescript
  "damage-calculator": DamageCalculatorWidget,
```
**Status:** DONE

#### Add to getSkeletonVariant switch (line ~280):
```typescript
    case "damage-calculator":
```
**Status:** DONE

#### Add to specialWidgetTypes array (line ~460):
```typescript
  "rpg-stats", "damage-calculator", "frame-rate", "loot-table"
```
**Status:** DONE

#### Add to exports (line ~431):
```typescript
  DamageCalculatorWidget,
```
**Status:** DONE

## Widget Features Implemented

### Formula Editor
- Custom formula input with syntax highlighting
- 8 available variables: ATK, DEF, LVL, STR, DEX, INT, Power, Scaling
- Support for standard math operators and functions

### Preset Formulas
1. **Simple**: ATK - DEF
2. **Pokemon**: ((2*LVL/5+2)*Power*ATK/DEF/50+2)
3. **Dark Souls**: ATK * (1 + Scaling/100) - DEF * 0.75
4. **Percentage**: ATK * (100/(100+DEF))
5. **Final Fantasy**: (ATK * ATK / DEF) * (LVL + STR) / 256
6. **Custom**: User-defined formula

### Variable Sliders
- All 8 variables adjustable via sliders
- Real-time damage calculation
- Visual feedback with animated results

### Damage Display
- Base damage calculation
- Min/Max range with variance
- Critical hit damage
- Color-coded results

### Modifiers Tab
- Damage type selection (Physical, Magical, True)
- Element type (None, Fire, Ice, Lightning, Poison, Holy, Dark)
- Critical multiplier (1.5x - 5x)
- Random variance toggle (0-50%)
- Elemental bonus/penalty (-100% to +200%)
- Resistance multiplier (0x - 2x)

### Advanced Features
- **DPS Calculator**: Attack speed and crit chance settings
- **Damage vs Defense Graph**: Visual curve showing damage scaling
- **Scenario Testing**: Save and compare multiple configurations
- **Quick Comparison**: Test ATK+10%, DEF-10%, Scaling+20, Power+20
- **Export Options**:
  - JavaScript function
  - JSON configuration

### UI/UX
- Responsive @container queries
- Motion/React animations
- ScrollArea for content
- Tabs for organization
- Real-time formula validation
- Error handling with user feedback

## Manual Steps Required

To complete the integration, manually add the following to `src/types/widget.ts`:

1. **WIDGET_TYPE_METADATA entry** (search for `'rpg-stats':` and add after it)
2. **getDefaultWidgetConfig case** (search for `case 'rpg-stats':` in the function and add after it)

The file is being actively modified by a linter, so these additions need to be made when the file is stable.

## Testing

After completing the manual steps:

1. Run `pnpm dev` to start the development server
2. Add a new widget from the widget menu
3. Look for "Damage Calculator" in the Game Development section
4. Test all tabs and features
5. Verify formula calculations work correctly
6. Test export functionality
7. Verify responsive behavior at different sizes

## Features Summary

- Formula editor with 5 presets + custom
- 8 adjustable variables (ATK, DEF, LVL, STR, DEX, INT, Power, Scaling)
- Damage modifiers (type, element, crit, variance, resistance)
- DPS calculator with attack speed and crit chance
- Damage vs Defense curve visualization
- Scenario saving and batch testing
- Quick stat comparisons
- Export to JavaScript or JSON
- Full responsive design with @container queries
- Smooth animations with motion/react
- Error handling and validation
