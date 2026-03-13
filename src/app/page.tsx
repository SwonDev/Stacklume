"use client";

import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { FilterBar } from "@/components/layout/FilterBar";
import { StickerLayer } from "@/components/stickers";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";

const KanbanBoard = lazy(() => import("@/components/kanban").then((m) => ({ default: m.KanbanBoard })));
const ListView = lazy(() => import("@/components/list").then((m) => ({ default: m.ListView })));

export default function Home() {
  const isLoading = useLinksStore((state) => state.isLoading);
  const viewMode = useSettingsStore((state) => state.viewMode);

  // Track ready states
  const [mounted, setMounted] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // App is ready when mounted and data is loaded
  const isAppReady = mounted && dataLoaded;

  // Mark as mounted after initial render (allows stores to hydrate)
  useEffect(() => {
    // Small delay to ensure stores have hydrated from localStorage
    const timer = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  // Refrescar datos cuando la ventana recupera el foco o la visibilidad.
  // Cubre el caso Tauri/WebView2 donde el usuario sale y vuelve a la app:
  //   - focus: al hacer clic en la ventana tras usar otra app
  //   - visibilitychange: al restaurar desde minimizado (Tauri puede no disparar focus)
  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const DEBOUNCE_MS = 30_000; // mínimo 30 s entre refrescos automáticos

    const doRefresh = () => {
      const now = Date.now();
      if (now - lastRefreshRef.current > DEBOUNCE_MS) {
        lastRefreshRef.current = now;
        useLinksStore.getState().refreshAllData();
      }
    };

    const handleFocus = () => doRefresh();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") doRefresh();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // Fetch initial data
  // Note: Zustand store functions are stable and don't need to be in dependencies
  useEffect(() => {
    const fetchData = async () => {
      const store = useLinksStore.getState();
      store.setIsLoading(true);
      try {
        const t = Date.now();
        const [linksRes, categoriesRes, tagsRes, linkTagsRes, linkCategoriesRes] = await Promise.all([
          fetch(`/api/links?_t=${t}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/categories?_t=${t}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/tags?_t=${t}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/link-tags?_t=${t}`, { credentials: "include", cache: "no-store" }),
          fetch(`/api/link-categories?_t=${t}`, { credentials: "include", cache: "no-store" }),
        ]);

        // Parse all JSON responses in parallel
        const [linksData, categoriesData, tagsData, linkTagsData, linkCategoriesData] = await Promise.all([
          linksRes.ok ? linksRes.json() : null,
          categoriesRes.ok ? categoriesRes.json() : null,
          tagsRes.ok ? tagsRes.json() : null,
          linkTagsRes.ok ? linkTagsRes.json() : null,
          linkCategoriesRes.ok ? linkCategoriesRes.json() : null,
        ]);

        // Apply all data in a single batch to minimize re-renders
        if (linksData) store.setLinks(linksData);
        if (categoriesData) store.setCategories(categoriesData);
        if (tagsData) store.setTags(tagsData);
        if (linkTagsData) store.setLinkTags(linkTagsData);
        if (linkCategoriesData) store.setLinkCategories(linkCategoriesData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        useLinksStore.getState().setIsLoading(false);
        setDataLoaded(true);
      }
    };

    fetchData();
  }, []);

  return (
    <>
      {/* Loading screen - covers everything until ready */}
      <LoadingScreen isLoading={!isAppReady} minDuration={600} />

      {/* Main content - hidden with opacity until ready to prevent flash */}
      <div
        className="h-full w-full flex flex-col"
        style={{
          opacity: isAppReady ? 1 : 0,
          visibility: isAppReady ? "visible" : "hidden",
          transition: "opacity 0.25s ease-out",
          willChange: isAppReady ? "auto" : "opacity",
        }}
      >
        <FilterBar />
        {/* ARIA live region for screen reader announcements */}
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {isLoading ? "Cargando contenido..." : "Contenido cargado"}
        </div>
        <div
          className="flex-1 overflow-x-hidden overflow-y-auto scrollbar-thin p-2 relative"
          aria-busy={isLoading}
          data-sticker-container
        >
          {viewMode === "kanban" ? (
            <Suspense fallback={null}>
              <KanbanBoard className="min-h-full w-full" />
            </Suspense>
          ) : viewMode === "list" ? (
            <Suspense fallback={null}>
              <ListView className="min-h-full w-full" />
            </Suspense>
          ) : (
            <BentoGrid className="min-h-full w-full" />
          )}
        </div>
        {/* Sticker layer for placed stickers - only render when ready */}
        {isAppReady && <StickerLayer />}
      </div>
    </>
  );
}
