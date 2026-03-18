"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Download,
  Trash2,
  Check,
  Loader2,
  HardDrive,
  Globe,
  AlertCircle,
  ChevronRight,
  ArrowLeft,
  Key,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface DownloadedModel {
  filename: string;
  displayName: string;
  sizeBytes: number;
  family: string;
  isActive: boolean;
  supportsThinking: boolean;
  supportsVision: boolean;
}

interface HfSearchResult {
  id: string;
  name: string;
  author: string;
  downloads: number;
  likes: number;
  tags: string[];
}

interface HfFile {
  filename: string;
  size: number;
  downloadUrl: string;
  quantization: string;
}

interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  phase?: "connecting" | "downloading";
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tauriInvoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as { invoke?: (cmd: string, args?: unknown) => Promise<T> } | undefined;
  if (internals?.invoke) {
    return internals.invoke(cmd, args);
  }
  return Promise.reject(new Error("Tauri no disponible"));
}

function tauriListen(
  event: string,
  handler: (payload: unknown) => void
): Promise<() => void> {
  const internals = (window as unknown as Record<string, unknown>)
    .__TAURI_INTERNALS__ as
    | { event?: { listen?: (e: string, h: (evt: { payload: unknown }) => void) => Promise<() => void> } }
    | undefined;
  const listen = internals?.event?.listen;
  if (typeof listen === "function") {
    return listen(event, (evt) => handler(evt.payload));
  }
  return Promise.resolve(() => {});
}

// ─── Hardware compatibility ──────────────────────────────────────────────────

interface SystemSpecs {
  cpu: { name: string; cores: number };
  ram: { totalMb: number; availableMb: number };
  gpu: { name: string; vramMb: number; hasCuda?: boolean };
}

type FitLevel = "perfect" | "good" | "tight" | "no";

interface FitResult {
  level: FitLevel;
  label: string;
  color: string;
  detail: string; // "GPU 8GB" o "CPU 16GB RAM"
  mode: "gpu" | "hybrid" | "cpu"; // cómo se ejecutaría
}

/** Determina compatibilidad considerando GPU (VRAM) y CPU (RAM) */
function checkFit(fileSizeBytes: number, specs: SystemSpecs | null): FitResult {
  const fileMb = fileSizeBytes / (1024 * 1024);
  const neededMb = fileMb * 1.1 + 200; // modelo + overhead

  if (!specs) return { level: "good", label: "", color: "", detail: "", mode: "cpu" };

  const vram = specs.gpu.vramMb;
  const ram = specs.ram.totalMb;
  const hasCuda = specs.gpu.hasCuda === true;

  // Prioridad 1: GPU completa (mejor rendimiento)
  if (hasCuda && vram > 0 && neededMb < vram * 0.85) {
    const ratio = neededMb / vram;
    if (ratio < 0.5) return { level: "perfect", label: "GPU — perfecto", color: "text-green-500", detail: `${(neededMb/1024).toFixed(1)}/${(vram/1024).toFixed(0)} GB VRAM`, mode: "gpu" };
    return { level: "good", label: "GPU — funciona bien", color: "text-emerald-400", detail: `${(neededMb/1024).toFixed(1)}/${(vram/1024).toFixed(0)} GB VRAM`, mode: "gpu" };
  }

  // Prioridad 2: Híbrido GPU+RAM (si hay VRAM parcial)
  if (hasCuda && vram > 500 && neededMb < vram + ram * 0.6) {
    return { level: "good", label: "GPU+CPU — funciona", color: "text-blue-400", detail: `${(vram/1024).toFixed(0)} GB VRAM + RAM`, mode: "hybrid" };
  }

  // Prioridad 3: CPU only (RAM del sistema)
  const ramRatio = (fileMb * 1.2 + 500) / ram;
  if (ramRatio < 0.5) return { level: "good", label: "CPU — funciona bien", color: "text-emerald-400", detail: `~${((fileMb*1.2+500)/1024).toFixed(1)} GB de ${(ram/1024).toFixed(0)} GB RAM`, mode: "cpu" };
  if (ramRatio < 0.75) return { level: "good", label: "CPU — funciona", color: "text-yellow-400", detail: `~${((fileMb*1.2+500)/1024).toFixed(1)} GB de ${(ram/1024).toFixed(0)} GB RAM`, mode: "cpu" };
  if (ramRatio < 0.95) return { level: "tight", label: "CPU — puede ir lento", color: "text-amber-400", detail: `~${((fileMb*1.2+500)/1024).toFixed(1)} GB de ${(ram/1024).toFixed(0)} GB RAM`, mode: "cpu" };
  return { level: "no", label: "Memoria insuficiente", color: "text-red-400", detail: `Necesita ~${((fileMb*1.2+500)/1024).toFixed(1)} GB`, mode: "cpu" };
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 0.1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ─── Componente principal ────────────────────────────────────────────────────

interface ModelManagementDialogProps {
  open: boolean;
  onClose: () => void;
  onModelChanged: () => void;
}

export function ModelManagementDialog({
  open,
  onClose,
  onModelChanged,
}: ModelManagementDialogProps) {
  // Estado: modelos descargados
  const [models, setModels] = useState<DownloadedModel[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Estado: búsqueda HuggingFace
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<HfSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [repoFiles, setRepoFiles] = useState<HfFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);

  // Estado: descarga
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Estado: HuggingFace token
  const [hfToken, setHfToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [tokenSaved, setTokenSaved] = useState(false);

  // Hardware specs
  const [systemSpecs, setSystemSpecs] = useState<SystemSpecs | null>(null);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar modelos descargados
  const loadModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const data = await tauriInvoke<{ models: DownloadedModel[] }>("list_models");
      setModels(data.models);
    } catch {
      // Silencioso en dev
    } finally {
      setLoadingModels(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadModels();
      tauriInvoke<string>("get_hf_token").then((t) => setHfToken(t || "")).catch(() => {});
      tauriInvoke<SystemSpecs>("get_system_specs").then(setSystemSpecs).catch(() => {});
    }
  }, [open, loadModels]);

  // Buscar en HuggingFace con debounce
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/llm/models/search?q=${encodeURIComponent(q + " gguf")}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.models ?? []);
      }
    } catch {
      // Silencioso
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(value), 400);
  };

  // Cargar archivos de un repo
  const loadRepoFiles = useCallback(async (repoId: string) => {
    setSelectedRepo(repoId);
    setLoadingFiles(true);
    setRepoFiles([]);
    try {
      const res = await fetch(`/api/llm/models/${encodeURIComponent(repoId)}/files`);
      if (res.ok) {
        const data = await res.json();
        setRepoFiles(data.files ?? []);
      }
    } catch {
      // Silencioso
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  // Cambiar modelo activo
  const handleSwitch = useCallback(async (filename: string) => {
    setSwitching(filename);
    try {
      await tauriInvoke("switch_model", { filename });
      // Primero actualizar la lista local (prefs ya guardadas en Rust)
      await loadModels();
      // Luego notificar al panel de chat que el modelo cambió (pone status "starting")
      onModelChanged();
    } catch (err) {
      console.error("Error al cambiar modelo:", err);
    } finally {
      setSwitching(null);
    }
  }, [onModelChanged, loadModels]);

  // Eliminar modelo
  const handleDelete = useCallback(async (filename: string) => {
    setDeleting(filename);
    try {
      await tauriInvoke("delete_model", { filename });
      await loadModels();
      onModelChanged();
    } catch (err) {
      console.error("Error al eliminar modelo:", err);
    } finally {
      setDeleting(null);
    }
  }, [onModelChanged, loadModels]);

  // Guardar token de HuggingFace
  const saveHfToken = useCallback(async (token: string) => {
    try {
      await tauriInvoke("set_hf_token", { token: token.trim() });
      setTokenSaved(true);
      setTimeout(() => setTokenSaved(false), 2000);
    } catch {
      // Silencioso
    }
  }, []);

  // Descargar modelo desde HuggingFace
  const handleDownload = useCallback(async (url: string, modelName: string, expectedSize?: number) => {
    setDownloading(modelName);
    setDownloadError(null);
    setDownloadProgress({ downloaded: 0, total: 0, percent: 0, phase: "connecting" });

    let receivedBytes = false;
    const unlisten = await tauriListen("llm:download-progress", (payload) => {
      const p = payload as DownloadProgress;
      if (p.downloaded > 0) receivedBytes = true;
      setDownloadProgress(p);
    });

    // Timeout frontend: si después de 90s no llegan bytes, asumir error de conexión
    const timeoutId = setTimeout(() => {
      if (!receivedBytes) {
        setDownloadError("Timeout: no se recibieron datos en 90 segundos. Verifica tu conexión a Internet o prueba más tarde.");
        setDownloading(null);
        setDownloadProgress(null);
      }
    }, 90_000);

    try {
      await tauriInvoke("download_llm_model", { url, modelName, expectedSize: expectedSize || 0 });
      clearTimeout(timeoutId);
      await loadModels();
      setSelectedRepo(null);
      onModelChanged();
    } catch (err) {
      clearTimeout(timeoutId);
      const msg = err instanceof Error ? err.message : String(err);
      setDownloadError(msg);
    } finally {
      setDownloading(null);
      setDownloadProgress(null);
      unlisten();
    }
  }, [onModelChanged, loadModels]);

  // Comprobar si un archivo ya está descargado
  const isDownloaded = (filename: string) => models.some((m) => m.filename === filename);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Gestión de modelos
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="downloaded" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="downloaded" className="gap-1.5 text-xs">
              <HardDrive className="w-3.5 h-3.5" />
              Modelos
              {models.length > 0 && (
                <span className="text-[10px] text-muted-foreground">({models.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5" />
              Descargar
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-1.5 text-xs">
              <Key className="w-3.5 h-3.5" />
              API Key
            </TabsTrigger>
          </TabsList>

          {/* Pestaña: Modelos descargados */}
          <TabsContent value="downloaded" className="flex-1 min-h-0 overflow-y-auto mt-3">
            {loadingModels ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : models.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <HardDrive className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                <p className="text-sm text-muted-foreground">No tienes modelos descargados</p>
                <p className="text-xs text-muted-foreground">
                  Ve a la pestaña HuggingFace para buscar y descargar modelos
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {models.map((model) => (
                  <div
                    key={model.filename}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors",
                      model.isActive
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{model.displayName}</p>
                        {model.isActive && (
                          <span className="shrink-0 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                            Activo
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatSize(model.sizeBytes)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {model.family}
                        </span>
                        {model.supportsThinking && (
                          <span className="text-[10px] text-muted-foreground">🧠</span>
                        )}
                        {model.supportsVision && (
                          <span className="text-[10px] text-muted-foreground">👁</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {!model.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleSwitch(model.filename)}
                          disabled={switching !== null}
                        >
                          {switching === model.filename ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Activar
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(model.filename)}
                        disabled={deleting !== null}
                        title="Eliminar modelo"
                      >
                        {deleting === model.filename ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Pestaña: Buscar en HuggingFace */}
          <TabsContent value="search" className="flex-1 min-h-0 flex flex-col mt-3">
            {selectedRepo ? (
              // Vista de archivos de un repo
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => { setSelectedRepo(null); setRepoFiles([]); }}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{selectedRepo}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Selecciona una variante para descargar
                    </p>
                  </div>
                </div>
                {/* Banner de hardware */}
                {systemSpecs && (
                  <div className="mb-2 px-3 py-2 rounded-lg bg-secondary/50 border border-border/50 shrink-0">
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
                      <span title={systemSpecs.cpu.name}>
                        💻 {systemSpecs.cpu.name.split(" ").slice(0, 3).join(" ")} ({systemSpecs.cpu.cores} hilos)
                      </span>
                      <span>🧠 {(systemSpecs.ram.totalMb / 1024).toFixed(0)} GB RAM</span>
                      {systemSpecs.gpu.name && (
                        <span title={systemSpecs.gpu.name} className={systemSpecs.gpu.hasCuda ? "text-green-400" : ""}>
                          🎮 {systemSpecs.gpu.name.length > 30 ? systemSpecs.gpu.name.split(" ").slice(-3).join(" ") : systemSpecs.gpu.name}
                          {systemSpecs.gpu.vramMb > 0 && ` ${(systemSpecs.gpu.vramMb / 1024).toFixed(0)} GB`}
                          {systemSpecs.gpu.hasCuda && " CUDA"}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto space-y-1.5">
                  {loadingFiles ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : repoFiles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No se encontraron archivos .gguf en este repositorio
                    </p>
                  ) : (
                    repoFiles.map((file) => {
                      const alreadyDownloaded = isDownloaded(file.filename);
                      const isDownloadingThis = downloading === file.filename;
                      return (
                        <div
                          key={file.filename}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{file.filename}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                {formatSize(file.size)}
                              </span>
                              <span className="text-[10px] font-mono bg-secondary px-1 py-0.5 rounded text-muted-foreground">
                                {file.quantization}
                              </span>
                              {(() => {
                                const fit = checkFit(file.size, systemSpecs);
                                if (!fit.label) return null;
                                return (
                                  <span className={cn("text-[10px] font-medium", fit.color)} title={fit.detail}>
                                    ● {fit.label}
                                  </span>
                                );
                              })()}
                            </div>
                            {isDownloadingThis && downloadProgress && (
                              <div className="mt-1.5 space-y-0.5">
                                <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                                  {downloadProgress.percent > 0 ? (
                                    <div
                                      className="h-1.5 rounded-full bg-primary transition-all duration-300"
                                      style={{ width: `${downloadProgress.percent}%` }}
                                    />
                                  ) : (
                                    <div
                                      className="h-1.5 rounded-full bg-primary/60 animate-pulse"
                                      style={{ width: "100%" }}
                                    />
                                  )}
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {downloadProgress.percent > 0
                                    ? `${downloadProgress.percent}% de ${formatSize(file.size)}`
                                    : downloadProgress.phase === "downloading"
                                    ? "Descargando..."
                                    : "Conectando a HuggingFace..."}
                                </p>
                              </div>
                            )}
                          </div>
                          <div className="shrink-0">
                            {alreadyDownloaded ? (
                              <span className="text-[10px] text-primary font-medium flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Descargado
                              </span>
                            ) : isDownloadingThis ? (
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() => handleDownload(file.downloadUrl, file.filename, file.size)}
                                disabled={downloading !== null}
                              >
                                <Download className="w-3 h-3" />
                                Descargar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {downloadError && !downloading && (
                    <div className="mt-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-xs text-destructive flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {downloadError}
                      </p>
                      {downloadError.includes("403") || downloadError.includes("401") ? (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Este modelo puede requerir un token de HuggingFace. Configúralo en la pestaña &quot;API Key&quot;.
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Vista de búsqueda
              <div className="flex-1 flex flex-col min-h-0">
                <div className="relative mb-3 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchInput(e.target.value)}
                    placeholder="Buscar modelos GGUF (ej: qwen, llama, mistral)..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-secondary border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground"
                    autoFocus
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {searching ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="text-center py-12 space-y-2">
                      {searchQuery ? (
                        <>
                          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                          <p className="text-xs text-muted-foreground">
                            Sin resultados para &ldquo;{searchQuery}&rdquo;
                          </p>
                        </>
                      ) : (
                        <>
                          <Globe className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                          <p className="text-sm text-muted-foreground">
                            Busca modelos GGUF en HuggingFace
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Prueba: qwen, llama 3, mistral, phi, gemma
                          </p>
                        </>
                      )}
                    </div>
                  ) : (
                    searchResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => loadRepoFiles(result.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-accent transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{result.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">
                              {result.author}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ↓ {formatNumber(result.downloads)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              ♥ {formatNumber(result.likes)}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Pestaña: Configuración API Key */}
          <TabsContent value="config" className="mt-3 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Token de HuggingFace</p>
              <p className="text-xs text-muted-foreground">
                Necesario para descargar modelos gated o privados. Obtén tu token en{" "}
                <span className="text-primary font-mono">huggingface.co/settings/tokens</span>
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showToken ? "text" : "password"}
                    value={hfToken}
                    onChange={(e) => { setHfToken(e.target.value); setTokenSaved(false); }}
                    placeholder="hf_..."
                    className="w-full pr-9 px-3 py-2 text-sm bg-secondary border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground font-mono"
                  />
                  <button
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    type="button"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 gap-1"
                  onClick={() => saveHfToken(hfToken)}
                >
                  {tokenSaved ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Key className="w-3.5 h-3.5" />}
                  {tokenSaved ? "Guardado" : "Guardar"}
                </Button>
              </div>
              {hfToken && (
                <p className="text-[10px] text-muted-foreground">
                  El token se almacena localmente en tu ordenador y solo se usa para descargas de HuggingFace.
                </p>
              )}
            </div>
            <div className="border-t border-border pt-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Información</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li>Los modelos públicos no requieren token</li>
                <li>Los modelos gated (ej. Llama 3, Mistral) requieren aceptar las condiciones en HuggingFace y un token</li>
                <li>Los modelos se descargan a <span className="font-mono text-[10px]">%APPDATA%/com.stacklume.app/models/</span></li>
                <li>Al eliminar un modelo desde aquí, se borra el archivo del disco</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
