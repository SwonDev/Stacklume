import { create } from "zustand";
import type { Widget, WidgetType, WidgetSize } from "@/types/widget";
import { WIDGET_SIZE_PRESETS, WIDGET_TYPE_METADATA, getDefaultWidgetConfig } from "@/types/widget";
import type { Layout } from "react-grid-layout";
import { getCsrfHeaders } from "@/hooks/useCsrf";

/**
 * Helper to make API requests with CSRF token retry logic.
 * If a request fails with 403 (CSRF validation failure), it will:
 * 1. Make a GET request to refresh the CSRF token
 * 2. Retry the original request once
 */
async function fetchWithCsrfRetry(
  url: string,
  options: RequestInit,
  retried = false
): Promise<Response> {
  const response = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      ...options.headers,
      ...getCsrfHeaders(),
    },
  });

  // If we get a 403 and haven't retried yet, refresh CSRF token and retry
  if (response.status === 403 && !retried) {
    console.log("CSRF token expired or missing, refreshing...");
    // Make a GET request to get a fresh CSRF token
    await fetch("/api/widgets", { credentials: "include" });
    // Wait a bit for the cookie to be set
    await new Promise(resolve => setTimeout(resolve, 100));
    // Retry the original request
    return fetchWithCsrfRetry(url, options, true);
  }

  return response;
}

interface WidgetState {
  // Widgets data
  widgets: Widget[];
  isLoading: boolean;
  isInitialized: boolean;

  // Project filtering
  currentProjectId: string | null; // null = Home view

  // Actions
  setWidgets: (widgets: Widget[]) => void;
  addWidget: (widget: Omit<Widget, 'id'>) => Promise<void>;
  updateWidget: (id: string, updates: Partial<Omit<Widget, 'id'>>) => Promise<void>;
  removeWidget: (id: string) => Promise<void>;
  duplicateWidget: (id: string) => Promise<void>;
  toggleLock: (id: string) => Promise<void>;
  clearAllWidgets: () => Promise<void>;

  // Widget reordering and layout sync
  reorderWidgets: (layouts: Layout[]) => void;

  // Smart auto-organization (reorganizes + resizes for harmony)
  autoOrganizeWidgets: () => void;

  // Project filtering actions
  setCurrentProjectId: (id: string | null) => void;
  getFilteredWidgets: () => Widget[];
  selectWidgetsByProject: (projectId: string | null) => Widget[];

  // Modal states
  isAddWidgetModalOpen: boolean;
  isEditWidgetModalOpen: boolean;
  selectedWidget: Widget | null;

  // Modal actions
  openAddWidgetModal: () => void;
  closeAddWidgetModal: () => void;
  openEditWidgetModal: (widget: Widget) => void;
  closeEditWidgetModal: () => void;

  // Widget utilities
  getWidgetById: (id: string) => Widget | undefined;
  getWidgetsByType: (type: WidgetType) => Widget[];
  getWidgetCount: () => number;

  // Default widgets generator
  getDefaultWidgets: () => Widget[];
  resetToDefaults: () => Promise<void>;

  // DB operations
  initWidgets: () => Promise<void>;

  // Cleanup function to prevent memory leaks
  cleanup: () => void;
}

// Calculate next available position for a new widget
function calculateNextPosition(existingWidgets: Widget[], newWidgetSize: WidgetSize): { x: number; y: number } {
  const sizePreset = WIDGET_SIZE_PRESETS[newWidgetSize];
  const cols = 12;

  if (existingWidgets.length === 0) {
    return { x: 0, y: 0 };
  }

  const maxY = Math.max(...existingWidgets.map(w => w.layout.y + w.layout.h));
  let x = 0;
  let y = maxY;

  if (x + sizePreset.w > cols) {
    x = 0;
    y = maxY + 1;
  }

  return { x, y };
}

// Create default widgets for initial setup
function createDefaultWidgets(): Widget[] {
  const defaultConfigs: Array<{
    type: WidgetType;
    size: WidgetSize;
    x: number;
    y: number;
    categoryId?: string;
  }> = [
    { type: 'favorites', size: 'medium', x: 0, y: 0 },
    { type: 'recent', size: 'medium', x: 2, y: 0 },
    { type: 'categories', size: 'wide', x: 4, y: 0 },
    { type: 'quick-add', size: 'small', x: 7, y: 0 },
    { type: 'stats', size: 'medium', x: 0, y: 3 },
    { type: 'clock', size: 'small', x: 2, y: 3 },
    { type: 'notes', size: 'medium', x: 3, y: 3 },
  ];

  return defaultConfigs.map((config, index) => {
    const metadata = WIDGET_TYPE_METADATA[config.type];
    const sizePreset = WIDGET_SIZE_PRESETS[config.size];
    const defaultConfig = getDefaultWidgetConfig(config.type);

    return {
      id: `default-widget-${index}`,
      type: config.type,
      title: metadata.defaultTitle,
      size: config.size,
      categoryId: config.categoryId,
      config: defaultConfig,
      layout: {
        x: config.x,
        y: config.y,
        w: sizePreset.w,
        h: sizePreset.h,
      },
    };
  });
}

// Debounce timer map for layout updates (per store instance)
const layoutDebounceTimers = new Map<string, NodeJS.Timeout>();

export const useWidgetStore = create<WidgetState>()((set, get) => ({
  // Initial state
  widgets: [],
  isLoading: false,
  isInitialized: false,
  currentProjectId: null, // Start with Home view

  // Initialize widgets from database
  initWidgets: async () => {
    if (get().isInitialized) return;

    set({ isLoading: true });
    try {
      const response = await fetch("/api/widgets", { credentials: "include" });
      if (response.ok) {
        const widgets = await response.json();
        // Load whatever is in the database (even if empty)
        set({ widgets, isInitialized: true });
      }
    } catch (error) {
      console.error("Error loading widgets:", error);
      // On error, initialize with empty array
      set({ widgets: [], isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  // Widgets CRUD
  setWidgets: (widgets) => set({ widgets }),

  addWidget: async (widgetData) => {
    const sizePreset = WIDGET_SIZE_PRESETS[widgetData.size];
    // Use the current project ID from this store
    // Note: This should be synced from projects-store by the UI
    const currentProjectId = get().currentProjectId;

    // Calculate position based on widgets in the current project only
    const projectWidgets = get().selectWidgetsByProject(currentProjectId);
    const nextPosition = calculateNextPosition(projectWidgets, widgetData.size);

    // Determine the projectId to use:
    // 1. If explicitly passed (including null for Home), use that
    // 2. Otherwise, use the current project ID
    const effectiveProjectId = 'projectId' in widgetData ? widgetData.projectId : currentProjectId;

    const newWidgetData = {
      ...widgetData,
      projectId: effectiveProjectId,
      layout: {
        ...widgetData.layout,
        x: widgetData.layout.x ?? nextPosition.x,
        y: widgetData.layout.y ?? nextPosition.y,
        w: widgetData.layout.w ?? sizePreset.w,
        h: widgetData.layout.h ?? sizePreset.h,
      },
    };

    const response = await fetchWithCsrfRetry("/api/widgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newWidgetData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error creating widget - HTTP status:", response.status, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: Failed to create widget`);
    }

    const createdWidget = await response.json();
    set((state) => ({
      widgets: [...state.widgets, createdWidget],
    }));
    console.log('Widget added:', createdWidget);
  },

  updateWidget: async (id, updates) => {
    // Store original widgets for rollback
    const originalWidgets = get().widgets;

    // Optimistic update
    set((state) => ({
      widgets: state.widgets.map((widget) => {
        if (widget.id !== id) return widget;

        if (updates.size && updates.size !== widget.size) {
          const newSizePreset = WIDGET_SIZE_PRESETS[updates.size];
          return {
            ...widget,
            ...updates,
            layout: {
              ...widget.layout,
              ...(updates.layout || {}),
              w: newSizePreset.w,
              h: newSizePreset.h,
            },
          };
        }

        return {
          ...widget,
          ...updates,
          layout: {
            ...widget.layout,
            ...(updates.layout || {}),
          },
        };
      }),
    }));

    try {
      const response = await fetchWithCsrfRetry("/api/widgets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        // Revert on HTTP error
        console.error("Error updating widget - HTTP status:", response.status);
        set({ widgets: originalWidgets });
        return;
      }

      console.log('Widget updated:', id, updates);
    } catch (error) {
      // Revert on network error
      console.error("Error updating widget:", error);
      set({ widgets: originalWidgets });
    }
  },

  removeWidget: async (id) => {
    // Store original widgets for rollback
    const originalWidgets = get().widgets;
    const widgetToRemove = originalWidgets.find(w => w.id === id);

    // Optimistic update
    set((state) => ({
      widgets: state.widgets.filter((widget) => widget.id !== id),
    }));

    const currentState = get();
    if (currentState.selectedWidget?.id === id) {
      set({ selectedWidget: null, isEditWidgetModalOpen: false });
    }

    try {
      const response = await fetchWithCsrfRetry(`/api/widgets?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on HTTP error
        console.error("Error deleting widget - HTTP status:", response.status);
        if (widgetToRemove) {
          set({ widgets: originalWidgets });
        }
        return;
      }

      console.log('Widget removed:', id);
    } catch (error) {
      // Revert on network error
      console.error("Error deleting widget:", error);
      if (widgetToRemove) {
        set({ widgets: originalWidgets });
      }
    }
  },

  duplicateWidget: async (id) => {
    const widgets = get().widgets;
    const widgetToDuplicate = widgets.find((w) => w.id === id);

    if (!widgetToDuplicate) {
      console.error('Widget not found:', id);
      return;
    }

    // Destructure to remove id from the duplicate
    const { id: __id, ...widgetWithoutId } = widgetToDuplicate;

    // Create a duplicate with adjusted position
    const newWidget: Omit<Widget, 'id'> = {
      ...widgetWithoutId,
      title: `${widgetToDuplicate.title} (copia)`,
      // Preserve the projectId from the original widget
      projectId: widgetToDuplicate.projectId,
      layout: {
        ...widgetToDuplicate.layout,
        y: widgetToDuplicate.layout.y + widgetToDuplicate.layout.h, // Place below
      },
      // Reset kanban position if in kanban view
      kanbanOrder: widgetToDuplicate.kanbanOrder !== undefined
        ? widgetToDuplicate.kanbanOrder + 1
        : undefined,
    };

    // Use addWidget to create the duplicate
    await get().addWidget(newWidget);
    console.log('Widget duplicated:', id, 'in project:', widgetToDuplicate.projectId ?? 'Home');
  },

  toggleLock: async (id) => {
    const widget = get().widgets.find((w) => w.id === id);
    if (!widget) {
      console.error('Widget not found:', id);
      return;
    }

    const newLockedState = !widget.isLocked;

    // Update widget using updateWidget to persist to DB
    await get().updateWidget(id, { isLocked: newLockedState });
    console.log('Widget lock toggled:', id, '→', newLockedState ? 'locked' : 'unlocked');
  },

  clearAllWidgets: async () => {
    // Store original widgets for rollback
    const originalWidgets = get().widgets;
    const originalSelectedWidget = get().selectedWidget;
    const originalIsEditModalOpen = get().isEditWidgetModalOpen;

    // Optimistic update
    set({
      widgets: [],
      selectedWidget: null,
      isEditWidgetModalOpen: false,
    });

    try {
      const response = await fetchWithCsrfRetry("/api/widgets/clear", {
        method: "DELETE",
      });

      if (!response.ok) {
        // Revert on HTTP error
        console.error("Error clearing widgets - HTTP status:", response.status);
        set({
          widgets: originalWidgets,
          selectedWidget: originalSelectedWidget,
          isEditWidgetModalOpen: originalIsEditModalOpen,
        });
        return;
      }

      console.log('All widgets cleared');
    } catch (error) {
      // Revert on network error
      console.error("Error clearing widgets:", error);
      set({
        widgets: originalWidgets,
        selectedWidget: originalSelectedWidget,
        isEditWidgetModalOpen: originalIsEditModalOpen,
      });
    }
  },

  // Layout synchronization (debounced DB update)
  reorderWidgets: (layouts) => {
    set((state) => {
      const updatedWidgets = state.widgets.map((widget) => {
        const layoutItem = layouts.find((l) => l.i === widget.id);
        if (!layoutItem) return widget;

        return {
          ...widget,
          layout: {
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          },
        };
      });

      return { widgets: updatedWidgets };
    });

    // Debounce DB update with proper cleanup
    const timerKey = 'layout-update';
    const existingTimer = layoutDebounceTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
      layoutDebounceTimers.delete(timerKey);
    }

    const timer = setTimeout(async () => {
      try {
        await fetchWithCsrfRetry("/api/widgets/layouts", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ layouts }),
        });
        console.log('Widgets layouts saved to DB:', layouts.length, 'items');
      } catch (error) {
        console.error("Error saving layouts:", error);
      } finally {
        // Clean up timer reference after execution
        layoutDebounceTimers.delete(timerKey);
      }
    }, 500);

    layoutDebounceTimers.set(timerKey, timer);

    console.log('Widgets reordered:', layouts.length, 'items');
  },

  // Smart auto-organization algorithm with harmonious sizing
  autoOrganizeWidgets: () => {
    const currentProjectId = get().currentProjectId;
    const allWidgets = get().widgets;

    // Only organize widgets in the current project
    const projectWidgets = allWidgets.filter(w => {
      const widgetProjectId = w.projectId ?? null;
      return widgetProjectId === currentProjectId;
    });

    if (projectWidgets.length === 0) return;

    const COLS = 12;

    const typePriority: Record<WidgetType, number> = {
      'favorites': 100,
      'recent': 90,
      'categories': 80,
      'category': 70,
      'tag': 65,
      'stats': 60,
      'link-analytics': 58,
      'bookmarks': 55,
      'github-activity': 54,
      'bookmark-growth': 53,
      'search': 52,
      'quick-add': 50,
      'notes': 45,
      'todo': 43,
      'habit-tracker': 42,
      'progress': 41,
      'pomodoro': 40,
      'calendar': 38,
      'countdown': 37,
      'reading-streak': 36,
      'custom': 35,
      'tag-cloud': 34,
      'random-link': 33,
      'rss-feed': 32,
      'github-trending': 31,
      'github-search': 30,
      'steam-games': 29,
      'nintendo-deals': 28,
      'weather': 27,
      'quote': 27,
      'image': 26,
      'clock': 25,
      // Media & Embed widgets
      'codepen': 24,
      'spotify': 23,
      'youtube': 22,
      'crypto': 21,
      'world-clock': 20,
      'color-palette': 19,
      'unsplash': 18,
      'qr-code': 17,
      'website-monitor': 16,
      'embed': 15,
      'prompt': 14,
      'prompt-builder': 14,
      'mcp-explorer': 13,
      'deployment-status': 12,
      'voice-notes': 11,
      'link-manager': 10,
      // Social/News Feed widgets
      'twitter-feed': 9.5,
      'reddit': 9.4,
      'reddit-widget': 9.3,
      'hacker-news': 9.2,
      'product-hunt': 9.1,
      'devto-feed': 9.0,
      // Utility widgets
      'calculator': 8,
      'stopwatch': 7,
      'json-formatter': 6,
      'base64-tool': 5,
      'text-tools': 4,
      'password-generator': 3,
      'lorem-ipsum': 2,
      'dice-roller': 1,
      // Developer/Converter widgets
      'unit-converter': 0,
      'currency-converter': -1,
      'markdown-preview': -2,
      'regex-tester': -3,
      'color-converter': -4,
      'timezone-converter': -5,
      'hash-generator': -6,
      'ip-info': -7,
      // Generator/Calculator widgets
      'uuid-generator': -8,
      'number-converter': -9,
      'gradient-generator': -10,
      'box-shadow-generator': -11,
      'aspect-ratio': -12,
      'jwt-decoder': -13,
      'age-calculator': -14,
      'word-counter': -15,
      'css-filter': -16,
      // Web Design widgets
      'typography-scale': -17,
      'spacing-calculator': -18,
      'flexbox-playground': -19,
      'contrast-checker': -20,
      'css-animation': -21,
      'glassmorphism': -22,
      'neumorphism': -23,
      'tailwind-colors': -24,
      'css-grid': -25,
      'svg-wave': -26,
      'text-shadow-generator': -27,
      'clip-path-generator': -28,
      'css-transform': -29,
      // Game Development widgets
      'easing-functions': -30,
      'sprite-sheet': -31,
      'color-ramp': -32,
      'game-math': -33,
      'noise-generator': -34,
      'particle-system': -35,
      'screen-resolution': -36,
      'bezier-curve': -37,
      'rpg-stats': -38,
      'tilemap-editor': -39,
      'frame-rate': -40,
      'state-machine': -41,
      'pixel-art': -42,
      'loot-table': -43,
      // More Game Development widgets
      'hitbox-editor': -44,
      'pathfinding': -45,
      'dialogue-tree': -46,
      'skill-tree': -47,
      'wave-spawner': -48,
      'camera-shake': -49,
      'health-bar': -50,
      'damage-calculator': -51,
      'input-mapper': -52,
      'level-progress': -53,
      'behavior-tree': -54,
      'name-generator': -55,
      'inventory-grid': -56,
      'achievement': -57,
      'quest-designer': -58,
      'physics-playground': -59,
      // Organization & Productivity widgets
      'design-tokens': -60,
      'code-snippets': -61,
      'sprint-tasks': -62,
      'decision-log': -63,
      'eisenhower-matrix': -64,
      'standup-notes': -65,
      'mood-board': -66,
      'api-reference': -67,
      'meeting-notes': -68,
      'weekly-goals': -69,
      'parking-lot': -70,
      'pr-checklist': -71,
      'tech-debt': -72,
      'project-timeline': -73,
      'component-docs': -74,
      'wireframe': -75,
      'design-review': -76,
      'env-vars': -77,
      'git-commands': -78,
      'shadcn-builder': -79,
      // Wellness & Life Tracking widgets
      'mood-tracker': -80,
      'water-intake': -81,
      'sleep-log': -82,
      'breathing-exercise': -83,
      'gratitude-journal': -84,
      'daily-affirmations': -85,
      // Finance widgets
      'expense-tracker': -86,
      'budget-progress': -87,
      'savings-goal': -88,
      'subscription-manager': -89,
      // Advanced Productivity widgets
      'focus-score': -90,
      'time-blocking': -91,
      'daily-review': -92,
      'parking-lot-enhanced': -93,
      'energy-tracker': -94,
      // Entertainment & Media widgets
      'movie-tracker': -95,
      'book-tracker': -96,
      'anime-list': -97,
      'game-backlog': -98,
      'wishlist': -99,
      // AI & Intelligence widgets
      'ai-chat': -100,
      'ai-daily-summary': -101,
      'smart-suggestions': -102,
      // Design & Creativity widgets
      'color-of-day': -103,
      'font-pairing': -104,
      'design-inspiration': -105,
      'icon-picker': -106,
      'screenshot-mockup': -107,
      // Utility widgets (new)
      'clipboard-history': -108,
      'sticky-notes': -109,
      'link-previewer': -110,
      'site-status': -111,
      'api-tester': -112,
      'cron-builder': -113,
      'diff-viewer': -114,
      'password-manager': -115,
    };

    const sortedWidgets = [...projectWidgets].sort((a, b) => {
      return typePriority[b.type] - typePriority[a.type];
    });

    const count = sortedWidgets.length;

    interface LayoutSlot {
      w: number;
      h: number;
      size: WidgetSize;
    }

    const getHarmoniousLayout = (widgetCount: number): LayoutSlot[] => {
      const patterns: Record<number, LayoutSlot[]> = {
        1: [{ w: 6, h: 4, size: 'large' }],
        2: [
          { w: 6, h: 3, size: 'wide' },
          { w: 6, h: 3, size: 'wide' },
        ],
        3: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
        ],
        4: [
          { w: 6, h: 3, size: 'wide' },
          { w: 6, h: 3, size: 'wide' },
          { w: 6, h: 3, size: 'wide' },
          { w: 6, h: 3, size: 'wide' },
        ],
        5: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 6, h: 3, size: 'wide' },
          { w: 6, h: 3, size: 'wide' },
        ],
        6: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
        ],
        7: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
        ],
        8: [
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
        ],
        9: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
        ],
        10: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
        ],
        11: [
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 4, h: 3, size: 'medium' },
          { w: 6, h: 2, size: 'wide' },
          { w: 6, h: 2, size: 'wide' },
        ],
        12: [
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
          { w: 3, h: 3, size: 'medium' },
        ],
      };

      if (widgetCount <= 12 && patterns[widgetCount]) {
        return patterns[widgetCount];
      }

      const slots: LayoutSlot[] = [];
      const widgetsPerRow = Math.ceil(widgetCount / Math.ceil(widgetCount / 4));
      const widthPerWidget = Math.floor(COLS / widgetsPerRow);

      for (let i = 0; i < widgetCount; i++) {
        slots.push({ w: widthPerWidget, h: 3, size: 'medium' });
      }

      return slots;
    };

    const layoutSlots = getHarmoniousLayout(count);

    const grid: boolean[][] = [];
    const maxRows = 100;
    for (let y = 0; y < maxRows; y++) {
      grid[y] = new Array(COLS).fill(false);
    }

    const canPlace = (x: number, y: number, w: number, h: number): boolean => {
      if (x + w > COLS) return false;
      if (y + h > maxRows) return false;
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          if (grid[y + dy][x + dx]) return false;
        }
      }
      return true;
    };

    const occupy = (x: number, y: number, w: number, h: number) => {
      for (let dy = 0; dy < h; dy++) {
        for (let dx = 0; dx < w; dx++) {
          grid[y + dy][x + dx] = true;
        }
      }
    };

    const findBestPosition = (w: number, h: number): { x: number; y: number } => {
      for (let y = 0; y < maxRows; y++) {
        for (let x = 0; x <= COLS - w; x++) {
          if (canPlace(x, y, w, h)) {
            return { x, y };
          }
        }
      }
      return { x: 0, y: maxRows - h };
    };

    const organizedProjectWidgets = sortedWidgets.map((widget, index) => {
      const slot = layoutSlots[index] || { w: 3, h: 3, size: 'medium' as WidgetSize };
      const position = findBestPosition(slot.w, slot.h);
      occupy(position.x, position.y, slot.w, slot.h);

      return {
        ...widget,
        size: slot.size,
        layout: {
          x: position.x,
          y: position.y,
          w: slot.w,
          h: slot.h,
        },
      };
    });

    // Merge organized project widgets with widgets from other projects (unchanged)
    const otherProjectWidgets = allWidgets.filter(w => {
      const widgetProjectId = w.projectId ?? null;
      return widgetProjectId !== currentProjectId;
    });

    const allOrganizedWidgets = [...organizedProjectWidgets, ...otherProjectWidgets];

    set({ widgets: allOrganizedWidgets });

    // Save to DB (only the organized project widgets)
    const layouts = organizedProjectWidgets.map(w => ({
      i: w.id,
      x: w.layout.x,
      y: w.layout.y,
      w: w.layout.w,
      h: w.layout.h,
    }));

    fetchWithCsrfRetry("/api/widgets/layouts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layouts }),
    }).catch(console.error);

    console.log('Widgets auto-organized with harmonious sizes:', organizedProjectWidgets.length, 'items in project:', currentProjectId ?? 'Home');
  },

  // Project filtering
  setCurrentProjectId: (id) => {
    set({ currentProjectId: id });
    console.log('Current project changed to:', id ?? 'Home');
  },

  getFilteredWidgets: () => {
    const { widgets, currentProjectId } = get();
    return widgets.filter(widget => {
      // If widget has no projectId field or it's null, it belongs to Home
      const widgetProjectId = widget.projectId ?? null;
      return widgetProjectId === currentProjectId;
    });
  },

  selectWidgetsByProject: (projectId) => {
    const { widgets } = get();
    return widgets.filter(widget => {
      const widgetProjectId = widget.projectId ?? null;
      return widgetProjectId === projectId;
    });
  },

  // Modal states
  isAddWidgetModalOpen: false,
  isEditWidgetModalOpen: false,
  selectedWidget: null,

  // Modal actions
  openAddWidgetModal: () => set({ isAddWidgetModalOpen: true }),
  closeAddWidgetModal: () => set({ isAddWidgetModalOpen: false }),

  openEditWidgetModal: (widget) => {
    set({
      selectedWidget: widget,
      isEditWidgetModalOpen: true,
    });
  },

  closeEditWidgetModal: () => {
    set({
      selectedWidget: null,
      isEditWidgetModalOpen: false,
    });
  },

  // Utility functions
  getWidgetById: (id) => {
    return get().widgets.find((w) => w.id === id);
  },

  getWidgetsByType: (type) => {
    return get().widgets.filter((w) => w.type === type);
  },

  getWidgetCount: () => {
    // Count only widgets in the current project
    return get().getFilteredWidgets().length;
  },

  // Default widgets
  getDefaultWidgets: createDefaultWidgets,

  resetToDefaults: async () => {
    // Clear existing widgets
    await get().clearAllWidgets();

    // Create and save defaults
    const defaults = createDefaultWidgets();
    for (const widget of defaults) {
      await get().addWidget(widget);
    }

    set({
      isAddWidgetModalOpen: false,
      isEditWidgetModalOpen: false,
      selectedWidget: null,
    });

    console.log('Widgets reset to defaults');
  },

  // Cleanup all pending timers to prevent memory leaks
  cleanup: () => {
    // Clear all debounce timers
    layoutDebounceTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    layoutDebounceTimers.clear();
    console.log('Widget store cleanup completed');
  },
}));

// Helper hook to get widget layouts for react-grid-layout
export function useWidgetLayouts() {
  const widgets = useWidgetStore((state) => state.widgets);

  return widgets.map((widget) => {
    const sizePreset = WIDGET_SIZE_PRESETS[widget.size];

    return {
      i: widget.id,
      x: widget.layout.x,
      y: widget.layout.y,
      w: widget.layout.w,
      h: widget.layout.h,
      minW: sizePreset.minW,
      minH: sizePreset.minH,
    };
  });
}

// Helper hook to get a specific widget
export function useWidget(id: string): Widget | undefined {
  return useWidgetStore((state) => state.getWidgetById(id));
}

// Helper hook to get widgets by type
export function useWidgetsByType(type: WidgetType): Widget[] {
  return useWidgetStore((state) => state.getWidgetsByType(type));
}

// Helper hook to get filtered widgets by current project
export function useFilteredWidgets(): Widget[] {
  return useWidgetStore((state) => state.getFilteredWidgets());
}

// Helper hook to get widgets by specific project
export function useWidgetsByProject(projectId: string | null): Widget[] {
  return useWidgetStore((state) => state.selectWidgetsByProject(projectId));
}

// Helper hook to get current project ID
export function useCurrentProjectId(): string | null {
  return useWidgetStore((state) => state.currentProjectId);
}
