"use client";

import { useState, useEffect, useCallback } from "react";
import { Camera, RefreshCw, ExternalLink, Settings, Heart, Download, User, Loader2, Bookmark } from "lucide-react";
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
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface UnsplashWidgetProps {
  widget: Widget;
}

interface UnsplashConfig {
  query?: string;
  orientation?: "landscape" | "portrait" | "squarish";
  autoRefresh?: boolean;
  refreshInterval?: number; // in minutes
  showInfo?: boolean;
}

interface UnsplashPhoto {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  alt_description: string | null;
  description: string | null;
  user: {
    name: string;
    username: string;
    profile_image: {
      small: string;
    };
  };
  links: {
    html: string;
    download: string;
  };
  likes: number;
  color: string;
}

const TOPICS = [
  { value: "random", label: "Aleatorio" },
  { value: "nature", label: "Naturaleza" },
  { value: "architecture", label: "Arquitectura" },
  { value: "technology", label: "Tecnologia" },
  { value: "minimal", label: "Minimalista" },
  { value: "abstract", label: "Abstracto" },
  { value: "space", label: "Espacio" },
  { value: "city", label: "Ciudad" },
  { value: "travel", label: "Viajes" },
  { value: "food", label: "Comida" },
  { value: "animals", label: "Animales" },
  { value: "art", label: "Arte" },
];

export function UnsplashWidget({ widget }: UnsplashWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const { openAddLinkModal } = useLinksStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [photo, setPhoto] = useState<UnsplashPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveAsLink = () => {
    if (photo?.links?.html) {
      openAddLinkModal({
        url: photo.links.html,
        title: photo.alt_description || `Foto de ${photo.user.name}`,
        description: `Fotografía de ${photo.user.name} en Unsplash`,
      });
      toast.success("Abriendo formulario para guardar enlace");
    }
  };

  const config = widget.config as UnsplashConfig | undefined;
  const query = config?.query || "";
  const orientation = config?.orientation || "landscape";
  const autoRefresh = config?.autoRefresh || false;
  const refreshInterval = config?.refreshInterval || 30;
  const showInfo = config?.showInfo !== false;

  const [formData, setFormData] = useState<UnsplashConfig>({
    query,
    orientation,
    autoRefresh,
    refreshInterval,
    showInfo,
  });

  const fetchPhoto = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Using Unsplash Source API (no API key required for random photos)
      // Note: For production, you should use the official API with an API key
      const queryParam = query && query !== "random" ? `&query=${encodeURIComponent(query)}` : "";
      const orientationParam = `&orientation=${orientation}`;

      // Using the random photo endpoint via a CORS proxy
      const response = await fetch(
        `https://api.unsplash.com/photos/random?client_id=demo${queryParam}${orientationParam}`,
        {
          headers: {
            "Accept-Version": "v1",
          },
        }
      );

      if (!response.ok) {
        // Fallback to picsum if Unsplash fails
        const picsumUrl = `https://picsum.photos/${orientation === "portrait" ? "400/600" : "600/400"}`;
        setPhoto({
          id: "picsum-" + Date.now(),
          urls: {
            raw: picsumUrl,
            full: picsumUrl,
            regular: picsumUrl,
            small: picsumUrl,
            thumb: picsumUrl,
          },
          alt_description: "Random photo from Picsum",
          description: null,
          user: {
            name: "Picsum Photos",
            username: "picsum",
            profile_image: { small: "" },
          },
          links: {
            html: "https://picsum.photos",
            download: picsumUrl,
          },
          likes: 0,
          color: "#cccccc",
        });
        return;
      }

      const data = await response.json();
      setPhoto(data);
    } catch (err) {
      // Fallback to picsum on error
      const seed = Date.now();
      const picsumUrl = `https://picsum.photos/seed/${seed}/${orientation === "portrait" ? "400/600" : "600/400"}`;
      setPhoto({
        id: "picsum-" + seed,
        urls: {
          raw: picsumUrl,
          full: picsumUrl,
          regular: picsumUrl,
          small: picsumUrl,
          thumb: picsumUrl,
        },
        alt_description: "Random photo",
        description: null,
        user: {
          name: "Picsum Photos",
          username: "picsum",
          profile_image: { small: "" },
        },
        links: {
          html: "https://picsum.photos",
          download: picsumUrl,
        },
        likes: 0,
        color: "#cccccc",
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, orientation]);

  useEffect(() => {
    fetchPhoto();
  }, [fetchPhoto]);

  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchPhoto, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchPhoto]);

  const handleSave = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...formData,
      },
    });
    setIsSettingsOpen(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {/* Photo */}
      <AnimatePresence mode="wait">
        {photo && (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative h-full w-full"
          >
            <img
              src={photo.urls.regular || photo.urls.small}
              alt={photo.alt_description || "Unsplash photo"}
              className="w-full h-full object-cover"
              style={{ backgroundColor: photo.color }}
              loading="lazy"
            />

            {/* Gradient overlay for text */}
            {showInfo && (
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            )}

            {/* Photo info */}
            {showInfo && (
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    {photo.user.profile_image?.small && (
                      <img
                        src={photo.user.profile_image.small}
                        alt={photo.user.name}
                        className="w-6 h-6 rounded-full"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{photo.user.name}</p>
                      {photo.likes > 0 && (
                        <div className="flex items-center gap-1 text-xs text-white/70">
                          <Heart className="w-3 h-3" />
                          {photo.likes.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Actions overlay */}
            <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
              {photo.links?.html && (
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
                onClick={fetchPhoto}
                disabled={isLoading}
              >
                <RefreshCw className={cn("w-3.5 h-3.5 text-white", isLoading && "animate-spin")} />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                className="h-7 w-7 bg-black/50 hover:bg-black/70"
                onClick={() => setIsSettingsOpen(true)}
              >
                <Settings className="w-3.5 h-3.5 text-white" />
              </Button>
              {photo.links?.html && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-7 w-7 bg-black/50 hover:bg-black/70"
                  asChild
                >
                  <a href={photo.links.html} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 text-white" />
                  </a>
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && !photo && (
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <Camera className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={fetchPhoto}>
            Reintentar
          </Button>
        </div>
      )}

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Configurar Unsplash
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tema/Busqueda</Label>
              <Select
                value={formData.query}
                onValueChange={(value) => setFormData({ ...formData, query: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tema" />
                </SelectTrigger>
                <SelectContent>
                  {TOPICS.map((topic) => (
                    <SelectItem key={topic.value} value={topic.value}>
                      {topic.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O escribe tu propia busqueda:
              </p>
              <Input
                placeholder="ej. montanas, atardecer..."
                value={formData.query}
                onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Orientacion</Label>
              <Select
                value={formData.orientation}
                onValueChange={(value: "landscape" | "portrait" | "squarish") =>
                  setFormData({ ...formData, orientation: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona orientacion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="landscape">Horizontal</SelectItem>
                  <SelectItem value="portrait">Vertical</SelectItem>
                  <SelectItem value="squarish">Cuadrada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-refresh</Label>
                <p className="text-xs text-muted-foreground">
                  Cambia la foto automaticamente
                </p>
              </div>
              <Switch
                checked={formData.autoRefresh}
                onCheckedChange={(checked) => setFormData({ ...formData, autoRefresh: checked })}
              />
            </div>

            {formData.autoRefresh && (
              <div className="space-y-2">
                <Label>Intervalo (minutos)</Label>
                <Input
                  type="number"
                  min="5"
                  max="120"
                  value={formData.refreshInterval}
                  onChange={(e) => setFormData({ ...formData, refreshInterval: parseInt(e.target.value) || 30 })}
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar informacion</Label>
                <p className="text-xs text-muted-foreground">
                  Muestra el fotografo y likes
                </p>
              </div>
              <Switch
                checked={formData.showInfo}
                onCheckedChange={(checked) => setFormData({ ...formData, showInfo: checked })}
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
