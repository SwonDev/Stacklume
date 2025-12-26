"use client";

import { useState, useMemo } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
}

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

  // Month navigation
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Generate calendar days
  const calendarDays = useMemo((): CalendarDay[] => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // First day of the month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const firstDayOfWeek = firstDayOfMonth.getDay();

    // Calculate days to show from previous month
    const daysFromPrevMonth = firstDayOfWeek;

    // Calculate total days to show (6 rows * 7 days = 42)
    const totalDays = 42;

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Add days from previous month
    for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: selectedDate ? date.getTime() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime() : false,
      });
    }

    // Add days from current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        isSelected: selectedDate ? date.getTime() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime() : false,
      });
    }

    // Add days from next month to fill the grid
    const remainingDays = totalDays - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        isSelected: selectedDate ? date.getTime() === new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime() : false,
      });
    }

    return days;
  }, [currentDate, selectedDate]);

  // Format month and year
  const monthYear = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });

  // Weekday names
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  // Handle date selection
  const handleDateClick = (day: CalendarDay) => {
    setSelectedDate(day.date);

    // If clicked date is from a different month, navigate to that month
    if (!day.isCurrentMonth) {
      setCurrentDate(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    }
  };

  // Format selected date info
  const formatSelectedDate = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDayOfYear = (date: Date): number => {
    const start = new Date(date.getFullYear(), 0, 0);
    const diff = date.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 @sm:mb-3 @md:mb-4">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <div className="hidden @md:flex w-7 h-7 @lg:w-8 @lg:h-8 rounded-full bg-primary/10 items-center justify-center">
              <Calendar className="w-3.5 h-3.5 @lg:w-4 @lg:h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-xs @sm:text-sm @md:text-base @lg:text-lg font-semibold capitalize">
                {monthYear}
              </h3>
            </div>
          </motion.div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPreviousMonth}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="hidden @sm:flex h-7 @md:h-8 text-xs"
            >
              Hoy
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-7 w-7 @md:h-8 @md:w-8"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 min-h-0">
          <div className="h-full flex flex-col">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-0.5 @sm:gap-1 mb-1 @sm:mb-2">
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className="text-center text-[9px] @xs:text-[10px] @sm:text-xs @md:text-sm font-medium text-muted-foreground py-1"
                >
                  <span className="hidden @sm:inline">{day}</span>
                  <span className="@sm:hidden">{day.charAt(0)}</span>
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="flex-1 grid grid-cols-7 gap-0.5 @sm:gap-1 auto-rows-fr">
              <AnimatePresence mode="wait">
                {calendarDays.map((day, index) => (
                  <motion.button
                    key={`${day.date.getTime()}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.15, delay: index * 0.005 }}
                    onClick={() => handleDateClick(day)}
                    className={`
                      relative flex items-center justify-center rounded-md @sm:rounded-lg
                      text-[10px] @xs:text-xs @sm:text-sm @md:text-base
                      transition-all duration-200
                      ${day.isCurrentMonth ? "text-foreground" : "text-muted-foreground/40"}
                      ${day.isToday ? "font-bold" : "font-normal"}
                      ${day.isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted"}
                      ${!day.isSelected && day.isToday ? "ring-1 ring-primary/50" : ""}
                    `}
                  >
                    <span>{day.date.getDate()}</span>
                    {day.isToday && !day.isSelected && (
                      <div className="absolute bottom-0.5 @sm:bottom-1 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Selected Date Details - visible on medium+ containers */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden @md:block mt-3 @lg:mt-4 p-3 @lg:p-4 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="space-y-2">
              <p className="text-xs @lg:text-sm font-medium capitalize">
                {formatSelectedDate(selectedDate)}
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="text-[10px] @lg:text-xs">
                  Semana {getWeekNumber(selectedDate)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] @lg:text-xs">
                  Día {formatDayOfYear(selectedDate)} del año
                </Badge>
              </div>
            </div>
          </motion.div>
        )}

        {/* Compact selected date - visible on small containers */}
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="@md:hidden mt-2 text-center"
          >
            <p className="text-[10px] @xs:text-xs text-muted-foreground capitalize">
              {selectedDate.toLocaleDateString("es-ES", {
                weekday: "short",
                day: "numeric",
                month: "short",
              })}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
