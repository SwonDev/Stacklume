"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useTheme } from "next-themes";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore, type ViewMode, type Theme } from "@/stores/settings-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { openExternalUrl } from "@/lib/desktop";
import { useTranslation } from "@/lib/i18n";
import {
  Search,
  Link2,
  FolderOpen,
  Tag,
  Plus,
  PenLine,
  Eye,
  Clock,
  Star,
  Trash2,
  LayoutGrid,
  Kanban,
  List,
  Sun,
  Moon,
  Monitor,
  Palette,
  Settings,
  ArrowRight,
  X,
  Activity,
  Copy,
} from "lucide-react";

// Estado global para abrir/cerrar la paleta desde cualquier componente
const paletteListeners = new Set<(open: boolean) => void>();

export function openCommandPalette() {
  paletteListeners.forEach((fn) => fn(true));
}

export function closeCommandPalette() {
  paletteListeners.forEach((fn) => fn(false));
}

// Submenú activo
type SubMenu = "theme" | "view" | null;

export function CommandPalette() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [subMenu, setSubMenu] = useState<SubMenu>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Stores
  const links = useLinksStore((s) => s.links);
  const categories = useLinksStore((s) => s.categories);
  const tags = useLinksStore((s) => s.tags);
  const viewMode = useSettingsStore((s) => s.viewMode);
  const { setTheme: setNextTheme } = useTheme();

  // Historial de búsqueda
  const { history, addToHistory, removeFromHistory, clearHistory } =
    useSearchHistory();

  // Suscribirse al sistema global de apertura
  useEffect(() => {
    const handler = (value: boolean) => setOpen(value);
    paletteListeners.add(handler);
    return () => {
      paletteListeners.delete(handler);
    };
  }, []);

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Limpiar estado al cerrar
  const handleOpenChange = useCallback((value: boolean) => {
    setOpen(value);
    if (!value) {
      // Limpiar al cerrar con un pequeño retardo para que la animación termine
      setTimeout(() => {
        setSearch("");
        setSubMenu(null);
      }, 150);
    }
  }, []);

  // Cerrar y ejecutar acción
  const runAction = useCallback(
    (action: () => void, query?: string) => {
      if (query) addToHistory(query);
      setOpen(false);
      // Ejecutar la acción después de que el dialog se cierre
      requestAnimationFrame(() => action());
    },
    [addToHistory]
  );

  // Filtrar enlaces por título o URL
  const filteredLinks = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return links
      .filter(
        (link) =>
          link.title.toLowerCase().includes(q) ||
          link.url.toLowerCase().includes(q) ||
          (link.notes && link.notes.toLowerCase().includes(q))
      )
      .slice(0, 5);
  }, [links, search]);

  // Filtrar categorías
  const filteredCategories = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return categories
      .filter((cat) => cat.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [categories, search]);

  // Filtrar etiquetas
  const filteredTags = useMemo(() => {
    if (!search) return [];
    const q = search.toLowerCase();
    return tags
      .filter((tag) => tag.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [tags, search]);

  // Temas disponibles
  const themeOptions: { id: Theme; label: string; icon: typeof Sun }[] = [
    { id: "system", label: "Sistema", icon: Monitor },
    { id: "light", label: "Claro - Dorado", icon: Sun },
    { id: "dark", label: "Oscuro - Naval", icon: Moon },
    { id: "midnight", label: "Medianoche", icon: Moon },
    { id: "ocean", label: "Oc\u00e9ano", icon: Moon },
    { id: "forest", label: "Bosque", icon: Moon },
    { id: "nordic", label: "Nordic", icon: Moon },
    { id: "catppuccin", label: "Catppuccin Mocha", icon: Moon },
    { id: "tokyo", label: "Tokyo Night", icon: Moon },
    { id: "rosepine", label: "Ros\u00e9 Pine", icon: Moon },
    { id: "gruvbox", label: "Gruvbox", icon: Moon },
    { id: "solarized", label: "Solarized Light", icon: Sun },
    { id: "solardark", label: "Solarized Dark", icon: Moon },
    { id: "arctic", label: "\u00c1rtico", icon: Sun },
    { id: "sakura", label: "Sakura", icon: Sun },
    { id: "lavender", label: "Lavanda", icon: Sun },
    { id: "mint", label: "Menta", icon: Sun },
    { id: "vampire", label: "Vampiro", icon: Moon },
    { id: "cement", label: "Cemento", icon: Sun },
    { id: "stone", label: "Piedra", icon: Sun },
    { id: "steel", label: "Acero", icon: Sun },
  ];

  // Opciones de vista
  const viewOptions: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] =
    [
      { id: "bento", label: t("commandPalette.viewBento"), icon: LayoutGrid },
      { id: "kanban", label: t("commandPalette.viewKanban"), icon: Kanban },
      { id: "list", label: t("commandPalette.viewList"), icon: List },
    ];

  // Contenido del submenú de temas
  if (subMenu === "theme") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="overflow-hidden p-0 max-w-lg"
          showCloseButton={false}
        >
          <VisuallyHidden>
            <DialogTitle>{t("commandPalette.selectTheme")}</DialogTitle>
          </VisuallyHidden>
          <Command className="rounded-lg">
            <div className="flex items-center border-b px-3">
              <button
                onClick={() => setSubMenu(null)}
                className="mr-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={t("commandPalette.back")}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              <CommandInput
                placeholder={t("commandPalette.searchTheme")}
                value={search}
                onValueChange={setSearch}
              />
            </div>
            <CommandList className="max-h-[400px]">
              <CommandEmpty>{t("commandPalette.noThemes")}</CommandEmpty>
              <CommandGroup heading={t("commandPalette.availableThemes")}>
                {themeOptions.map((theme) => {
                  const Icon = theme.icon;
                  return (
                    <CommandItem
                      key={theme.id}
                      value={theme.label}
                      onSelect={() =>
                        runAction(() => {
                          useSettingsStore.getState().setTheme(theme.id);
                          setNextTheme(theme.id === "system" ? "system" : theme.id);
                        })
                      }
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{theme.label}</span>
                      {viewMode && (
                        <CommandShortcut>
                          {theme.id === useSettingsStore.getState().theme
                            ? t("commandPalette.active")
                            : ""}
                        </CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  }

  // Contenido del submenú de vista
  if (subMenu === "view") {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="overflow-hidden p-0 max-w-lg"
          showCloseButton={false}
        >
          <VisuallyHidden>
            <DialogTitle>{t("commandPalette.changeViewTitle")}</DialogTitle>
          </VisuallyHidden>
          <Command className="rounded-lg">
            <div className="flex items-center border-b px-3">
              <button
                onClick={() => setSubMenu(null)}
                className="mr-2 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                aria-label={t("commandPalette.back")}
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
              </button>
              <CommandInput
                placeholder={t("commandPalette.searchView")}
                value={search}
                onValueChange={setSearch}
              />
            </div>
            <CommandList>
              <CommandEmpty>{t("commandPalette.noViews")}</CommandEmpty>
              <CommandGroup heading={t("commandPalette.viewModes")}>
                {viewOptions.map((view) => {
                  const Icon = view.icon;
                  return (
                    <CommandItem
                      key={view.id}
                      value={view.label}
                      onSelect={() =>
                        runAction(() => {
                          useSettingsStore.getState().setViewMode(view.id);
                        })
                      }
                    >
                      <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{view.label}</span>
                      <CommandShortcut>
                        {view.id === viewMode ? t("commandPalette.activeView") : ""}
                      </CommandShortcut>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    );
  }

  // Paleta principal
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden p-0 max-w-lg"
        showCloseButton={false}
      >
        <VisuallyHidden>
          <DialogTitle>{t("commandPalette.title")}</DialogTitle>
        </VisuallyHidden>
        <Command className="rounded-lg" shouldFilter={true}>
          <CommandInput
            ref={inputRef}
            placeholder={t("commandPalette.searchPlaceholder")}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[400px]">
            <CommandEmpty>
              {t("commandPalette.noResults")} &ldquo;{search}&rdquo;
            </CommandEmpty>

            {/* Búsquedas recientes - solo cuando no hay texto de búsqueda */}
            {!search && history.length > 0 && (
              <CommandGroup heading={t("commandPalette.recentSearches")}>
                {history.slice(0, 5).map((h) => (
                  <CommandItem
                    key={`history-${h}`}
                    value={`historial: ${h}`}
                    onSelect={() => setSearch(h)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{h}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(h);
                      }}
                      className="ml-2 flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      aria-label={`Eliminar "${h}" del historial`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </CommandItem>
                ))}
                <CommandItem
                  value="limpiar historial de búsqueda"
                  onSelect={() => clearHistory()}
                  className="text-muted-foreground"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="text-xs">{t("commandPalette.clearHistory")}</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Acceso rápido - cuando no hay búsqueda */}
            {!search && (
              <CommandGroup heading={t("commandPalette.quickAccess")}>
                <CommandItem
                  value="nuevo enlace añadir link"
                  onSelect={() =>
                    runAction(() =>
                      useLinksStore.getState().setAddLinkModalOpen(true)
                    )
                  }
                >
                  <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                  <span>{t("commandPalette.newLink")}</span>
                  <CommandShortcut>Ctrl+N</CommandShortcut>
                </CommandItem>
                <CommandItem
                  value="nueva categoría añadir carpeta"
                  onSelect={() =>
                    runAction(() =>
                      useLinksStore.getState().setAddCategoryModalOpen(true)
                    )
                  }
                >
                  <FolderOpen className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{t("commandPalette.newCategory")}</span>
                </CommandItem>
                <CommandItem
                  value="nueva etiqueta añadir tag"
                  onSelect={() =>
                    runAction(() =>
                      useLinksStore.getState().setAddTagModalOpen(true)
                    )
                  }
                >
                  <Tag className="mr-2 h-4 w-4 text-violet-500" />
                  <span>{t("commandPalette.newTag")}</span>
                </CommandItem>
                <CommandItem
                  value="añadir widget nuevo"
                  onSelect={() =>
                    runAction(() =>
                      useWidgetStore.getState().openAddWidgetModal()
                    )
                  }
                >
                  <LayoutGrid className="mr-2 h-4 w-4 text-amber-500" />
                  <span>{t("commandPalette.addWidget")}</span>
                </CommandItem>
              </CommandGroup>
            )}

            {/* Enlaces que coinciden con la búsqueda */}
            {search && filteredLinks.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("commandPalette.links")}>
                  {filteredLinks.map((link) => (
                    <CommandItem
                      key={link.id}
                      value={`enlace: ${link.title} ${link.url}`}
                      onSelect={() =>
                        runAction(() => openExternalUrl(link.url), search)
                      }
                    >
                      {link.faviconUrl ? (
                        <img
                          src={link.faviconUrl}
                          alt=""
                          className="mr-2 h-4 w-4 rounded-sm object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate text-sm">{link.title}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {link.url}
                        </span>
                      </div>
                      {link.isFavorite && (
                        <Star className="ml-2 h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Categorías que coinciden */}
            {search && filteredCategories.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("commandPalette.categories")}>
                  {filteredCategories.map((cat) => (
                    <CommandItem
                      key={cat.id}
                      value={`categoría: ${cat.name}`}
                      onSelect={() =>
                        runAction(() => {
                          useLayoutStore
                            .getState()
                            .setActiveFilter({
                              type: "category",
                              id: cat.id,
                              label: cat.name,
                            });
                        }, search)
                      }
                    >
                      <div
                        className="mr-2 h-3 w-3 rounded-full shrink-0"
                        style={{
                          backgroundColor: cat.color || "#6366f1",
                        }}
                      />
                      <span>{cat.name}</span>
                      <CommandShortcut>
                        {
                          links.filter((l) => l.categoryId === cat.id)
                            .length
                        }{" "}
                        {t("commandPalette.linksCount")}
                      </CommandShortcut>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Etiquetas que coinciden */}
            {search && filteredTags.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading={t("commandPalette.tags")}>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={`etiqueta: ${tag.name}`}
                      onSelect={() =>
                        runAction(() => {
                          useLayoutStore
                            .getState()
                            .setActiveFilter({
                              type: "tag",
                              id: tag.id,
                              label: tag.name,
                            });
                        }, search)
                      }
                    >
                      <Tag className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{tag.name}</span>
                      {tag.color && (
                        <div
                          className="ml-2 h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: tag.color }}
                        />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />

            {/* Acciones - siempre visibles */}
            <CommandGroup heading={t("commandPalette.actions")}>
              <CommandItem
                value="nuevo enlace añadir link bookmark"
                onSelect={() =>
                  runAction(() =>
                    useLinksStore.getState().setAddLinkModalOpen(true)
                  )
                }
              >
                <Plus className="mr-2 h-4 w-4 text-emerald-500" />
                <span>{t("commandPalette.newLink")}</span>
                <CommandShortcut>Ctrl+N</CommandShortcut>
              </CommandItem>
              <CommandItem
                value="nueva categoría carpeta folder"
                onSelect={() =>
                  runAction(() =>
                    useLinksStore.getState().setAddCategoryModalOpen(true)
                  )
                }
              >
                <FolderOpen className="mr-2 h-4 w-4 text-blue-500" />
                <span>{t("commandPalette.newCategory")}</span>
              </CommandItem>
              <CommandItem
                value="nueva etiqueta tag label"
                onSelect={() =>
                  runAction(() =>
                    useLinksStore.getState().setAddTagModalOpen(true)
                  )
                }
              >
                <Tag className="mr-2 h-4 w-4 text-violet-500" />
                <span>{t("commandPalette.newTag")}</span>
              </CommandItem>
              <CommandItem
                value="añadir widget nuevo componente"
                onSelect={() =>
                  runAction(() =>
                    useWidgetStore.getState().openAddWidgetModal()
                  )
                }
              >
                <LayoutGrid className="mr-2 h-4 w-4 text-amber-500" />
                <span>{t("commandPalette.addWidget")}</span>
              </CommandItem>
              <CommandItem
                value="modo edición mover reorganizar"
                onSelect={() =>
                  runAction(() =>
                    useLayoutStore.getState().toggleEditMode()
                  )
                }
              >
                <PenLine className="mr-2 h-4 w-4 text-orange-500" />
                <span>
                  {useLayoutStore.getState().isEditMode
                    ? t("commandPalette.exitEditMode")
                    : t("commandPalette.toggleEditMode")}
                </span>
              </CommandItem>
              <CommandItem
                value="ver favoritos enlaces estrella"
                onSelect={() =>
                  runAction(() => {
                    useLayoutStore
                      .getState()
                      .setActiveFilter({ type: "favorites" });
                  })
                }
              >
                <Star className="mr-2 h-4 w-4 text-amber-500" />
                <span>{t("commandPalette.viewFavorites")}</span>
              </CommandItem>
              <CommandItem
                value="ver recientes últimos enlaces"
                onSelect={() =>
                  runAction(() => {
                    useLayoutStore
                      .getState()
                      .setActiveFilter({ type: "recent" });
                  })
                }
              >
                <Clock className="mr-2 h-4 w-4 text-cyan-500" />
                <span>{t("commandPalette.viewRecent")}</span>
              </CommandItem>
              <CommandItem
                value="verificar enlaces rotos health check"
                onSelect={() =>
                  runAction(() => {
                    window.dispatchEvent(new CustomEvent("stacklume:open-health-check"));
                  })
                }
              >
                <Activity className="mr-2 h-4 w-4 text-green-500" />
                <span>{t("commandPalette.verifyLinks")}</span>
              </CommandItem>
              <CommandItem
                value="buscar duplicados enlaces repetidos"
                onSelect={() =>
                  runAction(() => {
                    window.dispatchEvent(new CustomEvent("stacklume:open-duplicates"));
                  })
                }
              >
                <Copy className="mr-2 h-4 w-4 text-orange-500" />
                <span>{t("commandPalette.findDuplicates")}</span>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Configuración */}
            <CommandGroup heading={t("commandPalette.settings")}>
              <CommandItem
                value="cambiar tema apariencia color oscuro claro"
                onSelect={() => {
                  setSearch("");
                  setSubMenu("theme");
                }}
              >
                <Palette className="mr-2 h-4 w-4 text-pink-500" />
                <span>{t("commandPalette.changeTheme")}</span>
                <CommandShortcut>
                  <ArrowRight className="h-3 w-3" />
                </CommandShortcut>
              </CommandItem>
              <CommandItem
                value="cambiar vista modo bento kanban lista"
                onSelect={() => {
                  setSearch("");
                  setSubMenu("view");
                }}
              >
                <Eye className="mr-2 h-4 w-4 text-teal-500" />
                <span>{t("commandPalette.changeView")}</span>
                <CommandShortcut>
                  <ArrowRight className="h-3 w-3" />
                </CommandShortcut>
              </CommandItem>
              <CommandItem
                value="gestionar categorías administrar carpetas"
                onSelect={() =>
                  runAction(() =>
                    useLinksStore.getState().setManageCategoriesModalOpen(true)
                  )
                }
              >
                <FolderOpen className="mr-2 h-4 w-4 text-blue-500" />
                <span>{t("commandPalette.manageCategories")}</span>
              </CommandItem>
              <CommandItem
                value="gestionar etiquetas administrar tags"
                onSelect={() =>
                  runAction(() =>
                    useLinksStore.getState().setManageTagsModalOpen(true)
                  )
                }
              >
                <Tag className="mr-2 h-4 w-4 text-violet-500" />
                <span>{t("commandPalette.manageTags")}</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>

          {/* Footer con indicador de atajo */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ↑↓
                </kbd>
                {t("commandPalette.navigate")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  ↵
                </kbd>
                {t("commandPalette.select")}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                  Esc
                </kbd>
                {t("commandPalette.close")}
              </span>
            </div>
          </div>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
