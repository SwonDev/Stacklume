"use client";

import { useState, useCallback, useMemo } from "react";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  Target,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface DailyReviewWidgetProps {
  widget: Widget;
}

interface DailyReview {
  id: string;
  date: string; // ISO date string
  wentWell: string[];
  toImprove: string[];
  tomorrowPriorities: string[];
}

interface DailyReviewConfig {
  reviews?: DailyReview[];
}

type ReviewSection = "wentWell" | "toImprove" | "tomorrowPriorities";

const SECTION_CONFIG = {
  wentWell: {
    title: "Que salio bien",
    icon: Sparkles,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    placeholder: "Algo positivo de hoy...",
  },
  toImprove: {
    title: "Que mejorar",
    icon: AlertTriangle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    placeholder: "Algo a mejorar...",
  },
  tomorrowPriorities: {
    title: "Prioridades de manana",
    icon: Target,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    placeholder: "Una prioridad para manana...",
  },
};

export function DailyReviewWidget({ widget }: DailyReviewWidgetProps) {
  const config: DailyReviewConfig = widget.config || {};
  const reviews: DailyReview[] = config.reviews || [];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [newItems, setNewItems] = useState<Record<ReviewSection, string>>({
    wentWell: "",
    toImprove: "",
    tomorrowPriorities: "",
  });
  const [expandedSection, setExpandedSection] = useState<ReviewSection | null>("wentWell");

  const currentReview = useMemo(() => {
    return (
      reviews.find((r) => r.date === selectedDate) || {
        id: crypto.randomUUID(),
        date: selectedDate,
        wentWell: [],
        toImprove: [],
        tomorrowPriorities: [],
      }
    );
  }, [reviews, selectedDate]);

  const saveReview = useCallback(
    (updatedReview: DailyReview) => {
      const existingIndex = reviews.findIndex((r) => r.date === updatedReview.date);
      let updatedReviews: DailyReview[];

      if (existingIndex >= 0) {
        updatedReviews = reviews.map((r, i) => (i === existingIndex ? updatedReview : r));
      } else {
        updatedReviews = [...reviews, updatedReview];
      }

      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          reviews: updatedReviews,
        },
      });
    },
    [widget.id, widget.config, reviews]
  );

  const addItem = (section: ReviewSection) => {
    const text = newItems[section].trim();
    if (!text) return;

    const updatedReview = {
      ...currentReview,
      [section]: [...currentReview[section], text],
    };

    saveReview(updatedReview);
    setNewItems((prev) => ({ ...prev, [section]: "" }));
  };

  const deleteItem = (section: ReviewSection, index: number) => {
    const updatedReview = {
      ...currentReview,
      [section]: currentReview[section].filter((_, i) => i !== index),
    };
    saveReview(updatedReview);
  };

  const changeDate = (delta: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + delta);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];

    if (dateStr === todayStr) return "Hoy";
    if (dateStr === yesterdayStr) return "Ayer";

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getTotalItems = (): number => {
    return (
      currentReview.wentWell.length +
      currentReview.toImprove.length +
      currentReview.tomorrowPriorities.length
    );
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Revision Diaria</span>
          </div>
          <span className="text-xs text-muted-foreground">{getTotalItems()} items</span>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">{formatDateDisplay(selectedDate)}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Sections */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-2">
            {(Object.keys(SECTION_CONFIG) as ReviewSection[]).map((section) => {
              const config = SECTION_CONFIG[section];
              const Icon = config.icon;
              const items = currentReview[section];
              const isExpanded = expandedSection === section;

              return (
                <motion.div
                  key={section}
                  className={cn(
                    "rounded-lg border border-border overflow-hidden transition-colors",
                    isExpanded ? config.bgColor : "bg-card"
                  )}
                >
                  {/* Section Header */}
                  <button
                    onClick={() => setExpandedSection(isExpanded ? null : section)}
                    className="w-full flex items-center justify-between p-2 @sm:p-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("w-4 h-4", config.color)} />
                      <span className="text-xs @sm:text-sm font-medium">{config.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{items.length}</span>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronLeft className="w-4 h-4 -rotate-90" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Section Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-2 @sm:px-3 pb-2 @sm:pb-3 space-y-2">
                          {/* Items */}
                          {items.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center py-2">
                              Sin items aun
                            </p>
                          ) : (
                            <div className="space-y-1">
                              {items.map((item, index) => (
                                <motion.div
                                  key={`${section}-${index}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  exit={{ opacity: 0, x: -10 }}
                                  className="flex items-center gap-2 group"
                                >
                                  <span className="flex-1 text-xs @sm:text-sm">
                                    {item}
                                  </span>
                                  <button
                                    onClick={() => deleteItem(section, index)}
                                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                                  >
                                    <Trash2 className="w-3 h-3 text-destructive" />
                                  </button>
                                </motion.div>
                              ))}
                            </div>
                          )}

                          {/* Add Item Input */}
                          <div className="flex gap-2 pt-1">
                            <Input
                              value={newItems[section]}
                              onChange={(e) =>
                                setNewItems((prev) => ({ ...prev, [section]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") addItem(section);
                              }}
                              placeholder={config.placeholder}
                              className="h-7 @sm:h-8 text-xs @sm:text-sm flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 @sm:h-8 w-7 @sm:w-8 p-0"
                              onClick={() => addItem(section)}
                              disabled={!newItems[section].trim()}
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
