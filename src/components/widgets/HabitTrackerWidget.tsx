"use client";

import { useState } from "react";
import { Plus, Trash2, Flame, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface Habit {
  id: string;
  name: string;
  completedDates: string[]; // ISO date strings
  createdAt: string;
}

interface HabitTrackerWidgetProps {
  widget: Widget;
}

export function HabitTrackerWidget({ widget }: HabitTrackerWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const [newHabitName, setNewHabitName] = useState("");
  const [isAddingHabit, setIsAddingHabit] = useState(false);

  const habits = (widget.config?.habits as Habit[]) || [];

  // Get today's date in ISO format (YYYY-MM-DD)
  const getTodayISO = (): string => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  // Get last 7 days including today
  const getLast7Days = (): string[] => {
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }
    return days;
  };

  // Calculate streak for a habit
  const calculateStreak = (habit: Habit): number => {
    if (!habit.completedDates.length) return 0;

    const sortedDates = [...habit.completedDates].sort().reverse();
    let streak = 0;
    const today = getTodayISO();

    // Check if today or yesterday is the most recent completion
    const mostRecent = sortedDates[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayISO = yesterday.toISOString().split("T")[0];

    if (mostRecent !== today && mostRecent !== yesterdayISO) {
      return 0; // Streak is broken
    }

    // Count consecutive days
    const currentDate = new Date(today);
    for (const dateStr of sortedDates) {
      const checkDate = currentDate.toISOString().split("T")[0];
      if (dateStr === checkDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  // Check if a habit is completed for a specific date
  const isCompletedOnDate = (habit: Habit, dateISO: string): boolean => {
    return habit.completedDates.includes(dateISO);
  };

  // Toggle habit completion for a specific date
  const toggleHabitCompletion = (habitId: string, dateISO: string) => {
    const updatedHabits = habits.map((habit) => {
      if (habit.id !== habitId) return habit;

      const isCompleted = habit.completedDates.includes(dateISO);
      const completedDates = isCompleted
        ? habit.completedDates.filter((d) => d !== dateISO)
        : [...habit.completedDates, dateISO];

      return { ...habit, completedDates };
    });

    updateWidget(widget.id, {
      config: { ...widget.config, habits: updatedHabits },
    });
  };

  // Add new habit
  const addHabit = () => {
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: newHabitName.trim(),
      completedDates: [],
      createdAt: new Date().toISOString(),
    };

    updateWidget(widget.id, {
      config: { ...widget.config, habits: [...habits, newHabit] },
    });

    setNewHabitName("");
    setIsAddingHabit(false);
  };

  // Remove habit
  const removeHabit = (habitId: string) => {
    const updatedHabits = habits.filter((h) => h.id !== habitId);
    updateWidget(widget.id, {
      config: { ...widget.config, habits: updatedHabits },
    });
  };

  // Get day of week abbreviation
  const getDayAbbr = (dateISO: string): string => {
    const date = new Date(dateISO + "T12:00:00"); // Add time to avoid timezone issues
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return days[date.getDay()];
  };

  // Get day number
  const getDayNumber = (dateISO: string): string => {
    const date = new Date(dateISO + "T12:00:00");
    return date.getDate().toString();
  };

  const last7Days = getLast7Days();
  const todayISO = getTodayISO();

  return (
    <div className="@container h-full w-full flex flex-col">
      <div className="flex-1 overflow-y-auto p-3 @sm:p-4 space-y-3 @sm:space-y-4">
        {/* Week Header */}
        <div className="grid grid-cols-8 gap-1 @sm:gap-2 mb-2">
          <div className="text-[10px] @sm:text-xs font-medium text-muted-foreground"></div>
          {last7Days.map((day) => (
            <div key={day} className="text-center">
              <div className="text-[9px] @sm:text-[10px] font-medium text-muted-foreground uppercase">
                {getDayAbbr(day)}
              </div>
              <div className="text-[10px] @sm:text-xs text-muted-foreground">
                {getDayNumber(day)}
              </div>
            </div>
          ))}
        </div>

        {/* Habits List */}
        {habits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 @sm:py-8 text-center">
            <div className="w-10 h-10 @sm:w-12 @sm:h-12 rounded-full bg-muted flex items-center justify-center mb-2 @sm:mb-3">
              <Check className="w-5 h-5 @sm:w-6 @sm:h-6 text-muted-foreground" />
            </div>
            <p className="text-xs @sm:text-sm text-muted-foreground">
              No habits yet. Add one to start tracking!
            </p>
          </div>
        ) : (
          <div className="space-y-2 @sm:space-y-3">
            {habits.map((habit) => {
              const streak = calculateStreak(habit);
              return (
                <div
                  key={habit.id}
                  className="group bg-card border border-border rounded-lg p-2 @sm:p-3 transition-all hover:border-primary/50"
                >
                  <div className="grid grid-cols-8 gap-1 @sm:gap-2 items-center">
                    {/* Habit Name and Streak */}
                    <div className="flex flex-col justify-center min-w-0">
                      <div className="text-xs @sm:text-sm font-medium text-foreground truncate">
                        {habit.name}
                      </div>
                      {streak > 0 && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span className="text-[10px] @sm:text-xs font-semibold text-amber-600 dark:text-amber-500">
                            {streak}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Weekly Grid */}
                    {last7Days.map((day) => {
                      const isCompleted = isCompletedOnDate(habit, day);
                      const isToday = day === todayISO;

                      return (
                        <button
                          key={day}
                          onClick={() => toggleHabitCompletion(habit.id, day)}
                          className={`
                            aspect-square rounded flex items-center justify-center transition-all
                            ${isCompleted
                              ? "bg-emerald-500 dark:bg-emerald-600 hover:bg-emerald-600 dark:hover:bg-emerald-700"
                              : "bg-muted hover:bg-muted/70"
                            }
                            ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}
                          `}
                          title={`${getDayAbbr(day)} ${getDayNumber(day)}`}
                        >
                          {isCompleted ? (
                            <Check className="w-3 h-3 @sm:w-4 @sm:h-4 text-white" />
                          ) : (
                            <X className="w-2 h-2 @sm:w-3 @sm:h-3 text-muted-foreground/30" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => removeHabit(habit.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 p-1 rounded hover:bg-destructive/10"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3 h-3 @sm:w-4 @sm:h-4 text-destructive" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Habit Section */}
        {isAddingHabit ? (
          <div className="flex gap-2 mt-3 @sm:mt-4">
            <Input
              type="text"
              placeholder="Habit name..."
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addHabit();
                if (e.key === "Escape") {
                  setIsAddingHabit(false);
                  setNewHabitName("");
                }
              }}
              className="flex-1 h-8 @sm:h-9 text-xs @sm:text-sm"
              autoFocus
            />
            <Button
              size="sm"
              onClick={addHabit}
              className="h-8 @sm:h-9 px-2 @sm:px-3"
            >
              <Check className="w-3 h-3 @sm:w-4 @sm:h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setIsAddingHabit(false);
                setNewHabitName("");
              }}
              className="h-8 @sm:h-9 px-2 @sm:px-3"
            >
              <X className="w-3 h-3 @sm:w-4 @sm:h-4" />
            </Button>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddingHabit(true)}
            className="w-full h-8 @sm:h-9 text-xs @sm:text-sm"
          >
            <Plus className="w-3 h-3 @sm:w-4 @sm:h-4 mr-1 @sm:mr-2" />
            Add Habit
          </Button>
        )}
      </div>
    </div>
  );
}
