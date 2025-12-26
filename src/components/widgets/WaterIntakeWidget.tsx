"use client";

import { useState, useCallback } from "react";
import { Droplets, Plus, Minus, Settings, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface WaterIntakeWidgetProps {
  widget: Widget;
}

interface WaterIntakeData {
  current: number;
  goal: number;
  date: string;
  history?: Array<{ date: string; amount: number }>;
}

// Get today's date in ISO format (stable per day)
function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

// Helper to compute initial values from widget config
function getInitialWaterData(widgetConfig: unknown): { goal: number; current: number } {
  const data = (widgetConfig as { waterIntake?: WaterIntakeData })?.waterIntake;
  const today = getTodayISO();

  if (data) {
    const goal = data.goal || 8;
    const current = data.date === today ? (data.current || 0) : 0;
    return { goal, current };
  }
  return { goal: 8, current: 0 };
}

export function WaterIntakeWidget({ widget }: WaterIntakeWidgetProps) {
  // Use lazy state initializers to avoid effects for initialization
  const [currentGlasses, setCurrentGlasses] = useState(() =>
    getInitialWaterData(widget.config).current
  );
  const [goalGlasses, setGoalGlasses] = useState(() =>
    getInitialWaterData(widget.config).goal
  );
  const [tempGoal, setTempGoal] = useState(() =>
    getInitialWaterData(widget.config).goal
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const saveWaterData = useCallback(
    (current: number, goal?: number) => {
      const existingData = widget.config?.waterIntake as WaterIntakeData | undefined;
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          waterIntake: {
            current,
            goal: goal ?? goalGlasses,
            date: getTodayISO(),
            history: existingData?.history,
          },
        },
      });
    },
    [widget.id, widget.config, goalGlasses]
  );

  const addGlass = () => {
    const newCount = Math.min(currentGlasses + 1, 20);
    setCurrentGlasses(newCount);
    saveWaterData(newCount);
  };

  const removeGlass = () => {
    const newCount = Math.max(currentGlasses - 1, 0);
    setCurrentGlasses(newCount);
    saveWaterData(newCount);
  };

  const resetToday = () => {
    setCurrentGlasses(0);
    saveWaterData(0);
  };

  const saveGoal = () => {
    setGoalGlasses(tempGoal);
    saveWaterData(currentGlasses, tempGoal);
    setIsSettingsOpen(false);
  };

  const progress = Math.min((currentGlasses / goalGlasses) * 100, 100);
  const isGoalReached = currentGlasses >= goalGlasses;

  // Calculate water level for visual
  const waterLevel = Math.min(progress, 100);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium">Agua</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={resetToday}
              title="Reiniciar"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            <Popover open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="goal" className="text-xs">
                      Meta diaria (vasos)
                    </Label>
                    <Input
                      id="goal"
                      type="number"
                      min={1}
                      max={20}
                      value={tempGoal}
                      onChange={(e) =>
                        setTempGoal(Math.max(1, parseInt(e.target.value) || 8))
                      }
                      className="h-8"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={saveGoal}>
                    Guardar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Water Glass Visual */}
          <div className="relative w-24 h-32 @sm:w-28 @sm:h-36 @md:w-32 @md:h-40 mb-4">
            {/* Glass container */}
            <div className="absolute inset-0 border-2 border-blue-200 dark:border-blue-800 rounded-b-3xl rounded-t-lg overflow-hidden bg-blue-50/30 dark:bg-blue-950/30">
              {/* Water fill */}
              <motion.div
                className={cn(
                  "absolute bottom-0 left-0 right-0 rounded-b-3xl",
                  isGoalReached
                    ? "bg-gradient-to-t from-green-500 to-green-400"
                    : "bg-gradient-to-t from-blue-500 to-blue-400"
                )}
                initial={{ height: 0 }}
                animate={{ height: `${waterLevel}%` }}
                transition={{ type: "spring", stiffness: 100, damping: 15 }}
              />

              {/* Bubbles effect */}
              <AnimatePresence>
                {currentGlasses > 0 && (
                  <>
                    {[...Array(Math.min(currentGlasses, 5))].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute w-2 h-2 rounded-full bg-white/40"
                        initial={{ y: 0, opacity: 0 }}
                        animate={{
                          y: [-10, -30 - i * 10],
                          opacity: [0, 1, 0],
                          x: [0, (i % 2 === 0 ? 5 : -5)],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          delay: i * 0.3,
                          ease: "easeOut",
                        }}
                        style={{
                          left: `${20 + i * 15}%`,
                          bottom: `${Math.min(waterLevel * 0.8, 60)}%`,
                        }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Glass shine effect */}
            <div className="absolute top-2 left-2 w-3 h-8 bg-white/20 rounded-full transform rotate-12" />
          </div>

          {/* Counter display */}
          <div className="text-center mb-4">
            <motion.div
              key={currentGlasses}
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              className="flex items-baseline justify-center gap-1"
            >
              <span
                className={cn(
                  "text-3xl @sm:text-4xl font-bold tabular-nums",
                  isGoalReached ? "text-green-500" : "text-blue-500"
                )}
              >
                {currentGlasses}
              </span>
              <span className="text-sm text-muted-foreground">
                / {goalGlasses}
              </span>
            </motion.div>
            <p className="text-xs text-muted-foreground mt-1">vasos de agua</p>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-[180px] h-2 bg-muted rounded-full overflow-hidden mb-4">
            <motion.div
              className={cn(
                "h-full rounded-full",
                isGoalReached ? "bg-green-500" : "bg-blue-500"
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 100 }}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={removeGlass}
              disabled={currentGlasses <= 0}
            >
              <Minus className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              className={cn(
                "h-12 w-12 rounded-full",
                isGoalReached
                  ? "bg-green-500 hover:bg-green-600"
                  : "bg-blue-500 hover:bg-blue-600"
              )}
              onClick={addGlass}
              disabled={currentGlasses >= 20}
            >
              <Plus className="w-5 h-5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full invisible"
            >
              <Minus className="w-4 h-4" />
            </Button>
          </div>

          {/* Status message */}
          <AnimatePresence mode="wait">
            {isGoalReached ? (
              <motion.p
                key="goal-reached"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-green-600 dark:text-green-400 mt-3 text-center font-medium"
              >
                Meta alcanzada!
              </motion.p>
            ) : (
              <motion.p
                key="remaining"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground mt-3 text-center"
              >
                Faltan {goalGlasses - currentGlasses} vasos
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
