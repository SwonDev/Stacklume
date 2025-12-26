"use client";

import { useState, useCallback } from "react";
import { Smile, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface MoodTrackerWidgetProps {
  widget: Widget;
}

type MoodValue = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

interface MoodEntry {
  id: string;
  date: string; // YYYY-MM-DD
  mood: MoodValue;
  note?: string;
  createdAt: string;
}

const MOOD_LEVELS: { value: MoodValue; emoji: string; label: string; color: string }[] = [
  { value: 'terrible', emoji: "😢", label: "Terrible", color: "bg-red-500" },
  { value: 'bad', emoji: "😔", label: "Mal", color: "bg-orange-500" },
  { value: 'okay', emoji: "😐", label: "Regular", color: "bg-yellow-500" },
  { value: 'good', emoji: "🙂", label: "Bien", color: "bg-lime-500" },
  { value: 'great', emoji: "😄", label: "Excelente", color: "bg-green-500" },
];

export function MoodTrackerWidget({ widget }: MoodTrackerWidgetProps) {
  const [isAddingMood, setIsAddingMood] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodValue | null>(null);
  const [note, setNote] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const moodEntries: MoodEntry[] = widget.config?.moodEntries || [];

  const getTodayISO = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  const saveMoodEntries = useCallback(
    (entries: MoodEntry[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          moodEntries: entries,
        },
      });
    },
    [widget.id, widget.config]
  );

  const todayEntry = moodEntries.find((e) => e.date === getTodayISO());

  const addMoodEntry = () => {
    if (!selectedMood) return;

    const today = getTodayISO();
    const existingIndex = moodEntries.findIndex((e) => e.date === today);

    const newEntry: MoodEntry = {
      id: crypto.randomUUID(),
      date: today,
      mood: selectedMood,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    let updatedEntries: MoodEntry[];
    if (existingIndex >= 0) {
      updatedEntries = [...moodEntries];
      updatedEntries[existingIndex] = newEntry;
    } else {
      updatedEntries = [newEntry, ...moodEntries];
    }

    saveMoodEntries(updatedEntries);
    setIsAddingMood(false);
    setSelectedMood(null);
    setNote("");
  };

  const getMonthDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }

    return days;
  };

  const getMoodForDate = (date: Date): MoodEntry | undefined => {
    const dateISO = date.toISOString().split("T")[0];
    return moodEntries.find((e) => e.date === dateISO);
  };

  const navigateMonth = (direction: -1 | 1) => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const monthDays = getMonthDays(currentMonth);
  const monthName = currentMonth.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Smile className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Estado de animo</span>
          </div>
          {!isAddingMood && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsAddingMood(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              <span className="hidden @sm:inline">
                {todayEntry ? "Actualizar" : "Registrar"}
              </span>
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isAddingMood ? (
            <motion.div
              key="add-mood"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col"
            >
              {/* Mood Selection */}
              <div className="mb-4">
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Como te sientes hoy?
                </p>
                <div className="flex justify-center gap-2 @sm:gap-3">
                  {MOOD_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => setSelectedMood(level.value)}
                      className={cn(
                        "relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all",
                        selectedMood === level.value
                          ? "bg-primary/10 ring-2 ring-primary scale-110"
                          : "hover:bg-muted"
                      )}
                    >
                      <span className="text-2xl @sm:text-3xl">{level.emoji}</span>
                      <span className="text-[9px] @sm:text-[10px] text-muted-foreground">
                        {level.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Note Input */}
              <div className="mb-4">
                <Textarea
                  placeholder="Nota opcional sobre tu dia..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-20 text-sm resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setIsAddingMood(false);
                    setSelectedMood(null);
                    setNote("");
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={addMoodEntry}
                  disabled={!selectedMood}
                >
                  Guardar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="calendar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col"
            >
              {/* Today's mood display */}
              {todayEntry && (
                <div className="mb-3 p-2 rounded-lg bg-muted/50 flex items-center gap-2">
                  <span className="text-xl">
                    {MOOD_LEVELS.find((m) => m.value === todayEntry.mood)?.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">
                      {MOOD_LEVELS.find((m) => m.value === todayEntry.mood)?.label}
                    </p>
                    {todayEntry.note && (
                      <p className="text-xs text-muted-foreground truncate">
                        {todayEntry.note}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Month Navigation */}
              <div className="flex items-center justify-between mb-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigateMonth(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-xs font-medium capitalize">{monthName}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => navigateMonth(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["D", "L", "M", "X", "J", "V", "S"].map((day) => (
                  <div
                    key={day}
                    className="text-[9px] text-center text-muted-foreground font-medium"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-7 gap-1">
                  {monthDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const moodEntry = getMoodForDate(day);
                    const moodLevel = moodEntry
                      ? MOOD_LEVELS.find((m) => m.value === moodEntry.mood)
                      : null;

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "aspect-square flex items-center justify-center rounded text-[10px] relative",
                          isToday(day) && "ring-1 ring-primary",
                          !moodEntry && "text-muted-foreground"
                        )}
                        title={
                          moodEntry
                            ? `${moodLevel?.label}${moodEntry.note ? `: ${moodEntry.note}` : ""}`
                            : undefined
                        }
                      >
                        {moodEntry ? (
                          <span className="text-sm @sm:text-base">
                            {moodLevel?.emoji}
                          </span>
                        ) : (
                          <span className="text-[10px]">{day.getDate()}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
