"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { UndoToast } from "@/components/ui/UndoToast";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { BulkActionsBar } from "@/components/layout/BulkActionsBar";
import { ReminderChecker } from "@/components/layout/ReminderChecker";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { isTauriWebView, openExternalUrl } from "@/lib/desktop";
import { TrayIconUpdater } from "./TrayIconUpdater";
import { useSettingsStore } from "@/stores/settings-store";
import { useLinksStore } from "@/stores/links-store";
import { useWidgetStore } from "@/stores/widget-store";
import { useTranslation } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

// Lazy-load modals — they're heavy and only needed when opened
const AddLinkModal = lazy(() => import("@/components/modals/AddLinkModal").then((m) => ({ default: m.AddLinkModal })));
const AddCategoryModal = lazy(() => import("@/components/modals/AddCategoryModal").then((m) => ({ default: m.AddCategoryModal })));
const EditLinkModal = lazy(() => import("@/components/modals/EditLinkModal").then((m) => ({ default: m.EditLinkModal })));
const AddWidgetModal = lazy(() => import("@/components/modals/AddWidgetModal").then((m) => ({ default: m.AddWidgetModal })));
const EditWidgetModal = lazy(() => import("@/components/modals/EditWidgetModal").then((m) => ({ default: m.EditWidgetModal })));
const AddTagModal = lazy(() => import("@/components/modals/AddTagModal").then((m) => ({ default: m.AddTagModal })));
const ManageCategoriesModal = lazy(() => import("@/components/modals/ManageCategoriesModal").then((m) => ({ default: m.ManageCategoriesModal })));
const ManageTagsModal = lazy(() => import("@/components/modals/ManageTagsModal").then((m) => ({ default: m.ManageTagsModal })));
const KeyboardShortcutsModal = lazy(() => import("@/components/modals/KeyboardShortcutsModal").then((m) => ({ default: m.KeyboardShortcutsModal })));

interface AppShellProps {
  children: React.ReactNode;
}

// Routes that should not have the app shell (login, register, etc.)
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const sidebarAlwaysVisible = useSettingsStore((state) => state.sidebarAlwaysVisible);

  // Modal open states — only mount heavy modal components when needed
  const isAddLinkModalOpen = useLinksStore((state) => state.isAddLinkModalOpen);
  const isEditLinkModalOpen = useLinksStore((state) => state.isEditLinkModalOpen);
  const isAddCategoryModalOpen = useLinksStore((state) => state.isAddCategoryModalOpen);
  const isAddTagModalOpen = useLinksStore((state) => state.isAddTagModalOpen);
  const isManageCategoriesModalOpen = useLinksStore((state) => state.isManageCategoriesModalOpen);
  const isManageTagsModalOpen = useLinksStore((state) => state.isManageTagsModalOpen);
  const isAddWidgetModalOpen = useWidgetStore((state) => state.isAddWidgetModalOpen);
  const isEditWidgetModalOpen = useWidgetStore((state) => state.isEditWidgetModalOpen);

  // Check if current route is an auth route (no shell needed)
  const isAuthRoute = AUTH_ROUTES.some(route => pathname?.startsWith(route));

  // Initialize undo/redo keyboard shortcuts globally (only for app routes)
  useUndoRedo({ enableKeyboardShortcuts: !isAuthRoute });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // En Tauri, interceptar clicks en <a> externas y window.open() para abrirlos
  // en el navegador del sistema (WebView2 los bloquea por defecto).
  useEffect(() => {
    if (!isTauriWebView()) return;

    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") ?? "";
      if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("local://")) {
        e.preventDefault();
        e.stopPropagation();
        void openExternalUrl(href);
      }
    };
    document.addEventListener("click", handleClick, true);

    // Sobreescribir window.open para widgets que llaman directamente a él
    const origOpen = window.open.bind(window);
    window.open = (url?: string | URL, target?: string, features?: string) => {
      const u = typeof url === "string" ? url : url?.toString() ?? "";
      if (u.startsWith("http://") || u.startsWith("https://")) {
        void openExternalUrl(u);
        return null;
      }
      return origOpen(url, target, features);
    };

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.open = origOpen;
    };
  }, []);

  // For auth routes, just render children without shell
  if (isAuthRoute) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Skip link for keyboard navigation - always visible */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {t("appShell.skipToContent")}
      </a>

      {/* Header and Sidebar - only render when mounted to prevent flash */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.15s ease-out",
          willChange: mounted ? "auto" : "opacity",
        }}
      >
        <Header />
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        id="main-content"
        className={`pt-12 h-screen overflow-hidden${sidebarAlwaysVisible && !isAuthRoute ? " pl-72" : ""}`}
        role="main"
        aria-label={t("appShell.mainContent")}
      >
        {children}
      </main>

      {/* Modals - lazy loaded + only mounted when open */}
      {mounted && (
        <>
          {isAddLinkModalOpen && <Suspense fallback={null}><AddLinkModal /></Suspense>}
          {isAddCategoryModalOpen && <Suspense fallback={null}><AddCategoryModal /></Suspense>}
          {isEditLinkModalOpen && <Suspense fallback={null}><EditLinkModal /></Suspense>}
          {isAddWidgetModalOpen && <Suspense fallback={null}><AddWidgetModal /></Suspense>}
          {isEditWidgetModalOpen && <Suspense fallback={null}><EditWidgetModal /></Suspense>}
          {isAddTagModalOpen && <Suspense fallback={null}><AddTagModal /></Suspense>}
          {isManageCategoriesModalOpen && <Suspense fallback={null}><ManageCategoriesModal /></Suspense>}
          {isManageTagsModalOpen && <Suspense fallback={null}><ManageTagsModal /></Suspense>}
          <Suspense fallback={null}><KeyboardShortcutsModal /></Suspense>
        </>
      )}

      {/* UX Components - render after mount */}
      {mounted && (
        <>
          {/* Diálogo de confirmación global (sustituye a window.confirm) */}
          <ConfirmDialog />

          {/* Undo toast notification */}
          <UndoToast />

          {/* Onboarding tour for first-time users */}
          <OnboardingTour />

          {/* Barra de acciones en lote (multi-select) */}
          <BulkActionsBar />

          {/* Verificador de recordatorios */}
          <ReminderChecker />
        </>
      )}

      {/* Tray icon animation — solo activo en Tauri */}
      {mounted && isTauriWebView() && <TrayIconUpdater />}
    </>
  );
}
