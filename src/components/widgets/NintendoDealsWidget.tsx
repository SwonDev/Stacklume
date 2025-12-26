"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Gamepad2,
  RefreshCw,
  ExternalLink,
  Plus,
  Sparkles,
  ChevronDown,
  TrendingUp,
  Tag,
  Percent,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";

interface NintendoDealsWidgetProps {
  widget: Widget;
}

interface NintendoGame {
  id: string;
  nsuid: string;
  title: string;
  description: string;
  imageUrl: string;
  heroImage?: string;
  gallery: string[]; // Array of screenshot URLs for preview
  publisher: string;
  releaseDate: string;
  regularPrice: number;
  currentPrice: number;
  currency: string;
  discountPercent: number;
  isOnSale: boolean;
  saleEndsAt?: string;
  playerCount: string;
  rating?: string;
  storeUrl: string;
  genres: string[];
  platforms: string[];
}

interface CategoryState {
  games: NintendoGame[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  offset: number;
}

type CategoryKey = "sales" | "ranking" | "new";
const ITEMS_PER_LOAD = 30;

const CATEGORY_INFO: Record<CategoryKey, { label: string; shortLabel: string; icon: typeof Sparkles }> = {
  sales: { label: "Ofertas", shortLabel: "Oferta", icon: Tag },
  ranking: { label: "Top Ventas", shortLabel: "Top", icon: TrendingUp },
  new: { label: "Novedades", shortLabel: "Nuevo", icon: Sparkles },
};

const CATEGORY_ORDER: CategoryKey[] = ["sales", "ranking", "new"];

// Sort options
type SortKey = "default" | "discount_desc" | "discount_asc" | "price_asc" | "price_desc" | "name_asc" | "date_desc";

interface SortOption {
  key: SortKey;
  label: string;
  shortLabel: string;
  icon: "up" | "down" | "default";
}

const SORT_OPTIONS: SortOption[] = [
  { key: "default", label: "Por defecto", shortLabel: "Defecto", icon: "default" },
  { key: "discount_desc", label: "Mayor descuento", shortLabel: "% Mayor", icon: "down" },
  { key: "discount_asc", label: "Menor descuento", shortLabel: "% Menor", icon: "up" },
  { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "$ Menor", icon: "up" },
  { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "$ Mayor", icon: "down" },
  { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  { key: "date_desc", label: "Más recientes", shortLabel: "Reciente", icon: "down" },
];

// Sort function - creates a new sorted array
function sortGames(games: NintendoGame[], sortKey: SortKey): NintendoGame[] {
  // Always create a new array to ensure React detects the change
  const sorted = [...games];

  switch (sortKey) {
    case "discount_desc":
      sorted.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
      break;
    case "discount_asc":
      sorted.sort((a, b) => (a.discountPercent || 0) - (b.discountPercent || 0));
      break;
    case "price_asc":
      sorted.sort((a, b) => (a.currentPrice || 0) - (b.currentPrice || 0));
      break;
    case "price_desc":
      sorted.sort((a, b) => (b.currentPrice || 0) - (a.currentPrice || 0));
      break;
    case "name_asc":
      sorted.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "date_desc":
      sorted.sort((a, b) => {
        const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
        const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
        return dateB - dateA;
      });
      break;
    case "default":
    default:
      // Default: keep original order (API already sorts by relevance/discount)
      break;
  }

  return sorted;
}

const initialCategoryState: CategoryState = {
  games: [],
  totalCount: 0,
  hasMore: true,
  loading: false,
  offset: 0,
};

// Format price helper
function formatPrice(value: number, currency: string): string {
  if (value === 0) return "Gratis";

  const locale = currency === "EUR" ? "es-ES" :
                 currency === "USD" ? "en-US" :
                 currency === "GBP" ? "en-GB" :
                 currency === "JPY" ? "ja-JP" :
                 currency === "MXN" ? "es-MX" : "es-ES";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "JPY" ? 0 : 2,
  }).format(value);
}

// Format sale end time
function formatSaleEnd(dateStr?: string): string | null {
  if (!dateStr) return null;

  const endDate = new Date(dateStr);
  const now = new Date();
  const diffMs = endDate.getTime() - now.getTime();

  if (diffMs < 0) return null;

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h`;
  }
  return `${diffHours}h`;
}

export function NintendoDealsWidget({ widget: _widget }: NintendoDealsWidgetProps) {
  const { openAddLinkModal } = useLinksStore();
  const [categories, setCategories] = useState<Record<CategoryKey, CategoryState>>({
    sales: { ...initialCategoryState },
    ranking: { ...initialCategoryState },
    new: { ...initialCategoryState },
  });
  const [activeTab, setActiveTab] = useState<CategoryKey>("sales");
  const [sortKey, setSortKey] = useState<SortKey>("default");
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{
    games: NintendoGame[];
    totalCount: number;
    hasMore: boolean;
    loading: boolean;
    offset: number;
  }>({
    games: [],
    totalCount: 0,
    hasMore: false,
    loading: false,
    offset: 0,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ref for current state
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const currentCategory = categories[activeTab];

  // Fetch games for a category
  const fetchCategory = useCallback(async (category: CategoryKey, loadMore = false) => {
    const current = categoriesRef.current[category];

    if (current.loading) return;
    if (loadMore && !current.hasMore) return;

    setCategories(prev => ({
      ...prev,
      [category]: { ...prev[category], loading: true },
    }));

    try {
      const offset = loadMore ? current.offset + ITEMS_PER_LOAD : 0;
      const response = await fetch(
        `/api/nintendo-deals?category=${category}&offset=${offset}&count=${ITEMS_PER_LOAD}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();

      if (data.error && data.games.length === 0) {
        // API unavailable but not a hard error
        setError(data.error);
      } else {
        setError(null);
      }

      setCategories(prev => {
        const existingGames = loadMore ? prev[category].games : [];
        const existingIds = new Set(existingGames.map(g => g.id));
        const newGames = data.games.filter((g: NintendoGame) => !existingIds.has(g.id));

        return {
          ...prev,
          [category]: {
            games: [...existingGames, ...newGames],
            totalCount: data.totalCount,
            hasMore: data.hasMore,
            loading: false,
            offset: offset,
          },
        };
      });

      if (!loadMore) {
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error("Nintendo fetch error:", err);
      setError("Error al cargar juegos de Nintendo");
      setCategories(prev => ({
        ...prev,
        [category]: { ...prev[category], loading: false },
      }));
    }
  }, []);

  // Initial fetch for active tab
  useEffect(() => {
    if (categories[activeTab].games.length === 0 && !categories[activeTab].loading) {
      fetchCategory(activeTab);
    }
  }, [activeTab, categories, fetchCategory]);

  // Auto-refresh every 15 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCategory(activeTab);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab, fetchCategory]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search fetch
  const fetchSearch = useCallback(async (term: string, loadMore = false) => {
    if (!term.trim()) {
      setSearchResults({
        games: [],
        totalCount: 0,
        hasMore: false,
        loading: false,
        offset: 0,
      });
      return;
    }

    if (searchResults.loading && !loadMore) return;

    setSearchResults(prev => ({ ...prev, loading: true }));

    try {
      const offset = loadMore ? searchResults.offset + ITEMS_PER_LOAD : 0;
      const response = await fetch(
        `/api/nintendo-deals?term=${encodeURIComponent(term)}&offset=${offset}&count=${ITEMS_PER_LOAD}`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      setSearchResults(prev => {
        const existingGames = loadMore ? prev.games : [];
        const existingIds = new Set(existingGames.map(g => g.id));
        const newGames = data.games.filter((g: NintendoGame) => !existingIds.has(g.id));

        return {
          games: [...existingGames, ...newGames],
          totalCount: data.totalCount,
          hasMore: data.hasMore,
          loading: false,
          offset: offset,
        };
      });
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults(prev => ({ ...prev, loading: false }));
    }
  }, [searchResults.loading, searchResults.offset]);

  // Trigger search
  useEffect(() => {
    if (debouncedSearch) {
      fetchSearch(debouncedSearch, false);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle search mode
  const toggleSearchMode = () => {
    if (searchMode) {
      setSearchMode(false);
      setSearchTerm("");
      setDebouncedSearch("");
      setSearchResults({
        games: [],
        totalCount: 0,
        hasMore: false,
        loading: false,
        offset: 0,
      });
    } else {
      setSearchMode(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Format relative date
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 1) return "Ahora";
    if (diffMinutes < 60) return `Hace ${diffMinutes}min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  // Quick add link
  const handleQuickAdd = (game: NintendoGame) => {
    openAddLinkModal({
      url: game.storeUrl,
      title: game.title,
      description: game.isOnSale
        ? `${game.discountPercent}% de descuento - ${formatPrice(game.currentPrice, game.currency)}`
        : `${formatPrice(game.currentPrice, game.currency)}${game.releaseDate ? ` - ${game.releaseDate}` : ""}`,
    });
  };

  // Load more
  const handleLoadMore = (category: CategoryKey) => {
    fetchCategory(category, true);
  };

  // Refresh
  const handleRefresh = () => {
    fetchCategory(activeTab, false);
  };

  const totalGames = Object.values(categories).reduce((acc, cat) => acc + cat.games.length, 0);

  // Game card component with inline image carousel on hover
  const GameCard = ({ game }: { game: NintendoGame }) => {
    const saleTimeLeft = formatSaleEnd(game.saleEndsAt);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [showTitle, setShowTitle] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const gallery = game.gallery || [game.imageUrl];

    // Start carousel after delay when hovering
    useEffect(() => {
      if (!isHovering || gallery.length <= 1) return;

      // Start cycling images after 600ms delay
      const startDelay = setTimeout(() => {
        setShowTitle(true);
      }, 600);

      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % gallery.length);
      }, 1800); // Change image every 1.8 seconds

      return () => {
        clearTimeout(startDelay);
        clearInterval(interval);
      };
    }, [isHovering, gallery.length]);

    // Reset when hover ends
    useEffect(() => {
      if (!isHovering) {
        setCurrentImageIndex(0);
        setShowTitle(false);
      }
    }, [isHovering]);

    const handleMouseEnter = () => {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsHovering(true);
      }, 500); // 500ms delay before activating hover state
    };

    const handleMouseLeave = () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }
      setIsHovering(false);
    };

    // Current image to display
    const displayImage = isHovering && gallery.length > 1
      ? gallery[currentImageIndex]
      : game.imageUrl;

    return (
      <div
        className="group rounded-lg border bg-card overflow-hidden transition-all hover:border-red-500/50 hover:shadow-md"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Game Image with inline carousel */}
        <div className="relative aspect-video bg-muted overflow-hidden">
          {/* Main/Carousel Image */}
          <img
            src={displayImage}
            alt={game.title}
            className={cn(
              "w-full h-full object-cover transition-all duration-500",
              isHovering && "scale-105"
            )}
            loading="lazy"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://placehold.co/320x180/1a1a2e/e94560?text=${encodeURIComponent(game.title.substring(0, 10))}`;
            }}
          />

          {/* Full title overlay on hover */}
          {isHovering && showTitle && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2 pt-6">
              <h4 className="text-white text-xs @[200px]:text-sm font-semibold leading-tight line-clamp-2">
                {game.title}
              </h4>
              {game.genres.length > 0 && (
                <p className="text-white/70 text-[9px] @[200px]:text-[10px] mt-0.5 truncate">
                  {game.genres.slice(0, 2).join(" · ")}
                </p>
              )}
            </div>
          )}

          {/* Gallery indicators - only show when hovering and has multiple images */}
          {isHovering && gallery.length > 1 && (
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1 z-10">
              {gallery.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    idx === currentImageIndex
                      ? "bg-white w-4"
                      : "bg-white/40 w-1"
                  )}
                />
              ))}
            </div>
          )}

          {/* Discount Badge */}
          {game.isOnSale && (
            <div className={cn(
              "absolute top-1 @[200px]:top-1.5 left-1 @[200px]:left-1.5",
              "bg-red-500 text-white px-1 @[200px]:px-1.5 py-0.5 rounded",
              "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px] font-bold flex items-center gap-0.5",
              "transition-transform duration-300",
              isHovering && "scale-110"
            )}>
              <Percent className="h-2 w-2 @[200px]:h-2.5 @[200px]:w-2.5" />
              -{Math.round(game.discountPercent)}%
            </div>
          )}

          {/* Sale Timer */}
          {saleTimeLeft && !isHovering && (
            <div className={cn(
              "absolute bottom-1 left-1 hidden @[250px]:flex",
              "bg-black/70 text-white px-1 py-0.5 rounded",
              "text-[7px] @[300px]:text-[8px] items-center gap-0.5"
            )}>
              <Clock className="h-2 w-2" />
              {saleTimeLeft}
            </div>
          )}

          {/* Publisher badge - hide when showing title overlay */}
          {!isHovering && (
            <div className="absolute bottom-1 right-1 hidden @[300px]:block">
              <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                {game.publisher}
              </Badge>
            </div>
          )}

          {/* Actions */}
          <div className={cn(
            "absolute top-1 right-1 flex gap-0.5 transition-opacity duration-200",
            isHovering ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            <Button
              variant="secondary"
              size="icon"
              className="h-5 w-5 @[200px]:h-6 @[200px]:w-6 bg-black/60 hover:bg-black/80 border-0"
              onClick={(e) => {
                e.stopPropagation();
                handleQuickAdd(game);
              }}
              title="Añadir a Stacklume"
            >
              <Plus className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
            </Button>
            <a
              href={game.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 h-5 w-5 @[200px]:h-6 @[200px]:w-6"
              title="Ver en Nintendo eShop"
            >
              <ExternalLink className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
            </a>
          </div>
        </div>

        {/* Game Info */}
        <div className="p-1.5 @[200px]:p-2">
          <h4 className={cn(
            "font-medium line-clamp-1 transition-colors",
            "text-[9px] @[200px]:text-[10px] @[300px]:text-xs",
            isHovering ? "text-red-500" : "group-hover:text-red-500"
          )}>
            {game.title}
          </h4>
          <div className="mt-0.5 flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              {game.isOnSale && game.regularPrice > 0 && (
                <span className="text-[8px] @[200px]:text-[9px] text-muted-foreground line-through">
                  {formatPrice(game.regularPrice, game.currency)}
                </span>
              )}
              <span className={cn(
                "font-semibold text-[9px] @[200px]:text-[10px] @[300px]:text-xs",
                game.isOnSale && "text-red-500"
              )}>
                {formatPrice(game.currentPrice, game.currency)}
              </span>
            </div>
            {game.genres.length > 0 && (
              <span className="text-[7px] @[200px]:text-[8px] text-muted-foreground truncate max-w-[60px]">
                {game.genres[0]}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="@container flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-2 @[200px]:px-3 @[300px]:px-4 py-2 @[200px]:py-3 gap-2">
        {searchMode ? (
          // Search Mode Header
          <>
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar juegos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-7 @[200px]:h-8 pl-7 @[200px]:pl-8 pr-2 text-xs @[200px]:text-sm"
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSearchMode}
              className="h-7 w-7 @[200px]:h-8 @[200px]:w-8 shrink-0"
            >
              <X className="h-3.5 w-3.5 @[200px]:h-4 @[200px]:w-4" />
            </Button>
          </>
        ) : (
          // Normal Header
          <>
            <div className="flex items-center gap-1.5 @[200px]:gap-2">
              <div className={cn(
                "flex items-center justify-center rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/20",
                "w-6 h-6 @[200px]:w-7 @[200px]:h-7 @[300px]:w-8 @[300px]:h-8"
              )}>
                <Gamepad2 className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 @[300px]:h-4 @[300px]:w-4 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-xs @[200px]:text-sm flex items-center gap-1">
                  Nintendo
                  <span className="text-[10px] @[200px]:text-xs text-muted-foreground hidden @[200px]:inline">
                    🇺🇸
                  </span>
                </h3>
                <p className="text-[10px] @[200px]:text-xs text-muted-foreground hidden @[250px]:block">
                  {currentCategory.totalCount > 0
                    ? `${currentCategory.totalCount.toLocaleString()} juegos`
                    : "Cargando..."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Search Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSearchMode}
                className="h-6 w-6 @[200px]:h-7 @[200px]:w-7 @[300px]:h-8 @[300px]:w-8"
              >
                <Search className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 @[300px]:h-4 @[300px]:w-4" />
              </Button>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 @[200px]:h-7 @[300px]:h-8 px-1.5 @[200px]:px-2 gap-1"
                  >
                    {sortKey === "default" ? (
                      <ArrowUpDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    ) : SORT_OPTIONS.find(o => o.key === sortKey)?.icon === "up" ? (
                      <ArrowUp className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    ) : (
                      <ArrowDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    )}
                    <span className="hidden @[350px]:inline text-[10px] @[400px]:text-xs">
                      {SORT_OPTIONS.find(o => o.key === sortKey)?.shortLabel || "Ordenar"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {SORT_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.key}
                      onClick={() => setSortKey(option.key)}
                      className={cn(
                        "text-xs gap-2",
                        sortKey === option.key && "bg-accent"
                      )}
                    >
                      {option.icon === "up" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : option.icon === "down" ? (
                        <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3" />
                      )}
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh Button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={currentCategory.loading}
                className="h-6 w-6 @[200px]:h-7 @[200px]:w-7 @[300px]:h-8 @[300px]:w-8"
              >
                <RefreshCw className={cn(
                  "h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 @[300px]:h-4 @[300px]:w-4",
                  currentCategory.loading && "animate-spin"
                )} />
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {searchMode ? (
          // Search Results View
          <ScrollArea className="h-full">
            {searchResults.loading && searchResults.games.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Buscando...</p>
                </div>
              </div>
            ) : !debouncedSearch ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center p-4">
                <Search className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">Escribe para buscar juegos</p>
              </div>
            ) : searchResults.games.length === 0 && !searchResults.loading ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center p-4">
                <Gamepad2 className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-xs text-muted-foreground">No se encontraron juegos para &ldquo;{debouncedSearch}&rdquo;</p>
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground">
                    {searchResults.totalCount > 0
                      ? `${searchResults.totalCount.toLocaleString()} resultados para "${debouncedSearch}"`
                      : `Buscando "${debouncedSearch}"...`}
                  </p>
                </div>

                <div className={cn(
                  "grid gap-1.5 @[200px]:gap-2 p-2 @[200px]:p-3",
                  "grid-cols-1 @[350px]:grid-cols-2 @[550px]:grid-cols-3 @[750px]:grid-cols-4"
                )}>
                  {sortGames(searchResults.games, sortKey).map((game) => (
                    <GameCard key={`search-${game.id}`} game={game} />
                  ))}
                </div>

                {searchResults.hasMore && (
                  <div className="flex justify-center px-3 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSearch(debouncedSearch, true)}
                      disabled={searchResults.loading}
                      className="h-7 @[200px]:h-8 text-[10px] @[200px]:text-xs gap-1 w-full max-w-xs"
                    >
                      {searchResults.loading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      Cargar más
                    </Button>
                  </div>
                )}
              </>
            )}
          </ScrollArea>
        ) : error && totalGames === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 @[200px]:gap-3 p-3 @[200px]:p-4 @[300px]:p-6 text-center">
            <Gamepad2 className="h-8 w-8 @[200px]:h-10 @[200px]:w-10 @[300px]:h-12 @[300px]:w-12 text-muted-foreground/50" />
            <div>
              <h4 className="font-medium text-xs @[200px]:text-sm">Nintendo eShop</h4>
              <p className="mt-1 text-[10px] @[200px]:text-xs @[300px]:text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh} size="sm" variant="outline" className="h-7 @[200px]:h-8 text-xs">
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Reintentar
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)} className="flex flex-col h-full">
            <TabsList className="mx-2 @[200px]:mx-3 mt-1.5 @[200px]:mt-2 grid grid-cols-3 h-7 @[200px]:h-8 @[300px]:h-9">
              {CATEGORY_ORDER.map((key) => {
                const info = CATEGORY_INFO[key];
                const Icon = info.icon;
                const cat = categories[key];
                return (
                  <TabsTrigger
                    key={key}
                    value={key}
                    className={cn(
                      "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px] px-0.5 @[200px]:px-1 @[300px]:px-1.5",
                      "gap-0.5 data-[state=active]:text-red-500 relative"
                    )}
                    title={`${info.label} (${cat.totalCount.toLocaleString()})`}
                  >
                    <Icon className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                    <span className="hidden @[300px]:inline truncate">{info.shortLabel}</span>
                    {cat.totalCount > 0 && (
                      <span className="hidden @[400px]:inline text-[8px] text-muted-foreground ml-0.5">
                        ({cat.totalCount > 999 ? `${Math.floor(cat.totalCount/1000)}k` : cat.totalCount})
                      </span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORY_ORDER.map((key) => {
              const cat = categories[key];
              return (
                <TabsContent key={key} value={key} className="flex-1 mt-0 overflow-hidden">
                  <ScrollArea className="h-full">
                    {cat.loading && cat.games.length === 0 ? (
                      <div className="flex h-32 items-center justify-center">
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="h-6 w-6 animate-spin text-red-500" />
                          <p className="text-xs text-muted-foreground">Cargando...</p>
                        </div>
                      </div>
                    ) : cat.games.length === 0 ? (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                        <Gamepad2 className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Sin juegos disponibles</p>
                      </div>
                    ) : (
                      <>
                        <div className={cn(
                          "grid gap-1.5 @[200px]:gap-2 p-2 @[200px]:p-3",
                          "grid-cols-1 @[350px]:grid-cols-2 @[550px]:grid-cols-3 @[750px]:grid-cols-4"
                        )}>
                          {sortGames(cat.games, sortKey).map((game) => (
                            <GameCard key={`${key}-${game.id}`} game={game} />
                          ))}
                        </div>

                        {cat.hasMore && (
                          <div className="flex justify-center px-3 pb-3">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleLoadMore(key)}
                              disabled={cat.loading}
                              className="h-7 @[200px]:h-8 text-[10px] @[200px]:text-xs gap-1 w-full max-w-xs"
                            >
                              {cat.loading ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                              Cargar más ({(cat.totalCount - cat.games.length).toLocaleString()} restantes)
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </ScrollArea>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </div>

      {/* Footer */}
      {lastFetch && currentCategory.games.length > 0 && (
        <div className={cn(
          "border-t flex items-center justify-between text-muted-foreground",
          "px-2 @[200px]:px-3 py-1 @[200px]:py-1.5",
          "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px]"
        )}>
          <span>
            {currentCategory.games.length.toLocaleString()}/{currentCategory.totalCount.toLocaleString()}
          </span>
          <span className="hidden @[200px]:inline">{formatDate(lastFetch)}</span>
        </div>
      )}
    </div>
  );
}
