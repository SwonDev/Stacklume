"use client";

import { useState, useCallback } from "react";
import {
  Tv,
  Plus,
  Trash2,
  Star,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  BookOpen,
  Edit2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface AnimeListWidgetProps {
  widget: Widget;
}

type AnimeType = "anime" | "manga";
type AnimeStatus = "planToWatch" | "watching" | "completed" | "dropped";

interface AnimeItem {
  id: string;
  title: string;
  type: AnimeType;
  totalEpisodes: number; // or chapters for manga
  currentEpisode: number;
  status: AnimeStatus;
  score: number; // 1-10, 0 = not rated
  addedAt: string;
}

const statusLabels: Record<AnimeStatus, string> = {
  planToWatch: "Por ver",
  watching: "Viendo",
  completed: "Completado",
  dropped: "Abandonado",
};

const statusColors: Record<AnimeStatus, string> = {
  planToWatch: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  watching: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  dropped: "bg-red-500/10 text-red-500 border-red-500/30",
};

const statusIcons: Record<AnimeStatus, React.ReactNode> = {
  planToWatch: <Clock className="w-3 h-3" />,
  watching: <Play className="w-3 h-3" />,
  completed: <CheckCircle2 className="w-3 h-3" />,
  dropped: <XCircle className="w-3 h-3" />,
};

const typeLabels: Record<AnimeType, string> = {
  anime: "Anime",
  manga: "Manga",
};

const typeIcons: Record<AnimeType, React.ReactNode> = {
  anime: <Tv className="w-3 h-3" />,
  manga: <BookOpen className="w-3 h-3" />,
};

export function AnimeListWidget({ widget }: AnimeListWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<AnimeType>("anime");
  const [newTotalEpisodes, setNewTotalEpisodes] = useState("");
  const [filterType, setFilterType] = useState<AnimeType | "all">("all");
  const [expandedSections, setExpandedSections] = useState<Record<AnimeStatus, boolean>>({
    planToWatch: true,
    watching: true,
    completed: false,
    dropped: false,
  });

  const animeList: AnimeItem[] = widget.config?.animeList || [];

  const saveAnimeList = useCallback(
    (items: AnimeItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          animeList: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addAnime = () => {
    if (!newTitle.trim()) return;

    const newItem: AnimeItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      type: newType,
      totalEpisodes: parseInt(newTotalEpisodes) || 0,
      currentEpisode: 0,
      status: "planToWatch",
      score: 0,
      addedAt: new Date().toISOString(),
    };

    saveAnimeList([newItem, ...animeList]);
    setNewTitle("");
    setNewTotalEpisodes("");
    setIsAdding(false);
  };

  const deleteAnime = (id: string) => {
    saveAnimeList(animeList.filter((a) => a.id !== id));
  };

  const updateAnimeStatus = (id: string, status: AnimeStatus) => {
    saveAnimeList(
      animeList.map((a) => {
        if (a.id !== id) return a;
        return {
          ...a,
          status,
          currentEpisode: status === "completed" ? a.totalEpisodes : a.currentEpisode,
        };
      })
    );
  };

  const updateAnimeEpisode = (id: string, episode: number) => {
    saveAnimeList(
      animeList.map((a) => {
        if (a.id !== id) return a;
        const newEpisode = Math.max(0, Math.min(episode, a.totalEpisodes || Infinity));
        const isNowComplete = a.totalEpisodes > 0 && newEpisode >= a.totalEpisodes;
        return {
          ...a,
          currentEpisode: newEpisode,
          status: isNowComplete ? "completed" : a.status === "planToWatch" ? "watching" : a.status,
        };
      })
    );
  };

  const updateAnimeScore = (id: string, score: number) => {
    saveAnimeList(animeList.map((a) => (a.id === id ? { ...a, score } : a)));
  };

  const startEditing = (item: AnimeItem) => {
    setEditingId(item.id);
    setEditingValue(item.currentEpisode.toString());
  };

  const confirmEdit = (id: string) => {
    const episode = parseInt(editingValue);
    if (!isNaN(episode)) {
      updateAnimeEpisode(id, episode);
    }
    setEditingId(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  const toggleSection = (status: AnimeStatus) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const getItemsByStatus = (status: AnimeStatus) =>
    animeList.filter((a) => {
      if (a.status !== status) return false;
      if (filterType !== "all" && a.type !== filterType) return false;
      return true;
    });

  const getProgressPercentage = (item: AnimeItem) =>
    item.totalEpisodes > 0 ? Math.round((item.currentEpisode / item.totalEpisodes) * 100) : 0;

  const renderScoreSelector = (item: AnimeItem) => (
    <div className="flex gap-0.5 items-center">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
        <button
          key={score}
          onClick={() => updateAnimeScore(item.id, score === item.score ? 0 : score)}
          className={cn(
            "w-4 h-4 @sm:w-5 @sm:h-5 rounded text-[8px] @sm:text-[9px] font-medium transition-colors",
            score <= item.score
              ? "bg-amber-500 text-white"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {score}
        </button>
      ))}
    </div>
  );

  const renderAnimeCard = (item: AnimeItem) => {
    const progress = getProgressPercentage(item);
    const isEditing = editingId === item.id;
    const episodeLabel = item.type === "anime" ? "ep" : "cap";

    return (
      <motion.div
        key={item.id}
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group p-2 @sm:p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Badge variant="outline" className="text-[8px] @sm:text-[9px] h-4 px-1">
                {typeIcons[item.type]}
                <span className="ml-0.5">{typeLabels[item.type]}</span>
              </Badge>
            </div>
            <p className="text-xs @sm:text-sm font-medium truncate">{item.title}</p>
          </div>
          <button
            onClick={() => deleteAnime(item.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] @sm:text-xs">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  className="h-5 w-12 text-[10px] px-1"
                  type="number"
                  min={0}
                  max={item.totalEpisodes || undefined}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmEdit(item.id);
                    if (e.key === "Escape") cancelEdit();
                  }}
                />
                <span className="text-muted-foreground">
                  / {item.totalEpisodes || "?"} {episodeLabel}
                </span>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => confirmEdit(item.id)}>
                  <Check className="w-3 h-3 text-emerald-500" />
                </Button>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={cancelEdit}>
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => startEditing(item)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  {item.currentEpisode} / {item.totalEpisodes || "?"} {episodeLabel}
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}
            {item.totalEpisodes > 0 && (
              <span className="text-muted-foreground">{progress}%</span>
            )}
          </div>

          {item.totalEpisodes > 0 && <Progress value={progress} className="h-1" />}

          {/* Quick episode buttons */}
          {item.status === "watching" && !isEditing && (
            <div className="flex gap-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-5 px-1.5 text-[9px] flex-1"
                onClick={() => updateAnimeEpisode(item.id, item.currentEpisode + 1)}
              >
                +1 {episodeLabel}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-5 px-1.5 text-[9px] flex-1"
                onClick={() => updateAnimeStatus(item.id, "completed")}
              >
                <CheckCircle2 className="w-3 h-3 mr-0.5" />
                Completar
              </Button>
            </div>
          )}

          {/* Score */}
          {(item.status === "completed" || item.status === "dropped" || item.score > 0) && (
            <div className="pt-1">
              <div className="flex items-center gap-1 mb-1">
                <Star className="w-3 h-3 text-amber-500" />
                <span className="text-[9px] text-muted-foreground">
                  {item.score > 0 ? `${item.score}/10` : "Sin puntaje"}
                </span>
              </div>
              {renderScoreSelector(item)}
            </div>
          )}
        </div>

        {/* Status change buttons */}
        {item.status !== "completed" && item.status !== "dropped" && (
          <div className="flex gap-1 mt-2 pt-2 border-t border-border/50">
            {item.status === "planToWatch" && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] flex-1"
                onClick={() => updateAnimeStatus(item.id, "watching")}
              >
                <Play className="w-3 h-3 mr-0.5" />
                Empezar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-red-500 hover:text-red-600"
              onClick={() => updateAnimeStatus(item.id, "dropped")}
            >
              <XCircle className="w-3 h-3 mr-0.5" />
              Abandonar
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  const renderSection = (status: AnimeStatus) => {
    const items = getItemsByStatus(status);
    const isExpanded = expandedSections[status];

    if (items.length === 0 && status !== "watching" && status !== "planToWatch") return null;

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
            <span className="text-xs text-muted-foreground">({items.length})</span>
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
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sin items</p>
              ) : (
                items.map(renderAnimeCard)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const watchingCount = animeList.filter((a) => a.status === "watching").length;
  const completedCount = animeList.filter((a) => a.status === "completed").length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Tv className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {watchingCount} viendo / {completedCount} completados
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

        {/* Filters */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <Button
            variant={filterType === "all" ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilterType("all")}
          >
            Todos
          </Button>
          <Button
            variant={filterType === "anime" ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilterType("anime")}
          >
            <Tv className="w-3 h-3 mr-1" />
            Anime
          </Button>
          <Button
            variant={filterType === "manga" ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilterType("manga")}
          >
            <BookOpen className="w-3 h-3 mr-1" />
            Manga
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
                placeholder="Titulo..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="flex gap-1">
                  <Button
                    variant={newType === "anime" ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setNewType("anime")}
                  >
                    <Tv className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={newType === "manga" ? "default" : "outline"}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => setNewType("manga")}
                  >
                    <BookOpen className="w-3 h-3" />
                  </Button>
                </div>
                <Input
                  value={newTotalEpisodes}
                  onChange={(e) => setNewTotalEpisodes(e.target.value)}
                  placeholder={newType === "anime" ? "Episodios" : "Capitulos"}
                  type="number"
                  className="h-8 text-sm flex-1"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  onClick={addAnime}
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
                    setNewTotalEpisodes("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Anime List */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {animeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Tv className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin anime/manga guardado</p>
              <p className="text-xs">Agrega uno para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(["watching", "planToWatch", "completed", "dropped"] as AnimeStatus[]).map(
                renderSection
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
