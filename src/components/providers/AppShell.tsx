"use client";

import { useEffect, useState } from "react";
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
import { DatabaseSetupWizard } from "@/components/onboarding/DatabaseSetupWizard";
import { useUndoRedo } from "@/hooks/useUndoRedo";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mounted, setMounted] = useState(false);

  // Initialize undo/redo keyboard shortcuts globally
  useUndoRedo({ enableKeyboardShortcuts: true });

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

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

          {/* Database setup wizard for first-time users - shows before tour */}
          <DatabaseSetupWizard />

          {/* Onboarding tour for first-time users */}
          <OnboardingTour />
        </>
      )}
    </>
  );
}
