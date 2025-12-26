"use client";

import { useMemo, useCallback } from "react";
import { Target, Flame, Clock, TrendingUp, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface FocusScoreWidgetProps {
  widget: Widget;
}

interface FocusSession {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  duration: number; // in minutes
  type: 'pomodoro' | 'deep-work';
}

interface FocusScoreConfig {
  focusSessions?: FocusSession[];
  dailyGoalMinutes?: number;
}

export function FocusScoreWidget({ widget }: FocusScoreWidgetProps) {
  const config: FocusScoreConfig = widget.config || {};
  const focusSessions: FocusSession[] = config.focusSessions || [];
  const dailyGoalMinutes = config.dailyGoalMinutes || 120; // Default 2 hours

  const getTodayISO = (): string => {
    return new Date().toISOString().split("T")[0];
  };

  const getWeekStart = (): string => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split("T")[0];
  };

  const stats = useMemo(() => {
    const today = getTodayISO();
    const weekStart = getWeekStart();

    // Today's sessions
    const todaySessions = focusSessions.filter((s) => s.date === today);
    const todayMinutes = todaySessions.reduce((sum, s) => sum + s.duration, 0);
    const todaySessionCount = todaySessions.length;

    // Weekly sessions
    const weekSessions = focusSessions.filter((s) => s.date >= weekStart);
    const weekMinutes = weekSessions.reduce((sum, s) => sum + s.duration, 0);

    // Calculate streak (consecutive days with at least one session)
    let streak = 0;
    const currentDate = new Date();
    while (true) {
      const dateISO = currentDate.toISOString().split("T")[0];
      const hasSessions = focusSessions.some((s) => s.date === dateISO);
      if (hasSessions) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Focus score (0-100 based on goal completion)
    const score = Math.min(100, Math.round((todayMinutes / dailyGoalMinutes) * 100));

    return {
      todayMinutes,
      todaySessionCount,
      weekMinutes,
      streak,
      score,
    };
  }, [focusSessions, dailyGoalMinutes]);

  const addSession = useCallback(
    (duration: number) => {
      const newSession: FocusSession = {
        id: crypto.randomUUID(),
        date: getTodayISO(),
        duration,
        type: 'pomodoro',
      };

      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          focusSessions: [...focusSessions, newSession],
        },
      });
    },
    [widget.id, widget.config, focusSessions]
  );

  const resetToday = useCallback(() => {
    const today = getTodayISO();
    const filteredSessions = focusSessions.filter((s) => s.date !== today);
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        focusSessions: filteredSessions,
      },
    });
  }, [widget.id, widget.config, focusSessions]);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Score color based on performance
  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-500";
    if (score >= 50) return "text-yellow-500";
    if (score >= 25) return "text-orange-500";
    return "text-red-500";
  };

  const _getScoreGradient = (score: number): string => {
    if (score >= 80) return "from-green-500 to-emerald-500";
    if (score >= 50) return "from-yellow-500 to-amber-500";
    if (score >= 25) return "from-orange-500 to-amber-500";
    return "from-red-500 to-orange-500";
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 @sm:mb-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 @sm:w-5 @sm:h-5 text-primary" />
            <span className="text-sm @sm:text-base font-medium">Puntuacion de Enfoque</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={resetToday}
            title="Reiniciar hoy"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Score Gauge */}
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="relative w-28 h-28 @sm:w-36 @sm:h-36 @md:w-44 @md:h-44">
            {/* Background circle */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-muted/20"
              />
              {/* Progress circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                stroke="url(#scoreGradient)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                animate={{
                  strokeDashoffset: 2 * Math.PI * 42 * (1 - stats.score / 100),
                }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" className={cn("stop-color-current", getScoreColor(stats.score))} />
                  <stop offset="100%" className={cn("stop-color-current", getScoreColor(stats.score))} />
                </linearGradient>
              </defs>
            </svg>

            {/* Score text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                key={stats.score}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "text-3xl @sm:text-4xl @md:text-5xl font-bold tabular-nums",
                  getScoreColor(stats.score)
                )}
              >
                {stats.score}
              </motion.span>
              <span className="text-xs @sm:text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>

          {/* Today's time */}
          <div className="mt-3 @sm:mt-4 text-center">
            <p className="text-lg @sm:text-xl @md:text-2xl font-semibold">
              {formatTime(stats.todayMinutes)}
            </p>
            <p className="text-xs @sm:text-sm text-muted-foreground">
              de {formatTime(dailyGoalMinutes)} hoy
            </p>
          </div>
        </div>

        {/* Quick add buttons */}
        <div className="flex gap-2 mb-3 @sm:mb-4">
          {[15, 25, 45].map((duration) => (
            <Button
              key={duration}
              variant="outline"
              size="sm"
              className="flex-1 text-xs @sm:text-sm h-8 @sm:h-9"
              onClick={() => addSession(duration)}
            >
              +{duration}m
            </Button>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 @sm:gap-3">
          <div className="flex flex-col items-center p-2 @sm:p-3 rounded-lg bg-muted/30">
            <Clock className="w-3.5 h-3.5 @sm:w-4 @sm:h-4 text-blue-500 mb-1" />
            <span className="text-xs @sm:text-sm font-semibold">{stats.todaySessionCount}</span>
            <span className="text-[10px] @sm:text-xs text-muted-foreground">Sesiones</span>
          </div>
          <div className="flex flex-col items-center p-2 @sm:p-3 rounded-lg bg-muted/30">
            <TrendingUp className="w-3.5 h-3.5 @sm:w-4 @sm:h-4 text-green-500 mb-1" />
            <span className="text-xs @sm:text-sm font-semibold">{formatTime(stats.weekMinutes)}</span>
            <span className="text-[10px] @sm:text-xs text-muted-foreground">Semana</span>
          </div>
          <div className="flex flex-col items-center p-2 @sm:p-3 rounded-lg bg-muted/30">
            <Flame className="w-3.5 h-3.5 @sm:w-4 @sm:h-4 text-amber-500 mb-1" />
            <span className="text-xs @sm:text-sm font-semibold">{stats.streak}</span>
            <span className="text-[10px] @sm:text-xs text-muted-foreground">Racha</span>
          </div>
        </div>
      </div>
    </div>
  );
}
