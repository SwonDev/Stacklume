"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  Clock,
  TrendingUp,
  Lightbulb,
  RefreshCw,
  Calendar,
  Target,
  Flame,
  Star,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";

interface AIDailySummaryWidgetProps {
  widget: Widget;
}

interface AIDailySummaryWidgetConfig {
  lastSummaryDate?: string;
  tasksCompleted?: number;
  focusMinutes?: number;
  streak?: number;
}

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  type: "tip" | "achievement" | "motivation" | "reminder";
}

const MOTIVATIONAL_TIPS: Array<{ title: string; description: string }> = [
  {
    title: "Organiza tus enlaces",
    description: "Los enlaces bien categorizados son mas faciles de encontrar cuando los necesitas.",
  },
  {
    title: "Revisa tus favoritos",
    description: "Tus enlaces favoritos merecen atencion. Visitaste alguno recientemente?",
  },
  {
    title: "Descubre nuevos recursos",
    description: "Explora categorias que no visitas seguido. Podrias encontrar algo util!",
  },
  {
    title: "Limpia tu coleccion",
    description: "Eliminar enlaces obsoletos mantiene tu dashboard limpio y util.",
  },
  {
    title: "Usa etiquetas",
    description: "Las etiquetas te ayudan a encontrar enlaces relacionados rapidamente.",
  },
  {
    title: "Establece metas",
    description: "Define cuantos enlaces utiles quieres guardar esta semana.",
  },
  {
    title: "Comparte conocimiento",
    description: "Los mejores recursos son mas valiosos cuando se comparten.",
  },
  {
    title: "Crea rutinas",
    description: "Revisa tus enlaces guardados al inicio de cada dia.",
  },
];

const ACHIEVEMENTS: Array<{ title: string; description: string; threshold: number }> = [
  { title: "Primer paso", description: "Has guardado tu primer enlace!", threshold: 1 },
  { title: "Coleccionista", description: "Ya tienes 10 enlaces guardados.", threshold: 10 },
  { title: "Organizador", description: "Excelente! 25 enlaces y contando.", threshold: 25 },
  { title: "Curador experto", description: "Impresionante! 50 enlaces en tu coleccion.", threshold: 50 },
  { title: "Maestro de enlaces", description: "100+ enlaces! Eres un verdadero experto.", threshold: 100 },
];

function getDayOfYear(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

export function AIDailySummaryWidget({ widget }: AIDailySummaryWidgetProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const config = widget.config as AIDailySummaryWidgetConfig | undefined;
  const { links, categories, tags } = useLinksStore();
  const widgets = useWidgetStore((state) => state.widgets);

  const updateConfig = useCallback(
    (updates: Partial<AIDailySummaryWidgetConfig>) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          ...updates,
        } as Record<string, unknown>,
      });
    },
    [widget.id, widget.config]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Links added today
    const linksToday = links.filter((link) => {
      const createdDate = new Date(link.createdAt).toISOString().split("T")[0];
      return createdDate === todayStr;
    }).length;

    // Links added this week
    const linksThisWeek = links.filter((link) => {
      return new Date(link.createdAt) >= weekAgo;
    }).length;

    // Favorites count
    const favoritesCount = links.filter((link) => link.isFavorite).length;

    // Most used category
    const categoryCount: Record<string, number> = {};
    links.forEach((link) => {
      if (link.categoryId) {
        categoryCount[link.categoryId] = (categoryCount[link.categoryId] || 0) + 1;
      }
    });
    const topCategoryId = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topCategory = categories.find((c) => c.id === topCategoryId);

    // Calculate streak (simulated based on day of year for consistency)
    const streak = config?.streak || (getDayOfYear() % 7) + 1;

    // Tasks completed (from todo widgets)
    const todoWidgets = widgets.filter((w) => w.type === "todo");
    let tasksCompleted = 0;
    todoWidgets.forEach((w) => {
      const todoConfig = w.config as { todoItems?: Array<{ completed: boolean }> };
      if (todoConfig?.todoItems) {
        tasksCompleted += todoConfig.todoItems.filter((t) => t.completed).length;
      }
    });

    // Focus time (from pomodoro widgets)
    const pomodoroWidgets = widgets.filter((w) => w.type === "pomodoro");
    let focusMinutes = config?.focusMinutes || 0;
    if (pomodoroWidgets.length > 0) {
      // Simulated focus time based on existing data
      focusMinutes = Math.max(focusMinutes, (getDayOfYear() % 120) + 30);
    }

    return {
      totalLinks: links.length,
      linksToday,
      linksThisWeek,
      favoritesCount,
      categoriesCount: categories.length,
      tagsCount: tags.length,
      topCategory,
      streak,
      tasksCompleted,
      focusMinutes,
    };
  }, [links, categories, tags, widgets, config?.streak, config?.focusMinutes]);

  // Generate insights
  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];

    // Achievement insight
    const achievement = ACHIEVEMENTS.filter((a) => stats.totalLinks >= a.threshold).pop();
    if (achievement) {
      result.push({
        id: "achievement",
        icon: <Star className="w-4 h-4 text-amber-500" />,
        title: achievement.title,
        description: achievement.description,
        type: "achievement",
      });
    }

    // Tip based on day
    const tipIndex = (getDayOfYear() + refreshKey) % MOTIVATIONAL_TIPS.length;
    const tip = MOTIVATIONAL_TIPS[tipIndex];
    result.push({
      id: "tip",
      icon: <Lightbulb className="w-4 h-4 text-yellow-500" />,
      title: tip.title,
      description: tip.description,
      type: "tip",
    });

    // Streak motivation
    if (stats.streak >= 3) {
      result.push({
        id: "streak",
        icon: <Flame className="w-4 h-4 text-orange-500" />,
        title: `Racha de ${stats.streak} dias!`,
        description: "Sigue asi! La constancia es la clave del exito.",
        type: "motivation",
      });
    }

    // Category reminder
    if (stats.topCategory) {
      result.push({
        id: "category",
        icon: <Target className="w-4 h-4 text-blue-500" />,
        title: `Enfocado en ${stats.topCategory.name}`,
        description: "Tu categoria mas activa. Considera explorar otras areas tambien.",
        type: "reminder",
      });
    }

    return result;
  }, [stats, refreshKey]);

  // Update last summary date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (config?.lastSummaryDate !== today) {
      updateConfig({
        lastSummaryDate: today,
        streak: (config?.streak || 0) + 1,
      });
    }
  }, [config?.lastSummaryDate, config?.streak, updateConfig]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b @sm:px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center @sm:w-7 @sm:h-7">
              <Sparkles className="w-3.5 h-3.5 text-white @sm:w-4 @sm:h-4" />
            </div>
            <div>
              <span className="text-xs font-medium @sm:text-sm">Resumen del Dia</span>
              <p className="text-[10px] text-muted-foreground hidden @sm:block">
                {new Date().toLocaleDateString("es-ES", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")}
            />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4 @sm:p-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-2 @sm:gap-3 @md:grid-cols-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-2 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20 @sm:p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <LinkIcon className="w-3 h-3 text-blue-500 @sm:w-3.5 @sm:h-3.5" />
                  <span className="text-[10px] text-muted-foreground @sm:text-xs">
                    Enlaces hoy
                  </span>
                </div>
                <p className="text-lg font-bold text-blue-600 @sm:text-xl">
                  +{stats.linksToday}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 }}
                className="p-2 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/20 @sm:p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500 @sm:w-3.5 @sm:h-3.5" />
                  <span className="text-[10px] text-muted-foreground @sm:text-xs">
                    Tareas
                  </span>
                </div>
                <p className="text-lg font-bold text-green-600 @sm:text-xl">
                  {stats.tasksCompleted}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-2 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/20 @sm:p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3 h-3 text-purple-500 @sm:w-3.5 @sm:h-3.5" />
                  <span className="text-[10px] text-muted-foreground @sm:text-xs">
                    Enfoque
                  </span>
                </div>
                <p className="text-lg font-bold text-purple-600 @sm:text-xl">
                  {formatTime(stats.focusMinutes)}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
                className="p-2 rounded-lg bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20 @sm:p-3"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Flame className="w-3 h-3 text-orange-500 @sm:w-3.5 @sm:h-3.5" />
                  <span className="text-[10px] text-muted-foreground @sm:text-xs">
                    Racha
                  </span>
                </div>
                <p className="text-lg font-bold text-orange-600 @sm:text-xl">
                  {stats.streak}d
                </p>
              </motion.div>
            </div>

            {/* Weekly Overview */}
            <div className="p-3 rounded-lg border bg-card @sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium @sm:text-sm">Esta semana</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold @sm:text-xl">{stats.linksThisWeek}</p>
                  <p className="text-[10px] text-muted-foreground @sm:text-xs">
                    Enlaces nuevos
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold @sm:text-xl">{stats.totalLinks}</p>
                  <p className="text-[10px] text-muted-foreground @sm:text-xs">
                    Total enlaces
                  </p>
                </div>
                <div>
                  <p className="text-lg font-bold @sm:text-xl">{stats.favoritesCount}</p>
                  <p className="text-[10px] text-muted-foreground @sm:text-xs">
                    Favoritos
                  </p>
                </div>
              </div>
            </div>

            {/* Insights Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium @sm:text-sm">Insights</span>
              </div>
              <AnimatePresence mode="popLayout">
                {insights.map((insight, index) => (
                  <motion.div
                    key={insight.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "p-3 rounded-lg border",
                      insight.type === "achievement" && "bg-amber-500/5 border-amber-500/20",
                      insight.type === "tip" && "bg-yellow-500/5 border-yellow-500/20",
                      insight.type === "motivation" && "bg-orange-500/5 border-orange-500/20",
                      insight.type === "reminder" && "bg-blue-500/5 border-blue-500/20"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">{insight.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium @sm:text-sm">{insight.title}</p>
                        <p className="text-[10px] text-muted-foreground @sm:text-xs mt-0.5">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t bg-muted/30 px-3 py-2 @sm:px-4">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground @sm:text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {stats.categoriesCount} categorias, {stats.tagsCount} etiquetas
            </span>
            <Badge variant="outline" className="text-[10px] h-5">
              IA Simulada
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
