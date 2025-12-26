import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { WidgetType } from "@/types/widget";

export interface KanbanColumn {
  id: string;
  title: string;
  color: string;
  order: number;
  // New features
  description?: string;
  wipLimit?: number; // Work in Progress limit
  isCollapsed?: boolean;
  filterByType?: WidgetType[];
}

// Default gold color variants for new columns
export const COLUMN_COLOR_PRESETS = [
  { name: "Gold", value: "hsl(45, 65%, 58%)" },
  { name: "Gold Light", value: "hsl(45, 55%, 68%)" },
  { name: "Gold Dark", value: "hsl(45, 70%, 48%)" },
  { name: "Amber", value: "hsl(38, 92%, 50%)" },
  { name: "Orange", value: "hsl(25, 95%, 53%)" },
  { name: "Honey", value: "hsl(35, 80%, 55%)" },
  { name: "Bronze", value: "hsl(30, 60%, 45%)" },
  { name: "Copper", value: "hsl(20, 70%, 50%)" },
];

// Default columns
export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { id: "col-1", title: "Por Hacer", color: "hsl(45, 65%, 58%)", order: 0 },
  { id: "col-2", title: "En Progreso", color: "hsl(38, 92%, 50%)", order: 1 },
  { id: "col-3", title: "Completado", color: "hsl(45, 55%, 68%)", order: 2 },
];

interface KanbanState {
  // Columns data
  columns: KanbanColumn[];
  isInitialized: boolean;

  // Global Kanban settings
  searchTerm: string;
  globalFilter: WidgetType[];
  showCompactCards: boolean;
  showWipWarnings: boolean;

  // Modal states
  isAddColumnModalOpen: boolean;
  isEditColumnModalOpen: boolean;
  isManageColumnsModalOpen: boolean;
  selectedColumn: KanbanColumn | null;

  // Actions
  setColumns: (columns: KanbanColumn[]) => void;
  addColumn: (column: Omit<KanbanColumn, "id" | "order">) => void;
  updateColumn: (id: string, updates: Partial<Omit<KanbanColumn, "id">>) => void;
  removeColumn: (id: string) => void;
  reorderColumns: (sourceIndex: number, destinationIndex: number) => void;
  moveColumnLeft: (id: string) => void;
  moveColumnRight: (id: string) => void;
  resetToDefaults: () => void;

  // Column-specific actions
  toggleColumnCollapse: (id: string) => void;
  setColumnWipLimit: (id: string, limit: number | undefined) => void;
  setColumnFilter: (id: string, types: WidgetType[]) => void;
  clearColumnFilter: (id: string) => void;
  collapseAllColumns: () => void;
  expandAllColumns: () => void;

  // Global settings actions
  setSearchTerm: (term: string) => void;
  setGlobalFilter: (types: WidgetType[]) => void;
  clearGlobalFilter: () => void;
  toggleCompactCards: () => void;
  toggleWipWarnings: () => void;

  // Modal actions
  openAddColumnModal: () => void;
  closeAddColumnModal: () => void;
  openEditColumnModal: (column: KanbanColumn) => void;
  closeEditColumnModal: () => void;
  openManageColumnsModal: () => void;
  closeManageColumnsModal: () => void;

  // Initialize
  initColumns: () => void;
}

// Generate unique ID
function generateColumnId(): string {
  return `col-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export const useKanbanStore = create<KanbanState>()(
  persist(
    (set, get) => ({
      // Initial state
      columns: DEFAULT_KANBAN_COLUMNS,
      isInitialized: false,

      // Global settings
      searchTerm: "",
      globalFilter: [],
      showCompactCards: false,
      showWipWarnings: true,

      // Modal states
      isAddColumnModalOpen: false,
      isEditColumnModalOpen: false,
      isManageColumnsModalOpen: false,
      selectedColumn: null,

      // Initialize columns
      initColumns: () => {
        const { isInitialized, columns } = get();
        if (isInitialized) return;

        // If no columns exist, use defaults
        if (columns.length === 0) {
          set({ columns: DEFAULT_KANBAN_COLUMNS, isInitialized: true });
        } else {
          set({ isInitialized: true });
        }
      },

      // Set columns directly
      setColumns: (columns) => set({ columns }),

      // Add a new column
      addColumn: (columnData) => {
        const columns = get().columns;
        const newColumn: KanbanColumn = {
          ...columnData,
          id: generateColumnId(),
          order: columns.length,
        };

        set({
          columns: [...columns, newColumn],
          isAddColumnModalOpen: false,
        });

        console.log("Column added:", newColumn);
      },

      // Update an existing column
      updateColumn: (id, updates) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, ...updates } : col
          ),
          isEditColumnModalOpen: false,
          selectedColumn: null,
        }));

        console.log("Column updated:", id, updates);
      },

      // Remove a column
      removeColumn: (id) => {
        const columns = get().columns;

        // Don't allow removing the last column
        if (columns.length <= 1) {
          console.warn("Cannot remove the last column");
          return;
        }

        // Reorder remaining columns
        const filteredColumns = columns
          .filter((col) => col.id !== id)
          .map((col, index) => ({ ...col, order: index }));

        set({
          columns: filteredColumns,
          isEditColumnModalOpen: false,
          selectedColumn: null,
        });

        console.log("Column removed:", id);
      },

      // Reorder columns by dragging
      reorderColumns: (sourceIndex, destinationIndex) => {
        const columns = [...get().columns];
        const [removed] = columns.splice(sourceIndex, 1);
        columns.splice(destinationIndex, 0, removed);

        // Update order property
        const reorderedColumns = columns.map((col, index) => ({
          ...col,
          order: index,
        }));

        set({ columns: reorderedColumns });
        console.log("Columns reordered");
      },

      // Move column left
      moveColumnLeft: (id) => {
        const columns = [...get().columns].sort((a, b) => a.order - b.order);
        const index = columns.findIndex((col) => col.id === id);

        if (index > 0) {
          get().reorderColumns(index, index - 1);
        }
      },

      // Move column right
      moveColumnRight: (id) => {
        const columns = [...get().columns].sort((a, b) => a.order - b.order);
        const index = columns.findIndex((col) => col.id === id);

        if (index < columns.length - 1) {
          get().reorderColumns(index, index + 1);
        }
      },

      // Reset to default columns
      resetToDefaults: () => {
        set({
          columns: DEFAULT_KANBAN_COLUMNS,
          searchTerm: "",
          globalFilter: [],
          isAddColumnModalOpen: false,
          isEditColumnModalOpen: false,
          isManageColumnsModalOpen: false,
          selectedColumn: null,
        });

        console.log("Columns reset to defaults");
      },

      // Column-specific actions
      toggleColumnCollapse: (id) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, isCollapsed: !col.isCollapsed } : col
          ),
        }));
      },

      setColumnWipLimit: (id, limit) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, wipLimit: limit } : col
          ),
        }));
      },

      setColumnFilter: (id, types) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, filterByType: types } : col
          ),
        }));
      },

      clearColumnFilter: (id) => {
        set((state) => ({
          columns: state.columns.map((col) =>
            col.id === id ? { ...col, filterByType: undefined } : col
          ),
        }));
      },

      collapseAllColumns: () => {
        set((state) => ({
          columns: state.columns.map((col) => ({ ...col, isCollapsed: true })),
        }));
      },

      expandAllColumns: () => {
        set((state) => ({
          columns: state.columns.map((col) => ({ ...col, isCollapsed: false })),
        }));
      },

      // Global settings actions
      setSearchTerm: (term) => set({ searchTerm: term }),

      setGlobalFilter: (types) => set({ globalFilter: types }),

      clearGlobalFilter: () => set({ globalFilter: [], searchTerm: "" }),

      toggleCompactCards: () =>
        set((state) => ({ showCompactCards: !state.showCompactCards })),

      toggleWipWarnings: () =>
        set((state) => ({ showWipWarnings: !state.showWipWarnings })),

      // Modal actions
      openAddColumnModal: () => set({ isAddColumnModalOpen: true }),
      closeAddColumnModal: () => set({ isAddColumnModalOpen: false }),

      openEditColumnModal: (column) =>
        set({
          selectedColumn: column,
          isEditColumnModalOpen: true,
        }),

      closeEditColumnModal: () =>
        set({
          selectedColumn: null,
          isEditColumnModalOpen: false,
        }),

      openManageColumnsModal: () => set({ isManageColumnsModalOpen: true }),
      closeManageColumnsModal: () => set({ isManageColumnsModalOpen: false }),
    }),
    {
      name: "stacklume-kanban-columns",
      partialize: (state) => ({
        columns: state.columns,
        showCompactCards: state.showCompactCards,
        showWipWarnings: state.showWipWarnings,
      }),
    }
  )
);

// Helper hook to get sorted columns
export function useSortedColumns(): KanbanColumn[] {
  const columns = useKanbanStore((state) => state.columns);
  return [...columns].sort((a, b) => a.order - b.order);
}

// Helper hook to get a column by ID
export function useColumn(id: string): KanbanColumn | undefined {
  return useKanbanStore((state) => state.columns.find((col) => col.id === id));
}

// Helper hook to check if column has WIP warning
export function useColumnWipStatus(
  columnId: string,
  widgetCount: number
): { isOverLimit: boolean; isNearLimit: boolean; limitPercentage: number } {
  const column = useKanbanStore((state) =>
    state.columns.find((col) => col.id === columnId)
  );

  if (!column?.wipLimit) {
    return { isOverLimit: false, isNearLimit: false, limitPercentage: 0 };
  }

  const limitPercentage = (widgetCount / column.wipLimit) * 100;
  const isOverLimit = widgetCount > column.wipLimit;
  const isNearLimit = !isOverLimit && limitPercentage >= 80;

  return { isOverLimit, isNearLimit, limitPercentage };
}

// Helper hook to get filtered columns based on search
export function useFilteredWidgets() {
  const searchTerm = useKanbanStore((state) => state.searchTerm);
  const globalFilter = useKanbanStore((state) => state.globalFilter);

  return { searchTerm, globalFilter };
}
