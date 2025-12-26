"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Timer, Play, Pause, RotateCcw, Settings, Volume2, VolumeX, Coffee, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface PomodoroWidgetProps {
  widget: Widget;
}

type TimerMode = "work" | "break";

interface PomodoroConfig {
  workDuration: number; // in minutes
  breakDuration: number; // in minutes
  soundEnabled: boolean;
}

export function PomodoroWidget({ widget }: PomodoroWidgetProps) {
  const { updateWidget } = useWidgetStore();

  // Load config from widget
  const config: PomodoroConfig = {
    workDuration: widget.config?.workDuration ?? 25,
    breakDuration: widget.config?.breakDuration ?? 5,
    soundEnabled: widget.config?.soundEnabled ?? true,
  };

  // State
  const [mode, setMode] = useState<TimerMode>("work");
  const [timeLeft, setTimeLeft] = useState(config.workDuration * 60); // in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedSessions = localStorage.getItem(`pomodoro-sessions-${widget.id}`);
      const savedDate = localStorage.getItem(`pomodoro-date-${widget.id}`);
      const today = new Date().toDateString();

      if (savedSessions && savedDate === today) {
        setSessions(parseInt(savedSessions, 10));
      } else {
        // Reset sessions if it's a new day
        localStorage.setItem(`pomodoro-date-${widget.id}`, today);
        localStorage.setItem(`pomodoro-sessions-${widget.id}`, "0");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.id]);

  // Save sessions to localStorage when they change
  useEffect(() => {
    localStorage.setItem(`pomodoro-sessions-${widget.id}`, sessions.toString());
  }, [sessions, widget.id]);

  // Temp settings state for dialog
  const [tempWorkDuration, setTempWorkDuration] = useState(config.workDuration);
  const [tempBreakDuration, setTempBreakDuration] = useState(config.breakDuration);

  // Refs
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    // Create a simple beep sound using Web Audio API
    audioRef.current = new Audio();
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playNotification = useCallback(() => {
    if (!config.soundEnabled) return;

    // Create a simple beep using Web Audio API
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = "sine";

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  }, [config.soundEnabled]);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            setIsRunning(false);
            playNotification();

            if (mode === "work") {
              // Work session completed
              setSessions((s) => s + 1);
              setMode("break");
              return config.breakDuration * 60;
            } else {
              // Break session completed
              setMode("work");
              return config.workDuration * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft, mode, config.workDuration, config.breakDuration, playNotification]);

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const totalDuration = mode === "work" ? config.workDuration * 60 : config.breakDuration * 60;
  const progress = ((totalDuration - timeLeft) / totalDuration) * 100;

  // Controls
  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? config.workDuration * 60 : config.breakDuration * 60);
  };

  const handleModeSwitch = () => {
    setIsRunning(false);
    const newMode = mode === "work" ? "break" : "work";
    setMode(newMode);
    setTimeLeft(newMode === "work" ? config.workDuration * 60 : config.breakDuration * 60);
  };

  const toggleSound = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        soundEnabled: !config.soundEnabled,
      },
    });
  };

  const handleSaveSettings = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        workDuration: tempWorkDuration,
        breakDuration: tempBreakDuration,
      },
    });

    // Reset timer with new duration
    setIsRunning(false);
    setTimeLeft(mode === "work" ? tempWorkDuration * 60 : tempBreakDuration * 60);
    setIsSettingsOpen(false);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col items-center justify-center h-full px-3 py-3 @sm:px-4 @sm:py-4 @lg:px-6 @lg:py-6">
        {/* Header with mode indicator and settings */}
        <div className="w-full flex items-center justify-between mb-2 @md:mb-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div
              className={`w-2 h-2 @md:w-3 @md:h-3 rounded-full ${
                mode === "work" ? "bg-red-500" : "bg-green-500"
              } ${isRunning ? "animate-pulse" : ""}`}
            />
            <span className="text-xs @md:text-sm @lg:text-base font-medium capitalize text-muted-foreground">
              {mode === "work" ? "Trabajo" : "Descanso"}
            </span>
          </motion.div>

          <div className="flex items-center gap-1 @md:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              {config.soundEnabled ? (
                <Volume2 className="w-3 h-3 @md:w-4 @md:h-4" />
              ) : (
                <VolumeX className="w-3 h-3 @md:w-4 @md:h-4" />
              )}
            </Button>

            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 @md:h-8 @md:w-8">
                  <Settings className="w-3 h-3 @md:w-4 @md:h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configuración del Pomodoro</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="work-duration">Duración del trabajo (minutos)</Label>
                    <Input
                      id="work-duration"
                      type="number"
                      min="1"
                      max="60"
                      value={tempWorkDuration}
                      onChange={(e) => setTempWorkDuration(parseInt(e.target.value) || 25)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="break-duration">Duración del descanso (minutos)</Label>
                    <Input
                      id="break-duration"
                      type="number"
                      min="1"
                      max="30"
                      value={tempBreakDuration}
                      onChange={(e) => setTempBreakDuration(parseInt(e.target.value) || 5)}
                    />
                  </div>
                  <Button onClick={handleSaveSettings} className="w-full">
                    Guardar cambios
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main timer display */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative flex items-center justify-center mb-3 @md:mb-6"
        >
          {/* Circular progress ring */}
          <svg
            className="w-32 h-32 @sm:w-40 @sm:h-40 @md:w-48 @md:h-48 @lg:w-56 @lg:h-56 transform -rotate-90"
            viewBox="0 0 200 200"
          >
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="90"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/20"
            />
            {/* Progress circle */}
            <motion.circle
              cx="100"
              cy="100"
              r="90"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className={mode === "work" ? "text-primary" : "text-green-500"}
              strokeDasharray={`${2 * Math.PI * 90}`}
              initial={{ strokeDashoffset: 2 * Math.PI * 90 }}
              animate={{ strokeDashoffset: 2 * Math.PI * 90 * (1 - progress / 100) }}
              transition={{ duration: 0.5 }}
            />
          </svg>

          {/* Time display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <motion.div
                key={timeLeft}
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl font-bold tabular-nums"
              >
                {formatTime(timeLeft)}
              </motion.div>
              <div className="hidden @md:block mt-1 text-xs @lg:text-sm text-muted-foreground">
                {Math.floor((progress / 100) * totalDuration / 60)} / {Math.floor(totalDuration / 60)} min
              </div>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2 @md:gap-3 mb-3 @md:mb-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handleReset}
            className="h-9 w-9 @md:h-10 @md:w-10 @lg:h-12 @lg:w-12"
          >
            <RotateCcw className="w-4 h-4 @lg:w-5 @lg:h-5" />
          </Button>

          <Button
            onClick={handlePlayPause}
            size="lg"
            className="h-12 w-12 @md:h-14 @md:w-14 @lg:h-16 @lg:w-16 rounded-full"
          >
            {isRunning ? (
              <Pause className="w-5 h-5 @md:w-6 @md:h-6 @lg:w-7 @lg:h-7" />
            ) : (
              <Play className="w-5 h-5 @md:w-6 @md:h-6 @lg:w-7 @lg:h-7 ml-1" />
            )}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleModeSwitch}
            className="h-9 w-9 @md:h-10 @md:w-10 @lg:h-12 @lg:w-12"
          >
            {mode === "work" ? (
              <Coffee className="w-4 h-4 @lg:w-5 @lg:h-5" />
            ) : (
              <Zap className="w-4 h-4 @lg:w-5 @lg:h-5" />
            )}
          </Button>
        </div>

        {/* Sessions counter */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-2 px-3 py-1.5 @md:px-4 @md:py-2 rounded-full bg-muted/30"
        >
          <Timer className="w-3 h-3 @md:w-4 @md:h-4 text-muted-foreground" />
          <span className="text-xs @md:text-sm font-medium">
            {sessions} {sessions === 1 ? "sesión" : "sesiones"}
          </span>
        </motion.div>

        {/* Status message - visible on larger containers */}
        <AnimatePresence mode="wait">
          {!isRunning && timeLeft === totalDuration && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="hidden @lg:block mt-4 text-xs @lg:text-sm text-muted-foreground text-center"
            >
              Presiona play para comenzar tu sesión de {mode === "work" ? "trabajo" : "descanso"}
            </motion.p>
          )}
          {!isRunning && timeLeft !== totalDuration && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="hidden @lg:block mt-4 text-xs @lg:text-sm text-muted-foreground text-center"
            >
              En pausa
            </motion.p>
          )}
          {isRunning && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="hidden @lg:block mt-4 text-xs @lg:text-sm text-primary text-center font-medium"
            >
              {mode === "work" ? "¡Mantén el enfoque!" : "¡Disfruta tu descanso!"}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
