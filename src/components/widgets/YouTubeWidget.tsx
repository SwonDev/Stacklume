"use client";

import { useState } from "react";
import { Play, Settings, ExternalLink, Loader2, AlertCircle, Bookmark } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface YouTubeWidgetProps {
  widget: Widget;
}

interface YouTubeConfig {
  videoUrl?: string;
  videoId?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  startTime?: number;
}

function extractVideoId(url: string): string | null {
  // Patterns to match:
  // https://www.youtube.com/watch?v=VIDEO_ID
  // https://youtu.be/VIDEO_ID
  // https://www.youtube.com/embed/VIDEO_ID
  // https://www.youtube.com/v/VIDEO_ID
  // https://www.youtube.com/shorts/VIDEO_ID

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return null;
}

function buildEmbedUrl(videoId: string, config: YouTubeConfig): string {
  const params = new URLSearchParams();

  // Controls
  params.set("controls", config.controls !== false ? "1" : "0");

  // Autoplay (requires muted)
  if (config.autoplay) {
    params.set("autoplay", "1");
    params.set("mute", "1"); // Required for autoplay
  } else if (config.muted) {
    params.set("mute", "1");
  }

  // Loop
  if (config.loop) {
    params.set("loop", "1");
    params.set("playlist", videoId); // Required for loop
  }

  // Start time
  if (config.startTime && config.startTime > 0) {
    params.set("start", config.startTime.toString());
  }

  // Additional settings
  params.set("rel", "0"); // Don't show related videos
  params.set("modestbranding", "1"); // Minimal YouTube branding

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

export function YouTubeWidget({ widget }: YouTubeWidgetProps) {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleSaveAsLink = () => {
    const config = widget.config as YouTubeConfig | undefined;
    if (config?.videoUrl) {
      useLinksStore.getState().openAddLinkModal({
        url: config.videoUrl,
        title: t("youtube.videoTitle"),
        description: t("youtube.videoTitle"),
      });
      toast.success(t("youtube.openingForm"));
    }
  };

  const [formData, setFormData] = useState<YouTubeConfig>({
    videoUrl: widget.config?.videoUrl || "",
    autoplay: widget.config?.autoplay || false,
    muted: widget.config?.muted || false,
    loop: widget.config?.loop || false,
    controls: widget.config?.controls !== false,
    startTime: widget.config?.startTime || 0,
  });

  const config = widget.config as YouTubeConfig | undefined;
  const videoId = config?.videoUrl ? extractVideoId(config.videoUrl) : null;

  const handleSave = () => {
    const newVideoId = formData.videoUrl ? extractVideoId(formData.videoUrl) : null;

    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
        videoId: newVideoId,
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

  // Empty state
  if (!videoId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mb-3">
          <Play className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">{t("youtube.noVideo")}</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {t("youtube.addUrlHint")}
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t("youtube.configure")}
        </Button>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-md glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Play className="w-5 h-5 text-red-500" />
                {t("youtube.configureYoutube")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">{t("youtube.videoUrl")}</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("youtube.supportedUrls")}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="start-time">{t("youtube.startTime")}</Label>
                <Input
                  id="start-time"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={formData.startTime || ""}
                  onChange={(e) => setFormData({ ...formData, startTime: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("youtube.showControls")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("youtube.showControlsDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.controls}
                  onCheckedChange={(checked) => setFormData({ ...formData, controls: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autoplay</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("youtube.autoplayDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.autoplay}
                  onCheckedChange={(checked) => setFormData({ ...formData, autoplay: checked, muted: checked ? true : formData.muted })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Loop</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("youtube.loopDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.loop}
                  onCheckedChange={(checked) => setFormData({ ...formData, loop: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
                {t("youtube.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={!formData.videoUrl}>
                {t("youtube.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(videoId, config || {});

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-red-500" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{t("youtube.loadError")}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            {t("youtube.retry")}
          </Button>
        </div>
      )}

      <iframe
        src={embedUrl}
        className={cn(
          "absolute inset-0 w-full h-full border-0",
          isLoading && "invisible"
        )}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="YouTube Video"
      />

      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-20">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={handleSaveAsLink}
          title={t("youtube.saveAsLink")}
        >
          <Bookmark className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={() => setIsSettingsOpen(true)}
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          asChild
        >
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-red-500" />
              {t("youtube.configureYoutube")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="youtube-url-edit">{t("youtube.videoUrl")}</Label>
              <Input
                id="youtube-url-edit"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time-edit">{t("youtube.startTime")}</Label>
              <Input
                id="start-time-edit"
                type="number"
                min="0"
                placeholder="0"
                value={formData.startTime || ""}
                onChange={(e) => setFormData({ ...formData, startTime: parseInt(e.target.value) || 0 })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>{t("youtube.showControls")}</Label>
              </div>
              <Switch
                checked={formData.controls}
                onCheckedChange={(checked) => setFormData({ ...formData, controls: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Autoplay</Label>
              </div>
              <Switch
                checked={formData.autoplay}
                onCheckedChange={(checked) => setFormData({ ...formData, autoplay: checked, muted: checked ? true : formData.muted })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Loop</Label>
              </div>
              <Switch
                checked={formData.loop}
                onCheckedChange={(checked) => setFormData({ ...formData, loop: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.videoUrl}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
