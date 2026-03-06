"use client";

import { useState, useCallback } from "react";
import { X, Star, Clock, FolderOpen, Tag as TagIcon, Filter, BookOpen, ChevronDown, Check, CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLayoutStore } from "@/stores/layout-store";
import { useLinksStore } from "@/stores/links-store";
import { motion, AnimatePresence } from "motion/react";
import type { Tag } from "@/lib/db/schema";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type DatePreset = "all" | "today" | "week" | "month" | "year";

interface DateRange {
  from: Date | null;
  to: Date | null;
}

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Todas las fechas" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
];

function getDateRangeForPreset(preset: DatePreset): DateRange {
  const now = new Date();
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (preset === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { from: start, to: now };
  }
  if (preset === "year") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    return { from: start, to: now };
  }
  return { from: null, to: null };
}

// ---------------------------------------------------------------------------
// Iconos de filtro
// ---------------------------------------------------------------------------

const filterIcons = {
  favorites: Star,
  recent: Clock,
  category: FolderOpen,
  tag: TagIcon,
  all: Filter,
  unread: BookOpen,
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function FilterBar() {
  const activeFilter = useLayoutStore((state) => state.activeFilter);
  const searchQuery = useLayoutStore((state) => state.searchQuery);
  const clearFilter = useLayoutStore((state) => state.clearFilter);
  const setSearchQuery = useLayoutStore((state) => state.setSearchQuery);
  const setActiveFilter = useLayoutStore((state) => state.setActiveFilter);

  const tags = useLinksStore((state) => state.tags);

  // Estado local: etiquetas adicionales seleccionadas (más allá de la del activeFilter)
  const [extraTagIds, setExtraTagIds] = useState<string[]>([]);
  const [tagLogic, setTagLogic] = useState<"AND" | "OR">("OR");
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  // Estado local: preset de fecha
  const [datePreset, setDatePreset] = useState<DatePreset>("all");

  // Calcular el rango de fechas activo
  const dateRange = getDateRangeForPreset(datePreset);

  const isFiltering =
    activeFilter.type !== "all" ||
    searchQuery.trim() ||
    extraTagIds.length > 0 ||
    datePreset !== "all";

  // Etiqueta activa en el filtro principal (si aplica)
  const primaryTagId = activeFilter.type === "tag" ? activeFilter.id : undefined;

  // Todos los IDs de etiquetas activos (primaria + extras)
  const allActiveTagIds = [
    ...(primaryTagId ? [primaryTagId] : []),
    ...extraTagIds,
  ];

  const handleRemoveExtraTag = useCallback((tagId: string) => {
    setExtraTagIds((prev) => prev.filter((id) => id !== tagId));
  }, []);

  const handleToggleExtraTag = useCallback(
    (tagId: string) => {
      if (tagId === primaryTagId) {
        // Quitar el filtro primario si se deselecciona
        clearFilter();
        return;
      }
      setExtraTagIds((prev) =>
        prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
      );
    },
    [primaryTagId, clearFilter]
  );

  const handleClearAll = () => {
    clearFilter();
    setSearchQuery("");
    setExtraTagIds([]);
    setTagLogic("OR");
    setDatePreset("all");
  };

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value as DatePreset);
  };

  if (!isFiltering) return null;

  const FilterIcon = filterIcons[activeFilter.type] || Filter;

  // Etiquetas disponibles para añadir (las que no están ya activas)
  const availableTags = tags.filter(
    (t: Tag) => !allActiveTagIds.includes(t.id)
  );

  const presetLabel =
    DATE_PRESETS.find((p) => p.value === datePreset)?.label ?? "Fecha";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: "auto" }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        className="border-b border-border/50 bg-secondary/30 backdrop-blur-sm"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 px-3 sm:px-4 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Filtrando por:
            </span>

            {/* Filtro activo principal (no-etiqueta) */}
            {activeFilter.type !== "all" && activeFilter.type !== "tag" && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
              >
                <FilterIcon className="w-3 h-3" />
                <span className="truncate max-w-[120px] sm:max-w-none">
                  {activeFilter.label || activeFilter.type}
                </span>
              </Badge>
            )}

            {/* Etiquetas activas (una o múltiples) */}
            {allActiveTagIds.length > 0 && (
              <>
                {allActiveTagIds.map((tagId, idx) => {
                  const tag = tags.find((t: Tag) => t.id === tagId);
                  if (!tag) return null;
                  const isPrimary = tagId === primaryTagId;
                  return (
                    <Badge
                      key={tagId}
                      variant="secondary"
                      className="gap-1 bg-primary/10 text-primary hover:bg-primary/20 pr-1"
                    >
                      <TagIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[100px]">{tag.name}</span>
                      <button
                        className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
                        onClick={() => {
                          if (isPrimary) {
                            if (extraTagIds.length > 0) {
                              // Promueve la primera etiqueta extra a filtro primario
                              const [newPrimary, ...rest] = extraTagIds;
                              const newTag = tags.find((t: Tag) => t.id === newPrimary);
                              setActiveFilter({
                                type: "tag",
                                id: newPrimary,
                                label: newTag?.name ?? newPrimary,
                              });
                              setExtraTagIds(rest);
                            } else {
                              clearFilter();
                            }
                          } else {
                            handleRemoveExtraTag(tagId);
                          }
                        }}
                        aria-label={`Quitar etiqueta ${tag.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      {/* Separador lógico entre etiquetas */}
                      {idx < allActiveTagIds.length - 1 && (
                        <span className="text-[10px] text-primary/60 ml-1">
                          {tagLogic}
                        </span>
                      )}
                    </Badge>
                  );
                })}

                {/* Toggle AND/OR cuando hay 2+ etiquetas */}
                {allActiveTagIds.length >= 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      setTagLogic((prev) => (prev === "AND" ? "OR" : "AND"))
                    }
                    title={
                      tagLogic === "AND"
                        ? "Todos los tags deben coincidir (AND) — clic para cambiar a cualquiera (OR)"
                        : "Cualquier tag coincide (OR) — clic para cambiar a todos (AND)"
                    }
                  >
                    {tagLogic === "AND" ? "Todos (AND)" : "Alguno (OR)"}
                  </Button>
                )}

                {/* Botón para añadir otra etiqueta */}
                {availableTags.length > 0 && (
                  <Popover open={tagPickerOpen} onOpenChange={setTagPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground rounded-full"
                        title="Añadir etiqueta al filtro"
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1" align="start">
                      <p className="text-xs text-muted-foreground px-2 py-1 mb-1">
                        Añadir etiqueta
                      </p>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {availableTags.map((tag: Tag) => (
                          <button
                            key={tag.id}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-secondary text-left"
                            onClick={() => {
                              handleToggleExtraTag(tag.id);
                              setTagPickerOpen(false);
                            }}
                          >
                            <TagIcon className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate">{tag.name}</span>
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </>
            )}

            {/* Búsqueda activa */}
            {searchQuery.trim() && (
              <Badge
                variant="secondary"
                className="gap-1.5 bg-secondary hover:bg-secondary/80"
              >
                <span className="text-muted-foreground hidden xs:inline">
                  Búsqueda:
                </span>
                <span className="truncate max-w-[100px] sm:max-w-[200px]">
                  &ldquo;{searchQuery}&rdquo;
                </span>
              </Badge>
            )}

            {/* Selector de rango de fechas */}
            <div className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-muted-foreground" />
              <Select value={datePreset} onValueChange={handleDatePresetChange}>
                <SelectTrigger
                  className="h-6 text-xs border-none bg-transparent shadow-none px-1 gap-0.5 min-w-0 w-auto focus:ring-0 [&>svg]:h-3 [&>svg]:w-3"
                  aria-label="Filtrar por fecha"
                >
                  <SelectValue>
                    <span
                      className={
                        datePreset !== "all"
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }
                    >
                      {presetLabel}
                    </span>
                  </SelectValue>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </SelectTrigger>
                <SelectContent>
                  {DATE_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.value}
                      value={preset.value}
                      className="text-xs"
                    >
                      <span className="flex items-center gap-2">
                        {datePreset === preset.value && (
                          <Check className="w-3 h-3 text-primary" />
                        )}
                        {preset.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datos del filtro de fechas exportados para consumidores externos vía data-attrs */}
            {dateRange.from && (
              <span
                className="sr-only"
                data-filter-date-from={dateRange.from.toISOString()}
                data-filter-date-to={dateRange.to?.toISOString() ?? ""}
                data-filter-tag-ids={allActiveTagIds.join(",")}
                data-filter-tag-logic={tagLogic}
              />
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap self-end sm:self-auto"
            onClick={handleClearAll}
          >
            <X className="w-3 h-3 mr-1" />
            <span className="hidden xs:inline">Limpiar filtros</span>
            <span className="xs:hidden">Limpiar</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
