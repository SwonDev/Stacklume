"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  RefreshCw,
  Plus,
  Edit2,
  Printer,
  Copy,
  ZoomIn,
  ZoomOut,
  Monitor,
  Minimize2,
  Maximize2,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useElectron } from "@/hooks/useElectron";
import { useWidgetStore } from "@/stores/widget-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ─── Zoom helpers ─────────────────────────────────────────────────────────────

const ZOOM_STEP = 0.1;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_KEY = "stacklume-zoom";

function readZoom(): number {
  try {
    const saved = localStorage.getItem(ZOOM_KEY);
    if (!saved) return 1;
    const value = parseFloat(saved);
    return Number.isFinite(value) ? value : 1;
  } catch {
    return 1;
  }
}

function applyZoom(z: number): number {
  const clamped = Math.round(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z)) * 10) / 10;
  document.documentElement.style.zoom = `${clamped}`;
  try {
    localStorage.setItem(ZOOM_KEY, String(clamped));
  } catch {}
  return clamped;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface MenuState {
  visible: boolean;
  x: number;
  y: number;
}

export function DesktopContextMenu() {
  const { t } = useTranslation();
  const { isTauri, minimizeWindow, maximizeWindow, closeWindow } = useElectron();
  const [menu, setMenu] = useState<MenuState>({ visible: false, x: 0, y: 0 });
  const [zoom, setZoom] = useState(() => readZoom());
  const menuRef = useRef<HTMLDivElement>(null);

  const openAddWidgetModal = useWidgetStore((s) => s.openAddWidgetModal);
  const refreshWidgets = useWidgetStore((s) => s.refreshWidgets);
  const isEditMode = useLayoutStore((s) => s.isEditMode);
  const toggleEditMode = useLayoutStore((s) => s.toggleEditMode);
  const refreshAllData = useLinksStore((s) => s.refreshAllData);

  // Aplicar zoom guardado al montar (solo side-effect del DOM, no setState)
  useEffect(() => {
    if (!isTauri) return;
    document.documentElement.style.zoom = `${zoom}`;
  }, [isTauri, zoom]);

  const hideMenu = useCallback(() => {
    setMenu((m) => ({ ...m, visible: false }));
  }, []);

  // Registrar listeners solo en Tauri
  useEffect(() => {
    if (!isTauri) return;

    const handleContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement;

      // Solo interceptar en zonas vacías de la app.
      // En widgets (react-grid-item) o elementos interactivos dejamos que
      // el menú propio del componente (Radix ContextMenu) se encargue.
      const isOnWidget =
        el.closest(".react-grid-item") !== null ||
        el.closest("[data-radix-context-menu-content]") !== null ||
        el.closest("[data-radix-popper-content-wrapper]") !== null;
      const isOnInteractive =
        el.closest(
          "button, a, input, textarea, select, [role='dialog'], [role='menu'], [role='listbox']"
        ) !== null;
      const isOnTitleBar = el.closest("[data-tauri-drag-region]") !== null;

      if (isOnWidget || isOnInteractive || isOnTitleBar) {
        return; // Dejar que el menú propio del componente lo maneje
      }

      e.preventDefault();
      e.stopPropagation();

      // Calcular posición ajustada para no salirse de pantalla
      const vpW = window.innerWidth;
      const vpH = window.innerHeight;
      const menuW = 224;
      const menuH = 340;
      const x = e.clientX + menuW > vpW ? vpW - menuW - 8 : e.clientX;
      const y = e.clientY + menuH > vpH ? vpH - menuH - 8 : e.clientY;

      setMenu({ visible: true, x, y });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") hideMenu();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isTauri, hideMenu]);

  const run = useCallback(
    (fn: () => void) => {
      hideMenu();
      // Pequeño delay para que el menú desaparezca antes de ejecutar la acción
      setTimeout(fn, 50);
    },
    [hideMenu]
  );

  const handleZoomIn = () => {
    const z = applyZoom(readZoom() + ZOOM_STEP);
    setZoom(z);
    hideMenu();
  };

  const handleZoomOut = () => {
    const z = applyZoom(readZoom() - ZOOM_STEP);
    setZoom(z);
    hideMenu();
  };

  const handleZoomReset = () => {
    const z = applyZoom(1);
    setZoom(z);
    hideMenu();
  };

  if (!isTauri || !menu.visible) return null;

  const zoomPct = Math.round(zoom * 100);
  const isDefaultZoom = Math.abs(zoom - 1) < 0.05;

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t("contextMenu.ariaLabel")}
      className="fixed z-[9999] bg-popover/95 backdrop-blur-sm border border-border/70 rounded-lg shadow-2xl py-1 w-56 text-sm select-none"
      style={{ left: menu.x, top: menu.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Acciones de la app ── */}
      <section className="px-1">
        <Item
          icon={RefreshCw}
          label={t("contextMenu.refresh")}
          shortcut="F5"
          onClick={() =>
            run(() => {
              refreshAllData();
              refreshWidgets();
            })
          }
        />
        <Item
          icon={Plus}
          label={t("contextMenu.addWidget")}
          onClick={() => run(openAddWidgetModal)}
        />
        <Item
          icon={Edit2}
          label={isEditMode ? t("contextMenu.exitEditMode") : t("contextMenu.editMode")}
          active={isEditMode}
          onClick={() => run(toggleEditMode)}
        />
        <Item
          icon={LayoutDashboard}
          label={t("contextMenu.goToTop")}
          onClick={() => run(() => window.scrollTo({ top: 0, behavior: "smooth" }))}
        />
      </section>

      <div className="my-1 border-t border-border/50" />

      {/* ── Herramientas ── */}
      <section className="px-1">
        <Item
          icon={Printer}
          label={t("contextMenu.printPage")}
          shortcut="Ctrl+P"
          onClick={() => run(() => window.print())}
        />
        <Item
          icon={Copy}
          label={t("contextMenu.copySelection")}
          onClick={() =>
            run(() => {
              const sel = window.getSelection();
              if (sel?.toString()) {
                navigator.clipboard.writeText(sel.toString()).catch(() => {});
              }
            })
          }
        />
      </section>

      <div className="my-1 border-t border-border/50" />

      {/* ── Zoom ── */}
      <section className="px-1">
        <Item
          icon={ZoomIn}
          label={t("contextMenu.zoomIn")}
          shortcut="Ctrl++"
          disabled={zoom >= ZOOM_MAX}
          onClick={handleZoomIn}
        />
        <Item
          icon={ZoomOut}
          label={t("contextMenu.zoomOut")}
          shortcut="Ctrl+–"
          disabled={zoom <= ZOOM_MIN}
          onClick={handleZoomOut}
        />
        <Item
          icon={Monitor}
          label={isDefaultZoom ? t("contextMenu.zoomDefault") : t("contextMenu.resetZoom", { pct: zoomPct })}
          shortcut="Ctrl+0"
          disabled={isDefaultZoom}
          onClick={handleZoomReset}
        />
      </section>

      <div className="my-1 border-t border-border/50" />

      {/* ── Ventana ── */}
      <section className="px-1">
        <Item
          icon={Minimize2}
          label={t("contextMenu.minimize")}
          onClick={() => run(() => minimizeWindow())}
        />
        <Item
          icon={Maximize2}
          label={t("contextMenu.maximizeRestore")}
          onClick={() => run(() => maximizeWindow())}
        />
        <Item
          icon={X}
          label={t("contextMenu.closeApp")}
          danger
          onClick={() => run(() => closeWindow())}
        />
      </section>
    </div>
  );
}

// ─── Sub-componente Item ───────────────────────────────────────────────────────

interface ItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  danger?: boolean;
}

function Item({ icon: Icon, label, shortcut, onClick, disabled, active, danger }: ItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-colors",
        "hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed",
        active && "text-primary font-medium",
        danger && "text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
      <span className="flex-1 leading-tight">{label}</span>
      {shortcut && (
        <span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">{shortcut}</span>
      )}
    </button>
  );
}
