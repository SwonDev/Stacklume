"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Gamepad2,
  RefreshCw,
  ExternalLink,
  Plus,
  ChevronDown,
  Calendar,
  TrendingUp,
  Tag,
  Flame,
  Percent,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Sparkles,
  ArrowUpDown,
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

interface SteamGamesWidgetProps {
  widget: Widget;
}

interface SteamGame {
  id: number;
  name: string;
  discounted: boolean;
  discountPercent: number;
  originalPrice: string | null;
  finalPrice: string;
  imageUrl: string;
  platforms: {
    windows: boolean;
    mac: boolean;
    linux: boolean;
  };
  storeUrl: string;
  releaseDate: string;
}

interface CategoryState {
  games: SteamGame[];
  totalCount: number;
  hasMore: boolean;
  loading: boolean;
  page: number; // Track page number for Steam's 25-item pagination
}

type CategoryKey = "specials" | "new_releases" | "top_sellers" | "coming_soon" | "most_played";

const ITEMS_PER_LOAD = 25;

const CATEGORY_INFO: Record<CategoryKey, { label: string; shortLabel: string; icon: typeof Sparkles }> = {
  specials: { label: "Ofertas", shortLabel: "Oferta", icon: Tag },
  new_releases: { label: "Novedades", shortLabel: "Nuevo", icon: Sparkles },
  top_sellers: { label: "Top Ventas", shortLabel: "Top", icon: TrendingUp },
  coming_soon: { label: "Próximamente", shortLabel: "Prox", icon: Calendar },
  most_played: { label: "Populares", shortLabel: "Pop", icon: Flame },
};

const CATEGORY_ORDER: CategoryKey[] = ["specials", "new_releases", "top_sellers", "coming_soon", "most_played"];

// Sort options per category
type SortKey = "default" | "discount_desc" | "discount_asc" | "price_asc" | "price_desc" | "name_asc" | "name_desc" | "date_desc" | "date_asc";

interface SortOption {
  key: SortKey;
  label: string;
  shortLabel: string;
  icon: "up" | "down" | "default";
}

const SORT_OPTIONS_BY_CATEGORY: Record<CategoryKey, SortOption[]> = {
  specials: [
    { key: "default", label: "Por defecto", shortLabel: "Defecto", icon: "default" },
    { key: "discount_desc", label: "Mayor descuento", shortLabel: "% Mayor", icon: "down" },
    { key: "discount_asc", label: "Menor descuento", shortLabel: "% Menor", icon: "up" },
    { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "€ Menor", icon: "up" },
    { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "€ Mayor", icon: "down" },
    { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  ],
  new_releases: [
    { key: "default", label: "Más recientes", shortLabel: "Recientes", icon: "default" },
    { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "€ Menor", icon: "up" },
    { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "€ Mayor", icon: "down" },
    { key: "discount_desc", label: "Mayor descuento", shortLabel: "% Mayor", icon: "down" },
    { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  ],
  top_sellers: [
    { key: "default", label: "Más vendidos", shortLabel: "Top", icon: "default" },
    { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "€ Menor", icon: "up" },
    { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "€ Mayor", icon: "down" },
    { key: "discount_desc", label: "Mayor descuento", shortLabel: "% Mayor", icon: "down" },
    { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  ],
  coming_soon: [
    { key: "default", label: "Próximamente", shortLabel: "Próximo", icon: "default" },
    { key: "date_asc", label: "Fecha más cercana", shortLabel: "Pronto", icon: "up" },
    { key: "date_desc", label: "Fecha más lejana", shortLabel: "Lejos", icon: "down" },
    { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "€ Menor", icon: "up" },
    { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "€ Mayor", icon: "down" },
    { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  ],
  most_played: [
    { key: "default", label: "Más populares", shortLabel: "Popular", icon: "default" },
    { key: "price_asc", label: "Precio: menor a mayor", shortLabel: "€ Menor", icon: "up" },
    { key: "price_desc", label: "Precio: mayor a menor", shortLabel: "€ Mayor", icon: "down" },
    { key: "discount_desc", label: "Mayor descuento", shortLabel: "% Mayor", icon: "down" },
    { key: "name_asc", label: "Nombre A-Z", shortLabel: "A-Z", icon: "up" },
  ],
};

// Sort function
function sortGames(games: SteamGame[], sortKey: SortKey): SteamGame[] {
  if (sortKey === "default") return games;

  const sorted = [...games];

  switch (sortKey) {
    case "discount_desc":
      return sorted.sort((a, b) => b.discountPercent - a.discountPercent);
    case "discount_asc":
      return sorted.sort((a, b) => a.discountPercent - b.discountPercent);
    case "price_asc":
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.finalPrice.replace("€", "").replace(",", ".")) || 0;
        const priceB = parseFloat(b.finalPrice.replace("€", "").replace(",", ".")) || 0;
        return priceA - priceB;
      });
    case "price_desc":
      return sorted.sort((a, b) => {
        const priceA = parseFloat(a.finalPrice.replace("€", "").replace(",", ".")) || 0;
        const priceB = parseFloat(b.finalPrice.replace("€", "").replace(",", ".")) || 0;
        return priceB - priceA;
      });
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "date_asc":
    case "date_desc":
      // Parse dates like "19 MAR 2026", "1.º trimestre d...", etc.
      return sorted.sort((a, b) => {
        const parseDate = (dateStr: string): number => {
          if (!dateStr) return sortKey === "date_asc" ? Infinity : -Infinity;
          // Try to parse common formats
          const months: Record<string, number> = {
            ene: 0, feb: 1, mar: 2, abr: 3, may: 4, jun: 5,
            jul: 6, ago: 7, sep: 8, oct: 9, nov: 10, dic: 11,
            jan: 0, apr: 3, aug: 7, dec: 11
          };
          const match = dateStr.toLowerCase().match(/(\d{1,2})\s*(\w{3})\s*(\d{4})/);
          if (match) {
            const day = parseInt(match[1]);
            const month = months[match[2]] ?? 0;
            const year = parseInt(match[3]);
            return new Date(year, month, day).getTime();
          }
          // If can't parse, put at end
          return sortKey === "date_asc" ? Infinity : -Infinity;
        };
        const dateA = parseDate(a.releaseDate);
        const dateB = parseDate(b.releaseDate);
        return sortKey === "date_asc" ? dateA - dateB : dateB - dateA;
      });
    default:
      return games;
  }
}

const initialCategoryState: CategoryState = {
  games: [],
  totalCount: 0,
  hasMore: true,
  loading: false,
  page: 0,
};

export function SteamGamesWidget({ widget }: SteamGamesWidgetProps) {
  const { openAddLinkModal } = useLinksStore();
  const [categories, setCategories] = useState<Record<CategoryKey, CategoryState>>({
    specials: { ...initialCategoryState },
    new_releases: { ...initialCategoryState },
    top_sellers: { ...initialCategoryState },
    coming_soon: { ...initialCategoryState },
    most_played: { ...initialCategoryState },
  });
  const [activeTab, setActiveTab] = useState<CategoryKey>("specials");
  const [sortByCategory, setSortByCategory] = useState<Record<CategoryKey, SortKey>>({
    specials: "default",
    new_releases: "default",
    top_sellers: "default",
    coming_soon: "default",
    most_played: "default",
  });
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  // Search state
  const [searchMode, setSearchMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<{
    games: SteamGame[];
    totalCount: number;
    hasMore: boolean;
    loading: boolean;
    page: number;
  }>({
    games: [],
    totalCount: 0,
    hasMore: false,
    loading: false,
    page: 0,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Ref to access current categories state in callbacks
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  const currentCategory = categories[activeTab];

  // Fetch games for a specific category
  const fetchCategory = useCallback(async (category: CategoryKey, loadMore = false) => {
    // Use ref to get current state (avoids stale closure)
    const current = categoriesRef.current[category];

    if (current.loading) return;
    if (loadMore && !current.hasMore) return;

    setCategories(prev => ({
      ...prev,
      [category]: { ...prev[category], loading: true },
    }));

    try {
      // Use page-based pagination (Steam uses 25-item pages)
      // Steam rounds start to nearest 25, so page 0 = start 0, page 1 = start 25, etc.
      const page = loadMore ? current.page + 1 : 0;
      const start = page * ITEMS_PER_LOAD;
      const response = await fetch(
        `/api/steam-games?category=${category}&start=${start}&count=${ITEMS_PER_LOAD}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }

      const data = await response.json();

      setCategories(prev => {
        // Merge and deduplicate games by ID
        const existingGames = loadMore ? prev[category].games : [];
        const existingIds = new Set(existingGames.map(g => g.id));
        const newGames = data.games.filter((g: SteamGame) => !existingIds.has(g.id));

        return {
          ...prev,
          [category]: {
            games: [...existingGames, ...newGames],
            totalCount: data.totalCount,
            hasMore: data.hasMore,
            loading: false,
            page: page,
          },
        };
      });

      if (!loadMore) {
        setLastFetch(new Date());
      }
      setError(null);
    } catch (err) {
      console.error("Steam fetch error:", err);
      setError("Error al cargar juegos");
      setCategories(prev => ({
        ...prev,
        [category]: { ...prev[category], loading: false },
      }));
    }
  }, []); // No dependencies - uses ref for current state

  // Initial fetch for active tab
  useEffect(() => {
    if (categories[activeTab].games.length === 0 && !categories[activeTab].loading) {
      fetchCategory(activeTab);
    }
  }, [activeTab, categories, fetchCategory]);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCategory(activeTab);
    }, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activeTab, fetchCategory]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Search fetch function
  const fetchSearch = useCallback(async (term: string, loadMore = false) => {
    if (!term.trim()) {
      setSearchResults({
        games: [],
        totalCount: 0,
        hasMore: false,
        loading: false,
        page: 0,
      });
      return;
    }

    if (searchResults.loading && !loadMore) return;

    setSearchResults(prev => ({ ...prev, loading: true }));

    try {
      const page = loadMore ? searchResults.page + 1 : 0;
      const start = page * ITEMS_PER_LOAD;
      const response = await fetch(
        `/api/steam-games?term=${encodeURIComponent(term)}&start=${start}&count=${ITEMS_PER_LOAD}`
      );

      if (!response.ok) throw new Error("Search failed");

      const data = await response.json();

      setSearchResults(prev => {
        const existingGames = loadMore ? prev.games : [];
        const existingIds = new Set(existingGames.map(g => g.id));
        const newGames = data.games.filter((g: SteamGame) => !existingIds.has(g.id));

        return {
          games: [...existingGames, ...newGames],
          totalCount: data.totalCount,
          hasMore: data.hasMore,
          loading: false,
          page: page,
        };
      });
    } catch (err) {
      console.error("Search error:", err);
      setSearchResults(prev => ({ ...prev, loading: false }));
    }
  }, [searchResults.loading, searchResults.page]);

  // Trigger search when debounced term changes
  useEffect(() => {
    if (debouncedSearch) {
      fetchSearch(debouncedSearch, false);
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search mode toggle
  const toggleSearchMode = () => {
    if (searchMode) {
      // Exit search mode
      setSearchMode(false);
      setSearchTerm("");
      setDebouncedSearch("");
      setSearchResults({
        games: [],
        totalCount: 0,
        hasMore: false,
        loading: false,
        page: 0,
      });
    } else {
      // Enter search mode
      setSearchMode(true);
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  // Handle search load more
  const handleSearchLoadMore = () => {
    if (debouncedSearch && searchResults.hasMore && !searchResults.loading) {
      fetchSearch(debouncedSearch, true);
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

  // Quick add link to Stacklume
  const handleQuickAdd = (game: SteamGame) => {
    openAddLinkModal({
      url: game.storeUrl,
      title: game.name,
      description: game.discounted
        ? `${game.discountPercent}% de descuento - ${game.finalPrice}`
        : `${game.finalPrice}${game.releaseDate ? ` - ${game.releaseDate}` : ""}`,
    });
  };

  // Load more games for a specific category
  const handleLoadMore = (category: CategoryKey) => {
    fetchCategory(category, true);
  };

  // Refresh current category
  const handleRefresh = () => {
    fetchCategory(activeTab, false);
  };

  const totalGames = Object.values(categories).reduce((acc, cat) => acc + cat.games.length, 0);

  return (
    <div className="@container flex h-full flex-col">
      {/* Header - Responsive */}
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
                "flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20",
                "w-6 h-6 @[200px]:w-7 @[200px]:h-7 @[300px]:w-8 @[300px]:h-8"
              )}>
                <Gamepad2 className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5 @[300px]:h-4 @[300px]:w-4 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold text-xs @[200px]:text-sm">Steam</h3>
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
                    {sortByCategory[activeTab] === "default" ? (
                      <ArrowUpDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    ) : SORT_OPTIONS_BY_CATEGORY[activeTab].find(o => o.key === sortByCategory[activeTab])?.icon === "up" ? (
                      <ArrowUp className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    ) : (
                      <ArrowDown className="h-3 w-3 @[200px]:h-3.5 @[200px]:w-3.5" />
                    )}
                    <span className="hidden @[350px]:inline text-[10px] @[400px]:text-xs">
                      {SORT_OPTIONS_BY_CATEGORY[activeTab].find(o => o.key === sortByCategory[activeTab])?.shortLabel || "Ordenar"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {SORT_OPTIONS_BY_CATEGORY[activeTab].map((option) => (
                    <DropdownMenuItem
                      key={option.key}
                      onClick={() => setSortByCategory(prev => ({ ...prev, [activeTab]: option.key }))}
                      className={cn(
                        "text-xs gap-2",
                        sortByCategory[activeTab] === option.key && "bg-accent"
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
                {/* Search Results Header */}
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground">
                    {searchResults.totalCount > 0
                      ? `${searchResults.totalCount.toLocaleString()} resultados para "${debouncedSearch}"`
                      : `Buscando "${debouncedSearch}"...`}
                  </p>
                </div>

                {/* Search Results Grid */}
                <div className={cn(
                  "grid gap-1.5 @[200px]:gap-2 p-2 @[200px]:p-3",
                  "grid-cols-1 @[350px]:grid-cols-2 @[550px]:grid-cols-3 @[750px]:grid-cols-4"
                )}>
                  {searchResults.games.map((game, index) => (
                    <div
                      key={`search-${game.id}-${index}`}
                      className="group rounded-lg border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm"
                    >
                      {/* Game Image */}
                      <div className="relative aspect-[460/215] bg-muted">
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                        {/* Discount Badge */}
                        {game.discounted && (
                          <div className={cn(
                            "absolute top-1 @[200px]:top-1.5 left-1 @[200px]:left-1.5",
                            "bg-green-500 text-white px-1 @[200px]:px-1.5 py-0.5 rounded",
                            "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px] font-bold flex items-center gap-0.5"
                          )}>
                            <Percent className="h-2 w-2 @[200px]:h-2.5 @[200px]:w-2.5" />
                            -{game.discountPercent}%
                          </div>
                        )}
                        {/* Platform badges */}
                        <div className="absolute bottom-1 left-1 hidden @[250px]:flex gap-0.5">
                          {game.platforms.windows && (
                            <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                              W
                            </Badge>
                          )}
                          {game.platforms.mac && (
                            <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                              M
                            </Badge>
                          )}
                          {game.platforms.linux && (
                            <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                              L
                            </Badge>
                          )}
                        </div>
                        {/* Actions */}
                        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-5 w-5 @[200px]:h-6 @[200px]:w-6 bg-black/60 hover:bg-black/80 border-0"
                            onClick={() => handleQuickAdd(game)}
                            title="Añadir a Stacklume"
                          >
                            <Plus className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
                          </Button>
                          <a
                            href={game.storeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 h-5 w-5 @[200px]:h-6 @[200px]:w-6"
                            title="Ver en Steam"
                          >
                            <ExternalLink className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
                          </a>
                        </div>
                      </div>

                      {/* Game Info */}
                      <div className="p-1.5 @[200px]:p-2">
                        <h4 className={cn(
                          "font-medium line-clamp-1 group-hover:text-primary transition-colors",
                          "text-[9px] @[200px]:text-[10px] @[300px]:text-xs"
                        )}>
                          {game.name}
                        </h4>
                        <div className="mt-0.5 flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            {game.discounted && game.originalPrice && (
                              <span className="text-[8px] @[200px]:text-[9px] text-muted-foreground line-through">
                                {game.originalPrice}
                              </span>
                            )}
                            <span className={cn(
                              "font-semibold text-[9px] @[200px]:text-[10px] @[300px]:text-xs",
                              game.discounted && "text-green-500"
                            )}>
                              {game.finalPrice}
                            </span>
                          </div>
                          {game.releaseDate && (
                            <span className="text-[7px] @[200px]:text-[8px] text-muted-foreground truncate max-w-[60px]">
                              {game.releaseDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More Button for Search */}
                {searchResults.hasMore && (
                  <div className="flex justify-center px-3 pb-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSearchLoadMore}
                      disabled={searchResults.loading}
                      className="h-7 @[200px]:h-8 text-[10px] @[200px]:text-xs gap-1 w-full max-w-xs"
                    >
                      {searchResults.loading ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      Cargar más ({(searchResults.totalCount - searchResults.games.length).toLocaleString()} restantes)
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
              <h4 className="font-medium text-xs @[200px]:text-sm">Error</h4>
              <p className="mt-1 text-[10px] @[200px]:text-xs @[300px]:text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={handleRefresh} size="sm" variant="outline" className="h-7 @[200px]:h-8 text-xs">
              <RefreshCw className="mr-1.5 h-3 w-3" />
              Reintentar
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CategoryKey)} className="flex flex-col h-full">
            {/* Responsive Tabs */}
            <TabsList className="mx-2 @[200px]:mx-3 mt-1.5 @[200px]:mt-2 grid grid-cols-5 h-7 @[200px]:h-8 @[300px]:h-9">
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
                      "gap-0.5 data-[state=active]:text-primary relative"
                    )}
                    title={`${info.label} (${cat.totalCount.toLocaleString()})`}
                  >
                    <Icon className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3" />
                    <span className="hidden @[400px]:inline truncate">{info.shortLabel}</span>
                    {cat.totalCount > 0 && (
                      <span className="hidden @[500px]:inline text-[8px] text-muted-foreground ml-0.5">
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
                          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Cargando...</p>
                        </div>
                      </div>
                    ) : cat.games.length === 0 ? (
                      <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                        <Gamepad2 className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-xs text-muted-foreground">Sin juegos</p>
                      </div>
                    ) : (
                      <>
                        {/* Responsive Grid */}
                        <div className={cn(
                          "grid gap-1.5 @[200px]:gap-2 p-2 @[200px]:p-3",
                          "grid-cols-1 @[350px]:grid-cols-2 @[550px]:grid-cols-3 @[750px]:grid-cols-4"
                        )}>
                          {sortGames(cat.games, sortByCategory[key]).map((game, index) => (
                            <div
                              key={`${game.id}-${index}`}
                              className="group rounded-lg border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm"
                            >
                              {/* Game Image */}
                              <div className="relative aspect-[460/215] bg-muted">
                                <img
                                  src={game.imageUrl}
                                  alt={game.name}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                  onError={(e) => {
                                    // Hide broken image icon, show placeholder background
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = "none";
                                  }}
                                />
                                {/* Discount Badge */}
                                {game.discounted && (
                                  <div className={cn(
                                    "absolute top-1 @[200px]:top-1.5 left-1 @[200px]:left-1.5",
                                    "bg-green-500 text-white px-1 @[200px]:px-1.5 py-0.5 rounded",
                                    "text-[8px] @[200px]:text-[9px] @[300px]:text-[10px] font-bold flex items-center gap-0.5"
                                  )}>
                                    <Percent className="h-2 w-2 @[200px]:h-2.5 @[200px]:w-2.5" />
                                    -{game.discountPercent}%
                                  </div>
                                )}
                                {/* Platform badges */}
                                <div className="absolute bottom-1 left-1 hidden @[250px]:flex gap-0.5">
                                  {game.platforms.windows && (
                                    <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                                      W
                                    </Badge>
                                  )}
                                  {game.platforms.mac && (
                                    <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                                      M
                                    </Badge>
                                  )}
                                  {game.platforms.linux && (
                                    <Badge variant="secondary" className="text-[7px] @[300px]:text-[8px] h-3.5 @[300px]:h-4 px-1 bg-black/60 text-white border-0">
                                      L
                                    </Badge>
                                  )}
                                </div>
                                {/* Actions */}
                                <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="secondary"
                                    size="icon"
                                    className="h-5 w-5 @[200px]:h-6 @[200px]:w-6 bg-black/60 hover:bg-black/80 border-0"
                                    onClick={() => handleQuickAdd(game)}
                                    title="Añadir a Stacklume"
                                  >
                                    <Plus className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
                                  </Button>
                                  <a
                                    href={game.storeUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center rounded-md bg-black/60 hover:bg-black/80 h-5 w-5 @[200px]:h-6 @[200px]:w-6"
                                    title="Ver en Steam"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5 @[200px]:h-3 @[200px]:w-3 text-white" />
                                  </a>
                                </div>
                              </div>

                              {/* Game Info */}
                              <div className="p-1.5 @[200px]:p-2">
                                <h4 className={cn(
                                  "font-medium line-clamp-1 group-hover:text-primary transition-colors",
                                  "text-[9px] @[200px]:text-[10px] @[300px]:text-xs"
                                )}>
                                  {game.name}
                                </h4>
                                <div className="mt-0.5 flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1">
                                    {game.discounted && game.originalPrice && (
                                      <span className="text-[8px] @[200px]:text-[9px] text-muted-foreground line-through">
                                        {game.originalPrice}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "font-semibold text-[9px] @[200px]:text-[10px] @[300px]:text-xs",
                                      game.discounted && "text-green-500"
                                    )}>
                                      {game.finalPrice}
                                    </span>
                                  </div>
                                  {game.releaseDate && (
                                    <span className="text-[7px] @[200px]:text-[8px] text-muted-foreground truncate max-w-[60px]">
                                      {game.releaseDate}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Load More Button */}
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

      {/* Footer - Responsive */}
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
