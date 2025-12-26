"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Edit2, Check, PartyPopper, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface CountdownWidgetProps {
  widget: Widget;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function CountdownWidget({ widget }: CountdownWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [isEditing, setIsEditing] = useState(false);
  const [eventName, setEventName] = useState(
    widget.config?.eventName || "My Event"
  );
  const [targetDate, setTargetDate] = useState(
    widget.config?.targetDate || ""
  );
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [showCelebration, setShowCelebration] = useState(false);

  // Calculate time remaining
  const timeRemaining = useMemo((): TimeRemaining => {
    if (!targetDate) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const target = new Date(targetDate).getTime();
    const total = Math.max(0, target - currentTime);

    if (total === 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds, total };
  }, [targetDate, currentTime]);

  // Real-time countdown ticker
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Trigger celebration when countdown completes
  useEffect(() => {
    if (timeRemaining.total === 0 && targetDate && !showCelebration) {
      const frame = requestAnimationFrame(() => {
        setShowCelebration(true);
      });
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => {
        cancelAnimationFrame(frame);
        clearTimeout(timer);
      };
    }
  }, [timeRemaining.total, targetDate, showCelebration]);

  const handleSave = () => {
    if (targetDate && eventName.trim()) {
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          targetDate,
          eventName: eventName.trim(),
        },
      });
      setIsEditing(false);
      setShowCelebration(false);
    }
  };

  const handleCancel = () => {
    setEventName(widget.config?.eventName || "My Event");
    setTargetDate(widget.config?.targetDate || "");
    setIsEditing(false);
  };

  // Format date for display
  const formattedTargetDate = useMemo(() => {
    if (!targetDate) return "";
    try {
      return new Date(targetDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [targetDate]);

  // Get minimum datetime for input (now)
  const minDateTime = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  }, []);

  if (isEditing) {
    return (
      <div className="h-full flex flex-col gap-4 p-6 bg-card/50 backdrop-blur rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Configure Countdown
          </h3>
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Event Name</label>
            <Input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Enter event name"
              className="bg-background/50"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Target Date & Time</label>
            <Input
              type="datetime-local"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={minDateTime}
              className="bg-background/50"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!targetDate || !eventName.trim()}
            className="flex-1"
            size="sm"
          >
            <Check className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handleCancel} variant="outline" size="sm">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  if (!targetDate) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 bg-card/50 backdrop-blur rounded-lg border border-border/50">
        <div className="text-center space-y-2">
          <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
          <h3 className="text-sm font-medium text-muted-foreground">
            No Countdown Set
          </h3>
          <p className="text-xs text-muted-foreground/70">
            Click edit to set a target date
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Set Countdown
        </Button>
      </div>
    );
  }

  // Celebration mode
  if (showCelebration && timeRemaining.total === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 p-6 bg-gradient-to-br from-primary/20 via-card/50 to-primary/10 backdrop-blur rounded-lg border border-primary/30 relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-10">
          <PartyPopper className="h-48 w-48 animate-pulse" />
        </div>

        <div className="relative z-10 text-center space-y-4 animate-in fade-in zoom-in duration-500">
          <div className="flex items-center justify-center gap-2">
            <PartyPopper className="h-8 w-8 text-primary animate-bounce" />
            <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary animate-pulse">
              {eventName}
            </h2>
            <p className="text-lg font-medium text-foreground">
              is here! 🎉
            </p>
          </div>

          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            size="sm"
            className="mt-4"
          >
            <Edit2 className="h-4 w-4 mr-2" />
            Set New Countdown
          </Button>
        </div>
      </div>
    );
  }

  // Countdown completed (no celebration)
  if (timeRemaining.total === 0) {
    return (
      <div className="h-full flex flex-col gap-4 p-6 bg-card/50 backdrop-blur rounded-lg border border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground truncate">
              {eventName}
            </h3>
          </div>
          <Button
            onClick={() => setIsEditing(true)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <PartyPopper className="h-12 w-12 text-primary" />
          <div className="text-center space-y-1">
            <p className="text-lg font-semibold text-primary">Event Complete!</p>
            <p className="text-xs text-muted-foreground">{formattedTargetDate}</p>
          </div>
        </div>
      </div>
    );
  }

  // Active countdown display
  return (
    <div className="h-full flex flex-col gap-4 p-6 bg-card/50 backdrop-blur rounded-lg border border-border/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
          <h3 className="text-sm font-medium text-muted-foreground truncate">
            {eventName}
          </h3>
        </div>
        <Button
          onClick={() => setIsEditing(true)}
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="grid grid-cols-4 gap-2 w-full max-w-md">
          <TimeUnit value={timeRemaining.days} label="Days" />
          <TimeUnit value={timeRemaining.hours} label="Hours" />
          <TimeUnit value={timeRemaining.minutes} label="Mins" />
          <TimeUnit value={timeRemaining.seconds} label="Secs" animate />
        </div>
      </div>

      <div className="text-center">
        <p className="text-xs text-muted-foreground/70">{formattedTargetDate}</p>
      </div>
    </div>
  );
}

interface TimeUnitProps {
  value: number;
  label: string;
  animate?: boolean;
}

function TimeUnit({ value, label, animate }: TimeUnitProps) {
  return (
    <div className="flex flex-col items-center gap-1 p-2 bg-background/50 rounded-md border border-border/50">
      <div
        className={`text-2xl font-bold tabular-nums text-primary transition-all duration-300 ${
          animate ? "animate-pulse" : ""
        }`}
      >
        {String(value).padStart(2, "0")}
      </div>
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}
