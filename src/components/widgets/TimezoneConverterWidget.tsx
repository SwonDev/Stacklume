"use client";

import { useState, useEffect } from "react";
import { Globe, Clock, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface TimezoneConverterWidgetProps {
  widget: Widget;
}

interface TimezoneOption {
  value: string;
  label: string;
  region: string;
}

const COMMON_TIMEZONES: TimezoneOption[] = [
  { value: "UTC", label: "UTC", region: "Universal" },
  { value: "America/New_York", label: "New York (EST/EDT)", region: "Americas" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)", region: "Americas" },
  { value: "America/Chicago", label: "Chicago (CST/CDT)", region: "Americas" },
  { value: "America/Denver", label: "Denver (MST/MDT)", region: "Americas" },
  { value: "America/Mexico_City", label: "Mexico City", region: "Americas" },
  { value: "America/Toronto", label: "Toronto", region: "Americas" },
  { value: "America/Sao_Paulo", label: "São Paulo", region: "Americas" },
  { value: "America/Buenos_Aires", label: "Buenos Aires", region: "Americas" },
  { value: "Europe/London", label: "London (GMT/BST)", region: "Europe" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)", region: "Europe" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)", region: "Europe" },
  { value: "Europe/Madrid", label: "Madrid", region: "Europe" },
  { value: "Europe/Rome", label: "Rome", region: "Europe" },
  { value: "Europe/Moscow", label: "Moscow", region: "Europe" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)", region: "Asia" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)", region: "Asia" },
  { value: "Asia/Dubai", label: "Dubai (GST)", region: "Asia" },
  { value: "Asia/Singapore", label: "Singapore (SGT)", region: "Asia" },
  { value: "Asia/Hong_Kong", label: "Hong Kong", region: "Asia" },
  { value: "Asia/Seoul", label: "Seoul", region: "Asia" },
  { value: "Asia/Kolkata", label: "Kolkata/Mumbai", region: "Asia" },
  { value: "Asia/Bangkok", label: "Bangkok", region: "Asia" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)", region: "Oceania" },
  { value: "Australia/Melbourne", label: "Melbourne", region: "Oceania" },
  { value: "Pacific/Auckland", label: "Auckland (NZST/NZDT)", region: "Oceania" },
];

export function TimezoneConverterWidget({ widget }: TimezoneConverterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // Initialize state from widget config
  const [sourceTimezone, setSourceTimezone] = useState<string>(
    widget.config?.sourceTimezone || "UTC"
  );
  const [targetTimezones, setTargetTimezones] = useState<string[]>(
    widget.config?.targetTimezones || ["America/New_York", "Europe/London", "Asia/Tokyo"]
  );
  const [use24Hour, setUse24Hour] = useState<boolean>(
    widget.config?.use24Hour ?? false
  );

  // Time state
  const [sourceTime, setSourceTime] = useState<Date>(new Date());
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update source time when source timezone changes
  useEffect(() => {
    setSourceTime(new Date());
  }, [sourceTimezone]);

  // Save config changes to widget store
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          sourceTimezone,
          targetTimezones,
          use24Hour,
        },
      });
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceTimezone, targetTimezones, use24Hour, widget.id]);

  const formatTime = (date: Date, timezone: string, use24Hour: boolean): string => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: !use24Hour,
      };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    } catch {
      return "Invalid timezone";
    }
  };

  const formatDate = (date: Date, timezone: string): string => {
    try {
      const options: Intl.DateTimeFormatOptions = {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      };
      return new Intl.DateTimeFormat("en-US", options).format(date);
    } catch {
      return "Invalid timezone";
    }
  };

  const getTimezoneOffset = (timezone: string): string => {
    try {
      const now = new Date();
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "shortOffset",
      });
      const parts = formatter.formatToParts(now);
      const offsetPart = parts.find((part) => part.type === "timeZoneName");
      return offsetPart?.value || "UTC";
    } catch {
      return "UTC";
    }
  };

  const handleAddTargetTimezone = () => {
    if (targetTimezones.length >= 5) return;

    // Find first timezone not already in target list
    const availableTimezone = COMMON_TIMEZONES.find(
      (tz) => !targetTimezones.includes(tz.value) && tz.value !== sourceTimezone
    );

    if (availableTimezone) {
      setTargetTimezones([...targetTimezones, availableTimezone.value]);
    }
  };

  const handleRemoveTargetTimezone = (timezone: string) => {
    setTargetTimezones(targetTimezones.filter((tz) => tz !== timezone));
  };

  const handleSetNow = () => {
    setSourceTime(new Date());
  };

  const handleTimeChange = (timeString: string) => {
    const [hours, minutes] = timeString.split(":").map(Number);
    const newTime = new Date(sourceTime);
    newTime.setHours(hours, minutes, 0, 0);
    setSourceTime(newTime);
  };

  const getTimeInputValue = (): string => {
    const hours = sourceTime.getHours().toString().padStart(2, "0");
    const minutes = sourceTime.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const getTimezoneLabel = (timezoneValue: string): string => {
    const found = COMMON_TIMEZONES.find((tz) => tz.value === timezoneValue);
    return found?.label || timezoneValue;
  };

  const availableTimezones = COMMON_TIMEZONES.filter(
    (tz) => !targetTimezones.includes(tz.value)
  );

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 @md:p-6 gap-3 @sm:gap-4">
        {/* Header with icon */}
        <div className="flex items-center gap-2 @md:gap-3">
          <div className="flex-shrink-0 w-8 h-8 @md:w-10 @md:h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="w-4 h-4 @md:w-5 @md:h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm @md:text-base font-semibold truncate">
              Timezone Converter
            </h3>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-3 @sm:space-y-4 pr-2">
            {/* Source Section */}
            <div className="space-y-2 @sm:space-y-3">
              <Label className="text-xs @sm:text-sm font-medium">Source Timezone</Label>

              <Select value={sourceTimezone} onValueChange={setSourceTimezone}>
                <SelectTrigger className="w-full text-xs @sm:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value} className="text-xs @sm:text-sm">
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Input
                  type="time"
                  value={getTimeInputValue()}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className="flex-1 text-xs @sm:text-sm"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSetNow}
                  className="px-2 @sm:px-3 text-xs @sm:text-sm"
                >
                  <Clock className="w-3 h-3 @sm:w-4 @sm:h-4 mr-1" />
                  Now
                </Button>
              </div>

              {/* Source time display */}
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 @sm:p-4 rounded-lg bg-primary/5 border border-primary/10"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs @sm:text-sm font-medium text-muted-foreground">
                    {getTimezoneLabel(sourceTimezone)}
                  </span>
                  <span className="text-[10px] @sm:text-xs text-muted-foreground">
                    {getTimezoneOffset(sourceTimezone)}
                  </span>
                </div>
                <div className="text-xl @sm:text-2xl @md:text-3xl font-bold text-primary tabular-nums">
                  {formatTime(sourceTime, sourceTimezone, use24Hour)}
                </div>
                <div className="text-[10px] @sm:text-xs text-muted-foreground mt-1">
                  {formatDate(sourceTime, sourceTimezone)}
                </div>
              </motion.div>
            </div>

            {/* Settings */}
            <div className="flex items-center justify-between py-2 border-y border-border/50">
              <Label htmlFor="format-toggle" className="text-xs @sm:text-sm cursor-pointer">
                24-hour format
              </Label>
              <Switch
                id="format-toggle"
                checked={use24Hour}
                onCheckedChange={setUse24Hour}
              />
            </div>

            {/* Target Timezones */}
            <div className="space-y-2 @sm:space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs @sm:text-sm font-medium">
                  Target Timezones ({targetTimezones.length}/5)
                </Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddTargetTimezone}
                  disabled={targetTimezones.length >= 5}
                  className="h-7 px-2 @sm:h-8 @sm:px-3 text-xs @sm:text-sm"
                >
                  <Plus className="w-3 h-3 @sm:w-4 @sm:h-4" />
                </Button>
              </div>

              <AnimatePresence mode="popLayout">
                {targetTimezones.map((timezone, index) => (
                  <motion.div
                    key={timezone}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative group"
                  >
                    <div className="p-3 @sm:p-3.5 rounded-lg bg-muted/50 border border-border/50 hover:border-border transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs @sm:text-sm font-medium truncate">
                              {getTimezoneLabel(timezone)}
                            </span>
                            <span className="text-[10px] @sm:text-xs text-muted-foreground flex-shrink-0">
                              {getTimezoneOffset(timezone)}
                            </span>
                          </div>
                          <div className="text-lg @sm:text-xl @md:text-2xl font-bold tabular-nums">
                            {formatTime(sourceTime, timezone, use24Hour)}
                          </div>
                          <div className="text-[10px] @sm:text-xs text-muted-foreground mt-0.5">
                            {formatDate(sourceTime, timezone)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveTargetTimezone(timezone)}
                          className="h-6 w-6 @sm:h-7 @sm:w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        >
                          <X className="w-3 h-3 @sm:w-4 @sm:h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {targetTimezones.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-6 @sm:p-8 text-center"
                >
                  <div className="w-12 h-12 @sm:w-16 @sm:h-16 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <Globe className="w-6 h-6 @sm:w-8 @sm:h-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs @sm:text-sm text-muted-foreground">
                    Add target timezones to convert
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAddTargetTimezone}
                    className="mt-3 text-xs @sm:text-sm"
                  >
                    <Plus className="w-3 h-3 @sm:w-4 @sm:h-4 mr-1" />
                    Add Timezone
                  </Button>
                </motion.div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
