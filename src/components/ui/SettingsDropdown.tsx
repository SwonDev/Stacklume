"use client";

import { Sun, Moon, Monitor, Grid2x2, MessageSquare, Zap, Settings, Download, Copy, LayoutGrid, Kanban, List, Volume2, VolumeX, Database, HardDrive, Cloud, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
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
import { useSettingsStore } from "@/stores/settings-store";
import { useEffect } from "react";

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
    setTheme: setStoredTheme,
    setViewDensity,
    setViewMode,
    setShowTooltips,
    setReduceMotion,
    setStickerSoundVolume,
    fetchDatabaseInfo,
  } = useSettingsStore();

  // Sync theme from store to next-themes on mount
  useEffect(() => {
    if (storedTheme && currentTheme !== storedTheme) {
      setTheme(storedTheme);
    }
  }, [storedTheme, currentTheme, setTheme]);

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setStoredTheme(newTheme);
  };

  return (
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
      <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto scrollbar-thin">
        <DropdownMenuLabel className="text-xs font-semibold">Configuración</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Theme Section */}
        <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
          <Sun className="w-3.5 h-3.5 inline mr-1.5" />
          Tema
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup value={currentTheme} onValueChange={(value) => handleThemeChange(value as "light" | "dark" | "system")}>
          <DropdownMenuRadioItem value="light">
            <Sun className="mr-2 h-4 w-4" />
            Claro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="mr-2 h-4 w-4" />
            Oscuro
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Monitor className="mr-2 h-4 w-4" />
            Sistema
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

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
        <DropdownMenuItem onClick={onOpenImportExport}>
          <Download className="mr-2 h-4 w-4" />
          Importar / Exportar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenDuplicates}>
          <Copy className="mr-2 h-4 w-4" />
          Buscar duplicados
        </DropdownMenuItem>

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
