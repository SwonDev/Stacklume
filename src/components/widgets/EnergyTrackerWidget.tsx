"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  Zap,
  ChevronLeft,
  ChevronRight,
  Sun,
  Sunrise,
  Sunset,
  Moon,
} from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface EnergyTrackerWidgetProps {
  widget: Widget;
}

type TimeSlot = "morning" | "late-morning" | "afternoon" | "evening";

interface EnergyLog {
  id: string;
  date: string; // ISO date string
  timeSlot: TimeSlot;
  level: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

interface EnergyTrackerConfig {
  energyLogs?: EnergyLog[];
}

const TIME_SLOTS: { key: TimeSlot; label: string; icon: React.ComponentType<{ className?: string }>; time: string }[] = [
  { key: "morning", label: "Manana", icon: Sunrise, time: "6-9" },
  { key: "late-morning", label: "Media Manana", icon: Sun, time: "9-12" },
  { key: "afternoon", label: "Tarde", icon: Sunset, time: "12-18" },
  { key: "evening", label: "Noche", icon: Moon, time: "18-22" },
];

const ENERGY_LEVELS: { level: 1 | 2 | 3 | 4 | 5; label: string; color: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { level: 1, label: "Muy bajo", color: "bg-red-500", icon: BatteryLow },
  { level: 2, label: "Bajo", color: "bg-orange-500", icon: BatteryLow },
  { level: 3, label: "Normal", color: "bg-yellow-500", icon: BatteryMedium },
  { level: 4, label: "Alto", color: "bg-green-500", icon: BatteryMedium },
  { level: 5, label: "Muy alto", color: "bg-emerald-500", icon: BatteryFull },
];

export function EnergyTrackerWidget({ widget }: EnergyTrackerWidgetProps) {
  const config: EnergyTrackerConfig = widget.config || {};
  const energyLogs: EnergyLog[] = config.energyLogs || [];

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  const saveLogs = useCallback(
    (updatedLogs: EnergyLog[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          energyLogs: updatedLogs,
        },
      });
    },
    [widget.id, widget.config]
  );

  const getTodayLogs = useMemo(() => {
    return energyLogs.filter((log) => log.date === selectedDate);
  }, [energyLogs, selectedDate]);

  const getLogForSlot = (slot: TimeSlot): EnergyLog | undefined => {
    return getTodayLogs.find((log) => log.timeSlot === slot);
  };

  const logEnergy = (slot: TimeSlot, level: 1 | 2 | 3 | 4 | 5) => {
    const existingLog = getLogForSlot(slot);

    if (existingLog) {
      // Update existing log
      saveLogs(
        energyLogs.map((log) => (log.id === existingLog.id ? { ...log, level } : log))
      );
    } else {
      // Create new log
      const newLog: EnergyLog = {
        id: crypto.randomUUID(),
        date: selectedDate,
        timeSlot: slot,
        level,
      };
      saveLogs([...energyLogs, newLog]);
    }
  };

  const removeLog = (slot: TimeSlot) => {
    const existingLog = getLogForSlot(slot);
    if (existingLog) {
      saveLogs(energyLogs.filter((log) => log.id !== existingLog.id));
    }
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

  // Weekly stats
  const weeklyStats = useMemo(() => {
    const weekStart = new Date(selectedDate);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1);
    weekStart.setDate(diff);

    const weekDays: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      weekDays.push(d.toISOString().split("T")[0]);
    }

    return weekDays.map((day) => {
      const dayLogs = energyLogs.filter((log) => log.date === day);
      const avgEnergy =
        dayLogs.length > 0
          ? Math.round(dayLogs.reduce((sum, log) => sum + log.level, 0) / dayLogs.length)
          : 0;
      return { date: day, avgEnergy, logs: dayLogs };
    });
  }, [selectedDate, energyLogs]);

  // Average energy for selected date
  const todayAverage = useMemo(() => {
    if (getTodayLogs.length === 0) return 0;
    return Math.round(getTodayLogs.reduce((sum, log) => sum + log.level, 0) / getTodayLogs.length);
  }, [getTodayLogs]);

  const getEnergyColor = (level: number): string => {
    if (level === 0) return "bg-muted";
    return ENERGY_LEVELS.find((e) => e.level === level)?.color || "bg-muted";
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Energia del Dia</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setViewMode("day")}
            >
              Dia
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => setViewMode("week")}
            >
              Semana
            </Button>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <span className="text-sm font-medium">{formatDateDisplay(selectedDate)}</span>
            {todayAverage > 0 && viewMode === "day" && (
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className="text-xs text-muted-foreground">Promedio:</span>
                <div className={cn("w-2 h-2 rounded-full", getEnergyColor(todayAverage))} />
                <span className="text-xs font-medium">{todayAverage}/5</span>
              </div>
            )}
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 -mx-1 px-1">
          {viewMode === "day" ? (
            /* Daily View */
            <div className="space-y-3">
              {TIME_SLOTS.map((slot) => {
                const Icon = slot.icon;
                const log = getLogForSlot(slot.key);

                return (
                  <motion.div
                    key={slot.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-2 @sm:p-3 rounded-lg border border-border bg-card"
                  >
                    {/* Slot Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs @sm:text-sm font-medium">{slot.label}</span>
                      </div>
                      <span className="text-[10px] @sm:text-xs text-muted-foreground">
                        {slot.time}h
                      </span>
                    </div>

                    {/* Energy Level Selector */}
                    <div className="flex items-center gap-1 @sm:gap-2">
                      {ENERGY_LEVELS.map(({ level, label, color }) => (
                        <button
                          key={level}
                          onClick={() => logEnergy(slot.key, level)}
                          className={cn(
                            "flex-1 h-8 @sm:h-10 rounded-md transition-all",
                            log?.level === level
                              ? cn(color, "ring-2 ring-primary ring-offset-2 ring-offset-background")
                              : "bg-muted/50 hover:bg-muted"
                          )}
                          title={label}
                        >
                          <span
                            className={cn(
                              "text-xs @sm:text-sm font-semibold",
                              log?.level === level ? "text-white" : "text-muted-foreground"
                            )}
                          >
                            {level}
                          </span>
                        </button>
                      ))}
                    </div>

                    {/* Current Level Display */}
                    {log && (
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
                        <span className="text-xs text-muted-foreground">
                          Nivel: {ENERGY_LEVELS.find((e) => e.level === log.level)?.label}
                        </span>
                        <button
                          onClick={() => removeLog(slot.key)}
                          className="text-xs text-destructive hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* Weekly View */
            <div className="space-y-3">
              {/* Week Grid */}
              <div className="grid grid-cols-7 gap-1">
                {["L", "M", "X", "J", "V", "S", "D"].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] text-muted-foreground font-medium py-1"
                  >
                    {day}
                  </div>
                ))}
                {weeklyStats.map((day) => {
                  const isSelected = day.date === selectedDate;
                  return (
                    <button
                      key={day.date}
                      onClick={() => {
                        setSelectedDate(day.date);
                        setViewMode("day");
                      }}
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center transition-all",
                        isSelected
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                          : "",
                        day.avgEnergy > 0 ? getEnergyColor(day.avgEnergy) : "bg-muted/50"
                      )}
                    >
                      <span
                        className={cn(
                          "text-xs font-semibold",
                          day.avgEnergy > 0 ? "text-white" : "text-muted-foreground"
                        )}
                      >
                        {new Date(day.date + "T12:00:00").getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-2 pt-2">
                {ENERGY_LEVELS.map(({ level, color }) => (
                  <div key={level} className="flex items-center gap-1">
                    <div className={cn("w-3 h-3 rounded", color)} />
                    <span className="text-[10px] text-muted-foreground">{level}</span>
                  </div>
                ))}
              </div>

              {/* Weekly Average */}
              <div className="p-3 rounded-lg bg-muted/30 text-center">
                <p className="text-xs text-muted-foreground mb-1">Promedio semanal</p>
                <div className="flex items-center justify-center gap-2">
                  {(() => {
                    const weekAvg = Math.round(
                      weeklyStats.filter((d) => d.avgEnergy > 0).reduce((sum, d) => sum + d.avgEnergy, 0) /
                        Math.max(1, weeklyStats.filter((d) => d.avgEnergy > 0).length)
                    );
                    const energyInfo = ENERGY_LEVELS.find((e) => e.level === weekAvg);
                    const EnergyIcon = energyInfo?.icon || Battery;
                    return (
                      <>
                        <EnergyIcon className={cn("w-5 h-5", weekAvg > 0 ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-lg font-bold">{weekAvg || "-"}</span>
                        <span className="text-xs text-muted-foreground">/ 5</span>
                      </>
                    );
                  })()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {weeklyStats.filter((d) => d.logs.length > 0).length} dias registrados
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
