import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  PlacedSticker,
  StickerDefinition,
  StickerTransform,
  DraggedSticker,
  DEFAULT_STICKER_CONFIG,
  STICKERS_PER_PAGE,
} from "@/types/sticker";

interface BookBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface StickerState {
  // Available stickers catalog
  availableStickers: StickerDefinition[];
  stickersByPage: StickerDefinition[][];

  // Placed stickers on the canvas
  placedStickers: PlacedSticker[];

  // UI state
  isStickerBookOpen: boolean;
  currentPage: number;
  selectedStickerId: string | null;
  draggedSticker: DraggedSticker | null;
  isDragging: boolean;
  maxZIndex: number;

  // Book bounds for drop validation
  bookBounds: BookBounds | null;

  // Animation state
  shouldPlayFallAnimation: boolean;

  // Actions - Catalog
  loadStickers: (stickers: StickerDefinition[]) => void;

  // Actions - Sticker Book UI
  openStickerBook: () => void;
  closeStickerBook: () => void;
  toggleStickerBook: () => void;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;

  // Actions - Animation
  resetFallAnimation: () => void;

  // Actions - Drag & Drop
  startDrag: (sticker: StickerDefinition, offsetX: number, offsetY: number) => void;
  endDrag: () => void;

  // Actions - Book bounds
  setBookBounds: (bounds: BookBounds | null) => void;
  isDropOutsideBook: (x: number, y: number) => boolean;

  // Actions - Placed Stickers
  placeSticker: (stickerId: string, filename: string, x: number, y: number, viewMode: 'bento' | 'kanban' | 'list', projectId: string | null, attachedToWidgetId?: string, widgetOffsetX?: number, widgetOffsetY?: number) => void;
  removeSticker: (id: string) => void;
  updateSticker: (id: string, transform: StickerTransform) => void;
  selectSticker: (id: string | null) => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  duplicateSticker: (id: string) => void;
  clearAllStickers: () => void;

  // Actions - Widget Attachment
  attachToWidget: (stickerId: string, widgetId: string, offsetX: number, offsetY: number) => void;
  detachFromWidget: (stickerId: string) => void;
  getStickersForWidget: (widgetId: string) => PlacedSticker[];

  // Actions - Context Filtering
  getStickersForContext: (viewMode: 'bento' | 'kanban' | 'list', projectId: string | null) => PlacedSticker[];

  // Computed
  getTotalPages: () => number;
  getPageStickers: (page: number) => StickerDefinition[];
}

export const useStickerStore = create<StickerState>()(
  persist(
    (set, get) => ({
      // Initial state
      availableStickers: [],
      stickersByPage: [],
      placedStickers: [],
      isStickerBookOpen: false,
      currentPage: 0,
      selectedStickerId: null,
      draggedSticker: null,
      isDragging: false,
      maxZIndex: 1000,
      bookBounds: null,
      shouldPlayFallAnimation: false,

      // Load stickers from catalog
      loadStickers: (stickers) => {
        // Organize stickers into pages
        const pages: StickerDefinition[][] = [];
        for (let i = 0; i < stickers.length; i += STICKERS_PER_PAGE) {
          pages.push(stickers.slice(i, i + STICKERS_PER_PAGE));
        }

        set({
          availableStickers: stickers,
          stickersByPage: pages,
        });
      },

      // Sticker Book UI
      openStickerBook: () => set({ isStickerBookOpen: true, shouldPlayFallAnimation: false }),
      closeStickerBook: () => {
        // Trigger fall animation if there are placed stickers
        const hasStickers = get().placedStickers.length > 0;
        set({
          isStickerBookOpen: false,
          shouldPlayFallAnimation: hasStickers,
        });
      },
      toggleStickerBook: () => set((state) => ({ isStickerBookOpen: !state.isStickerBookOpen })),

      // Animation
      resetFallAnimation: () => set({ shouldPlayFallAnimation: false }),

      setCurrentPage: (page) => {
        const totalPages = get().getTotalPages();
        if (page >= 0 && page < totalPages) {
          set({ currentPage: page });
        }
      },

      nextPage: () => {
        const { currentPage, getTotalPages } = get();
        const totalPages = getTotalPages();
        if (currentPage < totalPages - 1) {
          set({ currentPage: currentPage + 1 });
        }
      },

      prevPage: () => {
        const { currentPage } = get();
        if (currentPage > 0) {
          set({ currentPage: currentPage - 1 });
        }
      },

      // Drag & Drop
      startDrag: (sticker, offsetX, offsetY) => {
        set({
          draggedSticker: { sticker, offsetX, offsetY },
          isDragging: true,
        });
      },

      endDrag: () => {
        set({
          draggedSticker: null,
          isDragging: false,
        });
      },

      // Book bounds
      setBookBounds: (bounds) => set({ bookBounds: bounds }),

      isDropOutsideBook: (x, y) => {
        const { bookBounds, isStickerBookOpen } = get();
        // If book is not open, always allow drop
        if (!isStickerBookOpen || !bookBounds) return true;

        // Check if position is outside book bounds
        const isOutside =
          x < bookBounds.left ||
          x > bookBounds.right ||
          y < bookBounds.top ||
          y > bookBounds.bottom;

        return isOutside;
      },

      // Placed Stickers
      placeSticker: (stickerId, filename, x, y, viewMode, projectId, attachedToWidgetId, widgetOffsetX, widgetOffsetY) => {
        const { maxZIndex, placedStickers } = get();
        const newZIndex = maxZIndex + 1;

        const newSticker: PlacedSticker = {
          id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          stickerId,
          filename,
          x,
          y,
          ...DEFAULT_STICKER_CONFIG,
          zIndex: newZIndex,
          viewMode,
          projectId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...(attachedToWidgetId !== undefined ? { attachedToWidgetId, widgetOffsetX, widgetOffsetY } : {}),
        };

        set({
          placedStickers: [...placedStickers, newSticker],
          maxZIndex: newZIndex,
          isDragging: false,
          draggedSticker: null,
        });
      },

      removeSticker: (id) => {
        set((state) => ({
          placedStickers: state.placedStickers.filter((s) => s.id !== id),
          selectedStickerId: state.selectedStickerId === id ? null : state.selectedStickerId,
        }));
      },

      updateSticker: (id, transform) => {
        set((state) => ({
          placedStickers: state.placedStickers.map((sticker) => {
            if (sticker.id !== id) return sticker;

            // Create updated sticker with transform values
            const updated = {
              ...sticker,
              ...transform,
              updatedAt: new Date().toISOString(),
            };

            // Handle null -> undefined conversion for optional fields
            if (transform.attachedToWidgetId === null) {
              updated.attachedToWidgetId = undefined;
            }

            return updated as PlacedSticker;
          }),
        }));
      },

      selectSticker: (id) => set({ selectedStickerId: id }),

      bringToFront: (id) => {
        const { maxZIndex } = get();
        const newZIndex = maxZIndex + 1;

        set((state) => ({
          placedStickers: state.placedStickers.map((sticker) =>
            sticker.id === id
              ? { ...sticker, zIndex: newZIndex, updatedAt: new Date().toISOString() }
              : sticker
          ),
          maxZIndex: newZIndex,
        }));
      },

      sendToBack: (id) => {
        set((state) => {
          // Find minimum zIndex
          const minZ = Math.min(...state.placedStickers.map((s) => s.zIndex));

          return {
            placedStickers: state.placedStickers.map((sticker) =>
              sticker.id === id
                ? { ...sticker, zIndex: minZ - 1, updatedAt: new Date().toISOString() }
                : sticker
            ),
          };
        });
      },

      duplicateSticker: (id) => {
        const { placedStickers, maxZIndex } = get();
        const original = placedStickers.find((s) => s.id === id);

        if (original) {
          const newZIndex = maxZIndex + 1;
          const duplicate: PlacedSticker = {
            ...original,
            id: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            x: original.x + 20,
            y: original.y + 20,
            zIndex: newZIndex,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          set({
            placedStickers: [...placedStickers, duplicate],
            maxZIndex: newZIndex,
            selectedStickerId: duplicate.id,
          });
        }
      },

      clearAllStickers: () => set({ placedStickers: [], selectedStickerId: null }),

      // Widget Attachment
      attachToWidget: (stickerId, widgetId, offsetX, offsetY) => {
        set((state) => ({
          placedStickers: state.placedStickers.map((sticker) =>
            sticker.id === stickerId
              ? {
                  ...sticker,
                  attachedToWidgetId: widgetId,
                  widgetOffsetX: offsetX,
                  widgetOffsetY: offsetY,
                  updatedAt: new Date().toISOString(),
                }
              : sticker
          ),
        }));
      },

      detachFromWidget: (stickerId) => {
        set((state) => ({
          placedStickers: state.placedStickers.map((sticker) =>
            sticker.id === stickerId
              ? {
                  ...sticker,
                  attachedToWidgetId: undefined,
                  widgetOffsetX: undefined,
                  widgetOffsetY: undefined,
                  updatedAt: new Date().toISOString(),
                }
              : sticker
          ),
        }));
      },

      getStickersForWidget: (widgetId) => {
        return get().placedStickers.filter((s) => s.attachedToWidgetId === widgetId);
      },

      // Context Filtering
      getStickersForContext: (viewMode, projectId) => {
        return get().placedStickers.filter((s) => {
          // Filter by view mode
          if (s.viewMode !== viewMode) return false;
          // Normalize projectId: legacy stickers persisted before the field existed
          // may have undefined instead of null. Treat undefined as null.
          const stickerProjectId = s.projectId ?? null;
          if (stickerProjectId !== projectId) return false;
          return true;
        });
      },

      // Computed
      getTotalPages: () => get().stickersByPage.length,

      getPageStickers: (page) => {
        const { stickersByPage } = get();
        return stickersByPage[page] || [];
      },
    }),
    {
      name: "stacklume-stickers",
      partialize: (state) => ({
        placedStickers: state.placedStickers,
        maxZIndex: state.maxZIndex,
      }),
    }
  )
);
