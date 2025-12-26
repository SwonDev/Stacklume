"use client";

import { useState, useCallback, useMemo, useEffect, useRef, memo } from "react";
import {
  Palette,
  Copy,
  Check,
  Moon,
  Sun,
  Shuffle,
  RotateCcw,
  Terminal,
  Settings2,
  Eye,
  Bell,
  User,
  Mail,
  Star,
  BarChart3,
  Users,
  ArrowUpRight,
  Plus,
  Settings,
  CheckCircle2,
  XCircle,
  Info,
  Layers,
  Paintbrush,
  Code2,
  FolderTree,
  Server,
  PieChart,
  Sparkles,
  Search,
  Download,
  Heart,
  Bookmark,
  Share2,
  ChevronDown,
  X,
  Braces,
  Pipette,
  Play,
  Pause,
  SkipForward,
  Image,
  MessageSquare,
  Keyboard,
  MousePointer,
  Wand2,
  TrendingUp,
  Headphones,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";

interface ShadcnBuilderWidgetProps {
  widget: Widget;
}

// Style presets
const STYLE_PRESETS = [
  { id: "default", name: "Default" },
  { id: "new-york", name: "New York" },
];

// Preset themes
const PRESET_THEMES = [
  { id: "default", name: "Default", baseColor: "zinc", theme: "blue", radius: "0.5" },
  { id: "rose", name: "Rose", baseColor: "stone", theme: "rose", radius: "0.5" },
  { id: "orange", name: "Orange", baseColor: "stone", theme: "orange", radius: "0.5" },
  { id: "green", name: "Green", baseColor: "zinc", theme: "green", radius: "0.5" },
  { id: "violet", name: "Violet", baseColor: "gray", theme: "violet", radius: "0.75" },
  { id: "yellow", name: "Yellow", baseColor: "neutral", theme: "yellow", radius: "0.5" },
  { id: "red", name: "Red", baseColor: "slate", theme: "red", radius: "0.5" },
  { id: "blue", name: "Blue", baseColor: "slate", theme: "blue", radius: "0.625" },
];

// Base colors
const BASE_COLORS = [
  { id: "neutral", name: "Neutral", color: "#737373" },
  { id: "stone", name: "Stone", color: "#78716c" },
  { id: "zinc", name: "Zinc", color: "#71717a" },
  { id: "slate", name: "Slate", color: "#64748b" },
  { id: "gray", name: "Gray", color: "#6b7280" },
];

// All accent colors
const THEME_COLORS = [
  { id: "neutral", name: "Neutral", color: "#737373" },
  { id: "red", name: "Red", color: "#ef4444" },
  { id: "orange", name: "Orange", color: "#f97316" },
  { id: "amber", name: "Amber", color: "#f59e0b" },
  { id: "yellow", name: "Yellow", color: "#eab308" },
  { id: "lime", name: "Lime", color: "#84cc16" },
  { id: "green", name: "Green", color: "#22c55e" },
  { id: "emerald", name: "Emerald", color: "#10b981" },
  { id: "teal", name: "Teal", color: "#14b8a6" },
  { id: "cyan", name: "Cyan", color: "#06b6d4" },
  { id: "sky", name: "Sky", color: "#0ea5e9" },
  { id: "blue", name: "Blue", color: "#3b82f6" },
  { id: "indigo", name: "Indigo", color: "#6366f1" },
  { id: "violet", name: "Violet", color: "#8b5cf6" },
  { id: "purple", name: "Purple", color: "#a855f7" },
  { id: "fuchsia", name: "Fuchsia", color: "#d946ef" },
  { id: "pink", name: "Pink", color: "#ec4899" },
  { id: "rose", name: "Rose", color: "#f43f5e" },
];

// Tailwind palettes
const TAILWIND_PALETTES: Record<string, Record<string, string>> = {
  slate: { "50": "#f8fafc", "100": "#f1f5f9", "200": "#e2e8f0", "300": "#cbd5e1", "400": "#94a3b8", "500": "#64748b", "600": "#475569", "700": "#334155", "800": "#1e293b", "900": "#0f172a", "950": "#020617" },
  gray: { "50": "#f9fafb", "100": "#f3f4f6", "200": "#e5e7eb", "300": "#d1d5db", "400": "#9ca3af", "500": "#6b7280", "600": "#4b5563", "700": "#374151", "800": "#1f2937", "900": "#111827", "950": "#030712" },
  zinc: { "50": "#fafafa", "100": "#f4f4f5", "200": "#e4e4e7", "300": "#d4d4d8", "400": "#a1a1aa", "500": "#71717a", "600": "#52525b", "700": "#3f3f46", "800": "#27272a", "900": "#18181b", "950": "#09090b" },
  neutral: { "50": "#fafafa", "100": "#f5f5f5", "200": "#e5e5e5", "300": "#d4d4d4", "400": "#a3a3a3", "500": "#737373", "600": "#525252", "700": "#404040", "800": "#262626", "900": "#171717", "950": "#0a0a0a" },
  stone: { "50": "#fafaf9", "100": "#f5f5f4", "200": "#e7e5e4", "300": "#d6d3d1", "400": "#a8a29e", "500": "#78716c", "600": "#57534e", "700": "#44403c", "800": "#292524", "900": "#1c1917", "950": "#0c0a09" },
  blue: { "50": "#eff6ff", "100": "#dbeafe", "200": "#bfdbfe", "300": "#93c5fd", "400": "#60a5fa", "500": "#3b82f6", "600": "#2563eb", "700": "#1d4ed8", "800": "#1e40af", "900": "#1e3a8a", "950": "#172554" },
  violet: { "50": "#f5f3ff", "100": "#ede9fe", "200": "#ddd6fe", "300": "#c4b5fd", "400": "#a78bfa", "500": "#8b5cf6", "600": "#7c3aed", "700": "#6d28d9", "800": "#5b21b6", "900": "#4c1d95", "950": "#2e1065" },
  rose: { "50": "#fff1f2", "100": "#ffe4e6", "200": "#fecdd3", "300": "#fda4af", "400": "#fb7185", "500": "#f43f5e", "600": "#e11d48", "700": "#be123c", "800": "#9f1239", "900": "#881337", "950": "#4c0519" },
};

// Chart colors
const CHART_COLOR_PRESETS = [
  { id: "default", name: "Default", colors: ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"] },
  { id: "vibrant", name: "Vibrant", colors: ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7"] },
  { id: "pastel", name: "Pastel", colors: ["#a8d8ea", "#aa96da", "#fcbad3", "#ffffd2", "#a8e6cf"] },
  { id: "monochrome", name: "Mono", colors: ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"] },
  { id: "ocean", name: "Ocean", colors: ["#0077b6", "#00b4d8", "#90e0ef", "#caf0f8", "#03045e"] },
  { id: "forest", name: "Forest", colors: ["#2d6a4f", "#40916c", "#52b788", "#74c69d", "#95d5b2"] },
];

// Radius options
const RADIUS_OPTIONS = [
  { id: "0", name: "0", value: "0" },
  { id: "0.25", name: "0.25", value: "0.25rem" },
  { id: "0.5", name: "0.5", value: "0.5rem" },
  { id: "0.625", name: "0.625", value: "0.625rem" },
  { id: "0.75", name: "0.75", value: "0.75rem" },
  { id: "1", name: "1.0", value: "1rem" },
];

// Fonts
const FONTS = [
  { id: "inter", name: "Inter" },
  { id: "system", name: "System" },
  { id: "geist", name: "Geist" },
  { id: "geist-mono", name: "Geist Mono" },
  { id: "roboto", name: "Roboto" },
  { id: "poppins", name: "Poppins" },
  { id: "dm-sans", name: "DM Sans" },
];

// Frameworks
const FRAMEWORKS = [
  { id: "nextjs", name: "Next.js", icon: "▲" },
  { id: "vite", name: "Vite", icon: "⚡" },
  { id: "laravel", name: "Laravel", icon: "◆" },
  { id: "react-router", name: "React Router", icon: "↻" },
  { id: "astro", name: "Astro", icon: "🚀" },
  { id: "remix", name: "Remix", icon: "®" },
  { id: "gatsby", name: "Gatsby", icon: "G" },
  { id: "manual", name: "Manual", icon: "⚙" },
];

const PACKAGE_MANAGERS = ["pnpm", "npm", "yarn", "bun"];
const COLOR_FORMATS = ["hex", "rgb", "hsl", "oklch"] as const;
type ColorFormat = typeof COLOR_FORMATS[number];

interface ProjectConfig {
  style: string;
  baseColor: string;
  theme: string;
  iconLibrary: string;
  radius: string;
  isDark: boolean;
  framework: string;
  packageManager: string;
  font: string;
  cssVariables: boolean;
  typescript: boolean;
  rsc: boolean;
  srcDir: boolean;
  tailwindPrefix: string;
  chartColors: string[];
  sidebarColor: string;
  colorFormat: ColorFormat;
}

// Color utilities
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function formatColor(hex: string, format: ColorFormat): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  switch (format) {
    case "hex": return hex;
    case "rgb": return `${rgb.r} ${rgb.g} ${rgb.b}`;
    case "hsl": const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b); return `${hsl.h} ${hsl.s}% ${hsl.l}%`;
    case "oklch": const hsl2 = rgbToHsl(rgb.r, rgb.g, rgb.b); return `${(hsl2.l / 100).toFixed(2)} ${(hsl2.s / 100 * 0.4).toFixed(2)} ${hsl2.h}`;
    default: return hex;
  }
}

// Memoized Preview Components to prevent re-renders
interface PreviewProps {
  themeColor: string;
  radiusValue: string;
  isDark: boolean;
  chartColors: string[];
}

const InteractivePreview = memo(function InteractivePreview({ themeColor, radiusValue, isDark, chartColors }: PreviewProps) {
  const bgColor = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#ffffff";
  const textColor = isDark ? "#fafafa" : "#09090b";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";

  const [activeTab, setActiveTab] = useState("account");
  const [activeAccordion, setActiveAccordion] = useState<string | null>("item-1");

  return (
    <div className="space-y-2 p-2" style={{ backgroundColor: bgColor }}>
      {/* Interactive Buttons */}
      <div className="p-2 border transition-all duration-200" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Interactive Buttons</span>
        <div className="flex flex-wrap gap-1 mt-1.5">
          <button
            className="h-6 px-2 text-[7px] font-medium text-white transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
            style={{ backgroundColor: themeColor, borderRadius: radiusValue }}
          >
            Primary
          </button>
          <button
            className="h-6 px-2 text-[7px] font-medium transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
            style={{ backgroundColor: isDark ? "#27272a" : "#f4f4f5", color: textColor, borderRadius: radiusValue }}
          >
            Secondary
          </button>
          <button
            className="h-6 px-2 text-[7px] font-medium border transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
            style={{ borderColor, color: textColor, borderRadius: radiusValue, backgroundColor: "transparent" }}
          >
            Outline
          </button>
          <button
            className="h-6 px-2 text-[7px] font-medium transition-all duration-200 hover:scale-105 hover:-translate-y-0.5 active:scale-95"
            style={{ color: textColor, borderRadius: radiusValue, backgroundColor: "transparent" }}
          >
            Ghost
          </button>
          <button
            className="h-6 w-6 flex items-center justify-center text-white transition-all duration-200 hover:scale-110 hover:rotate-90 active:scale-95"
            style={{ backgroundColor: themeColor, borderRadius: radiusValue }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Interactive Cards */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: TrendingUp, label: "Revenue", value: "$45.2k", change: "+20.1%", color: chartColors[0] },
          { icon: Users, label: "Users", value: "2,350", change: "+180", color: chartColors[1] },
        ].map((card, i) => (
          <div
            key={i}
            className="p-2 border cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:-translate-y-1 hover:shadow-lg"
            style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px]" style={{ color: mutedColor }}>{card.label}</span>
              <card.icon className="h-3 w-3 transition-transform duration-300 hover:rotate-12" style={{ color: card.color }} />
            </div>
            <p className="text-sm font-bold mt-0.5" style={{ color: textColor }}>{card.value}</p>
            <div className="flex items-center gap-0.5 mt-0.5">
              <ArrowUpRight className="h-2.5 w-2.5 text-green-500" />
              <span className="text-[8px] text-green-500">{card.change}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Tabs */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Interactive Tabs</span>
        <div className="flex gap-0.5 mt-1.5 p-0.5 rounded" style={{ backgroundColor: isDark ? "#27272a" : "#f4f4f5", borderRadius: radiusValue }}>
          {["account", "password", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-1 text-[7px] capitalize transition-all duration-200"
              style={{
                color: activeTab === tab ? textColor : mutedColor,
                backgroundColor: activeTab === tab ? cardBg : "transparent",
                borderRadius: radiusValue,
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab}
            </button>
          ))}
        </div>
        <div
          className="mt-2 p-2 rounded text-[8px] transition-all duration-200"
          style={{ backgroundColor: isDark ? "#27272a" : "#f4f4f5", color: textColor, borderRadius: radiusValue }}
        >
          {activeTab === "account" && "Manage your account settings and preferences."}
          {activeTab === "password" && "Change your password and security options."}
          {activeTab === "settings" && "Configure your application settings."}
        </div>
      </div>

      {/* Progress Bar with CSS Animation */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Animated Progress</span>
          <span className="text-[8px] font-mono" style={{ color: themeColor }}>Loading...</span>
        </div>
        <div className="h-2 mt-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7", borderRadius: radiusValue }}>
          <div
            className="h-full animate-pulse"
            style={{
              backgroundColor: themeColor,
              borderRadius: radiusValue,
              width: "60%",
              animation: "progress 2s ease-in-out infinite",
            }}
          />
        </div>
        <style>{`
          @keyframes progress {
            0%, 100% { width: 20%; }
            50% { width: 80%; }
          }
        `}</style>
      </div>

      {/* Interactive Accordion */}
      <div className="border overflow-hidden" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        {[
          { id: "item-1", title: "Is it accessible?", content: "Yes. It adheres to the WAI-ARIA design pattern." },
          { id: "item-2", title: "Is it styled?", content: "Yes. It comes with default styles that matches your theme." },
          { id: "item-3", title: "Is it animated?", content: "Yes. It's animated by default with smooth transitions." },
        ].map((item) => (
          <div key={item.id} className="border-b last:border-b-0" style={{ borderColor }}>
            <button
              onClick={() => setActiveAccordion(activeAccordion === item.id ? null : item.id)}
              className="w-full flex items-center justify-between p-2 text-[8px] font-medium transition-colors duration-200 hover:bg-white/5"
              style={{ color: textColor }}
            >
              {item.title}
              <ChevronDown
                className="h-3 w-3 transition-transform duration-200"
                style={{ color: mutedColor, transform: activeAccordion === item.id ? "rotate(180deg)" : "rotate(0)" }}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-200"
              style={{
                maxHeight: activeAccordion === item.id ? "100px" : "0",
                opacity: activeAccordion === item.id ? 1 : 0,
              }}
            >
              <p className="px-2 pb-2 text-[7px]" style={{ color: mutedColor }}>{item.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

const ComponentsPreview = memo(function ComponentsPreview({ themeColor, radiusValue, isDark, chartColors }: PreviewProps) {
  const bgColor = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#ffffff";
  const textColor = isDark ? "#fafafa" : "#09090b";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";

  const [switchStates, setSwitchStates] = useState({ notifications: true, marketing: false, updates: true });
  const [sliderValue, setSliderValue] = useState([50]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; type: string; message: string }>>([]);

  const addToast = useCallback((type: string, message: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);

  return (
    <div className="space-y-2 p-2" style={{ backgroundColor: bgColor }}>
      {/* Dropdown Menu */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Dropdown Menu</span>
        <div className="relative mt-1.5">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between h-7 px-2 text-[8px] border transition-colors duration-200 hover:bg-white/5"
            style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue, color: textColor }}
          >
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3" style={{ color: mutedColor }} />
              My Account
            </span>
            <ChevronDown
              className="h-3 w-3 transition-transform duration-200"
              style={{ color: mutedColor, transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }}
            />
          </button>
          <div
            className="absolute top-full left-0 right-0 mt-1 p-1 border z-10 transition-all duration-200 origin-top"
            style={{
              backgroundColor: cardBg,
              borderColor,
              borderRadius: radiusValue,
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              opacity: dropdownOpen ? 1 : 0,
              transform: dropdownOpen ? "scaleY(1)" : "scaleY(0)",
              pointerEvents: dropdownOpen ? "auto" : "none",
            }}
          >
            {[
              { icon: User, label: "Profile", shortcut: "⌘P" },
              { icon: Settings, label: "Settings", shortcut: "⌘S" },
              { icon: Bell, label: "Notifications", shortcut: "⌘N" },
              { icon: Keyboard, label: "Shortcuts", shortcut: "⌘K" },
            ].map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[7px] rounded transition-colors duration-150 hover:bg-white/10"
                style={{ color: textColor, borderRadius: radiusValue }}
              >
                <span className="flex items-center gap-1.5">
                  <item.icon className="h-3 w-3" style={{ color: mutedColor }} />
                  {item.label}
                </span>
                <span className="text-[6px]" style={{ color: mutedColor }}>{item.shortcut}</span>
              </button>
            ))}
            <div className="my-1 h-px" style={{ backgroundColor: borderColor }} />
            <button
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[7px] rounded text-red-500 transition-colors duration-150 hover:bg-red-500/10"
              style={{ borderRadius: radiusValue }}
            >
              <X className="h-3 w-3" />
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Badges</span>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {[
            { label: "New", color: themeColor },
            { label: "Featured", color: chartColors[1] },
            { label: "Pro", color: chartColors[2] },
            { label: "Beta", color: chartColors[3] },
          ].map((badge) => (
            <span
              key={badge.label}
              className="px-1.5 py-0.5 text-[7px] font-medium text-white cursor-pointer transition-all duration-200 hover:scale-110 hover:-translate-y-0.5 active:scale-95"
              style={{ backgroundColor: badge.color, borderRadius: radiusValue }}
            >
              {badge.label}
            </span>
          ))}
          <span
            className="px-1.5 py-0.5 text-[7px] font-medium border cursor-pointer transition-all duration-200 hover:scale-110 hover:-translate-y-0.5"
            style={{ borderColor, color: textColor, borderRadius: radiusValue }}
          >
            Outline
          </span>
        </div>
      </div>

      {/* Switches */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Switches</span>
        <div className="space-y-2 mt-1.5">
          {Object.entries(switchStates).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-[8px] capitalize" style={{ color: textColor }}>{key}</span>
              <button
                onClick={() => setSwitchStates(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))}
                className="w-8 h-4 rounded-full relative transition-colors duration-200"
                style={{ backgroundColor: value ? themeColor : borderColor }}
              >
                <div
                  className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-200"
                  style={{ transform: value ? "translateX(16px)" : "translateX(2px)" }}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Slider */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <div className="flex justify-between items-center">
          <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Volume</span>
          <span className="text-[8px] font-mono" style={{ color: themeColor }}>{sliderValue[0]}%</span>
        </div>
        <div className="mt-2">
          <Slider value={sliderValue} onValueChange={setSliderValue} max={100} step={1} className="w-full" />
        </div>
      </div>

      {/* Skeleton Loading */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Skeleton Loading</span>
        <div className="flex items-center gap-2 mt-2">
          <div
            className="w-8 h-8 rounded-full animate-pulse"
            style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7" }}
          />
          <div className="flex-1 space-y-1.5">
            <div
              className="h-2 rounded animate-pulse"
              style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7", width: "60%", borderRadius: radiusValue }}
            />
            <div
              className="h-2 rounded animate-pulse"
              style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7", width: "80%", borderRadius: radiusValue }}
            />
          </div>
        </div>
      </div>

      {/* Avatar Group */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Avatar Group</span>
        <div className="flex items-center mt-2">
          <div className="flex -space-x-2">
            {["JD", "AS", "MK", "RW"].map((initials, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-medium text-white border-2 transition-transform duration-200 hover:scale-125 hover:z-10"
                style={{ backgroundColor: chartColors[i], borderColor: cardBg, zIndex: 4 - i }}
              >
                {initials}
              </div>
            ))}
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[7px] font-medium border-2 transition-transform duration-200 hover:scale-110"
              style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7", borderColor: cardBg, color: mutedColor }}
            >
              +5
            </div>
          </div>
        </div>
      </div>

      {/* Toast Buttons */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Toast Notifications</span>
        <div className="flex gap-1 mt-1.5">
          {[
            { type: "success", icon: CheckCircle2, color: "#22c55e", msg: "Changes saved!" },
            { type: "error", icon: XCircle, color: "#ef4444", msg: "Error occurred!" },
            { type: "info", icon: Info, color: "#3b82f6", msg: "New update available" },
          ].map((toast) => (
            <button
              key={toast.type}
              onClick={() => addToast(toast.type, toast.msg)}
              className="flex-1 h-6 flex items-center justify-center gap-1 text-[7px] font-medium text-white transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ backgroundColor: toast.color, borderRadius: radiusValue }}
            >
              <toast.icon className="h-3 w-3" />
            </button>
          ))}
        </div>
      </div>

      {/* Toast Container */}
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 p-2 border animate-in slide-in-from-top-2"
          style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
        >
          {toast.type === "success" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
          {toast.type === "error" && <XCircle className="h-3 w-3 text-red-500" />}
          {toast.type === "info" && <Info className="h-3 w-3 text-blue-500" />}
          <span className="text-[8px] flex-1" style={{ color: textColor }}>{toast.message}</span>
          <button
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            className="transition-transform duration-200 hover:scale-110"
          >
            <X className="h-3 w-3" style={{ color: mutedColor }} />
          </button>
        </div>
      ))}
    </div>
  );
});

const MediaPreview = memo(function MediaPreview({ themeColor, radiusValue, isDark, chartColors }: PreviewProps) {
  const bgColor = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#ffffff";
  const textColor = isDark ? "#fafafa" : "#09090b";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";

  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="space-y-2 p-2" style={{ backgroundColor: bgColor }}>
      {/* Music Player */}
      <div
        className="p-3 border overflow-hidden transition-shadow duration-200 hover:shadow-lg"
        style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}
      >
        <div className="flex gap-3">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${themeColor}, ${chartColors[1]})`,
              borderRadius: radiusValue,
              animation: isPlaying ? "spin 3s linear infinite" : "none",
            }}
          >
            <Headphones className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-[9px] font-semibold" style={{ color: textColor }}>Awesome Track</p>
            <p className="text-[8px]" style={{ color: mutedColor }}>Artist Name</p>
            <div className="flex items-center gap-2 mt-2">
              <button className="transition-transform duration-200 hover:scale-110">
                <SkipForward className="h-3 w-3 rotate-180" style={{ color: mutedColor }} />
              </button>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-transform duration-200 hover:scale-110 active:scale-95"
                style={{ backgroundColor: themeColor }}
              >
                {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3 ml-0.5" />}
              </button>
              <button className="transition-transform duration-200 hover:scale-110">
                <SkipForward className="h-3 w-3" style={{ color: mutedColor }} />
              </button>
            </div>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "#27272a" : "#e4e4e7" }}>
            <div
              className="h-full transition-all duration-300"
              style={{
                backgroundColor: themeColor,
                width: isPlaying ? "65%" : "35%",
              }}
            />
          </div>
          <div className="flex justify-between">
            <span className="text-[7px]" style={{ color: mutedColor }}>1:24</span>
            <span className="text-[7px]" style={{ color: mutedColor }}>3:45</span>
          </div>
        </div>
      </div>

      {/* Video Card */}
      <div
        className="border overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
        style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}
      >
        <div className="relative h-20" style={{ background: `linear-gradient(135deg, ${themeColor}44, ${chartColors[2]}44)` }}>
          <div className="absolute inset-0 flex items-center justify-center group">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
              <Play className="h-4 w-4 text-white ml-0.5" />
            </div>
          </div>
          <div className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[7px] text-white bg-black/70">12:34</div>
        </div>
        <div className="p-2">
          <p className="text-[9px] font-medium" style={{ color: textColor }}>Amazing Tutorial Video</p>
          <p className="text-[7px]" style={{ color: mutedColor }}>125K views • 2 days ago</p>
        </div>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-3 gap-1">
        {chartColors.slice(0, 3).map((color, i) => (
          <div
            key={i}
            className="aspect-square flex items-center justify-center transition-transform duration-200 hover:scale-105 cursor-pointer"
            style={{ backgroundColor: `${color}33`, borderRadius: radiusValue }}
          >
            <Image className="h-4 w-4" style={{ color }} />
          </div>
        ))}
      </div>

      {/* Tooltip Icons */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: mutedColor }}>Action Icons</span>
        <div className="flex gap-1.5 mt-1.5">
          {[
            { icon: Heart, label: "Like", color: "#ef4444" },
            { icon: Bookmark, label: "Save", color: themeColor },
            { icon: Share2, label: "Share", color: chartColors[1] },
            { icon: Download, label: "Download", color: chartColors[2] },
          ].map((item) => (
            <div key={item.label} className="relative group">
              <button
                className="w-7 h-7 flex items-center justify-center border transition-all duration-200 hover:scale-115 hover:-translate-y-0.5 group"
                style={{ borderColor, borderRadius: radiusValue, backgroundColor: cardBg }}
              >
                <item.icon className="h-3.5 w-3.5 transition-colors duration-200 group-hover:text-current" style={{ color: mutedColor }} />
              </button>
              <div
                className="absolute -top-7 left-1/2 -translate-x-1/2 px-1.5 py-0.5 text-[6px] text-white whitespace-nowrap z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                style={{ backgroundColor: isDark ? "#27272a" : "#18181b", borderRadius: radiusValue }}
              >
                {item.label}
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
                  style={{
                    borderLeft: "4px solid transparent",
                    borderRight: "4px solid transparent",
                    borderTop: `4px solid ${isDark ? "#27272a" : "#18181b"}`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const ChartsPreview = memo(function ChartsPreview({ themeColor, radiusValue, isDark, chartColors }: PreviewProps) {
  const bgColor = isDark ? "#09090b" : "#ffffff";
  const cardBg = isDark ? "#18181b" : "#ffffff";
  const textColor = isDark ? "#fafafa" : "#09090b";
  const mutedColor = isDark ? "#a1a1aa" : "#71717a";
  const borderColor = isDark ? "#27272a" : "#e4e4e7";

  return (
    <div className="space-y-2 p-2" style={{ backgroundColor: bgColor }}>
      {/* Bar Chart */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: textColor }}>Bar Chart</span>
        <div className="flex items-end gap-1 h-20 mt-2">
          {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 transition-all duration-300 hover:opacity-80 cursor-pointer"
              style={{
                backgroundColor: chartColors[i % 5],
                borderRadius: `${radiusValue} ${radiusValue} 0 0`,
                height: `${h}%`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Pie Chart */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: textColor }}>Pie Chart</span>
        <div className="flex items-center gap-3 mt-2">
          <svg viewBox="0 0 32 32" className="w-16 h-16" style={{ transform: "rotate(-90deg)" }}>
            <circle r="16" cx="16" cy="16" fill={chartColors[4]} />
            <circle r="8" cx="16" cy="16" fill="transparent" stroke={chartColors[0]} strokeWidth="16" strokeDasharray="20 50.26" strokeDashoffset="0" />
            <circle r="8" cx="16" cy="16" fill="transparent" stroke={chartColors[1]} strokeWidth="16" strokeDasharray="15 50.26" strokeDashoffset="-20" />
            <circle r="8" cx="16" cy="16" fill="transparent" stroke={chartColors[2]} strokeWidth="16" strokeDasharray="10 50.26" strokeDashoffset="-35" />
            <circle r="8" cx="16" cy="16" fill="transparent" stroke={chartColors[3]} strokeWidth="16" strokeDasharray="5.26 50.26" strokeDashoffset="-45" />
          </svg>
          <div className="flex-1 space-y-1">
            {["Desktop", "Mobile", "Tablet", "Other"].map((label, i) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: chartColors[i] }} />
                <span className="text-[7px]" style={{ color: mutedColor }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Line Chart */}
      <div className="p-2 border" style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}>
        <span className="text-[8px] font-medium" style={{ color: textColor }}>Line Chart</span>
        <svg viewBox="0 0 100 50" className="w-full h-16 mt-2">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path fill="url(#lineGrad)" d="M0,50 L0,40 L15,35 L30,38 L45,20 L60,25 L75,15 L90,22 L100,10 L100,50 Z" />
          <polyline fill="none" stroke={themeColor} strokeWidth="2" strokeLinecap="round" points="0,40 15,35 30,38 45,20 60,25 75,15 90,22 100,10" />
          {[{ x: 45, y: 20 }, { x: 75, y: 15 }, { x: 100, y: 10 }].map((point, i) => (
            <circle key={i} cx={point.x} cy={point.y} r="3" fill={themeColor} />
          ))}
        </svg>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {[
          { icon: BarChart3, label: "Analytics", value: "12.5k", color: chartColors[0] },
          { icon: PieChart, label: "Reports", value: "3,240", color: chartColors[1] },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-2 border transition-all duration-200 hover:scale-[1.02] cursor-pointer"
            style={{ backgroundColor: cardBg, borderColor, borderRadius: radiusValue }}
          >
            <div className="flex items-center gap-1.5">
              <stat.icon className="h-3 w-3" style={{ color: stat.color }} />
              <span className="text-[7px]" style={{ color: mutedColor }}>{stat.label}</span>
            </div>
            <p className="text-sm font-bold mt-0.5" style={{ color: textColor }}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

export function ShadcnBuilderWidget({ widget }: ShadcnBuilderWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const [copied, setCopied] = useState(false);
  const [copiedCSS, setCopiedCSS] = useState(false);
  const [copiedJSON, setCopiedJSON] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [cssDialogOpen, setCssDialogOpen] = useState(false);
  const [jsonDialogOpen, setJsonDialogOpen] = useState(false);
  const [colorsDialogOpen, setColorsDialogOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState("interactive");
  const [configTab, setConfigTab] = useState("theme");
  const [selectedPalette, setSelectedPalette] = useState("blue");

  // Initialize config
  const initialConfig = (widget.config || {}) as Partial<ProjectConfig>;
  const [config, setConfig] = useState<ProjectConfig>(() => ({
    style: initialConfig.style ?? "default",
    baseColor: initialConfig.baseColor ?? "zinc",
    theme: initialConfig.theme ?? "blue",
    iconLibrary: initialConfig.iconLibrary ?? "lucide",
    radius: initialConfig.radius ?? "0.5",
    isDark: initialConfig.isDark ?? true,
    framework: initialConfig.framework ?? "nextjs",
    packageManager: initialConfig.packageManager ?? "pnpm",
    font: initialConfig.font ?? "inter",
    cssVariables: initialConfig.cssVariables ?? true,
    typescript: initialConfig.typescript ?? true,
    rsc: initialConfig.rsc ?? true,
    srcDir: initialConfig.srcDir ?? true,
    tailwindPrefix: initialConfig.tailwindPrefix ?? "",
    chartColors: initialConfig.chartColors ?? CHART_COLOR_PRESETS[0].colors,
    sidebarColor: initialConfig.sidebarColor ?? "zinc",
    colorFormat: (initialConfig.colorFormat as ColorFormat) ?? "hsl",
  }));

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    updateWidget(widget.id, { config: { ...config } });
  }, [config, updateWidget, widget.id]);

  const updateConfig = useCallback(<K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const applyPresetTheme = useCallback((presetId: string) => {
    const preset = PRESET_THEMES.find(p => p.id === presetId);
    if (preset) setConfig(prev => ({ ...prev, baseColor: preset.baseColor, theme: preset.theme, radius: preset.radius }));
  }, []);

  const randomize = useCallback(() => {
    const randomChartPreset = CHART_COLOR_PRESETS[Math.floor(Math.random() * CHART_COLOR_PRESETS.length)];
    setConfig(prev => ({
      ...prev,
      style: STYLE_PRESETS[Math.floor(Math.random() * STYLE_PRESETS.length)].id,
      baseColor: BASE_COLORS[Math.floor(Math.random() * BASE_COLORS.length)].id,
      theme: THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)].id,
      radius: RADIUS_OPTIONS[Math.floor(Math.random() * RADIUS_OPTIONS.length)].id,
      isDark: Math.random() > 0.5,
      font: FONTS[Math.floor(Math.random() * FONTS.length)].id,
      chartColors: randomChartPreset.colors,
    }));
  }, []);

  const resetConfig = useCallback(() => {
    setConfig({
      style: "default", baseColor: "zinc", theme: "blue", iconLibrary: "lucide", radius: "0.5", isDark: true,
      framework: "nextjs", packageManager: "pnpm", font: "inter", cssVariables: true, typescript: true,
      rsc: true, srcDir: true, tailwindPrefix: "", chartColors: CHART_COLOR_PRESETS[0].colors,
      sidebarColor: "zinc", colorFormat: "hsl",
    });
  }, []);

  // Theme values
  const themeColor = THEME_COLORS.find(c => c.id === config.theme)?.color || "#3b82f6";
  const radiusValue = RADIUS_OPTIONS.find(r => r.id === config.radius)?.value || "0.5rem";

  // CLI command
  const generateCliCommand = useMemo(() => {
    const pm = config.packageManager;
    const dlx = pm === "npm" ? "npx" : pm === "yarn" ? "yarn dlx" : pm === "bun" ? "bunx" : "pnpm dlx";
    let cmd = `${dlx} shadcn@latest init`;
    if (config.baseColor !== "zinc") cmd += ` --base-color ${config.baseColor}`;
    if (config.style !== "default") cmd += ` --style ${config.style}`;
    if (config.cssVariables) cmd += ` --css-variables`;
    if (!config.typescript) cmd += ` --no-tsx`;
    if (!config.srcDir) cmd += ` --no-src-dir`;
    if (config.tailwindPrefix) cmd += ` --tailwind-prefix ${config.tailwindPrefix}`;
    return cmd;
  }, [config]);

  // components.json
  const generateComponentsJson = useMemo(() => {
    return JSON.stringify({
      "$schema": "https://ui.shadcn.com/schema.json",
      style: config.style, rsc: config.rsc, tsx: config.typescript,
      tailwind: { config: "tailwind.config.ts", css: config.srcDir ? "src/app/globals.css" : "app/globals.css", baseColor: config.baseColor, cssVariables: config.cssVariables, prefix: config.tailwindPrefix || "" },
      aliases: { components: "@/components", utils: "@/lib/utils", ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" },
      iconLibrary: config.iconLibrary
    }, null, 2);
  }, [config]);

  // CSS Variables
  const generateCSSVariables = useMemo(() => {
    const isDark = config.isDark;
    const primary = themeColor;
    const radius = radiusValue;
    const fmt = config.colorFormat;
    return `@layer base {
  :root {
    --background: ${isDark ? "240 10% 3.9%" : "0 0% 100%"};
    --foreground: ${isDark ? "0 0% 98%" : "240 10% 3.9%"};
    --card: ${isDark ? "240 10% 3.9%" : "0 0% 100%"};
    --card-foreground: ${isDark ? "0 0% 98%" : "240 10% 3.9%"};
    --popover: ${isDark ? "240 10% 3.9%" : "0 0% 100%"};
    --popover-foreground: ${isDark ? "0 0% 98%" : "240 10% 3.9%"};
    --primary: ${formatColor(primary, fmt)};
    --primary-foreground: 0 0% 98%;
    --secondary: ${isDark ? "240 3.7% 15.9%" : "240 4.8% 95.9%"};
    --secondary-foreground: ${isDark ? "0 0% 98%" : "240 5.9% 10%"};
    --muted: ${isDark ? "240 3.7% 15.9%" : "240 4.8% 95.9%"};
    --muted-foreground: ${isDark ? "240 5% 64.9%" : "240 3.8% 46.1%"};
    --accent: ${isDark ? "240 3.7% 15.9%" : "240 4.8% 95.9%"};
    --accent-foreground: ${isDark ? "0 0% 98%" : "240 5.9% 10%"};
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: ${isDark ? "240 3.7% 15.9%" : "240 5.9% 90%"};
    --input: ${isDark ? "240 3.7% 15.9%" : "240 5.9% 90%"};
    --ring: ${formatColor(primary, fmt)};
    --radius: ${radius};
    --chart-1: ${formatColor(config.chartColors[0], fmt)};
    --chart-2: ${formatColor(config.chartColors[1], fmt)};
    --chart-3: ${formatColor(config.chartColors[2], fmt)};
    --chart-4: ${formatColor(config.chartColors[3], fmt)};
    --chart-5: ${formatColor(config.chartColors[4], fmt)};
    --sidebar-background: ${isDark ? "240 5.9% 10%" : "0 0% 98%"};
    --sidebar-foreground: ${isDark ? "240 4.8% 95.9%" : "240 5.3% 26.1%"};
    --sidebar-primary: ${formatColor(primary, fmt)};
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: ${isDark ? "240 3.7% 15.9%" : "240 4.8% 95.9%"};
    --sidebar-accent-foreground: ${isDark ? "240 4.8% 95.9%" : "240 5.9% 10%"};
    --sidebar-border: ${isDark ? "240 3.7% 15.9%" : "220 13% 91%"};
    --sidebar-ring: ${formatColor(primary, fmt)};
  }
}`;
  }, [config.isDark, themeColor, radiusValue, config.chartColors, config.colorFormat]);

  const copyToClipboard = useCallback(async (text: string, type: 'cmd' | 'css' | 'json' = 'cmd') => {
    await navigator.clipboard.writeText(text);
    if (type === 'css') { setCopiedCSS(true); setTimeout(() => setCopiedCSS(false), 2000); }
    else if (type === 'json') { setCopiedJSON(true); setTimeout(() => setCopiedJSON(false), 2000); }
    else { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  }, []);

  // Preview props
  const previewProps: PreviewProps = {
    themeColor,
    radiusValue,
    isDark: config.isDark,
    chartColors: config.chartColors,
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5 border-b shrink-0">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10">
              <Palette className="h-3 w-3 text-primary" />
            </div>
            <span className="text-[10px] font-medium">shadcn/ui Builder</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Dialog open={colorsDialogOpen} onOpenChange={setColorsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Pipette className="h-3 w-3" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="text-base">Tailwind Colors</DialogTitle>
                  <DialogDescription className="text-xs">Color palettes with 11 shades each</DialogDescription>
                </DialogHeader>
                <div className="flex gap-2 flex-wrap mb-2">
                  {Object.keys(TAILWIND_PALETTES).map((name) => (
                    <button
                      key={name}
                      onClick={() => setSelectedPalette(name)}
                      className={cn("px-2 py-1 text-[10px] rounded border transition-colors", selectedPalette === name ? "bg-foreground text-background" : "hover:bg-muted")}
                    >
                      {name}
                    </button>
                  ))}
                </div>
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-11 gap-1">
                    {Object.entries(TAILWIND_PALETTES[selectedPalette] || {}).map(([shade, color]) => (
                      <button
                        key={shade}
                        onClick={() => copyToClipboard(color, 'cmd')}
                        className="group relative"
                      >
                        <div className="w-full aspect-square rounded" style={{ backgroundColor: color }} />
                        <span className="text-[8px] block mt-0.5 text-center">{shade}</span>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Dialog open={cssDialogOpen} onOpenChange={setCssDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Paintbrush className="h-3 w-3" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base">CSS Variables</DialogTitle>
                  <DialogDescription className="text-xs">Format: {config.colorFormat.toUpperCase()}</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-64 w-full rounded border bg-muted/50 p-3">
                  <pre className="text-[9px] font-mono whitespace-pre-wrap">{generateCSSVariables}</pre>
                </ScrollArea>
                <Button onClick={() => copyToClipboard(generateCSSVariables, 'css')}>
                  {copiedCSS ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy CSS</>}
                </Button>
              </DialogContent>
            </Dialog>
            <Dialog open={jsonDialogOpen} onOpenChange={setJsonDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0"><Braces className="h-3 w-3" /></Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base">components.json</DialogTitle>
                  <DialogDescription className="text-xs">Your shadcn/ui configuration</DialogDescription>
                </DialogHeader>
                <ScrollArea className="h-64 w-full rounded border bg-muted/50 p-3">
                  <pre className="text-[9px] font-mono whitespace-pre-wrap">{generateComponentsJson}</pre>
                </ScrollArea>
                <Button onClick={() => copyToClipboard(generateComponentsJson, 'json')}>
                  {copiedJSON ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy JSON</>}
                </Button>
              </DialogContent>
            </Dialog>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-6 text-[9px] px-2 gap-1" style={{ backgroundColor: themeColor }}><Terminal className="h-2.5 w-2.5" /> Create</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-base">Create Project</DialogTitle>
                  <DialogDescription className="text-xs">Choose framework and options</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-2">
                    {FRAMEWORKS.map((fw) => (
                      <button
                        key={fw.id}
                        onClick={() => updateConfig("framework", fw.id)}
                        className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors", config.framework === fw.id ? "border-foreground bg-muted" : "border-muted hover:border-muted-foreground/50")}
                      >
                        <span className="text-lg">{fw.icon}</span>
                        <span className="text-[9px] font-medium">{fw.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1 p-1 bg-muted rounded-lg">
                    {PACKAGE_MANAGERS.map((pm) => (
                      <Button key={pm} size="sm" variant={config.packageManager === pm ? "default" : "ghost"} onClick={() => updateConfig("packageManager", pm)} className="flex-1 text-xs">{pm}</Button>
                    ))}
                  </div>
                  <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">{generateCliCommand}</div>
                  <Button onClick={() => copyToClipboard(generateCliCommand)} style={{ backgroundColor: themeColor }}>
                    {copied ? <><Check className="h-4 w-4 mr-2" /> Copied!</> : <><Copy className="h-4 w-4 mr-2" /> Copy Command</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="preview" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2 h-7 mx-2 mt-1.5 shrink-0" style={{ width: 'calc(100% - 1rem)' }}>
            <TabsTrigger value="preview" className="text-[9px] gap-1"><Eye className="h-3 w-3" /> Preview</TabsTrigger>
            <TabsTrigger value="config" className="text-[9px] gap-1"><Settings2 className="h-3 w-3" /> Config</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="flex-1 overflow-hidden mt-1.5 m-0">
            <div className="flex gap-0.5 px-2 mb-1.5 overflow-x-auto">
              {[
                { id: "interactive", label: "Interactive", icon: MousePointer },
                { id: "components", label: "Components", icon: Layers },
                { id: "media", label: "Media", icon: Play },
                { id: "charts", label: "Charts", icon: BarChart3 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPreviewTab(tab.id)}
                  className={cn("flex items-center gap-1 px-1.5 py-1 text-[7px] rounded transition-colors whitespace-nowrap", previewTab === tab.id ? "text-white" : "hover:bg-muted text-muted-foreground")}
                  style={previewTab === tab.id ? { backgroundColor: themeColor } : {}}
                >
                  <tab.icon className="h-2.5 w-2.5" />{tab.label}
                </button>
              ))}
            </div>
            <ScrollArea className="h-full">
              {previewTab === "interactive" && <InteractivePreview {...previewProps} />}
              {previewTab === "components" && <ComponentsPreview {...previewProps} />}
              {previewTab === "media" && <MediaPreview {...previewProps} />}
              {previewTab === "charts" && <ChartsPreview {...previewProps} />}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="config" className="flex-1 overflow-hidden mt-1.5 m-0">
            <div className="flex gap-0.5 px-2 mb-1.5 overflow-x-auto">
              {[
                { id: "theme", label: "Theme", icon: Palette },
                { id: "options", label: "Options", icon: Settings2 },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setConfigTab(tab.id)}
                  className={cn("flex items-center gap-1 px-2 py-1 text-[8px] rounded transition-colors whitespace-nowrap", configTab === tab.id ? "text-white" : "hover:bg-muted text-muted-foreground")}
                  style={configTab === tab.id ? { backgroundColor: themeColor } : {}}
                >
                  <tab.icon className="h-2.5 w-2.5" />{tab.label}
                </button>
              ))}
            </div>
            <ScrollArea className="h-full">
              <div className="p-2">
                {configTab === "theme" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[9px] flex items-center gap-1"><Sparkles className="h-3 w-3" /> Presets</Label>
                      <div className="grid grid-cols-4 gap-1">
                        {PRESET_THEMES.map((preset) => {
                          const presetColor = THEME_COLORS.find(c => c.id === preset.theme)?.color || "#3b82f6";
                          return (
                            <button
                              key={preset.id}
                              onClick={() => applyPresetTheme(preset.id)}
                              className="p-1 border rounded text-[7px] hover:bg-muted transition-colors"
                            >
                              <div className="w-full h-2.5 rounded mb-0.5" style={{ backgroundColor: presetColor }} />
                              {preset.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px]">Style</Label>
                      <Select value={config.style} onValueChange={(v) => updateConfig("style", v)}>
                        <SelectTrigger className="h-7 text-[9px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STYLE_PRESETS.map((s) => <SelectItem key={s.id} value={s.id} className="text-xs">{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px]">Base Color</Label>
                      <div className="flex gap-1.5 flex-wrap">
                        {BASE_COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => updateConfig("baseColor", color.id)}
                            className={cn("w-5 h-5 rounded-full transition-all hover:scale-110", config.baseColor === color.id && "ring-2 ring-offset-1 ring-foreground")}
                            style={{ backgroundColor: color.color }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px]">Accent Color</Label>
                      <div className="flex flex-wrap gap-1">
                        {THEME_COLORS.map((color) => (
                          <button
                            key={color.id}
                            onClick={() => updateConfig("theme", color.id)}
                            className={cn("w-4 h-4 rounded-full transition-all hover:scale-125", config.theme === color.id && "ring-2 ring-offset-1 ring-foreground")}
                            style={{ backgroundColor: color.color }}
                            title={color.name}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[9px]">Mode</Label>
                        <div className="flex gap-0.5">
                          <Button size="sm" variant={!config.isDark ? "default" : "outline"} onClick={() => updateConfig("isDark", false)} className="flex-1 h-6 text-[8px]"><Sun className="h-2.5 w-2.5" /></Button>
                          <Button size="sm" variant={config.isDark ? "default" : "outline"} onClick={() => updateConfig("isDark", true)} className="flex-1 h-6 text-[8px]"><Moon className="h-2.5 w-2.5" /></Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px]">Radius</Label>
                        <Select value={config.radius} onValueChange={(v) => updateConfig("radius", v)}>
                          <SelectTrigger className="h-6 text-[8px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {RADIUS_OPTIONS.map((r) => <SelectItem key={r.id} value={r.id} className="text-xs">{r.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] flex items-center gap-1"><PieChart className="h-3 w-3" /> Chart Colors</Label>
                      <div className="space-y-1">
                        {CHART_COLOR_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            onClick={() => updateConfig("chartColors", preset.colors)}
                            className={cn("w-full flex items-center gap-1.5 p-1 border rounded transition-colors", JSON.stringify(config.chartColors) === JSON.stringify(preset.colors) ? "border-foreground bg-muted" : "hover:bg-muted border-border")}
                          >
                            <div className="flex gap-0.5">
                              {preset.colors.map((color, i) => <div key={i} className="w-3 h-3 rounded" style={{ backgroundColor: color }} />)}
                            </div>
                            <span className="text-[7px]">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                {configTab === "options" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[9px]">Font</Label>
                        <Select value={config.font} onValueChange={(v) => updateConfig("font", v)}>
                          <SelectTrigger className="h-6 text-[8px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONTS.map((f) => <SelectItem key={f.id} value={f.id} className="text-xs">{f.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px]">Color Format</Label>
                        <Select value={config.colorFormat} onValueChange={(v) => updateConfig("colorFormat", v as ColorFormat)}>
                          <SelectTrigger className="h-6 text-[8px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {COLOR_FORMATS.map((f) => <SelectItem key={f} value={f} className="text-xs uppercase">{f}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { key: "typescript" as const, label: "TypeScript", icon: Code2 },
                        { key: "rsc" as const, label: "RSC", icon: Server },
                        { key: "srcDir" as const, label: "src/", icon: FolderTree },
                        { key: "cssVariables" as const, label: "CSS Vars", icon: Paintbrush },
                      ].map((item) => (
                        <button
                          key={item.key}
                          onClick={() => updateConfig(item.key, !config[item.key])}
                          className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded border transition-colors text-[8px]", config[item.key] ? "border-foreground bg-muted" : "border-border hover:bg-muted")}
                        >
                          <div className={cn("w-3 h-3 rounded border flex items-center justify-center", config[item.key] ? "bg-foreground border-foreground" : "border-muted-foreground")}>
                            {config[item.key] && <Check className="h-2 w-2 text-background" />}
                          </div>
                          <item.icon className="h-3 w-3" />
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px]">Tailwind Prefix</Label>
                      <Input value={config.tailwindPrefix} onChange={(e) => updateConfig("tailwindPrefix", e.target.value)} placeholder="e.g., tw-" className="h-6 text-[9px]" />
                    </div>
                  </div>
                )}
                <div className="flex gap-1 pt-3">
                  <Button variant="outline" size="sm" onClick={randomize} className="flex-1 h-6 text-[9px]"><Shuffle className="h-3 w-3 mr-1" /> Random</Button>
                  <Button variant="ghost" size="sm" onClick={resetConfig} className="flex-1 h-6 text-[9px]"><RotateCcw className="h-3 w-3 mr-1" /> Reset</Button>
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
