"use client";

import { useMemo } from "react";
import { Link2, FolderOpen, Star, TrendingUp } from "lucide-react";
import { useLinksStore } from "@/stores/links-store";
import type { Link } from "@/lib/db/schema";
import { motion } from "motion/react";

interface StatItemProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
  priority: number; // For showing/hiding based on space
}

function StatItem({ icon, label, value, color, priority }: StatItemProps) {
  return (
    <motion.div
      className={`
        flex items-center justify-center
        rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors

        /* Very small containers: vertical stack, compact */
        gap-1.5 p-2 flex-col text-center

        /* Small containers: horizontal layout, compact */
        @xs:flex-row @xs:gap-2 @xs:p-2.5 @xs:text-left @xs:justify-start

        /* Medium containers: more padding and spacing */
        @md:gap-3 @md:p-3

        /* Large containers: even more generous spacing */
        @lg:gap-4 @lg:p-4

        /* Hide lower priority stats in very small containers */
        ${priority > 2 ? "hidden @xs:flex" : ""}
        ${priority > 3 ? "@xs:hidden @sm:flex" : ""}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon container - scales with container size */}
      <div
        className={`
          rounded-full flex items-center justify-center shrink-0
          ${color}

          /* Very small: tiny icon */
          w-6 h-6

          /* Small: small icon */
          @xs:w-8 @xs:h-8

          /* Medium: standard icon */
          @md:w-10 @md:h-10

          /* Large: larger icon */
          @lg:w-12 @lg:h-12
        `}
      >
        {icon}
      </div>

      {/* Text container */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Label - scales with container */}
        <p
          className={`
            text-muted-foreground truncate

            /* Very small: tiny text */
            text-[10px] leading-tight

            /* Small: xs text */
            @xs:text-xs

            /* Medium: small text */
            @md:text-sm

            /* Large: regular small text with more line height */
            @lg:text-sm @lg:leading-relaxed
          `}
        >
          {label}
        </p>

        {/* Value - scales dramatically with container */}
        <p
          className={`
            font-bold tabular-nums

            /* Very small: compact numbers */
            text-base leading-tight

            /* Small: slightly larger */
            @xs:text-lg

            /* Medium: prominent numbers */
            @md:text-2xl

            /* Large: very large numbers */
            @lg:text-3xl

            /* Extra large: massive numbers */
            @xl:text-4xl
          `}
        >
          {value}
        </p>
      </div>
    </motion.div>
  );
}

export function StatsWidget() {
  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);

  const stats = useMemo(() => {
    const totalLinks = links.length;
    const totalCategories = categories.length;
    const totalFavorites = links.filter((link: Link) => link.isFavorite).length;
    const recentLinks = links.filter((link: Link) => {
      const createdDate = new Date(link.createdAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return createdDate > weekAgo;
    }).length;

    return {
      totalLinks,
      totalCategories,
      totalFavorites,
      recentLinks,
    };
  }, [links, categories]);

  return (
    <div
      className={`
        @container h-full w-full

        /* Very small: single column, minimal padding */
        flex flex-col gap-1 p-1

        /* Small: 2 columns, small gaps */
        @xs:grid @xs:grid-cols-2 @xs:gap-1.5 @xs:p-1.5

        /* Medium: 2 columns, standard gaps */
        @md:gap-2 @md:p-2

        /* Large: 2x2 grid, generous gaps */
        @lg:grid-cols-2 @lg:gap-3 @lg:p-3

        /* Extra large: could show all 4 or keep 2x2 with more space */
        @xl:gap-4 @xl:p-4
      `}
    >
      <StatItem
        icon={
          <Link2
            className={`
              text-blue-500

              /* Icon sizes scale with container */
              w-3 h-3
              @xs:w-4 @xs:h-4
              @md:w-5 @md:h-5
              @lg:w-6 @lg:h-6
            `}
          />
        }
        label="Total Enlaces"
        value={stats.totalLinks}
        color="bg-blue-500/10"
        priority={1}
      />

      <StatItem
        icon={
          <Star
            className={`
              text-yellow-500
              w-3 h-3
              @xs:w-4 @xs:h-4
              @md:w-5 @md:h-5
              @lg:w-6 @lg:h-6
            `}
          />
        }
        label="Favoritos"
        value={stats.totalFavorites}
        color="bg-yellow-500/10"
        priority={2}
      />

      <StatItem
        icon={
          <FolderOpen
            className={`
              text-purple-500
              w-3 h-3
              @xs:w-4 @xs:h-4
              @md:w-5 @md:h-5
              @lg:w-6 @lg:h-6
            `}
          />
        }
        label="Categorías"
        value={stats.totalCategories}
        color="bg-purple-500/10"
        priority={3}
      />

      <StatItem
        icon={
          <TrendingUp
            className={`
              text-green-500
              w-3 h-3
              @xs:w-4 @xs:h-4
              @md:w-5 @md:h-5
              @lg:w-6 @lg:h-6
            `}
          />
        }
        label="Esta semana"
        value={stats.recentLinks}
        color="bg-green-500/10"
        priority={4}
      />
    </div>
  );
}
