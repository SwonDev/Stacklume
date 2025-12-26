"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function ClockWidget() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDayOfWeek = (date: Date): string => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
    });
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col items-center justify-center h-full text-center px-2 py-2 @sm:px-4 @sm:py-4">
        {/* Icon - visible on larger containers */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="hidden @md:flex w-10 h-10 @lg:w-14 @lg:h-14 @xl:w-16 @xl:h-16 rounded-full bg-primary/10 items-center justify-center mb-2 @lg:mb-4"
        >
          <Clock className="w-5 h-5 @lg:w-7 @lg:h-7 @xl:w-8 @xl:h-8 text-primary" />
        </motion.div>

        {/* Time Display */}
        <div className="flex items-center justify-center gap-0.5 @xs:gap-1 @md:gap-2">
          {/* Hours */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`hours-${hours}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-2xl @xs:text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl @xl:text-7xl font-bold tracking-tighter text-foreground tabular-nums"
            >
              {hours}
            </motion.div>
          </AnimatePresence>

          {/* Separator */}
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
            className="text-2xl @xs:text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl @xl:text-7xl font-bold text-foreground/70"
          >
            :
          </motion.div>

          {/* Minutes */}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`minutes-${minutes}`}
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 10, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-2xl @xs:text-3xl @sm:text-4xl @md:text-5xl @lg:text-6xl @xl:text-7xl font-bold tracking-tighter text-foreground tabular-nums"
            >
              {minutes}
            </motion.div>
          </AnimatePresence>

          {/* Seconds - shown on medium and larger containers */}
          <div className="hidden @sm:flex items-center">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl @xl:text-6xl font-bold text-foreground/70"
            >
              :
            </motion.div>
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`seconds-${seconds}`}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 10, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-2xl @sm:text-3xl @md:text-4xl @lg:text-5xl @xl:text-6xl font-bold tracking-tighter text-foreground tabular-nums"
              >
                {seconds}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Day of Week - visible on larger containers */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden @lg:block mt-2 @xl:mt-3 text-base @lg:text-lg @xl:text-xl font-medium text-muted-foreground capitalize"
        >
          {getDayOfWeek(time)}
        </motion.div>

        {/* Date */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-1 @sm:mt-2 @md:mt-3 @lg:mt-4 text-[10px] @xs:text-xs @sm:text-sm @md:text-base @lg:text-lg text-muted-foreground capitalize leading-tight"
        >
          {formatDate(time)}
        </motion.div>

        {/* Period Indicator (AM/PM style visual for 24h) - visible on extra large containers */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="hidden @xl:flex mt-4 px-3 py-1 rounded-full bg-primary/5 border border-primary/10"
        >
          <span className="text-xs font-medium text-primary">
            {parseInt(hours) < 12 ? "Morning" : parseInt(hours) < 18 ? "Afternoon" : "Evening"}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
