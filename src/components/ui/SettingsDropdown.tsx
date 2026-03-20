"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  Palette, LayoutGrid, Columns3, Link, SlidersHorizontal, Save, Wrench,
  Database, ChevronLeft, ChevronRight, Settings, Check, Monitor, Globe,
  Image as ImageIcon, ExternalLink, Trash2, MessageSquare, Zap, Volume2, VolumeX,
  ArrowUpDown, Eye, EyeOff, Copy, RefreshCw, BookOpen, CheckCircle2,
  AlertCircle, Loader2, Cloud, HardDrive, Plug, ArrowUpCircle, HelpCircle,
  Activity, Download, Upload, List, Keyboard, Bot, Tags, Layers, Inbox,
} from "lucide-react";
import { isTauriWebView, getServerPort } from "@/lib/desktop";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { McpDocsDialog } from "@/components/ui/McpDocsDialog";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, type Theme, type ViewDensity, type SortField, type SortOrder, type ThumbnailSize, type LinkClickBehavior, type Language } from "@/stores/settings-store";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

// ─── Animación de paneles ───────────────────────────────────────────────────
const panelVariants = {
  enter: (dir: number) => ({ opacity: 0, y: dir > 0 ? 14 : -14 }),
  center: { opacity: 1, y: 0 },
  exit:  (dir: number) => ({ opacity: 0, y: dir > 0 ? -14 : 14 }),
};
const panelTransition = { duration: 0.18, ease: [0.4, 0, 0.2, 1] as const };

// ─── Datos de temas ─────────────────────────────────────────────────────────
const DARK_THEMES = [
  { id: "dark",       label: "Dark",        bg: "#1a1a2e", accent: "#e94560" },
  { id: "nordic",     label: "Nordic",      bg: "#2e3440", accent: "#88c0d0" },
  { id: "catppuccin", label: "Catppuccin",  bg: "#1e1e2e", accent: "#cba6f7" },
  { id: "tokyo",      label: "Tokyo Night", bg: "#1a1b26", accent: "#7aa2f7" },
  { id: "rosepine",   label: "Rosé Pine",   bg: "#191724", accent: "#ebbcba" },
  { id: "gruvbox",    label: "Gruvbox",     bg: "#282828", accent: "#fabd2f" },
  { id: "solardark",  label: "Solar Dark",  bg: "#002b36", accent: "#b58900" },
  { id: "vampire",    label: "Vampire",     bg: "#1a1a2e", accent: "#ff6b6b" },
  { id: "midnight",   label: "Midnight",    bg: "#0f0f1a", accent: "#6c63ff" },
  { id: "ocean",      label: "Ocean",       bg: "#0a192f", accent: "#64ffda" },
  { id: "forest",     label: "Forest",      bg: "#1a2f1a", accent: "#4caf50" },
  { id: "slate",      label: "Slate",       bg: "#1e293b", accent: "#38bdf8" },
  { id: "crimson",    label: "Crimson",     bg: "#1a1a1a", accent: "#dc2626" },
  { id: "aurora",     label: "Aurora",      bg: "#0f172a", accent: "#a78bfa" },
] as const;

const LIGHT_THEMES = [
  { id: "light",      label: "Light",       bg: "#f8fafc", accent: "#3b82f6" },
  { id: "solarized",  label: "Solarized",   bg: "#fdf6e3", accent: "#268bd2" },
  { id: "arctic",     label: "Arctic",      bg: "#f0f4f8", accent: "#5e81ac" },
  { id: "sakura",     label: "Sakura",      bg: "#fef2f8", accent: "#ec4899" },
  { id: "lavender",   label: "Lavanda",     bg: "#f5f4fc", accent: "#8b5cf6" },
  { id: "mint",       label: "Menta",       bg: "#f3faf4", accent: "#22c55e" },
] as const;

const GRAY_THEMES = [
  { id: "cement", label: "Cemento", bg: "#dcdee2", accent: "#6366f1" },
  { id: "stone",  label: "Piedra",  bg: "#dad5cc", accent: "#b08450" },
  { id: "steel",  label: "Acero",   bg: "#c4c9d0", accent: "#4a7fb5" },
] as const;

// ─── Categorías del panel principal ─────────────────────────────────────────
const CATEGORIES = [
  { id: "apariencia",  labelKey: "settings.appearance",  descKey: "settings.appearanceDesc",  icon: Palette,          color: "text-amber-500",  bg: "bg-amber-500/10"  },
  { id: "vista",       labelKey: "settings.view",        descKey: "settings.viewDesc",        icon: LayoutGrid,       color: "text-blue-500",   bg: "bg-blue-500/10"   },
  { id: "interfaz",    labelKey: "settings.interface",   descKey: "settings.interfaceDesc",   icon: Columns3,         color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "enlaces",     labelKey: "settings.links",       descKey: "settings.linksDesc",       icon: Link,             color: "text-pink-500",   bg: "bg-pink-500/10"   },
  { id: "preferencias",labelKey: "settings.preferences", descKey: "settings.preferencesDesc", icon: SlidersHorizontal,color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "backups",     labelKey: "settings.backups",     descKey: "settings.backupsDesc",     icon: Save,             color: "text-teal-500",   bg: "bg-teal-500/10"   },
  { id: "herramientas",labelKey: "settings.tools",       descKey: "settings.toolsDesc",       icon: Wrench,           color: "text-green-500",  bg: "bg-green-500/10"  },
  { id: "atajos",      labelKey: "settings.shortcuts",   descKey: "settings.shortcutsDesc",   icon: Keyboard,         color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { id: "ia-local",    labelKey: "settings.ollamaLocal",  descKey: "settings.ollamaLocalDesc", icon: Bot,              color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "mcp",         labelKey: "settings.mcp",         descKey: "settings.mcpDesc",         icon: Plug,             color: "text-cyan-500",   bg: "bg-cyan-500/10"   },
  { id: "sistema",     labelKey: "settings.system",      descKey: "settings.systemDesc",      icon: Database,         color: "text-orange-500", bg: "bg-orange-500/10" },
] as const;

type PanelId = typeof CATEGORIES[number]["id"] | "main";

// ─── Sub-componentes ─────────────────────────────────────────────────────────
function ThemeSwatch({ themes, storedTheme, onSelect, light }: {
  themes: readonly { id: string; label: string; bg: string; accent: string }[];
  storedTheme: string;
  onSelect: (id: Theme) => void;
  light?: boolean;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {themes.map((t) => {
        const isSelected = storedTheme === t.id;
        const lo = light ? "rgba(0,0,0," : "rgba(255,255,255,";
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id as Theme)}
            title={t.label}
            className={cn(
              "flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isSelected
                ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                : "hover:bg-secondary/60"
            )}
          >
            {/* Mini UI preview */}
            <div
              className={cn("w-full aspect-[5/4] rounded-lg overflow-hidden relative", light && "border border-black/10")}
              style={{ backgroundColor: t.bg }}
            >
              {/* Sidebar strip */}
              <div
                className="absolute left-0 top-0 bottom-0"
                style={{ width: "27%", backgroundColor: `${lo}0.06)`, borderRight: `1px solid ${t.accent}28` }}
              />
              {/* Sidebar active item */}
              <div className="absolute rounded-sm" style={{ left: "4%", top: "17%", width: "17%", height: "7%", backgroundColor: t.accent, opacity: 0.95 }} />
              {/* Sidebar inactive items */}
              <div className="absolute rounded-sm" style={{ left: "4%", top: "29%", width: "15%", height: "5%", backgroundColor: `${lo}0.22)` }} />
              <div className="absolute rounded-sm" style={{ left: "4%", top: "38%", width: "13%", height: "5%", backgroundColor: `${lo}0.16)` }} />
              <div className="absolute rounded-sm" style={{ left: "4%", top: "47%", width: "16%", height: "5%", backgroundColor: `${lo}0.12)` }} />

              {/* Header */}
              <div
                className="absolute right-0 top-0"
                style={{ left: "27%", height: "17%", backgroundColor: `${lo}0.03)`, borderBottom: `1px solid ${lo}0.07)` }}
              />
              {/* Header accent button */}
              <div className="absolute rounded-sm" style={{ right: "5%", top: "4%", width: "14%", height: "9%", backgroundColor: t.accent, opacity: 0.9 }} />

              {/* Content cards */}
              <div className="absolute rounded-sm" style={{ left: "31%", top: "23%", right: "5%", height: "19%", backgroundColor: `${lo}0.08)` }} />
              {/* Accent dot in first card */}
              <div className="absolute rounded-full" style={{ left: "34%", top: "28%", width: "7%", height: "9%", backgroundColor: t.accent, opacity: 0.8 }} />
              <div className="absolute rounded-sm" style={{ left: "31%", top: "47%", right: "5%", height: "14%", backgroundColor: `${lo}0.06)` }} />
              <div className="absolute rounded-sm" style={{ left: "31%", top: "66%", right: "5%", height: "14%", backgroundColor: `${lo}0.04)` }} />

              {/* Selection overlay */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: `${t.accent}20` }}>
                  <div className="rounded-full flex items-center justify-center shadow-sm" style={{ width: 18, height: 18, backgroundColor: t.accent }}>
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                </div>
              )}
            </div>
            <span className={cn(
              "text-[9px] leading-none truncate w-full text-center transition-colors",
              isSelected ? "text-primary font-semibold" : "text-muted-foreground"
            )}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, label, t }: { value: boolean; onChange: (v: boolean) => void; label: string; t: (key: string, params?: Record<string, string | number>) => string }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onChange(!value); }}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none shrink-0",
        value ? "bg-primary" : "bg-muted-foreground/30"
      )}
      aria-label={value ? t("settings.toggleDeactivate", { label }) : t("settings.toggleActivate", { label })}
    >
      <span className={cn(
        "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
        value ? "translate-x-4.5" : "translate-x-0.5"
      )} />
    </button>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────
interface SettingsDropdownProps {
  onOpenImportExport?: () => void;
  onOpenDuplicates?: () => void;
  onOpenHealthCheck?: () => void;
  onOpenClassificationRules?: () => void;
  onOpenSessions?: () => void;
  onOpenReadingQueue?: () => void;
  onOpenTrash?: () => void;
}

// ─── Componente principal ────────────────────────────────────────────────────
export function SettingsDropdown({ onOpenImportExport, onOpenDuplicates, onOpenHealthCheck, onOpenClassificationRules, onOpenSessions, onOpenReadingQueue, onOpenTrash }: SettingsDropdownProps) {
  const { setTheme: setNextTheme, theme: currentNextTheme } = useTheme();
  const { t } = useTranslation();
  const {
    theme: storedTheme, viewDensity, viewMode, showTooltips, reduceMotion, stickerSoundVolume,
    databaseInfo, isDatabaseLoading, mcpEnabled, mcpApiKey,
    ollamaEnabled, ollamaUrl, ollamaModel,
    language, gridColumns, sidebarAlwaysVisible, defaultSortField, defaultSortOrder,
    thumbnailSize, sidebarDensity, autoBackupInterval, confirmBeforeDelete, linkClickBehavior,
    setTheme: setStoredTheme, setViewDensity, setViewMode, setShowTooltips, setReduceMotion,
    setStickerSoundVolume, fetchDatabaseInfo, setMcpEnabled, regenerateMcpApiKey,
    setOllamaEnabled, setOllamaUrl, setOllamaModel,
    setLanguage, setGridColumns, setSidebarAlwaysVisible, setDefaultSortField, setDefaultSortOrder,
    setThumbnailSize, setSidebarDensity, setAutoBackupInterval, setConfirmBeforeDelete, setLinkClickBehavior,
  } = useSettingsStore();

  const [open, setOpen]                       = useState(false);
  // ID estático en lugar de useId() — hay un único SettingsDropdown en la página,
  // por lo que un ID fijo evita el hydration mismatch causado por useSyncExternalStore
  // (DesktopTitleBar, useElectron) que desplazan el contador de IDs de Radix entre
  // el render SSR y el render de hidratación del cliente.
  const settingsTriggerId = "stacklume-settings-trigger";
  const [activePanel, setActivePanel]         = useState<PanelId>("main");
  const [direction, setDirection]             = useState(1);
  const [showMcpKey, setShowMcpKey]           = useState(false);
  const [isCopyingKey, setIsCopyingKey]       = useState(false);
  const [isRegeneratingKey, setIsRegenerating] = useState(false);
  const [showMcpDocs, setShowMcpDocs]         = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [ollamaTestResult, setOllamaTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [ollamaModels, setOllamaModels] = useState<string[]>([]);
  const [ollamaTestLoading, setOllamaTestLoading] = useState(false);
  // Estado local para los inputs de texto — evita escrituras a BD en cada tecla
  const [localOllamaUrl, setLocalOllamaUrl] = useState(ollamaUrl ?? "http://localhost:11434");
  const [localOllamaModel, setLocalOllamaModel] = useState(ollamaModel ?? "");
  const isDesktop = isTauriWebView();

  // Puerto preferido estable para MCP en desktop (debe coincidir con PREFERRED_PORT en lib.rs)
  const MCP_PREFERRED_PORT = 7879;

  // Puerto real detectado en tiempo de ejecución (via comando Tauri get_server_port).
  // Se usa para construir la URL de MCP y avisar si el servidor arrancó en un puerto
  // diferente al preferido (p.ej. si 7879 estaba ocupado por otro proceso).
  const [actualServerPort, setActualServerPort] = useState<number | null>(null);

  useEffect(() => {
    if (!isDesktop) return;
    getServerPort().then((port) => {
      if (port !== null) setActualServerPort(port);
    }).catch(() => {/* silencioso si falla */});
  }, [isDesktop]);

  // URL de MCP: en desktop usa el puerto real detectado (o el preferido mientras carga).
  // En web usa el origen de la ventana.
  const mcpUrl = typeof window !== "undefined"
    ? isDesktop
      ? `http://127.0.0.1:${actualServerPort ?? MCP_PREFERRED_PORT}/api/mcp`
      : `${window.location.origin}/api/mcp`
    : "/api/mcp";

  // true si el servidor arrancó en un puerto diferente al preferido (MCP inestable)
  const mcpPortUnstable = isDesktop && actualServerPort !== null && actualServerPort !== MCP_PREFERRED_PORT;

  // Sincronizar next-themes con el tema del store
  useEffect(() => {
    if (storedTheme && currentNextTheme !== storedTheme) {
      setNextTheme(storedTheme);
    }
  }, [storedTheme, currentNextTheme, setNextTheme]);

  const handleThemeChange = (t: Theme) => { setNextTheme(t); setStoredTheme(t); };

  const handleCopyMcpKey = async () => {
    if (!mcpApiKey) return;
    setIsCopyingKey(true);
    await navigator.clipboard.writeText(mcpApiKey);
    toast.success(t("settings.mcpKeyCopied"));
    setTimeout(() => setIsCopyingKey(false), 1500);
  };

  const handleRegenerateMcpKey = async () => {
    setIsRegenerating(true);
    await regenerateMcpApiKey();
    setIsRegenerating(false);
    toast.success(t("settings.mcpKeyRegenerated"));
  };

  const handleTestOllama = async () => {
    // Guardar la URL actual antes de probar
    const urlToTest = localOllamaUrl || "http://localhost:11434";
    setOllamaUrl(urlToTest);
    setOllamaTestLoading(true);
    setOllamaTestResult(null);
    try {
      const res = await fetch(`/api/ollama/status?url=${encodeURIComponent(urlToTest)}`);
      const data = await res.json() as { ok: boolean; modelCount?: number; error?: string };
      if (data.ok) {
        setOllamaTestResult({ ok: true, message: t("settings.ollamaTestOk", { count: String(data.modelCount ?? 0) }) });
        const modelsRes = await fetch(`/api/ollama/models?url=${encodeURIComponent(urlToTest)}`);
        const modelsData = await modelsRes.json() as { models?: { name: string }[] };
        setOllamaModels((modelsData.models ?? []).map((m) => m.name));
      } else {
        setOllamaTestResult({ ok: false, message: t("settings.ollamaTestError", { error: data.error ?? "Error" }) });
      }
    } catch {
      setOllamaTestResult({ ok: false, message: t("settings.ollamaTestError", { error: "Error de red" }) });
    } finally {
      setOllamaTestLoading(false);
    }
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    window.dispatchEvent(new CustomEvent("stacklume:check-update-manual"));
    setTimeout(() => setIsCheckingUpdate(false), 3000);
  };

  const handleCopyMcpConfig = async (format: "claude" | "cursor") => {
    if (!mcpApiKey) { toast.error(t("settings.mcpGenerateKeyFirst")); return; }
    const config = format === "claude"
      ? JSON.stringify({ mcpServers: { stacklume: { url: mcpUrl, headers: { Authorization: `Bearer ${mcpApiKey}` } } } }, null, 2)
      : JSON.stringify({ mcpServers: { stacklume: { url: mcpUrl, transport: "http", headers: { Authorization: `Bearer ${mcpApiKey}` } } } }, null, 2);
    await navigator.clipboard.writeText(config);
    toast.success(t("settings.mcpConfigCopiedFor", { client: format === "claude" ? "Claude Desktop" : "Cursor" }));
  };

  const navigateTo = (panel: PanelId) => { setDirection(1); setActivePanel(panel); };
  const goBack     = () => { setDirection(-1); setActivePanel("main"); };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await fetch("/api/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify({ backupType: "manual" }),
      });
      if (res.ok) {
        toast.success(t("settings.backupCreated"));
      } else {
        toast.error(t("settings.backupCreateError"));
      }
    } catch {
      toast.error(t("settings.backupCreateError"));
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsDownloadingBackup(true);
    try {
      const res = await fetch("/api/export", { credentials: "include" });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `stacklume-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("settings.backupDownloaded"));
    } catch {
      toast.error(t("settings.backupDownloadError"));
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setIsRestoringBackup(true);
      try {
        const text = await file.text();
        const importData = JSON.parse(text);

        // 1. Import the backup into DB
        const importRes = await fetch("/api/backup", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
          credentials: "include",
          body: JSON.stringify({ importData }),
        });
        if (!importRes.ok) {
          toast.error(t("settings.backupRestoreInvalidFormat"));
          return;
        }
        const { id: backupId } = await importRes.json();

        // 2. Restore the backup
        const restoreRes = await fetch(`/api/backup/${backupId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
          credentials: "include",
          body: JSON.stringify({ action: "restore", mergeMode: "merge" }),
        });
        if (!restoreRes.ok) throw new Error();
        const result = await restoreRes.json();

        if (result.success) {
          toast.success(t("settings.backupRestored", {
            links: result.restored.links,
            categories: result.restored.categories,
          }));
          // Refresh data in stores
          const { useLinksStore } = await import("@/stores/links-store");
          useLinksStore.getState().refreshAllData();
        } else {
          toast.warning(t("settings.backupRestoredWithErrors", { count: result.errors.length }));
        }
      } catch {
        toast.error(t("settings.backupRestoreError"));
      } finally {
        setIsRestoringBackup(false);
      }
    };
    input.click();
  };

  const activeCategory = CATEGORIES.find((c) => c.id === activePanel);
  const headerTitle = activePanel === "main" ? t("settings.title") : (activeCategory ? t(activeCategory.labelKey) : t("settings.title"));

  // ── Contenido de cada panel ──────────────────────────────────────────────
  const renderPanel = (panel: PanelId) => {
    switch (panel) {
      case "main":
        return (
          <div className="p-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(({ id, labelKey, descKey, icon: Icon, color, bg }) => (
                <button
                  key={id}
                  onClick={() => navigateTo(id)}
                  className="group flex flex-col gap-2.5 p-3 rounded-xl border border-border/40 hover:border-border/80 hover:bg-muted/40 transition-all text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <div className="flex items-center justify-between">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", bg)}>
                      <Icon className={cn("w-3.5 h-3.5", color)} />
                    </div>
                    <ChevronRight className="w-3 h-3 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold leading-none">{t(labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 leading-tight">{t(descKey)}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="pt-1 border-t border-border/30">
              <p className="text-[10px] text-muted-foreground/40 text-center select-none">
                Stacklume v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
              </p>
            </div>
          </div>
        );

      case "apariencia":
        return (
          <div className="p-3 space-y-3">
            <button
              onClick={() => handleThemeChange("system")}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors",
                storedTheme === "system"
                  ? "bg-primary/15 text-foreground font-medium border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent"
              )}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span>{t("settings.systemThemeFollow")}</span>
              {storedTheme === "system" && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
            </button>
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2">{t("settings.darkThemes")}</p>
              <ThemeSwatch themes={DARK_THEMES} storedTheme={storedTheme} onSelect={handleThemeChange} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2">{t("settings.lightThemes")}</p>
              <ThemeSwatch themes={LIGHT_THEMES} storedTheme={storedTheme} onSelect={handleThemeChange} light />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2">{t("settings.grayThemes")}</p>
              <ThemeSwatch themes={GRAY_THEMES} storedTheme={storedTheme} onSelect={handleThemeChange} light />
            </div>
          </div>
        );

      case "vista":
        return (
          <div className="p-3 space-y-4">
            <div>
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2" data-tour="view-mode-toggle">
                {t("settings.viewMode")}
              </p>
              <div className="space-y-1">
                {([
                  { value: "bento",  labelKey: "settings.bentoGrid", descKey: "settings.bentoDesc",  Icon: LayoutGrid },
                  { value: "kanban", labelKey: "settings.kanban",    descKey: "settings.kanbanDesc", Icon: LayoutGrid },
                  { value: "list",   labelKey: "settings.list",      descKey: "settings.listDesc",   Icon: List       },
                ] as const).map(({ value, labelKey, descKey, Icon }) => (
                  <button
                    key={value}
                    onClick={() => setViewMode(value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left border",
                      viewMode === value
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-transparent hover:bg-muted/50 hover:border-border/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", viewMode === value && "text-primary")} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm leading-none", viewMode === value && "font-medium")}>{t(labelKey)}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{t(descKey)}</p>
                    </div>
                    {viewMode === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
            <div className="border-t border-border/40 pt-4">
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2">
                {t("settings.viewDensity")}
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {(["compact", "normal", "comfortable"] as ViewDensity[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setViewDensity(v)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      viewDensity === v
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                    )}
                  >
                    {v === "compact" ? t("settings.compactLabel") : v === "normal" ? t("settings.normalLabel") : t("settings.comfortableLabel")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "interfaz":
        return (
          <div className="p-3 space-y-4">
            {/* Idioma */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{t("settings.language")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.languageDesc")}</p>
              </div>
              <div className="grid grid-cols-2 gap-1">
                {(["es", "en"] as Language[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLanguage(l)}
                    className={cn(
                      "px-2.5 py-1 rounded-md text-xs font-medium transition-all border",
                      language === l
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50"
                    )}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Columnas de cuadrícula */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.gridColumns")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.gridColumnsDescShort")}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 px-1">
                {[8, 12, 16, 24].map((n) => (
                  <button
                    key={n}
                    onClick={() => setGridColumns(n)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      gridColumns === n
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra lateral siempre visible */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 py-0.5">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.sidebarFixed")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.sidebarFixedDesc")}</p>
                </div>
                <Toggle value={sidebarAlwaysVisible} onChange={setSidebarAlwaysVisible} label={t("settings.sidebarFixed")} t={t} />
              </div>
            </div>

            {/* Densidad barra lateral */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <List className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.sidebarDensityLabel")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.sidebarDensityDescShort")}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 px-1">
                {(["compact", "normal", "comfortable"] as ViewDensity[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSidebarDensity(v)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      sidebarDensity === v
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                    )}
                  >
                    {v === "compact" ? t("settings.compactLabel") : v === "normal" ? t("settings.normalLabel") : t("settings.comfortableLabel")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case "enlaces":
        return (
          <div className="p-3 space-y-4">
            {/* Orden por defecto */}
            <div>
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.sortDefault")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.sortDefaultDesc")}</p>
                </div>
              </div>
              <div className="space-y-2 px-1">
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "createdAt", labelKey: "settings.sortDateCreated" },
                    { value: "updatedAt", labelKey: "settings.sortLastEdit" },
                    { value: "title",     labelKey: "settings.sortByTitle" },
                    { value: "order",     labelKey: "settings.sortByOrder" },
                  ] as { value: SortField; labelKey: string }[]).map(({ value, labelKey }) => (
                    <button
                      key={value}
                      onClick={() => setDefaultSortField(value)}
                      className={cn(
                        "py-2 px-2 rounded-lg text-xs font-medium transition-all border text-center",
                        defaultSortField === value
                          ? "bg-primary/10 border-primary/25 text-foreground"
                          : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                      )}
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {([
                    { value: "desc", labelKey: "settings.descending" },
                    { value: "asc",  labelKey: "settings.ascending" },
                  ] as { value: SortOrder; labelKey: string }[]).map(({ value, labelKey }) => (
                    <button
                      key={value}
                      onClick={() => setDefaultSortOrder(value)}
                      className={cn(
                        "py-1.5 rounded-lg text-xs font-medium transition-all border",
                        defaultSortOrder === value
                          ? "bg-primary/10 border-primary/25 text-foreground"
                          : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                      )}
                    >
                      {t(labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Miniatura */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.thumbnailSize")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.thumbnailSizeDescShort")}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1.5 px-1">
                {([
                  { value: "none",   labelKey: "settings.thumbnailNone" },
                  { value: "small",  labelKey: "settings.thumbnailSmall" },
                  { value: "medium", labelKey: "settings.thumbnailMedium" },
                  { value: "large",  labelKey: "settings.thumbnailLarge" },
                ] as { value: ThumbnailSize; labelKey: string }[]).map(({ value, labelKey }) => (
                  <button
                    key={value}
                    onClick={() => setThumbnailSize(value)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      thumbnailSize === value
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                    )}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Comportamiento al hacer clic */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 mb-2">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.openLink")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.openLinkDesc")}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-1">
                {([
                  { value: "new-tab",  labelKey: "settings.newTab" },
                  { value: "same-tab", labelKey: "settings.sameTab" },
                ] as { value: LinkClickBehavior; labelKey: string }[]).map(({ value, labelKey }) => (
                  <button
                    key={value}
                    onClick={() => setLinkClickBehavior(value)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-medium transition-all border",
                      linkClickBehavior === value
                        ? "bg-primary/10 border-primary/25 text-foreground"
                        : "border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border/70"
                    )}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirmar antes de eliminar */}
            <div className="border-t border-border/40 pt-4">
              <div className="flex items-center gap-3 px-1 py-0.5">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.confirmBeforeDelete")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.confirmDeleteDescShort")}</p>
                </div>
                <Toggle value={confirmBeforeDelete} onChange={setConfirmBeforeDelete} label={t("settings.confirmBeforeDelete")} t={t} />
              </div>
            </div>
          </div>
        );

      case "preferencias":
        return (
          <div className="p-3 space-y-4">
            <div className="space-y-3">
              {([
                { labelKey: "settings.showTooltips",   descKey: "settings.showTooltipsDesc",       value: showTooltips,  onChange: setShowTooltips,  Icon: MessageSquare },
                { labelKey: "settings.reduceMotion",   descKey: "settings.reduceMotionDescShort",  value: reduceMotion,  onChange: setReduceMotion,  Icon: Zap           },
              ] as const).map(({ labelKey, descKey, value, onChange, Icon }) => (
                <div key={labelKey} className="flex items-center gap-3 px-1 py-0.5">
                  <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{t(labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground">{t(descKey)}</p>
                  </div>
                  <Toggle value={value} onChange={onChange} label={t(labelKey)} t={t} />
                </div>
              ))}
            </div>

            {/* Volumen de pegatinas */}
            <div className="border-t border-border/40 pt-4 space-y-3">
              <div className="flex items-center gap-3 px-1">
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  {stickerSoundVolume === 0 ? (
                    <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{t("settings.stickerSound")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.stickerSoundDescShort")}</p>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-7 text-right">{stickerSoundVolume}%</span>
              </div>
              <div className="flex items-center gap-2 px-1">
                <button
                  onClick={() => setStickerSoundVolume(stickerSoundVolume === 0 ? 50 : 0)}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  aria-label={stickerSoundVolume === 0 ? t("settings.enableSound") : t("settings.muteSound")}
                >
                  {stickerSoundVolume === 0 ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>
                <Slider
                  value={[stickerSoundVolume]}
                  onValueChange={(v) => setStickerSoundVolume(v[0])}
                  max={100} step={5} className="flex-1"
                  aria-label={t("settings.stickerVolumeAria")}
                />
              </div>
            </div>
          </div>
        );

      case "backups":
        return (
          <div className="p-3 space-y-4">
            <div className="flex items-center gap-3 px-1 mb-2">
              <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center shrink-0">
                <Save className="w-3.5 h-3.5 text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("settings.autoBackupTitle")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.autoBackupFreq")}</p>
              </div>
            </div>
            <div className="space-y-1 px-1">
              {([
                { value: 0,  labelKey: "settings.backupDisabled",     descKey: "settings.backupNoAuto" },
                { value: 1,  labelKey: "settings.backupDailyFull",    descKey: "settings.backupEveryDay" },
                { value: 7,  labelKey: "settings.backupWeeklyFull",   descKey: "settings.backupEvery7Days" },
                { value: 30, labelKey: "settings.backupMonthlyFull",  descKey: "settings.backupEvery30Days" },
              ] as const).map(({ value, labelKey, descKey }) => (
                <button
                  key={value}
                  onClick={() => setAutoBackupInterval(value)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left border",
                    autoBackupInterval === value
                      ? "bg-primary/10 border-primary/25 text-foreground"
                      : "border-transparent hover:bg-muted/50 hover:border-border/50 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-none", autoBackupInterval === value && "font-medium")}>{t(labelKey)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t(descKey)}</p>
                  </div>
                  {autoBackupInterval === value && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                </button>
              ))}
            </div>

            {/* Acciones manuales */}
            <div className="border-t border-border/40 pt-4 space-y-2">
              <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-2 px-1">
                {t("settings.manualBackupActions")}
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  {isCreatingBackup ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("settings.createManualBackup")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.createManualBackupDesc")}</p>
                </div>
              </button>
              <button
                onClick={handleDownloadBackup}
                disabled={isDownloadingBackup}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  {isDownloadingBackup ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("settings.downloadBackup")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.downloadBackupDesc")}</p>
                </div>
              </button>
              <button
                onClick={handleRestoreBackup}
                disabled={isRestoringBackup}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-transparent hover:bg-muted/50 hover:border-border/50 transition-all text-left disabled:opacity-50"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  {isRestoringBackup ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t("settings.restoreBackup")}</p>
                  <p className="text-[10px] text-muted-foreground">{t("settings.restoreBackupDesc")}</p>
                </div>
              </button>
            </div>
          </div>
        );

      case "herramientas": {
        const tools = [
          {
            labelKey: "settings.onboarding",
            descKey: "settings.onboardingDescShort",
            Icon: HelpCircle,
            onClick: async () => { setOpen(false); await useSettingsStore.getState().setOnboardingCompleted(false); window.location.reload(); },
          },
          {
            labelKey: "settings.importExport",
            descKey: "settings.importExportDescShort",
            Icon: Download,
            onClick: () => { setOpen(false); onOpenImportExport?.(); },
          },
          {
            labelKey: "settings.findDuplicates",
            descKey: "settings.findDuplicatesDescShort",
            Icon: Copy,
            onClick: () => { setOpen(false); onOpenDuplicates?.(); },
          },
          {
            labelKey: "settings.healthCheckLabel",
            descKey: "settings.healthCheckDescShort",
            Icon: Activity,
            onClick: () => { setOpen(false); onOpenHealthCheck?.(); },
          },
          {
            labelKey: "settings.classificationRules",
            descKey: "settings.classificationRulesDesc",
            Icon: Tags,
            onClick: () => { setOpen(false); onOpenClassificationRules?.(); },
          },
          {
            labelKey: "settings.linkSessions",
            descKey: "settings.linkSessionsDesc",
            Icon: Layers,
            onClick: () => { setOpen(false); onOpenSessions?.(); },
          },
          {
            labelKey: "settings.readingQueue",
            descKey: "settings.readingQueueDesc",
            Icon: Inbox,
            onClick: () => { setOpen(false); onOpenReadingQueue?.(); },
          },
          {
            labelKey: "settings.trash",
            descKey: "settings.trashDesc",
            Icon: Trash2,
            onClick: () => { setOpen(false); onOpenTrash?.(); },
          },
          ...(isDesktop ? [
            {
              labelKey: "settings.checkUpdates",
              descKey: "settings.checkUpdatesDesc",
              Icon: ArrowUpCircle,
              onClick: handleCheckUpdate,
              loading: isCheckingUpdate,
            },
          ] : []),
        ];

        return (
          <div className="p-3 space-y-1">
            {tools.map(({ labelKey, descKey, Icon, onClick, loading }) => (
              <button
                key={labelKey}
                onClick={onClick}
                disabled={loading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent hover:bg-muted/50 hover:border-border/50 transition-all text-left disabled:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t(labelKey)}</p>
                  <p className="text-[10px] text-muted-foreground">{t(descKey)}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
              </button>
            ))}
          </div>
        );
      }

      case "atajos": {
        const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
        const mod = isMac ? "⌘" : "Ctrl";

        const shortcutGroups = [
          {
            titleKey: "settings.shortcutsGlobal",
            shortcuts: [
              { keys: `${mod} + K`, descKey: "settings.shortcutSearch" },
              { keys: `${mod} + N`, descKey: "settings.shortcutNewLink" },
              { keys: `${mod} + Z`, descKey: "settings.shortcutUndo" },
              { keys: `${mod} + Shift + Z`, descKey: "settings.shortcutRedo" },
              { keys: "Escape", descKey: "settings.shortcutEscape" },
            ],
          },
          {
            titleKey: "settings.shortcutsKanban",
            shortcuts: [
              { keys: `${mod} + M`, descKey: "settings.shortcutManageColumns" },
              { keys: `${mod} + J`, descKey: "settings.shortcutCollapseToggle" },
              { keys: `${mod} + Shift + C`, descKey: "settings.shortcutNewColumn" },
              { keys: `${mod} + Shift + N`, descKey: "settings.shortcutNewWidget" },
              { keys: "/", descKey: "settings.shortcutFocusSearch" },
              { keys: "N", descKey: "settings.shortcutQuickWidget" },
              { keys: "C", descKey: "settings.shortcutQuickColumn" },
            ],
          },
          {
            titleKey: "settings.shortcutsBento",
            shortcuts: [
              { keys: "Space / Enter", descKey: "settings.shortcutDragMode" },
              { keys: "← → ↑ ↓", descKey: "settings.shortcutMoveWidget" },
              { keys: "Home / End", descKey: "settings.shortcutMoveEdge" },
              { keys: "PgUp / PgDn", descKey: "settings.shortcutMove5Rows" },
              { keys: "Escape", descKey: "settings.shortcutCancelDrag" },
            ],
          },
          {
            titleKey: "settings.shortcutsOnboarding",
            shortcuts: [
              { keys: "← →", descKey: "settings.shortcutOnboardingNav" },
              { keys: "Escape", descKey: "settings.shortcutSkipTour" },
            ],
          },
        ];

        return (
          <div className="p-3 space-y-3">
            {shortcutGroups.map(({ titleKey, shortcuts }) => (
              <div key={titleKey}>
                <p className="text-[10px] text-muted-foreground/60 font-semibold uppercase tracking-wider mb-1.5">
                  {t(titleKey)}
                </p>
                <div className="space-y-0.5">
                  {shortcuts.map(({ keys, descKey }) => (
                    <div key={descKey} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                      <span className="text-xs text-foreground/80">{t(descKey)}</span>
                      <kbd className="ml-2 shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border border-border/50 text-muted-foreground">
                        {keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      }

      case "ia-local":
        return (
          <div className="p-3 space-y-4">
            {/* Toggle Ollama */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-3.5 h-3.5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("settings.ollamaEnabled")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.ollamaEnabledDesc")}</p>
              </div>
              <Toggle value={ollamaEnabled} onChange={setOllamaEnabled} label={t("settings.ollamaEnabled")} t={t} />
            </div>

            <AnimatePresence>
              {ollamaEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-3 pt-1">
                    {/* URL */}
                    <div className="rounded-xl border border-border/50 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("settings.ollamaUrl")}</p>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={localOllamaUrl}
                          onChange={(e) => setLocalOllamaUrl(e.target.value)}
                          onBlur={() => setOllamaUrl(localOllamaUrl)}
                          placeholder={t("settings.ollamaUrlPlaceholder")}
                          className="flex-1 bg-muted rounded-lg px-2.5 py-1.5 text-xs font-mono border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                        />
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTestOllama(); }}
                          disabled={ollamaTestLoading}
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors font-medium shrink-0 disabled:opacity-50"
                        >
                          {ollamaTestLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : t("settings.ollamaTest")}
                        </button>
                      </div>
                      {ollamaTestResult && (
                        <p className={cn("text-[10px] flex items-center gap-1", ollamaTestResult.ok ? "text-green-500" : "text-destructive")}>
                          <span>{ollamaTestResult.ok ? "✓" : "✗"}</span>
                          {ollamaTestResult.message}
                        </p>
                      )}
                    </div>

                    {/* Model selector */}
                    <div className="rounded-xl border border-border/50 p-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{t("settings.ollamaModel")}</p>
                      {ollamaModels.length > 0 ? (
                        <select
                          value={ollamaModel ?? ""}
                          onChange={(e) => setOllamaModel(e.target.value || null)}
                          className="w-full bg-muted rounded-lg px-2.5 py-1.5 text-xs border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                        >
                          <option value="">{t("settings.ollamaModelPlaceholder")}</option>
                          {ollamaModels.map((m) => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={localOllamaModel}
                          onChange={(e) => setLocalOllamaModel(e.target.value)}
                          onBlur={() => setOllamaModel(localOllamaModel || null)}
                          placeholder={t("settings.ollamaModelPlaceholder")}
                          className="w-full bg-muted rounded-lg px-2.5 py-1.5 text-xs font-mono border border-border/30 focus:border-primary/50 focus:outline-none transition-colors"
                        />
                      )}
                    </div>

                    {/* Hint */}
                    <p className="text-[10px] text-muted-foreground/60 px-1 leading-relaxed">
                      {t("settings.ollamaHint")}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "mcp":
        return (
          <div className="p-3 space-y-4">
            {/* Toggle MCP */}
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
                <Plug className="w-3.5 h-3.5 text-cyan-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{t("settings.mcpEnabled")}</p>
                <p className="text-[10px] text-muted-foreground">{t("settings.mcpEnabledDescShort")}</p>
              </div>
              <Toggle value={mcpEnabled} onChange={setMcpEnabled} label={t("settings.mcpEnabled")} t={t} />
            </div>

            <AnimatePresence>
              {mcpEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pt-1">
                    {/* API Key */}
                    <div className="rounded-xl border border-border/50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">{t("settings.mcpApiKey")}</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMcpKey(!showMcpKey); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showMcpKey ? t("settings.mcpHideKey") : t("settings.mcpShowKey")}
                          >
                            {showMcpKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          {mcpApiKey && (
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpKey(); }}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                              aria-label={t("settings.mcpCopyApiKey")}
                            >
                              {isCopyingKey ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRegenerateMcpKey(); }}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            disabled={isRegeneratingKey}
                            aria-label={t("settings.mcpRegenerateKey")}
                          >
                            <RefreshCw className={cn("h-3.5 w-3.5", isRegeneratingKey && "animate-spin")} />
                          </button>
                        </div>
                      </div>
                      <div className="font-mono text-xs bg-muted rounded-lg px-2.5 py-2 truncate text-muted-foreground">
                        {mcpApiKey
                          ? showMcpKey ? mcpApiKey : `${"•".repeat(Math.min(mcpApiKey.length, 22))}…`
                          : <span className="italic opacity-60">{t("settings.mcpNoKey")}</span>
                        }
                      </div>
                    </div>

                    {/* Conectar */}
                    <div className="rounded-xl border border-border/50 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-muted-foreground">{t("settings.mcpConnectWith")}</p>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMcpDocs(true); }}
                          className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                        >
                          <BookOpen className="h-3 w-3" />
                          {t("settings.mcpFullGuide")}
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpConfig("claude"); }}
                          className="text-xs px-2 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors font-medium"
                        >
                          Claude Desktop
                        </button>
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpConfig("cursor"); }}
                          className="text-xs px-2 py-2 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors font-medium"
                        >
                          Cursor / Cline
                        </button>
                      </div>
                      <p className="text-[9px] text-muted-foreground/50 font-mono truncate" title={mcpUrl}>{mcpUrl}</p>
                      {mcpPortUnstable && (
                        <p className="text-[9px] text-amber-500 flex items-center gap-1">
                          <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" />
                          {t("settings.mcpPortUnstable", { port: actualServerPort })}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );

      case "sistema":
        return (
          <div className="p-3 space-y-2">
            <div className="rounded-xl border border-border/50 overflow-hidden">
              {isDatabaseLoading ? (
                <div className="flex items-center gap-2.5 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                  {t("settings.loadingInfo")}
                </div>
              ) : databaseInfo ? (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {databaseInfo.type === "sqlite" ? (
                      <HardDrive className="h-5 w-5 text-blue-500 shrink-0" />
                    ) : (
                      <Cloud className="h-5 w-5 text-green-500 shrink-0" />
                    )}
                    <div>
                      <p className="text-sm font-medium">
                        {databaseInfo.type === "sqlite" ? t("settings.dbSqliteLocal") : t("settings.dbNeonPg")}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {databaseInfo.status === "connected" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-[10px] text-muted-foreground">{t("settings.dbConnected")}</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-3 w-3 text-destructive" />
                            <span className="text-[10px] text-destructive">{t("settings.dbError")}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {databaseInfo.type === "sqlite" && databaseInfo.config.sqlitePath && (
                    <div className="bg-muted rounded-lg px-2.5 py-2">
                      <p className="text-[10px] text-muted-foreground font-mono break-all">
                        {databaseInfo.config.sqlitePath}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={fetchDatabaseInfo}
                  className="w-full flex items-center gap-2.5 p-4 text-sm text-primary hover:bg-muted/50 transition-colors"
                >
                  <Database className="h-4 w-4 shrink-0" />
                  {t("settings.viewDbInfo")}
                </button>
              )}
            </div>

            <div className="rounded-xl border border-border/50 px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Settings className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">{t("settings.installedVersion")}</p>
                <p className="text-sm font-semibold">
                  Stacklume v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <DropdownMenu
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setTimeout(() => setActivePanel("main"), 250);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                id={settingsTriggerId}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
                aria-label={t("settings.title")}
                data-tour="settings-button"
              >
                <Settings size={16} aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{t("settings.title")}</p>
          </TooltipContent>
        </Tooltip>

        <DropdownMenuContent align="end" className="w-72 p-0 overflow-hidden" onCloseAutoFocus={(e) => e.preventDefault()}>
          {/* Cabecera con navegación animada */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 min-h-[42px]">
            <AnimatePresence mode="wait" initial={false}>
              {activePanel !== "main" ? (
                <motion.button
                  key="back-btn"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.12 }}
                  onClick={goBack}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 -ml-0.5"
                  aria-label={t("settings.goBack")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.div
                  key="settings-icon"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="shrink-0"
                >
                  <Settings className="w-4 h-4 text-muted-foreground" />
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={activePanel}
                initial={{ opacity: 0, y: direction > 0 ? 6 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction > 0 ? -6 : 6 }}
                transition={{ duration: 0.14 }}
                className="text-sm font-semibold flex-1 truncate"
              >
                {headerTitle}
              </motion.p>
            </AnimatePresence>
          </div>

          {/* Contenido del panel con animación de dirección */}
          <AnimatePresence mode="wait" custom={direction} initial={false}>
            <motion.div
              key={activePanel}
              custom={direction}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={panelTransition}
              className="max-h-[72vh] overflow-y-auto scrollbar-thin contain-content"
            >
              {renderPanel(activePanel)}
            </motion.div>
          </AnimatePresence>
        </DropdownMenuContent>
      </DropdownMenu>

      <McpDocsDialog
        open={showMcpDocs}
        onOpenChange={setShowMcpDocs}
        mcpUrl={mcpUrl}
        mcpApiKey={mcpApiKey}
      />
    </>
  );
}
