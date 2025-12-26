"use client";

import { useState, useCallback } from "react";
import {
  Link,
  Search,
  Loader2,
  ExternalLink,
  Image as ImageIcon,
  X,
  Clock,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { toast } from "sonner";
import { ensureProtocol, extractHostname } from "@/lib/url-utils";

interface LinkPreviewerWidgetProps {
  widget: Widget;
}

interface PreviewData {
  id: string;
  url: string;
  title: string;
  description: string | null;
  image: string | null;
  favicon: string | null;
  timestamp: string;
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours}h`;

  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

export function LinkPreviewerWidget({ widget }: LinkPreviewerWidgetProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPreview, setCurrentPreview] = useState<PreviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const previewHistory: PreviewData[] = widget.config?.previewHistory || [];

  const saveHistory = useCallback(
    (items: PreviewData[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          previewHistory: items.slice(0, 10), // Keep last 10
        },
      });
    },
    [widget.id, widget.config]
  );

  const fetchPreview = async () => {
    if (!url.trim()) {
      toast.error("Ingresa una URL");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCurrentPreview(null);

    try {
      const normalizedUrl = ensureProtocol(url.trim());

      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      if (!response.ok) {
        throw new Error("Error al obtener la vista previa");
      }

      const data = await response.json();

      const preview: PreviewData = {
        id: crypto.randomUUID(),
        url: normalizedUrl,
        title: data.title || extractHostname(normalizedUrl),
        description: data.description || null,
        image: data.image || null,
        favicon: data.favicon || null,
        timestamp: new Date().toISOString(),
      };

      setCurrentPreview(preview);

      // Add to history if not duplicate
      const isDuplicate = previewHistory.some((p) => p.url === normalizedUrl);
      if (!isDuplicate) {
        saveHistory([preview, ...previewHistory]);
      }

      setUrl("");
      toast.success("Vista previa cargada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar la vista previa");
    } finally {
      setIsLoading(false);
    }
  };

  const loadFromHistory = (preview: PreviewData) => {
    setCurrentPreview(preview);
  };

  const clearHistory = () => {
    saveHistory([]);
    toast.success("Historial limpiado");
  };

  const removeFromHistory = (id: string) => {
    saveHistory(previewHistory.filter((p) => p.id !== id));
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Link className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-medium">Vista previa de enlaces</span>
        </div>

        {/* URL Input */}
        <div className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isLoading && fetchPreview()}
            placeholder="Ingresa una URL..."
            className="h-8 text-sm flex-1"
            disabled={isLoading}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={fetchPreview}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Error display */}
        {error && (
          <div className="p-2 rounded-md bg-destructive/10 text-destructive text-xs">
            {error}
          </div>
        )}

        {/* Current preview */}
        <AnimatePresence mode="wait">
          {currentPreview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-lg border bg-card overflow-hidden"
            >
              {/* Preview image */}
              {currentPreview.image && (
                <div className="relative aspect-video bg-muted overflow-hidden">
                  <img
                    src={currentPreview.image}
                    alt={currentPreview.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Preview content */}
              <div className="p-3">
                <div className="flex items-start gap-2">
                  {currentPreview.favicon && (
                    <img
                      src={currentPreview.favicon}
                      alt=""
                      className="w-4 h-4 rounded flex-shrink-0 mt-0.5"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-2">
                      {currentPreview.title}
                    </h3>
                    {currentPreview.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {currentPreview.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground/60 truncate flex-1">
                        {extractHostname(currentPreview.url)}
                      </span>
                      <a
                        href={currentPreview.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0"
                      >
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History section */}
        {previewHistory.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Historial
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-xs px-1.5 text-destructive"
                onClick={clearHistory}
              >
                Limpiar
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {previewHistory.map((preview) => (
                  <motion.div
                    key={preview.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group flex items-center gap-2 p-2 rounded-md bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => loadFromHistory(preview)}
                  >
                    {preview.favicon ? (
                      <img
                        src={preview.favicon}
                        alt=""
                        className="w-4 h-4 rounded flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{preview.title}</p>
                      <p className="text-[10px] text-muted-foreground/60 truncate">
                        {extractHostname(preview.url)}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 hidden @sm:inline">
                      {formatTimestamp(preview.timestamp)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(preview.id);
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty state when no preview and no history */}
        {!currentPreview && previewHistory.length === 0 && !isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mb-2">
              <ImageIcon className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresa una URL para ver su vista previa
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
