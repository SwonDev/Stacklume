"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AddLinkModal } from "@/components/modals/AddLinkModal";
import { AddCategoryModal } from "@/components/modals/AddCategoryModal";
import { EditLinkModal } from "@/components/modals/EditLinkModal";
import { AddWidgetModal } from "@/components/modals/AddWidgetModal";
import { EditWidgetModal } from "@/components/modals/EditWidgetModal";
import { AddTagModal } from "@/components/modals/AddTagModal";
import { ManageCategoriesModal } from "@/components/modals/ManageCategoriesModal";
import { ManageTagsModal } from "@/components/modals/ManageTagsModal";
import { UndoToast } from "@/components/ui/UndoToast";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { isTauriWebView, openExternalUrl } from "@/lib/desktop";

interface AppShellProps {
  children: React.ReactNode;
}

// Routes that should not have the app shell (login, register, etc.)
const AUTH_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

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
      if (href.startsWith("http://") || href.startsWith("https://")) {
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
        Saltar al contenido principal
      </a>

      {/* Header and Sidebar - only render when mounted to prevent flash */}
      <div
        style={{
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        }}
      >
        <Header />
        <Sidebar />
      </div>

      {/* Main content */}
      <main
        id="main-content"
        className="pt-12 h-screen overflow-hidden"
        role="main"
        aria-label="Contenido principal"
      >
        {children}
      </main>

      {/* Modals - lazy render after mount */}
      {mounted && (
        <>
          <AddLinkModal />
          <AddCategoryModal />
          <EditLinkModal />
          <AddWidgetModal />
          <EditWidgetModal />
          <AddTagModal />
          <ManageCategoriesModal />
          <ManageTagsModal />
        </>
      )}

      {/* UX Components - render after mount */}
      {mounted && (
        <>
          {/* Undo toast notification */}
          <UndoToast />

          {/* Onboarding tour for first-time users */}
          <OnboardingTour />
        </>
      )}
    </>
  );
}
