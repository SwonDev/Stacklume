"use client";

import { useEffect, useLayoutEffect, useState, useRef, useCallback, useMemo } from "react";
import { Search, Plus, X, ExternalLink, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";
import { isTauriWebView, onShowLauncher, openExternalUrl } from "@/lib/desktop";

/**
 * Overlay de búsqueda rápida — se activa con Ctrl+Shift+Space (atajo global Tauri
 * o desde el navegador) o mediante el evento stacklume:show-launcher de Tauri.
 */
export function QuickLauncherOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Refs para callbacks estables (evita el error de tamaño de deps en useEffect) ──
  const openRef = useRef(false);
  const handleCloseRef = useRef<() => void>(() => {});
  const handleOpenRef = useRef<() => void>(() => {});

  const links = useLinksStore((s) => s.links);
  const categories = useLinksStore((s) => s.categories);
  const setAddLinkModalOpen = useLinksStore((s) => s.setAddLinkModalOpen);

  // Mapa de categorías para lookup O(1)
  const categoryMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Detectar si el query parece una URL directa
  const isUrlQuery = useMemo(() => {
    const q = query.trim();
    return (
      q.startsWith("http://") ||
      q.startsWith("https://") ||
      q.startsWith("local://")
    );
  }, [query]);

  // Filtrar links
  const filtered = useMemo(() => {
    const active = links.filter((l) => !l.deletedAt);
    if (!query.trim()) return active.slice(0, 6);
    const q = query.toLowerCase();
    return active
      .filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.url.toLowerCase().includes(q) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [links, query]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setQuery("");
    setSelectedIndex(-1);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(-1);
  }, []);

  const handleOpenLink = useCallback(
    (url: string) => {
      void openExternalUrl(url);
      handleClose();
    },
    [handleClose]
  );

  // Sincronizar refs con los valores actuales — useLayoutEffect para evitar
  // la regla react-hooks/refs que prohíbe mutar refs durante el render
  useLayoutEffect(() => {
    openRef.current = open;
    handleCloseRef.current = handleClose;
    handleOpenRef.current = handleOpen;
  }); // sin deps = corre tras cada render, antes de que el listener de teclado pueda dispararse

  // La selección se resetea en handleQueryChange al cambiar el texto

  // Scroll al ítem seleccionado
  useEffect(() => {
    if (selectedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("[data-result-item]");
    const el = items[selectedIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  // Escuchar evento global de Tauri (Ctrl+Shift+Space desde cualquier app)
  useEffect(() => {
    if (!isTauriWebView()) return;
    const unlisten = onShowLauncher(handleOpen);
    return unlisten;
  }, [handleOpen]);

  // Listener de teclado estable — usa refs para no cambiar el tamaño del array de deps
  // entre renders (evita el error de React Fast Refresh sobre tamaño de deps cambiante)
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // Escape: cerrar si está abierto
      if (e.key === "Escape" && openRef.current) {
        handleCloseRef.current();
        return;
      }
      // Ctrl+Shift+Space: abrir (web + Tauri)
      if (
        e.code === "Space" &&
        e.ctrlKey &&
        e.shiftKey &&
        !e.altKey &&
        !e.metaKey &&
        !openRef.current
      ) {
        e.preventDefault();
        handleOpenRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []); // estable — los refs siempre tienen los valores actuales

  if (!open) return null;

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      // Si la query es una URL y no hay ítem seleccionado → abrir directamente
      if (isUrlQuery && selectedIndex < 0) {
        handleOpenLink(query.trim());
      } else if (selectedIndex >= 0 && filtered[selectedIndex]) {
        handleOpenLink(filtered[selectedIndex].url);
      }
    }
  };

  const getDisplayHost = (url: string): string => {
    if (url.startsWith("local://")) return url.replace("local://", "");
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="w-full max-w-xl mx-4 rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Barra de búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Buscar enlace o pegar URL…"
            className="border-0 bg-transparent shadow-none focus-visible:ring-0 text-base p-0 h-auto"
            aria-label="Buscar enlace"
          />
          <button
            onClick={handleClose}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Acción directa para URLs pegadas */}
        {isUrlQuery && (
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left border-b border-border bg-primary/5 hover:bg-primary/10 transition-colors"
            onClick={() => handleOpenLink(query.trim())}
          >
            <ExternalLink className="h-4 w-4 text-primary shrink-0" />
            <span className="flex-1 text-sm text-primary font-medium truncate">
              Abrir: {query.trim()}
            </span>
            <kbd className="text-[10px] bg-background border border-border px-1.5 py-0.5 rounded font-mono text-muted-foreground shrink-0">
              ↵
            </kbd>
          </button>
        )}

        {/* Resultados */}
        <div ref={listRef} className="max-h-72 overflow-y-auto py-1">
          {filtered.length === 0 && query.trim() && !isUrlQuery && (
            <div className="text-center py-8 px-4">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Sin resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Prueba con otro término o añade un enlace nuevo
              </p>
            </div>
          )}
          {filtered.length === 0 && !query.trim() && (
            <div className="text-center py-8 px-4">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Escribe para buscar tus enlaces
              </p>
            </div>
          )}
          {filtered.map((link, idx) => {
            const category = link.categoryId
              ? categoryMap.get(link.categoryId)
              : undefined;
            const isLocal = link.url.startsWith("local://");
            const displayHost = getDisplayHost(link.url);

            return (
              <button
                key={link.id}
                data-result-item
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === selectedIndex ? "bg-muted" : "hover:bg-muted/60"
                }`}
                onClick={() => handleOpenLink(link.url)}
                onMouseEnter={() => setSelectedIndex(idx)}
              >
                {/* Icono */}
                {isLocal ? (
                  <FolderOpen className="h-4 w-4 text-indigo-500 shrink-0" />
                ) : link.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={link.faviconUrl}
                    alt=""
                    className="h-4 w-4 rounded shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                )}

                {/* Título y dominio */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">
                    {link.title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayHost}
                  </p>
                </div>

                {/* Categoría */}
                {category && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground shrink-0 font-medium max-w-[80px] truncate"
                    title={category.name}
                  >
                    {category.name}
                  </span>
                )}

                {/* Reading status */}
                {link.readingStatus === "reading" && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0"
                    title="Leyendo"
                  />
                )}
                {link.readingStatus === "done" && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0"
                    title="Leído"
                  />
                )}

                {/* Favorito */}
                {link.isFavorite && (
                  <span className="text-yellow-500 text-xs shrink-0" aria-label="Favorito">
                    ★
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Botón añadir */}
        <div className="px-4 py-2.5 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 justify-start text-muted-foreground hover:text-foreground h-8 text-sm"
            onClick={() => {
              handleClose();
              setAddLinkModalOpen(true);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Añadir nuevo enlace
          </Button>
        </div>

        {/* Atajos */}
        <div className="px-4 pb-2.5 flex items-center justify-between text-[10px] text-muted-foreground/50 select-none">
          <span>↑↓ navegar · ↵ abrir</span>
          <span>Ctrl+Shift+Space · Esc cerrar</span>
        </div>
      </div>
    </div>
  );
}
