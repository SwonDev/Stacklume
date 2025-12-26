"use client";

import { useState, useCallback } from "react";
import {
  StickyNote,
  Plus,
  Trash2,
  Palette,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface StickyNotesWidgetProps {
  widget: Widget;
}

interface StickyNoteItem {
  id: string;
  content: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

const NOTE_COLORS = [
  { name: "Amarillo", value: "bg-yellow-200 dark:bg-yellow-900/50", text: "text-yellow-900 dark:text-yellow-100" },
  { name: "Rosa", value: "bg-pink-200 dark:bg-pink-900/50", text: "text-pink-900 dark:text-pink-100" },
  { name: "Azul", value: "bg-blue-200 dark:bg-blue-900/50", text: "text-blue-900 dark:text-blue-100" },
  { name: "Verde", value: "bg-green-200 dark:bg-green-900/50", text: "text-green-900 dark:text-green-100" },
  { name: "Morado", value: "bg-purple-200 dark:bg-purple-900/50", text: "text-purple-900 dark:text-purple-100" },
  { name: "Naranja", value: "bg-orange-200 dark:bg-orange-900/50", text: "text-orange-900 dark:text-orange-100" },
];

const DEFAULT_COLOR = NOTE_COLORS[0];

export function StickyNotesWidget({ widget }: StickyNotesWidgetProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const stickyNotes: StickyNoteItem[] = widget.config?.stickyNotes || [];

  const saveNotes = useCallback(
    (notes: StickyNoteItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          stickyNotes: notes,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addNote = () => {
    const newNote: StickyNoteItem = {
      id: crypto.randomUUID(),
      content: "",
      color: DEFAULT_COLOR.value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveNotes([newNote, ...stickyNotes]);
    setEditingId(newNote.id);
  };

  const updateNote = (id: string, content: string) => {
    saveNotes(
      stickyNotes.map((note) =>
        note.id === id
          ? { ...note, content, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const updateNoteColor = (id: string, color: string) => {
    saveNotes(
      stickyNotes.map((note) =>
        note.id === id
          ? { ...note, color, updatedAt: new Date().toISOString() }
          : note
      )
    );
  };

  const deleteNote = (id: string) => {
    saveNotes(stickyNotes.filter((note) => note.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const getTextColor = (bgColor: string): string => {
    const colorConfig = NOTE_COLORS.find((c) => c.value === bgColor);
    return colorConfig?.text || NOTE_COLORS[0].text;
  };

  // Empty state
  if (stickyNotes.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center mb-3">
            <StickyNote className="w-6 h-6 text-yellow-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">Sin notas</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            Crea notas adhesivas rapidas
          </p>
          <Button size="sm" onClick={addNote}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva nota
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-muted-foreground">
              {stickyNotes.length} nota{stickyNotes.length !== 1 ? "s" : ""}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={addNote}
            title="Nueva nota"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Notes grid */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="grid grid-cols-1 @xs:grid-cols-2 @md:grid-cols-3 gap-2">
            <AnimatePresence mode="popLayout">
              {stickyNotes.map((note, index) => (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ delay: index * 0.03 }}
                  className={cn(
                    "group relative rounded-lg p-3 min-h-[80px] shadow-sm transition-shadow hover:shadow-md",
                    note.color,
                    getTextColor(note.color)
                  )}
                >
                  {/* Note actions */}
                  <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0 hover:bg-black/10 dark:hover:bg-white/10"
                          title="Cambiar color"
                        >
                          <Palette className="w-3 h-3" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-2" align="end">
                        <div className="grid grid-cols-3 gap-1">
                          {NOTE_COLORS.map((color) => (
                            <button
                              key={color.name}
                              onClick={() => updateNoteColor(note.id, color.value)}
                              className={cn(
                                "w-8 h-8 rounded-md border-2 transition-all",
                                color.value,
                                note.color === color.value
                                  ? "border-primary ring-2 ring-primary/50"
                                  : "border-transparent hover:border-primary/50"
                              )}
                              title={color.name}
                            />
                          ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 hover:bg-black/10 dark:hover:bg-white/10 text-destructive"
                      onClick={() => deleteNote(note.id)}
                      title="Eliminar"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>

                  {/* Note content */}
                  <Textarea
                    value={note.content}
                    onChange={(e) => updateNote(note.id, e.target.value)}
                    onFocus={() => setEditingId(note.id)}
                    onBlur={() => setEditingId(null)}
                    placeholder="Escribe aqui..."
                    className={cn(
                      "h-full min-h-[60px] w-full resize-none border-0 bg-transparent p-0 text-xs focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:opacity-50",
                      getTextColor(note.color),
                      "placeholder:text-current"
                    )}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
