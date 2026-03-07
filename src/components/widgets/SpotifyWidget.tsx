"use client";

import { useState } from "react";
import { Music, Settings, ExternalLink, Loader2, Bookmark, AlertCircle } from "lucide-react";
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
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface SpotifyWidgetProps {
  widget: Widget;
}

type SpotifyTheme = "0" | "1"; // 0 = normal, 1 = compact/dark
type SpotifyType = "track" | "album" | "playlist" | "artist" | "episode" | "show";

interface SpotifyConfig {
  spotifyUrl?: string;
  spotifyId?: string;
  spotifyType?: SpotifyType;
  theme?: SpotifyTheme;
  compact?: boolean;
}

function extractSpotifyInfo(url: string): { type: SpotifyType; id: string } | null {
  // Patterns to match:
  // https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT
  // https://open.spotify.com/album/4cOdK2wGLETKBW3PvgPWqT
  // https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M
  // https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt
  // spotify:track:4cOdK2wGLETKBW3PvgPWqT

  const urlPattern = /open\.spotify\.com\/(track|album|playlist|artist|episode|show)\/([a-zA-Z0-9]+)/;
  const uriPattern = /spotify:(track|album|playlist|artist|episode|show):([a-zA-Z0-9]+)/;

  const urlMatch = url.match(urlPattern);
  if (urlMatch) {
    return { type: urlMatch[1] as SpotifyType, id: urlMatch[2] };
  }

  const uriMatch = url.match(uriPattern);
  if (uriMatch) {
    return { type: uriMatch[1] as SpotifyType, id: uriMatch[2] };
  }

  return null;
}

function buildEmbedUrl(type: SpotifyType, id: string, config: SpotifyConfig): string {
  const params = new URLSearchParams();

  // Theme (0 = normal, 1 = dark/compact background)
  params.set("theme", config.theme || "0");

  // UTM parameters for analytics
  params.set("utm_source", "stacklume");

  return `https://open.spotify.com/embed/${type}/${id}?${params.toString()}`;
}

const SPOTIFY_TYPE_LABEL_KEYS: Record<SpotifyType, string> = {
  track: "spotify.typeTrack",
  album: "spotify.typeAlbum",
  playlist: "spotify.typePlaylist",
  artist: "spotify.typeArtist",
  episode: "spotify.typeEpisode",
  show: "spotify.typePodcast",
};

export function SpotifyWidget({ widget }: SpotifyWidgetProps) {
  const { t } = useTranslation();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleSaveAsLink = () => {
    const config = widget.config as SpotifyConfig | undefined;
    if (config?.spotifyUrl) {
      const spotifyInfo = extractSpotifyInfo(config.spotifyUrl);
      const typeLabel = spotifyInfo ? t(SPOTIFY_TYPE_LABEL_KEYS[spotifyInfo.type]) : t("spotify.content");
      useLinksStore.getState().openAddLinkModal({
        url: config.spotifyUrl,
        title: `Spotify ${typeLabel}`,
        description: t("spotify.contentFrom", { type: typeLabel }),
      });
      toast.success(t("spotify.openingForm"));
    }
  };

  const [formData, setFormData] = useState<SpotifyConfig>({
    spotifyUrl: widget.config?.spotifyUrl || "",
    theme: widget.config?.spotifyTheme || "0",
    compact: widget.config?.compact || false,
  });

  const config = widget.config as SpotifyConfig | undefined;
  const spotifyInfo = config?.spotifyUrl ? extractSpotifyInfo(config.spotifyUrl) : null;

  const handleSave = () => {
    const newSpotifyInfo = formData.spotifyUrl ? extractSpotifyInfo(formData.spotifyUrl) : null;

    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        spotifyUrl: formData.spotifyUrl,
        spotifyTheme: formData.theme,
        compact: formData.compact,
        spotifyId: newSpotifyInfo?.id,
        spotifyType: newSpotifyInfo?.type,
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
  if (!spotifyInfo) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
        <div className="w-12 h-12 rounded-full bg-[#1DB954]/20 flex items-center justify-center mb-3">
          <Music className="w-6 h-6 text-[#1DB954]" />
        </div>
        <p className="text-sm text-muted-foreground mb-1">{t("spotify.noSpotify")}</p>
        <p className="text-xs text-muted-foreground/60 mb-4">
          {t("spotify.addUrlHint")}
        </p>
        <Button size="sm" onClick={() => setIsSettingsOpen(true)}>
          <Settings className="w-4 h-4 mr-2" />
          {t("spotify.configure")}
        </Button>

        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-md glass">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Music className="w-5 h-5 text-[#1DB954]" />
                {t("spotify.configureSpotify")}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="spotify-url">{t("spotify.spotifyUrl")}</Label>
                <Input
                  id="spotify-url"
                  placeholder="https://open.spotify.com/track/..."
                  value={formData.spotifyUrl}
                  onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  {t("spotify.supportedTypes")}
                </p>
              </div>

              <div className="space-y-2">
                <Label>{t("spotify.theme")}</Label>
                <Select
                  value={formData.theme}
                  onValueChange={(value: SpotifyTheme) => setFormData({ ...formData, theme: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("spotify.selectTheme")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">{t("spotify.themeNormal")}</SelectItem>
                    <SelectItem value="1">{t("spotify.themeDark")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t("spotify.compactMode")}</Label>
                  <p className="text-xs text-muted-foreground">
                    {t("spotify.compactModeDesc")}
                  </p>
                </div>
                <Switch
                  checked={formData.compact}
                  onCheckedChange={(checked) => setFormData({ ...formData, compact: checked })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
                {t("spotify.cancel")}
              </Button>
              <Button onClick={handleSave} disabled={!formData.spotifyUrl}>
                {t("spotify.save")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const embedUrl = buildEmbedUrl(spotifyInfo.type, spotifyInfo.id, config || {});

  return (
    <div className="relative h-full w-full overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-[#1DB954]" />
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 z-10">
          <AlertCircle className="w-8 h-8 text-destructive mb-2" />
          <p className="text-sm text-muted-foreground">{t("spotify.loadError")}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
            }}
          >
            {t("spotify.retry")}
          </Button>
        </div>
      )}

      <iframe
        src={embedUrl}
        className={cn(
          "absolute inset-0 w-full h-full border-0",
          isLoading && "invisible"
        )}
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        title="Spotify Embed"
      />

      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity z-20">
        <Button
          size="icon"
          variant="secondary"
          className="h-7 w-7"
          onClick={handleSaveAsLink}
          title={t("spotify.saveAsLink")}
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
            href={config?.spotifyUrl}
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
              <Music className="w-5 h-5 text-[#1DB954]" />
              Configurar Spotify
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="spotify-url-edit">{t("spotify.spotifyUrl")}</Label>
              <Input
                id="spotify-url-edit"
                placeholder="https://open.spotify.com/track/..."
                value={formData.spotifyUrl}
                onChange={(e) => setFormData({ ...formData, spotifyUrl: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("spotify.theme")}</Label>
              <Select
                value={formData.theme}
                onValueChange={(value: SpotifyTheme) => setFormData({ ...formData, theme: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Normal</SelectItem>
                  <SelectItem value="1">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Modo compacto</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra una version mas pequena
                </p>
              </div>
              <Switch
                checked={formData.compact}
                onCheckedChange={(checked) => setFormData({ ...formData, compact: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsSettingsOpen(false)}>
              {t("spotify.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!formData.spotifyUrl}>
              {t("spotify.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
