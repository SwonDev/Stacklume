"use client";

import { useState, useCallback } from "react";
import {
  Gamepad2,
  Plus,
  Trash2,
  Play,
  Pause,
  Trophy,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  Timer,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface GameBacklogWidgetProps {
  widget: Widget;
}

type GameStatus = "backlog" | "playing" | "completed" | "abandoned";
type GamePlatform = "PC" | "PS5" | "Xbox" | "Switch" | "Mobile" | "Other";
type GamePriority = "high" | "medium" | "low";

interface Game {
  id: string;
  title: string;
  platform: GamePlatform;
  status: GameStatus;
  priority: GamePriority;
  playtime?: number;
}

const statusLabels: Record<GameStatus, string> = {
  backlog: "Backlog",
  playing: "Jugando",
  completed: "Completado",
  abandoned: "Abandonado",
};

const statusColors: Record<GameStatus, string> = {
  backlog: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  playing: "bg-amber-500/10 text-amber-500 border-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
  abandoned: "bg-red-500/10 text-red-500 border-red-500/30",
};

const statusIcons: Record<GameStatus, React.ReactNode> = {
  backlog: <Clock className="w-3 h-3" />,
  playing: <Play className="w-3 h-3" />,
  completed: <Trophy className="w-3 h-3" />,
  abandoned: <XCircle className="w-3 h-3" />,
};

const platformColors: Record<GamePlatform, string> = {
  PC: "bg-gray-500/10 text-gray-500 border-gray-500/30",
  PS5: "bg-blue-600/10 text-blue-600 border-blue-600/30",
  Xbox: "bg-green-500/10 text-green-500 border-green-500/30",
  Switch: "bg-red-500/10 text-red-500 border-red-500/30",
  Mobile: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  Other: "bg-slate-500/10 text-slate-500 border-slate-500/30",
};

const priorityColors: Record<GamePriority, string> = {
  high: "text-red-500",
  medium: "text-amber-500",
  low: "text-blue-500",
};

const priorityLabels: Record<GamePriority, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const platforms: GamePlatform[] = ["PC", "PS5", "Xbox", "Switch", "Mobile", "Other"];

export function GameBacklogWidget({ widget }: GameBacklogWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState<GamePlatform>("PC");
  const [newPriority, setNewPriority] = useState<GamePriority>("medium");
  const [expandedSections, setExpandedSections] = useState<Record<GameStatus, boolean>>({
    backlog: true,
    playing: true,
    completed: false,
    abandoned: false,
  });
  const [filterPlatform, setFilterPlatform] = useState<GamePlatform | "all">("all");

  const games: Game[] = widget.config?.games || [];

  const saveGames = useCallback(
    (items: Game[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          games: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addGame = () => {
    if (!newTitle.trim()) return;

    const newGame: Game = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      platform: newPlatform,
      status: "backlog",
      priority: newPriority,
      playtime: 0,
    };

    saveGames([newGame, ...games]);
    setNewTitle("");
    setNewPriority("medium");
    setIsAdding(false);
  };

  const deleteGame = (id: string) => {
    saveGames(games.filter((g) => g.id !== id));
  };

  const updateGameStatus = (id: string, status: GameStatus) => {
    saveGames(
      games.map((g) => {
        if (g.id !== id) return g;
        return {
          ...g,
          status,
        };
      })
    );
  };

  const updateGamePriority = (id: string, priority: GamePriority) => {
    saveGames(games.map((g) => (g.id === id ? { ...g, priority } : g)));
  };

  const updateGamePlaytime = (id: string, hours: number) => {
    saveGames(
      games.map((g) => (g.id === id ? { ...g, playtime: Math.max(0, hours) } : g))
    );
  };

  const cyclePriority = (id: string, current: GamePriority) => {
    const order: GamePriority[] = ["low", "medium", "high"];
    const currentIndex = order.indexOf(current);
    const nextPriority = order[(currentIndex + 1) % order.length];
    updateGamePriority(id, nextPriority);
  };

  const toggleSection = (status: GameStatus) => {
    setExpandedSections((prev) => ({
      ...prev,
      [status]: !prev[status],
    }));
  };

  const getGamesByStatus = (status: GameStatus) =>
    games
      .filter((g) => {
        if (g.status !== status) return false;
        if (filterPlatform !== "all" && g.platform !== filterPlatform) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort by priority (high first)
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

  const formatPlaytime = (hours: number) => {
    if (hours === 0) return null;
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours.toFixed(1)}h`;
  };

  const getTotalPlaytime = () => {
    return games.reduce((sum, g) => sum + (g.playtime || 0), 0);
  };

  const renderGameCard = (game: Game) => {
    const playtime = formatPlaytime(game.playtime || 0);

    return (
      <motion.div
        key={game.id}
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="group p-2 @sm:p-3 rounded-lg bg-card border border-border hover:border-primary/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              <Badge variant="outline" className={cn("text-[8px] @sm:text-[9px] h-4 px-1", platformColors[game.platform])}>
                {game.platform}
              </Badge>
              <button
                onClick={() => cyclePriority(game.id, game.priority)}
                className={cn(
                  "flex items-center gap-0.5 text-[8px] @sm:text-[9px] transition-colors",
                  priorityColors[game.priority]
                )}
                title={`Prioridad: ${priorityLabels[game.priority]}`}
              >
                {game.priority === "high" && <ArrowUp className="w-3 h-3" />}
                {game.priority === "medium" && <Pause className="w-3 h-3" />}
                {game.priority === "low" && <ArrowDown className="w-3 h-3" />}
              </button>
            </div>
            <p className="text-xs @sm:text-sm font-medium truncate">{game.title}</p>
            {playtime && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] text-muted-foreground">
                <Timer className="w-3 h-3" />
                {playtime}
              </div>
            )}
          </div>
          <button
            onClick={() => deleteGame(game.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Playtime tracker for playing games */}
        {game.status === "playing" && (
          <div className="mt-2 flex items-center gap-1">
            <Timer className="w-3 h-3 text-muted-foreground" />
            <div className="flex items-center gap-0.5">
              <Button
                variant="outline"
                size="sm"
                className="h-5 w-5 p-0 text-[10px]"
                onClick={() => updateGamePlaytime(game.id, (game.playtime || 0) - 0.5)}
              >
                -
              </Button>
              <span className="text-[10px] min-w-[3ch] text-center">
                {(game.playtime || 0).toFixed(1)}h
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-5 w-5 p-0 text-[10px]"
                onClick={() => updateGamePlaytime(game.id, (game.playtime || 0) + 0.5)}
              >
                +
              </Button>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1 mt-2 pt-2 border-t border-border/50 flex-wrap">
          {game.status === "backlog" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px]"
              onClick={() => updateGameStatus(game.id, "playing")}
            >
              <Play className="w-3 h-3 mr-0.5" />
              Jugar
            </Button>
          )}
          {game.status === "playing" && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px]"
                onClick={() => updateGameStatus(game.id, "backlog")}
              >
                <Pause className="w-3 h-3 mr-0.5" />
                Pausar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[9px] text-emerald-500 hover:text-emerald-600"
                onClick={() => updateGameStatus(game.id, "completed")}
              >
                <Trophy className="w-3 h-3 mr-0.5" />
                Completar
              </Button>
            </>
          )}
          {(game.status === "backlog" || game.status === "playing") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px] text-red-500 hover:text-red-600"
              onClick={() => updateGameStatus(game.id, "abandoned")}
            >
              <XCircle className="w-3 h-3 mr-0.5" />
              Abandonar
            </Button>
          )}
          {(game.status === "completed" || game.status === "abandoned") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[9px]"
              onClick={() => updateGameStatus(game.id, "backlog")}
            >
              <Clock className="w-3 h-3 mr-0.5" />
              A Backlog
            </Button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderSection = (status: GameStatus) => {
    const sectionGames = getGamesByStatus(status);
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
            <span className="text-xs text-muted-foreground">({sectionGames.length})</span>
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
              {sectionGames.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">Sin juegos</p>
              ) : (
                sectionGames.map(renderGameCard)
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const backlogCount = games.filter((g) => g.status === "backlog").length;
  const _playingCount = games.filter((g) => g.status === "playing").length;
  const completedCount = games.filter((g) => g.status === "completed").length;
  const totalPlaytime = getTotalPlaytime();

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gamepad2 className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {backlogCount} pendientes / {completedCount} completados
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

        {/* Stats */}
        {totalPlaytime > 0 && (
          <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-muted/50 border border-border">
            <Timer className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] @sm:text-xs text-muted-foreground">
              Tiempo total: <span className="text-foreground font-medium">{totalPlaytime.toFixed(1)}h</span>
            </span>
          </div>
        )}

        {/* Platform filter */}
        <div className="flex gap-1 mb-3 flex-wrap">
          <Button
            variant={filterPlatform === "all" ? "default" : "outline"}
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => setFilterPlatform("all")}
          >
            Todos
          </Button>
          {platforms.slice(0, 4).map((platform) => (
            <Button
              key={platform}
              variant={filterPlatform === platform ? "default" : "outline"}
              size="sm"
              className="h-6 px-2 text-[10px]"
              onClick={() => setFilterPlatform(platform)}
            >
              {platform}
            </Button>
          ))}
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
                placeholder="Nombre del juego..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-1 flex-wrap">
                {platforms.map((platform) => (
                  <Button
                    key={platform}
                    variant={newPlatform === platform ? "default" : "outline"}
                    size="sm"
                    className="h-7 px-2 text-[10px]"
                    onClick={() => setNewPlatform(platform)}
                  >
                    {platform}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                <span className="text-xs text-muted-foreground self-center mr-1">Prioridad:</span>
                {(["low", "medium", "high"] as GamePriority[]).map((priority) => (
                  <Button
                    key={priority}
                    variant={newPriority === priority ? "default" : "outline"}
                    size="sm"
                    className={cn("h-7 px-2 text-[10px]", newPriority === priority && priorityColors[priority])}
                    onClick={() => setNewPriority(priority)}
                  >
                    {priorityLabels[priority]}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  onClick={addGame}
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
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Games List */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Gamepad2 className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin juegos guardados</p>
              <p className="text-xs">Agrega uno para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(["playing", "backlog", "completed", "abandoned"] as GameStatus[]).map(
                renderSection
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
