"use client";

import { useState, useCallback, useMemo } from "react";
import { Moon, Plus, Clock, TrendingUp, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface SleepLogWidgetProps {
  widget: Widget;
}

interface SleepEntry {
  id: string;
  date: string; // YYYY-MM-DD
  bedtime: string; // HH:MM (24h)
  wakeTime: string; // HH:MM (24h)
  duration: number; // in minutes
  quality?: 'great' | 'good' | 'okay' | 'poor';
}

export function SleepLogWidget({ widget }: SleepLogWidgetProps) {
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");

  const sleepEntries: SleepEntry[] = widget.config?.sleepEntries || [];

  const getTodayISO = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  const calculateDuration = (bed: string, wake: string): number => {
    const [bedHour, bedMin] = bed.split(":").map(Number);
    const [wakeHour, wakeMin] = wake.split(":").map(Number);

    const bedMinutes = bedHour * 60 + bedMin;
    let wakeMinutes = wakeHour * 60 + wakeMin;

    // If wake time is before bedtime, assume it's the next day
    if (wakeMinutes <= bedMinutes) {
      wakeMinutes += 24 * 60;
    }

    return wakeMinutes - bedMinutes;
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const saveSleepEntries = useCallback(
    (entries: SleepEntry[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          sleepEntries: entries,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addSleepEntry = () => {
    const today = getTodayISO();
    const duration = calculateDuration(bedtime, wakeTime);

    const newEntry: SleepEntry = {
      id: crypto.randomUUID(),
      date: today,
      bedtime,
      wakeTime,
      duration,
    };

    // Replace if entry for today already exists
    const existingIndex = sleepEntries.findIndex((e) => e.date === today);
    let updatedEntries: SleepEntry[];

    if (existingIndex >= 0) {
      updatedEntries = [...sleepEntries];
      updatedEntries[existingIndex] = newEntry;
    } else {
      updatedEntries = [newEntry, ...sleepEntries];
    }

    // Keep only last 30 days
    updatedEntries = updatedEntries.slice(0, 30);

    saveSleepEntries(updatedEntries);
    setIsAddingEntry(false);
  };

  const deleteEntry = (id: string) => {
    const updatedEntries = sleepEntries.filter((e) => e.id !== id);
    saveSleepEntries(updatedEntries);
  };

  // Get last 7 days data for chart
  const weekData = useMemo(() => {
    const days: { date: string; label: string; duration: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateISO = date.toISOString().split("T")[0];
      const entry = sleepEntries.find((e) => e.date === dateISO);
      days.push({
        date: dateISO,
        label: date.toLocaleDateString("es-ES", { weekday: "short" }),
        duration: entry?.duration || 0,
      });
    }
    return days;
  }, [sleepEntries]);

  const maxDuration = Math.max(...weekData.map((d) => d.duration), 480); // At least 8 hours
  const avgDuration = useMemo(() => {
    const validEntries = weekData.filter((d) => d.duration > 0);
    if (validEntries.length === 0) return 0;
    return Math.round(
      validEntries.reduce((sum, d) => sum + d.duration, 0) / validEntries.length
    );
  }, [weekData]);

  const todayEntry = sleepEntries.find((e) => e.date === getTodayISO());

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium">Sueno</span>
          </div>
          {!isAddingEntry && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsAddingEntry(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden @sm:inline">
                {todayEntry ? "Actualizar" : "Registrar"}
              </span>
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isAddingEntry ? (
            <motion.div
              key="add-entry"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              <div className="space-y-4">
                {/* Bedtime input */}
                <div className="space-y-1">
                  <Label htmlFor="bedtime" className="text-xs">
                    Hora de acostarse
                  </Label>
                  <Input
                    id="bedtime"
                    type="time"
                    value={bedtime}
                    onChange={(e) => setBedtime(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Wake time input */}
                <div className="space-y-1">
                  <Label htmlFor="wakeTime" className="text-xs">
                    Hora de despertar
                  </Label>
                  <Input
                    id="wakeTime"
                    type="time"
                    value={wakeTime}
                    onChange={(e) => setWakeTime(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Duration preview */}
                <div className="p-3 rounded-lg bg-indigo-500/10 text-center">
                  <p className="text-xs text-muted-foreground mb-1">
                    Duracion estimada
                  </p>
                  <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatDuration(calculateDuration(bedtime, wakeTime))}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsAddingEntry(false)}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" className="flex-1" onClick={addSleepEntry}>
                    <Check className="w-4 h-4 mr-1" />
                    Guardar
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              {/* Today's summary */}
              {todayEntry && (
                <div className="mb-3 p-2 rounded-lg bg-indigo-500/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    <span className="text-xs">
                      {todayEntry.bedtime} - {todayEntry.wakeTime}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {formatDuration(todayEntry.duration)}
                  </span>
                </div>
              )}

              {/* Weekly Chart */}
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    Ultimos 7 dias
                  </span>
                  {avgDuration > 0 && (
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 ml-auto">
                      Promedio: {formatDuration(avgDuration)}
                    </span>
                  )}
                </div>

                {/* Bar chart */}
                <div className="flex-1 flex items-end justify-between gap-1 @sm:gap-2 min-h-[80px]">
                  {weekData.map((day) => {
                    const heightPercent =
                      day.duration > 0 ? (day.duration / maxDuration) * 100 : 0;
                    const isToday = day.date === getTodayISO();
                    const hours = Math.floor(day.duration / 60);

                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <motion.div
                          className="w-full relative"
                          style={{ height: "80px" }}
                        >
                          <motion.div
                            className={cn(
                              "absolute bottom-0 w-full rounded-t",
                              day.duration === 0
                                ? "bg-muted/50"
                                : isToday
                                  ? "bg-indigo-500"
                                  : "bg-indigo-400/70"
                            )}
                            initial={{ height: 0 }}
                            animate={{
                              height: day.duration > 0 ? `${heightPercent}%` : "4px",
                            }}
                            transition={{ type: "spring", stiffness: 100, delay: 0.05 }}
                            title={
                              day.duration > 0 ? formatDuration(day.duration) : "Sin datos"
                            }
                          />
                          {day.duration > 0 && heightPercent > 30 && (
                            <motion.span
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3 }}
                              className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-medium text-white"
                            >
                              {hours}h
                            </motion.span>
                          )}
                        </motion.div>
                        <span
                          className={cn(
                            "text-[9px] @sm:text-[10px] capitalize",
                            isToday
                              ? "font-medium text-indigo-600 dark:text-indigo-400"
                              : "text-muted-foreground"
                          )}
                        >
                          {day.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* 8 hour goal line */}
                <div className="relative mt-2">
                  <div className="absolute -top-[calc(80px*(480/var(--max-duration)))] left-0 right-0 border-t border-dashed border-green-500/50"
                    style={{ "--max-duration": maxDuration } as React.CSSProperties}
                  />
                </div>
              </div>

              {/* Recent entries list */}
              {sleepEntries.length > 0 && (
                <ScrollArea className="max-h-24 mt-3 -mx-1 px-1">
                  <div className="space-y-1">
                    {sleepEntries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 group"
                      >
                        <span className="text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString("es-ES", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatDuration(entry.duration)}
                          </span>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
