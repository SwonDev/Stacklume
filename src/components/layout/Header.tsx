"use client";

import { useRef, useState, useEffect } from "react";
import { Search as SearchLucide, LayoutGrid, Sparkles, Trash2, PenLine, X, Sticker, LogOut } from "lucide-react";
// Temporarily using static icons instead of animated ones due to motion/react 19 compatibility
import { Menu, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ImportExportModal } from "@/components/modals/ImportExportModal";
import { DuplicatesModal } from "@/components/modals/DuplicatesModal";
import { SettingsDropdown } from "@/components/ui/SettingsDropdown";
import { OfflineBadge } from "@/components/ui/OfflineIndicator";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useStickerStore } from "@/stores/sticker-store";
import { StickerBook } from "@/components/stickers";
import { motion, AnimatePresence } from "motion/react";

export function Header() {
  const router = useRouter();

  // Use selectors ONLY for state values, not functions (prevents re-render loops)
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const isEditMode = useLayoutStore((state) => state.isEditMode);
  const widgets = useWidgetStore((state) => state.widgets);
  const isStickerBookOpen = useStickerStore((state) => state.isStickerBookOpen);

  // Note: Functions are accessed via .getState() when needed to prevent re-render loops
  // toggleSidebar, setSearchQuery, toggleEditMode -> useLayoutStore.getState()
  // setAddLinkModalOpen -> useLinksStore.getState()
  // openAddWidgetModal, autoOrganizeWidgets, clearAllWidgets -> useWidgetStore.getState()
  // openStickerBook, closeStickerBook -> useStickerStore.getState()

  // Modal states
  const [showImportExport, setShowImportExport] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchValue, setMobileSearchValue] = useState(searchQuery);
  const [isMounted, setIsMounted] = useState(false);

  // Refs
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Hydration guard
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Sync mobile search value with global search query
  useEffect(() => {
    setMobileSearchValue(searchQuery);
  }, [searchQuery]);

  // Auto-focus mobile search input when sheet opens
  useEffect(() => {
    if (mobileSearchOpen && mobileSearchInputRef.current) {
      setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
    }
  }, [mobileSearchOpen]);

  const handleMobileSearchSubmit = () => {
    useLayoutStore.getState().setSearchQuery(mobileSearchValue);
    setMobileSearchOpen(false);
  };

  const handleMobileSearchClear = () => {
    setMobileSearchValue("");
    useLayoutStore.getState().setSearchQuery("");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-12 border-b border-border/50 bg-background/80 backdrop-blur-md" role="banner" aria-label="Barra de navegación principal">
      <div className="flex h-full items-center justify-between px-4">
        {/* Left side - Menu & Search */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => useLayoutStore.getState().toggleSidebar()}
                aria-label="Abrir menú de navegación"
              >
                <Menu size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Abrir menú</p>
            </TooltipContent>
          </Tooltip>

          {/* Mobile Search Button (< sm) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:hidden text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => setMobileSearchOpen(true)}
                aria-label="Abrir búsqueda"
              >
                <SearchLucide className="h-4 w-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Buscar</p>
            </TooltipContent>
          </Tooltip>

          {/* Desktop Search (>= sm) */}
          <div className="relative hidden sm:block" role="search" data-tour="search-input">
            <SearchLucide className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Buscar..."
              className="h-8 w-40 md:w-48 bg-secondary/50 pl-8 text-sm focus:w-56 md:focus:w-64 transition-all"
              value={searchQuery}
              onChange={(e) => useLayoutStore.getState().setSearchQuery(e.target.value)}
              aria-label="Buscar enlaces"
            />
          </div>
        </div>

        {/* Center - Logo */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          data-tour="header-logo"
        >
          <motion.div
            className="h-6 w-6 rounded-md bg-primary flex items-center justify-center overflow-hidden"
            whileHover={{ scale: 1.05 }}
          >
            <img
              src="/logo.svg"
              alt="Stacklume"
              className="h-5 w-5 object-contain"
            />
          </motion.div>
          <span className="text-sm font-semibold text-gold-gradient hidden md:inline">
            Stacklume
          </span>
        </motion.div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => useLinksStore.getState().setAddLinkModalOpen(true)}
                aria-label="Añadir nuevo enlace"
                data-tour="add-link-button"
              >
                <Plus size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Añadir enlace</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isStickerBookOpen ? "secondary" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${
                  isStickerBookOpen
                    ? "text-amber-600 bg-amber-100 dark:bg-amber-900/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                onClick={() => useStickerStore.getState().openStickerBook()}
                aria-label="Abrir libro de pegatinas"
              >
                <Sticker size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Pegatinas</p>
            </TooltipContent>
          </Tooltip>

          {/* Add Widget - Always visible as primary action */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                onClick={() => useWidgetStore.getState().openAddWidgetModal()}
                aria-label="Añadir nuevo widget"
                data-tour="add-widget-button"
              >
                <LayoutGrid size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Añadir Widget</p>
            </TooltipContent>
          </Tooltip>

          <AnimatePresence>
            {isEditMode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-1"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => useWidgetStore.getState().autoOrganizeWidgets()}
                      aria-label="Reorganizar widgets automáticamente"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p>Reorganizar automáticamente</p>
                  </TooltipContent>
                </Tooltip>

                {widgets.length > 0 && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                            aria-label="Eliminar todos los widgets"
                          >
                            <Trash2 size={16} aria-hidden="true" />
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Eliminar todos los widgets</p>
                      </TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar todos los widgets?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará permanentemente todos los {widgets.length} widgets del panel.
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => useWidgetStore.getState().clearAllWidgets()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Eliminar todos
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isEditMode ? "secondary" : "ghost"}
                size="icon"
                className={`h-8 w-8 ${
                  isEditMode
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
                onClick={() => useLayoutStore.getState().toggleEditMode()}
                aria-label={isEditMode ? "Salir del modo edición" : "Entrar al modo edición"}
                aria-pressed={isEditMode}
                data-tour="edit-mode-button"
              >
                <PenLine size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{isEditMode ? "Salir de edición" : "Modo edición"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Offline status indicator */}
          <OfflineBadge />

          {/* Logout button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
                aria-label="Cerrar sesión"
              >
                <LogOut size={16} aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>Cerrar sesión</p>
            </TooltipContent>
          </Tooltip>

          {/* Settings dropdown with tools */}
          <SettingsDropdown
            onOpenImportExport={() => setShowImportExport(true)}
            onOpenDuplicates={() => setShowDuplicates(true)}
          />
        </div>
      </div>

      {/* Modals */}
      <ImportExportModal open={showImportExport} onOpenChange={setShowImportExport} />
      <DuplicatesModal open={showDuplicates} onOpenChange={setShowDuplicates} />

      {/* Sticker Book - only render when mounted to prevent hydration issues */}
      {isMounted && isStickerBookOpen && <StickerBook onClose={() => useStickerStore.getState().closeStickerBook()} />}

      {/* Mobile Search Sheet */}
      <Sheet open={mobileSearchOpen} onOpenChange={setMobileSearchOpen}>
        <SheetContent side="top" className="h-auto">
          <SheetHeader>
            <SheetTitle className="text-left">Buscar enlaces</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="relative">
              <SearchLucide className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input
                ref={mobileSearchInputRef}
                type="search"
                placeholder="Escribe para buscar..."
                className="h-12 pl-10 pr-10 text-base bg-secondary/50"
                value={mobileSearchValue}
                onChange={(e) => setMobileSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleMobileSearchSubmit();
                  }
                }}
                aria-label="Campo de búsqueda"
              />
              {mobileSearchValue && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={handleMobileSearchClear}
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1 h-11"
                onClick={handleMobileSearchSubmit}
                aria-label="Aplicar búsqueda"
              >
                <SearchLucide className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setMobileSearchOpen(false)}
                aria-label="Cancelar búsqueda"
              >
                Cancelar
              </Button>
            </div>

            {searchQuery && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Búsqueda actual:</p>
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <span className="text-sm font-medium">{searchQuery}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMobileSearchClear}
                    className="h-7 text-xs"
                    aria-label="Limpiar búsqueda actual"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}
