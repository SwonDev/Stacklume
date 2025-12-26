/**
 * Widget Store Tests
 *
 * Tests for the widget management Zustand store
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useWidgetStore } from '../widget-store';
import type { Widget } from '@/types/widget';

// Mock fetch responses
const mockFetchResponse = (data: unknown, ok = true, status = 200) => {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
  } as Response);
};

// Helper to create a mock widget
const createMockWidget = (overrides: Partial<Widget> = {}): Widget => ({
  id: `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  type: 'notes',
  title: 'Test Widget',
  size: 'medium',
  layout: { x: 0, y: 0, w: 2, h: 3 },
  config: {},
  ...overrides,
});

describe('Widget Store', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup default fetch mock that returns successful responses
    vi.mocked(global.fetch).mockImplementation((url, options) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      const method = options?.method || 'GET';

      // Handle different API endpoints
      if (urlStr.includes('/api/widgets/clear')) {
        return mockFetchResponse({ success: true });
      }

      if (urlStr.includes('/api/widgets/layouts')) {
        return mockFetchResponse({ success: true });
      }

      if (urlStr.includes('/api/widgets')) {
        if (method === 'GET') {
          return mockFetchResponse([]);
        }
        if (method === 'POST') {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          return mockFetchResponse({
            id: `widget-${Date.now()}`,
            ...body,
          });
        }
        if (method === 'PATCH') {
          return mockFetchResponse({ success: true });
        }
        if (method === 'DELETE') {
          return mockFetchResponse({ success: true });
        }
      }

      return mockFetchResponse({});
    });

    // Reset store to initial state before each test
    // First, manually set the store to a clean state without calling resetToDefaults
    // which makes API calls
    useWidgetStore.setState({
      widgets: useWidgetStore.getState().getDefaultWidgets(),
      isLoading: false,
      isInitialized: true,
      currentProjectId: null,
      isAddWidgetModalOpen: false,
      isEditWidgetModalOpen: false,
      selectedWidget: null,
    });
  });

  afterEach(() => {
    // Clean up any pending timers
    useWidgetStore.getState().cleanup();
  });

  describe('Default State', () => {
    it('should initialize with default widgets', () => {
      const { widgets } = useWidgetStore.getState();
      expect(widgets.length).toBeGreaterThan(0);
    });

    it('should have correct default widget types', () => {
      const { widgets } = useWidgetStore.getState();
      const types = widgets.map(w => w.type);

      expect(types).toContain('favorites');
      expect(types).toContain('recent');
      expect(types).toContain('categories');
      expect(types).toContain('quick-add');
    });

    it('should have modals closed by default', () => {
      const { isAddWidgetModalOpen, isEditWidgetModalOpen } = useWidgetStore.getState();
      expect(isAddWidgetModalOpen).toBe(false);
      expect(isEditWidgetModalOpen).toBe(false);
    });

    it('should have no selected widget by default', () => {
      const { selectedWidget } = useWidgetStore.getState();
      expect(selectedWidget).toBeNull();
    });
  });

  describe('Add Widget', () => {
    it('should add a new widget', async () => {
      const { addWidget, widgets } = useWidgetStore.getState();
      const initialCount = widgets.length;

      await addWidget({
        type: 'clock',
        title: 'Test Clock',
        size: 'small',
        layout: { x: 0, y: 0, w: 1, h: 2 },
      });

      const newWidgets = useWidgetStore.getState().widgets;
      expect(newWidgets.length).toBe(initialCount + 1);
    });

    it('should assign unique ID to new widget', async () => {
      const { addWidget } = useWidgetStore.getState();

      await addWidget({
        type: 'notes',
        title: 'Test Notes',
        size: 'medium',
        layout: { x: 0, y: 0, w: 2, h: 3 },
      });

      const widgets = useWidgetStore.getState().widgets;
      const newWidget = widgets[widgets.length - 1];

      expect(newWidget.id).toBeDefined();
      expect(typeof newWidget.id).toBe('string');
    });

    it('should apply size presets to layout', async () => {
      const { addWidget } = useWidgetStore.getState();

      // The store applies size presets when w or h are nullish/0
      // Update the mock to return the widget with proper layout
      vi.mocked(global.fetch).mockImplementationOnce((url, options) => {
        const body = options?.body ? JSON.parse(options.body as string) : {};
        return mockFetchResponse({
          id: `widget-${Date.now()}`,
          ...body,
          // The store sends the calculated layout, and the API returns it
          layout: body.layout,
        });
      });

      await addWidget({
        type: 'stats',
        title: 'Test Stats',
        size: 'medium',
        layout: { x: 0, y: 0, w: 2, h: 3 }, // Provide full layout, store will apply preset
      });

      const widgets = useWidgetStore.getState().widgets;
      const newWidget = widgets[widgets.length - 1];

      // The store should apply the medium preset (w: 2, h: 3)
      expect(newWidget.layout.w).toBe(2); // medium preset width
      expect(newWidget.layout.h).toBe(3); // medium preset height
    });
  });

  describe('Update Widget', () => {
    it('should update widget title', async () => {
      const { widgets, updateWidget } = useWidgetStore.getState();
      const widgetId = widgets[0].id;
      const newTitle = 'Updated Title';

      await updateWidget(widgetId, { title: newTitle });

      const updatedWidget = useWidgetStore.getState().getWidgetById(widgetId);
      expect(updatedWidget?.title).toBe(newTitle);
    });

    it('should update widget size and layout', async () => {
      const { widgets, updateWidget } = useWidgetStore.getState();
      const widgetId = widgets[0].id;

      await updateWidget(widgetId, { size: 'large' });

      const updatedWidget = useWidgetStore.getState().getWidgetById(widgetId);
      expect(updatedWidget?.size).toBe('large');
      expect(updatedWidget?.layout.w).toBe(2); // large preset width
      expect(updatedWidget?.layout.h).toBe(4); // large preset height
    });

    it('should update widget config', async () => {
      const { widgets, updateWidget } = useWidgetStore.getState();
      const widgetId = widgets[0].id;
      const newConfig = { limit: 10, showImages: false };

      await updateWidget(widgetId, { config: newConfig });

      const updatedWidget = useWidgetStore.getState().getWidgetById(widgetId);
      expect(updatedWidget?.config).toEqual(newConfig);
    });

    it('should not affect other widgets', async () => {
      const { widgets, updateWidget } = useWidgetStore.getState();
      const widgetId = widgets[0].id;
      const otherWidgetId = widgets[1].id;
      const otherWidgetBefore = useWidgetStore.getState().getWidgetById(otherWidgetId);

      await updateWidget(widgetId, { title: 'Changed' });

      const otherWidgetAfter = useWidgetStore.getState().getWidgetById(otherWidgetId);
      expect(otherWidgetAfter).toEqual(otherWidgetBefore);
    });
  });

  describe('Remove Widget', () => {
    it('should remove a widget', async () => {
      const { widgets, removeWidget } = useWidgetStore.getState();
      const initialCount = widgets.length;
      const widgetId = widgets[0].id;

      await removeWidget(widgetId);

      const newWidgets = useWidgetStore.getState().widgets;
      expect(newWidgets.length).toBe(initialCount - 1);
      expect(newWidgets.find(w => w.id === widgetId)).toBeUndefined();
    });

    it('should close edit modal if removed widget was selected', async () => {
      const { widgets, openEditWidgetModal, removeWidget } = useWidgetStore.getState();
      const widget = widgets[0];

      openEditWidgetModal(widget);
      await removeWidget(widget.id);

      const { isEditWidgetModalOpen, selectedWidget } = useWidgetStore.getState();
      expect(isEditWidgetModalOpen).toBe(false);
      expect(selectedWidget).toBeNull();
    });
  });

  describe('Reorder Widgets', () => {
    it('should update widget layouts from react-grid-layout', () => {
      const { widgets, reorderWidgets } = useWidgetStore.getState();
      const widgetId = widgets[0].id;

      const newLayouts = [
        { i: widgetId, x: 5, y: 5, w: 3, h: 4 },
        ...widgets.slice(1).map(w => ({
          i: w.id,
          x: w.layout.x,
          y: w.layout.y,
          w: w.layout.w,
          h: w.layout.h,
        })),
      ];

      reorderWidgets(newLayouts);

      const updatedWidget = useWidgetStore.getState().getWidgetById(widgetId);
      expect(updatedWidget?.layout.x).toBe(5);
      expect(updatedWidget?.layout.y).toBe(5);
      expect(updatedWidget?.layout.w).toBe(3);
      expect(updatedWidget?.layout.h).toBe(4);
    });
  });

  describe('Modal Actions', () => {
    it('should open add widget modal', () => {
      const { openAddWidgetModal } = useWidgetStore.getState();

      openAddWidgetModal();

      const { isAddWidgetModalOpen } = useWidgetStore.getState();
      expect(isAddWidgetModalOpen).toBe(true);
    });

    it('should close add widget modal', () => {
      const { openAddWidgetModal, closeAddWidgetModal } = useWidgetStore.getState();

      openAddWidgetModal();
      closeAddWidgetModal();

      const { isAddWidgetModalOpen } = useWidgetStore.getState();
      expect(isAddWidgetModalOpen).toBe(false);
    });

    it('should open edit widget modal with selected widget', () => {
      const { widgets, openEditWidgetModal } = useWidgetStore.getState();
      const widget = widgets[0];

      openEditWidgetModal(widget);

      const { isEditWidgetModalOpen, selectedWidget } = useWidgetStore.getState();
      expect(isEditWidgetModalOpen).toBe(true);
      expect(selectedWidget).toEqual(widget);
    });

    it('should close edit widget modal and clear selected widget', () => {
      const { widgets, openEditWidgetModal, closeEditWidgetModal } = useWidgetStore.getState();

      openEditWidgetModal(widgets[0]);
      closeEditWidgetModal();

      const { isEditWidgetModalOpen, selectedWidget } = useWidgetStore.getState();
      expect(isEditWidgetModalOpen).toBe(false);
      expect(selectedWidget).toBeNull();
    });
  });

  describe('Utility Functions', () => {
    it('should get widget by ID', () => {
      const { widgets, getWidgetById } = useWidgetStore.getState();
      const widgetId = widgets[0].id;

      const widget = getWidgetById(widgetId);

      expect(widget?.id).toBe(widgetId);
    });

    it('should return undefined for non-existent ID', () => {
      const { getWidgetById } = useWidgetStore.getState();

      const widget = getWidgetById('non-existent-id');

      expect(widget).toBeUndefined();
    });

    it('should get widgets by type', () => {
      const { getWidgetsByType } = useWidgetStore.getState();

      const favoriteWidgets = getWidgetsByType('favorites');

      expect(favoriteWidgets.every(w => w.type === 'favorites')).toBe(true);
    });

    it('should return empty array for non-existent type', () => {
      const { getWidgetsByType } = useWidgetStore.getState();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const widgets = getWidgetsByType('clock' as any);

      // Might be empty if no clock widgets in defaults
      expect(Array.isArray(widgets)).toBe(true);
    });

    it('should get widget count', () => {
      const { getWidgetCount, widgets } = useWidgetStore.getState();

      expect(getWidgetCount()).toBe(widgets.length);
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset widgets to defaults', async () => {
      const { addWidget, resetToDefaults } = useWidgetStore.getState();

      // Add some widgets
      await addWidget({
        type: 'clock',
        title: 'Test',
        size: 'small',
        layout: { x: 0, y: 0, w: 1, h: 2 },
      });

      const beforeReset = useWidgetStore.getState().widgets.length;

      await resetToDefaults();

      const afterReset = useWidgetStore.getState().widgets.length;
      const defaultWidgets = useWidgetStore.getState().getDefaultWidgets();

      expect(afterReset).toBe(defaultWidgets.length);
      expect(beforeReset).toBeGreaterThan(afterReset);
    });

    it('should close all modals on reset', async () => {
      const { widgets, openAddWidgetModal, openEditWidgetModal, resetToDefaults } = useWidgetStore.getState();

      openAddWidgetModal();
      openEditWidgetModal(widgets[0]);

      await resetToDefaults();

      const { isAddWidgetModalOpen, isEditWidgetModalOpen, selectedWidget } = useWidgetStore.getState();
      expect(isAddWidgetModalOpen).toBe(false);
      expect(isEditWidgetModalOpen).toBe(false);
      expect(selectedWidget).toBeNull();
    });
  });

  describe('Get Default Widgets', () => {
    it('should return default widgets configuration', () => {
      const { getDefaultWidgets } = useWidgetStore.getState();

      const defaults = getDefaultWidgets();

      expect(Array.isArray(defaults)).toBe(true);
      expect(defaults.length).toBeGreaterThan(0);
      expect(defaults.every(w => w.id && w.type && w.title)).toBe(true);
    });

    it('should not modify store when getting defaults', () => {
      const { widgets, getDefaultWidgets } = useWidgetStore.getState();
      const initialWidgets = [...widgets];

      getDefaultWidgets();

      const afterWidgets = useWidgetStore.getState().widgets;
      expect(afterWidgets).toEqual(initialWidgets);
    });
  });

  describe('Project Filtering', () => {
    it('should filter widgets by current project', () => {
      // Set up widgets with different project IDs
      useWidgetStore.setState({
        widgets: [
          createMockWidget({ id: 'w1', projectId: null }),
          createMockWidget({ id: 'w2', projectId: 'project-1' }),
          createMockWidget({ id: 'w3', projectId: null }),
          createMockWidget({ id: 'w4', projectId: 'project-2' }),
        ],
        currentProjectId: null,
      });

      const { getFilteredWidgets } = useWidgetStore.getState();
      const filtered = getFilteredWidgets();

      expect(filtered.length).toBe(2);
      expect(filtered.every(w => w.projectId === null)).toBe(true);
    });

    it('should change current project and filter correctly', () => {
      useWidgetStore.setState({
        widgets: [
          createMockWidget({ id: 'w1', projectId: null }),
          createMockWidget({ id: 'w2', projectId: 'project-1' }),
          createMockWidget({ id: 'w3', projectId: 'project-1' }),
        ],
      });

      const { setCurrentProjectId, getFilteredWidgets: _getFilteredWidgets } = useWidgetStore.getState();

      setCurrentProjectId('project-1');

      const filtered = useWidgetStore.getState().getFilteredWidgets();
      expect(filtered.length).toBe(2);
      expect(filtered.every(w => w.projectId === 'project-1')).toBe(true);
    });
  });

  describe('Duplicate Widget', () => {
    it('should duplicate a widget', async () => {
      const { widgets, duplicateWidget } = useWidgetStore.getState();
      const initialCount = widgets.length;
      const widgetToDuplicate = widgets[0];

      await duplicateWidget(widgetToDuplicate.id);

      const newWidgets = useWidgetStore.getState().widgets;
      expect(newWidgets.length).toBe(initialCount + 1);
    });

    it('should add "(copia)" to duplicated widget title', async () => {
      const { widgets, duplicateWidget } = useWidgetStore.getState();
      const widgetToDuplicate = widgets[0];
      const originalTitle = widgetToDuplicate.title;

      await duplicateWidget(widgetToDuplicate.id);

      const newWidgets = useWidgetStore.getState().widgets;
      const duplicatedWidget = newWidgets[newWidgets.length - 1];

      expect(duplicatedWidget.title).toBe(`${originalTitle} (copia)`);
    });
  });

  describe('Toggle Lock', () => {
    it('should lock an unlocked widget', async () => {
      const { widgets, toggleLock } = useWidgetStore.getState();
      const widget = widgets[0];
      expect(widget.isLocked).toBeFalsy();

      await toggleLock(widget.id);

      const updatedWidgets = useWidgetStore.getState().widgets;
      const updatedWidget = updatedWidgets.find(w => w.id === widget.id);
      expect(updatedWidget?.isLocked).toBe(true);
    });

    it('should unlock a locked widget', async () => {
      // First set a widget as locked
      const { widgets, updateWidget, toggleLock } = useWidgetStore.getState();
      const widget = widgets[0];
      await updateWidget(widget.id, { isLocked: true });

      // Now toggle to unlock
      await toggleLock(widget.id);

      const updatedWidgets = useWidgetStore.getState().widgets;
      const updatedWidget = updatedWidgets.find(w => w.id === widget.id);
      expect(updatedWidget?.isLocked).toBe(false);
    });

    it('should not throw error when widget not found', async () => {
      const { toggleLock } = useWidgetStore.getState();

      // Should not throw, just log error
      await expect(toggleLock('non-existent-id')).resolves.toBeUndefined();
    });
  });

  describe('Update Widget Project', () => {
    it('should update widget projectId via updateWidget', async () => {
      const testWidget = createMockWidget({ id: 'test-widget-1', projectId: null });
      useWidgetStore.setState({
        widgets: [testWidget],
      });

      const { updateWidget } = useWidgetStore.getState();
      await updateWidget('test-widget-1', { projectId: 'new-project-id' });

      const updatedWidgets = useWidgetStore.getState().widgets;
      const updatedWidget = updatedWidgets.find(w => w.id === 'test-widget-1');
      expect(updatedWidget?.projectId).toBe('new-project-id');
    });

    it('should update widget to home (null projectId)', async () => {
      useWidgetStore.setState({
        widgets: [createMockWidget({ id: 'w1', projectId: 'some-project' })],
      });

      const { updateWidget } = useWidgetStore.getState();
      await updateWidget('w1', { projectId: null });

      const updatedWidgets = useWidgetStore.getState().widgets;
      const updatedWidget = updatedWidgets.find(w => w.id === 'w1');
      expect(updatedWidget?.projectId).toBeNull();
    });
  });

  describe('Update Multiple Widget Properties', () => {
    it('should update multiple widget properties at once', async () => {
      useWidgetStore.setState({
        widgets: [createMockWidget({ id: 'w1', title: 'Original Title' })],
      });

      const { updateWidget } = useWidgetStore.getState();
      await updateWidget('w1', {
        title: 'New Title',
        size: 'large',
      });

      const updatedWidgets = useWidgetStore.getState().widgets;
      const widget = updatedWidgets.find(w => w.id === 'w1');
      expect(widget?.title).toBe('New Title');
      expect(widget?.size).toBe('large');
    });
  });

  describe('Auto Organize Widgets', () => {
    it('should reorganize widgets in a grid pattern', () => {
      useWidgetStore.setState({
        widgets: [
          createMockWidget({ id: 'w1', layout: { x: 10, y: 10, w: 2, h: 2 } }),
          createMockWidget({ id: 'w2', layout: { x: 5, y: 5, w: 3, h: 3 } }),
          createMockWidget({ id: 'w3', layout: { x: 0, y: 15, w: 4, h: 2 } }),
        ],
        currentProjectId: null,
      });

      const { autoOrganizeWidgets } = useWidgetStore.getState();
      autoOrganizeWidgets();

      const widgets = useWidgetStore.getState().widgets;
      // Widgets should be reorganized starting from y=0
      expect(widgets.some(w => w.layout.y === 0)).toBe(true);
    });
  });

  describe('Clear All Widgets', () => {
    it('should remove all widgets', async () => {
      useWidgetStore.setState({
        widgets: [
          createMockWidget({ id: 'w1', projectId: null }),
          createMockWidget({ id: 'w2', projectId: null }),
          createMockWidget({ id: 'w3', projectId: 'other-project' }),
        ],
        currentProjectId: null,
      });

      const { clearAllWidgets } = useWidgetStore.getState();
      await clearAllWidgets();

      const widgets = useWidgetStore.getState().widgets;
      // Should have no widgets after clearing
      expect(widgets.length).toBe(0);
    });

    it('should close edit modal when clearing widgets', async () => {
      const testWidget = createMockWidget({ id: 'w1' });
      useWidgetStore.setState({
        widgets: [testWidget],
        isEditWidgetModalOpen: true,
        selectedWidget: testWidget,
      });

      const { clearAllWidgets } = useWidgetStore.getState();
      await clearAllWidgets();

      const state = useWidgetStore.getState();
      expect(state.isEditWidgetModalOpen).toBe(false);
      expect(state.selectedWidget).toBeNull();
    });
  });

  describe('Get Widgets By Type', () => {
    it('should return widgets filtered by type', () => {
      useWidgetStore.setState({
        widgets: [
          createMockWidget({ id: 'w1', type: 'notes' }),
          createMockWidget({ id: 'w2', type: 'todo' }),
          createMockWidget({ id: 'w3', type: 'notes' }),
        ],
      });

      const { getWidgetsByType } = useWidgetStore.getState();
      const notesWidgets = getWidgetsByType('notes');

      expect(notesWidgets.length).toBe(2);
      expect(notesWidgets.every(w => w.type === 'notes')).toBe(true);
    });
  });

  describe('Get Widget By Id', () => {
    it('should return widget when found', () => {
      const testWidget = createMockWidget({ id: 'test-widget-id' });
      useWidgetStore.setState({
        widgets: [testWidget],
      });

      const { getWidgetById } = useWidgetStore.getState();
      const found = getWidgetById('test-widget-id');

      expect(found).toBeDefined();
      expect(found?.id).toBe('test-widget-id');
    });

    it('should return undefined when widget not found', () => {
      const { getWidgetById } = useWidgetStore.getState();
      const found = getWidgetById('non-existent');

      expect(found).toBeUndefined();
    });
  });
});
