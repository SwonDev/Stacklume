"use client";

import { useState, useMemo, useDeferredValue, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Loader2,
  Star,
  Clock,
  Folder,
  FolderOpen,
  Folders,
  Plus,
  BarChart3,
  PieChart,
  Clock3,
  StickyNote,
  Grid3x3,
  Tag as TagIcon,
  X,
  Target,
  Search,
  Bookmark,
  Image,
  Cloud,
  Quote,
  Timer,
  Calendar,
  Sparkles,
  CheckSquare,
  Hourglass,
  CheckCircle,
  Shuffle,
  Github,
  TrendingUp,
  Rss,
  Flame,
  Gamepad2,
  // New widget icons
  Code,
  Music,
  PlayCircle,
  Bitcoin,
  Globe,
  Palette,
  ImageIcon,
  QrCode,
  Activity,
  Code2,
  Check,
  MessageSquareText,
  Puzzle,
  Rocket,
  Mic,
  LayoutList,
  // New utility widget icons
  Calculator,
  Timer as TimerIcon,
  Braces,
  Binary,
  Type,
  KeyRound,
  FileText,
  Dices,
  // Developer/Converter widget icons
  Scale,
  Coins,
  FileCode,
  Regex,
  Hash,
  Network,
  // Generator/Calculator widget icons
  Fingerprint,
  Blend,
  Square,
  RectangleHorizontal,
  Key,
  Cake,
  // Web Design widget icons
  Ruler,
  Boxes,
  Eye,
  Sparkle,
  Layers,
  SwatchBook,
  SlidersHorizontal,
  LayoutGrid,
  Waves,
  ALargeSmall,
  Pentagon,
  Move3d,
  // Game Development widget icons
  Zap,
  Film,
  Paintbrush,
  Compass,
  Mountain,
  Sparkles as SparklesIcon,
  Monitor,
  Spline,
  Sword,
  Map,
  Gauge,
  CircleDot,
  PenTool,
  Gift,
  // New Game Development widget icons
  Square as SquareIcon,
  Route,
  MessageSquare,
  TreePine,
  Users,
  Camera,
  Heart,
  Package,
  TrendingUp as TrendingUpIcon,
  GitBranch,
  Wand2,
  Trophy,
  Scroll,
  Atom,
  // Social/News Feed widget icons
  Twitter,
  MessageCircle,
  Newspaper,
  // Wellness & Life Tracking widget icons
  Smile,
  Droplets,
  Moon,
  Wind,
  // Finance widget icons
  Receipt,
  PiggyBank,
  CreditCard,
  // Advanced Productivity widget icons
  CalendarClock,
  ClipboardCheck,
  Lightbulb,
  Battery,
  // Entertainment & Media widget icons
  BookOpen,
  Tv,
  // AI widget icons
  Bot,
  // Design & Creativity widget icons
  Smartphone,
  // Utility widget icons
  Clipboard,
  Link,
  Terminal,
  GitCompare,
  Trash2,
  StarOff,
  Download,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import { useProjectsStore } from "@/stores/projects-store";
import type { Category, Tag } from "@/lib/db/schema";
import {
  WIDGET_TYPE_METADATA,
  WIDGET_SIZE_PRESETS,
  getDefaultWidgetConfig,
} from "@/types/widget";
import type { WidgetType, WidgetSize } from "@/types/widget";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { showConfirm } from "@/components/ui/ConfirmDialog";

const formSchema = z.object({
  type: z.enum([
    "favorites",
    "recent",
    "category",
    "tag",
    "categories",
    "quick-add",
    "stats",
    "link-analytics",
    "clock",
    "notes",
    "progress",
    "search",
    "bookmarks",
    "image",
    "weather",
    "quote",
    "pomodoro",
    "calendar",
    "todo",
    "custom",
    "countdown",
    "habit-tracker",
    "tag-cloud",
    "random-link",
    "github-activity",
    "bookmark-growth",
    "rss-feed",
    "reading-streak",
    "github-trending",
    "steam-games",
    "nintendo-deals",
    "github-search",
    // New widgets
    "codepen",
    "spotify",
    "youtube",
    "crypto",
    "world-clock",
    "color-palette",
    "unsplash",
    "qr-code",
    "website-monitor",
    "embed",
    "prompt",
    "prompt-builder",
    "mcp-explorer",
    "deployment-status",
    "voice-notes",
    "link-manager",
    // Social/News Feed widgets
    "twitter-feed",
    "reddit",
    "reddit-widget",
    "hacker-news",
    "product-hunt",
    "devto-feed",
    // Utility widgets
    "calculator",
    "stopwatch",
    "json-formatter",
    "base64-tool",
    "text-tools",
    "password-generator",
    "lorem-ipsum",
    "dice-roller",
    // Developer/Converter widgets
    "unit-converter",
    "currency-converter",
    "markdown-preview",
    "regex-tester",
    "color-converter",
    "timezone-converter",
    "hash-generator",
    "ip-info",
    // Generator/Calculator widgets
    "uuid-generator",
    "number-converter",
    "gradient-generator",
    "box-shadow-generator",
    "aspect-ratio",
    "jwt-decoder",
    "age-calculator",
    "word-counter",
    // Web Design widgets
    "typography-scale",
    "spacing-calculator",
    "flexbox-playground",
    "contrast-checker",
    "css-animation",
    "glassmorphism",
    "neumorphism",
    "tailwind-colors",
    "css-filter",
    "css-grid",
    "svg-wave",
    "text-shadow-generator",
    "clip-path-generator",
    "css-transform",
    // Game Development widgets
    "easing-functions",
    "sprite-sheet",
    "color-ramp",
    "game-math",
    "noise-generator",
    "particle-system",
    "screen-resolution",
    "bezier-curve",
    "rpg-stats",
    "tilemap-editor",
    "frame-rate",
    "state-machine",
    "pixel-art",
    "loot-table",
    // New Game Development widgets
    "hitbox-editor",
    "pathfinding",
    "dialogue-tree",
    "skill-tree",
    "wave-spawner",
    "camera-shake",
    "health-bar",
    "damage-calculator",
    "input-mapper",
    "level-progress",
    "behavior-tree",
    "name-generator",
    "inventory-grid",
    "achievement",
    "quest-designer",
    "physics-playground",
    // Organization & Productivity widgets
    "design-tokens",
    "code-snippets",
    "sprint-tasks",
    "decision-log",
    "eisenhower-matrix",
    "standup-notes",
    "mood-board",
    "api-reference",
    "meeting-notes",
    "weekly-goals",
    "parking-lot",
    "pr-checklist",
    "tech-debt",
    "project-timeline",
    "component-docs",
    "wireframe",
    "design-review",
    "env-vars",
    "git-commands",
    "shadcn-builder",
    // Wellness & Life Tracking widgets
    "mood-tracker",
    "water-intake",
    "sleep-log",
    "breathing-exercise",
    "gratitude-journal",
    "daily-affirmations",
    // Finance widgets
    "expense-tracker",
    "budget-progress",
    "savings-goal",
    "subscription-manager",
    // Advanced Productivity widgets
    "focus-score",
    "time-blocking",
    "daily-review",
    "parking-lot-enhanced",
    "energy-tracker",
    // Entertainment & Media widgets
    "movie-tracker",
    "book-tracker",
    "anime-list",
    "game-backlog",
    "wishlist",
    // AI & Intelligence widgets
    "ai-chat",
    "ai-daily-summary",
    "smart-suggestions",
    // Design & Creativity widgets
    "color-of-day",
    "font-pairing",
    "design-inspiration",
    "icon-picker",
    "screenshot-mockup",
    // Utility widgets (new)
    "clipboard-history",
    "sticky-notes",
    "link-previewer",
    "site-status",
    "api-tester",
    "cron-builder",
    "diff-viewer",
    "password-manager",
    "custom-user",
  ]),
  title: z.string().min(1),
  size: z.enum(["small", "medium", "large", "wide", "tall"]),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CustomWidgetTypeEntry {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  category?: string;
  htmlTemplate?: string;
  configSchema?: Record<string, unknown> | null;
  defaultWidth: number;
  defaultHeight: number;
  defaultConfig: Record<string, unknown> | null;
}

function sizeFromDims(w: number, h: number): WidgetSize {
  if (w <= 1 && h <= 1) return "small";
  if (w >= 4 && h >= 3) return "large";
  if (w >= 4 && h <= 2) return "wide";
  if (w <= 2 && h >= 3) return "tall";
  return "medium";
}

// Widget type options with icons - labels/descriptions resolved via i18n
const widgetTypeOptions: Array<{
  type: WidgetType;
  labelKey: string;
  descKey: string;
  icon: React.ElementType;
  requiresCategory?: boolean;
  requiresTag?: boolean;
}> = [
  { type: "favorites", labelKey: "widget.favorites.label", descKey: "widget.favorites.desc", icon: Star },
  { type: "recent", labelKey: "widget.recent.label", descKey: "widget.recent.desc", icon: Clock },
  { type: "category", labelKey: "widget.category.label", descKey: "widget.category.desc", icon: FolderOpen, requiresCategory: true },
  { type: "tag", labelKey: "widget.tag.label", descKey: "widget.tag.desc", icon: TagIcon, requiresTag: true },
  { type: "categories", labelKey: "widget.categories.label", descKey: "widget.categories.desc", icon: Folders },
  { type: "quick-add", labelKey: "widget.quick-add.label", descKey: "widget.quick-add.desc", icon: Plus },
  { type: "stats", labelKey: "widget.stats.label", descKey: "widget.stats.desc", icon: BarChart3 },
  { type: "link-analytics", labelKey: "widget.link-analytics.label", descKey: "widget.link-analytics.desc", icon: PieChart },
  { type: "clock", labelKey: "widget.clock.label", descKey: "widget.clock.desc", icon: Clock3 },
  { type: "notes", labelKey: "widget.notes.label", descKey: "widget.notes.desc", icon: StickyNote },
  { type: "progress", labelKey: "widget.progress.label", descKey: "widget.progress.desc", icon: Target },
  { type: "search", labelKey: "widget.search.label", descKey: "widget.search.desc", icon: Search },
  { type: "bookmarks", labelKey: "widget.bookmarks.label", descKey: "widget.bookmarks.desc", icon: Bookmark },
  { type: "image", labelKey: "widget.image.label", descKey: "widget.image.desc", icon: Image },
  { type: "weather", labelKey: "widget.weather.label", descKey: "widget.weather.desc", icon: Cloud },
  { type: "quote", labelKey: "widget.quote.label", descKey: "widget.quote.desc", icon: Quote },
  { type: "pomodoro", labelKey: "widget.pomodoro.label", descKey: "widget.pomodoro.desc", icon: Timer },
  { type: "calendar", labelKey: "widget.calendar.label", descKey: "widget.calendar.desc", icon: Calendar },
  { type: "todo", labelKey: "widget.todo.label", descKey: "widget.todo.desc", icon: CheckSquare },
  { type: "custom", labelKey: "widget.custom.label", descKey: "widget.custom.desc", icon: Sparkles },
  { type: "countdown", labelKey: "widget.countdown.label", descKey: "widget.countdown.desc", icon: Hourglass },
  { type: "habit-tracker", labelKey: "widget.habit-tracker.label", descKey: "widget.habit-tracker.desc", icon: CheckCircle },
  { type: "tag-cloud", labelKey: "widget.tag-cloud.label", descKey: "widget.tag-cloud.desc", icon: Cloud },
  { type: "random-link", labelKey: "widget.random-link.label", descKey: "widget.random-link.desc", icon: Shuffle },
  { type: "github-activity", labelKey: "widget.github-activity.label", descKey: "widget.github-activity.desc", icon: Github },
  { type: "bookmark-growth", labelKey: "widget.bookmark-growth.label", descKey: "widget.bookmark-growth.desc", icon: TrendingUp },
  { type: "rss-feed", labelKey: "widget.rss-feed.label", descKey: "widget.rss-feed.desc", icon: Rss },
  { type: "reading-streak", labelKey: "widget.reading-streak.label", descKey: "widget.reading-streak.desc", icon: Flame },
  { type: "github-trending", labelKey: "widget.github-trending.label", descKey: "widget.github-trending.desc", icon: Sparkles },
  { type: "steam-games", labelKey: "widget.steam-games.label", descKey: "widget.steam-games.desc", icon: Gamepad2 },
  { type: "nintendo-deals", labelKey: "widget.nintendo-deals.label", descKey: "widget.nintendo-deals.desc", icon: Gamepad2 },
  { type: "github-search", labelKey: "widget.github-search.label", descKey: "widget.github-search.desc", icon: Github },
  { type: "codepen", labelKey: "widget.codepen.label", descKey: "widget.codepen.desc", icon: Code },
  { type: "spotify", labelKey: "widget.spotify.label", descKey: "widget.spotify.desc", icon: Music },
  { type: "youtube", labelKey: "widget.youtube.label", descKey: "widget.youtube.desc", icon: PlayCircle },
  { type: "crypto", labelKey: "widget.crypto.label", descKey: "widget.crypto.desc", icon: Bitcoin },
  { type: "world-clock", labelKey: "widget.world-clock.label", descKey: "widget.world-clock.desc", icon: Globe },
  { type: "color-palette", labelKey: "widget.color-palette.label", descKey: "widget.color-palette.desc", icon: Palette },
  { type: "unsplash", labelKey: "widget.unsplash.label", descKey: "widget.unsplash.desc", icon: ImageIcon },
  { type: "qr-code", labelKey: "widget.qr-code.label", descKey: "widget.qr-code.desc", icon: QrCode },
  { type: "website-monitor", labelKey: "widget.website-monitor.label", descKey: "widget.website-monitor.desc", icon: Activity },
  { type: "embed", labelKey: "widget.embed.label", descKey: "widget.embed.desc", icon: Code2 },
  { type: "prompt", labelKey: "widget.prompt.label", descKey: "widget.prompt.desc", icon: MessageSquareText },
  { type: "prompt-builder", labelKey: "widget.prompt-builder.label", descKey: "widget.prompt-builder.desc", icon: Wand2 },
  { type: "mcp-explorer", labelKey: "widget.mcp-explorer.label", descKey: "widget.mcp-explorer.desc", icon: Puzzle },
  { type: "deployment-status", labelKey: "widget.deployment-status.label", descKey: "widget.deployment-status.desc", icon: Rocket },
  { type: "voice-notes", labelKey: "widget.voice-notes.label", descKey: "widget.voice-notes.desc", icon: Mic },
  { type: "link-manager", labelKey: "widget.link-manager.label", descKey: "widget.link-manager.desc", icon: LayoutList },
  { type: "twitter-feed", labelKey: "widget.twitter-feed.label", descKey: "widget.twitter-feed.desc", icon: Twitter },
  { type: "reddit", labelKey: "widget.reddit.label", descKey: "widget.reddit.desc", icon: MessageCircle },
  { type: "hacker-news", labelKey: "widget.hacker-news.label", descKey: "widget.hacker-news.desc", icon: Newspaper },
  { type: "product-hunt", labelKey: "widget.product-hunt.label", descKey: "widget.product-hunt.desc", icon: Rocket },
  { type: "devto-feed", labelKey: "widget.devto-feed.label", descKey: "widget.devto-feed.desc", icon: Code },
  { type: "calculator", labelKey: "widget.calculator.label", descKey: "widget.calculator.desc", icon: Calculator },
  { type: "stopwatch", labelKey: "widget.stopwatch.label", descKey: "widget.stopwatch.desc", icon: TimerIcon },
  { type: "json-formatter", labelKey: "widget.json-formatter.label", descKey: "widget.json-formatter.desc", icon: Braces },
  { type: "base64-tool", labelKey: "widget.base64-tool.label", descKey: "widget.base64-tool.desc", icon: Binary },
  { type: "text-tools", labelKey: "widget.text-tools.label", descKey: "widget.text-tools.desc", icon: Type },
  { type: "password-generator", labelKey: "widget.password-generator.label", descKey: "widget.password-generator.desc", icon: KeyRound },
  { type: "lorem-ipsum", labelKey: "widget.lorem-ipsum.label", descKey: "widget.lorem-ipsum.desc", icon: FileText },
  { type: "dice-roller", labelKey: "widget.dice-roller.label", descKey: "widget.dice-roller.desc", icon: Dices },
  { type: "unit-converter", labelKey: "widget.unit-converter.label", descKey: "widget.unit-converter.desc", icon: Scale },
  { type: "currency-converter", labelKey: "widget.currency-converter.label", descKey: "widget.currency-converter.desc", icon: Coins },
  { type: "markdown-preview", labelKey: "widget.markdown-preview.label", descKey: "widget.markdown-preview.desc", icon: FileCode },
  { type: "regex-tester", labelKey: "widget.regex-tester.label", descKey: "widget.regex-tester.desc", icon: Regex },
  { type: "color-converter", labelKey: "widget.color-converter.label", descKey: "widget.color-converter.desc", icon: Palette },
  { type: "timezone-converter", labelKey: "widget.timezone-converter.label", descKey: "widget.timezone-converter.desc", icon: Globe },
  { type: "hash-generator", labelKey: "widget.hash-generator.label", descKey: "widget.hash-generator.desc", icon: Hash },
  { type: "ip-info", labelKey: "widget.ip-info.label", descKey: "widget.ip-info.desc", icon: Network },
  { type: "uuid-generator", labelKey: "widget.uuid-generator.label", descKey: "widget.uuid-generator.desc", icon: Fingerprint },
  { type: "number-converter", labelKey: "widget.number-converter.label", descKey: "widget.number-converter.desc", icon: Binary },
  { type: "gradient-generator", labelKey: "widget.gradient-generator.label", descKey: "widget.gradient-generator.desc", icon: Blend },
  { type: "box-shadow-generator", labelKey: "widget.box-shadow-generator.label", descKey: "widget.box-shadow-generator.desc", icon: Square },
  { type: "aspect-ratio", labelKey: "widget.aspect-ratio.label", descKey: "widget.aspect-ratio.desc", icon: RectangleHorizontal },
  { type: "jwt-decoder", labelKey: "widget.jwt-decoder.label", descKey: "widget.jwt-decoder.desc", icon: Key },
  { type: "age-calculator", labelKey: "widget.age-calculator.label", descKey: "widget.age-calculator.desc", icon: Cake },
  { type: "word-counter", labelKey: "widget.word-counter.label", descKey: "widget.word-counter.desc", icon: FileText },
  { type: "typography-scale", labelKey: "widget.typography-scale.label", descKey: "widget.typography-scale.desc", icon: ALargeSmall },
  { type: "spacing-calculator", labelKey: "widget.spacing-calculator.label", descKey: "widget.spacing-calculator.desc", icon: Ruler },
  { type: "flexbox-playground", labelKey: "widget.flexbox-playground.label", descKey: "widget.flexbox-playground.desc", icon: Boxes },
  { type: "contrast-checker", labelKey: "widget.contrast-checker.label", descKey: "widget.contrast-checker.desc", icon: Eye },
  { type: "css-animation", labelKey: "widget.css-animation.label", descKey: "widget.css-animation.desc", icon: Sparkle },
  { type: "glassmorphism", labelKey: "widget.glassmorphism.label", descKey: "widget.glassmorphism.desc", icon: Layers },
  { type: "neumorphism", labelKey: "widget.neumorphism.label", descKey: "widget.neumorphism.desc", icon: Square },
  { type: "tailwind-colors", labelKey: "widget.tailwind-colors.label", descKey: "widget.tailwind-colors.desc", icon: SwatchBook },
  { type: "css-filter", labelKey: "widget.css-filter.label", descKey: "widget.css-filter.desc", icon: SlidersHorizontal },
  { type: "css-grid", labelKey: "widget.css-grid.label", descKey: "widget.css-grid.desc", icon: LayoutGrid },
  { type: "svg-wave", labelKey: "widget.svg-wave.label", descKey: "widget.svg-wave.desc", icon: Waves },
  { type: "text-shadow-generator", labelKey: "widget.text-shadow-generator.label", descKey: "widget.text-shadow-generator.desc", icon: Type },
  { type: "clip-path-generator", labelKey: "widget.clip-path-generator.label", descKey: "widget.clip-path-generator.desc", icon: Pentagon },
  { type: "css-transform", labelKey: "widget.css-transform.label", descKey: "widget.css-transform.desc", icon: Move3d },
  { type: "easing-functions", labelKey: "widget.easing-functions.label", descKey: "widget.easing-functions.desc", icon: Zap },
  { type: "sprite-sheet", labelKey: "widget.sprite-sheet.label", descKey: "widget.sprite-sheet.desc", icon: Film },
  { type: "color-ramp", labelKey: "widget.color-ramp.label", descKey: "widget.color-ramp.desc", icon: Paintbrush },
  { type: "game-math", labelKey: "widget.game-math.label", descKey: "widget.game-math.desc", icon: Compass },
  { type: "noise-generator", labelKey: "widget.noise-generator.label", descKey: "widget.noise-generator.desc", icon: Mountain },
  { type: "particle-system", labelKey: "widget.particle-system.label", descKey: "widget.particle-system.desc", icon: SparklesIcon },
  { type: "screen-resolution", labelKey: "widget.screen-resolution.label", descKey: "widget.screen-resolution.desc", icon: Monitor },
  { type: "bezier-curve", labelKey: "widget.bezier-curve.label", descKey: "widget.bezier-curve.desc", icon: Spline },
  { type: "rpg-stats", labelKey: "widget.rpg-stats.label", descKey: "widget.rpg-stats.desc", icon: Sword },
  { type: "tilemap-editor", labelKey: "widget.tilemap-editor.label", descKey: "widget.tilemap-editor.desc", icon: Map },
  { type: "frame-rate", labelKey: "widget.frame-rate.label", descKey: "widget.frame-rate.desc", icon: Gauge },
  { type: "state-machine", labelKey: "widget.state-machine.label", descKey: "widget.state-machine.desc", icon: CircleDot },
  { type: "pixel-art", labelKey: "widget.pixel-art.label", descKey: "widget.pixel-art.desc", icon: PenTool },
  { type: "loot-table", labelKey: "widget.loot-table.label", descKey: "widget.loot-table.desc", icon: Gift },
  { type: "hitbox-editor", labelKey: "widget.hitbox-editor.label", descKey: "widget.hitbox-editor.desc", icon: SquareIcon },
  { type: "pathfinding", labelKey: "widget.pathfinding.label", descKey: "widget.pathfinding.desc", icon: Route },
  { type: "dialogue-tree", labelKey: "widget.dialogue-tree.label", descKey: "widget.dialogue-tree.desc", icon: MessageSquare },
  { type: "skill-tree", labelKey: "widget.skill-tree.label", descKey: "widget.skill-tree.desc", icon: TreePine },
  { type: "wave-spawner", labelKey: "widget.wave-spawner.label", descKey: "widget.wave-spawner.desc", icon: Users },
  { type: "camera-shake", labelKey: "widget.camera-shake.label", descKey: "widget.camera-shake.desc", icon: Camera },
  { type: "health-bar", labelKey: "widget.health-bar.label", descKey: "widget.health-bar.desc", icon: Heart },
  { type: "damage-calculator", labelKey: "widget.damage-calculator.label", descKey: "widget.damage-calculator.desc", icon: Sword },
  { type: "input-mapper", labelKey: "widget.input-mapper.label", descKey: "widget.input-mapper.desc", icon: Gamepad2 },
  { type: "level-progress", labelKey: "widget.level-progress.label", descKey: "widget.level-progress.desc", icon: TrendingUpIcon },
  { type: "behavior-tree", labelKey: "widget.behavior-tree.label", descKey: "widget.behavior-tree.desc", icon: GitBranch },
  { type: "name-generator", labelKey: "widget.name-generator.label", descKey: "widget.name-generator.desc", icon: Wand2 },
  { type: "inventory-grid", labelKey: "widget.inventory-grid.label", descKey: "widget.inventory-grid.desc", icon: Package },
  { type: "achievement", labelKey: "widget.achievement.label", descKey: "widget.achievement.desc", icon: Trophy },
  { type: "quest-designer", labelKey: "widget.quest-designer.label", descKey: "widget.quest-designer.desc", icon: Scroll },
  { type: "physics-playground", labelKey: "widget.physics-playground.label", descKey: "widget.physics-playground.desc", icon: Atom },
  { type: "design-tokens", labelKey: "widget.design-tokens.label", descKey: "widget.design-tokens.desc", icon: Palette },
  { type: "code-snippets", labelKey: "widget.code-snippets.label", descKey: "widget.code-snippets.desc", icon: Code },
  { type: "sprint-tasks", labelKey: "widget.sprint-tasks.label", descKey: "widget.sprint-tasks.desc", icon: LayoutGrid },
  { type: "decision-log", labelKey: "widget.decision-log.label", descKey: "widget.decision-log.desc", icon: FileText },
  { type: "eisenhower-matrix", labelKey: "widget.eisenhower-matrix.label", descKey: "widget.eisenhower-matrix.desc", icon: Grid3x3 },
  { type: "standup-notes", labelKey: "widget.standup-notes.label", descKey: "widget.standup-notes.desc", icon: Users },
  { type: "mood-board", labelKey: "widget.mood-board.label", descKey: "widget.mood-board.desc", icon: ImageIcon },
  { type: "api-reference", labelKey: "widget.api-reference.label", descKey: "widget.api-reference.desc", icon: Code2 },
  { type: "meeting-notes", labelKey: "widget.meeting-notes.label", descKey: "widget.meeting-notes.desc", icon: StickyNote },
  { type: "weekly-goals", labelKey: "widget.weekly-goals.label", descKey: "widget.weekly-goals.desc", icon: Target },
  { type: "parking-lot", labelKey: "widget.parking-lot.label", descKey: "widget.parking-lot.desc", icon: Package },
  { type: "pr-checklist", labelKey: "widget.pr-checklist.label", descKey: "widget.pr-checklist.desc", icon: CheckSquare },
  { type: "tech-debt", labelKey: "widget.tech-debt.label", descKey: "widget.tech-debt.desc", icon: Activity },
  { type: "project-timeline", labelKey: "widget.project-timeline.label", descKey: "widget.project-timeline.desc", icon: Calendar },
  { type: "component-docs", labelKey: "widget.component-docs.label", descKey: "widget.component-docs.desc", icon: Boxes },
  { type: "wireframe", labelKey: "widget.wireframe.label", descKey: "widget.wireframe.desc", icon: PenTool },
  { type: "design-review", labelKey: "widget.design-review.label", descKey: "widget.design-review.desc", icon: Eye },
  { type: "env-vars", labelKey: "widget.env-vars.label", descKey: "widget.env-vars.desc", icon: KeyRound },
  { type: "git-commands", labelKey: "widget.git-commands.label", descKey: "widget.git-commands.desc", icon: GitBranch },
  { type: "shadcn-builder", labelKey: "widget.shadcn-builder.label", descKey: "widget.shadcn-builder.desc", icon: Palette },
  { type: "mood-tracker", labelKey: "widget.mood-tracker.label", descKey: "widget.mood-tracker.desc", icon: Smile },
  { type: "water-intake", labelKey: "widget.water-intake.label", descKey: "widget.water-intake.desc", icon: Droplets },
  { type: "sleep-log", labelKey: "widget.sleep-log.label", descKey: "widget.sleep-log.desc", icon: Moon },
  { type: "breathing-exercise", labelKey: "widget.breathing-exercise.label", descKey: "widget.breathing-exercise.desc", icon: Wind },
  { type: "gratitude-journal", labelKey: "widget.gratitude-journal.label", descKey: "widget.gratitude-journal.desc", icon: Heart },
  { type: "daily-affirmations", labelKey: "widget.daily-affirmations.label", descKey: "widget.daily-affirmations.desc", icon: Sparkles },
  { type: "expense-tracker", labelKey: "widget.expense-tracker.label", descKey: "widget.expense-tracker.desc", icon: Receipt },
  { type: "budget-progress", labelKey: "widget.budget-progress.label", descKey: "widget.budget-progress.desc", icon: PieChart },
  { type: "savings-goal", labelKey: "widget.savings-goal.label", descKey: "widget.savings-goal.desc", icon: PiggyBank },
  { type: "subscription-manager", labelKey: "widget.subscription-manager.label", descKey: "widget.subscription-manager.desc", icon: CreditCard },
  { type: "focus-score", labelKey: "widget.focus-score.label", descKey: "widget.focus-score.desc", icon: Target },
  { type: "time-blocking", labelKey: "widget.time-blocking.label", descKey: "widget.time-blocking.desc", icon: CalendarClock },
  { type: "daily-review", labelKey: "widget.daily-review.label", descKey: "widget.daily-review.desc", icon: ClipboardCheck },
  { type: "parking-lot-enhanced", labelKey: "widget.parking-lot-enhanced.label", descKey: "widget.parking-lot-enhanced.desc", icon: Lightbulb },
  { type: "energy-tracker", labelKey: "widget.energy-tracker.label", descKey: "widget.energy-tracker.desc", icon: Battery },
  { type: "movie-tracker", labelKey: "widget.movie-tracker.label", descKey: "widget.movie-tracker.desc", icon: Film },
  { type: "book-tracker", labelKey: "widget.book-tracker.label", descKey: "widget.book-tracker.desc", icon: BookOpen },
  { type: "anime-list", labelKey: "widget.anime-list.label", descKey: "widget.anime-list.desc", icon: Tv },
  { type: "game-backlog", labelKey: "widget.game-backlog.label", descKey: "widget.game-backlog.desc", icon: Gamepad2 },
  { type: "wishlist", labelKey: "widget.wishlist.label", descKey: "widget.wishlist.desc", icon: Gift },
  { type: "ai-chat", labelKey: "widget.ai-chat.label", descKey: "widget.ai-chat.desc", icon: Bot },
  { type: "ai-daily-summary", labelKey: "widget.ai-daily-summary.label", descKey: "widget.ai-daily-summary.desc", icon: Wand2 },
  { type: "smart-suggestions", labelKey: "widget.smart-suggestions.label", descKey: "widget.smart-suggestions.desc", icon: Sparkles },
  { type: "reddit-widget", labelKey: "widget.reddit-widget.label", descKey: "widget.reddit-widget.desc", icon: MessageCircle },
  { type: "color-of-day", labelKey: "widget.color-of-day.label", descKey: "widget.color-of-day.desc", icon: Palette },
  { type: "font-pairing", labelKey: "widget.font-pairing.label", descKey: "widget.font-pairing.desc", icon: Type },
  { type: "design-inspiration", labelKey: "widget.design-inspiration.label", descKey: "widget.design-inspiration.desc", icon: Image },
  { type: "icon-picker", labelKey: "widget.icon-picker.label", descKey: "widget.icon-picker.desc", icon: Search },
  { type: "screenshot-mockup", labelKey: "widget.screenshot-mockup.label", descKey: "widget.screenshot-mockup.desc", icon: Smartphone },
  { type: "clipboard-history", labelKey: "widget.clipboard-history.label", descKey: "widget.clipboard-history.desc", icon: Clipboard },
  { type: "sticky-notes", labelKey: "widget.sticky-notes.label", descKey: "widget.sticky-notes.desc", icon: StickyNote },
  { type: "link-previewer", labelKey: "widget.link-previewer.label", descKey: "widget.link-previewer.desc", icon: Link },
  { type: "site-status", labelKey: "widget.site-status.label", descKey: "widget.site-status.desc", icon: Activity },
  { type: "api-tester", labelKey: "widget.api-tester.label", descKey: "widget.api-tester.desc", icon: Terminal },
  { type: "cron-builder", labelKey: "widget.cron-builder.label", descKey: "widget.cron-builder.desc", icon: Clock },
  { type: "diff-viewer", labelKey: "widget.diff-viewer.label", descKey: "widget.diff-viewer.desc", icon: GitCompare },
  { type: "password-manager", labelKey: "widget.password-manager.label", descKey: "widget.password-manager.desc", icon: KeyRound },
];

// Size options - labels resolved via i18n
const sizeOptions: Array<{ value: WidgetSize; labelKey: string }> = [
  { value: "small", labelKey: "addWidget.sizeSmall" },
  { value: "medium", labelKey: "addWidget.sizeMedium" },
  { value: "large", labelKey: "addWidget.sizeLarge" },
  { value: "wide", labelKey: "addWidget.sizeWide" },
  { value: "tall", labelKey: "addWidget.sizeTall" },
];

// Widget categories for folder organization
interface WidgetCategory {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  color: string;
  widgets: WidgetType[];
}

const WIDGET_CATEGORIES: WidgetCategory[] = [
  { id: "links", labelKey: "addWidget.catLinks", icon: Link, color: "blue", widgets: ["favorites", "recent", "category", "tag", "categories", "quick-add", "bookmarks", "search", "random-link", "link-manager"] },
  { id: "productivity", labelKey: "addWidget.catProductivity", icon: Clock, color: "green", widgets: ["clock", "notes", "progress", "pomodoro", "calendar", "todo", "countdown", "habit-tracker", "weather", "quote", "custom"] },
  { id: "analytics", labelKey: "addWidget.catAnalytics", icon: BarChart3, color: "purple", widgets: ["stats", "link-analytics", "github-activity", "bookmark-growth", "reading-streak", "tag-cloud", "rss-feed"] },
  { id: "external", labelKey: "addWidget.catExternal", icon: Globe, color: "cyan", widgets: ["github-trending", "steam-games", "nintendo-deals", "github-search", "codepen", "spotify", "youtube", "crypto", "unsplash", "embed"] },
  { id: "social", labelKey: "addWidget.catSocial", icon: MessageCircle, color: "pink", widgets: ["twitter-feed", "reddit", "reddit-widget", "hacker-news", "product-hunt", "devto-feed"] },
  { id: "utilities", labelKey: "addWidget.catUtilities", icon: Calculator, color: "orange", widgets: ["calculator", "stopwatch", "world-clock", "qr-code", "website-monitor", "image", "color-palette", "dice-roller"] },
  { id: "developer", labelKey: "addWidget.catDeveloper", icon: Code, color: "slate", widgets: ["json-formatter", "base64-tool", "text-tools", "password-generator", "lorem-ipsum", "regex-tester", "hash-generator", "ip-info", "uuid-generator", "jwt-decoder", "markdown-preview"] },
  { id: "converters", labelKey: "addWidget.catConverters", icon: Scale, color: "teal", widgets: ["unit-converter", "currency-converter", "color-converter", "timezone-converter", "number-converter", "aspect-ratio", "age-calculator", "word-counter"] },
  { id: "css-generators", labelKey: "addWidget.catCssGenerators", icon: Paintbrush, color: "violet", widgets: ["gradient-generator", "box-shadow-generator", "text-shadow-generator", "contrast-checker", "spacing-calculator", "flexbox-playground", "glassmorphism", "neumorphism", "svg-wave", "css-animation", "tailwind-colors", "css-filter", "css-grid", "typography-scale", "clip-path-generator", "css-transform"] },
  { id: "gamedev", labelKey: "addWidget.catGamedev", icon: Gamepad2, color: "red", widgets: ["easing-functions", "sprite-sheet", "color-ramp", "game-math", "noise-generator", "particle-system", "screen-resolution", "bezier-curve", "rpg-stats", "tilemap-editor", "frame-rate", "state-machine", "pixel-art", "loot-table", "hitbox-editor", "pathfinding", "dialogue-tree", "skill-tree", "wave-spawner", "camera-shake", "health-bar", "damage-calculator", "input-mapper", "level-progress", "behavior-tree", "name-generator", "inventory-grid", "achievement", "quest-designer", "physics-playground"] },
  { id: "organization", labelKey: "addWidget.catOrganization", icon: LayoutList, color: "amber", widgets: ["design-tokens", "code-snippets", "sprint-tasks", "decision-log", "eisenhower-matrix", "standup-notes", "mood-board", "api-reference", "meeting-notes", "weekly-goals", "parking-lot", "pr-checklist", "tech-debt", "project-timeline", "component-docs", "wireframe", "design-review", "env-vars", "git-commands", "shadcn-builder"] },
  { id: "wellness", labelKey: "addWidget.catWellness", icon: Heart, color: "rose", widgets: ["mood-tracker", "water-intake", "sleep-log", "breathing-exercise", "gratitude-journal", "daily-affirmations"] },
  { id: "finance", labelKey: "addWidget.catFinance", icon: Coins, color: "emerald", widgets: ["expense-tracker", "budget-progress", "savings-goal", "subscription-manager"] },
  { id: "entertainment", labelKey: "addWidget.catEntertainment", icon: Film, color: "indigo", widgets: ["movie-tracker", "book-tracker", "anime-list", "game-backlog", "wishlist"] },
  { id: "ai", labelKey: "addWidget.catAi", icon: Bot, color: "fuchsia", widgets: ["ai-chat", "ai-daily-summary", "smart-suggestions", "prompt", "prompt-builder", "mcp-explorer", "voice-notes"] },
  { id: "creativity", labelKey: "addWidget.catCreativity", icon: Palette, color: "lime", widgets: ["color-of-day", "font-pairing", "design-inspiration", "icon-picker", "screenshot-mockup"] },
  { id: "productivity-ext", labelKey: "addWidget.catProductivityExt", icon: Rocket, color: "sky", widgets: ["focus-score", "time-blocking", "daily-review", "energy-tracker", "parking-lot-enhanced", "deployment-status"] },
  { id: "utility-ext", labelKey: "addWidget.catUtilityExt", icon: Terminal, color: "zinc", widgets: ["clipboard-history", "sticky-notes", "link-previewer", "site-status", "api-tester", "cron-builder", "diff-viewer", "password-manager"] },
];

// LocalStorage key for category order persistence
const CATEGORY_ORDER_KEY = "stacklume-widget-category-order";

// Color classes for folder accents
const FOLDER_COLORS: Record<string, { bg: string; border: string; text: string; hover: string }> = {
  blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-500", hover: "hover:bg-blue-500/20" },
  green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-500", hover: "hover:bg-green-500/20" },
  purple: { bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-500", hover: "hover:bg-purple-500/20" },
  cyan: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-500", hover: "hover:bg-cyan-500/20" },
  pink: { bg: "bg-pink-500/10", border: "border-pink-500/30", text: "text-pink-500", hover: "hover:bg-pink-500/20" },
  orange: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-500", hover: "hover:bg-orange-500/20" },
  slate: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-500", hover: "hover:bg-slate-500/20" },
  teal: { bg: "bg-teal-500/10", border: "border-teal-500/30", text: "text-teal-500", hover: "hover:bg-teal-500/20" },
  violet: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-500", hover: "hover:bg-violet-500/20" },
  red: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-500", hover: "hover:bg-red-500/20" },
  amber: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", hover: "hover:bg-amber-500/20" },
  rose: { bg: "bg-rose-500/10", border: "border-rose-500/30", text: "text-rose-500", hover: "hover:bg-rose-500/20" },
  emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-500", hover: "hover:bg-emerald-500/20" },
  indigo: { bg: "bg-indigo-500/10", border: "border-indigo-500/30", text: "text-indigo-500", hover: "hover:bg-indigo-500/20" },
  fuchsia: { bg: "bg-fuchsia-500/10", border: "border-fuchsia-500/30", text: "text-fuchsia-500", hover: "hover:bg-fuchsia-500/20" },
  lime: { bg: "bg-lime-500/10", border: "border-lime-500/30", text: "text-lime-500", hover: "hover:bg-lime-500/20" },
  sky: { bg: "bg-sky-500/10", border: "border-sky-500/30", text: "text-sky-500", hover: "hover:bg-sky-500/20" },
  zinc: { bg: "bg-zinc-500/10", border: "border-zinc-500/30", text: "text-zinc-500", hover: "hover:bg-zinc-500/20" },
};

// WidgetCategoryFolder Component
interface WidgetCategoryFolderProps {
  category: WidgetCategory;
  widgetOptions: typeof widgetTypeOptions;
  selectedTypes: WidgetType[];
  onToggleWidget: (type: WidgetType) => void;
  isDragging?: boolean;
  dragProps?: React.HTMLAttributes<HTMLDivElement>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function WidgetCategoryFolder({ category, widgetOptions, selectedTypes, onToggleWidget, isDragging, dragProps, t }: WidgetCategoryFolderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const categoryWidgets = useMemo(() => {
    return widgetOptions.filter(opt => category.widgets.includes(opt.type));
  }, [widgetOptions, category.widgets]);

  const selectedCount = useMemo(() => {
    return categoryWidgets.filter(w => selectedTypes.includes(w.type)).length;
  }, [categoryWidgets, selectedTypes]);

  const colors = FOLDER_COLORS[category.color] || FOLDER_COLORS.blue;
  const Icon = category.icon as React.ComponentType<{ className?: string }>;

  const handleDoubleClick = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  if (categoryWidgets.length === 0) return null;

  return (
    <div className={`mb-3 ${isDragging ? "opacity-50" : ""}`}>
      {/* Folder Header - entire header is draggable */}
      <div
        {...dragProps}
        onDoubleClick={handleDoubleClick}
        className={`
          relative flex items-center gap-3 p-3 rounded-lg border-2 cursor-grab active:cursor-grabbing select-none
          transition-all duration-200 touch-none
          ${colors.bg} ${colors.border}
          ${isOpen ? "rounded-b-none border-b-0" : ""}
          ${isDragging ? "shadow-lg ring-2 ring-primary/30 scale-[1.01]" : "hover:scale-[1.01] active:scale-[0.99]"}
        `}
      >
        {/* Folder Icon with Animation */}
        <motion.div
          animate={{ rotateY: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <FolderOpen className={`w-6 h-6 ${colors.text}`} />
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Folder className={`w-6 h-6 ${colors.text}`} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Category Label & Count */}
        <div className="flex-1 flex items-center gap-2">
          <Icon className={`w-4 h-4 ${colors.text}`} />
          <span className="font-medium text-sm">{t(category.labelKey)}</span>
        </div>

        {/* Badge with widget count */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="default" className="h-5 px-2 text-xs bg-primary">
              {selectedCount} {t("addWidget.sel")}
            </Badge>
          )}
          <Badge variant="secondary" className="h-5 px-2 text-xs">
            {categoryWidgets.length}
          </Badge>
        </div>

        {/* Double-click hint */}
        <span className="text-[10px] text-muted-foreground/60 absolute bottom-1 right-2">
          {t("addWidget.doubleClick")}
        </span>
      </div>

      {/* Folder Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className={`overflow-hidden border-2 border-t-0 rounded-b-lg ${colors.border}`}
          >
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categoryWidgets.map((option) => {
                const WidgetIcon = option.icon as React.ComponentType<{ className?: string }>;
                const isSelected = selectedTypes.includes(option.type);

                return (
                  <motion.button
                    key={option.type}
                    type="button"
                    onClick={() => onToggleWidget(option.type)}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all
                      hover:border-primary/50 hover:bg-secondary/30
                      flex flex-col items-center gap-1.5 text-center
                      ${isSelected ? "border-primary bg-primary/10" : "border-border/50 bg-background/50"}
                    `}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Selection indicator */}
                    <AnimatePresence>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center"
                        >
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <WidgetIcon className={`w-5 h-5 ${isSelected ? "text-primary" : "text-foreground"}`} />
                    <p className="text-xs font-medium leading-tight">{t(option.labelKey)}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// SortableCategoryFolder wrapper component
interface SortableCategoryFolderProps {
  category: WidgetCategory;
  widgetOptions: typeof widgetTypeOptions;
  selectedTypes: WidgetType[];
  onToggleWidget: (type: WidgetType) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function SortableCategoryFolder({ category, widgetOptions, selectedTypes, onToggleWidget, t }: SortableCategoryFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <WidgetCategoryFolder
        category={category}
        widgetOptions={widgetOptions}
        selectedTypes={selectedTypes}
        onToggleWidget={onToggleWidget}
        isDragging={isDragging}
        dragProps={listeners}
        t={t}
      />
    </div>
  );
}

export function AddWidgetModal() {
  const { t } = useTranslation();
  const isAddWidgetModalOpen = useWidgetStore((state) => state.isAddWidgetModalOpen);
  const closeAddWidgetModal = useWidgetStore((state) => state.closeAddWidgetModal);
  const addWidget = useWidgetStore((state) => state.addWidget);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const activeProjectId = useProjectsStore((state) => state.activeProjectId);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<WidgetType[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [customWidgetTypesList, setCustomWidgetTypesList] = useState<CustomWidgetTypeEntry[]>([]);
  const [isLoadingCustomTypes, setIsLoadingCustomTypes] = useState(false);
  const [customFavorites, setCustomFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem("stacklume-custom-widget-favorites");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Category order state for drag and drop
  const [categoryOrder, setCategoryOrder] = useState<string[]>(() => {
    // Initialize with default order from WIDGET_CATEGORIES
    return WIDGET_CATEGORIES.map(c => c.id);
  });

  // Load category order from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CATEGORY_ORDER_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that all category ids exist
        const validIds = WIDGET_CATEGORIES.map(c => c.id);
        const filteredOrder = parsed.filter((id: string) => validIds.includes(id));
        // Add any new categories that weren't in saved order
        const missingIds = validIds.filter(id => !filteredOrder.includes(id));
        setCategoryOrder([...filteredOrder, ...missingIds]);
      } catch {
        // Invalid JSON, use default order
      }
    }
  }, []);

  // Fetch custom widget types when modal opens
  useEffect(() => {
    if (!isAddWidgetModalOpen) return;
    setIsLoadingCustomTypes(true);
    fetch("/api/custom-widget-types", { credentials: "include", cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CustomWidgetTypeEntry[]) => setCustomWidgetTypesList(data))
      .catch(() => setCustomWidgetTypesList([]))
      .finally(() => setIsLoadingCustomTypes(false));
  }, [isAddWidgetModalOpen]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleCategoryDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCategoryOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        // Persist to localStorage
        localStorage.setItem(CATEGORY_ORDER_KEY, JSON.stringify(newOrder));
        return newOrder;
      });
    }
  }, []);

  // Get ordered categories
  const orderedCategories = useMemo(() => {
    return categoryOrder
      .map(id => WIDGET_CATEGORIES.find(c => c.id === id))
      .filter((c): c is WidgetCategory => c !== undefined);
  }, [categoryOrder]);

  // Filter widgets based on search query
  const filteredWidgetOptions = useMemo(() => {
    if (!deferredSearchQuery.trim()) return widgetTypeOptions;

    const query = deferredSearchQuery.toLowerCase().trim();
    return widgetTypeOptions.filter((option) =>
      t(option.labelKey).toLowerCase().includes(query) ||
      t(option.descKey).toLowerCase().includes(query) ||
      option.type.toLowerCase().includes(query)
    );
  }, [deferredSearchQuery, t]);

  const filteredCustomTypes = useMemo(() => {
    if (!deferredSearchQuery.trim()) return customWidgetTypesList;
    const q = deferredSearchQuery.toLowerCase().trim();
    return customWidgetTypesList.filter(
      (ct) =>
        ct.name.toLowerCase().includes(q) ||
        (ct.description ?? "").toLowerCase().includes(q)
    );
  }, [customWidgetTypesList, deferredSearchQuery]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "favorites",
      title: "",
      size: "medium",
      categoryId: "",
      tagId: "",
    },
  });

  const watchSize = form.watch("size");

  // Check if single widget is selected (for showing config options)
  const isSingleSelection = selectedTypes.length === 1;
  const singleSelectedType = isSingleSelection ? selectedTypes[0] : null;

  // Toggle widget type selection (multi-select)
  const handleTypeToggle = (type: WidgetType) => {
    setSelectedTypes((prev) => {
      const isSelected = prev.includes(type);
      if (isSelected) {
        return prev.filter((wt) => wt !== type);
      } else {
        return [...prev, type];
      }
    });

    // If only one widget is selected, update form values
    const newSelection = selectedTypes.includes(type)
      ? selectedTypes.filter((wt) => wt !== type)
      : [...selectedTypes, type];

    if (newSelection.length === 1) {
      const metadata = WIDGET_TYPE_METADATA[newSelection[0]];
      form.setValue("type", newSelection[0]);
      form.setValue("title", metadata.defaultTitle);
      form.setValue("size", metadata.defaultSize);
    }
  };

  // Select all visible (filtered) widgets
  const handleSelectAll = () => {
    const filteredTypes = filteredWidgetOptions.map((o) => o.type);
    const allFilteredSelected = filteredTypes.every((type) => selectedTypes.includes(type));

    if (allFilteredSelected) {
      // Deselect all filtered widgets
      setSelectedTypes((prev) => prev.filter((type) => !filteredTypes.includes(type)));
    } else {
      // Select all filtered widgets (add to existing selection)
      setSelectedTypes((prev) => {
        const newSelection = new Set([...prev, ...filteredTypes]);
        return Array.from(newSelection);
      });
    }
  };

  // Clear selection
  const handleClearSelection = () => {
    setSelectedTypes([]);
  };

  const handleAddCustomType = async (customType: CustomWidgetTypeEntry) => {
    setIsLoading(true);
    try {
      const size = sizeFromDims(customType.defaultWidth, customType.defaultHeight);
      await addWidget({
        type: "custom-user",
        title: customType.name,
        size,
        config: { ...(customType.defaultConfig ?? {}), _customTypeId: customType.id },
        projectId: activeProjectId,
        layout: { x: 0, y: 0, w: customType.defaultWidth, h: customType.defaultHeight },
      });
      toast.success(t("addWidget.customAdded", { name: customType.name }));
      form.reset();
      setSelectedTypes([]);
      setSelectedTags([]);
      setSearchQuery("");
      closeAddWidgetModal();
    } catch {
      toast.error(t("addWidget.errorCreatingWidget"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleCustomFavorite = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      try {
        localStorage.setItem("stacklume-custom-widget-favorites", JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  const handleExportCustomType = useCallback((customType: CustomWidgetTypeEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const exportData = {
      stacklume_widget_type: "1.0",
      name: customType.name,
      description: customType.description,
      category: customType.category ?? "custom",
      icon: customType.icon,
      htmlTemplate: customType.htmlTemplate ?? "",
      configSchema: customType.configSchema ?? null,
      defaultWidth: customType.defaultWidth,
      defaultHeight: customType.defaultHeight,
      defaultConfig: customType.defaultConfig,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${customType.name.replace(/\s+/g, "-").toLowerCase()}.stacklume-widget.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleDeleteCustomType = useCallback(async (customType: CustomWidgetTypeEntry, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await showConfirm({
      title: t("addWidget.confirmDeleteTitle"),
      description: t("addWidget.confirmDelete", { name: customType.name }),
      confirmLabel: t("btn.delete"),
      cancelLabel: t("btn.cancel"),
      variant: "destructive",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/custom-widget-types/${customType.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Delete failed");
      setCustomWidgetTypesList((prev) => prev.filter((ct) => ct.id !== customType.id));
      setCustomFavorites((prev) => {
        const next = new Set(prev);
        next.delete(customType.id);
        try {
          localStorage.setItem("stacklume-custom-widget-favorites", JSON.stringify([...next]));
        } catch {}
        return next;
      });
      toast.success(t("addWidget.typeDeleted", { name: customType.name }));
    } catch {
      toast.error(t("addWidget.errorDeleting"));
    }
  }, [t]);

  const onSubmit = async (values: FormValues) => {
    if (selectedTypes.length === 0) {
      toast.error(t("addWidget.selectAtLeast"));
      return;
    }

    setIsLoading(true);
    try {
      // Add widgets sequentially so each one gets correct position
      for (const widgetType of selectedTypes) {
        const metadata = WIDGET_TYPE_METADATA[widgetType];
        const defaultConfig = getDefaultWidgetConfig(widgetType);

        // For single selection, use form values; for multi, use defaults
        const widgetTitle = isSingleSelection ? values.title : metadata.defaultTitle;
        const widgetSize = isSingleSelection ? values.size : metadata.defaultSize;
        const sizePreset = WIDGET_SIZE_PRESETS[widgetSize];

        await addWidget({
          type: widgetType,
          title: widgetTitle,
          size: widgetSize,
          categoryId: isSingleSelection && metadata.requiresCategory ? values.categoryId || undefined : undefined,
          tagId: isSingleSelection && metadata.requiresTag ? values.tagId || undefined : undefined,
          tags: isSingleSelection && selectedTags.length > 0 ? selectedTags : undefined,
          config: defaultConfig,
          projectId: activeProjectId, // Explicitly pass the active project ID
          layout: {
            x: 0,
            y: 0,
            w: sizePreset.w,
            h: sizePreset.h,
          },
        });
      }

      toast.success(
        selectedTypes.length === 1
          ? t("addWidget.addedToPanel")
          : t("addWidget.addedMultiToPanel", { count: selectedTypes.length })
      );
      handleClose();
    } catch (error) {
      console.error("Error creating widgets:", error);
      toast.error(t("addWidget.errorCreating"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTypes([]);
    setSelectedTags([]);
    setSearchQuery("");
    closeAddWidgetModal();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Get current size dimensions for preview
  const currentSizePreset = WIDGET_SIZE_PRESETS[watchSize];
  const requiresCategory = singleSelectedType ? WIDGET_TYPE_METADATA[singleSelectedType]?.requiresCategory : false;
  const requiresTag = singleSelectedType ? WIDGET_TYPE_METADATA[singleSelectedType]?.requiresTag : false;

  return (
    <Dialog open={isAddWidgetModalOpen} onOpenChange={closeAddWidgetModal}>
      <DialogContent className="sm:max-w-2xl glass max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Grid3x3 className="w-5 h-5 text-primary" />
            {t("addWidget.title")}
            {selectedTypes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedTypes.length} {selectedTypes.length > 1 ? t("addWidget.selectedPlural") : t("addWidget.selected")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {t("addWidget.description")}
          </DialogDescription>
          {/* Search input */}
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("addWidget.searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 mt-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {/* Selection controls - outside DialogDescription to avoid p > div nesting */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              className="h-7 text-xs"
              disabled={filteredWidgetOptions.length === 0}
            >
              {filteredWidgetOptions.length > 0 && filteredWidgetOptions.every((o) => selectedTypes.includes(o.type))
                ? t("addWidget.deselectAll")
                : t("addWidget.selectAll")}
            </Button>
            {selectedTypes.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 text-xs text-muted-foreground"
              >
                {t("addWidget.clear")}
              </Button>
            )}
            {deferredSearchQuery && filteredWidgetOptions.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredWidgetOptions.length} {filteredWidgetOptions.length !== 1 ? t("addWidget.results") : t("addWidget.result")}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2 scrollbar-thin">
          <Form {...form}>
            <form id="add-widget-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Widget Type Selection - Multi-select */}
            <FormItem>
              <FormLabel>{t("addWidget.widgetType")}</FormLabel>
              <AnimatePresence mode="wait">
                {/* No search results */}
                {deferredSearchQuery.trim() && filteredWidgetOptions.length === 0 ? (
                  <motion.div
                    key="no-results"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <Search className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      {t("addWidget.noResults")}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("addWidget.noMatchQuery")} &quot;{deferredSearchQuery}&quot;
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-3"
                    >
                      {t("addWidget.clearSearch")}
                    </Button>
                  </motion.div>
                ) : deferredSearchQuery.trim() ? (
                  /* Flat view when searching */
                  <motion.div
                    key="flat-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Search className="w-3 h-3" />
                      <span>{t("addWidget.resultsFor")} &quot;{deferredSearchQuery}&quot;</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {filteredWidgetOptions.map((option) => {
                        const Icon = option.icon as React.ComponentType<{ className?: string }>;
                        const isSelected = selectedTypes.includes(option.type);

                        return (
                          <motion.button
                            key={option.type}
                            type="button"
                            onClick={() => handleTypeToggle(option.type)}
                            className={`
                              relative p-4 rounded-lg border-2 transition-all
                              hover:border-primary/50 hover:bg-secondary/30
                              flex flex-col items-center gap-2 text-center
                              ${
                                isSelected
                                  ? "border-primary bg-primary/10"
                                  : "border-border/50"
                              }
                            `}
                            whileTap={{ scale: 0.98 }}
                          >
                            {/* Selection indicator */}
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  exit={{ scale: 0, opacity: 0 }}
                                  className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                                >
                                  <Check className="w-3 h-3 text-primary-foreground" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                            <Icon
                              className={`w-6 h-6 ${
                                isSelected ? "text-primary" : "text-foreground"
                              }`}
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {t(option.labelKey)}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t(option.descKey)}
                              </p>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : (
                  /* Folder view when not searching */
                  <motion.div
                    key="folder-view"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <Folder className="w-3 h-3" />
                      <span>{t("addWidget.dragToReorder")}</span>
                    </div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleCategoryDragEnd}
                    >
                      <SortableContext
                        items={categoryOrder}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedCategories.map((category) => (
                          <SortableCategoryFolder
                            key={category.id}
                            category={category}
                            widgetOptions={widgetTypeOptions}
                            selectedTypes={selectedTypes}
                            onToggleWidget={handleTypeToggle}
                            t={t}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </motion.div>
                )}
              </AnimatePresence>
            </FormItem>

            {/* Mis widgets personalizados */}
            {(filteredCustomTypes.length > 0 || (isLoadingCustomTypes && customWidgetTypesList.length === 0)) && (
              <div className="space-y-3 border-t pt-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Puzzle className="w-4 h-4 text-primary" />
                  <span>{t("addWidget.customWidgets")}</span>
                  {filteredCustomTypes.length > 0 && (
                    <Badge variant="secondary">{filteredCustomTypes.length}</Badge>
                  )}
                </div>
                {isLoadingCustomTypes ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[...filteredCustomTypes]
                      .sort((a, b) => {
                        const af = customFavorites.has(a.id) ? 0 : 1;
                        const bf = customFavorites.has(b.id) ? 0 : 1;
                        return af - bf;
                      })
                      .map((customType) => {
                        const isFav = customFavorites.has(customType.id);
                        return (
                          <motion.div
                            key={customType.id}
                            className="relative group"
                            whileTap={{ scale: 0.98 }}
                          >
                            <button
                              type="button"
                              onClick={() => handleAddCustomType(customType)}
                              disabled={isLoading}
                              className="w-full p-4 pb-8 rounded-lg border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 flex flex-col items-center gap-2 text-center transition-all disabled:opacity-50"
                            >
                              <Puzzle className={cn("w-6 h-6", isFav ? "text-yellow-400" : "text-primary/70")} />
                              <div>
                                <p className="text-sm font-medium line-clamp-1">{customType.name}</p>
                                {customType.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {customType.description}
                                  </p>
                                )}
                              </div>
                            </button>
                            {/* Botones de acción */}
                            <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => handleToggleCustomFavorite(customType.id, e)}
                                    aria-label={isFav ? t("addWidget.removeFavorite") : t("addWidget.addFavorite")}
                                    className={cn(
                                      "p-1 rounded hover:bg-accent transition-colors",
                                      isFav ? "text-yellow-400" : "text-muted-foreground"
                                    )}
                                  >
                                    {isFav ? (
                                      <Star className="w-3.5 h-3.5 fill-current" />
                                    ) : (
                                      <StarOff className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{isFav ? t("addWidget.removeFavorite") : t("addWidget.addFavorite")}</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => handleExportCustomType(customType, e)}
                                    aria-label={t("addWidget.exportAsJson")}
                                    className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t("addWidget.exportAsJson")}</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteCustomType(customType, e)}
                                    aria-label={t("addWidget.deleteType")}
                                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>{t("addWidget.deleteType")}</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </motion.div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}

            {/* Show additional options only when single widget is selected */}
            <AnimatePresence>
              {isSingleSelection && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  {/* Title Field */}
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("addWidget.widgetTitle")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("addWidget.widgetTitlePlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Size Selection */}
                  <FormField
                    control={form.control}
                    name="size"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("addWidget.size")}</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {sizeOptions.map((size) => (
                              <SelectItem key={size.value} value={size.value}>
                                {t(size.labelKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Size Preview */}
                  <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
                    <p className="text-xs text-muted-foreground mb-3">
                      {t("addWidget.sizePreview")}
                    </p>
                    <div className="flex items-center gap-4">
                      <div
                        className="bg-primary/10 border-2 border-primary/30 rounded-md flex items-center justify-center"
                        style={{
                          width: `${currentSizePreset.w * 60}px`,
                          height: `${currentSizePreset.h * 40}px`,
                          minWidth: "60px",
                          minHeight: "80px",
                        }}
                      >
                        <Grid3x3 className="w-6 h-6 text-primary/40" />
                      </div>
                      <div className="text-xs text-muted-foreground">
                        <p>
                          {t("addWidget.width")}: {currentSizePreset.w} {currentSizePreset.w > 1 ? t("addWidget.columns") : t("addWidget.column")}
                        </p>
                        <p>
                          {t("addWidget.height")}: {currentSizePreset.h} {currentSizePreset.h > 1 ? t("addWidget.rows") : t("addWidget.row")}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Category Selection (only for category widget type) */}
                  {requiresCategory && (
                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("addWidget.category")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("addWidget.selectCategory")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  {t("addWidget.noCategories")}
                                </div>
                              ) : (
                                categories.map((category: Category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Tag Selection (only for tag widget type) */}
                  {requiresTag && (
                    <FormField
                      control={form.control}
                      name="tagId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("addWidget.filterByTag")}</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("addWidget.selectTag")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tags.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  {t("addWidget.noTags")}
                                </div>
                              ) : (
                                tags.map((tag: Tag) => (
                                  <SelectItem key={tag.id} value={tag.id}>
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full bg-${tag.color || "gray"}-500`}
                                      />
                                      {tag.name}
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {/* Widget Tags Assignment (for all widget types) */}
                  {tags.length > 0 && (
                    <div className="space-y-2">
                      <FormLabel>{t("addWidget.widgetTags")}</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        {t("addWidget.assignTags")}
                      </p>
                      <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20 min-h-[60px]">
                        {tags.map((tag: Tag) => {
                          const isSelected = selectedTags.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`
                                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                                ${
                                  isSelected
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-secondary hover:bg-secondary/80 text-foreground"
                                }
                              `}
                            >
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  isSelected ? "bg-primary-foreground/70" : `bg-${tag.color || "gray"}-500`
                                }`}
                              />
                              {tag.name}
                              {isSelected && (
                                <X className="w-3 h-3 ml-0.5" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {selectedTags.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {selectedTags.length > 1 ? t("addWidget.tagsSelectedPlural", { count: selectedTags.length }) : t("addWidget.tagsSelected", { count: selectedTags.length })}
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Multi-selection info message */}
            <AnimatePresence>
              {selectedTypes.length > 1 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-primary/30 bg-primary/5 p-4"
                >
                  <div className="flex items-start gap-3">
                    <Grid3x3 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">
                        {t("addWidget.multiSelectedTitle", { count: selectedTypes.length })}
                      </p>
                      <p className="text-muted-foreground mt-1">
                        {t("addWidget.multiSelectedDesc")}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            </form>
          </Form>
        </div>

        {/* Footer sticky fuera del área scrollable */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border/50 flex-shrink-0">
          <Button type="button" variant="ghost" onClick={handleClose}>
            {t("addWidget.cancel")}
          </Button>
          <Button type="submit" form="add-widget-form" disabled={isLoading || selectedTypes.length === 0}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selectedTypes.length === 0
              ? t("addWidget.selectWidgets")
              : selectedTypes.length === 1
              ? t("addWidget.createWidget")
              : t("addWidget.createWidgets", { count: selectedTypes.length })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
