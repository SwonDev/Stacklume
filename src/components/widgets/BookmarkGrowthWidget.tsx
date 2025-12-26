"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, Bookmark, Calendar } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";

interface BookmarkGrowthWidgetProps {
  widget: Widget;
}

interface MonthData {
  month: string;
  count: number;
  label: string;
}

interface GrowthStats {
  total: number;
  thisWeek: number;
  thisMonth: number;
  lastMonth: number;
  growthPercentage: number;
  isPositiveGrowth: boolean;
  monthlyData: MonthData[];
}

export function BookmarkGrowthWidget({ widget: _widget }: BookmarkGrowthWidgetProps) {
  const { links } = useLinksStore();

  const stats: GrowthStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Calculate basic stats
    const total = links.length;
    const thisWeek = links.filter(
      (link) => link.createdAt && new Date(link.createdAt) >= startOfWeek
    ).length;
    const thisMonth = links.filter(
      (link) => link.createdAt && new Date(link.createdAt) >= startOfMonth
    ).length;
    const lastMonth = links.filter(
      (link) =>
        link.createdAt &&
        new Date(link.createdAt) >= startOfLastMonth &&
        new Date(link.createdAt) <= endOfLastMonth
    ).length;

    // Calculate growth percentage (month over month)
    const growthPercentage =
      lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : thisMonth > 0 ? 100 : 0;
    const isPositiveGrowth = growthPercentage >= 0;

    // Generate last 6 months of data
    const monthlyData: MonthData[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const monthName = monthDate.toLocaleDateString("en-US", { month: "short" });
      const count = links.filter((link) => {
        if (!link.createdAt) return false;
        const linkDate = new Date(link.createdAt);
        return linkDate >= monthDate && linkDate < nextMonthDate;
      }).length;

      monthlyData.push({
        month: monthName,
        count,
        label: `${monthName} ${monthDate.getFullYear()}`,
      });
    }

    return {
      total,
      thisWeek,
      thisMonth,
      lastMonth,
      growthPercentage,
      isPositiveGrowth,
      monthlyData,
    };
  }, [links]);

  const maxCount = Math.max(...stats.monthlyData.map((d) => d.count), 1);

  return (
    <div className="flex h-full flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Bookmark Growth</h3>
            <p className="text-xs text-muted-foreground">Collection analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5">
          {stats.isPositiveGrowth ? (
            <TrendingUp className="h-4 w-4 text-primary" />
          ) : (
            <TrendingDown className="h-4 w-4 text-destructive" />
          )}
          <span
            className={`text-sm font-semibold ${
              stats.isPositiveGrowth ? "text-primary" : "text-destructive"
            }`}
          >
            {stats.isPositiveGrowth ? "+" : ""}
            {stats.growthPercentage.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Bookmark className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">This Week</div>
          <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
        </div>
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="text-xs font-medium text-muted-foreground mb-1">This Month</div>
          <p className="text-2xl font-bold text-foreground">{stats.thisMonth}</p>
        </div>
      </div>

      {/* Bar Chart */}
      <div className="flex-1 min-h-0">
        <div className="flex h-full items-end justify-between gap-2">
          {stats.monthlyData.map((data, index) => {
            const heightPercentage = maxCount > 0 ? (data.count / maxCount) * 100 : 0;
            const isCurrentMonth = index === stats.monthlyData.length - 1;

            return (
              <div key={data.month} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative w-full flex-1 flex items-end">
                  <div className="group relative w-full">
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="rounded-lg bg-popover px-3 py-2 shadow-lg border border-border whitespace-nowrap">
                        <p className="text-xs font-medium text-popover-foreground">
                          {data.label}
                        </p>
                        <p className="text-sm font-bold text-popover-foreground">
                          {data.count} {data.count === 1 ? "bookmark" : "bookmarks"}
                        </p>
                      </div>
                      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-popover" />
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 hover:opacity-80 ${
                        isCurrentMonth
                          ? "bg-gradient-to-t from-primary to-primary/70"
                          : "bg-gradient-to-t from-primary/60 to-primary/30"
                      }`}
                      style={{ height: `${Math.max(heightPercentage, 4)}%` }}
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="text-center">
                  <p
                    className={`text-xs font-medium ${
                      isCurrentMonth ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {data.month}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{data.count}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Insight */}
      {stats.total > 0 && (
        <div className="rounded-lg bg-muted/50 p-3 border border-border">
          <p className="text-xs text-muted-foreground">
            {stats.isPositiveGrowth ? (
              <>
                <span className="font-semibold text-primary">Growing strong!</span> You&apos;ve added{" "}
                <span className="font-semibold">{stats.thisMonth}</span> bookmark
                {stats.thisMonth !== 1 ? "s" : ""} this month
                {stats.lastMonth > 0 && (
                  <>
                    , {stats.growthPercentage > 0 ? "up" : "same as"}{" "}
                    {stats.growthPercentage > 0 && (
                      <span className="font-semibold">{stats.growthPercentage.toFixed(0)}%</span>
                    )}{" "}
                    from last month
                  </>
                )}
                .
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">Keep going!</span> You&apos;ve added{" "}
                <span className="font-semibold">{stats.thisMonth}</span> bookmark
                {stats.thisMonth !== 1 ? "s" : ""} this month.
              </>
            )}
          </p>
        </div>
      )}

      {stats.total === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <Bookmark className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No bookmarks yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start adding links to see growth</p>
          </div>
        </div>
      )}
    </div>
  );
}
