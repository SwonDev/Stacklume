"use client";

import { useEffect, useRef } from "react";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";

export function useKeyboardShortcuts() {
  // Use individual selectors to prevent unnecessary re-renders
  const isEditMode = useLayoutStore((state) => state.isEditMode);

  // Use refs for functions to avoid recreating the callback
  const isEditModeRef = useRef(isEditMode);

  // Update ref in effect to comply with React 19 rules
  useEffect(() => {
    isEditModeRef.current = isEditMode;
  }, [isEditMode]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd (Mac) or Ctrl (Windows/Linux)
      const isModifier = event.metaKey || event.ctrlKey;

      // Prevent shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // Handle Escape key without modifiers
      if (event.key === "Escape" && !isModifier) {
        // Exit edit mode if active
        if (isEditModeRef.current) {
          event.preventDefault();
          useLayoutStore.getState().setEditMode(false);
          return;
        }
        // Clear search if not in input field
        if (!isInputField) {
          useLayoutStore.getState().setSearchQuery("");
        }
        return;
      }

      // Other shortcuts require modifier key
      if (!isModifier) return;

      switch (event.key.toLowerCase()) {
        case "k":
          // Cmd+K: Focus search (clear current filter and open search)
          event.preventDefault();
          // Focus the search input in the header
          const searchInput = document.querySelector<HTMLInputElement>(
            'input[placeholder*="Buscar"]'
          );
          if (searchInput) {
            searchInput.focus();
            searchInput.select();
          }
          break;

        case "n":
          // Cmd+N: New link (only if not in input field)
          if (!isInputField) {
            event.preventDefault();
            useLinksStore.getState().setAddLinkModalOpen(true);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
     
  }, []); // Run once - store functions are stable
}
