import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type SortBy = "createdAt" | "title" | "updatedAt";
export type SortOrder = "asc" | "desc";
export type CategorySortBy = "manual" | "alphabetical" | "linkCount" | "lastUsed";

interface ListViewState {
  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Collapsed state per category (Set stored as array for persistence)
  collapsedCategories: string[];
  toggleCategoryCollapsed: (categoryId: string) => void;
  collapseAll: (categoryIds: string[]) => void;
  expandAll: () => void;
  isCategoryCollapsed: (categoryId: string) => boolean;

  // Sort options (links)
  sortBy: SortBy;
  sortOrder: SortOrder;
  setSortBy: (sort: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;

  // Sort options (categories)
  categorySortBy: CategorySortBy;
  categorySortOrder: SortOrder;
  setCategorySortBy: (sort: CategorySortBy) => void;
  setCategorySortOrder: (order: SortOrder) => void;

  // Local search (supplements global search)
  localSearchQuery: string;
  setLocalSearchQuery: (query: string) => void;

  // Show empty categories toggle
  showEmptyCategories: boolean;
  setShowEmptyCategories: (show: boolean) => void;

  // Group uncategorized links
  showUncategorized: boolean;
  setShowUncategorized: (show: boolean) => void;

  // Position of uncategorized section among sorted categories (index in combined list)
  uncategorizedPosition: number;
  setUncategorizedPosition: (pos: number) => void;
}

export const useListViewStore = create<ListViewState>()(
  persist(
    (set, get) => ({
      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (state: boolean) => set({ _hasHydrated: state }),

      // Default values
      collapsedCategories: [],
      sortBy: "createdAt",
      sortOrder: "desc",
      categorySortBy: "manual",
      categorySortOrder: "asc",
      localSearchQuery: "",
      showEmptyCategories: false,
      showUncategorized: true,
      uncategorizedPosition: 9999,

      // Toggle category collapsed state
      toggleCategoryCollapsed: (categoryId: string) => {
        const current = [...get().collapsedCategories]; // Create a new array to ensure React detects change
        const isCollapsed = current.includes(categoryId);

        if (isCollapsed) {
          set({ collapsedCategories: current.filter(id => id !== categoryId) });
        } else {
          set({ collapsedCategories: [...current, categoryId] });
        }
      },

      // Collapse all categories
      collapseAll: (categoryIds: string[]) => {
        set({ collapsedCategories: categoryIds });
      },

      // Expand all categories
      expandAll: () => {
        set({ collapsedCategories: [] });
      },

      // Check if category is collapsed
      isCategoryCollapsed: (categoryId: string) => {
        return get().collapsedCategories.includes(categoryId);
      },

      // Set sort field
      setSortBy: (sortBy: SortBy) => {
        set({ sortBy });
      },

      // Set sort order
      setSortOrder: (sortOrder: SortOrder) => {
        set({ sortOrder });
      },

      // Set category sort field
      setCategorySortBy: (categorySortBy: CategorySortBy) => {
        set({ categorySortBy });
      },

      // Set category sort order
      setCategorySortOrder: (categorySortOrder: SortOrder) => {
        set({ categorySortOrder });
      },

      // Set local search query
      setLocalSearchQuery: (localSearchQuery: string) => {
        set({ localSearchQuery });
      },

      // Show/hide empty categories
      setShowEmptyCategories: (showEmptyCategories: boolean) => {
        set({ showEmptyCategories });
      },

      // Show/hide uncategorized section
      setShowUncategorized: (showUncategorized: boolean) => {
        set({ showUncategorized });
      },

      // Set uncategorized position
      setUncategorizedPosition: (uncategorizedPosition: number) => {
        set({ uncategorizedPosition });
      },
    }),
    {
      name: "stacklume-list-view",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        collapsedCategories: state.collapsedCategories,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        categorySortBy: state.categorySortBy,
        categorySortOrder: state.categorySortOrder,
        showEmptyCategories: state.showEmptyCategories,
        showUncategorized: state.showUncategorized,
        uncategorizedPosition: state.uncategorizedPosition,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Validate rehydrated state fields
          if (!Array.isArray(state.collapsedCategories)) {
            state.collapsedCategories = [];
          } else {
            state.collapsedCategories = state.collapsedCategories.filter(
              (id): id is string => typeof id === "string"
            );
          }

          const validSortBy: SortBy[] = ["createdAt", "title", "updatedAt"];
          if (!validSortBy.includes(state.sortBy as SortBy)) {
            state.sortBy = "createdAt";
          }

          const validSortOrder: SortOrder[] = ["asc", "desc"];
          if (!validSortOrder.includes(state.sortOrder as SortOrder)) {
            state.sortOrder = "desc";
          }

          const validCategorySortBy: CategorySortBy[] = ["manual", "alphabetical", "linkCount", "lastUsed"];
          if (!validCategorySortBy.includes(state.categorySortBy as CategorySortBy)) {
            state.categorySortBy = "manual";
          }
          if (!validSortOrder.includes(state.categorySortOrder as SortOrder)) {
            state.categorySortOrder = "asc";
          }

          if (typeof state.showEmptyCategories !== "boolean") {
            state.showEmptyCategories = false;
          }
          if (typeof state.showUncategorized !== "boolean") {
            state.showUncategorized = true;
          }
          if (typeof state.uncategorizedPosition !== "number" || state.uncategorizedPosition < 0) {
            state.uncategorizedPosition = 9999;
          }

          state.setHasHydrated(true);
        }
      },
    }
  )
);

// Helper hook to check if the store has hydrated
export const useListViewHasHydrated = () => useListViewStore((state) => state._hasHydrated);
