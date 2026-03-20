"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTranslation } from "@/lib/i18n";

interface ShortcutEntry {
  keys: string[];
  descriptionKey: string;
}

interface ShortcutGroup {
  titleKey: string;
  shortcuts: ShortcutEntry[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    titleKey: "shortcuts.global",
    shortcuts: [
      { keys: ["Ctrl", "K"], descriptionKey: "shortcuts.focusSearch" },
      { keys: ["Ctrl", "N"], descriptionKey: "shortcuts.newLink" },
      { keys: ["Ctrl", "Z"], descriptionKey: "shortcuts.undo" },
      { keys: ["Ctrl", "Y"], descriptionKey: "shortcuts.redo" },
      { keys: ["Esc"], descriptionKey: "shortcuts.exitEditMode" },
      { keys: ["?"], descriptionKey: "shortcuts.showShortcuts" },
    ],
  },
  {
    titleKey: "shortcuts.kanban",
    shortcuts: [
      { keys: ["/"], descriptionKey: "shortcuts.searchVim" },
      { keys: ["N"], descriptionKey: "shortcuts.newWidget" },
      { keys: ["C"], descriptionKey: "shortcuts.newColumn" },
      { keys: ["Esc"], descriptionKey: "shortcuts.clearFilters" },
      { keys: ["Ctrl", "K"], descriptionKey: "shortcuts.searchWidgets" },
      { keys: ["Ctrl", "M"], descriptionKey: "shortcuts.manageColumns" },
      { keys: ["Ctrl", "J"], descriptionKey: "shortcuts.collapseExpand" },
      { keys: ["Ctrl", "Shift", "C"], descriptionKey: "shortcuts.newColumn" },
      { keys: ["Ctrl", "Shift", "N"], descriptionKey: "shortcuts.newWidget" },
    ],
  },
];

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1.5 rounded border border-border bg-muted text-muted-foreground text-xs font-mono font-medium shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsModal() {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener("stacklume:show-shortcuts", handler);
    return () => window.removeEventListener("stacklume:show-shortcuts", handler);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("shortcuts.title")}</DialogTitle>
          <DialogDescription className="sr-only">
            {t("shortcuts.title")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.titleKey}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {t(group.titleKey)}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.descriptionKey}
                    className="flex items-center justify-between py-1.5"
                  >
                    <span className="text-sm">{t(shortcut.descriptionKey)}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i} className="flex items-center gap-1">
                          {i > 0 && <span className="text-xs text-muted-foreground">+</span>}
                          <Kbd>{key}</Kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
