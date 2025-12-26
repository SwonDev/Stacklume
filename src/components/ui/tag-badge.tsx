"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const tagBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all whitespace-nowrap select-none",
  {
    variants: {
      size: {
        sm: "px-2 py-0.5 text-xs h-5",
        md: "px-2.5 py-1 text-xs h-6",
        lg: "px-3 py-1.5 text-sm h-7",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

const tagColorClasses: Record<string, { bg: string; text: string; textDark: string; border: string }> = {
  red: {
    bg: "bg-red-500/20",
    text: "text-red-700",
    textDark: "dark:text-red-400",
    border: "border-red-500/30",
  },
  orange: {
    bg: "bg-orange-500/20",
    text: "text-orange-700",
    textDark: "dark:text-orange-400",
    border: "border-orange-500/30",
  },
  amber: {
    bg: "bg-amber-500/20",
    text: "text-amber-700",
    textDark: "dark:text-amber-400",
    border: "border-amber-500/30",
  },
  yellow: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-700",
    textDark: "dark:text-yellow-400",
    border: "border-yellow-500/30",
  },
  lime: {
    bg: "bg-lime-500/20",
    text: "text-lime-700",
    textDark: "dark:text-lime-400",
    border: "border-lime-500/30",
  },
  green: {
    bg: "bg-green-500/20",
    text: "text-green-700",
    textDark: "dark:text-green-400",
    border: "border-green-500/30",
  },
  emerald: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-700",
    textDark: "dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
  teal: {
    bg: "bg-teal-500/20",
    text: "text-teal-700",
    textDark: "dark:text-teal-400",
    border: "border-teal-500/30",
  },
  cyan: {
    bg: "bg-cyan-500/20",
    text: "text-cyan-700",
    textDark: "dark:text-cyan-400",
    border: "border-cyan-500/30",
  },
  sky: {
    bg: "bg-sky-500/20",
    text: "text-sky-700",
    textDark: "dark:text-sky-400",
    border: "border-sky-500/30",
  },
  blue: {
    bg: "bg-blue-500/20",
    text: "text-blue-700",
    textDark: "dark:text-blue-400",
    border: "border-blue-500/30",
  },
  indigo: {
    bg: "bg-indigo-500/20",
    text: "text-indigo-700",
    textDark: "dark:text-indigo-400",
    border: "border-indigo-500/30",
  },
  violet: {
    bg: "bg-violet-500/20",
    text: "text-violet-700",
    textDark: "dark:text-violet-400",
    border: "border-violet-500/30",
  },
  purple: {
    bg: "bg-purple-500/20",
    text: "text-purple-700",
    textDark: "dark:text-purple-400",
    border: "border-purple-500/30",
  },
  fuchsia: {
    bg: "bg-fuchsia-500/20",
    text: "text-fuchsia-700",
    textDark: "dark:text-fuchsia-400",
    border: "border-fuchsia-500/30",
  },
  pink: {
    bg: "bg-pink-500/20",
    text: "text-pink-700",
    textDark: "dark:text-pink-400",
    border: "border-pink-500/30",
  },
  rose: {
    bg: "bg-rose-500/20",
    text: "text-rose-700",
    textDark: "dark:text-rose-400",
    border: "border-rose-500/30",
  },
  slate: {
    bg: "bg-slate-500/20",
    text: "text-slate-700",
    textDark: "dark:text-slate-400",
    border: "border-slate-500/30",
  },
  gray: {
    bg: "bg-gray-500/20",
    text: "text-gray-700",
    textDark: "dark:text-gray-400",
    border: "border-gray-500/30",
  },
  zinc: {
    bg: "bg-zinc-500/20",
    text: "text-zinc-700",
    textDark: "dark:text-zinc-400",
    border: "border-zinc-500/30",
  },
  neutral: {
    bg: "bg-neutral-500/20",
    text: "text-neutral-700",
    textDark: "dark:text-neutral-400",
    border: "border-neutral-500/30",
  },
  stone: {
    bg: "bg-stone-500/20",
    text: "text-stone-700",
    textDark: "dark:text-stone-400",
    border: "border-stone-500/30",
  },
}

export interface TagBadgeProps extends VariantProps<typeof tagBadgeVariants> {
  name: string
  color?: string
  onRemove?: () => void
  className?: string
}

export function TagBadge({ name, color = "blue", size, onRemove, className }: TagBadgeProps) {
  const colorClass = tagColorClasses[color] || tagColorClasses.blue

  return (
    <span
      className={cn(
        tagBadgeVariants({ size }),
        colorClass.bg,
        colorClass.text,
        colorClass.textDark,
        colorClass.border,
        "hover:opacity-90",
        className
      )}
    >
      <span className="truncate">{name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onRemove()
          }}
          className={cn(
            "rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors flex-shrink-0",
            size === "sm" && "p-0.5",
            size === "md" && "p-0.5",
            size === "lg" && "p-1"
          )}
        >
          <XIcon className={cn(
            size === "sm" && "size-2.5",
            size === "md" && "size-3",
            size === "lg" && "size-3.5"
          )} />
          <span className="sr-only">Remove {name}</span>
        </button>
      )}
    </span>
  )
}

export const TAG_COLORS = [
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
] as const

export type TagColor = typeof TAG_COLORS[number]
