"use client";

import { useState, useCallback } from "react";
import {
  Film,
  Plus,
  Trash2,
  Star,
  Eye,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface MovieTrackerWidgetProps {
  widget: Widget;
}

type MovieStatus = "toWatch" | "watching" | "watched";

interface Movie {
  id: string;
  title: string;
  year?: string;
  posterUrl?: string;
  status: MovieStatus;
  rating?: number; // 1-5 stars, 0 = not rated
  addedAt: string;
}

const statusLabels: Record<MovieStatus, string> = {
  toWatch: "Por ver",
  watching: "Viendo",
  watched: "Vistas",
};

const statusColors: Record<MovieStatus, string> = {
  toWatch: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  watching: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  watched: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
};

const statusIcons: Record<MovieStatus, React.ReactNode> = {
  toWatch: <Clock className="w-3 h-3" />,
  watching: <Eye className="w-3 h-3" />,
  watched: <Check className="w-3 h-3" />,
};

export function MovieTrackerWidget({ widget }: MovieTrackerWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newPosterUrl, setNewPosterUrl] = useState("");
  const [_activeTab, _setActiveTab] = useState<MovieStatus>("toWatch");
  const [expandedSections, setExpandedSections] = useState<Record<MovieStatus, boolean>>({
    toWatch: true,
    watching: true,
    watched: true,
  });

  const movies: Movie[] = widget.config?.movies || [];

  const saveMovies = useCallback(
    (items: Movie[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          movies: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addMovie = () => {
    if (!newTitle.trim()) return;

    const newMovie: Movie = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      year: newYear.trim(),
      posterUrl: newPosterUrl.trim(),
      status: "toWatch",
      rating: 0,
      addedAt: new Date().toISOString(),
    };

    saveMovies([newMovie, ...movies]);
    setNewTitle("");
    setNewYear("");
    setNewPosterUrl("");
    setIsAdding(false);
  };

  const deleteMovie = (id: string) => {
    saveMovies(movies.filter((m) => m.id !== id));
  };

  const updateMovieStatus = (id: string, newStatus: MovieStatus) => {
    saveMovies(
      movies.map((m) =>
        m.id === id
          ? { ...m, status: newStatus, rating: newStatus !== "watched" ? 0 : m.rating }
          : m
      )
    );
  };

  const updateMovieRating = (id: string, rating: number) => {
    saveMovies(movies.map((m) => (m.id === id ? { ...m, rating } : m)));
  };

  const toggleSection = (status: MovieStatus) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const getMoviesByStatus = (status: MovieStatus) =>
    movies.filter((m) => m.status === status);

  const renderStars = (movie: Movie) => {
    if (movie.status !== "watched") return null;

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => updateMovieRating(movie.id, star === movie.rating ? 0 : star)}
            className="p-0.5 transition-colors"
          >
            <Star
              className={cn(
                "w-3 h-3 transition-colors",
                star <= (movie.rating ?? 0)
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/30 hover:text-amber-400/50"
              )}
            />
          </button>
        ))}
      </div>
    );
  };

  const renderMovieCard = (movie: Movie) => (
    <motion.div
      key={movie.id}
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex gap-2 p-2 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
    >
      {/* Poster */}
      <div className="flex-shrink-0 w-10 h-14 @sm:w-12 @sm:h-16 rounded overflow-hidden bg-muted">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <p className="text-xs @sm:text-sm font-medium truncate">{movie.title}</p>
          {movie.year && (
            <p className="text-[10px] @sm:text-xs text-muted-foreground">{movie.year}</p>
          )}
        </div>
        <div className="flex items-center gap-1 mt-1">
          {renderStars(movie)}
          {movie.status !== "watched" && (
            <div className="flex gap-0.5">
              {movie.status === "toWatch" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px]"
                  onClick={() => updateMovieStatus(movie.id, "watching")}
                >
                  <Eye className="w-3 h-3 mr-0.5" />
                  Ver
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px]"
                onClick={() => updateMovieStatus(movie.id, "watched")}
              >
                <Check className="w-3 h-3 mr-0.5" />
                Vista
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={() => deleteMovie(movie.id)}
        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1 self-start"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  );

  const renderSection = (status: MovieStatus) => {
    const sectionMovies = getMoviesByStatus(status);
    const isExpanded = expandedSections[status];

    return (
      <div key={status} className="space-y-1">
        <button
          onClick={() => toggleSection(status)}
          className="w-full flex items-center justify-between p-1.5 rounded hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[10px]", statusColors[status])}>
              {statusIcons[status]}
              <span className="ml-1">{statusLabels[status]}</span>
            </Badge>
            <span className="text-xs text-muted-foreground">({sectionMovies.length})</span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-1 overflow-hidden"
            >
              {sectionMovies.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Sin peliculas
                </p>
              ) : (
                sectionMovies.map(renderMovieCard)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const totalCount = movies.length;
  const watchedCount = getMoviesByStatus("watched").length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {watchedCount}/{totalCount} vistas
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 space-y-2 overflow-hidden"
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titulo de la pelicula..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  placeholder="Anio"
                  className="h-8 text-sm w-20"
                />
                <Input
                  value={newPosterUrl}
                  onChange={(e) => setNewPosterUrl(e.target.value)}
                  placeholder="URL del poster (opcional)"
                  className="h-8 text-sm flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  onClick={addMovie}
                  disabled={!newTitle.trim()}
                >
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTitle("");
                    setNewYear("");
                    setNewPosterUrl("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Movies List */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {movies.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Film className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin peliculas guardadas</p>
              <p className="text-xs">Agrega una para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(["toWatch", "watching", "watched"] as MovieStatus[]).map(renderSection)}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
