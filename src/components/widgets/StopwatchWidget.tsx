"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Widget, StopwatchLap } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, Flag, X } from "lucide-react";

interface StopwatchWidgetProps {
  widget: Widget;
}

export function StopwatchWidget({ widget }: StopwatchWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Load saved laps from widget config
  const savedLaps = (widget.config?.laps as StopwatchLap[] | undefined) ?? [];
  const savedTime = (widget.config?.savedTime as number | undefined) ?? 0;

  // State
  const [time, setTime] = useState(savedTime);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<StopwatchLap[]>(savedLaps);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const elapsedBeforeStartRef = useRef<number>(savedTime);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsedBeforeStartRef.current;

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        setTime(elapsed);
      }, 10); // Update every 10ms for smoother animation
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      elapsedBeforeStartRef.current = time;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, time]);

  // Format time in MM:SS.ms
  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${ms.toString().padStart(2, "0")}`;
  };

  // Split time into parts for animated display
  const getTimeParts = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);

    return {
      minutes: minutes.toString().padStart(2, "0"),
      seconds: seconds.toString().padStart(2, "0"),
      ms: ms.toString().padStart(2, "0"),
    };
  };

  // Controls
  const handlePlayPause = useCallback(() => {
    setIsRunning((prev) => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTime(0);
    setLaps([]);
    elapsedBeforeStartRef.current = 0;

    // Save to widget config
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        savedTime: 0,
        laps: [],
      },
    });
  }, [widget.id, widget.config]);

  const handleLap = useCallback(() => {
    if (!isRunning) return;

    const lapTime = time;
    const previousLapTime = laps.length > 0 ? laps[laps.length - 1].time : 0;
    const delta = lapTime - previousLapTime;

    const newLap: StopwatchLap = {
      id: `lap-${Date.now()}`,
      time: lapTime,
      delta: delta,
    };

    const newLaps = [...laps, newLap];
    setLaps(newLaps);

    // Save to widget config
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        laps: newLaps,
      },
    });
  }, [isRunning, time, laps, widget.id, widget.config]);

  const handleRemoveLap = useCallback((lapId: string) => {
    const newLaps = laps.filter((lap) => lap.id !== lapId);
    setLaps(newLaps);

    // Save to widget config
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        laps: newLaps,
      },
    });
  }, [laps, widget.id, widget.config]);

  // Save time when stopping
  useEffect(() => {
    if (!isRunning && time > 0) {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          savedTime: time,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, widget.id]); // Only run when isRunning changes

  const timeParts = getTimeParts(time);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full px-3 py-3 @sm:px-4 @sm:py-4 @lg:px-6 @lg:py-6">
        {/* Main time display */}
        <div className="flex-1 flex items-center justify-center mb-3 @md:mb-4">
          <div className="flex items-baseline gap-0.5 @sm:gap-1">
            {/* Minutes */}
            <motion.div
              key={`min-${timeParts.minutes}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-4xl @sm:text-5xl @md:text-6xl @lg:text-7xl font-bold font-mono tabular-nums"
            >
              {timeParts.minutes}
            </motion.div>
            <span className="text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl font-bold text-muted-foreground">
              :
            </span>
            {/* Seconds */}
            <motion.div
              key={`sec-${timeParts.seconds}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="text-4xl @sm:text-5xl @md:text-6xl @lg:text-7xl font-bold font-mono tabular-nums"
            >
              {timeParts.seconds}
            </motion.div>
            <span className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl font-bold text-muted-foreground">
              .
            </span>
            {/* Milliseconds */}
            <motion.div
              key={`ms-${timeParts.ms}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl font-bold font-mono tabular-nums text-muted-foreground"
            >
              {timeParts.ms}
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 @md:gap-3 mb-3 @md:mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            disabled={time === 0 && laps.length === 0}
            className="h-9 w-9 @md:h-10 @md:w-10"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>

          <Button
            onClick={handlePlayPause}
            size="lg"
            className="h-12 w-12 @md:h-14 @md:w-14 rounded-full"
          >
            {isRunning ? (
              <Pause className="w-5 h-5 @md:w-6 @md:h-6" />
            ) : (
              <Play className="w-5 h-5 @md:w-6 @md:h-6 ml-1" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleLap}
            disabled={!isRunning}
            className="h-9 w-9 @md:h-10 @md:w-10"
          >
            <Flag className="w-4 h-4" />
          </Button>
        </div>

        {/* Laps list */}
        {laps.length > 0 && (
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs @md:text-sm font-medium text-muted-foreground">
                Vueltas ({laps.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Limpiar
              </Button>
            </div>
            <ScrollArea className="h-[calc(100%-2rem)] rounded-md border border-border/40 bg-muted/20">
              <div className="p-2 space-y-1">
                <AnimatePresence initial={false}>
                  {[...laps].reverse().map((lap, index) => {
                    const lapNumber = laps.length - index;
                    return (
                      <motion.div
                        key={lap.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-background/50 hover:bg-background/80 transition-colors group"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground shrink-0">
                            #{lapNumber}
                          </span>
                          <span className="text-sm font-mono tabular-nums">
                            {formatTime(lap.time)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs font-mono tabular-nums shrink-0 ${
                              lapNumber === 1 ? "text-muted-foreground" : "text-primary"
                            }`}
                          >
                            +{formatTime(lap.delta)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveLap(lap.id)}
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state when no laps */}
        {laps.length === 0 && !isRunning && time === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center"
          >
            <p className="text-xs @md:text-sm text-muted-foreground text-center">
              Presiona play para iniciar el cronómetro
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
