"use client";

import { useMemo } from "react";
import { BarChart3, Link2, TrendingUp, Star, Hash, Globe } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import type { Link } from "@/lib/db/schema";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface BarChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface MiniBarChartProps {
  data: BarChartData[];
  maxItems?: number;
}

function MiniBarChart({ data, maxItems = 5 }: MiniBarChartProps) {
  const topData = data.slice(0, maxItems);
  const maxValue = Math.max(...topData.map(d => d.value), 1);

  return (
    <div className="space-y-1.5 @[200px]:space-y-2">
      {topData.map((item, index) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="space-y-0.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className={cn(
              "text-muted-foreground truncate flex-1",
              "text-[10px] @[200px]:text-xs"
            )}>
              {item.label}
            </span>
            <span className={cn(
              "font-semibold tabular-nums flex-shrink-0",
              "text-[10px] @[200px]:text-xs"
            )}>
              {item.value}
            </span>
          </div>
          <div className="h-1.5 @[200px]:h-2 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={cn("h-full rounded-full", item.color)}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  trend?: string;
}

function StatCard({ icon, label, value, color, trend }: StatCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-lg p-2 @[200px]:p-2.5 @[280px]:p-3 flex items-center gap-2 @[200px]:gap-2.5 @[280px]:gap-3",
        "bg-secondary/30 hover:bg-secondary/50 transition-colors"
      )}
      whileHover={{ scale: 1.02 }}
    >
      <div className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0",
        color,
        "w-7 h-7 @[200px]:w-8 @[200px]:h-8 @[280px]:w-10 @[280px]:h-10"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-muted-foreground truncate",
          "text-[10px] @[200px]:text-xs"
        )}>
          {label}
        </p>
        <p className={cn(
          "font-bold tabular-nums",
          "text-base @[200px]:text-lg @[280px]:text-xl"
        )}>
          {value}
        </p>
        {trend && (
          <p className={cn(
            "text-green-500 text-[9px] @[200px]:text-[10px]"
          )}>
            {trend}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export function LinkAnalyticsWidget() {
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);

  const analytics = useMemo(() => {
    // Total links
    const totalLinks = links.length;

    // Favorites
    const favoritesCount = links.filter((link: Link) => link.isFavorite).length;
    const favoritesPercentage = totalLinks > 0
      ? Math.round((favoritesCount / totalLinks) * 100)
      : 0;

    // Links added this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const linksThisWeek = links.filter((link: Link) => {
      const createdDate = new Date(link.createdAt);
      return createdDate > weekAgo;
    }).length;

    // Links added this month
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const linksThisMonth = links.filter((link: Link) => {
      const createdDate = new Date(link.createdAt);
      return createdDate > monthAgo;
    }).length;

    // Category distribution
    const categoryDistribution = categories.map(category => {
      const count = links.filter((link: Link) => link.categoryId === category.id).length;
      return {
        label: category.name,
        value: count,
        percentage: totalLinks > 0 ? (count / totalLinks) * 100 : 0,
        color: "bg-blue-500",
      };
    }).filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Uncategorized links
    const uncategorizedCount = links.filter((link: Link) => !link.categoryId).length;
    if (uncategorizedCount > 0) {
      categoryDistribution.push({
        label: "Sin categoría",
        value: uncategorizedCount,
        percentage: totalLinks > 0 ? (uncategorizedCount / totalLinks) * 100 : 0,
        color: "bg-gray-400",
      });
    }

    // Tag distribution
    const tagDistribution = tags.map(tag => {
      const count = linkTags.filter(lt => lt.tagId === tag.id).length;
      return {
        label: tag.name,
        value: count,
        percentage: totalLinks > 0 ? (count / totalLinks) * 100 : 0,
        color: "bg-purple-500",
      };
    }).filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    // Domain distribution (top domains)
    const domainMap = new Map<string, number>();
    links.forEach((link: Link) => {
      try {
        const url = new URL(link.url);
        const domain = url.hostname.replace(/^www\./, "");
        domainMap.set(domain, (domainMap.get(domain) || 0) + 1);
      } catch {
        // Invalid URL, skip
      }
    });

    const domainDistribution = Array.from(domainMap.entries())
      .map(([domain, count]) => ({
        label: domain,
        value: count,
        percentage: totalLinks > 0 ? (count / totalLinks) * 100 : 0,
        color: "bg-green-500",
      }))
      .sort((a, b) => b.value - a.value);

    return {
      totalLinks,
      favoritesCount,
      favoritesPercentage,
      linksThisWeek,
      linksThisMonth,
      categoryDistribution,
      tagDistribution,
      domainDistribution,
      totalCategories: categories.length,
      totalTags: tags.length,
    };
  }, [links, categories, tags, linkTags]);

  if (analytics.totalLinks === 0) {
    return (
      <div className="@container h-full w-full flex flex-col items-center justify-center p-4 @[200px]:p-6 text-center">
        <div className={cn(
          "rounded-full bg-secondary/50 flex items-center justify-center mb-3",
          "w-10 h-10 @[200px]:w-12 @[200px]:h-12"
        )}>
          <BarChart3 className={cn(
            "text-muted-foreground",
            "w-5 h-5 @[200px]:w-6 @[200px]:h-6"
          )} />
        </div>
        <p className={cn(
          "text-muted-foreground",
          "text-xs @[200px]:text-sm"
        )}>
          Sin datos aún
        </p>
        <p className={cn(
          "text-muted-foreground/60 mt-1",
          "text-[10px] @[200px]:text-xs"
        )}>
          Añade enlaces para ver estadísticas
        </p>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full overflow-auto scrollbar-thin">
      <div className="space-y-2 @[200px]:space-y-2.5 @[280px]:space-y-3 p-1 @[200px]:p-1.5 @[280px]:p-2">
        {/* Overview Stats - Responsive grid */}
        <div className={cn(
          "grid gap-1.5 @[200px]:gap-2",
          "grid-cols-2 @[280px]:grid-cols-2"
        )}>
          <StatCard
            icon={<Link2 className="w-3.5 h-3.5 @[200px]:w-4 @[200px]:h-4 text-blue-500" />}
            label="Total Enlaces"
            value={analytics.totalLinks}
            color="bg-blue-500/10"
          />
          <StatCard
            icon={<Star className="w-3.5 h-3.5 @[200px]:w-4 @[200px]:h-4 text-yellow-500" />}
            label="Favoritos"
            value={`${analytics.favoritesPercentage}%`}
            color="bg-yellow-500/10"
            trend={analytics.favoritesCount > 0 ? `${analytics.favoritesCount} marcados` : undefined}
          />
        </div>

        {/* Recent Activity */}
        <div className={cn(
          "grid gap-1.5 @[200px]:gap-2",
          "grid-cols-2"
        )}>
          <StatCard
            icon={<TrendingUp className="w-3.5 h-3.5 @[200px]:w-4 @[200px]:h-4 text-green-500" />}
            label="Esta semana"
            value={analytics.linksThisWeek}
            color="bg-green-500/10"
          />
          <StatCard
            icon={<TrendingUp className="w-3.5 h-3.5 @[200px]:w-4 @[200px]:h-4 text-emerald-500" />}
            label="Este mes"
            value={analytics.linksThisMonth}
            color="bg-emerald-500/10"
          />
        </div>

        {/* Category Distribution */}
        {analytics.categoryDistribution.length > 0 && (
          <div className={cn(
            "rounded-lg p-2 @[200px]:p-2.5 @[280px]:p-3",
            "bg-secondary/20"
          )}>
            <div className="flex items-center gap-1.5 @[200px]:gap-2 mb-2 @[200px]:mb-2.5">
              <div className={cn(
                "rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0",
                "w-6 h-6 @[200px]:w-7 @[200px]:h-7"
              )}>
                <BarChart3 className="w-3 h-3 @[200px]:w-3.5 @[200px]:h-3.5 text-blue-500" />
              </div>
              <h3 className={cn(
                "font-semibold",
                "text-xs @[200px]:text-sm"
              )}>
                Por Categoría
              </h3>
            </div>
            <MiniBarChart
              data={analytics.categoryDistribution}
              maxItems={5}
            />
          </div>
        )}

        {/* Tag Distribution */}
        {analytics.tagDistribution.length > 0 && (
          <div className={cn(
            "rounded-lg p-2 @[200px]:p-2.5 @[280px]:p-3",
            "bg-secondary/20"
          )}>
            <div className="flex items-center gap-1.5 @[200px]:gap-2 mb-2 @[200px]:mb-2.5">
              <div className={cn(
                "rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0",
                "w-6 h-6 @[200px]:w-7 @[200px]:h-7"
              )}>
                <Hash className="w-3 h-3 @[200px]:w-3.5 @[200px]:h-3.5 text-purple-500" />
              </div>
              <h3 className={cn(
                "font-semibold",
                "text-xs @[200px]:text-sm"
              )}>
                Por Etiqueta
              </h3>
            </div>
            <MiniBarChart
              data={analytics.tagDistribution}
              maxItems={5}
            />
          </div>
        )}

        {/* Domain Distribution */}
        {analytics.domainDistribution.length > 0 && (
          <div className={cn(
            "rounded-lg p-2 @[200px]:p-2.5 @[280px]:p-3",
            "bg-secondary/20"
          )}>
            <div className="flex items-center gap-1.5 @[200px]:gap-2 mb-2 @[200px]:mb-2.5">
              <div className={cn(
                "rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0",
                "w-6 h-6 @[200px]:w-7 @[200px]:h-7"
              )}>
                <Globe className="w-3 h-3 @[200px]:w-3.5 @[200px]:h-3.5 text-green-500" />
              </div>
              <h3 className={cn(
                "font-semibold",
                "text-xs @[200px]:text-sm"
              )}>
                Dominios Principales
              </h3>
            </div>
            <MiniBarChart
              data={analytics.domainDistribution}
              maxItems={5}
            />
          </div>
        )}
      </div>
    </div>
  );
}
