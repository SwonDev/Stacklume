"use client";

import { useState, useEffect } from "react";
import { Settings, Plus, X, Clock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface WorldClockWidgetProps {
  widget: Widget;
}

interface TimeZoneInfo {
  id: string;
  name: string;
  timezone: string;
  offset: string;
}

interface WorldClockConfig {
  timezones?: TimeZoneInfo[];
  format24Hour?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
}

const POPULAR_TIMEZONES: TimeZoneInfo[] = [
  { id: "ny", name: "Nueva York", timezone: "America/New_York", offset: "UTC-5" },
  { id: "la", name: "Los Angeles", timezone: "America/Los_Angeles", offset: "UTC-8" },
  { id: "london", name: "Londres", timezone: "Europe/London", offset: "UTC+0" },
  { id: "paris", name: "Paris", timezone: "Europe/Paris", offset: "UTC+1" },
  { id: "madrid", name: "Madrid", timezone: "Europe/Madrid", offset: "UTC+1" },
  { id: "berlin", name: "Berlin", timezone: "Europe/Berlin", offset: "UTC+1" },
  { id: "moscow", name: "Moscu", timezone: "Europe/Moscow", offset: "UTC+3" },
  { id: "dubai", name: "Dubai", timezone: "Asia/Dubai", offset: "UTC+4" },
  { id: "mumbai", name: "Mumbai", timezone: "Asia/Kolkata", offset: "UTC+5:30" },
  { id: "singapore", name: "Singapur", timezone: "Asia/Singapore", offset: "UTC+8" },
  { id: "tokyo", name: "Tokio", timezone: "Asia/Tokyo", offset: "UTC+9" },
  { id: "sydney", name: "Sydney", timezone: "Australia/Sydney", offset: "UTC+11" },
  { id: "mexico", name: "Mexico City", timezone: "America/Mexico_City", offset: "UTC-6" },
  { id: "sao_paulo", name: "Sao Paulo", timezone: "America/Sao_Paulo", offset: "UTC-3" },
  { id: "buenos_aires", name: "Buenos Aires", timezone: "America/Argentina/Buenos_Aires", offset: "UTC-3" },
];

function formatTime(date: Date, timezone: string, format24Hour: boolean, showSeconds: boolean): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: !format24Hour,
  };

  if (showSeconds) {
    options.second = "2-digit";
  }

  return date.toLocaleTimeString("en-US", options);
}

function formatDate(date: Date, timezone: string): string {
  return date.toLocaleDateString("es-ES", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getTimeDifference(timezone: string): string {
  const now = new Date();
  const localOffset = now.getTimezoneOffset();
  const targetDate = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const localDate = new Date(now.toLocaleString("en-US"));

  const diffMs = targetDate.getTime() - localDate.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffHours === 0) return "Mismo horario";
  if (diffHours > 0) return `+${diffHours}h`;
  return `${diffHours}h`;
}

export function WorldClockWidget({ widget }: WorldClockWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const config = widget.config as WorldClockConfig | undefined;
  const timezones = config?.timezones || [
    POPULAR_TIMEZONES[0], // NY
    POPULAR_TIMEZONES[2], // London
    POPULAR_TIMEZONES[10], // Tokyo
  ];
  const format24Hour = config?.format24Hour || false;
  const showSeconds = config?.showSeconds || false;
  const showDate = config?.showDate !== false;

  const [formData, setFormData] = useState<WorldClockConfig>({
    timezones: timezones,
    format24Hour: format24Hour,
    showSeconds: showSeconds,
    showDate: showDate,
  });

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
      },
    });
    setIsSettingsOpen(false);
  };

  const addTimezone = (tz: TimeZoneInfo) => {
    if (!formData.timezones?.find(t => t.id === tz.id)) {
      setFormData({
        ...formData,
        timezones: [...(formData.timezones || []), tz],
      });
    }
  };

  const removeTimezone = (tzId: string) => {
    setFormData({
      ...formData,
      timezones: (formData.timezones || []).filter(t => t.id !== tzId),
    });
  };

  // Empty state
  if (timezones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mb-3">
          <Globe className="w-6 h-6 text-blue-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No hay zonas horarias</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Agrega zonas horarias para ver la hora mundial
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Hora mundial</span>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Timezone list */}
      <div className="flex-1 space-y-2 overflow-auto">
        {timezones.map((tz, index) => (
          <motion.div
            key={tz.id}
            className="p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{tz.name}</span>
                  <Badge variant="outline" className="text-[10px] h-4">
                    {getTimeDifference(tz.timezone)}
                  </Badge>
                </div>
                {showDate && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(currentTime, tz.timezone)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className={cn(
                  "font-mono font-bold tabular-nums",
                  showSeconds ? "text-lg" : "text-xl"
                )}>
                  {formatTime(currentTime, tz.timezone, format24Hour, showSeconds)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-500" />
              Configurar Hora Mundial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Zonas horarias seleccionadas</Label>
              <div className="flex flex-wrap gap-1">
                {formData.timezones?.map((tz) => (
                  <Badge key={tz.id} variant="secondary" className="gap-1">
                    {tz.name}
                    <button onClick={() => removeTimezone(tz.id)}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
                {formData.timezones?.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay zonas horarias seleccionadas
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Agregar zona horaria</Label>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
                {POPULAR_TIMEZONES.filter(tz => !formData.timezones?.find(t => t.id === tz.id)).map((tz) => (
                  <Button
                    key={tz.id}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs justify-start"
                    onClick={() => addTimezone(tz)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {tz.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Formato 24 horas</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra la hora en formato 24h
                </p>
              </div>
              <Switch
                checked={formData.format24Hour}
                onCheckedChange={(checked) => setFormData({ ...formData, format24Hour: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar segundos</Label>
                <p className="text-xs text-muted-foreground">
                  Incluye los segundos en la hora
                </p>
              </div>
              <Switch
                checked={formData.showSeconds}
                onCheckedChange={(checked) => setFormData({ ...formData, showSeconds: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar fecha</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra la fecha de cada zona
                </p>
              </div>
              <Switch
                checked={formData.showDate}
                onCheckedChange={(checked) => setFormData({ ...formData, showDate: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
