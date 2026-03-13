"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Trash2, AlertCircle, Cpu, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/stores/settings-store";
import { useWidgetStore } from "@/stores/widget-store";
import { isTauriWebView } from "@/lib/desktop";
import type { Widget } from "@/types/widget";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

const SUGGESTED_PROMPTS = [
  "¿Qué tengo guardado para desarrollo mobile?",
  "Dame las mejores herramientas de backend de mi biblioteca",
  "¿Qué recursos tengo para aprender IA/ML?",
  "¿Qué me falta en mi stack de frontend?",
  "Recomiéndame algo de mi biblioteca para empezar un proyecto",
  "¿Qué enlaces tengo sin categorizar?",
];

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";

  const renderContent = (text: string) => {
    const parts = text.split(/(\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        return (
          <a
            key={i}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:opacity-80 break-all"
            onClick={(e) => {
              e.preventDefault();
              if (
                typeof window !== "undefined" &&
                (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__
              ) {
                import("@/lib/desktop").then(({ openExternalUrl }) => openExternalUrl(match[2]));
              } else {
                window.open(match[2], "_blank");
              }
            }}
          >
            {match[1]}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {!isUser ? renderContent(msg.content) : msg.content}
      </div>
    </div>
  );
}

export function OllamaChatWidget({ widget }: { widget: Widget }) {
  const isDesktop = isTauriWebView();
  const ollamaEnabled = useSettingsStore((s) => s.ollamaEnabled);
  const ollamaUrl = useSettingsStore((s) => s.ollamaUrl);
  const ollamaModel = useSettingsStore((s) => s.ollamaModel);

  const config = (widget.config ?? {}) as { messages?: ChatMessage[] };
  const [messages, setMessages] = useState<ChatMessage[]>(
    Array.isArray(config.messages) ? config.messages : []
  );
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Limpiar petición en vuelo al desmontar
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const saveMessages = useCallback(
    (msgs: ChatMessage[]) => {
      const currentWidget = useWidgetStore.getState().widgets.find((w) => w.id === widget.id);
      const currentConfig = currentWidget?.config ?? {};
      useWidgetStore.getState().updateWidget(widget.id, {
        config: { ...currentConfig, messages: msgs },
      });
    },
    [widget.id]
  );

  const handleClear = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([]);
    setError(null);
    saveMessages([]);
  }, [saveMessages]);

  const handleSend = useCallback(
    async (text?: string) => {
      const query = (text ?? input).trim();
      if (!query || isLoading) return;

      setInput("");
      setError(null);

      const userMsg: ChatMessage = { role: "user", content: query, timestamp: Date.now() };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setIsLoading(true);

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        // 1. Iniciar job — responde inmediatamente con jobId (no bloquea WebView2)
        const startRes = await fetch("/api/ollama/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel ?? "llama3.2",
            ollamaUrl: ollamaUrl ?? "http://localhost:11434",
            userMessage: query,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: abort.signal,
        });

        const startData = (await startRes.json()) as { jobId?: string; error?: string };

        if (!startRes.ok || !startData.jobId) {
          throw new Error(startData.error ?? `Error ${startRes.status}`);
        }

        const { jobId } = startData;

        // 2. Polling cada 1 segundo hasta completarse, abortarse o agotar el tiempo
        const MAX_POLLS = 150; // 150s máximo (el timeout de Ollama en el servidor es 120s)
        let pollCount = 0;

        while (!abort.signal.aborted && pollCount < MAX_POLLS) {
          pollCount++;

          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 1000);
            abort.signal.addEventListener("abort", () => { clearTimeout(timer); resolve(); }, { once: true });
          });

          if (abort.signal.aborted) break;

          const pollRes = await fetch(`/api/ollama/chat?jobId=${encodeURIComponent(jobId)}`, {
            signal: abort.signal,
          });

          if (!pollRes.ok) {
            const errData = (await pollRes.json()) as { error?: string };
            throw new Error(errData.error ?? `Error al consultar job (${pollRes.status})`);
          }

          const pollData = (await pollRes.json()) as {
            status: "pending" | "done" | "error";
            content?: string;
            error?: string;
          };

          if (pollData.status === "pending") continue;

          if (pollData.status === "error") {
            throw new Error(pollData.error ?? "Error al procesar la respuesta");
          }

          // status === "done"
          const assistantMsg: ChatMessage = {
            role: "assistant",
            content: pollData.content || "(sin respuesta)",
            timestamp: Date.now(),
          };
          const finalMessages = [...nextMessages, assistantMsg];
          setMessages(finalMessages);
          saveMessages(finalMessages);
          break;
        }

        if (pollCount >= MAX_POLLS && !abort.signal.aborted) {
          throw new Error("Tiempo de espera agotado. El modelo tardó demasiado en responder.");
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages(nextMessages);
        setError(err instanceof Error ? err.message : "Error al conectar con Ollama");
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [input, isLoading, messages, ollamaUrl, ollamaModel, saveMessages]
  );

  if (!isDesktop) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Bot className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Asistente IA</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Disponible solo en la app de escritorio
          </p>
        </div>
      </div>
    );
  }

  if (!ollamaEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-4 text-center">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <Cpu className="w-5 h-5 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Ollama no activado</p>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-[200px]">
            Ve a Ajustes → IA Local para configurar Ollama
          </p>
        </div>
      </div>
    );
  }

  const effectiveModel = ollamaModel ?? "llama3.2";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-medium flex-1 truncate">{effectiveModel}</span>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={handleClear}
            title="Limpiar conversación"
            disabled={isLoading}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-3 min-h-0"
      >
        {messages.length === 0 && !isLoading ? (
          <div className="flex flex-col gap-1.5 py-2">
            <p className="text-[10px] text-muted-foreground text-center mb-1">
              Pregúntame sobre tu biblioteca
            </p>
            {SUGGESTED_PROMPTS.slice(0, 4).map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="text-left text-xs px-2.5 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground/80 hover:text-foreground transition-colors border border-border/30 hover:border-border/60 leading-snug"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            {isLoading && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="bg-muted rounded-xl rounded-bl-sm px-3 py-2.5">
                  <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="flex items-start gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border/50 shrink-0">
        <div className="flex gap-1.5 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isLoading ? "Procesando..." : "Pregunta sobre tu biblioteca..."}
            rows={1}
            className={cn(
              "flex-1 resize-none bg-muted/50 rounded-lg px-2.5 py-1.5 text-xs",
              "border border-border/30 focus:border-primary/50 focus:outline-none focus:ring-0",
              "placeholder:text-muted-foreground/50 transition-colors min-h-[32px] max-h-[80px]",
              "leading-relaxed"
            )}
            style={{ height: "32px", overflowY: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "32px";
              el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
            }}
            disabled={isLoading}
          />
          <Button
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
