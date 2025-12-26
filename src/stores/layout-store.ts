import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayoutItem } from "@/lib/db/schema";

// Filter types
export type FilterType = "all" | "favorites" | "recent" | "category" | "tag";

export interface ActiveFilter {
  type: FilterType;
  id?: string; // For category or tag ID
  label?: string; // Display label for the filter
}

interface LayoutState {
  // Sidebar state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;

  // Layout items for react-grid-layout
  layouts: { lg: LayoutItem[]; md: LayoutItem[]; sm: LayoutItem[] };
  setLayouts: (layouts: {
    lg: LayoutItem[];
    md: LayoutItem[];
    sm: LayoutItem[];
  }) => void;
  updateLayout: (
    breakpoint: "lg" | "md" | "sm",
    newLayout: LayoutItem[]
  ) => void;

  // Active widget for editing
  activeWidgetId: string | null;
  setActiveWidgetId: (id: string | null) => void;

  // Edit mode
  isEditMode: boolean;
  toggleEditMode: () => void;
  setEditMode: (enabled: boolean) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Active filter (unified filter system)
  activeFilter: ActiveFilter;
  setActiveFilter: (filter: ActiveFilter) => void;
  clearFilter: () => void;

  // Legacy - kept for compatibility but use activeFilter instead
  activeCategoryId: string | null;
  setActiveCategoryId: (id: string | null) => void;
  activeTagId: string | null;
  setActiveTagId: (id: string | null) => void;
}

// Default layout configuration
const defaultLayouts = {
  lg: [
    { i: "favorites", x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "recent", x: 4, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "categories", x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
    { i: "links-1", x: 0, y: 3, w: 6, h: 4, minW: 2, minH: 2 },
    { i: "links-2", x: 6, y: 3, w: 6, h: 4, minW: 2, minH: 2 },
  ],
  md: [
    { i: "favorites", x: 0, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
    { i: "recent", x: 5, y: 0, w: 5, h: 3, minW: 2, minH: 2 },
    { i: "categories", x: 0, y: 3, w: 5, h: 3, minW: 2, minH: 2 },
    { i: "links-1", x: 5, y: 3, w: 5, h: 4, minW: 2, minH: 2 },
    { i: "links-2", x: 0, y: 7, w: 10, h: 4, minW: 2, minH: 2 },
  ],
  sm: [
    { i: "favorites", x: 0, y: 0, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "recent", x: 0, y: 3, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "categories", x: 0, y: 6, w: 6, h: 3, minW: 2, minH: 2 },
    { i: "links-1", x: 0, y: 9, w: 6, h: 4, minW: 2, minH: 2 },
    { i: "links-2", x: 0, y: 13, w: 6, h: 4, minW: 2, minH: 2 },
  ],
};

const defaultFilter: ActiveFilter = { type: "all" };

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      // Sidebar
      sidebarOpen: false,
      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // Layouts
      layouts: defaultLayouts,
      setLayouts: (layouts) => set({ layouts }),
      updateLayout: (breakpoint, newLayout) =>
        set((state) => ({
          layouts: { ...state.layouts, [breakpoint]: newLayout },
        })),

      // Active widget
      activeWidgetId: null,
      setActiveWidgetId: (id) => set({ activeWidgetId: id }),

      // Edit mode
      isEditMode: false,
      toggleEditMode: () =>
        set((state) => ({ isEditMode: !state.isEditMode })),
      setEditMode: (enabled) => set({ isEditMode: enabled }),

      // Search
      searchQuery: "",
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Active filter
      activeFilter: defaultFilter,
      setActiveFilter: (filter) => set({ activeFilter: filter, activeCategoryId: null, activeTagId: null }),
      clearFilter: () => set({ activeFilter: defaultFilter, searchQuery: "", activeCategoryId: null, activeTagId: null }),

      // Legacy - kept for compatibility
      activeCategoryId: null,
      setActiveCategoryId: (id) => set({ activeCategoryId: id }),
      activeTagId: null,
      setActiveTagId: (id) => set({ activeTagId: id }),
    }),
    {
      name: "stacklume-layout",
      partialize: (state) => ({
        layouts: state.layouts,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);
