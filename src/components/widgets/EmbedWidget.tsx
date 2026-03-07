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
import { useTranslation } from "@/lib/i18n";
import DOMPurify from "dompurify";

// Domains trusted enough for allow-same-origin in sandbox
const SAFE_EMBED_DOMAINS = [
  "youtube.com", "www.youtube.com", "youtube-nocookie.com", "www.youtube-nocookie.com",
  "open.spotify.com", "codepen.io", "codesandbox.io",
  "figma.com", "www.figma.com",
  "docs.google.com", "drive.google.com",
  "stackblitz.com",
  "excalidraw.com",
  "canva.com",
  "vimeo.com",
  "soundcloud.com",
];

function isSafeDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return SAFE_EMBED_DOMAINS.some(d => hostname === d || hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

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
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [_isFullscreen, _setIsFullscreen] = useState(false);

  const handleSaveAsLink = () => {
    const config = widget.config as EmbedConfig | undefined;
    if (config?.embedUrl) {
      const detectedType = detectEmbedType(config.embedUrl);
      useLinksStore.getState().openAddLinkModal({
        url: config.embedUrl,
        title: config.title || detectedType || t("embed.embeddedContent"),
        description: detectedType ? t("embed.embedOf", { type: detectedType }) : t("embed.embeddedContent"),
      });
      toast.success(t("embed.openingForm"));
    }
  };

  const config = widget.config as EmbedConfig | undefined;
  const embedType = config?.embedType || "url";
  const embedUrl = config?.embedUrl || "";
  const embedHtml = config?.embedHtml || "";
  const title = config?.title || "Embedded Content";
  const allowFullscreen = config?.allowFullscreen !== false;
  const sandbox = config?.sandbox || "allow-scripts allow-forms allow-popups allow-presentation";

  const [formData, setFormData] = useState<EmbedConfig>({
    embedType,
    embedUrl,
    embedHtml,
    title,
    allowFullscreen,
    sandbox,
  });

  const handleSave = () => {
    useWidgetStore.getState().updateWidget(widget.id, {
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
        <p className="text-sm text-muted-foreground mb-1">{t("embed.noContent")}</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {t("embed.addUrlHint")}
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t("embed.configure")}
        </Button>

        {/* Settings Dialog for empty state */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-lg glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-500" />
                {t("embed.configureEmbed")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>{t("embed.embedType")}</Label>
                <Select
                  value={formData.embedType}
                  onValueChange={(value: EmbedType) => setFormData({ ...formData, embedType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("embed.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="url">URL (iframe)</SelectItem>
                    <SelectItem value="html">{t("embed.htmlCode")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.embedType === "url" ? (
                <div className="space-y-2">
                  <Label htmlFor="embed-url">{t("embed.urlToEmbed")}</Label>
                  <Input
                    id="embed-url"
                    placeholder="https://..."
                    value={formData.embedUrl}
                    onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("embed.supportedServices")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="embed-html">{t("embed.htmlCode")}</Label>
                  <Textarea
                    id="embed-html"
                    placeholder="<iframe src='...'></iframe>"
                    value={formData.embedHtml}
                    onChange={(e) => setFormData({ ...formData, embedHtml: e.target.value })}
                    rows={5}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("embed.pasteEmbedCode")}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="embed-title">{t("embed.titleAccessibility")}</Label>
                <Input
                  id="embed-title"
                  placeholder={t("embed.embeddedContent")}
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("embed.allowFullscreen")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("embed.allowFullscreenDesc")}
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
                {t("embed.cancel")}
              </Button>
              <Button onClick={handleSave}>
                {t("embed.save")}
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
              <p className="text-xs text-muted-foreground">{t("embed.loading", { type: detectedType || "" })}</p>
            )}
          </div>
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{t("embed.loadError")}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {t("embed.loadErrorHint")}
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
            {t("embed.retry")}
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
          sandbox={isSafeDomain(embedUrl)
            ? "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
            : "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-presentation"
          }
          loading="lazy"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
        />
      ) : (
        // Use srcdoc iframe to sandbox HTML content and prevent styles/scripts from propagating
        <iframe
          srcDoc={(() => {
            const sanitizedHtml = typeof window !== 'undefined'
              ? DOMPurify.sanitize(embedHtml, {
                  ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'br', 'hr', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'blockquote', 'figure', 'figcaption', 'video', 'audio', 'source', 'canvas', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'g', 'text', 'defs', 'use', 'symbol', 'style'],
                  ALLOWED_ATTR: ['class', 'id', 'style', 'href', 'src', 'alt', 'width', 'height', 'target', 'rel', 'type', 'viewBox', 'xmlns', 'd', 'fill', 'stroke', 'stroke-width', 'cx', 'cy', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'points', 'transform', 'text-anchor', 'font-size', 'controls', 'autoplay', 'loop', 'muted'],
                  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form'],
                  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur', 'onsubmit', 'onchange', 'oninput'],
                })
              : embedHtml;
            return `
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
              <body>${sanitizedHtml}</body>
            </html>
          `;
          })()}
          className={cn(
            "absolute inset-0 w-full h-full border-0",
            isLoading && "invisible"
          )}
          title={title}
          sandbox="allow-scripts allow-forms allow-popups allow-presentation"
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
            title={t("embed.saveAsLink")}
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
              {t("embed.configureEmbed")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("embed.embedType")}</Label>
              <Select
                value={formData.embedType}
                onValueChange={(value: EmbedType) => setFormData({ ...formData, embedType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="url">URL (iframe)</SelectItem>
                  <SelectItem value="html">{t("embed.htmlCode")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.embedType === "url" ? (
              <div className="space-y-2">
                <Label htmlFor="embed-url-edit">{t("embed.urlToEmbed")}</Label>
                <Input
                  id="embed-url-edit"
                  placeholder="https://..."
                  value={formData.embedUrl}
                  onChange={(e) => setFormData({ ...formData, embedUrl: e.target.value })}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="embed-html-edit">{t("embed.htmlCode")}</Label>
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
              <Label htmlFor="embed-title-edit">{t("embed.title")}</Label>
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
              {t("embed.cancel")}
            </Button>
            <Button onClick={handleSave}>
              {t("embed.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
