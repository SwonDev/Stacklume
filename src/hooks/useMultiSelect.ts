import { create } from "zustand";

interface MultiSelectState {
  isSelecting: boolean;
  selectedIds: Set<string>;
  toggleSelecting: () => void;
  exitSelecting: () => void;
  toggleItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
}

export const useMultiSelect = create<MultiSelectState>()((set, get) => ({
  isSelecting: false,
  selectedIds: new Set(),
  toggleSelecting: () =>
    set((s) => ({ isSelecting: !s.isSelecting, selectedIds: new Set() })),
  exitSelecting: () => set({ isSelecting: false, selectedIds: new Set() }),
  toggleItem: (id: string) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),
  selectAll: (ids: string[]) => set({ selectedIds: new Set(ids) }),
  clearSelection: () => set({ selectedIds: new Set() }),
  isSelected: (id: string) => get().selectedIds.has(id),
}));
