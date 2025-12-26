"use client";

import { useState, useEffect, useMemo } from "react";
import { Quote, RefreshCw, Heart, Copy, Check, Filter, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface QuoteWidgetProps {
  widget: Widget;
}

interface QuoteData {
  text: string;
  author: string;
  category: QuoteCategory;
  source?: "api" | "local"; // Track where the quote came from
}

type QuoteCategory = "motivation" | "success" | "life" | "wisdom" | "creativity" | "all";

// API response types
interface QuotableQuote {
  content: string;
  author: string;
  tags: string[];
}

// Translation cache type
interface TranslationCache {
  [key: string]: {
    text: string;
    author: string;
    timestamp: number;
  };
}

const QUOTES: QuoteData[] = [
  // Motivation
  {
    text: "El único modo de hacer un gran trabajo es amar lo que haces.",
    author: "Steve Jobs",
    category: "motivation",
  },
  {
    text: "No cuentes los días, haz que los días cuenten.",
    author: "Muhammad Ali",
    category: "motivation",
  },
  {
    text: "La motivación es lo que te pone en marcha, el hábito es lo que hace que sigas.",
    author: "Jim Ryun",
    category: "motivation",
  },
  {
    text: "El éxito no es la clave de la felicidad. La felicidad es la clave del éxito.",
    author: "Albert Schweitzer",
    category: "motivation",
  },
  {
    text: "Cree que puedes y estarás a medio camino.",
    author: "Theodore Roosevelt",
    category: "motivation",
  },

  // Success
  {
    text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.",
    author: "Robert Collier",
    category: "success",
  },
  {
    text: "El éxito no es final, el fracaso no es fatal: es el coraje para continuar lo que cuenta.",
    author: "Winston Churchill",
    category: "success",
  },
  {
    text: "No midas el éxito por lo que has logrado, sino por los obstáculos que has superado.",
    author: "Booker T. Washington",
    category: "success",
  },
  {
    text: "El secreto del éxito es la constancia en el propósito.",
    author: "Benjamin Disraeli",
    category: "success",
  },
  {
    text: "El éxito generalmente llega a quienes están demasiado ocupados para estar buscándolo.",
    author: "Henry David Thoreau",
    category: "success",
  },

  // Life
  {
    text: "La vida es lo que pasa mientras estás ocupado haciendo otros planes.",
    author: "John Lennon",
    category: "life",
  },
  {
    text: "No se trata de tener tiempo. Se trata de hacer tiempo.",
    author: "Anónimo",
    category: "life",
  },
  {
    text: "La vida es 10% lo que te sucede y 90% cómo reaccionas ante ello.",
    author: "Charles R. Swindoll",
    category: "life",
  },
  {
    text: "Vive como si fueras a morir mañana. Aprende como si fueras a vivir para siempre.",
    author: "Mahatma Gandhi",
    category: "life",
  },
  {
    text: "La vida no se trata de encontrarte a ti mismo, sino de crearte a ti mismo.",
    author: "George Bernard Shaw",
    category: "life",
  },

  // Wisdom
  {
    text: "El conocimiento viene, pero la sabiduría perdura.",
    author: "Alfred Tennyson",
    category: "wisdom",
  },
  {
    text: "La única verdadera sabiduría está en saber que no sabes nada.",
    author: "Sócrates",
    category: "wisdom",
  },
  {
    text: "El sabio puede sentarse en un hormiguero, pero solo el necio se queda sentado en él.",
    author: "Proverbio chino",
    category: "wisdom",
  },
  {
    text: "La experiencia no es lo que te sucede, es lo que haces con lo que te sucede.",
    author: "Aldous Huxley",
    category: "wisdom",
  },
  {
    text: "No es lo que nos sucede, sino nuestra respuesta a lo que nos sucede lo que nos hace daño.",
    author: "Stephen Covey",
    category: "wisdom",
  },

  // Creativity
  {
    text: "La creatividad es la inteligencia divirtiéndose.",
    author: "Albert Einstein",
    category: "creativity",
  },
  {
    text: "No esperes por la inspiración. Empieza a trabajar y la inspiración vendrá.",
    author: "Henri Matisse",
    category: "creativity",
  },
  {
    text: "La creatividad requiere el coraje de desprenderse de las certezas.",
    author: "Erich Fromm",
    category: "creativity",
  },
  {
    text: "Todo acto de creación es primero un acto de destrucción.",
    author: "Pablo Picasso",
    category: "creativity",
  },
  {
    text: "La imaginación es más importante que el conocimiento.",
    author: "Albert Einstein",
    category: "creativity",
  },

  // Additional quotes
  {
    text: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.",
    author: "Proverbio chino",
    category: "wisdom",
  },
  {
    text: "No cuentes los días, haz que los días cuenten.",
    author: "Muhammad Ali",
    category: "motivation",
  },
  {
    text: "El fracaso es una gran oportunidad para empezar otra vez con más inteligencia.",
    author: "Henry Ford",
    category: "success",
  },
  {
    text: "La única manera de hacer un gran trabajo es amar lo que haces.",
    author: "Steve Jobs",
    category: "motivation",
  },
  {
    text: "No tengas miedo de renunciar a lo bueno para ir a por lo grandioso.",
    author: "John D. Rockefeller",
    category: "success",
  },
];

const CATEGORY_LABELS: Record<QuoteCategory, string> = {
  all: "Todas",
  motivation: "Motivación",
  success: "Éxito",
  life: "Vida",
  wisdom: "Sabiduría",
  creativity: "Creatividad",
};

const CATEGORY_COLORS: Record<QuoteCategory, string> = {
  all: "bg-primary/10 text-primary",
  motivation: "bg-orange-500/10 text-orange-600",
  success: "bg-green-500/10 text-green-600",
  life: "bg-blue-500/10 text-blue-600",
  wisdom: "bg-purple-500/10 text-purple-600",
  creativity: "bg-pink-500/10 text-pink-600",
};

// Map Quotable API tags to our categories
const TAG_TO_CATEGORY_MAP: Record<string, QuoteCategory> = {
  inspiration: "motivation",
  motivational: "motivation",
  success: "success",
  life: "life",
  wisdom: "wisdom",
  philosophy: "wisdom",
  creativity: "creativity",
  art: "creativity",
};

// Simple Spanish translation dictionary for common English words
const _TRANSLATION_DICT: Record<string, string> = {
  "The only": "El único",
  "The best": "El mejor",
  "Success is": "El éxito es",
  "Life is": "La vida es",
  "Wisdom is": "La sabiduría es",
  "Creativity is": "La creatividad es",
  "Don't": "No",
  "You can": "Puedes",
  "You cannot": "No puedes",
  "I have": "He",
  "The future": "El futuro",
  "The past": "El pasado",
  "The present": "El presente",
};

export function QuoteWidget({ widget }: QuoteWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [currentQuote, setCurrentQuote] = useState<QuoteData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<QuoteCategory>("all");
  const [isFavorite, setIsFavorite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiQuotes, setApiQuotes] = useState<QuoteData[]>([]);
  const [translationCache, setTranslationCache] = useState<TranslationCache>({});

  // Combine local and API quotes
  const allQuotes = useMemo(() => {
    return [...QUOTES, ...apiQuotes];
  }, [apiQuotes]);

  // Filter quotes by category
  const filteredQuotes = useMemo(() => {
    if (selectedCategory === "all") return allQuotes;
    return allQuotes.filter((quote) => quote.category === selectedCategory);
  }, [selectedCategory, allQuotes]);

  // Simple translation function using dictionary
  const translateQuote = (text: string, author: string): { text: string; author: string } => {
    // Check cache first (24 hour expiration)
    const cacheKey = `${text}-${author}`;
    const cached = translationCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return { text: cached.text, author: cached.author };
    }

    // For now, we keep English quotes as-is since we don't have a translation API
    // In a production app, you'd integrate with Google Translate API or similar
    // The hardcoded Spanish quotes will remain the primary content

    // Cache the result
    const result = { text, author };
    setTranslationCache(prev => ({
      ...prev,
      [cacheKey]: { ...result, timestamp: Date.now() }
    }));

    return result;
  };

  // Fetch quote from Quotable API
  const fetchQuoteFromAPI = async (): Promise<QuoteData | null> => {
    try {
      setIsLoading(true);
      const response = await fetch("https://api.quotable.io/random");

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: QuotableQuote = await response.json();

      // Map API tags to our categories
      let category: QuoteCategory = "wisdom"; // Default category
      for (const tag of data.tags) {
        if (TAG_TO_CATEGORY_MAP[tag]) {
          category = TAG_TO_CATEGORY_MAP[tag];
          break;
        }
      }

      // Translate if needed (for now, we keep English quotes)
      const translated = translateQuote(data.content, data.author);

      const quote: QuoteData = {
        text: translated.text,
        author: translated.author,
        category,
        source: "api",
      };

      // Add to API quotes cache
      setApiQuotes(prev => {
        // Only keep last 50 API quotes to avoid memory issues
        const updated = [...prev, quote];
        return updated.slice(-50);
      });

      return quote;
    } catch (error) {
      console.error("Failed to fetch quote from API:", error);
      toast.error("No se pudo obtener una cita nueva", {
        description: "Usando citas locales",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Load cached API quotes from widget config
  useEffect(() => {
    const cachedApiQuotes = widget.config?.apiQuotes || [];
    setApiQuotes(cachedApiQuotes);

    const cachedTranslations = widget.config?.translationCache || {};
    setTranslationCache(cachedTranslations);
  }, []);

  // Save API quotes to widget config when they change
  useEffect(() => {
    if (apiQuotes.length > 0) {
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          apiQuotes,
        },
      });
    }
  }, [apiQuotes]);

  // Save translation cache to widget config
  useEffect(() => {
    if (Object.keys(translationCache).length > 0) {
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          translationCache,
        },
      });
    }
  }, [translationCache]);

  // Load initial quote
  useEffect(() => {
    const savedQuoteText = widget.config?.currentQuoteText;
    const savedCategory = widget.config?.category || "all";

    setSelectedCategory(savedCategory as QuoteCategory);

    if (savedQuoteText) {
      // Try to find the saved quote in all quotes
      const found = allQuotes.find(q => q.text === savedQuoteText);
      if (found) {
        setCurrentQuote(found);
      } else {
        // Get random quote
        const randomQuote = getRandomQuote(filteredQuotes);
        setCurrentQuote(randomQuote);
      }
    } else {
      // Get random quote
      const randomQuote = getRandomQuote(filteredQuotes);
      setCurrentQuote(randomQuote);
    }

    // Load favorite status
    const favorites = widget.config?.favorites || [];
    if (currentQuote) {
      setIsFavorite(favorites.includes(currentQuote.text));
    }
  }, [widget.config?.currentQuoteText, widget.config?.category, allQuotes]);

  const getRandomQuote = (quotes: QuoteData[]): QuoteData => {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
  };

  const handleRefresh = async () => {
    setIsTransitioning(true);

    try {
      // Try to fetch from API first (70% chance) or use local quotes
      const shouldUseAPI = Math.random() > 0.3;
      let newQuote: QuoteData | null = null;

      if (shouldUseAPI) {
        newQuote = await fetchQuoteFromAPI();
      }

      // Fallback to local quotes if API fails or we decided to use local
      if (!newQuote) {
        newQuote = getRandomQuote(filteredQuotes);
      }

      setCurrentQuote(newQuote);

      // Save to widget config
      updateWidget(widget.id, {
        config: {
          ...widget.config,
          currentQuoteText: newQuote.text,
        },
      });

      // Check if new quote is favorite
      const favorites = widget.config?.favorites || [];
      setIsFavorite(favorites.includes(newQuote.text));
    } finally {
      setIsTransitioning(false);
    }
  };

  const handleCategoryChange = (category: QuoteCategory) => {
    setSelectedCategory(category);

    // Save to widget config
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        category,
      },
    });

    // Get random quote from new category
    const categoryQuotes =
      category === "all" ? allQuotes : allQuotes.filter((q) => q.category === category);
    const newQuote = getRandomQuote(categoryQuotes);
    setCurrentQuote(newQuote);

    updateWidget(widget.id, {
      config: {
        ...widget.config,
        currentQuoteText: newQuote.text,
        category,
      },
    });
  };

  const handleToggleFavorite = () => {
    if (!currentQuote) return;

    const favorites = widget.config?.favorites || [];
    const newFavorites = isFavorite
      ? favorites.filter((f: string) => f !== currentQuote.text)
      : [...favorites, currentQuote.text];

    updateWidget(widget.id, {
      config: {
        ...widget.config,
        favorites: newFavorites,
      },
    });

    setIsFavorite(!isFavorite);
  };

  const handleCopy = async () => {
    if (!currentQuote) return;

    const text = `"${currentQuote.text}"\n\n— ${currentQuote.author}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy quote:", error);
    }
  };

  if (!currentQuote || isLoading) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full gap-3">
          {isLoading ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Cargando nueva cita...</p>
            </>
          ) : (
            <Quote className="w-8 h-8 text-muted-foreground animate-pulse" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full w-full relative overflow-hidden">
        {/* Header with category filter - visible on medium+ containers */}
        <div className="hidden @md:flex items-center justify-between p-3 @lg:p-4 border-b">
          <div className="flex items-center gap-2">
            <Quote className="w-4 h-4 text-primary" />
            <span className="text-xs @lg:text-sm font-medium text-muted-foreground">
              Cita del día
            </span>
          </div>

          <Select value={selectedCategory} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value} className="text-xs">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Main quote display */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 @sm:px-6 @md:px-8 @lg:px-10 py-4 @sm:py-6">
          {/* Quote icon background */}
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
            <Quote className="w-32 h-32 @md:w-48 @md:h-48 @lg:w-64 @lg:h-64" />
          </div>

          {/* Category badge - visible on small containers */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="@md:hidden mb-3 flex items-center gap-2"
          >
            <Badge
              className={`text-xs ${CATEGORY_COLORS[currentQuote.category]} border-0`}
            >
              {CATEGORY_LABELS[currentQuote.category]}
            </Badge>
            {currentQuote.source === "api" && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                API
              </Badge>
            )}
          </motion.div>

          {/* Quote text */}
          <AnimatePresence mode="wait">
            {!isTransitioning && (
              <motion.div
                key={currentQuote.text}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="text-center relative z-10"
              >
                <Quote className="w-6 h-6 @sm:w-8 @sm:h-8 @md:w-10 @md:h-10 text-primary mb-3 @md:mb-4 mx-auto opacity-40" />

                <p className="text-sm @xs:text-base @sm:text-lg @md:text-xl @lg:text-2xl font-medium text-foreground leading-relaxed mb-4 @md:mb-6">
                  {currentQuote.text}
                </p>

                <div className="flex items-center justify-center gap-2">
                  <div className="h-px w-8 @sm:w-12 bg-border" />
                  <p className="text-xs @sm:text-sm @md:text-base text-muted-foreground font-medium">
                    {currentQuote.author}
                  </p>
                  <div className="h-px w-8 @sm:w-12 bg-border" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions footer */}
        <div className="border-t bg-muted/30 backdrop-blur-sm p-3 @sm:p-4">
          <div className="flex items-center justify-between gap-2">
            {/* Left actions */}
            <div className="flex items-center gap-1 @sm:gap-2">
              <Button
                onClick={handleToggleFavorite}
                variant="ghost"
                size="sm"
                className={`h-8 w-8 @sm:h-9 @sm:w-9 p-0 ${
                  isFavorite ? "text-red-500 hover:text-red-600" : ""
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`}
                />
              </Button>

              <Button
                onClick={handleCopy}
                variant="ghost"
                size="sm"
                className="h-8 w-8 @sm:h-9 @sm:w-9 p-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>

              {/* Category filter for small containers */}
              <div className="@md:hidden">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 gap-1 text-xs"
                  onClick={() => {
                    const categories: QuoteCategory[] = [
                      "all",
                      "motivation",
                      "success",
                      "life",
                      "wisdom",
                      "creativity",
                    ];
                    const currentIndex = categories.indexOf(selectedCategory);
                    const nextCategory =
                      categories[(currentIndex + 1) % categories.length];
                    handleCategoryChange(nextCategory);
                  }}
                >
                  <Filter className="w-3 h-3" />
                  <span className="hidden @xs:inline">
                    {CATEGORY_LABELS[selectedCategory]}
                  </span>
                </Button>
              </div>
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2">
              {/* Favorite count - visible on larger containers */}
              {widget.config?.favorites && widget.config.favorites.length > 0 && (
                <div className="hidden @lg:flex items-center gap-1 text-xs text-muted-foreground">
                  <Heart className="w-3 h-3" />
                  <span>{widget.config.favorites.length}</span>
                </div>
              )}

              <Button
                onClick={handleRefresh}
                size="sm"
                className="h-8 @sm:h-9 gap-2 text-xs @sm:text-sm"
                disabled={isTransitioning || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 @sm:w-4 @sm:h-4 animate-spin" />
                ) : (
                  <RefreshCw
                    className={`w-3 h-3 @sm:w-4 @sm:h-4 ${
                      isTransitioning ? "animate-spin" : ""
                    }`}
                  />
                )}
                <span className="hidden @sm:inline">Nueva cita</span>
                <span className="@sm:hidden">Otra</span>
              </Button>
            </div>
          </div>

          {/* Category info for medium containers */}
          <div className="hidden @md:flex @lg:hidden items-center justify-center gap-2 mt-3 pt-3 border-t">
            <Badge
              className={`text-xs ${CATEGORY_COLORS[currentQuote.category]} border-0`}
            >
              {CATEGORY_LABELS[currentQuote.category]}
            </Badge>
            {currentQuote.source === "api" && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                API
              </Badge>
            )}
          </div>
        </div>

        {/* Quote count indicator - only visible on extra large containers */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="hidden @xl:block absolute bottom-3 left-3 text-xs text-muted-foreground/50"
        >
          {filteredQuotes.length} citas disponibles
        </motion.div>
      </div>
    </div>
  );
}
