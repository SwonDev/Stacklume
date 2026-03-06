"use client";

import { create } from "zustand";

interface MultiSelectState {
  /** Indica si el modo de selección múltiple está activo */
  isSelecting: boolean;
  /** IDs de los elementos actualmente seleccionados */
  selectedIds: Set<string>;

  /** Alternar entre modo selección activado/desactivado */
  toggleSelecting: () => void;
  /** Salir del modo selección y limpiar la selección */
  exitSelecting: () => void;
  /** Alternar la selección de un elemento individual */
  toggleItem: (id: string) => void;
  /** Seleccionar todos los elementos proporcionados */
  selectAll: (ids: string[]) => void;
  /** Limpiar toda la selección (sin salir del modo selección) */
  clearSelection: () => void;
  /** Verificar si un elemento está seleccionado */
  isSelected: (id: string) => boolean;
}

export const useMultiSelect = create<MultiSelectState>((set, get) => ({
  isSelecting: false,
  selectedIds: new Set<string>(),

  toggleSelecting: () =>
    set((state) => ({
      isSelecting: !state.isSelecting,
      selectedIds: new Set<string>(), // Limpiar al alternar
    })),

  exitSelecting: () =>
    set({
      isSelecting: false,
      selectedIds: new Set<string>(),
    }),

  toggleItem: (id) =>
    set((state) => {
      const next = new Set(state.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { selectedIds: next };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  clearSelection: () => set({ selectedIds: new Set<string>() }),

  isSelected: (id) => get().selectedIds.has(id),
}));
