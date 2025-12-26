"use client";

import { useState, useCallback, useMemo } from "react";
import { Heart, ChevronLeft, ChevronRight, Save, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface GratitudeJournalWidgetProps {
  widget: Widget;
}

interface GratitudeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  items: string[];
  createdAt: string;
}

export function GratitudeJournalWidget({ widget }: GratitudeJournalWidgetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [gratitude1, setGratitude1] = useState("");
  const [gratitude2, setGratitude2] = useState("");
  const [gratitude3, setGratitude3] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const gratitudeEntries: GratitudeEntry[] = widget.config?.gratitudeEntries || [];

  const getTodayISO = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  const getDateISO = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const saveGratitudeEntries = useCallback(
    (entries: GratitudeEntry[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          gratitudeEntries: entries,
        },
      });
    },
    [widget.id, widget.config]
  );

  const currentEntry = useMemo(() => {
    const dateISO = getDateISO(selectedDate);
    return gratitudeEntries.find((e) => e.date === dateISO);
  }, [selectedDate, gratitudeEntries]);

  const isToday = getDateISO(selectedDate) === getTodayISO();

  const startEditing = () => {
    if (currentEntry) {
      setGratitude1(currentEntry.items[0] || "");
      setGratitude2(currentEntry.items[1] || "");
      setGratitude3(currentEntry.items[2] || "");
    } else {
      setGratitude1("");
      setGratitude2("");
      setGratitude3("");
    }
    setIsEditing(true);
  };

  const saveEntry = () => {
    const dateISO = getDateISO(selectedDate);
    const existingIndex = gratitudeEntries.findIndex((e) => e.date === dateISO);

    const newEntry: GratitudeEntry = {
      id: currentEntry?.id || crypto.randomUUID(),
      date: dateISO,
      items: [gratitude1.trim(), gratitude2.trim(), gratitude3.trim()].filter(Boolean),
      createdAt: currentEntry?.createdAt || new Date().toISOString(),
    };

    let updatedEntries: GratitudeEntry[];
    if (existingIndex >= 0) {
      updatedEntries = [...gratitudeEntries];
      updatedEntries[existingIndex] = newEntry;
    } else {
      updatedEntries = [newEntry, ...gratitudeEntries];
    }

    // Keep only last 90 days
    updatedEntries = updatedEntries.slice(0, 90);

    saveGratitudeEntries(updatedEntries);
    setIsEditing(false);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setGratitude1("");
    setGratitude2("");
    setGratitude3("");
  };

  const navigateDate = (direction: -1 | 1) => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction);
      // Don't allow future dates
      if (newDate > new Date()) return prev;
      return newDate;
    });
    setIsEditing(false);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
    setIsEditing(false);
  };

  const formatDate = (date: Date): string => {
    if (isToday) return "Hoy";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (getDateISO(date) === getDateISO(yesterday)) return "Ayer";

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Calculate streak
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateISO = getDateISO(checkDate);
      const hasEntry = gratitudeEntries.some(
        (e) => e.date === dateISO && e.items.some((g) => g.trim())
      );

      if (hasEntry) {
        count++;
      } else if (i > 0) {
        break;
      }
    }

    return count;
  }, [gratitudeEntries]);

  const hasContent = currentEntry?.items.some((g) => g.trim());

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span className="text-sm font-medium">Gratitud</span>
            {streak > 0 && (
              <span className="text-xs text-rose-500 font-medium">
                {streak} dias
              </span>
            )}
          </div>
          {!isEditing && isToday && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={startEditing}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" />
              <span className="hidden @sm:inline">
                {currentEntry ? "Editar" : "Escribir"}
              </span>
            </Button>
          )}
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateDate(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <button
            onClick={goToToday}
            className={cn(
              "text-xs font-medium capitalize px-2 py-1 rounded transition-colors",
              isToday
                ? "text-rose-600 dark:text-rose-400"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {formatDate(selectedDate)}
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateDate(1)}
            disabled={isToday}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Main content */}
        <AnimatePresence mode="wait">
          {isEditing ? (
            <motion.div
              key="editing"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              <p className="text-xs text-muted-foreground text-center mb-3">
                Por que estas agradecido/a hoy?
              </p>

              <div className="space-y-2 flex-1">
                {[
                  { value: gratitude1, setter: setGratitude1, num: 1 },
                  { value: gratitude2, setter: setGratitude2, num: 2 },
                  { value: gratitude3, setter: setGratitude3, num: 3 },
                ].map(({ value, setter, num }) => (
                  <div key={num} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4">
                      {num}.
                    </span>
                    <Input
                      value={value}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={`Gratitud ${num}...`}
                      className="h-9 text-sm flex-1"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={cancelEditing}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={saveEntry}
                  disabled={
                    !gratitude1.trim() &&
                    !gratitude2.trim() &&
                    !gratitude3.trim()
                  }
                >
                  <Save className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="viewing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              {hasContent ? (
                <ScrollArea className="flex-1">
                  <div className="space-y-3">
                    {currentEntry?.items.map((gratitude, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={cn(
                          "flex gap-2",
                          !gratitude.trim() && "hidden"
                        )}
                      >
                        <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm leading-relaxed">{gratitude}</p>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-3">
                    <Heart className="w-6 h-6 text-rose-400" />
                  </div>
                  {isToday ? (
                    <>
                      <p className="text-sm text-muted-foreground mb-3">
                        Aun no has escrito hoy
                      </p>
                      <Button size="sm" onClick={startEditing}>
                        <Edit2 className="w-4 h-4 mr-1" />
                        Empezar
                      </Button>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No hay entrada para este dia
                    </p>
                  )}
                </div>
              )}

              {/* Recent entries preview - only show when not viewing old entry */}
              {isToday && gratitudeEntries.length > 0 && !currentEntry && (
                <div className="mt-auto pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Entradas recientes
                  </p>
                  <div className="flex gap-1">
                    {gratitudeEntries.slice(0, 7).map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => {
                          const date = new Date(entry.date + "T12:00:00");
                          setSelectedDate(date);
                        }}
                        className="w-6 h-6 rounded bg-rose-500/20 hover:bg-rose-500/30 flex items-center justify-center transition-colors"
                        title={new Date(entry.date).toLocaleDateString("es-ES")}
                      >
                        <Heart className="w-3 h-3 text-rose-500 fill-rose-500" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
