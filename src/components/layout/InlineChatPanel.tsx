"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  Send,
  Bot,
  Download,
  AlertCircle,
  Trash2,
  Wrench,
  Loader2,
  Plus,
  Check,
  ExternalLink,
  Brain,
  ChevronDown,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLinksStore } from "@/stores/links-store";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool-info";
  content: string;
  reasoningContent?: string;
  isError?: boolean;
}

type LlmStatus =
  | "no_binary"
  | "no_model"
  | "starting"
  | "ready"
  | "error"
  | "checking";

interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
}

// ─── Modelo por defecto ────────────────────────────────────────────────────────

const DEFAULT_MODEL_URL =
  "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf";
const DEFAULT_MODEL_NAME = "Qwen3.5-2B-Q4_K_M.gguf";
const MODEL_SIZE_GB = "1.3";
const MMPROJ_SIZE_MB = "668";

// ─── Utilidades Tauri ─────────────────────────────────────────────────────────

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

// ─── Renderizado enriquecido de mensajes ──────────────────────────────────────

interface ParsedLink {
  title: string;
  url: string;
  desc?: string;
}

/** Extrae bloques "N. Título\n   URL\n   Desc opcional" del texto de un mensaje */
function parseMessageParts(content: string) {
  type Part = { type: "text"; text: string } | { type: "link"; link: ParsedLink };
  const parts: Part[] = [];
  let lastIdx = 0;
  // Formato: "1. **Título opcional bold**\n   https://url\n   descripción opcional"
  const re = /(\d+)\.\s+(.*?)\n[ \t]+(https?:\/\/[^\s\n]+)(?:\n[ \t]+([^\n]+))?/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(content)) !== null) {
    if (match.index > lastIdx) {
      parts.push({ type: "text", text: content.slice(lastIdx, match.index) });
    }
    const title = match[2].replace(/\*{1,2}/g, "").trim();
    const url = match[3].trim();
    const desc = match[4]?.trim();
    parts.push({ type: "link", link: { title, url, desc } });
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < content.length) {
    parts.push({ type: "text", text: content.slice(lastIdx) });
  }

  return parts;
}

/** Tarjeta de un link individual con botón para abrir y añadir a Stacklume */
function ChatLinkCard({ link, onAdded }: { link: ParsedLink; onAdded: () => void }) {
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "exists" | "error">("idle");

  // Declarar antes de los callbacks para evitar TDZ y claridad
  const urlShort = link.url.replace(/^https?:\/\//, "");
  // Quitar "[Categoría]" del título para display limpio
  const displayTitle = link.title.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || urlShort;

  const openLink = () => {
    tauriInvoke("open_url", { url: link.url }).catch(() => {
      window.open(link.url, "_blank", "noopener,noreferrer");
    });
  };

  const addToLibrary = async () => {
    if (status !== "idle") return;
    setStatus("adding");
    try {
      // Limpiar "[Categoría]" que CASO 3 añade al título para display
      const cleanTitle = link.title.replace(/\s*\[[^\]]+\]\s*$/, "").trim() || urlShort;
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: link.url, title: cleanTitle }),
      });
      if (res.status === 409) {
        setStatus("exists");
      } else if (res.ok) {
        setStatus("added");
        onAdded();
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  return (
    <div className="mt-1.5 rounded-lg border border-border/60 bg-background/60 p-2 text-xs">
      <div className="flex items-start gap-1.5">
        <button onClick={openLink} className="flex-1 text-left min-w-0" title={link.url}>
          <span className="font-medium text-primary hover:underline block truncate">
            {displayTitle}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 mt-0.5">
            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{urlShort.length > 48 ? urlShort.slice(0, 48) + "…" : urlShort}</span>
          </span>
        </button>
        <button
          onClick={addToLibrary}
          disabled={status !== "idle"}
          title={
            status === "added" ? "Añadido a Stacklume" :
            status === "exists" ? "Ya está en tu biblioteca" :
            status === "error" ? "Error al añadir" :
            "Añadir a Stacklume"
          }
          className={cn(
            "shrink-0 w-6 h-6 rounded-md flex items-center justify-center transition-colors mt-0.5",
            status === "idle" && "text-muted-foreground hover:text-primary hover:bg-primary/10",
            status === "adding" && "text-muted-foreground",
            status === "added" && "text-green-500 bg-green-500/10",
            status === "exists" && "text-muted-foreground bg-secondary",
            status === "error" && "text-destructive",
          )}
        >
          {status === "idle" && <Plus className="w-3.5 h-3.5" />}
          {status === "adding" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {(status === "added" || status === "exists") && <Check className="w-3.5 h-3.5" />}
          {status === "error" && <AlertCircle className="w-3.5 h-3.5" />}
        </button>
      </div>
      {link.desc && (
        <p className="text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{link.desc}</p>
      )}
    </div>
  );
}

/** Burbuja colapsable que muestra el razonamiento interno del modelo */
function ThinkingBubble({ content }: { content: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <Brain className="w-3 h-3" />
        <span>Razonamiento</span>
        <ChevronDown className={cn("w-3 h-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
      {isOpen && (
        <div className="mt-1.5 text-[10px] text-muted-foreground bg-muted/40 border border-border/40 rounded-lg p-2.5 max-h-[180px] overflow-y-auto whitespace-pre-wrap font-mono leading-relaxed">
          {content}
        </div>
      )}
    </div>
  );
}

/** Renderiza el contenido de un mensaje, convirtiendo listas de links en tarjetas interactivas */
function ChatMessageContent({ content, onLinkAdded }: { content: string; onLinkAdded: () => void }) {
  const parts = parseMessageParts(content);
  const hasLinks = parts.some((p) => p.type === "link");

  if (!hasLinks) {
    return <span className="whitespace-pre-wrap break-words">{content}</span>;
  }

  return (
    <div className="break-words">
      {parts.map((part, i) => {
        if (part.type === "text") {
          const text = part.text.replace(/^\n+/, "").replace(/\n+$/, "");
          if (!text) return null;
          return <p key={i} className="whitespace-pre-wrap mb-1">{text}</p>;
        }
        return <ChatLinkCard key={i} link={part.link} onAdded={onLinkAdded} />;
      })}
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

interface InlineChatPanelProps {
  open: boolean;
  onClose: () => void;
}

export function InlineChatPanel({ open, onClose }: InlineChatPanelProps) {
  const { t } = useTranslation();
  const refreshAllData = useLinksStore((s) => s.refreshAllData);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [llmStatus, setLlmStatus] = useState<LlmStatus>("checking");
  const [downloadProgress, setDownloadProgress] =
    useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusError, setStatusError] = useState("");
  // Modo razonamiento: cuando está activo el modelo "piensa" antes de responder
  const [enableThinking, setEnableThinking] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("stacklume-llm-thinking") === "true";
    }
    return false;
  });

  // Estado para imagen adjunta (visión)
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [visionAvailable, setVisionAvailable] = useState(false);
  const [isDownloadingMmproj, setIsDownloadingMmproj] = useState(false);
  const [mmprojProgress, setMmprojProgress] = useState<DownloadProgress | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const unlistenRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Comprobar estado LLM cuando se abre el panel
  useEffect(() => {
    if (!open) return;
    checkLlmStatus();
  }, [open]);

  // Focus en textarea cuando llm está listo y el panel está abierto
  useEffect(() => {
    if (open && llmStatus === "ready") {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open, llmStatus]);

  // Escuchar cambios de estado desde Rust
  useEffect(() => {
    if (!open) return;

    let unlisten: (() => void) | null = null;
    tauriListen("llm:status-changed", (payload) => {
      const newStatus = String(payload);
      if (newStatus === "ready") {
        setLlmStatus("ready");
        setIsDownloading(false);
        setDownloadProgress(null);
        addWelcomeMessage();
      } else if (newStatus.startsWith("error")) {
        setLlmStatus("error");
        setStatusError(newStatus.replace("error: ", ""));
        setIsDownloading(false);
      }
    }).then((fn) => {
      unlisten = fn;
      unlistenRef.current = fn;
    });

    return () => {
      if (unlisten) unlisten();
    };
  }, [open]);

  // Limpiar polling al desmontar
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (unlistenRef.current) unlistenRef.current();
    };
  }, []);

  const checkLlmStatus = useCallback(async () => {
    setLlmStatus("checking");
    // Comprobar si el mmproj (visión) está disponible en paralelo
    tauriInvoke<boolean>("check_vision_status").then((ok) => setVisionAvailable(ok)).catch(() => {});
    try {
      // 1. Preguntar al backend Tauri directamente
      const status = await tauriInvoke<string>("get_llm_status");
      if (status === "ready") {
        setLlmStatus("ready");
        if (messages.length === 0) addWelcomeMessage();
      } else if (status === "no_binary") {
        setLlmStatus("no_binary");
      } else if (status === "no_model") {
        setLlmStatus("no_model");
      } else if (status === "starting") {
        setLlmStatus("starting");
        // Sondear hasta que esté listo
        pollUntilReady();
      } else {
        setLlmStatus("error");
        setStatusError(status.startsWith("error: ") ? status.slice(7) : status);
      }
    } catch {
      // Fallback: comprobar la API route
      try {
        const res = await fetch("/api/llm/status");
        const data = await res.json();
        if (data.ready) {
          setLlmStatus("ready");
          if (messages.length === 0) addWelcomeMessage();
        } else {
          setLlmStatus("no_model");
        }
      } catch {
        setLlmStatus("no_binary");
      }
    }
  }, [messages.length]);

  const pollUntilReady = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const status = await tauriInvoke<string>("get_llm_status");
        if (status === "ready") {
          setLlmStatus("ready");
          if (pollingRef.current) clearInterval(pollingRef.current);
          if (messages.length === 0) addWelcomeMessage();
        } else if (status.startsWith("error")) {
          setLlmStatus("error");
          setStatusError(status.startsWith("error: ") ? status.slice(7) : status);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      } catch {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }
    }, 2000);
  }, [messages.length]);

  function addWelcomeMessage() {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: t("llmChat.welcomeMessage"),
        },
      ];
    });
  }

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress({ downloaded: 0, total: 0, percent: 0 });
    setStatusError("");

    // Escuchar eventos de progreso
    const unlisten = await tauriListen(
      "llm:download-progress",
      (payload) => {
        const p = payload as DownloadProgress;
        setDownloadProgress(p);
      }
    );

    try {
      await tauriInvoke("download_llm_model", {
        url: DEFAULT_MODEL_URL,
        modelName: DEFAULT_MODEL_NAME,
      });
      // Descarga completada — transición inmediata a "iniciando"
      setIsDownloading(false);
      setDownloadProgress(null);
      setLlmStatus("starting");
      pollUntilReady();
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : String(err));
      setIsDownloading(false);
      setDownloadProgress(null);
      setLlmStatus("no_model");
    } finally {
      unlisten();
    }
  };

  const handleDownloadMmproj = async () => {
    setIsDownloadingMmproj(true);
    setMmprojProgress({ downloaded: 0, total: 0, percent: 0 });
    setStatusError("");

    const unlisten = await tauriListen("llm:download-progress", (payload) => {
      const p = payload as DownloadProgress;
      setMmprojProgress(p);
    });

    try {
      await tauriInvoke("download_mmproj");
      // Reiniciar llama-server para que cargue el mmproj
      await tauriInvoke("stop_llama_server");
      setLlmStatus("starting");
      await tauriInvoke("start_llama_server");
      pollUntilReady();
      setVisionAvailable(true);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDownloadingMmproj(false);
      setMmprojProgress(null);
      unlisten();
    }
  };

  const handleImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setImagePreviewUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items || !visionAvailable) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        break;
      }
    }
  };

  const clearImage = () => {
    setImageBase64(null);
    setImagePreviewUrl(null);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;

    const currentImageBase64 = imageBase64;
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    clearImage();
    setIsSending(true);

    try {
      // Construir historial (excluir mensajes de herramientas y errores)
      const history = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .slice(-10) // últimos 10 mensajes para no sobrepasar el contexto
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      // Obtener el puerto de llama-server desde Tauri (necesario en dev mode)
      let llamaPort = 0;
      try {
        llamaPort = await tauriInvoke<number>("get_llama_port");
      } catch { /* ignorar — producción usa LLAMA_PORT env var */ }

      const res = await fetch("/api/llm/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userMessage: text, history, llamaPort, enableThinking, imageBase64: currentImageBase64 }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || "Error al enviar mensaje");
      }

      const { jobId } = await res.json();

      // Añadir indicador de "pensando"
      const thinkingId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: thinkingId, role: "assistant", content: "..." },
      ]);

      // Sondear el resultado
      await pollJobResult(jobId, thinkingId);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: err instanceof Error ? err.message : t("llmChat.errorChat"),
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const pollJobResult = async (jobId: string, thinkingId: string) => {
    const MAX_POLLS = 120; // 120 × 1s = 2 minutos máximo
    let polls = 0;

    const poll = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const interval = setInterval(async () => {
          polls++;
          if (polls > MAX_POLLS) {
            clearInterval(interval);
            reject(new Error("Tiempo de espera agotado"));
            return;
          }

          try {
            const res = await fetch(`/api/llm/chat?jobId=${jobId}`);
            if (!res.ok) {
              clearInterval(interval);
              reject(new Error(`Error HTTP ${res.status}`));
              return;
            }

            const data = await res.json();

            if (data.status === "done") {
              clearInterval(interval);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === thinkingId
                    ? { ...m, content: data.content, reasoningContent: data.reasoningContent }
                    : m
                )
              );
              // Refrescar biblioteca si hubo cambios: guardar (✅), añadir múltiples, eliminar (🗑️), favorito (⭐), mover (Movido)
              if (typeof data.content === "string" &&
                  (data.content.includes("✅") ||
                   data.content.includes("Añadidos") ||
                   data.content.includes("🗑️") ||
                   data.content.includes("favoritos ⭐") ||
                   data.content.includes("Movido a"))) {
                refreshAllData().catch(() => {/* silencioso */});
              }
              resolve();
            } else if (data.status === "error") {
              clearInterval(interval);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === thinkingId
                    ? { ...m, content: data.error, isError: true }
                    : m
                )
              );
              resolve();
            }
            // status === "pending" → seguir sondeando
          } catch {
            clearInterval(interval);
            reject(new Error("Error de conexión"));
          }
        }, 1000);
      });
    };

    await poll();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearHistory = () => {
    setMessages([]);
    if (llmStatus === "ready") {
      setTimeout(addWelcomeMessage, 50);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 0.1) return `${gb.toFixed(2)} GB`;
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed right-0 top-12 bottom-0 z-50 w-80 sm:w-96"
          >
          <div className="absolute inset-0 flex flex-col border-l border-border shadow-2xl bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold">{t("llmChat.title")}</span>
                {llmStatus === "ready" && (
                  <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                )}
                {llmStatus === "starting" && (
                  <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                )}
              </div>
              <div className="flex items-center gap-1">
                {llmStatus === "ready" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 transition-colors",
                      enableThinking
                        ? "text-primary hover:text-primary/80"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      const next = !enableThinking;
                      setEnableThinking(next);
                      localStorage.setItem("stacklume-llm-thinking", String(next));
                    }}
                    title={enableThinking ? "Desactivar razonamiento" : "Activar razonamiento"}
                  >
                    <Brain className="w-3.5 h-3.5" />
                  </Button>
                )}
                {messages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={clearHistory}
                    title={t("llmChat.clearHistory")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Contenido */}
            <div className="flex-1 min-h-0 flex flex-col">
              {/* Estado: sin binario */}
              {llmStatus === "no_binary" && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-3">
                  <AlertCircle className="w-10 h-10 text-muted-foreground opacity-50" />
                  <p className="text-sm font-medium">{t("llmChat.noBinary")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("llmChat.noBinaryDesc")}
                  </p>
                </div>
              )}

              {/* Estado: sin modelo / descarga */}
              {(llmStatus === "no_model" || isDownloading) && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
                  <Bot className="w-12 h-12 text-primary opacity-70" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{t("llmChat.noModel")}</p>
                    <p className="text-xs text-muted-foreground max-w-[260px]">
                      {t("llmChat.noModelDesc", { size: MODEL_SIZE_GB })}
                    </p>
                  </div>

                  {isDownloading ? (
                    <div className="w-full space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{t("llmChat.downloading")}</span>
                        <span>
                          {downloadProgress && downloadProgress.downloaded > 0
                            ? `${formatBytes(downloadProgress.downloaded)} / ${downloadProgress.total > 0 ? formatBytes(downloadProgress.total) : "~1.35 GB"}`
                            : t("llmChat.connecting")}
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                        {downloadProgress && downloadProgress.downloaded > 0 ? (
                          <motion.div
                            className="h-2 rounded-full bg-primary"
                            initial={{ width: "0%" }}
                            animate={{ width: `${Math.max(downloadProgress.percent, 0.5)}%` }}
                            transition={{ ease: "linear", duration: 0.3 }}
                          />
                        ) : (
                          // Barra indeterminada mientras conecta (aún no llegan bytes)
                          <motion.div
                            className="h-2 rounded-full bg-primary"
                            animate={{ x: ["-100%", "200%"] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            style={{ width: "40%" }}
                          />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {downloadProgress && downloadProgress.downloaded > 0
                          ? `${downloadProgress.percent}%`
                          : t("llmChat.waitingData")}
                      </p>
                    </div>
                  ) : (
                    <Button
                      onClick={handleDownload}
                      className="gap-2"
                      disabled={isDownloading}
                    >
                      <Download className="w-4 h-4" />
                      {t("llmChat.downloadModel", { size: MODEL_SIZE_GB })}
                    </Button>
                  )}

                  {statusError && (
                    <p className="text-xs text-destructive max-w-[260px]">
                      {t("llmChat.errorDownload")}: {statusError}
                    </p>
                  )}
                </div>
              )}

              {/* Estado: iniciando */}
              {llmStatus === "starting" && !isDownloading && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground text-center">
                    {t("llmChat.starting")}
                  </p>
                </div>
              )}

              {/* Estado: comprobando */}
              {llmStatus === "checking" && (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {/* Estado: error */}
              {llmStatus === "error" && !isDownloading && (
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <p className="text-sm font-medium">{t("llmChat.error")}</p>
                  {statusError && (
                    <p className="text-xs text-muted-foreground max-w-[260px]">
                      {statusError}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setLlmStatus("starting");
                      setStatusError("");
                      try {
                        await tauriInvoke("start_llama_server");
                      } catch {
                        // start_llama_server siempre retorna Ok, el error llega por evento
                      }
                      pollUntilReady();
                    }}
                  >
                    {t("llmChat.retry")}
                  </Button>
                </div>
              )}

              {/* Chat activo */}
              {llmStatus === "ready" && (
                <>
                  {/* Mensajes */}
                  <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role === "tool-info" ? (
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1">
                            <Wrench className="w-3 h-3" />
                            <span>{msg.content}</span>
                          </div>
                        ) : (
                          <div
                            className={cn(
                              "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : msg.isError
                                ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
                                : "bg-secondary text-secondary-foreground rounded-bl-sm",
                              msg.content === "..." && "animate-pulse"
                            )}
                          >
                            {msg.content === "..." ? (
                              <span className="inline-flex gap-1">
                                <span className="animate-bounce [animation-delay:0ms]">·</span>
                                <span className="animate-bounce [animation-delay:150ms]">·</span>
                                <span className="animate-bounce [animation-delay:300ms]">·</span>
                              </span>
                            ) : (
                              <>
                                {msg.role === "assistant" && msg.reasoningContent && (
                                  <ThinkingBubble content={msg.reasoningContent} />
                                )}
                                <ChatMessageContent
                                  content={msg.content}
                                  onLinkAdded={() => refreshAllData().catch(() => {})}
                                />
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Descarga mmproj (visión) */}
                  {!visionAvailable && !isDownloadingMmproj && (
                    <div className="shrink-0 px-3 pb-2">
                      <button
                        onClick={handleDownloadMmproj}
                        className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg px-3 py-2 hover:border-primary/50 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5 shrink-0 text-primary/60" />
                        <span>Activar visión — descarga {MMPROJ_SIZE_MB} MB</span>
                      </button>
                    </div>
                  )}
                  {isDownloadingMmproj && (
                    <div className="shrink-0 px-3 pb-2 space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Descargando visión…
                        </span>
                        <span>{mmprojProgress ? `${mmprojProgress.percent}%` : "…"}</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-1 overflow-hidden">
                        <motion.div
                          className="h-1 rounded-full bg-primary"
                          animate={{ width: `${Math.max(mmprojProgress?.percent ?? 0, 1)}%` }}
                          transition={{ ease: "linear", duration: 0.3 }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Input */}
                  <div className="shrink-0 p-3 border-t border-border">
                    {/* Hint: visión funciona mejor con thinking */}
                    {imagePreviewUrl && !enableThinking && (
                      <p className="text-[10px] text-amber-500/80 mb-1.5 flex items-center gap-1">
                        <Brain className="w-3 h-3" />
                        Activa el razonamiento 🧠 para mejores resultados con imágenes
                      </p>
                    )}
                    {/* Preview de imagen adjunta */}
                    {imagePreviewUrl && (
                      <div className="relative inline-flex mb-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imagePreviewUrl}
                          alt="Imagen adjunta"
                          className="max-h-20 max-w-[200px] rounded-lg border border-border object-cover"
                        />
                        <button
                          onClick={clearImage}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-background border border-border rounded-full flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex gap-2 items-end">
                      <Textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={visionAvailable ? t("llmChat.inputPlaceholder") + " (Ctrl+V para imagen)" : t("llmChat.inputPlaceholder")}
                        className="min-h-[40px] max-h-[120px] resize-none text-sm leading-relaxed"
                        rows={1}
                        disabled={isSending}
                      />
                      {visionAvailable && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => fileInputRef.current?.click()}
                          title="Adjuntar imagen"
                          disabled={isSending}
                        >
                          <ImageIcon className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={sendMessage}
                        disabled={(!input.trim() && !imageBase64) || isSending}
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
                      {t("llmChat.enterToSend")}
                    </p>
                    {/* Input de archivo oculto para adjuntar imágenes */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageFile(file);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
