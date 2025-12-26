"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Wind, Play, Pause, RotateCcw, Settings } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface BreathingExerciseWidgetProps {
  widget: Widget;
}

type BreathingPreset = "4-7-8" | "box" | "calm";

interface BreathingPattern {
  name: string;
  description: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
}

const BREATHING_PRESETS: Record<BreathingPreset, BreathingPattern> = {
  "4-7-8": {
    name: "4-7-8",
    description: "Relajacion profunda",
    inhale: 4,
    hold1: 7,
    exhale: 8,
    hold2: 0,
  },
  box: {
    name: "Respiracion cuadrada",
    description: "Balance y calma",
    inhale: 4,
    hold1: 4,
    exhale: 4,
    hold2: 4,
  },
  calm: {
    name: "Calma",
    description: "Respiracion suave",
    inhale: 4,
    hold1: 2,
    exhale: 6,
    hold2: 0,
  },
};

type Phase = "inhale" | "hold1" | "exhale" | "hold2" | "idle";

const PHASE_LABELS: Record<Phase, string> = {
  inhale: "Inhala",
  hold1: "Manten",
  exhale: "Exhala",
  hold2: "Manten",
  idle: "Listo",
};

export function BreathingExerciseWidget({ widget }: BreathingExerciseWidgetProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<Phase>("idle");
  const [phaseTime, setPhaseTime] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [selectedPreset, setSelectedPreset] = useState<BreathingPreset>(
    (widget.config?.breathingPreset as BreathingPreset) || "4-7-8"
  );

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pattern = BREATHING_PRESETS[selectedPreset];

  const savePreset = useCallback(
    (preset: BreathingPreset) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          breathingPreset: preset,
        },
      });
    },
    [widget.id, widget.config]
  );

  const getNextPhase = (current: Phase): Phase => {
    const phases: Phase[] = ["inhale", "hold1", "exhale", "hold2"];
    const currentIndex = phases.indexOf(current);

    // Skip hold phases with 0 duration
    let nextIndex = (currentIndex + 1) % phases.length;
    let nextPhase = phases[nextIndex];

    // Check if we should skip hold1 or hold2
    if (nextPhase === "hold1" && pattern.hold1 === 0) {
      nextIndex = (nextIndex + 1) % phases.length;
      nextPhase = phases[nextIndex];
    }
    if (nextPhase === "hold2" && pattern.hold2 === 0) {
      nextIndex = (nextIndex + 1) % phases.length;
      nextPhase = phases[nextIndex];
    }

    return nextPhase;
  };

  const getPhaseDuration = (phase: Phase): number => {
    switch (phase) {
      case "inhale":
        return pattern.inhale;
      case "hold1":
        return pattern.hold1;
      case "exhale":
        return pattern.exhale;
      case "hold2":
        return pattern.hold2;
      default:
        return 0;
    }
  };

  useEffect(() => {
    if (isRunning) {
      const frame = requestAnimationFrame(() => {
        if (currentPhase === "idle") {
          setCurrentPhase("inhale");
          setPhaseTime(pattern.inhale);
        }
      });

      intervalRef.current = setInterval(() => {
        setPhaseTime((prev) => {
          if (prev <= 1) {
            // Move to next phase
            setCurrentPhase((currentPhase) => {
              const nextPhase = getNextPhase(currentPhase);
              if (nextPhase === "inhale") {
                setCycleCount((c) => c + 1);
              }
              setPhaseTime(getPhaseDuration(nextPhase));
              return nextPhase;
            });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        cancelAnimationFrame(frame);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, pattern]);

  const handleStartStop = () => {
    if (!isRunning && currentPhase === "idle") {
      setCurrentPhase("inhale");
      setPhaseTime(pattern.inhale);
    }
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentPhase("idle");
    setPhaseTime(0);
    setCycleCount(0);
  };

  const handlePresetChange = (preset: BreathingPreset) => {
    setSelectedPreset(preset);
    savePreset(preset);
    handleReset();
  };

  // Calculate circle scale based on phase
  const getCircleScale = (): number => {
    if (currentPhase === "idle") return 0.6;
    if (currentPhase === "inhale") return 0.6 + (0.4 * (pattern.inhale - phaseTime)) / pattern.inhale;
    if (currentPhase === "hold1") return 1;
    if (currentPhase === "exhale") return 1 - (0.4 * (pattern.exhale - phaseTime)) / pattern.exhale;
    if (currentPhase === "hold2") return 0.6;
    return 0.6;
  };

  const circleScale = getCircleScale();

  // Get phase color
  const getPhaseColor = (): string => {
    switch (currentPhase) {
      case "inhale":
        return "from-blue-400 to-cyan-400";
      case "hold1":
      case "hold2":
        return "from-purple-400 to-pink-400";
      case "exhale":
        return "from-teal-400 to-green-400";
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wind className="w-4 h-4 text-cyan-500" />
            <span className="text-sm font-medium">Respiracion</span>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56">
              <div className="space-y-3">
                <Label className="text-xs">Tipo de ejercicio</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={(v) => handlePresetChange(v as BreathingPreset)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(BREATHING_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex flex-col">
                          <span>{preset.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {preset.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="pt-2 text-xs text-muted-foreground">
                  <p>
                    Inhala: {pattern.inhale}s
                    {pattern.hold1 > 0 && ` | Manten: ${pattern.hold1}s`}
                  </p>
                  <p>
                    Exhala: {pattern.exhale}s
                    {pattern.hold2 > 0 && ` | Manten: ${pattern.hold2}s`}
                  </p>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col items-center justify-center">
          {/* Breathing circle */}
          <div className="relative w-32 h-32 @sm:w-40 @sm:h-40 @md:w-48 @md:h-48 mb-4">
            {/* Outer glow ring */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br opacity-20 blur-xl",
                getPhaseColor()
              )}
              animate={{ scale: circleScale * 1.2 }}
              transition={{ duration: 0.5 }}
            />

            {/* Main breathing circle */}
            <motion.div
              className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br",
                getPhaseColor()
              )}
              animate={{ scale: circleScale }}
              transition={{
                duration: currentPhase === "idle" ? 0.3 : 1,
                ease: "easeInOut",
              }}
            />

            {/* Inner circle with content */}
            <motion.div
              className="absolute inset-4 @sm:inset-5 @md:inset-6 rounded-full bg-background/90 backdrop-blur flex flex-col items-center justify-center"
              animate={{ scale: circleScale }}
              transition={{
                duration: currentPhase === "idle" ? 0.3 : 1,
                ease: "easeInOut",
              }}
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhase}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-center"
                >
                  <p className="text-sm @sm:text-base @md:text-lg font-medium">
                    {PHASE_LABELS[currentPhase]}
                  </p>
                  {currentPhase !== "idle" && (
                    <p className="text-2xl @sm:text-3xl @md:text-4xl font-bold tabular-nums">
                      {phaseTime}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Particle effects during breathing */}
            <AnimatePresence>
              {isRunning && currentPhase === "inhale" && (
                <>
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={`particle-${i}`}
                      className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400"
                      initial={{
                        x: 0,
                        y: 0,
                        opacity: 0,
                        scale: 0,
                      }}
                      animate={{
                        x: [0, (Math.cos((i * Math.PI) / 2) * 60)],
                        y: [0, (Math.sin((i * Math.PI) / 2) * 60)],
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.5,
                      }}
                      style={{
                        left: "50%",
                        top: "50%",
                        marginLeft: "-3px",
                        marginTop: "-3px",
                      }}
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>

          {/* Pattern name */}
          <p className="text-xs text-muted-foreground mb-4">
            {pattern.name}
          </p>

          {/* Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={handleReset}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>

            <Button
              size="lg"
              className="h-14 w-14 rounded-full"
              onClick={handleStartStop}
            >
              {isRunning ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-0.5" />
              )}
            </Button>

            <div className="h-10 w-10 flex items-center justify-center">
              {cycleCount > 0 && (
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-sm font-medium text-muted-foreground"
                >
                  x{cycleCount}
                </motion.span>
              )}
            </div>
          </div>

          {/* Phase indicators */}
          <div className="flex items-center gap-2 mt-4">
            {(["inhale", "hold1", "exhale", "hold2"] as Phase[])
              .filter((p) => getPhaseDuration(p) > 0)
              .map((phase) => (
                <div
                  key={phase}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    currentPhase === phase
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-muted"
                  )}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
