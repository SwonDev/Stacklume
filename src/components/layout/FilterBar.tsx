"use client";

import { X, Star, Clock, FolderOpen, Tag, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLayoutStore } from "@/stores/layout-store";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "@/lib/i18n";

const filterIcons = {
  favorites: Star,
  recent: Clock,
  category: FolderOpen,
  tag: Tag,
  all: Filter,
};

export function FilterBar() {
  const { t } = useTranslation();
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);

  const isFiltering = activeFilter.type !== "all" || searchQuery.trim();

  if (!isFiltering) return null;

  const FilterIcon = filterIcons[activeFilter.type] || Filter;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="border-b border-border/50 bg-secondary/30"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground whitespace-nowrap">{t("filterBar.filteringBy")}</span>

            {activeFilter.type !== "all" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <FilterIcon className="w-3 h-3" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {activeFilter.ids && activeFilter.ids.length > 1
                    ? `${activeFilter.ids.length} ${activeFilter.type === "category" ? "categorías" : "etiquetas"}`
                    : activeFilter.label || activeFilter.type}
                </span>
              </Badge>
            )}

            {searchQuery.trim() && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-secondary hover:bg-secondary/80"
              >
                <span className="text-muted-foreground hidden xs:inline">{t("filterBar.search")}:</span>
                <span className="truncate max-w-[100px] sm:max-w-[200px]">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </Badge>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap self-end sm:self-auto"
            onClick={() => {
              useLayoutStore.getState().clearFilter();
              useLayoutStore.getState().setSearchQuery("");
            }}
          >
            <X className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">{t("filterBar.clearFilters")}</span>
            <span className="xs:hidden">{t("filterBar.clear")}</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
