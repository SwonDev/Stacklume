"use client";

import { useState, useCallback, useMemo } from "react";
import {
  Clock,
  Copy,
  Save,
  Trash2,
  Star,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface CronBuilderWidgetProps {
  widget: Widget;
}

interface SavedCron {
  id: string;
  expression: string;
  description: string;
  createdAt: string;
}

// Common cron presets
const CRON_PRESETS = [
  { labelKey: "cronBuilder.presetEveryMinute", value: "* * * * *" },
  { labelKey: "cronBuilder.presetEveryHour", value: "0 * * * *" },
  { labelKey: "cronBuilder.presetDailyMidnight", value: "0 0 * * *" },
  { labelKey: "cronBuilder.presetDaily9am", value: "0 9 * * *" },
  { labelKey: "cronBuilder.presetWeeklySunday", value: "0 0 * * 0" },
  { labelKey: "cronBuilder.presetMonthlyFirst", value: "0 0 1 * *" },
  { labelKey: "cronBuilder.presetEvery5min", value: "*/5 * * * *" },
  { labelKey: "cronBuilder.presetEvery15min", value: "*/15 * * * *" },
  { labelKey: "cronBuilder.presetEvery30min", value: "*/30 * * * *" },
  { labelKey: "cronBuilder.presetWeekdays9am", value: "0 9 * * 1-5" },
];

const MINUTE_OPTIONS = [
  { labelKey: "cronBuilder.minuteEvery", value: "*" },
  { labelKey: "cronBuilder.minuteEvery5", value: "*/5" },
  { labelKey: "cronBuilder.minuteEvery10", value: "*/10" },
  { labelKey: "cronBuilder.minuteEvery15", value: "*/15" },
  { labelKey: "cronBuilder.minuteEvery30", value: "*/30" },
  { labelKey: "cronBuilder.minuteAtStart", value: "0" },
];

const HOUR_OPTIONS = [
  { labelKey: "cronBuilder.hourEvery", value: "*" },
  { labelKey: "cronBuilder.hourEvery2", value: "*/2" },
  { labelKey: "cronBuilder.hourEvery6", value: "*/6" },
  { labelKey: "cronBuilder.hourEvery12", value: "*/12" },
  ...Array.from({ length: 24 }, (_, i) => ({
    labelKey: "",
    label: `${i.toString().padStart(2, "0")}:00`,
    value: i.toString(),
  })),
];

const DAY_OPTIONS = [
  { labelKey: "cronBuilder.dayEvery", value: "*" },
  { labelKey: "cronBuilder.dayFirst", value: "1" },
  { labelKey: "cronBuilder.day15th", value: "15" },
  { labelKey: "cronBuilder.dayLast", value: "L" },
];

const MONTH_OPTIONS = [
  { labelKey: "cronBuilder.monthEvery", value: "*" },
  { labelKey: "cronBuilder.monthJan", value: "1" },
  { labelKey: "cronBuilder.monthFeb", value: "2" },
  { labelKey: "cronBuilder.monthMar", value: "3" },
  { labelKey: "cronBuilder.monthApr", value: "4" },
  { labelKey: "cronBuilder.monthMay", value: "5" },
  { labelKey: "cronBuilder.monthJun", value: "6" },
  { labelKey: "cronBuilder.monthJul", value: "7" },
  { labelKey: "cronBuilder.monthAug", value: "8" },
  { labelKey: "cronBuilder.monthSep", value: "9" },
  { labelKey: "cronBuilder.monthOct", value: "10" },
  { labelKey: "cronBuilder.monthNov", value: "11" },
  { labelKey: "cronBuilder.monthDec", value: "12" },
];

const WEEKDAY_OPTIONS = [
  { labelKey: "cronBuilder.weekdayEvery", value: "*" },
  { labelKey: "cronBuilder.weekdayMonFri", value: "1-5" },
  { labelKey: "cronBuilder.weekdayWeekend", value: "0,6" },
  { labelKey: "cronBuilder.weekdaySun", value: "0" },
  { labelKey: "cronBuilder.weekdayMon", value: "1" },
  { labelKey: "cronBuilder.weekdayTue", value: "2" },
  { labelKey: "cronBuilder.weekdayWed", value: "3" },
  { labelKey: "cronBuilder.weekdayThu", value: "4" },
  { labelKey: "cronBuilder.weekdayFri", value: "5" },
  { labelKey: "cronBuilder.weekdaySat", value: "6" },
];

function describeCron(expression: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const parts = expression.split(" ");
  if (parts.length !== 5) return t("cronBuilder.invalidExpression");

  const [minute, hour, day, month, weekday] = parts;

  // Common patterns
  if (expression === "* * * * *") return t("cronBuilder.descEveryMinute");
  if (expression === "0 * * * *") return t("cronBuilder.descEveryHour");
  if (expression === "0 0 * * *") return t("cronBuilder.descDailyMidnight");
  if (expression === "0 0 * * 0") return t("cronBuilder.descSundayMidnight");
  if (expression === "0 0 1 * *") return t("cronBuilder.descFirstDayMonth");

  // Build description
  const descriptions: string[] = [];

  // Minute
  if (minute === "*") {
    descriptions.push(t("cronBuilder.descMinuteEvery"));
  } else if (minute.startsWith("*/")) {
    descriptions.push(t("cronBuilder.descMinuteEveryN", { n: minute.slice(2) }));
  } else {
    descriptions.push(t("cronBuilder.descMinuteAt", { n: minute }));
  }

  // Hour
  if (hour !== "*") {
    if (hour.startsWith("*/")) {
      descriptions.push(t("cronBuilder.descHourEveryN", { n: hour.slice(2) }));
    } else {
      descriptions.push(t("cronBuilder.descHourAt", { hour: hour.padStart(2, "0") }));
    }
  }

  // Day of month
  if (day !== "*") {
    if (day === "L") {
      descriptions.push(t("cronBuilder.descLastDay"));
    } else {
      descriptions.push(t("cronBuilder.descOnDay", { day }));
    }
  }

  // Month
  if (month !== "*") {
    const monthKeys = [
      "",
      "cronBuilder.monthJan",
      "cronBuilder.monthFeb",
      "cronBuilder.monthMar",
      "cronBuilder.monthApr",
      "cronBuilder.monthMay",
      "cronBuilder.monthJun",
      "cronBuilder.monthJul",
      "cronBuilder.monthAug",
      "cronBuilder.monthSep",
      "cronBuilder.monthOct",
      "cronBuilder.monthNov",
      "cronBuilder.monthDec",
    ];
    const monthKey = monthKeys[parseInt(month)];
    const monthName = monthKey ? t(monthKey) : month;
    descriptions.push(t("cronBuilder.descInMonth", { month: monthName }));
  }

  // Day of week
  if (weekday !== "*") {
    if (weekday === "1-5") {
      descriptions.push(t("cronBuilder.descMonToFri"));
    } else if (weekday === "0,6") {
      descriptions.push(t("cronBuilder.descWeekends"));
    } else {
      const dayKeys = [
        "cronBuilder.weekdaySun",
        "cronBuilder.weekdayMon",
        "cronBuilder.weekdayTue",
        "cronBuilder.weekdayWed",
        "cronBuilder.weekdayThu",
        "cronBuilder.weekdayFri",
        "cronBuilder.weekdaySat",
      ];
      const dayKey = dayKeys[parseInt(weekday)];
      const dayName = dayKey ? t(dayKey) : weekday;
      descriptions.push(t("cronBuilder.descOnWeekday", { day: dayName }));
    }
  }

  return descriptions.join(", ") || t("cronBuilder.descCustom");
}

export function CronBuilderWidget({ widget }: CronBuilderWidgetProps) {
  const { t } = useTranslation();
  const [minute, setMinute] = useState("*");
  const [hour, setHour] = useState("*");
  const [day, setDay] = useState("*");
  const [month, setMonth] = useState("*");
  const [weekday, setWeekday] = useState("*");
  const [showSaved, setShowSaved] = useState(false);

  const savedCrons: SavedCron[] = widget.config?.savedCrons || [];

  const cronExpression = useMemo(() => {
    return `${minute} ${hour} ${day} ${month} ${weekday}`;
  }, [minute, hour, day, month, weekday]);

  const description = useMemo(() => {
    return describeCron(cronExpression, t);
  }, [cronExpression, t]);

  const saveCrons = useCallback(
    (crons: SavedCron[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          savedCrons: crons,
        },
      });
    },
    [widget.id, widget.config]
  );

  const applyPreset = (preset: string) => {
    const parts = preset.split(" ");
    if (parts.length === 5) {
      setMinute(parts[0]);
      setHour(parts[1]);
      setDay(parts[2]);
      setMonth(parts[3]);
      setWeekday(parts[4]);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(cronExpression);
      toast.success(t("cronBuilder.copied"));
    } catch {
      toast.error(t("cronBuilder.copyError"));
    }
  };

  const saveCron = () => {
    // Check for duplicates
    const isDuplicate = savedCrons.some((c) => c.expression === cronExpression);
    if (isDuplicate) {
      toast.info(t("cronBuilder.alreadySaved"));
      return;
    }

    const newCron: SavedCron = {
      id: crypto.randomUUID(),
      expression: cronExpression,
      description: description,
      createdAt: new Date().toISOString(),
    };

    saveCrons([newCron, ...savedCrons].slice(0, 10));
    toast.success(t("cronBuilder.saved"));
  };

  const deleteSavedCron = (id: string) => {
    saveCrons(savedCrons.filter((c) => c.id !== id));
    toast.success(t("cronBuilder.deleted"));
  };

  const loadSavedCron = (cron: SavedCron) => {
    applyPreset(cron.expression);
    toast.success(t("cronBuilder.loaded"));
  };

  const resolveOptionLabel = (opt: { labelKey: string; label?: string; value: string }) => {
    if (opt.label) return opt.label;
    return t(opt.labelKey);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">{t("cronBuilder.title")}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={saveCron}
              title={t("cronBuilder.save")}
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={copyToClipboard}
              title={t("cronBuilder.copy")}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Current expression display */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="font-mono text-lg text-center tracking-wider">
            {cronExpression}
          </div>
          <p className="text-xs text-center text-muted-foreground mt-1">
            {description}
          </p>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap gap-1">
          {CRON_PRESETS.slice(0, 4).map((preset) => (
            <Button
              key={preset.value}
              variant="outline"
              size="sm"
              className="h-6 text-[10px] px-2"
              onClick={() => applyPreset(preset.value)}
            >
              {t(preset.labelKey)}
            </Button>
          ))}
        </div>

        {/* Selectors */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {/* Minute */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">{t("cronBuilder.minute")}</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {resolveOptionLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className="h-7 w-16 text-xs font-mono"
              />
            </div>

            {/* Hour */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">{t("cronBuilder.hour")}</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {resolveOptionLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={hour}
                onChange={(e) => setHour(e.target.value)}
                className="h-7 w-16 text-xs font-mono"
              />
            </div>

            {/* Day */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">{t("cronBuilder.day")}</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {resolveOptionLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={day}
                onChange={(e) => setDay(e.target.value)}
                className="h-7 w-16 text-xs font-mono"
              />
            </div>

            {/* Month */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">{t("cronBuilder.month")}</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {resolveOptionLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className="h-7 w-16 text-xs font-mono"
              />
            </div>

            {/* Weekday */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">{t("cronBuilder.weekday")}</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {resolveOptionLabel(opt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={weekday}
                onChange={(e) => setWeekday(e.target.value)}
                className="h-7 w-16 text-xs font-mono"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Saved crons */}
        {savedCrons.length > 0 && (
          <Collapsible open={showSaved} onOpenChange={setShowSaved}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between h-7 px-2">
                <span className="text-xs flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  {t("cronBuilder.savedCount", { count: savedCrons.length })}
                </span>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 transition-transform",
                    showSaved && "rotate-180"
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                {savedCrons.map((cron) => (
                  <div
                    key={cron.id}
                    className="flex items-center gap-2 p-1.5 rounded bg-secondary/30 text-xs group cursor-pointer hover:bg-secondary/50"
                    onClick={() => loadSavedCron(cron)}
                  >
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {cron.expression}
                    </Badge>
                    <span className="flex-1 truncate text-muted-foreground text-[10px]">
                      {cron.description}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSavedCron(cron.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}
