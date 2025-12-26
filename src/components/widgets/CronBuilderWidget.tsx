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
  { label: "Cada minuto", value: "* * * * *" },
  { label: "Cada hora", value: "0 * * * *" },
  { label: "Cada dia a medianoche", value: "0 0 * * *" },
  { label: "Cada dia a las 9am", value: "0 9 * * *" },
  { label: "Cada semana (domingo)", value: "0 0 * * 0" },
  { label: "Cada mes (dia 1)", value: "0 0 1 * *" },
  { label: "Cada 5 minutos", value: "*/5 * * * *" },
  { label: "Cada 15 minutos", value: "*/15 * * * *" },
  { label: "Cada 30 minutos", value: "*/30 * * * *" },
  { label: "Lunes a viernes 9am", value: "0 9 * * 1-5" },
];

const MINUTE_OPTIONS = [
  { label: "Cada minuto", value: "*" },
  { label: "Cada 5 min", value: "*/5" },
  { label: "Cada 10 min", value: "*/10" },
  { label: "Cada 15 min", value: "*/15" },
  { label: "Cada 30 min", value: "*/30" },
  { label: "Al inicio", value: "0" },
];

const HOUR_OPTIONS = [
  { label: "Cada hora", value: "*" },
  { label: "Cada 2 horas", value: "*/2" },
  { label: "Cada 6 horas", value: "*/6" },
  { label: "Cada 12 horas", value: "*/12" },
  ...Array.from({ length: 24 }, (_, i) => ({
    label: `${i.toString().padStart(2, "0")}:00`,
    value: i.toString(),
  })),
];

const DAY_OPTIONS = [
  { label: "Cada dia", value: "*" },
  { label: "Dia 1", value: "1" },
  { label: "Dia 15", value: "15" },
  { label: "Ultimo dia", value: "L" },
];

const MONTH_OPTIONS = [
  { label: "Cada mes", value: "*" },
  { label: "Enero", value: "1" },
  { label: "Febrero", value: "2" },
  { label: "Marzo", value: "3" },
  { label: "Abril", value: "4" },
  { label: "Mayo", value: "5" },
  { label: "Junio", value: "6" },
  { label: "Julio", value: "7" },
  { label: "Agosto", value: "8" },
  { label: "Septiembre", value: "9" },
  { label: "Octubre", value: "10" },
  { label: "Noviembre", value: "11" },
  { label: "Diciembre", value: "12" },
];

const WEEKDAY_OPTIONS = [
  { label: "Cada dia", value: "*" },
  { label: "Lun-Vie", value: "1-5" },
  { label: "Fin de semana", value: "0,6" },
  { label: "Domingo", value: "0" },
  { label: "Lunes", value: "1" },
  { label: "Martes", value: "2" },
  { label: "Miercoles", value: "3" },
  { label: "Jueves", value: "4" },
  { label: "Viernes", value: "5" },
  { label: "Sabado", value: "6" },
];

function describeCron(expression: string): string {
  const parts = expression.split(" ");
  if (parts.length !== 5) return "Expresion invalida";

  const [minute, hour, day, month, weekday] = parts;

  // Common patterns
  if (expression === "* * * * *") return "Cada minuto";
  if (expression === "0 * * * *") return "Cada hora";
  if (expression === "0 0 * * *") return "Cada dia a medianoche";
  if (expression === "0 0 * * 0") return "Cada domingo a medianoche";
  if (expression === "0 0 1 * *") return "El primer dia de cada mes";

  // Build description
  const descriptions: string[] = [];

  // Minute
  if (minute === "*") {
    descriptions.push("cada minuto");
  } else if (minute.startsWith("*/")) {
    descriptions.push(`cada ${minute.slice(2)} minutos`);
  } else {
    descriptions.push(`al minuto ${minute}`);
  }

  // Hour
  if (hour !== "*") {
    if (hour.startsWith("*/")) {
      descriptions.push(`cada ${hour.slice(2)} horas`);
    } else {
      descriptions.push(`a las ${hour.padStart(2, "0")}:00`);
    }
  }

  // Day of month
  if (day !== "*") {
    if (day === "L") {
      descriptions.push("el ultimo dia del mes");
    } else {
      descriptions.push(`el dia ${day}`);
    }
  }

  // Month
  if (month !== "*") {
    const monthNames = [
      "",
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    descriptions.push(`en ${monthNames[parseInt(month)] || month}`);
  }

  // Day of week
  if (weekday !== "*") {
    if (weekday === "1-5") {
      descriptions.push("de lunes a viernes");
    } else if (weekday === "0,6") {
      descriptions.push("los fines de semana");
    } else {
      const dayNames = [
        "domingos",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabados",
      ];
      descriptions.push(`los ${dayNames[parseInt(weekday)] || weekday}`);
    }
  }

  return descriptions.join(", ") || "Expresion personalizada";
}

export function CronBuilderWidget({ widget }: CronBuilderWidgetProps) {
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
    return describeCron(cronExpression);
  }, [cronExpression]);

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
      toast.success("Expresion copiada");
    } catch {
      toast.error("Error al copiar");
    }
  };

  const saveCron = () => {
    // Check for duplicates
    const isDuplicate = savedCrons.some((c) => c.expression === cronExpression);
    if (isDuplicate) {
      toast.info("Esta expresion ya esta guardada");
      return;
    }

    const newCron: SavedCron = {
      id: crypto.randomUUID(),
      expression: cronExpression,
      description: description,
      createdAt: new Date().toISOString(),
    };

    saveCrons([newCron, ...savedCrons].slice(0, 10));
    toast.success("Expresion guardada");
  };

  const deleteSavedCron = (id: string) => {
    saveCrons(savedCrons.filter((c) => c.id !== id));
    toast.success("Eliminado");
  };

  const loadSavedCron = (cron: SavedCron) => {
    applyPreset(cron.expression);
    toast.success("Cargado");
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-medium">Cron Builder</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={saveCron}
              title="Guardar"
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={copyToClipboard}
              title="Copiar"
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
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Selectors */}
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {/* Minute */}
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16 shrink-0">Minuto</Label>
              <Select value={minute} onValueChange={setMinute}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              <Label className="text-xs w-16 shrink-0">Hora</Label>
              <Select value={hour} onValueChange={setHour}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUR_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              <Label className="text-xs w-16 shrink-0">Dia</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              <Label className="text-xs w-16 shrink-0">Mes</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
              <Label className="text-xs w-16 shrink-0">Semana</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
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
                  Guardados ({savedCrons.length})
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
