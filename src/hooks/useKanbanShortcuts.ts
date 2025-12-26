"use client";

import { useEffect, useCallback } from "react";
import { useKanbanStore } from "@/stores/kanban-store";
import { useWidgetStore } from "@/stores/widget-store";
import { toast } from "sonner";

interface UseKanbanShortcutsOptions {
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  enabled?: boolean;
}

export function useKanbanShortcuts(options: UseKanbanShortcutsOptions = {}) {
  const { enabled = true, searchInputRef } = options;

  const {
    openAddColumnModal,
    openManageColumnsModal,
    clearGlobalFilter,
    setSearchTerm,
    collapseAllColumns,
    expandAllColumns,
    columns,
  } = useKanbanStore();

  const { openAddWidgetModal } = useWidgetStore();

  // Track if all columns are collapsed
  const allColumnsCollapsed = columns.every((c) => c.isCollapsed);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Check for modifiers
      const isModifier = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      // Get target element
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      const key = event.key.toLowerCase();

      // Modifier shortcuts (Ctrl/Cmd + key)
      if (isModifier) {
        switch (key) {
          case "k":
            // Ctrl+K: Focus Kanban search
            event.preventDefault();
            if (searchInputRef?.current) {
              searchInputRef.current.focus();
              searchInputRef.current.select();
            } else {
              // Fallback: find by placeholder
              const searchInput = document.querySelector<HTMLInputElement>(
                'input[placeholder*="Buscar widgets"]'
              );
              if (searchInput) {
                searchInput.focus();
                searchInput.select();
              }
            }
            break;

          case "m":
            // Ctrl+M: Open manage columns modal
            if (!isInputField) {
              event.preventDefault();
              openManageColumnsModal();
            }
            break;

          case "j":
            // Ctrl+J: Toggle collapse all columns
            if (!isInputField) {
              event.preventDefault();
              if (allColumnsCollapsed) {
                expandAllColumns();
                toast.success("Columnas expandidas");
              } else {
                collapseAllColumns();
                toast.success("Columnas colapsadas");
              }
            }
            break;
        }

        // Ctrl+Shift shortcuts
        if (isShift) {
          switch (key) {
            case "c":
              // Ctrl+Shift+C: Add new column
              if (!isInputField) {
                event.preventDefault();
                openAddColumnModal();
              }
              break;

            case "n":
              // Ctrl+Shift+N: Add new widget
              if (!isInputField) {
                event.preventDefault();
                openAddWidgetModal();
              }
              break;
          }
        }
      }

      // Non-modifier shortcuts (only when not in input field)
      if (!isModifier && !isInputField) {
        switch (key) {
          case "escape":
            // Escape: Clear filters and search
            event.preventDefault();
            clearGlobalFilter();
            setSearchTerm("");
            toast.success("Filtros limpiados");
            break;

          case "/":
            // /: Focus search (vim-style)
            event.preventDefault();
            if (searchInputRef?.current) {
              searchInputRef.current.focus();
              searchInputRef.current.select();
            } else {
              const searchInput = document.querySelector<HTMLInputElement>(
                'input[placeholder*="Buscar widgets"]'
              );
              if (searchInput) {
                searchInput.focus();
                searchInput.select();
              }
            }
            break;

          case "n":
            // n: Add new widget (quick)
            event.preventDefault();
            openAddWidgetModal();
            break;

          case "c":
            // c: Add new column (quick)
            event.preventDefault();
            openAddColumnModal();
            break;
        }
      }
    },
    [
      enabled,
      searchInputRef,
      openAddColumnModal,
      openManageColumnsModal,
      openAddWidgetModal,
      clearGlobalFilter,
      setSearchTerm,
      collapseAllColumns,
      expandAllColumns,
      allColumnsCollapsed,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, handleKeyDown]);

  // Return some useful values
  return {
    shortcuts: [
      { key: "/", description: "Buscar widgets" },
      { key: "n", description: "Nuevo widget" },
      { key: "c", description: "Nueva columna" },
      { key: "Esc", description: "Limpiar filtros" },
      { key: "Ctrl+K", description: "Buscar widgets" },
      { key: "Ctrl+M", description: "Gestionar columnas" },
      { key: "Ctrl+J", description: "Colapsar/Expandir columnas" },
      { key: "Ctrl+Shift+C", description: "Nueva columna" },
      { key: "Ctrl+Shift+N", description: "Nuevo widget" },
    ],
  };
}
