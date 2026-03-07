"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Link,
  Plus,
  LayoutGrid,
  PenLine,
  Star,
  Clock,
  FolderOpen,
  Download,
  Copy,
  Activity,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useTranslation } from "@/lib/i18n";

interface CommandPaletteProps {
  onOpenImportExport?: () => void;
  onOpenDuplicates?: () => void;
  onOpenHealthCheck?: () => void;
}

export function CommandPalette({ onOpenImportExport, onOpenDuplicates, onOpenHealthCheck }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);

  // Ctrl+K / Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runAndClose = useCallback((fn: () => void) => {
    setOpen(false);
    fn();
  }, []);

  const favoriteLinks = links.filter((l) => l.isFavorite);
  const recentLinks = links
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>{t("commandPalette.searchPlaceholder")}</DialogTitle>
        </VisuallyHidden>
        <Command className="[&_[data-slot=command-input-wrapper]]:h-12">
      <CommandInput placeholder={t("commandPalette.searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("commandPalette.noResults")}</CommandEmpty>

        {/* Acciones rápidas */}
        <CommandGroup heading={t("commandPalette.actions")}>
          <CommandItem onSelect={() => runAndClose(() => useLinksStore.getState().setAddLinkModalOpen(true))}>
            <Plus className="mr-2 h-4 w-4" />
            {t("commandPalette.newLink")}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => useWidgetStore.getState().openAddWidgetModal())}>
            <LayoutGrid className="mr-2 h-4 w-4" />
            {t("commandPalette.addWidget")}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => useLayoutStore.getState().toggleEditMode())}>
            <PenLine className="mr-2 h-4 w-4" />
            {t("commandPalette.toggleEditMode")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Vistas */}
        <CommandGroup heading={t("commandPalette.views")}>
          <CommandItem onSelect={() => runAndClose(() => useLayoutStore.getState().setActiveFilter({ type: "favorites" }))}>
            <Star className="mr-2 h-4 w-4" />
            {t("commandPalette.viewFavorites")}
          </CommandItem>
          <CommandItem onSelect={() => runAndClose(() => useLayoutStore.getState().setActiveFilter({ type: "recent" }))}>
            <Clock className="mr-2 h-4 w-4" />
            {t("commandPalette.viewRecent")}
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* Herramientas */}
        <CommandGroup heading={t("commandPalette.settings")}>
          {onOpenImportExport && (
            <CommandItem onSelect={() => runAndClose(onOpenImportExport)}>
              <Download className="mr-2 h-4 w-4" />
              {t("commandPalette.importExport")}
            </CommandItem>
          )}
          {onOpenDuplicates && (
            <CommandItem onSelect={() => runAndClose(onOpenDuplicates)}>
              <Copy className="mr-2 h-4 w-4" />
              {t("commandPalette.findDuplicates")}
            </CommandItem>
          )}
          {onOpenHealthCheck && (
            <CommandItem onSelect={() => runAndClose(onOpenHealthCheck)}>
              <Activity className="mr-2 h-4 w-4" />
              {t("commandPalette.verifyLinks")}
            </CommandItem>
          )}
        </CommandGroup>

        <CommandSeparator />

        {/* Categorías */}
        {categories.length > 0 && (
          <CommandGroup heading={t("commandPalette.categories")}>
            {categories.map((cat) => (
              <CommandItem
                key={cat.id}
                onSelect={() => runAndClose(() => useLayoutStore.getState().setActiveFilter({ type: "category", id: cat.id }))}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                {cat.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        {/* Favoritos */}
        {favoriteLinks.length > 0 && (
          <CommandGroup heading={t("nav.favorites")}>
            {favoriteLinks.slice(0, 8).map((link) => (
              <CommandItem
                key={link.id}
                onSelect={() => {
                  setOpen(false);
                  window.open(link.url, "_blank", "noopener");
                }}
              >
                <Star className="mr-2 h-4 w-4 text-amber-500" />
                <span className="truncate">{link.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Recientes */}
        {recentLinks.length > 0 && (
          <CommandGroup heading={t("nav.recent")}>
            {recentLinks.map((link) => (
              <CommandItem
                key={link.id}
                onSelect={() => {
                  setOpen(false);
                  window.open(link.url, "_blank", "noopener");
                }}
              >
                <Link className="mr-2 h-4 w-4" />
                <span className="truncate">{link.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
