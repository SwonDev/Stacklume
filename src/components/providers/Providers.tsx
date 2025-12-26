"use client";

import { ReactNode, useEffect, Suspense } from "react";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { AnalyticsProvider } from "@/components/providers/AnalyticsProvider";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useSettingsStore } from "@/stores/settings-store";
import { useWidgetStore } from "@/stores/widget-store";
import { registerServiceWorker } from "@/lib/offline/register-sw";

interface ProvidersProps {
  children: ReactNode;
}

function KeyboardShortcutsProvider({ children }: { children: ReactNode }) {
  useKeyboardShortcuts();
  return <>{children}</>;
}

function DataInitProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Initialize data from database on app mount
    // Note: Zustand store functions are stable and don't need to be in dependencies
    const initSettings = useSettingsStore.getState().initSettings;
    const initWidgets = useWidgetStore.getState().initWidgets;

    initSettings();
    initWidgets();

    // Register service worker for PWA/offline support
    registerServiceWorker();
  }, []); // Run once on mount - store functions are stable

  return <>{children}</>;
}

function SettingsEffectsProvider({ children }: { children: ReactNode }) {
  // Use individual selectors to prevent unnecessary re-renders
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const showTooltips = useSettingsStore((state) => state.showTooltips);

  useEffect(() => {
    // Apply reduce motion setting
    if (reduceMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [reduceMotion]);

  useEffect(() => {
    // Apply show tooltips setting
    if (!showTooltips) {
      document.documentElement.classList.add("hide-tooltips");
    } else {
      document.documentElement.classList.remove("hide-tooltips");
    }
  }, [showTooltips]);

  return <>{children}</>;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ErrorBoundary>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <MotionProvider>
          <TooltipProvider delayDuration={200}>
            {/* Analytics needs Suspense for useSearchParams */}
            <Suspense fallback={null}>
              <AnalyticsProvider>
                <DataInitProvider>
                  <SettingsEffectsProvider>
                    <KeyboardShortcutsProvider>{children}</KeyboardShortcutsProvider>
                  </SettingsEffectsProvider>
                </DataInitProvider>
              </AnalyticsProvider>
            </Suspense>
          </TooltipProvider>
        </MotionProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
