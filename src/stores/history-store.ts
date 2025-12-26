import { create } from "zustand";
import type { Link, Category, Tag } from "@/lib/db/schema";
import type { Widget } from "@/types/widget";

// Action types that can be undone/redone
export type ActionType =
  | "DELETE_LINK"
  | "DELETE_WIDGET"
  | "DELETE_CATEGORY"
  | "DELETE_TAG"
  | "MOVE_WIDGET"
  | "BULK_DELETE_LINKS"
  | "BULK_DELETE_WIDGETS"
  | "UPDATE_LINK"
  | "UPDATE_WIDGET";

// Data structures for each action type
export interface DeleteLinkAction {
  type: "DELETE_LINK";
  data: {
    link: Link;
    tagIds: string[]; // Associated tag IDs for restoration
  };
}

export interface DeleteWidgetAction {
  type: "DELETE_WIDGET";
  data: {
    widget: Widget;
  };
}

export interface DeleteCategoryAction {
  type: "DELETE_CATEGORY";
  data: {
    category: Category;
    affectedLinks: Link[]; // Links that belonged to this category
  };
}

export interface DeleteTagAction {
  type: "DELETE_TAG";
  data: {
    tag: Tag;
    affectedLinkIds: string[]; // Links that had this tag
  };
}

export interface MoveWidgetAction {
  type: "MOVE_WIDGET";
  data: {
    widgetId: string;
    previousLayout: { x: number; y: number; w: number; h: number };
    newLayout: { x: number; y: number; w: number; h: number };
  };
}

export interface BulkDeleteLinksAction {
  type: "BULK_DELETE_LINKS";
  data: {
    links: Array<{
      link: Link;
      tagIds: string[];
    }>;
  };
}

export interface BulkDeleteWidgetsAction {
  type: "BULK_DELETE_WIDGETS";
  data: {
    widgets: Widget[];
  };
}

export interface UpdateLinkAction {
  type: "UPDATE_LINK";
  data: {
    linkId: string;
    previousData: Partial<Link>;
    newData: Partial<Link>;
  };
}

export interface UpdateWidgetAction {
  type: "UPDATE_WIDGET";
  data: {
    widgetId: string;
    previousData: Partial<Widget>;
    newData: Partial<Widget>;
  };
}

// Union type for all actions
export type HistoryAction =
  | DeleteLinkAction
  | DeleteWidgetAction
  | DeleteCategoryAction
  | DeleteTagAction
  | MoveWidgetAction
  | BulkDeleteLinksAction
  | BulkDeleteWidgetsAction
  | UpdateLinkAction
  | UpdateWidgetAction;

// Timestamps and metadata for history entry
export interface HistoryEntry {
  id: string;
  action: HistoryAction;
  timestamp: number;
  description: string; // Human-readable description for the toast
}

const MAX_HISTORY_SIZE = 50;

interface HistoryState {
  // History stacks
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];

  // Actions
  pushAction: (action: HistoryAction, description: string) => string;
  undo: () => HistoryEntry | null;
  redo: () => HistoryEntry | null;
  clearHistory: () => void;

  // Getters
  canUndo: () => boolean;
  canRedo: () => boolean;
  getLastAction: () => HistoryEntry | null;
  getUndoDescription: () => string | null;
  getRedoDescription: () => string | null;

  // Toast management
  showUndoToast: boolean;
  lastUndoableAction: HistoryEntry | null;
  setShowUndoToast: (show: boolean) => void;
  dismissUndoToast: () => void;
}

function generateId(): string {
  return `hist_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export const useHistoryStore = create<HistoryState>()((set, get) => ({
  undoStack: [],
  redoStack: [],
  showUndoToast: false,
  lastUndoableAction: null,

  pushAction: (action, description) => {
    const entry: HistoryEntry = {
      id: generateId(),
      action,
      timestamp: Date.now(),
      description,
    };

    set((state) => {
      const newUndoStack = [entry, ...state.undoStack].slice(0, MAX_HISTORY_SIZE);
      return {
        undoStack: newUndoStack,
        redoStack: [], // Clear redo stack on new action
        showUndoToast: true,
        lastUndoableAction: entry,
      };
    });

    return entry.id;
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return null;

    const [entry, ...remainingUndo] = state.undoStack;

    set({
      undoStack: remainingUndo,
      redoStack: [entry, ...state.redoStack].slice(0, MAX_HISTORY_SIZE),
      showUndoToast: false,
      lastUndoableAction: remainingUndo[0] || null,
    });

    return entry;
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return null;

    const [entry, ...remainingRedo] = state.redoStack;

    set({
      undoStack: [entry, ...state.undoStack].slice(0, MAX_HISTORY_SIZE),
      redoStack: remainingRedo,
      showUndoToast: true,
      lastUndoableAction: entry,
    });

    return entry;
  },

  clearHistory: () => {
    set({
      undoStack: [],
      redoStack: [],
      showUndoToast: false,
      lastUndoableAction: null,
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  getLastAction: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? stack[0] : null;
  },

  getUndoDescription: () => {
    const stack = get().undoStack;
    return stack.length > 0 ? stack[0].description : null;
  },

  getRedoDescription: () => {
    const stack = get().redoStack;
    return stack.length > 0 ? stack[0].description : null;
  },

  setShowUndoToast: (show) => set({ showUndoToast: show }),

  dismissUndoToast: () => set({ showUndoToast: false }),
}));

// Helper function to get action type label in Spanish
export function getActionTypeLabel(type: ActionType): string {
  const labels: Record<ActionType, string> = {
    DELETE_LINK: "Eliminar enlace",
    DELETE_WIDGET: "Eliminar widget",
    DELETE_CATEGORY: "Eliminar categoria",
    DELETE_TAG: "Eliminar etiqueta",
    MOVE_WIDGET: "Mover widget",
    BULK_DELETE_LINKS: "Eliminar enlaces",
    BULK_DELETE_WIDGETS: "Eliminar widgets",
    UPDATE_LINK: "Actualizar enlace",
    UPDATE_WIDGET: "Actualizar widget",
  };
  return labels[type];
}

// Helper to create descriptions for actions
export function createActionDescription(action: HistoryAction): string {
  switch (action.type) {
    case "DELETE_LINK":
      return `Enlace "${action.data.link.title}" eliminado`;
    case "DELETE_WIDGET":
      return `Widget "${action.data.widget.title}" eliminado`;
    case "DELETE_CATEGORY":
      return `Categoria "${action.data.category.name}" eliminada`;
    case "DELETE_TAG":
      return `Etiqueta "${action.data.tag.name}" eliminada`;
    case "MOVE_WIDGET":
      return "Widget movido";
    case "BULK_DELETE_LINKS":
      return `${action.data.links.length} enlaces eliminados`;
    case "BULK_DELETE_WIDGETS":
      return `${action.data.widgets.length} widgets eliminados`;
    case "UPDATE_LINK":
      return "Enlace actualizado";
    case "UPDATE_WIDGET":
      return "Widget actualizado";
  }
}
