"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { Link2Off, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ListViewToolbar } from "./ListViewToolbar";
import { CategorySection } from "./CategorySection";
import { useLinksStore } from "@/stores/links-store";
import { useLayoutStore } from "@/stores/layout-store";
import { useListViewStore } from "@/stores/list-view-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Link, Category, LinkTag } from "@/lib/db/schema";

interface ListViewProps {
  className?: string;
}

export function ListView({ className }: ListViewProps) {
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const linkTags = useLinksStore((state) => state.linkTags);
  const isLoading = useLinksStore((state) => state.isLoading);
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const sortBy = useListViewStore((state) => state.sortBy);
  const sortOrder = useListViewStore((state) => state.sortOrder);
  const showEmptyCategories = useListViewStore((state) => state.showEmptyCategories);
  const showUncategorized = useListViewStore((state) => state.showUncategorized);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  // Filter links based on active filter and search
  const filteredLinks = useMemo(() => {
    let result = [...links];

    // Apply category filter
    if (activeFilter.type === "category" && activeFilter.id) {
      result = result.filter((link: Link) => link.categoryId === activeFilter.id);
    }

    // Apply tag filter
    if (activeFilter.type === "tag" && activeFilter.id) {
      const tagLinkIds = linkTags
        .filter((lt: LinkTag) => lt.tagId === activeFilter.id)
        .map((lt: LinkTag) => lt.linkId);
      result = result.filter((link: Link) => tagLinkIds.includes(link.id));
    }

    // Apply favorites filter
    if (activeFilter.type === "favorites") {
      result = result.filter((link: Link) => link.isFavorite);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (link: Link) =>
          link.title.toLowerCase().includes(query) ||
          link.url.toLowerCase().includes(query) ||
          link.description?.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a: Link, b: Link) => {
      let comparison = 0;
      if (sortBy === "title") {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === "createdAt") {
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "updatedAt") {
        comparison =
          new Date(b.updatedAt || b.createdAt).getTime() -
          new Date(a.updatedAt || a.createdAt).getTime();
      }
      return sortOrder === "asc" ? -comparison : comparison;
    });

    return result;
  }, [links, activeFilter, searchQuery, linkTags, sortBy, sortOrder]);

  // Group links by category
  const linksByCategory = useMemo(() => {
    const grouped = new Map<string | null, Link[]>();

    // Initialize with all categories
    categories.forEach((cat: Category) => {
      grouped.set(cat.id, []);
    });
    grouped.set(null, []); // Uncategorized

    // Group filtered links
    filteredLinks.forEach((link: Link) => {
      const categoryId = link.categoryId;
      const existing = grouped.get(categoryId) || [];
      grouped.set(categoryId, [...existing, link]);
    });

    return grouped;
  }, [filteredLinks, categories]);

  // Get sorted categories
  const sortedCategories = useMemo(() => {
    return [...categories].sort((a: Category, b: Category) => (a.order || 0) - (b.order || 0));
  }, [categories]);

  // Get category IDs for collapse/expand
  const categoryIds = useMemo(() => {
    const ids = sortedCategories.map((c: Category) => c.id);
    if (showUncategorized) ids.push("uncategorized");
    return ids;
  }, [sortedCategories, showUncategorized]);

  // Get link tags for filtered links
  const filteredLinkTags = useMemo(() => {
    const filteredLinkIds = new Set(filteredLinks.map((l: Link) => l.id));
    return linkTags.filter((lt: LinkTag) => filteredLinkIds.has(lt.linkId));
  }, [filteredLinks, linkTags]);

  // Loading state
  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Cargando enlaces...</p>
        </div>
      </div>
    );
  }

  // Empty state - no links at all
  if (links.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ListViewToolbar
          categoryIds={categoryIds}
          totalLinks={links.length}
          filteredLinks={filteredLinks.length}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <Link2Off className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No hay enlaces</h3>
            <p className="text-sm text-muted-foreground">
              Anade tu primer enlace usando el boton + en la barra lateral o el widget de agregar rapido.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Empty state - no matches for filter
  if (filteredLinks.length === 0) {
    return (
      <div className={cn("flex flex-col", className)}>
        <ListViewToolbar
          categoryIds={categoryIds}
          totalLinks={links.length}
          filteredLinks={filteredLinks.length}
        />
        <div className="flex-1 flex items-center justify-center p-8">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
              <FolderOpen className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Sin resultados</h3>
            <p className="text-sm text-muted-foreground">
              No se encontraron enlaces que coincidan con los filtros actuales. Intenta ajustar tu busqueda.
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Toolbar */}
      <ListViewToolbar
        categoryIds={categoryIds}
        totalLinks={links.length}
        filteredLinks={filteredLinks.length}
        className="flex-shrink-0 mb-3"
      />

      {/* Scrollable content */}
      <ScrollArea className="flex-1">
        <div className="space-y-3 pb-4">
          {/* Render categories in order */}
          {sortedCategories.map((category: Category) => {
            const categoryLinks = linksByCategory.get(category.id) || [];

            // Skip empty categories if not showing them
            if (categoryLinks.length === 0 && !showEmptyCategories) {
              return null;
            }

            return (
              <CategorySection
                key={category.id}
                category={category}
                links={categoryLinks}
                linkTags={filteredLinkTags}
              />
            );
          })}

          {/* Uncategorized section */}
          {showUncategorized && (
            <CategorySection
              category={null}
              links={linksByCategory.get(null) || []}
              linkTags={filteredLinkTags}
            />
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
