# Skill Tree Widget Integration Guide

The SkillTreeWidget.tsx has been created at:
`C:\Users\swon_\OneDrive\Documentos\PROYECTOS\VIBECLAUDE\Stacklume\src\components\widgets\SkillTreeWidget.tsx`

## Manual Integration Steps Required

Due to file linting/watching, these manual additions are needed:

### 1. LazyWidgets.tsx

**Add lazy import (around line 110):**
```typescript
const SkillTreeWidget = lazy(() => import("./SkillTreeWidget").then(m => ({ default: m.SkillTreeWidget })));
```

**Add to widgetMap (around line 213):**
```typescript
"skill-tree": SkillTreeWidget,
```

**Add to skeleton variant mapping (around line 286):**
```typescript
case "skill-tree":
  return "notes";
```

**Add to specialWidgetTypes array (at the end, around line 460):**
```typescript
"skill-tree"
```

**Add to exports (at the end, around line 450):**
```typescript
SkillTreeWidget,
```

### 2. widget.ts - Type Definition

**Already added:**
- ✓ 'skill-tree' added to WidgetType union (line 108)

**Still needs to be added - WidgetConfig interface (around line 1107-1109):**

Add this partial before the closing bracket of the WidgetConfig interface:
```typescript
    Partial<{
      nodes?: Array<{
        id: string;
        name: string;
        description: string;
        icon: string;
        cost: number;
        maxLevel: number;
        currentLevel: number;
        category: 'combat' | 'magic' | 'utility' | 'passive';
        prerequisites: string[];
        position: { x: number; y: number };
        tier: number;
        statBonuses: Array<{ stat: string; value: number; perLevel: boolean }>;
      }>;
      connections?: Array<{ from: string; to: string }>;
      availablePoints?: number;
      spentPoints?: number;
      totalStats?: Record<string, number>;
      isPreviewMode?: boolean;
      previewSnapshot?: any;
    }>,
```

### 3. widget.ts - WIDGET_TYPE_METADATA

**Add to WIDGET_TYPE_METADATA object (search for 'tilemap-editor' and add after it, around line 2015):**
```typescript
  'skill-tree': {
    type: 'skill-tree',
    label: 'Skill Tree',
    description: 'Visual skill/talent tree editor with node connections',
    icon: 'Zap',
    defaultSize: 'large',
    defaultTitle: 'Skill Tree Editor',
    configurable: true,
  },
```

### 4. widget.ts - getDefaultWidgetConfig

**Add to getDefaultWidgetConfig function (search for 'tilemap-editor' case and add after it, around line 2800):**
```typescript
    case 'skill-tree':
      return {
        nodes: [],
        connections: [],
        availablePoints: 10,
        spentPoints: 0,
        totalStats: {},
        isPreviewMode: false,
      };
```

## Widget Features

The Skill Tree Widget includes:

1. **Node Management**
   - Add/edit/delete skill nodes
   - Set name, description, icon (emoji picker)
   - Configure cost, max level, category
   - Define stat bonuses (per-level or total)
   - Position nodes visually

2. **Connections & Prerequisites**
   - Visual connection mode
   - Link skills with prerequisite requirements
   - SVG connection lines showing unlock state

3. **Point Allocation**
   - Allocate points to unlock/upgrade skills
   - Refund points with dependency checking
   - Track available/spent points
   - Lock/unlock based on prerequisites

4. **Categories**
   - Combat (red, Sword icon)
   - Magic (purple, Sparkles icon)
   - Utility (blue, Target icon)
   - Passive (green, Shield icon)

5. **Preview Mode**
   - Test allocations without committing
   - Snapshot and restore functionality

6. **Zoom & Pan**
   - Mouse wheel zoom (0.5x - 2x)
   - Click + drag or middle-click to pan
   - Zoom in/out buttons

7. **Stats Display**
   - Real-time total stats calculation
   - Shows bonuses from allocated skills
   - Supports per-level and flat bonuses

8. **Export Functions**
   - Export as JSON
   - Export as JavaScript module
   - Copy to clipboard

9. **Preset Templates**
   - Warrior (physical combat tree)
   - Mage (magical abilities tree)
   - Rogue (stealth and agility tree)

10. **UI Features**
    - Tooltips with skill details
    - Visual feedback for locked/unlocked/maxed skills
    - Connection line highlighting
    - Responsive container queries
    - Motion animations for nodes

## File Paths

- Widget Component: `src/components/widgets/SkillTreeWidget.tsx`
- Type Definitions: `src/types/widget.ts` (needs updates)
- Lazy Loading: `src/components/widgets/LazyWidgets.tsx` (needs updates)
- Widget Store: Already compatible via `useWidgetStore`

## Testing

After integration, test by:
1. Add widget via dashboard
2. Load a preset template (Warrior/Mage/Rogue)
3. Allocate points to skills
4. Test connection mode
5. Try preview mode
6. Export as JSON/JS
7. Zoom and pan the canvas
8. Edit a skill node
