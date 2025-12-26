import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SortBy = "createdAt" | "title" | "updatedAt";
export type SortOrder = "asc" | "desc";

interface ListViewState {
  // Collapsed state per category (Set stored as array for persistence)
  collapsedCategories: string[];
  toggleCategoryCollapsed: (categoryId: string) => void;
  collapseAll: (categoryIds: string[]) => void;
  expandAll: () => void;
  isCategoryCollapsed: (categoryId: string) => boolean;

  // Sort options
  sortBy: SortBy;
  sortOrder: SortOrder;
  setSortBy: (sort: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;

  // Local search (supplements global search)
  localSearchQuery: string;
  setLocalSearchQuery: (query: string) => void;

  // Show empty categories toggle
  showEmptyCategories: boolean;
  setShowEmptyCategories: (show: boolean) => void;

  // Group uncategorized links
  showUncategorized: boolean;
  setShowUncategorized: (show: boolean) => void;
}

export const useListViewStore = create<ListViewState>()(
  persist(
    (set, get) => ({
      // Default values
      collapsedCategories: [],
      sortBy: "createdAt",
      sortOrder: "desc",
      localSearchQuery: "",
      showEmptyCategories: false,
      showUncategorized: true,

      // Toggle category collapsed state
      toggleCategoryCollapsed: (categoryId: string) => {
        const current = get().collapsedCategories;
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
    }),
    {
      name: "stacklume-list-view",
      partialize: (state) => ({
        collapsedCategories: state.collapsedCategories,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        showEmptyCategories: state.showEmptyCategories,
        showUncategorized: state.showUncategorized,
      }),
    }
  )
);
