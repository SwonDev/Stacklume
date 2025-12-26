"use client";

import { useState, useMemo } from "react";
import { Github, Settings, ExternalLink, GitCommit, Star, GitFork, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";

interface GitHubActivityWidgetProps {
  widget: Widget;
}

interface ActivityDay {
  date: Date;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface ActivityStats {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
  activeRepos: number;
}

export function GitHubActivityWidget({ widget }: GitHubActivityWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const links = useLinksStore((state) => state.links);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(widget.config?.githubUsername || "");
  const [hoveredDay, setHoveredDay] = useState<ActivityDay | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const showProfile = widget.config?.showProfile !== false;
  const savedUsername = widget.config?.githubUsername || "";

  // Generate activity data based on Stacklume link creation/updates
  const activityData = useMemo(() => {
    const days: ActivityDay[] = [];
    const today = new Date();
    const weeksToShow = 12;
    const totalDays = weeksToShow * 7;

    // Create a map of dates to activity counts based on link creation
    const activityMap = new Map<string, number>();

    links.forEach((link) => {
      if (link.createdAt) {
        const dateKey = new Date(link.createdAt).toDateString();
        activityMap.set(dateKey, (activityMap.get(dateKey) || 0) + 1);
      }
    });

    // Generate activity for the last 12 weeks
    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toDateString();

      const count = activityMap.get(dateKey) || 0;

      // Determine activity level (0-4) based on count
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count > 0) {
        if (count === 1) level = 1;
        else if (count === 2) level = 2;
        else if (count <= 4) level = 3;
        else level = 4;
      }

      days.push({ date, count, level });
    }

    return days;
  }, [links]);

  // Calculate stats
  const stats = useMemo((): ActivityStats => {
    const totalContributions = activityData.reduce((sum, day) => sum + day.count, 0);

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    // Calculate streaks (counting backwards from today)
    for (let i = activityData.length - 1; i >= 0; i--) {
      if (activityData[i].count > 0) {
        tempStreak++;
        if (i === activityData.length - 1 || currentStreak === 0) {
          currentStreak = tempStreak;
        }
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        if (i === activityData.length - 1) {
          currentStreak = 0;
        }
        tempStreak = 0;
      }
    }

    // Count unique categories as "active repos"
    const uniqueCategories = new Set(links.map(link => link.categoryId).filter(Boolean));
    const activeRepos = uniqueCategories.size;

    return {
      totalContributions,
      currentStreak,
      longestStreak,
      activeRepos,
    };
  }, [activityData, links]);

  // Organize data into weeks for grid display
  const weeks = useMemo(() => {
    const weeksArray: ActivityDay[][] = [];
    let currentWeek: ActivityDay[] = [];

    activityData.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === activityData.length - 1) {
        weeksArray.push([...currentWeek]);
        currentWeek = [];
      }
    });

    return weeksArray;
  }, [activityData]);

  const handleSaveUsername = () => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        githubUsername: username.trim(),
      },
    });
    setIsEditing(false);
  };

  const handleMouseMove = (e: React.MouseEvent, day: ActivityDay) => {
    setHoveredDay(day);
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
  };

  const getActivityColor = (level: number) => {
    const colors = {
      0: "bg-muted hover:bg-muted/80",
      1: "bg-emerald-200 dark:bg-emerald-900/40 hover:bg-emerald-300 dark:hover:bg-emerald-900/50",
      2: "bg-emerald-400 dark:bg-emerald-700/60 hover:bg-emerald-500 dark:hover:bg-emerald-700/70",
      3: "bg-emerald-600 dark:bg-emerald-600/80 hover:bg-emerald-700 dark:hover:bg-emerald-600/90",
      4: "bg-emerald-800 dark:bg-emerald-500 hover:bg-emerald-900 dark:hover:bg-emerald-600",
    };
    return colors[level as keyof typeof colors] || colors[0];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="flex h-full w-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Activity</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setIsEditing(!isEditing)}
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Settings Panel */}
      {isEditing && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/50 p-3">
          <label className="text-xs font-medium">GitHub Username</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveUsername();
              }}
            />
            <Button size="sm" onClick={handleSaveUsername} className="h-8">
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Activity based on your Stacklume link additions
          </p>
        </div>
      )}

      {/* Profile Section */}
      {showProfile && savedUsername && (
        <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
            <span className="text-sm font-bold text-white">
              {savedUsername.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold">{savedUsername}</span>
              <a
                href={`https://github.com/${savedUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <p className="text-xs text-muted-foreground">GitHub Profile</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border bg-card p-2">
          <div className="flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs text-muted-foreground">Links</span>
          </div>
          <p className="mt-1 text-lg font-bold">{stats.totalContributions}</p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <div className="flex items-center gap-1.5">
            <GitCommit className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            <span className="text-xs text-muted-foreground">Streak</span>
          </div>
          <p className="mt-1 text-lg font-bold">{stats.currentStreak}</p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400" />
            <span className="text-xs text-muted-foreground">Best</span>
          </div>
          <p className="mt-1 text-lg font-bold">{stats.longestStreak}</p>
        </div>
        <div className="rounded-lg border bg-card p-2">
          <div className="flex items-center gap-1.5">
            <GitFork className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            <span className="text-xs text-muted-foreground">Categories</span>
          </div>
          <p className="mt-1 text-lg font-bold">{stats.activeRepos}</p>
        </div>
      </div>

      {/* Contribution Graph */}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium">
              {stats.totalContributions} links in the last 12 weeks
            </p>
          </div>

          <div className="mt-2 flex gap-0.5 overflow-x-auto pb-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-0.5">
                {week.map((day, dayIndex) => (
                  <div
                    key={`${weekIndex}-${dayIndex}`}
                    className={`h-2.5 w-2.5 rounded-sm transition-colors ${getActivityColor(
                      day.level
                    )}`}
                    onMouseEnter={(e) => handleMouseMove(e, day)}
                    onMouseMove={(e) => handleMouseMove(e, day)}
                    onMouseLeave={handleMouseLeave}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`h-2.5 w-2.5 rounded-sm ${getActivityColor(level)}`}
                />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border bg-popover px-3 py-2 shadow-md"
          style={{
            left: `${mousePosition.x + 10}px`,
            top: `${mousePosition.y + 10}px`,
          }}
        >
          <p className="text-xs font-semibold">{formatDate(hoveredDay.date)}</p>
          <p className="text-xs text-muted-foreground">
            {hoveredDay.count === 0
              ? "No links added"
              : hoveredDay.count === 1
              ? "1 link added"
              : `${hoveredDay.count} links added`}
          </p>
        </div>
      )}
    </div>
  );
}
