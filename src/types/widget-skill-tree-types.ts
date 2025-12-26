// Skill Tree Widget Types - Temporary file for adding to widget.ts

export interface SkillNode {
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
  statBonuses: Array<{
    stat: string;
    value: number;
    perLevel: boolean;
  }>;
}

export interface SkillConnection {
  from: string;
  to: string;
}

export interface SkillTreeWidgetConfig {
  nodes?: SkillNode[];
  connections?: SkillConnection[];
  availablePoints?: number;
  spentPoints?: number;
  totalStats?: Record<string, number>;
  isPreviewMode?: boolean;
  previewSnapshot?: {
    nodes: SkillNode[];
    availablePoints: number;
    spentPoints: number;
  };
}

// Add this to WidgetConfig interface:
//     Partial<SkillTreeWidgetConfig>,

// Add this to WIDGET_TYPE_METADATA:
/*
  'skill-tree': {
    type: 'skill-tree',
    label: 'Skill Tree',
    description: 'Visual skill/talent tree editor with node connections',
    icon: 'Zap',
    defaultSize: 'large',
    defaultTitle: 'Skill Tree Editor',
    configurable: true,
  },
*/

// Add this to getDefaultWidgetConfig:
/*
    case 'skill-tree':
      return {
        nodes: [],
        connections: [],
        availablePoints: 10,
        spentPoints: 0,
        totalStats: {},
        isPreviewMode: false,
      };
*/
