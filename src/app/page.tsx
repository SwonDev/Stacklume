"use client";

import { useEffect, useState } from "react";
import { BentoGrid } from "@/components/bento/BentoGrid";
import { KanbanBoard } from "@/components/kanban";
import { ListView } from "@/components/list";
import { FilterBar } from "@/components/layout/FilterBar";
import { StickerLayer } from "@/components/stickers";
import { LoadingScreen } from "@/components/ui/loading-screen";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";

export default function Home() {
  const setLinks = useLinksStore((state) => state.setLinks);
  const setCategories = useLinksStore((state) => state.setCategories);
  const setTags = useLinksStore((state) => state.setTags);
  const setLinkTags = useLinksStore((state) => state.setLinkTags);
  const setIsLoading = useLinksStore((state) => state.setIsLoading);
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

  // Fetch initial data
  // Note: Zustand store functions are stable and don't need to be in dependencies
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [linksRes, categoriesRes, tagsRes, linkTagsRes] = await Promise.all([
          fetch("/api/links", { credentials: "include" }),
          fetch("/api/categories", { credentials: "include" }),
          fetch("/api/tags", { credentials: "include" }),
          fetch("/api/link-tags", { credentials: "include" }),
        ]);

        if (linksRes.ok) {
          const linksData = await linksRes.json();
          setLinks(linksData);
        }

        if (categoriesRes.ok) {
          const categories = await categoriesRes.json();
          setCategories(categories);
        }

        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          setTags(tags);
        }

        if (linkTagsRes.ok) {
          const allLinkTags = await linkTagsRes.json();
          setLinkTags(allLinkTags);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
        setDataLoaded(true);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - store functions are stable

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
          transition: "opacity 0.3s ease-out",
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
          className="flex-1 overflow-auto scrollbar-thin p-2 relative"
          aria-busy={isLoading}
          data-sticker-container
        >
          {viewMode === "kanban" ? (
            <KanbanBoard className="min-h-full w-full" />
          ) : viewMode === "list" ? (
            <ListView className="min-h-full w-full" />
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
