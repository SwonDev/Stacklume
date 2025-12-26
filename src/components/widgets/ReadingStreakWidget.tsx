"use client";

import { useMemo } from "react";
import { Flame, Calendar, Award } from "lucide-react";
import type { Widget } from "@/types/widget";

interface ActivityDay {
  date: string;
  count: number;
  dateObj: Date;
}

interface ReadingStreakWidgetProps {
  widget: Widget;
}

export function ReadingStreakWidget({ widget }: ReadingStreakWidgetProps) {
  const activityLog = (widget.config?.activityLog as Array<{ date: string; count: number }>) || [];

  // Generate last 12 weeks of calendar data
  const calendarData = useMemo(() => {
    const weeks: ActivityDay[][] = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 83); // 12 weeks = 84 days

    // Create activity map for quick lookup
    const activityMap = new Map(
      activityLog.map(item => [item.date, item.count])
    );

    // Adjust to start on Sunday
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    // Generate 12 weeks
    for (let week = 0; week < 12; week++) {
      const weekDays: ActivityDay[] = [];

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + week * 7 + day);

        const dateStr = currentDate.toISOString().split('T')[0];
        const count = activityMap.get(dateStr) || 0;

        weekDays.push({
          date: dateStr,
          count,
          dateObj: currentDate
        });
      }

      weeks.push(weekDays);
    }

    return weeks;
  }, [activityLog]);

  // Calculate streaks
  const { currentStreak, longestStreak } = useMemo(() => {
    if (activityLog.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Sort activities by date descending
    const sortedActivities = [...activityLog]
      .filter(a => a.count > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sortedActivities.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let current = 0;
    let longest = 0;
    let tempStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check current streak (must include today or yesterday)
    const lastActivityDate = new Date(sortedActivities[0].date);
    lastActivityDate.setHours(0, 0, 0, 0);
    const daysSinceLastActivity = Math.floor(
      (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastActivity <= 1) {
      let checkDate = new Date(lastActivityDate);
      for (const activity of sortedActivities) {
        const activityDate = new Date(activity.date);
        activityDate.setHours(0, 0, 0, 0);

        const dayDiff = Math.floor(
          (checkDate.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 0 || dayDiff === 1) {
          current++;
          checkDate = activityDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    for (let i = 0; i < sortedActivities.length; i++) {
      const currentDate = new Date(sortedActivities[i].date);
      currentDate.setHours(0, 0, 0, 0);

      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedActivities[i - 1].date);
        prevDate.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor(
          (prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (dayDiff === 1) {
          tempStreak++;
        } else {
          longest = Math.max(longest, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longest = Math.max(longest, tempStreak);

    return { currentStreak: current, longestStreak: longest };
  }, [activityLog]);

  // Get color intensity based on count
  const getIntensityClass = (count: number) => {
    if (count === 0) return "bg-muted/30 dark:bg-muted/20";
    if (count <= 2) return "bg-green-200 dark:bg-green-900/40";
    if (count <= 5) return "bg-green-400 dark:bg-green-700/60";
    if (count <= 10) return "bg-green-600 dark:bg-green-600/80";
    return "bg-green-700 dark:bg-green-500";
  };

  // Get month labels
  const monthLabels = useMemo(() => {
    const labels: Array<{ month: string; colIndex: number }> = [];
    let currentMonth = "";

    calendarData.forEach((week, weekIndex) => {
      const firstDay = week[0];
      const monthName = firstDay.dateObj.toLocaleDateString("en-US", { month: "short" });

      if (monthName !== currentMonth && weekIndex > 0) {
        currentMonth = monthName;
        labels.push({ month: monthName, colIndex: weekIndex });
      }
    });

    return labels;
  }, [calendarData]);

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="h-full flex flex-col p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Flame className="h-5 w-5 text-orange-500" />
        <h3 className="font-semibold text-lg">Reading Streak</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Flame className="h-4 w-4 text-orange-500" />
          <div>
            <div className="text-2xl font-bold">{currentStreak}</div>
            <div className="text-xs text-muted-foreground">Current</div>
          </div>
        </div>
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
          <Award className="h-4 w-4 text-yellow-500" />
          <div>
            <div className="text-2xl font-bold">{longestStreak}</div>
            <div className="text-xs text-muted-foreground">Longest</div>
          </div>
        </div>
      </div>

      {/* Contribution Calendar */}
      <div className="flex-1 overflow-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-6">
            <div className="flex relative w-full">
              {monthLabels.map(({ month, colIndex }) => (
                <div
                  key={`${month}-${colIndex}`}
                  className="text-xs text-muted-foreground absolute"
                  style={{ left: `${colIndex * 12}px` }}
                >
                  {month}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              {dayLabels.map((label, index) => (
                <div
                  key={label}
                  className="h-[10px] text-[9px] text-muted-foreground flex items-center"
                  style={{ opacity: index % 2 === 1 ? 1 : 0 }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Weeks */}
            {calendarData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((day, dayIndex) => {
                  const isToday = day.dateObj.toDateString() === new Date().toDateString();
                  const isFuture = day.dateObj > new Date();

                  return (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className={`
                        w-[10px] h-[10px] rounded-sm transition-all cursor-pointer
                        ${isFuture ? "bg-transparent" : getIntensityClass(day.count)}
                        ${isToday ? "ring-2 ring-primary ring-offset-1" : ""}
                        hover:ring-2 hover:ring-primary/50
                      `}
                      title={`${day.dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric"
                      })}: ${day.count} ${day.count === 1 ? "link" : "links"} visited`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-[10px] h-[10px] rounded-sm bg-muted/30 dark:bg-muted/20" />
              <div className="w-[10px] h-[10px] rounded-sm bg-green-200 dark:bg-green-900/40" />
              <div className="w-[10px] h-[10px] rounded-sm bg-green-400 dark:bg-green-700/60" />
              <div className="w-[10px] h-[10px] rounded-sm bg-green-600 dark:bg-green-600/80" />
              <div className="w-[10px] h-[10px] rounded-sm bg-green-700 dark:bg-green-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
