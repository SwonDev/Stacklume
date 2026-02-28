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
  ]),
  title: z.string().min(1, "El título es obligatorio"),
  size: z.enum(["small", "medium", "large", "wide", "tall"]),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Widget type options with icons and labels in Spanish
const widgetTypeOptions: Array<{
  type: WidgetType;
  label: string;
  description: string;
  icon: React.ElementType;
  requiresCategory?: boolean;
  requiresTag?: boolean;
}> = [
  {
    type: "favorites",
    label: "Favoritos",
    description: "Muestra enlaces favoritos",
    icon: Star,
  },
  {
    type: "recent",
    label: "Recientes",
    description: "Muestra enlaces recientes",
    icon: Clock,
  },
  {
    type: "category",
    label: "Categoría",
    description: "Enlaces de una categoría",
    icon: FolderOpen,
    requiresCategory: true,
  },
  {
    type: "tag",
    label: "Etiqueta",
    description: "Enlaces de una etiqueta",
    icon: TagIcon,
    requiresTag: true,
  },
  {
    type: "categories",
    label: "Categorías",
    description: "Vista de todas las categorías",
    icon: Folders,
  },
  {
    type: "quick-add",
    label: "Añadir Rápido",
    description: "Formulario de añadir enlace",
    icon: Plus,
  },
  {
    type: "stats",
    label: "Estadísticas",
    description: "Panel de estadísticas",
    icon: BarChart3,
  },
  {
    type: "link-analytics",
    label: "Analíticas",
    description: "Estadísticas detalladas de enlaces",
    icon: PieChart,
  },
  {
    type: "clock",
    label: "Reloj",
    description: "Reloj y hora actual",
    icon: Clock3,
  },
  {
    type: "notes",
    label: "Notas",
    description: "Widget de notas",
    icon: StickyNote,
  },
  {
    type: "progress",
    label: "Progreso",
    description: "Seguimiento de metas",
    icon: Target,
  },
  {
    type: "search",
    label: "Búsqueda",
    description: "Buscar enlaces",
    icon: Search,
  },
  {
    type: "bookmarks",
    label: "Marcadores",
    description: "Enlaces destacados",
    icon: Bookmark,
  },
  {
    type: "image",
    label: "Imagen",
    description: "Banner o imagen",
    icon: Image,
  },
  {
    type: "weather",
    label: "Clima",
    description: "Información del tiempo",
    icon: Cloud,
  },
  {
    type: "quote",
    label: "Cita",
    description: "Citas inspiradoras",
    icon: Quote,
  },
  {
    type: "pomodoro",
    label: "Pomodoro",
    description: "Temporizador productivo",
    icon: Timer,
  },
  {
    type: "calendar",
    label: "Calendario",
    description: "Calendario mensual",
    icon: Calendar,
  },
  {
    type: "todo",
    label: "Tareas",
    description: "Lista de tareas",
    icon: CheckSquare,
  },
  {
    type: "custom",
    label: "Personalizado",
    description: "Widget configurable",
    icon: Sparkles,
  },
  {
    type: "countdown",
    label: "Cuenta Atrás",
    description: "Temporizador para eventos",
    icon: Hourglass,
  },
  {
    type: "habit-tracker",
    label: "Hábitos",
    description: "Seguimiento de hábitos",
    icon: CheckCircle,
  },
  {
    type: "tag-cloud",
    label: "Nube de Tags",
    description: "Visualización de etiquetas",
    icon: Cloud,
  },
  {
    type: "random-link",
    label: "Enlace Aleatorio",
    description: "Descubre enlaces al azar",
    icon: Shuffle,
  },
  {
    type: "github-activity",
    label: "Actividad",
    description: "Gráfico estilo GitHub",
    icon: Github,
  },
  {
    type: "bookmark-growth",
    label: "Crecimiento",
    description: "Estadísticas de crecimiento",
    icon: TrendingUp,
  },
  {
    type: "rss-feed",
    label: "RSS Feed",
    description: "Agregador de feeds",
    icon: Rss,
  },
  {
    type: "reading-streak",
    label: "Racha de Lectura",
    description: "Calendario de actividad",
    icon: Flame,
  },
  {
    type: "github-trending",
    label: "GitHub Trending",
    description: "Repos trending de @tom_doerr",
    icon: Sparkles,
  },
  {
    type: "steam-games",
    label: "Steam Games",
    description: "Novedades, próximos y ofertas",
    icon: Gamepad2,
  },
  {
    type: "nintendo-deals",
    label: "Nintendo eShop",
    description: "Ofertas, ranking y novedades de Switch",
    icon: Gamepad2,
  },
  {
    type: "github-search",
    label: "GitHub Search",
    description: "Busca repos de GitHub",
    icon: Github,
  },
  // New widgets
  {
    type: "codepen",
    label: "CodePen",
    description: "Snippets de código embebidos",
    icon: Code,
  },
  {
    type: "spotify",
    label: "Spotify",
    description: "Música y podcasts",
    icon: Music,
  },
  {
    type: "youtube",
    label: "YouTube",
    description: "Videos embebidos",
    icon: PlayCircle,
  },
  {
    type: "crypto",
    label: "Cripto",
    description: "Precios de criptomonedas",
    icon: Bitcoin,
  },
  {
    type: "world-clock",
    label: "Reloj Mundial",
    description: "Múltiples zonas horarias",
    icon: Globe,
  },
  {
    type: "color-palette",
    label: "Paleta de Colores",
    description: "Gestor de colores",
    icon: Palette,
  },
  {
    type: "unsplash",
    label: "Unsplash",
    description: "Fotos aleatorias",
    icon: ImageIcon,
  },
  {
    type: "qr-code",
    label: "Código QR",
    description: "Generador de QR",
    icon: QrCode,
  },
  {
    type: "website-monitor",
    label: "Monitor Web",
    description: "Estado de sitios web",
    icon: Activity,
  },
  {
    type: "embed",
    label: "Embed",
    description: "Contenido embebido genérico",
    icon: Code2,
  },
  {
    type: "prompt",
    label: "Prompts",
    description: "Almacena y genera prompts para IA",
    icon: MessageSquareText,
  },
  {
    type: "prompt-builder",
    label: "Prompt Builder",
    description: "Genera prompts con enlaces y stack tecnológico",
    icon: Wand2,
  },
  {
    type: "mcp-explorer",
    label: "MCP Explorer",
    description: "Explora servidores MCP para Claude",
    icon: Puzzle,
  },
  {
    type: "deployment-status",
    label: "Deployments",
    description: "Estado de Vercel/Netlify",
    icon: Rocket,
  },
  {
    type: "voice-notes",
    label: "Notas de Voz",
    description: "Graba y transcribe notas",
    icon: Mic,
  },
  {
    type: "link-manager",
    label: "Link Manager",
    description: "Gestiona y organiza tus enlaces",
    icon: LayoutList,
  },
  // Social/News Feed widgets
  {
    type: "twitter-feed",
    label: "Twitter / X",
    description: "Timeline de un usuario de Twitter",
    icon: Twitter,
  },
  {
    type: "reddit",
    label: "Reddit",
    description: "Posts de tus subreddits favoritos",
    icon: MessageCircle,
  },
  {
    type: "hacker-news",
    label: "Hacker News",
    description: "Las mejores historias de HN",
    icon: Newspaper,
  },
  {
    type: "product-hunt",
    label: "Product Hunt",
    description: "Productos trending",
    icon: Rocket,
  },
  {
    type: "devto-feed",
    label: "DEV.to",
    description: "Articulos de la comunidad DEV",
    icon: Code,
  },
  // Utility widgets
  {
    type: "calculator",
    label: "Calculadora",
    description: "Calculadora para operaciones rápidas",
    icon: Calculator,
  },
  {
    type: "stopwatch",
    label: "Cronómetro",
    description: "Cronómetro con vueltas y tiempos",
    icon: TimerIcon,
  },
  {
    type: "json-formatter",
    label: "JSON Formatter",
    description: "Formatea y valida JSON",
    icon: Braces,
  },
  {
    type: "base64-tool",
    label: "Base64",
    description: "Codifica y decodifica Base64",
    icon: Binary,
  },
  {
    type: "text-tools",
    label: "Text Tools",
    description: "Herramientas de texto",
    icon: Type,
  },
  {
    type: "password-generator",
    label: "Contraseñas",
    description: "Genera contraseñas seguras",
    icon: KeyRound,
  },
  {
    type: "lorem-ipsum",
    label: "Lorem Ipsum",
    description: "Genera texto de relleno",
    icon: FileText,
  },
  {
    type: "dice-roller",
    label: "Dados",
    description: "Lanza dados virtuales",
    icon: Dices,
  },
  // Developer/Converter widgets
  {
    type: "unit-converter",
    label: "Convertidor de Unidades",
    description: "Convierte entre unidades de medida",
    icon: Scale,
  },
  {
    type: "currency-converter",
    label: "Convertidor de Divisas",
    description: "Convierte entre divisas",
    icon: Coins,
  },
  {
    type: "markdown-preview",
    label: "Markdown Editor",
    description: "Editor con vista previa en vivo",
    icon: FileCode,
  },
  {
    type: "regex-tester",
    label: "Regex Tester",
    description: "Prueba expresiones regulares",
    icon: Regex,
  },
  {
    type: "color-converter",
    label: "Convertidor de Colores",
    description: "Convierte entre formatos de color",
    icon: Palette,
  },
  {
    type: "timezone-converter",
    label: "Convertidor de Zonas Horarias",
    description: "Convierte horarios entre zonas",
    icon: Globe,
  },
  {
    type: "hash-generator",
    label: "Generador de Hash",
    description: "Genera hashes MD5, SHA",
    icon: Hash,
  },
  {
    type: "ip-info",
    label: "IP Info",
    description: "Información de tu IP y red",
    icon: Network,
  },
  // Generator/Calculator widgets
  {
    type: "uuid-generator",
    label: "UUID Generator",
    description: "Genera identificadores UUID v1/v4",
    icon: Fingerprint,
  },
  {
    type: "number-converter",
    label: "Number Converter",
    description: "Convierte binario, octal, decimal, hex",
    icon: Binary,
  },
  {
    type: "gradient-generator",
    label: "Gradient Generator",
    description: "Genera gradientes CSS",
    icon: Blend,
  },
  {
    type: "box-shadow-generator",
    label: "Box Shadow",
    description: "Genera sombras CSS box-shadow",
    icon: Square,
  },
  {
    type: "aspect-ratio",
    label: "Aspect Ratio",
    description: "Calculadora de proporción",
    icon: RectangleHorizontal,
  },
  {
    type: "jwt-decoder",
    label: "JWT Decoder",
    description: "Decodifica tokens JWT",
    icon: Key,
  },
  {
    type: "age-calculator",
    label: "Age Calculator",
    description: "Calcula edad desde fecha de nacimiento",
    icon: Cake,
  },
  {
    type: "word-counter",
    label: "Word Counter",
    description: "Cuenta palabras y caracteres",
    icon: FileText,
  },
  // Web Design widgets
  {
    type: "typography-scale",
    label: "Typography Scale",
    description: "Calculadora de escala tipográfica",
    icon: ALargeSmall,
  },
  {
    type: "spacing-calculator",
    label: "Spacing Calculator",
    description: "Calcula sistemas de espaciado CSS",
    icon: Ruler,
  },
  {
    type: "flexbox-playground",
    label: "Flexbox Playground",
    description: "Visualizador interactivo de Flexbox",
    icon: Boxes,
  },
  {
    type: "contrast-checker",
    label: "Contrast Checker",
    description: "Verifica contraste WCAG",
    icon: Eye,
  },
  {
    type: "css-animation",
    label: "CSS Animation",
    description: "Generador de animaciones CSS",
    icon: Sparkle,
  },
  {
    type: "glassmorphism",
    label: "Glassmorphism",
    description: "Generador de efecto glass CSS",
    icon: Layers,
  },
  {
    type: "neumorphism",
    label: "Neumorphism",
    description: "Generador de Soft UI CSS",
    icon: Square,
  },
  {
    type: "tailwind-colors",
    label: "Tailwind Colors",
    description: "Paleta de colores Tailwind CSS",
    icon: SwatchBook,
  },
  {
    type: "css-filter",
    label: "CSS Filter",
    description: "Generador de filtros CSS",
    icon: SlidersHorizontal,
  },
  {
    type: "css-grid",
    label: "CSS Grid",
    description: "Generador visual de CSS Grid",
    icon: LayoutGrid,
  },
  {
    type: "svg-wave",
    label: "SVG Wave",
    description: "Generador de ondas SVG",
    icon: Waves,
  },
  {
    type: "text-shadow-generator",
    label: "Text Shadow",
    description: "Generador de sombra de texto CSS",
    icon: Type,
  },
  {
    type: "clip-path-generator",
    label: "Clip Path",
    description: "Generador de clip-path CSS",
    icon: Pentagon,
  },
  {
    type: "css-transform",
    label: "CSS Transform",
    description: "Generador de transformaciones CSS",
    icon: Move3d,
  },
  // Game Development widgets
  {
    type: "easing-functions",
    label: "Easing Functions",
    description: "Visualizador de funciones de easing",
    icon: Zap,
  },
  {
    type: "sprite-sheet",
    label: "Sprite Sheet",
    description: "Cortador y previsualizador de sprites",
    icon: Film,
  },
  {
    type: "color-ramp",
    label: "Color Ramp",
    description: "Generador de rampas de color",
    icon: Paintbrush,
  },
  {
    type: "game-math",
    label: "Game Math",
    description: "Calculadora matemática para juegos",
    icon: Compass,
  },
  {
    type: "noise-generator",
    label: "Noise Generator",
    description: "Generador de ruido procedural",
    icon: Mountain,
  },
  {
    type: "particle-system",
    label: "Particle System",
    description: "Editor de sistemas de partículas",
    icon: SparklesIcon,
  },
  {
    type: "screen-resolution",
    label: "Screen Resolution",
    description: "Calculadora de resoluciones",
    icon: Monitor,
  },
  {
    type: "bezier-curve",
    label: "Bezier Curve",
    description: "Editor de curvas Bezier",
    icon: Spline,
  },
  {
    type: "rpg-stats",
    label: "RPG Stats",
    description: "Calculadora de stats y daño RPG",
    icon: Sword,
  },
  {
    type: "tilemap-editor",
    label: "Tilemap Editor",
    description: "Editor de tilemaps 2D",
    icon: Map,
  },
  {
    type: "frame-rate",
    label: "Frame Rate",
    description: "Calculadora de FPS y tiempos",
    icon: Gauge,
  },
  {
    type: "state-machine",
    label: "State Machine",
    description: "Editor de máquinas de estados",
    icon: CircleDot,
  },
  {
    type: "pixel-art",
    label: "Pixel Art",
    description: "Canvas para dibujar pixel art",
    icon: PenTool,
  },
  {
    type: "loot-table",
    label: "Loot Table",
    description: "Calculadora de tablas de loot",
    icon: Gift,
  },
  // New Game Development widgets
  {
    type: "hitbox-editor",
    label: "Hitbox Editor",
    description: "Editor visual de hitboxes y colisiones",
    icon: SquareIcon,
  },
  {
    type: "pathfinding",
    label: "Pathfinding",
    description: "Visualizador de algoritmos de pathfinding",
    icon: Route,
  },
  {
    type: "dialogue-tree",
    label: "Dialogue Tree",
    description: "Editor de árboles de diálogo para RPGs",
    icon: MessageSquare,
  },
  {
    type: "skill-tree",
    label: "Skill Tree",
    description: "Editor de árboles de habilidades",
    icon: TreePine,
  },
  {
    type: "wave-spawner",
    label: "Wave Spawner",
    description: "Diseñador de oleadas de enemigos",
    icon: Users,
  },
  {
    type: "camera-shake",
    label: "Camera Shake",
    description: "Diseñador de efectos de vibración de cámara",
    icon: Camera,
  },
  {
    type: "health-bar",
    label: "Health Bar",
    description: "Diseñador de barras HP/MP/Stamina",
    icon: Heart,
  },
  {
    type: "damage-calculator",
    label: "Damage Calculator",
    description: "Calculadora de fórmulas de daño",
    icon: Sword,
  },
  {
    type: "input-mapper",
    label: "Input Mapper",
    description: "Mapeador de controles para juegos",
    icon: Gamepad2,
  },
  {
    type: "level-progress",
    label: "Level Progress",
    description: "Diseñador de curvas de progresión de nivel",
    icon: TrendingUpIcon,
  },
  {
    type: "behavior-tree",
    label: "Behavior Tree",
    description: "Editor de árboles de comportamiento para IA",
    icon: GitBranch,
  },
  {
    type: "name-generator",
    label: "Name Generator",
    description: "Generador de nombres procedurales",
    icon: Wand2,
  },
  {
    type: "inventory-grid",
    label: "Inventory Grid",
    description: "Diseñador de inventario estilo RE4/Diablo",
    icon: Package,
  },
  {
    type: "achievement",
    label: "Achievement",
    description: "Diseñador de sistema de logros",
    icon: Trophy,
  },
  {
    type: "quest-designer",
    label: "Quest Designer",
    description: "Diseñador de misiones y quests",
    icon: Scroll,
  },
  {
    type: "physics-playground",
    label: "Physics Playground",
    description: "Simulación de físicas 2D interactiva",
    icon: Atom,
  },
  // Organization & Productivity widgets
  {
    type: "design-tokens",
    label: "Design Tokens",
    description: "Gestor de tokens de diseño",
    icon: Palette,
  },
  {
    type: "code-snippets",
    label: "Code Snippets",
    description: "Biblioteca de fragmentos de código",
    icon: Code,
  },
  {
    type: "sprint-tasks",
    label: "Sprint Tasks",
    description: "Tablero de tareas tipo kanban",
    icon: LayoutGrid,
  },
  {
    type: "decision-log",
    label: "Decision Log",
    description: "Registro de decisiones de arquitectura",
    icon: FileText,
  },
  {
    type: "eisenhower-matrix",
    label: "Eisenhower Matrix",
    description: "Matriz de prioridades urgente/importante",
    icon: Grid3x3,
  },
  {
    type: "standup-notes",
    label: "Standup Notes",
    description: "Notas de daily standup",
    icon: Users,
  },
  {
    type: "mood-board",
    label: "Mood Board",
    description: "Colector de inspiración visual",
    icon: ImageIcon,
  },
  {
    type: "api-reference",
    label: "API Reference",
    description: "Referencia rápida de endpoints API",
    icon: Code2,
  },
  {
    type: "meeting-notes",
    label: "Meeting Notes",
    description: "Notas de reuniones con acciones",
    icon: StickyNote,
  },
  {
    type: "weekly-goals",
    label: "Weekly Goals",
    description: "Objetivos y OKRs semanales",
    icon: Target,
  },
  {
    type: "parking-lot",
    label: "Parking Lot",
    description: "Backlog de ideas y features",
    icon: Package,
  },
  {
    type: "pr-checklist",
    label: "PR Checklist",
    description: "Checklist de revisión de PRs",
    icon: CheckSquare,
  },
  {
    type: "tech-debt",
    label: "Tech Debt",
    description: "Tracker de deuda técnica",
    icon: Activity,
  },
  {
    type: "project-timeline",
    label: "Project Timeline",
    description: "Timeline de hitos del proyecto",
    icon: Calendar,
  },
  {
    type: "component-docs",
    label: "Component Docs",
    description: "Documentación de componentes",
    icon: Boxes,
  },
  {
    type: "wireframe",
    label: "Wireframe",
    description: "Herramienta de wireframing rápido",
    icon: PenTool,
  },
  {
    type: "design-review",
    label: "Design Review",
    description: "Checklist de revisión de diseño",
    icon: Eye,
  },
  {
    type: "env-vars",
    label: "Env Variables",
    description: "Gestor de variables de entorno",
    icon: KeyRound,
  },
  {
    type: "git-commands",
    label: "Git Commands",
    description: "Cheatsheet de comandos Git",
    icon: GitBranch,
  },
  {
    type: "shadcn-builder",
    label: "shadcn/ui Builder",
    description: "Configura componentes y tema shadcn/ui",
    icon: Palette,
  },
  // Wellness & Life Tracking widgets
  {
    type: "mood-tracker",
    label: "Estado de Ánimo",
    description: "Registro diario de estado emocional con emojis",
    icon: Smile,
  },
  {
    type: "water-intake",
    label: "Hidratación",
    description: "Contador de vasos de agua con meta diaria",
    icon: Droplets,
  },
  {
    type: "sleep-log",
    label: "Registro de Sueño",
    description: "Registro de horas de sueño con tendencias",
    icon: Moon,
  },
  {
    type: "breathing-exercise",
    label: "Respiración",
    description: "Ejercicios de respiración guiados",
    icon: Wind,
  },
  {
    type: "gratitude-journal",
    label: "Diario de Gratitud",
    description: "Registro diario de 3 gratitudes",
    icon: Heart,
  },
  {
    type: "daily-affirmations",
    label: "Afirmaciones",
    description: "Afirmaciones positivas diarias",
    icon: Sparkles,
  },
  // Finance widgets
  {
    type: "expense-tracker",
    label: "Gastos",
    description: "Registro rápido de gastos por categoría",
    icon: Receipt,
  },
  {
    type: "budget-progress",
    label: "Presupuesto",
    description: "Progreso de presupuesto por categoría",
    icon: PieChart,
  },
  {
    type: "savings-goal",
    label: "Metas de Ahorro",
    description: "Seguimiento de metas de ahorro",
    icon: PiggyBank,
  },
  {
    type: "subscription-manager",
    label: "Suscripciones",
    description: "Gestión de suscripciones y renovaciones",
    icon: CreditCard,
  },
  // Advanced Productivity widgets
  {
    type: "focus-score",
    label: "Puntuación de Enfoque",
    description: "Seguimiento de sesiones de concentración",
    icon: Target,
  },
  {
    type: "time-blocking",
    label: "Bloques de Tiempo",
    description: "Planificación visual del día",
    icon: CalendarClock,
  },
  {
    type: "daily-review",
    label: "Revisión Diaria",
    description: "Resumen del día: logros y mejoras",
    icon: ClipboardCheck,
  },
  {
    type: "parking-lot-enhanced",
    label: "Parking Lot+",
    description: "Ideas y tareas con votación",
    icon: Lightbulb,
  },
  {
    type: "energy-tracker",
    label: "Energía",
    description: "Niveles de energía durante el día",
    icon: Battery,
  },
  // Entertainment & Media widgets
  {
    type: "movie-tracker",
    label: "Películas",
    description: "Seguimiento de películas y series",
    icon: Film,
  },
  {
    type: "book-tracker",
    label: "Libros",
    description: "Seguimiento de lecturas",
    icon: BookOpen,
  },
  {
    type: "anime-list",
    label: "Anime/Manga",
    description: "Seguimiento de anime y manga",
    icon: Tv,
  },
  {
    type: "game-backlog",
    label: "Juegos",
    description: "Backlog de videojuegos",
    icon: Gamepad2,
  },
  {
    type: "wishlist",
    label: "Lista de Deseos",
    description: "Wishlist con precios y enlaces",
    icon: Gift,
  },
  // AI & Intelligence widgets
  {
    type: "ai-chat",
    label: "Chat IA",
    description: "Chat con inteligencia artificial",
    icon: Bot,
  },
  {
    type: "ai-daily-summary",
    label: "Resumen IA",
    description: "Resumen diario de tu actividad",
    icon: Wand2,
  },
  {
    type: "smart-suggestions",
    label: "Sugerencias",
    description: "Links recomendados para ti",
    icon: Sparkles,
  },
  // Additional Social widget
  {
    type: "reddit-widget",
    label: "Reddit Widget",
    description: "Posts de subreddits (widget alternativo)",
    icon: MessageCircle,
  },
  // Design & Creativity widgets
  {
    type: "color-of-day",
    label: "Color del Día",
    description: "Color destacado con paletas",
    icon: Palette,
  },
  {
    type: "font-pairing",
    label: "Tipografías",
    description: "Combinaciones de fuentes",
    icon: Type,
  },
  {
    type: "design-inspiration",
    label: "Inspiración",
    description: "Inspiración de diseño aleatoria",
    icon: Image,
  },
  {
    type: "icon-picker",
    label: "Iconos",
    description: "Buscador de iconos Lucide",
    icon: Search,
  },
  {
    type: "screenshot-mockup",
    label: "Mockups",
    description: "Generador de mockups rápidos",
    icon: Smartphone,
  },
  // Utility widgets (new)
  {
    type: "clipboard-history",
    label: "Portapapeles",
    description: "Historial de portapapeles",
    icon: Clipboard,
  },
  {
    type: "sticky-notes",
    label: "Notas Adhesivas",
    description: "Post-its coloridos",
    icon: StickyNote,
  },
  {
    type: "link-previewer",
    label: "Preview URL",
    description: "Vista previa de URLs",
    icon: Link,
  },
  {
    type: "site-status",
    label: "Estado de Sitios",
    description: "Monitor de uptime multi-sitio",
    icon: Activity,
  },
  {
    type: "api-tester",
    label: "API Tester",
    description: "Pruebas rápidas de API REST",
    icon: Terminal,
  },
  {
    type: "cron-builder",
    label: "Cron Builder",
    description: "Constructor de expresiones cron",
    icon: Clock,
  },
  {
    type: "diff-viewer",
    label: "Diff Viewer",
    description: "Comparador de textos",
    icon: GitCompare,
  },
  {
    type: "password-manager",
    label: "Gestor de Contraseñas",
    description: "Almacena logins, usuarios y contraseñas con acceso a las webs",
    icon: KeyRound,
  },
];

// Size options in Spanish
const sizeOptions: Array<{ value: WidgetSize; label: string }> = [
  { value: "small", label: "Pequeño" },
  { value: "medium", label: "Mediano" },
  { value: "large", label: "Grande" },
  { value: "wide", label: "Ancho" },
  { value: "tall", label: "Alto" },
];

// Widget categories for folder organization
interface WidgetCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
  widgets: WidgetType[];
}

const WIDGET_CATEGORIES: WidgetCategory[] = [
  {
    id: "links",
    label: "Enlaces",
    icon: Link,
    color: "blue",
    widgets: ["favorites", "recent", "category", "tag", "categories", "quick-add", "bookmarks", "search", "random-link", "link-manager"],
  },
  {
    id: "productivity",
    label: "Productividad",
    icon: Clock,
    color: "green",
    widgets: ["clock", "notes", "progress", "pomodoro", "calendar", "todo", "countdown", "habit-tracker", "weather", "quote", "custom"],
  },
  {
    id: "analytics",
    label: "Analítica",
    icon: BarChart3,
    color: "purple",
    widgets: ["stats", "link-analytics", "github-activity", "bookmark-growth", "reading-streak", "tag-cloud", "rss-feed"],
  },
  {
    id: "external",
    label: "Contenido Externo",
    icon: Globe,
    color: "cyan",
    widgets: ["github-trending", "steam-games", "nintendo-deals", "github-search", "codepen", "spotify", "youtube", "crypto", "unsplash", "embed"],
  },
  {
    id: "social",
    label: "Redes Sociales",
    icon: MessageCircle,
    color: "pink",
    widgets: ["twitter-feed", "reddit", "reddit-widget", "hacker-news", "product-hunt", "devto-feed"],
  },
  {
    id: "utilities",
    label: "Utilidades",
    icon: Calculator,
    color: "orange",
    widgets: ["calculator", "stopwatch", "world-clock", "qr-code", "website-monitor", "image", "color-palette", "dice-roller"],
  },
  {
    id: "developer",
    label: "Desarrollador",
    icon: Code,
    color: "slate",
    widgets: ["json-formatter", "base64-tool", "text-tools", "password-generator", "lorem-ipsum", "regex-tester", "hash-generator", "ip-info", "uuid-generator", "jwt-decoder", "markdown-preview"],
  },
  {
    id: "converters",
    label: "Conversores",
    icon: Scale,
    color: "teal",
    widgets: ["unit-converter", "currency-converter", "color-converter", "timezone-converter", "number-converter", "aspect-ratio", "age-calculator", "word-counter"],
  },
  {
    id: "css-generators",
    label: "Generadores CSS",
    icon: Paintbrush,
    color: "violet",
    widgets: ["gradient-generator", "box-shadow-generator", "text-shadow-generator", "contrast-checker", "spacing-calculator", "flexbox-playground", "glassmorphism", "neumorphism", "svg-wave", "css-animation", "tailwind-colors", "css-filter", "css-grid", "typography-scale", "clip-path-generator", "css-transform"],
  },
  {
    id: "gamedev",
    label: "Game Dev",
    icon: Gamepad2,
    color: "red",
    widgets: ["easing-functions", "sprite-sheet", "color-ramp", "game-math", "noise-generator", "particle-system", "screen-resolution", "bezier-curve", "rpg-stats", "tilemap-editor", "frame-rate", "state-machine", "pixel-art", "loot-table", "hitbox-editor", "pathfinding", "dialogue-tree", "skill-tree", "wave-spawner", "camera-shake", "health-bar", "damage-calculator", "input-mapper", "level-progress", "behavior-tree", "name-generator", "inventory-grid", "achievement", "quest-designer", "physics-playground"],
  },
  {
    id: "organization",
    label: "Organización",
    icon: LayoutList,
    color: "amber",
    widgets: ["design-tokens", "code-snippets", "sprint-tasks", "decision-log", "eisenhower-matrix", "standup-notes", "mood-board", "api-reference", "meeting-notes", "weekly-goals", "parking-lot", "pr-checklist", "tech-debt", "project-timeline", "component-docs", "wireframe", "design-review", "env-vars", "git-commands", "shadcn-builder"],
  },
  {
    id: "wellness",
    label: "Bienestar",
    icon: Heart,
    color: "rose",
    widgets: ["mood-tracker", "water-intake", "sleep-log", "breathing-exercise", "gratitude-journal", "daily-affirmations"],
  },
  {
    id: "finance",
    label: "Finanzas",
    icon: Coins,
    color: "emerald",
    widgets: ["expense-tracker", "budget-progress", "savings-goal", "subscription-manager"],
  },
  {
    id: "entertainment",
    label: "Entretenimiento",
    icon: Film,
    color: "indigo",
    widgets: ["movie-tracker", "book-tracker", "anime-list", "game-backlog", "wishlist"],
  },
  {
    id: "ai",
    label: "IA & Inteligencia",
    icon: Bot,
    color: "fuchsia",
    widgets: ["ai-chat", "ai-daily-summary", "smart-suggestions", "prompt", "prompt-builder", "mcp-explorer", "voice-notes"],
  },
  {
    id: "creativity",
    label: "Diseño & Creatividad",
    icon: Palette,
    color: "lime",
    widgets: ["color-of-day", "font-pairing", "design-inspiration", "icon-picker", "screenshot-mockup"],
  },
  {
    id: "productivity-ext",
    label: "Productividad Avanzada",
    icon: Rocket,
    color: "sky",
    widgets: ["focus-score", "time-blocking", "daily-review", "energy-tracker", "parking-lot-enhanced", "deployment-status"],
  },
  {
    id: "utility-ext",
    label: "Utilidades Avanzadas",
    icon: Terminal,
    color: "zinc",
    widgets: ["clipboard-history", "sticky-notes", "link-previewer", "site-status", "api-tester", "cron-builder", "diff-viewer", "password-manager"],
  },
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
}

function WidgetCategoryFolder({ category, widgetOptions, selectedTypes, onToggleWidget, isDragging, dragProps }: WidgetCategoryFolderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const categoryWidgets = useMemo(() => {
    return widgetOptions.filter(opt => category.widgets.includes(opt.type));
  }, [widgetOptions, category.widgets]);

  const selectedCount = useMemo(() => {
    return categoryWidgets.filter(w => selectedTypes.includes(w.type)).length;
  }, [categoryWidgets, selectedTypes]);

  const colors = FOLDER_COLORS[category.color] || FOLDER_COLORS.blue;
  const Icon = category.icon;

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
          <span className="font-medium text-sm">{category.label}</span>
        </div>

        {/* Badge with widget count */}
        <div className="flex items-center gap-2">
          {selectedCount > 0 && (
            <Badge variant="default" className="h-5 px-2 text-xs bg-primary">
              {selectedCount} sel.
            </Badge>
          )}
          <Badge variant="secondary" className="h-5 px-2 text-xs">
            {categoryWidgets.length}
          </Badge>
        </div>

        {/* Double-click hint */}
        <span className="text-[10px] text-muted-foreground/60 absolute bottom-1 right-2">
          doble clic
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
                const WidgetIcon = option.icon;
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
                    <p className="text-xs font-medium leading-tight">{option.label}</p>
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
}

function SortableCategoryFolder({ category, widgetOptions, selectedTypes, onToggleWidget }: SortableCategoryFolderProps) {
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
      />
    </div>
  );
}

export function AddWidgetModal() {
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
      option.label.toLowerCase().includes(query) ||
      option.description.toLowerCase().includes(query) ||
      option.type.toLowerCase().includes(query)
    );
  }, [deferredSearchQuery]);

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
        return prev.filter((t) => t !== type);
      } else {
        return [...prev, type];
      }
    });

    // If only one widget is selected, update form values
    const newSelection = selectedTypes.includes(type)
      ? selectedTypes.filter((t) => t !== type)
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

  const onSubmit = async (values: FormValues) => {
    if (selectedTypes.length === 0) {
      toast.error("Selecciona al menos un widget");
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
          ? "Widget añadido al panel"
          : `${selectedTypes.length} widgets añadidos al panel`
      );
      handleClose();
    } catch (error) {
      console.error("Error creating widgets:", error);
      toast.error("Error al crear los widgets");
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
            Añadir widgets
            {selectedTypes.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {selectedTypes.length} seleccionado{selectedTypes.length > 1 ? "s" : ""}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Selecciona uno o varios widgets para añadir a tu panel
          </DialogDescription>
          {/* Search input */}
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 mt-1 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar widgets..."
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
                ? "Deseleccionar todos"
                : "Seleccionar todos"}
            </Button>
            {selectedTypes.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearSelection}
                className="h-7 text-xs text-muted-foreground"
              >
                Limpiar
              </Button>
            )}
            {deferredSearchQuery && filteredWidgetOptions.length > 0 && (
              <span className="text-xs text-muted-foreground ml-auto">
                {filteredWidgetOptions.length} resultado{filteredWidgetOptions.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2 scrollbar-thin">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Widget Type Selection - Multi-select */}
            <FormItem>
              <FormLabel>Tipo de widget</FormLabel>
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
                      No se encontraron widgets
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No hay widgets que coincidan con &quot;{deferredSearchQuery}&quot;
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery("")}
                      className="mt-3"
                    >
                      Limpiar búsqueda
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
                      <span>Resultados para &quot;{deferredSearchQuery}&quot;</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {filteredWidgetOptions.map((option) => {
                        const Icon = option.icon;
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
                                {option.label}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {option.description}
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
                      <span>Arrastra para reordenar. Doble clic para abrir.</span>
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
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </motion.div>
                )}
              </AnimatePresence>
            </FormItem>

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
                        <FormLabel>Título del widget</FormLabel>
                        <FormControl>
                          <Input placeholder="Mi Widget" {...field} />
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
                        <FormLabel>Tamaño</FormLabel>
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
                                {size.label}
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
                      Vista previa del tamaño
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
                          Ancho: {currentSizePreset.w} columna
                          {currentSizePreset.w > 1 ? "s" : ""}
                        </p>
                        <p>
                          Alto: {currentSizePreset.h} fila
                          {currentSizePreset.h > 1 ? "s" : ""}
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
                          <FormLabel>Categoría</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una categoría" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  No hay categorías disponibles
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
                          <FormLabel>Filtrar por etiqueta</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona una etiqueta" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tags.length === 0 ? (
                                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                                  No hay etiquetas disponibles
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
                      <FormLabel>Etiquetas del widget (opcional)</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Asigna etiquetas para organizar tus widgets
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
                          {selectedTags.length} etiqueta{selectedTags.length > 1 ? "s" : ""} seleccionada{selectedTags.length > 1 ? "s" : ""}
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
                        {selectedTypes.length} widgets seleccionados
                      </p>
                      <p className="text-muted-foreground mt-1">
                        Se crearán con sus configuraciones predeterminadas.
                        Podrás personalizarlos después desde el menú de cada widget.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || selectedTypes.length === 0}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {selectedTypes.length === 0
                  ? "Selecciona widgets"
                  : selectedTypes.length === 1
                  ? "Crear widget"
                  : `Crear ${selectedTypes.length} widgets`}
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
