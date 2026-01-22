"use client";

import { useEffect, useCallback, useRef } from "react";
import { useHistoryStore, type HistoryEntry, type HistoryAction, createActionDescription } from "@/stores/history-store";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import type { Link, Category, Tag } from "@/lib/db/schema";
import type { Widget } from "@/types/widget";

interface UseUndoRedoOptions {
  enableKeyboardShortcuts?: boolean;
}

interface UseUndoRedoReturn {
  // State
  canUndo: boolean;
  canRedo: boolean;
  undoDescription: string | null;
  redoDescription: string | null;
  showUndoToast: boolean;
  lastUndoableAction: HistoryEntry | null;

  // Actions
  undo: () => Promise<boolean>;
  redo: () => Promise<boolean>;
  dismissToast: () => void;

  // Helpers to record actions
  recordDeleteLink: (link: Link, tagIds?: string[]) => void;
  recordDeleteWidget: (widget: Widget) => void;
  recordDeleteCategory: (category: Category, affectedLinks?: Link[]) => void;
  recordDeleteTag: (tag: Tag, affectedLinkIds?: string[]) => void;
  recordMoveWidget: (
    widgetId: string,
    previousLayout: { x: number; y: number; w: number; h: number },
    newLayout: { x: number; y: number; w: number; h: number }
  ) => void;
  recordBulkDeleteLinks: (links: Array<{ link: Link; tagIds: string[] }>) => void;
  recordBulkDeleteWidgets: (widgets: Widget[]) => void;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const { enableKeyboardShortcuts = true } = options;

  // History store state
  const canUndoFn = useHistoryStore((state) => state.canUndo);
  const canRedoFn = useHistoryStore((state) => state.canRedo);
  const undoAction = useHistoryStore((state) => state.undo);
  const redoAction = useHistoryStore((state) => state.redo);
  const pushAction = useHistoryStore((state) => state.pushAction);
  const getUndoDescription = useHistoryStore((state) => state.getUndoDescription);
  const getRedoDescription = useHistoryStore((state) => state.getRedoDescription);
  const showUndoToast = useHistoryStore((state) => state.showUndoToast);
  const lastUndoableAction = useHistoryStore((state) => state.lastUndoableAction);
  const dismissUndoToast = useHistoryStore((state) => state.dismissUndoToast);

  // Refs for latest store functions to avoid stale closures
  const canUndoRef = useRef(canUndoFn);
  const canRedoRef = useRef(canRedoFn);

  // Update refs in effect to comply with React 19 rules
  useEffect(() => {
    canUndoRef.current = canUndoFn;
    canRedoRef.current = canRedoFn;
  }, [canUndoFn, canRedoFn]);

  // Perform undo operation
  const performUndo = useCallback(async (): Promise<boolean> => {
    const entry = undoAction();
    if (!entry) return false;

    try {
      await restoreAction(entry.action, "undo");
      return true;
    } catch (error) {
      console.error("Error performing undo:", error);
      return false;
    }
  }, [undoAction]);

  // Perform redo operation
  const performRedo = useCallback(async (): Promise<boolean> => {
    const entry = redoAction();
    if (!entry) return false;

    try {
      await restoreAction(entry.action, "redo");
      return true;
    } catch (error) {
      console.error("Error performing redo:", error);
      return false;
    }
  }, [redoAction]);

  // Record actions helpers
  const recordDeleteLink = useCallback(
    (link: Link, tagIds: string[] = []) => {
      const action: HistoryAction = {
        type: "DELETE_LINK",
        data: { link, tagIds },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordDeleteWidget = useCallback(
    (widget: Widget) => {
      const action: HistoryAction = {
        type: "DELETE_WIDGET",
        data: { widget },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordDeleteCategory = useCallback(
    (category: Category, affectedLinks: Link[] = []) => {
      const action: HistoryAction = {
        type: "DELETE_CATEGORY",
        data: { category, affectedLinks },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordDeleteTag = useCallback(
    (tag: Tag, affectedLinkIds: string[] = []) => {
      const action: HistoryAction = {
        type: "DELETE_TAG",
        data: { tag, affectedLinkIds },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordMoveWidget = useCallback(
    (
      widgetId: string,
      previousLayout: { x: number; y: number; w: number; h: number },
      newLayout: { x: number; y: number; w: number; h: number }
    ) => {
      const action: HistoryAction = {
        type: "MOVE_WIDGET",
        data: { widgetId, previousLayout, newLayout },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordBulkDeleteLinks = useCallback(
    (links: Array<{ link: Link; tagIds: string[] }>) => {
      const action: HistoryAction = {
        type: "BULK_DELETE_LINKS",
        data: { links },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  const recordBulkDeleteWidgets = useCallback(
    (widgets: Widget[]) => {
      const action: HistoryAction = {
        type: "BULK_DELETE_WIDGETS",
        data: { widgets },
      };
      pushAction(action, createActionDescription(action));
    },
    [pushAction]
  );

  // Keyboard shortcuts effect
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = async (event: KeyboardEvent) => {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier) return;

      // Prevent shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInputField) return;

      // Cmd/Ctrl + Z = Undo
      // Cmd/Ctrl + Shift + Z = Redo
      if (event.key.toLowerCase() === "z") {
        if (event.shiftKey) {
          // Redo
          if (canRedoRef.current()) {
            event.preventDefault();
            await performRedo();
          }
        } else {
          // Undo
          if (canUndoRef.current()) {
            event.preventDefault();
            await performUndo();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcuts, performUndo, performRedo]);

  return {
    canUndo: canUndoFn(),
    canRedo: canRedoFn(),
    undoDescription: getUndoDescription(),
    redoDescription: getRedoDescription(),
    showUndoToast,
    lastUndoableAction,
    undo: performUndo,
    redo: performRedo,
    dismissToast: dismissUndoToast,
    recordDeleteLink,
    recordDeleteWidget,
    recordDeleteCategory,
    recordDeleteTag,
    recordMoveWidget,
    recordBulkDeleteLinks,
    recordBulkDeleteWidgets,
  };
}

// Helper function to restore/reverse an action
async function restoreAction(action: HistoryAction, operation: "undo" | "redo"): Promise<void> {
  switch (action.type) {
    case "DELETE_LINK": {
      if (operation === "undo") {
        // Restore the deleted link
        const { link, tagIds } = action.data;
        try {
          const response = await fetch("/api/links", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify(link),
          });

          if (response.ok) {
            const restoredLink = await response.json();
            useLinksStore.getState().addLink(restoredLink);

            // Restore tag associations
            for (const tagId of tagIds) {
              await fetch("/api/link-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                credentials: "include",
                body: JSON.stringify({ linkId: restoredLink.id, tagId }),
              });
              useLinksStore.getState().addLinkTag(restoredLink.id, tagId);
            }
          }
        } catch (error) {
          console.error("Error restoring link:", error);
        }
      }
      break;
    }

    case "DELETE_WIDGET": {
      if (operation === "undo") {
        // Restore the deleted widget
        const { widget } = action.data;
        try {
          const response = await fetch("/api/widgets", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify(widget),
          });

          if (response.ok) {
            const restoredWidget = await response.json();
            useWidgetStore.setState((state) => ({
              widgets: [...state.widgets, restoredWidget],
            }));
          }
        } catch (error) {
          console.error("Error restoring widget:", error);
        }
      }
      break;
    }

    case "DELETE_CATEGORY": {
      if (operation === "undo") {
        // Restore the deleted category
        const { category, affectedLinks } = action.data;
        try {
          const response = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify(category),
          });

          if (response.ok) {
            const restoredCategory = await response.json();
            useLinksStore.getState().addCategory(restoredCategory);

            // Restore links' category associations
            for (const link of affectedLinks) {
              await fetch(`/api/links/${link.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                credentials: "include",
                body: JSON.stringify({ categoryId: restoredCategory.id }),
              });
              useLinksStore.getState().updateLink(link.id, { categoryId: restoredCategory.id });
            }
          }
        } catch (error) {
          console.error("Error restoring category:", error);
        }
      }
      break;
    }

    case "DELETE_TAG": {
      if (operation === "undo") {
        // Restore the deleted tag
        const { tag, affectedLinkIds } = action.data;
        try {
          const response = await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify(tag),
          });

          if (response.ok) {
            const restoredTag = await response.json();
            useLinksStore.getState().addTag(restoredTag);

            // Restore link-tag associations
            for (const linkId of affectedLinkIds) {
              await fetch("/api/link-tags", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                credentials: "include",
                body: JSON.stringify({ linkId, tagId: restoredTag.id }),
              });
              useLinksStore.getState().addLinkTag(linkId, restoredTag.id);
            }
          }
        } catch (error) {
          console.error("Error restoring tag:", error);
        }
      }
      break;
    }

    case "MOVE_WIDGET": {
      const { widgetId, previousLayout, newLayout } = action.data;
      const targetLayout = operation === "undo" ? previousLayout : newLayout;

      useWidgetStore.getState().updateWidget(widgetId, {
        layout: targetLayout,
      });
      break;
    }

    case "BULK_DELETE_LINKS": {
      if (operation === "undo") {
        // Restore all deleted links
        for (const { link, tagIds } of action.data.links) {
          try {
            const response = await fetch("/api/links", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
              credentials: "include",
              body: JSON.stringify(link),
            });

            if (response.ok) {
              const restoredLink = await response.json();
              useLinksStore.getState().addLink(restoredLink);

              // Restore tag associations
              for (const tagId of tagIds) {
                await fetch("/api/link-tags", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                  credentials: "include",
                  body: JSON.stringify({ linkId: restoredLink.id, tagId }),
                });
                useLinksStore.getState().addLinkTag(restoredLink.id, tagId);
              }
            }
          } catch (error) {
            console.error("Error restoring link:", error);
          }
        }
      }
      break;
    }

    case "BULK_DELETE_WIDGETS": {
      if (operation === "undo") {
        // Restore all deleted widgets
        for (const widget of action.data.widgets) {
          try {
            const response = await fetch("/api/widgets", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
              credentials: "include",
              body: JSON.stringify(widget),
            });

            if (response.ok) {
              const restoredWidget = await response.json();
              useWidgetStore.setState((state) => ({
                widgets: [...state.widgets, restoredWidget],
              }));
            }
          } catch (error) {
            console.error("Error restoring widget:", error);
          }
        }
      }
      break;
    }
  }
}

// Export a simple hook for components that just need undo toast functionality
export function useUndoToast() {
  const showUndoToast = useHistoryStore((state) => state.showUndoToast);
  const lastUndoableAction = useHistoryStore((state) => state.lastUndoableAction);
  const dismissUndoToast = useHistoryStore((state) => state.dismissUndoToast);
  const undoAction = useHistoryStore((state) => state.undo);

  const handleUndo = useCallback(async () => {
    const entry = undoAction();
    if (entry) {
      await restoreAction(entry.action, "undo");
    }
  }, [undoAction]);

  return {
    showToast: showUndoToast,
    action: lastUndoableAction,
    dismiss: dismissUndoToast,
    undo: handleUndo,
  };
}
