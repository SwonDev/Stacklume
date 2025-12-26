"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Clock, Plus, Trash2, GripVertical, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface TimeBlockingWidgetProps {
  widget: Widget;
}

interface TimeBlock {
  id: string;
  title: string;
  startHour: number; // 0-23
  startMinute: number; // 0 or 30
  endHour: number;
  endMinute: number;
  color: string;
  date: string; // ISO date string
}

interface TimeBlockingConfig {
  timeBlocks?: TimeBlock[];
  workHoursOnly?: boolean; // If true, show 8-18, else 0-23
  startHour?: number;
  endHour?: number;
}

const BLOCK_COLORS = [
  { name: "Azul", value: "bg-blue-500/80" },
  { name: "Verde", value: "bg-green-500/80" },
  { name: "Amarillo", value: "bg-yellow-500/80" },
  { name: "Naranja", value: "bg-orange-500/80" },
  { name: "Rojo", value: "bg-red-500/80" },
  { name: "Morado", value: "bg-purple-500/80" },
  { name: "Rosa", value: "bg-pink-500/80" },
  { name: "Cyan", value: "bg-cyan-500/80" },
];

export function TimeBlockingWidget({ widget }: TimeBlockingWidgetProps) {
  const config: TimeBlockingConfig = widget.config || {};
  const timeBlocks: TimeBlock[] = config.timeBlocks || [];
  const startHour = config.startHour ?? (config.workHoursOnly ? 8 : 6);
  const endHour = config.endHour ?? (config.workHoursOnly ? 18 : 22);

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockStartHour, setNewBlockStartHour] = useState(9);
  const [newBlockEndHour, setNewBlockEndHour] = useState(10);
  const [newBlockColor, setNewBlockColor] = useState(BLOCK_COLORS[0].value);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Get current hour for indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const todayBlocks = useMemo(() => {
    return timeBlocks.filter((block) => block.date === selectedDate);
  }, [timeBlocks, selectedDate]);

  const hours = useMemo(() => {
    const result = [];
    for (let h = startHour; h <= endHour; h++) {
      result.push(h);
    }
    return result;
  }, [startHour, endHour]);

  const saveBlocks = useCallback(
    (blocks: TimeBlock[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          timeBlocks: blocks,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addBlock = () => {
    if (!newBlockTitle.trim()) return;

    const newBlock: TimeBlock = {
      id: crypto.randomUUID(),
      title: newBlockTitle.trim(),
      startHour: newBlockStartHour,
      startMinute: 0,
      endHour: newBlockEndHour,
      endMinute: 0,
      color: newBlockColor,
      date: selectedDate,
    };

    saveBlocks([...timeBlocks, newBlock]);
    setNewBlockTitle("");
    setNewBlockStartHour(9);
    setNewBlockEndHour(10);
    setIsAddDialogOpen(false);
  };

  const deleteBlock = (id: string) => {
    saveBlocks(timeBlocks.filter((b) => b.id !== id));
  };

  const changeDate = (delta: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + delta);
    setSelectedDate(date.toISOString().split("T")[0]);
  };

  const formatHour = (hour: number): string => {
    if (hour === 0) return "12 AM";
    if (hour < 12) return `${hour} AM`;
    if (hour === 12) return "12 PM";
    return `${hour - 12} PM`;
  };

  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr + "T12:00:00");
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    if (dateStr === todayStr) return "Hoy";
    if (dateStr === yesterdayStr) return "Ayer";
    if (dateStr === tomorrowStr) return "Manana";

    return date.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  // Calculate block position and height
  const getBlockStyle = (block: TimeBlock) => {
    const startOffset = block.startHour - startHour + block.startMinute / 60;
    const duration = block.endHour - block.startHour + (block.endMinute - block.startMinute) / 60;
    const hourHeight = 48; // 48px per hour

    return {
      top: `${startOffset * hourHeight}px`,
      height: `${Math.max(duration * hourHeight - 2, 24)}px`,
    };
  };

  // Current time indicator position
  const currentTimePosition = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate !== todayStr) return null;

    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();

    if (hour < startHour || hour > endHour) return null;

    const offset = hour - startHour + minute / 60;
    return offset * 48; // 48px per hour
  }, [currentTime, selectedDate, startHour, endHour]);

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Bloques de Tiempo</span>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Bloque de Tiempo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="block-title">Titulo</Label>
                  <Input
                    id="block-title"
                    value={newBlockTitle}
                    onChange={(e) => setNewBlockTitle(e.target.value)}
                    placeholder="Ej: Trabajo profundo..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hora de inicio</Label>
                    <select
                      value={newBlockStartHour}
                      onChange={(e) => setNewBlockStartHour(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora de fin</Label>
                    <select
                      value={newBlockEndHour}
                      onChange={(e) => setNewBlockEndHour(Number(e.target.value))}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
                    >
                      {hours.map((h) => (
                        <option key={h} value={h} disabled={h <= newBlockStartHour}>
                          {formatHour(h)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {BLOCK_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewBlockColor(color.value)}
                        className={cn(
                          "w-8 h-8 rounded-full transition-all",
                          color.value.replace("/80", ""),
                          newBlockColor === color.value
                            ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                            : ""
                        )}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
                <Button onClick={addBlock} className="w-full" disabled={!newBlockTitle.trim()}>
                  Agregar Bloque
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between mb-3 px-1">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(-1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">{formatDateDisplay(selectedDate)}</span>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => changeDate(1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Timeline */}
        <ScrollArea className="flex-1 -mx-1 px-1" ref={scrollRef}>
          <div className="relative" style={{ height: `${hours.length * 48}px` }}>
            {/* Hour grid */}
            {hours.map((hour, index) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-muted/30"
                style={{ top: `${index * 48}px`, height: "48px" }}
              >
                <span className="absolute -top-2.5 left-0 text-[10px] text-muted-foreground w-12">
                  {formatHour(hour)}
                </span>
              </div>
            ))}

            {/* Current time indicator */}
            {currentTimePosition !== null && (
              <motion.div
                className="absolute left-10 right-0 h-0.5 bg-red-500 z-10"
                style={{ top: `${currentTimePosition}px` }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="absolute -left-1.5 -top-1.5 w-3 h-3 rounded-full bg-red-500" />
              </motion.div>
            )}

            {/* Time blocks */}
            <AnimatePresence>
              {todayBlocks.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "absolute left-12 right-1 rounded-md px-2 py-1 group cursor-default",
                    block.color
                  )}
                  style={getBlockStyle(block)}
                >
                  <div className="flex items-start justify-between h-full">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate">{block.title}</p>
                      <p className="text-[10px] text-white/70">
                        {formatHour(block.startHour)} - {formatHour(block.endHour)}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-white/20 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3 text-white" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Empty state */}
        {todayBlocks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">Sin bloques para este dia</p>
            <p className="text-[10px]">Haz clic en + para agregar uno</p>
          </div>
        )}
      </div>
    </div>
  );
}
