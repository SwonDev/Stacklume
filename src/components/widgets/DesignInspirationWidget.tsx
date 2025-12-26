"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Lightbulb,
  RefreshCw,
  Heart,
  ExternalLink,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget, DesignInspirationWidgetConfig, DesignInspirationItem } from "@/types/widget";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";

interface DesignInspirationWidgetProps {
  widget: Widget;
}

interface UnsplashPhoto {
  id: string;
  alt_description: string | null;
  urls: {
    regular: string;
  };
  user: {
    name: string;
    links: {
      html: string;
    };
  };
  links: {
    html: string;
  };
}

// Curated design inspiration with Unsplash images
const INSPIRATION_CATEGORIES = [
  { id: "ui", label: "UI/UX", query: "ui+design+interface" },
  { id: "web", label: "Web", query: "website+design+modern" },
  { id: "mobile", label: "Mobile", query: "mobile+app+design" },
  { id: "branding", label: "Branding", query: "branding+logo+design" },
  { id: "illustration", label: "Ilustracion", query: "digital+illustration+art" },
  { id: "3d", label: "3D", query: "3d+render+design" },
];

// Curated inspiration sources (static fallback)
const CURATED_INSPIRATIONS: DesignInspirationItem[] = [
  {
    id: "1",
    imageUrl: "https://images.unsplash.com/photo-1545235617-9465d2a55698?w=800",
    title: "Dashboard Moderno",
    author: "UI Collective",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["ui", "dashboard", "dark"],
  },
  {
    id: "2",
    imageUrl: "https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800",
    title: "App Minimalista",
    author: "Design Studio",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["mobile", "minimal", "clean"],
  },
  {
    id: "3",
    imageUrl: "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800",
    title: "Branding Corporativo",
    author: "Brand Agency",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["branding", "identity", "corporate"],
  },
  {
    id: "4",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800",
    title: "Gradientes Abstractos",
    author: "Abstract Art",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["abstract", "gradient", "colorful"],
  },
  {
    id: "5",
    imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    title: "Tipografia Creativa",
    author: "Type Designer",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["typography", "creative", "bold"],
  },
  {
    id: "6",
    imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=800",
    title: "3D Render Futurista",
    author: "3D Artist",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["3d", "render", "futuristic"],
  },
  {
    id: "7",
    imageUrl: "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800",
    title: "Website E-commerce",
    author: "Web Studio",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["web", "ecommerce", "modern"],
  },
  {
    id: "8",
    imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800",
    title: "Ilustracion Digital",
    author: "Illustrator",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["illustration", "digital", "art"],
  },
  {
    id: "9",
    imageUrl: "https://images.unsplash.com/photo-1579403124614-197f69d8187b?w=800",
    title: "Desarrollo Web",
    author: "Dev Designer",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["code", "development", "tech"],
  },
  {
    id: "10",
    imageUrl: "https://images.unsplash.com/photo-1542744094-24638eff58bb?w=800",
    title: "Packaging Creativo",
    author: "Package Designer",
    source: "Unsplash",
    sourceUrl: "https://unsplash.com",
    tags: ["packaging", "product", "branding"],
  },
];

export function DesignInspirationWidget({ widget }: DesignInspirationWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const storeWidget = useWidgetStore(
    (state) => state.widgets.find((w) => w.id === widget.id)
  );
  const { openAddLinkModal } = useLinksStore();

  const currentWidget = storeWidget || widget;
  const config = currentWidget.config as DesignInspirationWidgetConfig | undefined;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [inspirations, setInspirations] = useState<DesignInspirationItem[]>(CURATED_INSPIRATIONS);
  const [activeTab, setActiveTab] = useState<"explore" | "favorites">("explore");

  const favorites = config?.savedInspirations || [];
  const currentItem = inspirations[currentIndex];
  const isFavorite = favorites.some((f) => f.id === currentItem?.id);

  // Fetch inspiration from Unsplash API (with fallback)
  const _fetchInspiration = useCallback(async (category?: string) => {
    setIsLoading(true);
    try {
      const query = category
        ? INSPIRATION_CATEGORIES.find((c) => c.id === category)?.query || "design"
        : "ui+ux+design";

      const response = await fetch(
        `https://api.unsplash.com/photos/random?query=${query}&count=10&client_id=demo`,
        {
          headers: { "Accept-Version": "v1" },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const newInspirations: DesignInspirationItem[] = data.map((photo: UnsplashPhoto) => ({
          id: photo.id,
          imageUrl: photo.urls.regular,
          title: photo.alt_description || "Diseno Inspirador",
          author: photo.user.name,
          authorUrl: photo.user.links.html,
          source: "Unsplash",
          sourceUrl: photo.links.html,
          tags: category ? [category] : ["design"],
        }));
        setInspirations(newInspirations);
        setCurrentIndex(0);
      }
    } catch (_error) {
      // Use curated fallback
      setInspirations(CURATED_INSPIRATIONS);
      setCurrentIndex(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initialize with curated content
    setInspirations(CURATED_INSPIRATIONS);
  }, []);

  const shuffleInspiration = () => {
    const newIndex = Math.floor(Math.random() * inspirations.length);
    setCurrentIndex(newIndex);
    toast.success("Nueva inspiracion");
  };

  const nextInspiration = () => {
    setCurrentIndex((prev) => (prev + 1) % inspirations.length);
  };

  const prevInspiration = () => {
    setCurrentIndex((prev) => (prev - 1 + inspirations.length) % inspirations.length);
  };

  const toggleFavorite = () => {
    if (!currentItem) return;

    const newFavorites = isFavorite
      ? favorites.filter((f) => f.id !== currentItem.id)
      : [...favorites, currentItem].slice(-30); // Keep last 30 favorites

    updateWidget(currentWidget.id, {
      config: {
        ...currentWidget.config,
        savedInspirations: newFavorites,
      },
    });

    toast.success(isFavorite ? "Eliminado de favoritos" : "Guardado en favoritos");
  };

  const saveAsLink = () => {
    if (!currentItem) return;
    openAddLinkModal({
      url: currentItem.sourceUrl,
      title: currentItem.title,
      description: `Inspiracion de ${currentItem.author} en ${currentItem.source}`,
    });
    toast.success("Abriendo formulario para guardar enlace");
  };

  const loadFavorite = (item: DesignInspirationItem) => {
    const index = inspirations.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      setCurrentIndex(index);
    } else {
      // Add to current inspirations and show
      setInspirations((prev) => [item, ...prev]);
      setCurrentIndex(0);
    }
    setActiveTab("explore");
  };

  return (
    <div className="h-full w-full flex flex-col @container">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10">
            <Lightbulb className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-xs font-semibold">Inspiracion</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={shuffleInspiration}
            disabled={isLoading}
            title="Nueva inspiracion"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "explore" | "favorites")} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="grid w-full grid-cols-2 h-7 mb-2">
          <TabsTrigger value="explore" className="text-[10px]">
            <Sparkles className="w-3 h-3 mr-1" />
            Explorar
          </TabsTrigger>
          <TabsTrigger value="favorites" className="text-[10px]">
            <Heart className="w-3 h-3 mr-1" />
            Favoritos ({favorites.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="explore" className="flex-1 overflow-hidden flex flex-col mt-0">
          {/* Image preview */}
          <div className="relative rounded-lg overflow-hidden mb-2 flex-1 min-h-0 bg-secondary">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : currentItem ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItem.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full w-full"
                >
                  <img
                    src={currentItem.imageUrl}
                    alt={currentItem.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                  {/* Info overlay */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                    <p className="text-xs font-medium line-clamp-1">{currentItem.title}</p>
                    <p className="text-[10px] text-white/70">por {currentItem.author}</p>
                  </div>

                  {/* Action buttons */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-black/50 hover:bg-black/70"
                      onClick={toggleFavorite}
                    >
                      <Heart
                        className={cn(
                          "w-3.5 h-3.5 text-white",
                          isFavorite && "fill-red-500 text-red-500"
                        )}
                      />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-black/50 hover:bg-black/70"
                      onClick={saveAsLink}
                    >
                      <Bookmark className="w-3.5 h-3.5 text-white" />
                    </Button>
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 bg-black/50 hover:bg-black/70"
                      asChild
                    >
                      <a
                        href={currentItem.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white" />
                      </a>
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground">Sin inspiraciones</p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={prevInspiration}
              disabled={isLoading}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex gap-1">
              {inspirations.slice(0, 5).map((_, idx) => (
                <button
                  key={idx}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full transition-colors",
                    idx === currentIndex ? "bg-primary" : "bg-muted"
                  )}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
              {inspirations.length > 5 && (
                <span className="text-[10px] text-muted-foreground">
                  +{inspirations.length - 5}
                </span>
              )}
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={nextInspiration}
              disabled={isLoading}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Tags */}
          {currentItem?.tags && (
            <div className="flex flex-wrap gap-1 mt-2">
              {currentItem.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[9px] h-4 px-1.5">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="favorites" className="flex-1 overflow-hidden mt-0">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Heart className="w-8 h-8 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground">Sin favoritos aun</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Guarda inspiraciones para verlas aqui
              </p>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="grid grid-cols-2 gap-1.5">
                {favorites.map((item) => (
                  <button
                    key={item.id}
                    className="relative aspect-[4/3] rounded-md overflow-hidden group"
                    onClick={() => loadFavorite(item)}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[10px] text-white font-medium text-center px-1 line-clamp-2">
                        {item.title}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
