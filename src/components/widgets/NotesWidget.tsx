"use client";

import { useState, useEffect } from "react";
import { StickyNote, Save, Check, Type, Download } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface NotesWidgetProps {
  widget: Widget;
}

export function NotesWidget({ widget }: NotesWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [notes, setNotes] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load notes from widget config or localStorage
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedNotes = widget.config?.noteContent || localStorage.getItem(`notes-${widget.id}`) || "";
      setNotes(savedNotes);

      // Load last saved time
      const savedTime = widget.config?.lastSaved;
      if (savedTime) {
        setLastSaved(new Date(savedTime));
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.id, widget.config]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setIsDirty(true);
  };

  const handleSave = () => {
    setIsSaving(true);
    const saveTime = new Date();

    // Save to localStorage
    localStorage.setItem(`notes-${widget.id}`, notes);

    // Save to widget config
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        noteContent: notes,
        lastSaved: saveTime.toISOString(),
      },
    });

    setTimeout(() => {
      setIsSaving(false);
      setIsDirty(false);
      setLastSaved(saveTime);
    }, 500);
  };

  const characterCount = notes.length;
  const wordCount = notes.trim() ? notes.trim().split(/\s+/).length : 0;

  const handleExport = () => {
    if (!notes.trim()) return;

    const blob = new Blob([notes], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `notas-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return null;
    const now = new Date();
    const diff = now.getTime() - lastSaved.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Guardado hace un momento";
    if (minutes === 1) return "Guardado hace 1 minuto";
    if (minutes < 60) return `Guardado hace ${minutes} minutos`;

    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "Guardado hace 1 hora";
    if (hours < 24) return `Guardado hace ${hours} horas`;

    return lastSaved.toLocaleDateString();
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full w-full">
        {/* Empty state - hidden when notes exist */}
        {notes === "" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3 pointer-events-none @md:gap-4">
            <div className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center @md:w-12 @md:h-12 @lg:w-14 @lg:h-14">
              <StickyNote className="w-4 h-4 text-muted-foreground @md:w-5 @md:h-5 @lg:w-6 @lg:h-6" />
            </div>
            <div className="px-4">
              <p className="text-xs text-muted-foreground mb-1 @md:text-sm @lg:text-base">
                Sin notas
              </p>
              <p className="text-xs text-muted-foreground/60 @md:text-xs @lg:text-sm">
                Haz clic para empezar a escribir
              </p>
            </div>
          </div>
        )}

        {/* Main textarea - fills all available space */}
        <div className="flex-1 min-h-0 relative">
          <Textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Escribe tus notas aquí..."
            className="h-full w-full resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent
                       text-xs leading-relaxed p-3
                       @xs:text-xs @xs:p-3
                       @sm:text-sm @sm:p-4 @sm:leading-relaxed
                       @md:text-sm @md:p-4
                       @lg:text-base @lg:p-5 @lg:leading-relaxed
                       placeholder:text-muted-foreground/40
                       focus:placeholder:text-muted-foreground/30
                       transition-all duration-200"
          />
        </div>

        {/* Bottom bar - responsive layout based on container size */}
        <div className="border-t bg-muted/30 backdrop-blur-sm">
          {/* Small containers: Just save button */}
          <div className="@container/footer">
            <div className="flex flex-col gap-2 p-2 @xs:p-2.5 @sm:p-3">
              {/* Save button - always visible when dirty */}
              {isDirty && (
                <Button
                  onClick={handleSave}
                  size="sm"
                  className="w-full gap-2 text-xs @sm:text-sm h-8 @sm:h-9"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
                      Guardar notas
                    </>
                  )}
                </Button>
              )}

              {/* Medium containers: Add character count and export */}
              {notes && (
                <div className="hidden @sm:flex items-center justify-between text-xs text-muted-foreground gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <Type className="w-3 h-3" />
                      {characterCount} caracteres
                    </span>
                    <span className="hidden @md:inline">
                      {wordCount} {wordCount === 1 ? 'palabra' : 'palabras'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Export button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExport}
                      className="h-6 px-2 text-xs"
                      title="Exportar notas"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      Exportar
                    </Button>

                    {/* Large containers: Add last saved indicator */}
                    {!isDirty && lastSaved && (
                      <span className="hidden @lg:flex items-center gap-1.5 text-xs text-muted-foreground/70">
                        <Check className="w-3 h-3" />
                        {formatLastSaved()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Extra small footer info for tiny containers */}
              {notes && !isDirty && (
                <div className="flex @sm:hidden items-center justify-between text-xs text-muted-foreground/70">
                  <span>{characterCount}</span>
                  {lastSaved && (
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Guardado
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Formatting hints - only visible on large containers */}
        {notes && !isDirty && (
          <div className="hidden @lg:block border-t bg-muted/20 px-5 py-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground/50">
              <span>Sugerencias:</span>
              <span>Usa # para títulos</span>
              <span>- para listas</span>
              <span>**negrita**</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
