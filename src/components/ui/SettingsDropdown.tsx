"use client";

import { Monitor, Grid2x2, MessageSquare, Zap, Settings, Download, Copy, LayoutGrid, Kanban, List, Volume2, VolumeX, Database, HardDrive, Cloud, CheckCircle2, AlertCircle, Loader2, Plug, RefreshCw, Eye, EyeOff, BookOpen, ArrowUpCircle, Palette, Check, HelpCircle } from "lucide-react";
import { isTauriWebView } from "@/lib/desktop";
import { ONBOARDING_STORAGE_KEY } from "@/components/onboarding/OnboardingTour";
import { McpDocsDialog } from "@/components/ui/McpDocsDialog";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { useSettingsStore, type Theme } from "@/stores/settings-store";
import { cn } from "@/lib/utils";


interface SettingsDropdownProps {
  onOpenImportExport?: () => void;
  onOpenDuplicates?: () => void;
}

export function SettingsDropdown({ onOpenImportExport, onOpenDuplicates }: SettingsDropdownProps) {
  const { setTheme, theme: currentTheme } = useTheme();
  const {
    theme: storedTheme,
    viewDensity,
    viewMode,
    showTooltips,
    reduceMotion,
    stickerSoundVolume,
    databaseInfo,
    isDatabaseLoading,
    mcpEnabled,
    mcpApiKey,
    setTheme: setStoredTheme,
    setViewDensity,
    setViewMode,
    setShowTooltips,
    setReduceMotion,
    setStickerSoundVolume,
    fetchDatabaseInfo,
    setMcpEnabled,
    regenerateMcpApiKey,
  } = useSettingsStore();

  const [showMcpKey, setShowMcpKey] = useState(false);
  const [isCopyingKey, setIsCopyingKey] = useState(false);
  const [isRegeneratingKey, setIsRegeneratingKey] = useState(false);
  const [showMcpDocs, setShowMcpDocs] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const isDesktop = isTauriWebView();

  // Sync theme from store to next-themes on mount
  useEffect(() => {
    if (storedTheme && currentTheme !== storedTheme) {
      setTheme(storedTheme);
    }
  }, [storedTheme, currentTheme, setTheme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  const mcpUrl = typeof window !== "undefined" ? `${window.location.origin}/api/mcp` : "/api/mcp";

  const handleCopyMcpKey = async () => {
    if (!mcpApiKey) return;
    setIsCopyingKey(true);
    await navigator.clipboard.writeText(mcpApiKey);
    toast.success("API key copiada");
    setTimeout(() => setIsCopyingKey(false), 1500);
  };

  const handleRegenerateMcpKey = async () => {
    setIsRegeneratingKey(true);
    await regenerateMcpApiKey();
    setIsRegeneratingKey(false);
    toast.success("API key regenerada");
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    window.dispatchEvent(new CustomEvent("stacklume:check-update-manual"));
    setTimeout(() => setIsCheckingUpdate(false), 3000);
  };

  const handleCopyMcpConfig = async (format: "claude" | "cursor") => {
    if (!mcpApiKey) {
      toast.error("Genera una API key primero");
      return;
    }
    const config =
      format === "claude"
        ? JSON.stringify(
            { mcpServers: { stacklume: { url: mcpUrl, headers: { Authorization: `Bearer ${mcpApiKey}` } } } },
            null,
            2
          )
        : JSON.stringify(
            { mcpServers: { stacklume: { url: mcpUrl, transport: "http", headers: { Authorization: `Bearer ${mcpApiKey}` } } } },
            null,
            2
          );
    await navigator.clipboard.writeText(config);
    toast.success(`Config para ${format === "claude" ? "Claude Desktop" : "Cursor"} copiada`);
  };

  return (
    <>
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary"
              aria-label="Configuración"
              data-tour="settings-button"
            >
              <Settings size={16} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Configuración</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-64 max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DropdownMenuLabel className="text-xs font-semibold">Configuración</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Theme Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          <Palette className="w-3.5 h-3.5 inline mr-1.5" />
          Tema
        </DropdownMenuLabel>

        {/* Sistema */}
        <div className="px-2 pb-1">
          <button
            onClick={() => handleThemeChange("system")}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
              storedTheme === "system"
                ? "bg-primary/15 text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Monitor className="w-3.5 h-3.5 shrink-0" />
            <span>Sistema</span>
            {storedTheme === "system" && <Check className="w-3 h-3 ml-auto text-primary" />}
          </button>
        </div>

        {/* Dark themes */}
        <div className="px-2 pb-1">
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide mb-1.5 px-1">Oscuros</p>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: "dark" as Theme, label: "Naval", bg: "#0d1526", accent: "#d4a853" },
              { id: "midnight" as Theme, label: "Noche", bg: "#0a0812", accent: "#a855f7" },
              { id: "ocean" as Theme, label: "Océano", bg: "#09141e", accent: "#22d3ee" },
              { id: "forest" as Theme, label: "Bosque", bg: "#091510", accent: "#4ade80" },
              { id: "slate" as Theme, label: "Pizarra", bg: "#0f121a", accent: "#7da2c0" },
              { id: "crimson" as Theme, label: "Carmesí", bg: "#11080a", accent: "#ef4444" },
              { id: "aurora" as Theme, label: "Aurora", bg: "#060412", accent: "#34d399" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                title={t.label}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  storedTheme === t.id && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
              >
                <div
                  className="w-10 h-8 rounded-md relative overflow-hidden"
                  style={{ backgroundColor: t.bg }}
                >
                  <div
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full border border-white/20"
                    style={{ backgroundColor: t.accent }}
                  />
                  {storedTheme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Check className="w-3 h-3 text-white drop-shadow" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Light themes */}
        <div className="px-2 pb-2">
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide mb-1.5 px-1">Claros</p>
          <div className="grid grid-cols-4 gap-1">
            {[
              { id: "light" as Theme, label: "Dorado", bg: "#f8f2e8", accent: "#d4a853" },
              { id: "arctic" as Theme, label: "Ártico", bg: "#f5f8fc", accent: "#3b82f6" },
              { id: "sakura" as Theme, label: "Sakura", bg: "#fdf5f5", accent: "#f43f5e" },
              { id: "lavender" as Theme, label: "Lavanda", bg: "#f5f4fc", accent: "#8b5cf6" },
              { id: "mint" as Theme, label: "Menta", bg: "#f3faf4", accent: "#22c55e" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                title={t.label}
                className={cn(
                  "flex flex-col items-center gap-0.5 p-1 rounded-lg transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  storedTheme === t.id && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                )}
              >
                <div
                  className="w-10 h-8 rounded-md relative overflow-hidden border border-border/40"
                  style={{ backgroundColor: t.bg }}
                >
                  <div
                    className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: t.accent }}
                  />
                  {storedTheme === t.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                      <Check className="w-3 h-3 text-gray-700 drop-shadow" />
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-muted-foreground leading-none truncate w-full text-center">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* View Mode Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5" data-tour="view-mode-toggle">
          <LayoutGrid className="w-3.5 h-3.5 inline mr-1.5" />
          Modo de vista
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={viewMode} onValueChange={(value) => setViewMode(value as "bento" | "kanban" | "list")}>
          <DropdownMenuRadioItem value="bento">
            <LayoutGrid className="mr-2 h-4 w-4" />
            Bento Grid
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="kanban">
            <Kanban className="mr-2 h-4 w-4" />
            Kanban
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="list">
            <List className="mr-2 h-4 w-4" />
            Lista
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* View Density Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          <Grid2x2 className="w-3.5 h-3.5 inline mr-1.5" />
          Densidad de vista
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={viewDensity} onValueChange={(value) => setViewDensity(value as "compact" | "normal" | "comfortable")}>
          <DropdownMenuRadioItem value="compact">
            Compacto
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="normal">
            Normal
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="comfortable">
            Cómodo
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        {/* Toggles Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          Preferencias
        </DropdownMenuLabel>

        <DropdownMenuCheckboxItem
          checked={showTooltips}
          onCheckedChange={setShowTooltips}
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Mostrar tooltips
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={reduceMotion}
          onCheckedChange={setReduceMotion}
        >
          <Zap className="mr-2 h-4 w-4" />
          Reducir animaciones
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />

        {/* Sticker Sound Volume */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          {stickerSoundVolume === 0 ? (
            <VolumeX className="w-3.5 h-3.5 inline mr-1.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5 inline mr-1.5" />
          )}
          Sonido de pegatinas
        </DropdownMenuLabel>
        <div className="px-3 py-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setStickerSoundVolume(stickerSoundVolume === 0 ? 50 : 0)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label={stickerSoundVolume === 0 ? "Activar sonido" : "Silenciar"}
            >
              {stickerSoundVolume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <Slider
              value={[stickerSoundVolume]}
              onValueChange={(value) => setStickerSoundVolume(value[0])}
              max={100}
              step={5}
              className="flex-1"
              aria-label="Volumen de sonido de pegatinas"
            />
            <span className="text-xs text-muted-foreground w-8 text-right">
              {stickerSoundVolume}%
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Tools Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          Herramientas
        </DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => {
            localStorage.removeItem(ONBOARDING_STORAGE_KEY);
            window.location.reload();
          }}
        >
          <HelpCircle className="mr-2 h-4 w-4" />
          Reiniciar tutorial
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenImportExport}>
          <Download className="mr-2 h-4 w-4" />
          Importar / Exportar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenDuplicates}>
          <Copy className="mr-2 h-4 w-4" />
          Buscar duplicados
        </DropdownMenuItem>
        {isDesktop && (
          <DropdownMenuItem onClick={handleCheckUpdate} disabled={isCheckingUpdate}>
            {isCheckingUpdate
              ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : <ArrowUpCircle className="mr-2 h-4 w-4" />}
            Buscar actualizaciones
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Database Info Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          <Database className="w-3.5 h-3.5 inline mr-1.5" />
          Base de datos
        </DropdownMenuLabel>
        <div className="px-3 py-2">
          {isDatabaseLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando...
            </div>
          ) : databaseInfo ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                {databaseInfo.type === "sqlite" ? (
                  <HardDrive className="h-4 w-4 text-blue-500" />
                ) : (
                  <Cloud className="h-4 w-4 text-green-500" />
                )}
                <span className="font-medium">
                  {databaseInfo.type === "sqlite" ? "SQLite (Local)" : "Neon PostgreSQL"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {databaseInfo.status === "connected" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Conectado
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 text-destructive" />
                    Error de conexión
                  </>
                )}
              </div>
              {databaseInfo.type === "sqlite" && databaseInfo.config.sqlitePath && (
                <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={databaseInfo.config.sqlitePath}>
                  {databaseInfo.config.sqlitePath}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={fetchDatabaseInfo}
              className="text-sm text-primary hover:underline"
            >
              Ver información de DB
            </button>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* MCP Server Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          <Plug className="w-3.5 h-3.5 inline mr-1.5" />
          Servidor MCP
        </DropdownMenuLabel>
        <div className="px-3 py-2 space-y-3">
          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm">Activar servidor MCP</span>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMcpEnabled(!mcpEnabled); }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none ${mcpEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
              aria-label={mcpEnabled ? "Desactivar servidor MCP" : "Activar servidor MCP"}
            >
              <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform ${mcpEnabled ? "translate-x-4.5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* API Key */}
          {mcpEnabled && (
            <>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">API Key</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMcpKey(!showMcpKey); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showMcpKey ? "Ocultar key" : "Mostrar key"}
                    >
                      {showMcpKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {mcpApiKey && (
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpKey(); }}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Copiar API key"
                      >
                        {isCopyingKey ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRegenerateMcpKey(); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Regenerar API key"
                      disabled={isRegeneratingKey}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${isRegeneratingKey ? "animate-spin" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="font-mono text-xs bg-muted rounded px-2 py-1 truncate text-muted-foreground">
                  {mcpApiKey
                    ? showMcpKey
                      ? mcpApiKey
                      : `${"•".repeat(Math.min(mcpApiKey.length, 20))}…`
                    : <span className="italic">Sin key — pulsa ↻ para generar</span>
                  }
                </div>
              </div>

              {/* Connect buttons */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">Conectar con:</p>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMcpDocs(true); }}
                    className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                    aria-label="Ver guía de instalación MCP"
                  >
                    <BookOpen className="h-3 w-3" />
                    Guía de instalación
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpConfig("claude"); }}
                    className="flex-1 text-xs px-2 py-1.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                  >
                    Claude Desktop
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyMcpConfig("cursor"); }}
                    className="flex-1 text-xs px-2 py-1.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
                  >
                    Cursor / Cline
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground/60 font-mono truncate" title={mcpUrl}>
                  {mcpUrl}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Versión de la app */}
        <div className="px-3 py-2 border-t border-border/40 mt-1">
          <p className="text-[10px] text-muted-foreground/50 text-center select-none">
            Stacklume v{process.env.NEXT_PUBLIC_APP_VERSION ?? "—"}
          </p>
        </div>
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
