/**
 * Kanban Store Tests
 *
 * Tests for the kanban column management store
 * Covers column CRUD, reordering, WIP limits, and modal states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import {
  useKanbanStore,
  DEFAULT_KANBAN_COLUMNS,
  type KanbanColumn,
} from '../kanban-store';

// Mock console methods to reduce noise in tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('Kanban Store', () => {
  // Reset store state before each test
  beforeEach(() => {
    act(() => {
      useKanbanStore.setState({
        columns: [...DEFAULT_KANBAN_COLUMNS],
        isInitialized: false,
        searchTerm: '',
        globalFilter: [],
        showCompactCards: false,
        showWipWarnings: true,
        isAddColumnModalOpen: false,
        isEditColumnModalOpen: false,
        isManageColumnsModalOpen: false,
        selectedColumn: null,
      });
    });
  });

  describe('Initial State', () => {
    it('should have default columns on initialization', () => {
      const state = useKanbanStore.getState();

      expect(state.columns).toHaveLength(3);
      expect(state.columns[0].title).toBe('Por Hacer');
      expect(state.columns[1].title).toBe('En Progreso');
      expect(state.columns[2].title).toBe('Completado');
    });

    it('should have default settings values', () => {
      const state = useKanbanStore.getState();

      expect(state.searchTerm).toBe('');
      expect(state.globalFilter).toEqual([]);
      expect(state.showCompactCards).toBe(false);
      expect(state.showWipWarnings).toBe(true);
    });

    it('should have all modals closed initially', () => {
      const state = useKanbanStore.getState();

      expect(state.isAddColumnModalOpen).toBe(false);
      expect(state.isEditColumnModalOpen).toBe(false);
      expect(state.isManageColumnsModalOpen).toBe(false);
      expect(state.selectedColumn).toBeNull();
    });
  });

  describe('Column CRUD Operations', () => {
    describe('addColumn', () => {
      it('should add a new column at the end', () => {
        const { addColumn } = useKanbanStore.getState();

        act(() => {
          addColumn({ title: 'New Column', color: 'hsl(0, 100%, 50%)' });
        });

        const state = useKanbanStore.getState();
        expect(state.columns).toHaveLength(4);
        expect(state.columns[3].title).toBe('New Column');
        expect(state.columns[3].order).toBe(3);
      });

      it('should generate a unique ID for new columns', () => {
        const { addColumn } = useKanbanStore.getState();

        act(() => {
          addColumn({ title: 'Column A', color: 'blue' });
          addColumn({ title: 'Column B', color: 'red' });
        });

        const state = useKanbanStore.getState();
        const columnA = state.columns.find((c) => c.title === 'Column A');
        const columnB = state.columns.find((c) => c.title === 'Column B');

        expect(columnA?.id).not.toBe(columnB?.id);
        expect(columnA?.id).toMatch(/^col-\d+-[a-z0-9]+$/);
      });

      it('should close add column modal after adding', () => {
        act(() => {
          useKanbanStore.setState({ isAddColumnModalOpen: true });
        });

        const { addColumn } = useKanbanStore.getState();

        act(() => {
          addColumn({ title: 'Test', color: 'blue' });
        });

        expect(useKanbanStore.getState().isAddColumnModalOpen).toBe(false);
      });

      it('should add column with optional properties', () => {
        const { addColumn } = useKanbanStore.getState();

        act(() => {
          addColumn({
            title: 'Limited Column',
            color: 'green',
            description: 'Test description',
            wipLimit: 5,
          });
        });

        const state = useKanbanStore.getState();
        const newColumn = state.columns.find((c) => c.title === 'Limited Column');

        expect(newColumn?.description).toBe('Test description');
        expect(newColumn?.wipLimit).toBe(5);
      });
    });

    describe('updateColumn', () => {
      it('should update column properties', () => {
        const { updateColumn, columns } = useKanbanStore.getState();
        const columnId = columns[0].id;

        act(() => {
          updateColumn(columnId, { title: 'Updated Title', color: 'purple' });
        });

        const state = useKanbanStore.getState();
        const updatedColumn = state.columns.find((c) => c.id === columnId);

        expect(updatedColumn?.title).toBe('Updated Title');
        expect(updatedColumn?.color).toBe('purple');
      });

      it('should preserve unchanged properties', () => {
        const { updateColumn, columns } = useKanbanStore.getState();
        const column = columns[0];

        act(() => {
          updateColumn(column.id, { title: 'New Title' });
        });

        const state = useKanbanStore.getState();
        const updatedColumn = state.columns.find((c) => c.id === column.id);

        expect(updatedColumn?.color).toBe(column.color);
        expect(updatedColumn?.order).toBe(column.order);
      });

      it('should close edit modal and clear selection after update', () => {
        const { columns } = useKanbanStore.getState();

        act(() => {
          useKanbanStore.setState({
            isEditColumnModalOpen: true,
            selectedColumn: columns[0],
          });
        });

        const { updateColumn } = useKanbanStore.getState();

        act(() => {
          updateColumn(columns[0].id, { title: 'Test' });
        });

        const state = useKanbanStore.getState();
        expect(state.isEditColumnModalOpen).toBe(false);
        expect(state.selectedColumn).toBeNull();
      });
    });

    describe('removeColumn', () => {
      it('should remove a column by ID', () => {
        const { removeColumn, columns } = useKanbanStore.getState();
        const columnToRemove = columns[1];

        act(() => {
          removeColumn(columnToRemove.id);
        });

        const state = useKanbanStore.getState();
        expect(state.columns).toHaveLength(2);
        expect(state.columns.find((c) => c.id === columnToRemove.id)).toBeUndefined();
      });

      it('should reorder remaining columns after removal', () => {
        const { removeColumn, columns } = useKanbanStore.getState();
        const columnToRemove = columns[0];

        act(() => {
          removeColumn(columnToRemove.id);
        });

        const state = useKanbanStore.getState();
        expect(state.columns[0].order).toBe(0);
        expect(state.columns[1].order).toBe(1);
      });

      it('should not allow removing the last column', () => {
        // Set state with only one column
        act(() => {
          useKanbanStore.setState({
            columns: [{ id: 'only-one', title: 'Only', color: 'blue', order: 0 }],
          });
        });

        const { removeColumn, columns } = useKanbanStore.getState();

        act(() => {
          removeColumn(columns[0].id);
        });

        const state = useKanbanStore.getState();
        expect(state.columns).toHaveLength(1);
      });
    });

    describe('setColumns', () => {
      it('should set columns directly', () => {
        const newColumns: KanbanColumn[] = [
          { id: 'new-1', title: 'First', color: 'red', order: 0 },
          { id: 'new-2', title: 'Second', color: 'blue', order: 1 },
        ];

        act(() => {
          useKanbanStore.getState().setColumns(newColumns);
        });

        const state = useKanbanStore.getState();
        expect(state.columns).toEqual(newColumns);
      });
    });
  });

  describe('Column Reordering', () => {
    describe('reorderColumns', () => {
      it('should reorder columns from source to destination', () => {
        const { reorderColumns, columns } = useKanbanStore.getState();
        const originalFirst = columns[0];

        act(() => {
          reorderColumns(0, 2);
        });

        const state = useKanbanStore.getState();
        expect(state.columns[2].id).toBe(originalFirst.id);
        expect(state.columns[2].order).toBe(2);
      });

      it('should update order property for all columns', () => {
        act(() => {
          useKanbanStore.getState().reorderColumns(0, 2);
        });

        const state = useKanbanStore.getState();
        state.columns.forEach((col, index) => {
          expect(col.order).toBe(index);
        });
      });
    });

    describe('moveColumnLeft', () => {
      it('should move column one position to the left', () => {
        const { columns } = useKanbanStore.getState();
        const middleColumn = columns[1];

        act(() => {
          useKanbanStore.getState().moveColumnLeft(middleColumn.id);
        });

        const state = useKanbanStore.getState();
        const sortedColumns = [...state.columns].sort((a, b) => a.order - b.order);
        expect(sortedColumns[0].id).toBe(middleColumn.id);
      });

      it('should not move column if already at leftmost position', () => {
        const { columns } = useKanbanStore.getState();
        const firstColumn = columns[0];

        act(() => {
          useKanbanStore.getState().moveColumnLeft(firstColumn.id);
        });

        const state = useKanbanStore.getState();
        const sortedColumns = [...state.columns].sort((a, b) => a.order - b.order);
        expect(sortedColumns[0].id).toBe(firstColumn.id);
      });
    });

    describe('moveColumnRight', () => {
      it('should move column one position to the right', () => {
        const { columns } = useKanbanStore.getState();
        const middleColumn = columns[1];

        act(() => {
          useKanbanStore.getState().moveColumnRight(middleColumn.id);
        });

        const state = useKanbanStore.getState();
        const sortedColumns = [...state.columns].sort((a, b) => a.order - b.order);
        expect(sortedColumns[2].id).toBe(middleColumn.id);
      });

      it('should not move column if already at rightmost position', () => {
        const { columns } = useKanbanStore.getState();
        const lastColumn = columns[2];

        act(() => {
          useKanbanStore.getState().moveColumnRight(lastColumn.id);
        });

        const state = useKanbanStore.getState();
        const sortedColumns = [...state.columns].sort((a, b) => a.order - b.order);
        expect(sortedColumns[2].id).toBe(lastColumn.id);
      });
    });
  });

  describe('WIP Limit Functionality', () => {
    it('should set WIP limit for a column', () => {
      const { setColumnWipLimit, columns } = useKanbanStore.getState();
      const columnId = columns[0].id;

      act(() => {
        setColumnWipLimit(columnId, 5);
      });

      const state = useKanbanStore.getState();
      const column = state.columns.find((c) => c.id === columnId);
      expect(column?.wipLimit).toBe(5);
    });

    it('should clear WIP limit when set to undefined', () => {
      const { columns } = useKanbanStore.getState();
      const columnId = columns[0].id;

      // Set initial limit
      act(() => {
        useKanbanStore.getState().setColumnWipLimit(columnId, 5);
      });

      // Clear limit
      act(() => {
        useKanbanStore.getState().setColumnWipLimit(columnId, undefined);
      });

      const state = useKanbanStore.getState();
      const column = state.columns.find((c) => c.id === columnId);
      expect(column?.wipLimit).toBeUndefined();
    });
  });

  describe('Column Collapse/Expand', () => {
    describe('toggleColumnCollapse', () => {
      it('should toggle column collapsed state', () => {
        const { columns } = useKanbanStore.getState();
        const columnId = columns[0].id;

        // Initially not collapsed
        expect(useKanbanStore.getState().columns[0].isCollapsed).toBeFalsy();

        // Toggle to collapsed
        act(() => {
          useKanbanStore.getState().toggleColumnCollapse(columnId);
        });

        expect(useKanbanStore.getState().columns[0].isCollapsed).toBe(true);

        // Toggle back to expanded
        act(() => {
          useKanbanStore.getState().toggleColumnCollapse(columnId);
        });

        expect(useKanbanStore.getState().columns[0].isCollapsed).toBe(false);
      });
    });

    describe('collapseAllColumns', () => {
      it('should collapse all columns', () => {
        act(() => {
          useKanbanStore.getState().collapseAllColumns();
        });

        const state = useKanbanStore.getState();
        state.columns.forEach((col) => {
          expect(col.isCollapsed).toBe(true);
        });
      });
    });

    describe('expandAllColumns', () => {
      it('should expand all columns', () => {
        // First collapse all
        act(() => {
          useKanbanStore.getState().collapseAllColumns();
        });

        // Then expand all
        act(() => {
          useKanbanStore.getState().expandAllColumns();
        });

        const state = useKanbanStore.getState();
        state.columns.forEach((col) => {
          expect(col.isCollapsed).toBe(false);
        });
      });
    });
  });

  describe('Column Filters', () => {
    it('should set filter by type for a column', () => {
      const { setColumnFilter, columns } = useKanbanStore.getState();
      const columnId = columns[0].id;

      act(() => {
        setColumnFilter(columnId, ['notes', 'todo']);
      });

      const state = useKanbanStore.getState();
      const column = state.columns.find((c) => c.id === columnId);
      expect(column?.filterByType).toEqual(['notes', 'todo']);
    });

    it('should clear filter for a column', () => {
      const { columns } = useKanbanStore.getState();
      const columnId = columns[0].id;

      // Set filter first
      act(() => {
        useKanbanStore.getState().setColumnFilter(columnId, ['notes']);
      });

      // Clear filter
      act(() => {
        useKanbanStore.getState().clearColumnFilter(columnId);
      });

      const state = useKanbanStore.getState();
      const column = state.columns.find((c) => c.id === columnId);
      expect(column?.filterByType).toBeUndefined();
    });
  });

  describe('Global Settings', () => {
    describe('searchTerm', () => {
      it('should set search term', () => {
        act(() => {
          useKanbanStore.getState().setSearchTerm('test search');
        });

        expect(useKanbanStore.getState().searchTerm).toBe('test search');
      });
    });

    describe('globalFilter', () => {
      it('should set global filter', () => {
        act(() => {
          useKanbanStore.getState().setGlobalFilter(['clock', 'notes']);
        });

        expect(useKanbanStore.getState().globalFilter).toEqual(['clock', 'notes']);
      });

      it('should clear global filter', () => {
        // Set filter first
        act(() => {
          useKanbanStore.getState().setGlobalFilter(['clock']);
          useKanbanStore.getState().setSearchTerm('test');
        });

        // Clear filter
        act(() => {
          useKanbanStore.getState().clearGlobalFilter();
        });

        const state = useKanbanStore.getState();
        expect(state.globalFilter).toEqual([]);
        expect(state.searchTerm).toBe('');
      });
    });

    describe('toggleCompactCards', () => {
      it('should toggle compact cards setting', () => {
        expect(useKanbanStore.getState().showCompactCards).toBe(false);

        act(() => {
          useKanbanStore.getState().toggleCompactCards();
        });

        expect(useKanbanStore.getState().showCompactCards).toBe(true);

        act(() => {
          useKanbanStore.getState().toggleCompactCards();
        });

        expect(useKanbanStore.getState().showCompactCards).toBe(false);
      });
    });

    describe('toggleWipWarnings', () => {
      it('should toggle WIP warnings setting', () => {
        expect(useKanbanStore.getState().showWipWarnings).toBe(true);

        act(() => {
          useKanbanStore.getState().toggleWipWarnings();
        });

        expect(useKanbanStore.getState().showWipWarnings).toBe(false);
      });
    });
  });

  describe('Modal State Management', () => {
    describe('Add Column Modal', () => {
      it('should open add column modal', () => {
        act(() => {
          useKanbanStore.getState().openAddColumnModal();
        });

        expect(useKanbanStore.getState().isAddColumnModalOpen).toBe(true);
      });

      it('should close add column modal', () => {
        act(() => {
          useKanbanStore.setState({ isAddColumnModalOpen: true });
          useKanbanStore.getState().closeAddColumnModal();
        });

        expect(useKanbanStore.getState().isAddColumnModalOpen).toBe(false);
      });
    });

    describe('Edit Column Modal', () => {
      it('should open edit column modal with selected column', () => {
        const column: KanbanColumn = {
          id: 'test-id',
          title: 'Test',
          color: 'blue',
          order: 0,
        };

        act(() => {
          useKanbanStore.getState().openEditColumnModal(column);
        });

        const state = useKanbanStore.getState();
        expect(state.isEditColumnModalOpen).toBe(true);
        expect(state.selectedColumn).toEqual(column);
      });

      it('should close edit column modal and clear selection', () => {
        const column: KanbanColumn = {
          id: 'test-id',
          title: 'Test',
          color: 'blue',
          order: 0,
        };

        act(() => {
          useKanbanStore.setState({
            isEditColumnModalOpen: true,
            selectedColumn: column,
          });
          useKanbanStore.getState().closeEditColumnModal();
        });

        const state = useKanbanStore.getState();
        expect(state.isEditColumnModalOpen).toBe(false);
        expect(state.selectedColumn).toBeNull();
      });
    });

    describe('Manage Columns Modal', () => {
      it('should open manage columns modal', () => {
        act(() => {
          useKanbanStore.getState().openManageColumnsModal();
        });

        expect(useKanbanStore.getState().isManageColumnsModalOpen).toBe(true);
      });

      it('should close manage columns modal', () => {
        act(() => {
          useKanbanStore.setState({ isManageColumnsModalOpen: true });
          useKanbanStore.getState().closeManageColumnsModal();
        });

        expect(useKanbanStore.getState().isManageColumnsModalOpen).toBe(false);
      });
    });
  });

  describe('Reset to Defaults', () => {
    it('should reset columns to default values', () => {
      // Modify state
      act(() => {
        useKanbanStore.getState().addColumn({ title: 'Extra', color: 'red' });
        useKanbanStore.getState().setSearchTerm('test');
        useKanbanStore.getState().setGlobalFilter(['notes']);
        useKanbanStore.getState().openAddColumnModal();
      });

      // Reset
      act(() => {
        useKanbanStore.getState().resetToDefaults();
      });

      const state = useKanbanStore.getState();
      expect(state.columns).toHaveLength(3);
      expect(state.columns[0].title).toBe('Por Hacer');
      expect(state.searchTerm).toBe('');
      expect(state.globalFilter).toEqual([]);
      expect(state.isAddColumnModalOpen).toBe(false);
    });
  });

  describe('Initialize Columns', () => {
    it('should initialize with default columns if empty', () => {
      act(() => {
        useKanbanStore.setState({ columns: [], isInitialized: false });
      });

      act(() => {
        useKanbanStore.getState().initColumns();
      });

      const state = useKanbanStore.getState();
      expect(state.columns).toEqual(DEFAULT_KANBAN_COLUMNS);
      expect(state.isInitialized).toBe(true);
    });

    it('should not reinitialize if already initialized', () => {
      act(() => {
        useKanbanStore.setState({ isInitialized: true });
      });

      const originalColumns = useKanbanStore.getState().columns;

      act(() => {
        useKanbanStore.getState().initColumns();
      });

      expect(useKanbanStore.getState().columns).toBe(originalColumns);
    });

    it('should keep existing columns if not empty', () => {
      const customColumns: KanbanColumn[] = [
        { id: 'custom-1', title: 'Custom', color: 'red', order: 0 },
      ];

      act(() => {
        useKanbanStore.setState({ columns: customColumns, isInitialized: false });
      });

      act(() => {
        useKanbanStore.getState().initColumns();
      });

      const state = useKanbanStore.getState();
      expect(state.columns).toEqual(customColumns);
      expect(state.isInitialized).toBe(true);
    });
  });
});
