"use client";

import { useState } from "react";
import { Code, Settings, ExternalLink, Loader2, AlertCircle, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface EmbedWidgetProps {
  widget: Widget;
}

type EmbedType = "url" | "html";

interface EmbedConfig {
  embedType?: EmbedType;
  embedUrl?: string;
  embedHtml?: string;
  title?: string;
  allowFullscreen?: boolean;
  sandbox?: string;
}

// Common embed presets
const EMBED_PRESETS = [
  { name: "Google Maps", pattern: "google.com/maps/embed" },
  { name: "Google Docs", pattern: "docs.google.com" },
  { name: "Google Sheets", pattern: "sheets.google.com" },
  { name: "Google Slides", pattern: "slides.google.com" },
  { name: "Figma", pattern: "figma.com/embed" },
  { name: "Notion", pattern: "notion.so" },
  { name: "Airtable", pattern: "airtable.com/embed" },
  { name: "Typeform", pattern: "typeform.com" },
  { name: "Calendly", pattern: "calendly.com" },
  { name: "Loom", pattern: "loom.com/embed" },
  { name: "Miro", pattern: "miro.com/app/embed" },
  { name: "Excalidraw", pattern: "excalidraw.com" },
];

function detectEmbedType(url: string): string | null {
  for (const preset of EMBED_PRESETS) {
    if (url.includes(preset.pattern)) {
      return preset.name;
    }
  }
  return null;
}

export function EmbedWidget({ widget }: EmbedWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const { openAddLinkModal } = useLinksStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [_isFullscreen, _setIsFullscreen] = useState(false);

  const handleSaveAsLink = () => {
    const config = widget.config as EmbedConfig | undefined;
    if (config?.embedUrl) {
      const detectedType = detectEmbedType(config.embedUrl);
      openAddLinkModal({
        url: config.embedUrl,
        title: config.title || detectedType || "Contenido embebido",
        description: detectedType ? `Embed de ${detectedType}` : "Contenido embebido",
      });
      toast.success("Abriendo formulario para guardar enlace");
    }
  };

  const config = widget.config as EmbedConfig | undefined;
  const embedType = config?.embedType || "url";
  const embedUrl = config?.embedUrl || "";
  const embedHtml = config?.embedHtml || "";
  const title = config?.title || "Embedded Content";
  const allowFullscreen = config?.allowFullscreen !== false;
  const sandbox = config?.sandbox || "allow-scripts allow-same-origin allow-forms allow-popups";

  const [formData, setFormData] = useState<EmbedConfig>({
    embedType,
    embedUrl,
    embedHtml,
    title,
    allowFullscreen,
    sandbox,
  });

  const handleSave = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
      },
    });
    setIsSettingsOpen(false);
    setIsLoading(true);
    setHasError(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const hasContent = embedType === "url" ? !!embedUrl : !!embedHtml;
  const detectedType = embedUrl ? detectEmbedType(embedUrl) : null;

  // Empty state
  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
          <Code className="w-6 h-6 text-purple-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">No hay contenido embebido</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          Agrega una URL o codigo HTML para embeber
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          Configurar
        </Button>

        {/* Settings Dialog for empty state */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-lg glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-500" />
                Configurar Embed
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tipo de embed</Label>
                <Select
                  value={formData.embedType}
                  onValueChange={(value: EmbedType) => setFormData({ ...formData, embedType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL (iframe)</SelectItem>
                    <SelectItem value="html">Codigo HTML</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.embedType === "url" ? (
                <div className="space-y-2">
                  <Label htmlFor="embed-url">URL a embeber</Label>
                  <Input
                    id="embed-url"
                    placeholder="https://..."
                    value={formData.embedUrl}
                    onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Soporta: Google Maps, Docs, Figma, Notion, Airtable, Typeform, etc.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="embed-html">Codigo HTML</Label>
                  <Textarea
                    id="embed-html"
                    placeholder="<iframe src='...'></iframe>"
                    value={formData.embedHtml}
                    onChange={(e) => setFormData({ ...formData, embedHtml: e.target.value })}
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pega el codigo de embed proporcionado por el servicio
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="embed-title">Titulo (para accesibilidad)</Label>
                <Input
                  id="embed-title"
                  placeholder="Contenido embebido"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permitir pantalla completa</Label>
                  <p className="text-xs text-muted-foreground">
                    Permite expandir el embed
                  </p>
                </div>
                <Switch
                  checked={formData.allowFullscreen}
                  onCheckedChange={(checked) => setFormData({ ...formData, allowFullscreen: checked })}
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

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            {detectedType && (
              <p className="text-xs text-muted-foreground">Cargando {detectedType}...</p>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">Error al cargar el contenido</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Es posible que el sitio no permita embeds
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Embed content */}
      {embedType === "url" ? (
        <iframe
          src={embedUrl}
          className={cn(
            "absolute inset-0 w-full h-full border-0",
            isLoading && "invisible"
          )}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen={allowFullscreen}
          sandbox={sandbox}
          loading="lazy"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      ) : (
        // Use srcdoc iframe to sandbox HTML content and prevent styles/scripts from propagating
        <iframe
          srcDoc={`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  * { margin: 0; padding: 0; box-sizing: border-box; }
                  html, body { width: 100%; height: 100%; overflow: hidden; }
                  body { display: flex; align-items: center; justify-content: center; }
                  iframe { width: 100%; height: 100%; border: none; }
                </style>
              </head>
              <body>${embedHtml}</body>
            </html>
          `}
          className={cn(
            "absolute inset-0 w-full h-full border-0",
            isLoading && "invisible"
          )}
          title={title}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
          allowFullScreen={allowFullscreen}
          loading="lazy"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      )}

      {/* Actions overlay - pointer-events handling for iframe interaction */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-20 pointer-events-auto">
        {detectedType && (
          <span className="text-[10px] bg-black/50 text-white px-2 py-1 rounded">
            {detectedType}
          </span>
        )}
        {embedUrl && (
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-black/50 hover:bg-black/70"
            onClick={handleSaveAsLink}
            title="Guardar como enlace"
          >
            <Bookmark className="w-3.5 h-3.5 text-white" />
          </Button>
        )}
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7 bg-black/50 hover:bg-black/70"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-3.5 h-3.5 text-white" />
        </Button>
        {embedUrl && (
          <Button
            size="icon"
            variant="secondary"
            className="h-7 w-7 bg-black/50 hover:bg-black/70"
            asChild
          >
            <a href={embedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5 text-white" />
            </a>
          </Button>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-lg glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-500" />
              Configurar Embed
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de embed</Label>
              <Select
                value={formData.embedType}
                onValueChange={(value: EmbedType) => setFormData({ ...formData, embedType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL (iframe)</SelectItem>
                  <SelectItem value="html">Codigo HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.embedType === "url" ? (
              <div className="space-y-2">
                <Label htmlFor="embed-url-edit">URL a embeber</Label>
                <Input
                  id="embed-url-edit"
                  placeholder="https://..."
                  value={formData.embedUrl}
                  onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="embed-html-edit">Codigo HTML</Label>
                <Textarea
                  id="embed-html-edit"
                  placeholder="<iframe src='...'></iframe>"
                  value={formData.embedHtml}
                  onChange={(e) => setFormData({ ...formData, embedHtml: e.target.value })}
                  rows={5}
                  className="font-mono text-xs"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="embed-title-edit">Titulo</Label>
              <Input
                id="embed-title-edit"
                placeholder="Contenido embebido"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Permitir pantalla completa</Label>
              </div>
              <Switch
                checked={formData.allowFullscreen}
                onCheckedChange={(checked) => setFormData({ ...formData, allowFullscreen: checked })}
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
