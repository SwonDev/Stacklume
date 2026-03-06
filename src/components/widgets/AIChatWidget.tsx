"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot,
  Send,
  Trash2,
  User,
  Sparkles,
  Copy,
  Check,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

interface AIChatWidgetProps {
  widget: Widget;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface AIChatWidgetConfig {
  chatMessages?: ChatMessage[];
}

// ─── Respuestas simuladas (fallback sin MCP) ──────────────────────────────────

const AI_RESPONSES: Record<string, string[]> = {
  hola: [
    "¡Hola! Soy tu asistente de IA simulado. Puedo ayudarte a organizar tus pensamientos.",
    "¡Hola! Aunque soy una IA simulada, puedo ser útil para hacer brainstorming.",
    "¡Hola! Estoy aquí para ayudarte. ¿Qué tienes en mente?",
  ],
  ayuda: [
    "Puedo ayudarte con:\n- Lluvia de ideas\n- Organizar pensamientos\n- Tomar notas rápidas\n- Recordatorios simples\n\n¡Escribe lo que necesites!",
    "Soy un chat simulado, pero puedo ser útil para:\n- Escribir borradores\n- Hacer listas\n- Reflexionar sobre ideas",
  ],
  gracias: [
    "¡De nada! Estoy aquí cuando me necesites.",
    "¡Un placer ayudar! Cualquier cosa, aquí estoy.",
    "¡No hay de qué! Sigue explorando tus ideas.",
  ],
  ideas: [
    "Algunas técnicas para generar ideas:\n1. Brainstorming libre\n2. Mind mapping\n3. Pregunta '¿Por qué?' 5 veces\n4. Invierte el problema\n5. Combina conceptos aleatorios",
    "Para nuevas ideas, intenta:\n- Escribir sin juzgar\n- Cambiar de ambiente\n- Buscar inspiración en otros campos",
  ],
  productividad: [
    "Consejos de productividad:\n1. Usa la técnica Pomodoro\n2. Prioriza con la matriz Eisenhower\n3. Bloquea tiempo para trabajo profundo\n4. Revisa y ajusta tus metas semanalmente",
    "Para ser más productivo:\n- Define 3 tareas clave al día\n- Minimiza distracciones\n- Toma descansos regulares",
  ],
  proyecto: [
    "Para planificar un proyecto:\n1. Define el objetivo final\n2. Divide en tareas pequeñas\n3. Establece fechas límite\n4. Identifica dependencias\n5. Revisa el progreso regularmente",
    "Estructura tu proyecto:\n- Visión y objetivos\n- Milestones principales\n- Tareas semanales\n- Métricas de éxito",
  ],
  codigo: [
    "Tips de programación:\n1. Escribe código limpio y legible\n2. Usa control de versiones\n3. Haz pruebas unitarias\n4. Documenta lo importante\n5. Refactoriza regularmente",
    "Mejores prácticas:\n- KISS: Mantenlo simple\n- DRY: No te repitas\n- SOLID: Principios de diseño\n- Code review: Aprende de otros",
  ],
  default: [
    "¡Interesante! Cuéntame más sobre eso.",
    "Entiendo. ¿En qué más puedo ayudarte con ese tema?",
    "Buena pregunta. ¿Quieres profundizar en esa idea?",
    "Me parece un tema fascinante. ¿Quieres explorar más?",
    "He procesado tu mensaje. ¿En qué más puedo asistirte?",
    "Tomo nota de eso. ¿Tienes más ideas relacionadas?",
  ],
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getSimulatedResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  for (const [keyword, responses] of Object.entries(AI_RESPONSES)) {
    if (keyword !== "default" && lower.includes(keyword)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }
  const defaultResponses = AI_RESPONSES.default;
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// ─── Detector de intención MCP ────────────────────────────────────────────────

interface McpIntent {
  tool: string;
  args: Record<string, unknown>;
}

function detectIntent(message: string): McpIntent | null {
  const lower = message.toLowerCase();

  if (lower.includes("cuántos enlaces") || lower.includes("cuantos enlaces") || lower.includes("total de enlaces")) {
    return { tool: "list_links", args: { limit: 1000 } };
  }
  if (lower.includes("favorito")) {
    return { tool: "list_links", args: { limit: 10 } };
  }
  if (lower.includes("categoría") || lower.includes("categoria") || lower.includes("categorias") || lower.includes("categorías")) {
    return { tool: "list_categories", args: {} };
  }
  if (lower.includes("etiqueta") || lower.includes("tag")) {
    return { tool: "list_tags", args: {} };
  }
  if (lower.includes("widget")) {
    return { tool: "list_widgets", args: {} };
  }
  if (lower.includes("proyecto") || lower.includes("workspace")) {
    return { tool: "list_projects", args: {} };
  }
  if (lower.includes("estadística") || lower.includes("estadistica") || lower.includes("resumen") || lower.includes("info")) {
    return { tool: "get_app_info", args: {} };
  }
  return null;
}

interface McpToolResult {
  content?: Array<{ type: string; text: string }>;
  isError?: boolean;
}

async function callMcp(
  tool: string,
  args: Record<string, unknown>,
  apiKey: string
): Promise<McpToolResult> {
  const response = await fetch("/api/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "tools/call",
      params: { name: tool, arguments: args },
    }),
  });

  if (!response.ok) {
    throw new Error(`Error del servidor MCP: ${response.status}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(json.error.message ?? "Error desconocido del MCP");
  }

  return json.result as McpToolResult;
}

function formatMcpResponse(tool: string, result: McpToolResult, originalMessage: string): string {
  try {
    const text = result.content?.[0]?.text ?? "Sin respuesta";
    const data = JSON.parse(text);
    const lower = originalMessage.toLowerCase();

    if (tool === "get_app_info") {
      const { stats } = data;
      return `Tu dashboard tiene:\n• ${stats.links} enlaces\n• ${stats.categories} categorías\n• ${stats.tags} etiquetas\n• ${stats.widgets} widgets\n• ${stats.projects} proyectos`;
    }

    if (tool === "list_links") {
      if (lower.includes("cuántos") || lower.includes("cuantos") || lower.includes("total")) {
        const count = Array.isArray(data) ? data.length : (data.total ?? data.links?.length ?? "?");
        return `Tienes ${count} enlaces guardados en total.`;
      }
      const links = Array.isArray(data) ? data : (data.links ?? []);
      if (links.length === 0) return "No tienes enlaces guardados aún.";
      const list = links.slice(0, 8).map((l: { title?: string; url?: string }) => `• ${l.title || l.url}`).join("\n");
      return `Tus enlaces recientes:\n${list}${links.length > 8 ? `\n…y ${links.length - 8} más` : ""}`;
    }

    if (tool === "list_categories") {
      const cats = Array.isArray(data) ? data : (data.categories ?? []);
      if (cats.length === 0) return "No tienes categorías creadas aún.";
      const list = cats.map((c: { name?: string }) => `• ${c.name}`).join("\n");
      return `Tus categorías (${cats.length}):\n${list}`;
    }

    if (tool === "list_tags") {
      const tagList = Array.isArray(data) ? data : (data.tags ?? []);
      if (tagList.length === 0) return "No tienes etiquetas creadas aún.";
      const list = tagList.map((t: { name?: string }) => `• ${t.name}`).join("\n");
      return `Tus etiquetas (${tagList.length}):\n${list}`;
    }

    if (tool === "list_widgets") {
      const ws = Array.isArray(data) ? data : (data.widgets ?? []);
      if (ws.length === 0) return "No tienes widgets en el dashboard.";
      return `Tienes ${ws.length} widget${ws.length !== 1 ? "s" : ""} en el dashboard.`;
    }

    if (tool === "list_projects") {
      const ps = Array.isArray(data) ? data : (data.projects ?? []);
      if (ps.length === 0) return "Solo tienes el espacio Home disponible.";
      const list = ps.map((p: { name?: string }) => `• ${p.name}`).join("\n");
      return `Tus proyectos (${ps.length}):\n${list}`;
    }

    return text.length > 300 ? text.slice(0, 300) + "…" : text;
  } catch {
    return result.content?.[0]?.text ?? "No pude interpretar la respuesta.";
  }
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function AIChatWidget({ widget }: AIChatWidgetProps) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mcpEnabled = useSettingsStore((s) => s.mcpEnabled);
  const mcpApiKey = useSettingsStore((s) => s.mcpApiKey);

  const isUsingRealAI = mcpEnabled && !!mcpApiKey;

  const config = widget.config as AIChatWidgetConfig | undefined;
  const messages = config?.chatMessages || [];

  const updateConfig = useCallback(
    (updates: Partial<AIChatWidgetConfig>) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          ...updates,
        } as Record<string, unknown>,
      });
    },
    [widget.id, widget.config]
  );

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    updateConfig({ chatMessages: updatedMessages });
    setInputValue("");
    setIsTyping(true);

    if (isUsingRealAI && mcpApiKey) {
      // Intento MCP real
      try {
        const intent = detectIntent(userMessage.content);

        let responseText: string;

        if (intent) {
          const result = await callMcp(intent.tool, intent.args, mcpApiKey);
          if (result.isError) {
            responseText = `Error al consultar los datos: ${result.content?.[0]?.text ?? "error desconocido"}`;
          } else {
            responseText = formatMcpResponse(intent.tool, result, userMessage.content);
          }
        } else {
          responseText =
            "No entendí esa pregunta. Puedo ayudarte con:\n• ¿Cuántos enlaces tienes?\n• Mostrar categorías\n• Listar etiquetas\n• Ver tus proyectos\n• Resumen del dashboard";
        }

        const aiResponse: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: responseText,
          timestamp: new Date().toISOString(),
        };
        updateConfig({ chatMessages: [...updatedMessages, aiResponse] });
      } catch (error) {
        const aiResponse: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: `Error al conectar con MCP: ${error instanceof Error ? error.message : "error desconocido"}. Verifica que MCP esté habilitado en Configuración.`,
          timestamp: new Date().toISOString(),
        };
        updateConfig({ chatMessages: [...updatedMessages, aiResponse] });
      } finally {
        setIsTyping(false);
      }
    } else {
      // Respuesta simulada con delay
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: generateId(),
          role: "assistant",
          content: getSimulatedResponse(userMessage.content),
          timestamp: new Date().toISOString(),
        };
        updateConfig({ chatMessages: [...updatedMessages, aiResponse] });
        setIsTyping(false);
      }, 800 + Math.random() * 700);
    }
  }, [inputValue, messages, updateConfig, isUsingRealAI, mcpApiKey]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    updateConfig({ chatMessages: [] });
    toast.success("Chat limpiado");
  };

  const handleCopyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      toast.success("Mensaje copiado");
    } catch {
      toast.error("Error al copiar");
    }
  };

  // Estado vacío
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-3 @md:w-14 @md:h-14">
              <Bot className="w-6 h-6 text-white @md:w-7 @md:h-7" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-medium @md:text-base">
                {isUsingRealAI ? "Chat IA con MCP" : "Chat IA Simulado"}
              </p>
              {isUsingRealAI ? (
                <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-violet-500 hover:bg-violet-500">
                  <Zap className="w-2.5 h-2.5 mr-0.5" />
                  IA Real
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                  Demo
                </Badge>
              )}
            </div>
            {isUsingRealAI ? (
              <p className="text-xs text-muted-foreground mb-4 max-w-[220px] @md:text-sm @md:max-w-[260px]">
                Pregúntame sobre tus enlaces, categorías o el estado de tu dashboard
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mb-4 max-w-[200px] @md:text-sm @md:max-w-[250px]">
                Haz preguntas, lluvia de ideas o toma notas conversacionales.{" "}
                <span className="text-primary/80">Activa MCP en Configuración para usar IA real.</span>
              </p>
            )}
            <div className="flex flex-wrap gap-2 justify-center">
              {isUsingRealAI
                ? ["¿Cuántos enlaces tengo?", "Ver categorías", "Resumen del dashboard"].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))
                : ["hola", "ideas", "ayuda"].map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        setInputValue(suggestion);
                        inputRef.current?.focus();
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
            </div>
          </div>

          {/* Input area */}
          <div className="border-t bg-muted/30 p-2 @sm:p-3">
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                className="flex-1 text-sm h-9"
              />
              <Button
                size="sm"
                className="h-9 w-9 p-0"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30 @sm:px-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-medium @sm:text-sm">Chat IA</span>
            {isUsingRealAI ? (
              <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-violet-500 hover:bg-violet-500">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                IA Real
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                Demo
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={handleClearChat}
            title="Limpiar chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1">
          <div className="p-3 space-y-3 @sm:p-4 @sm:space-y-4">
            <AnimatePresence mode="popLayout">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "flex gap-2 group",
                    message.role === "user" && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center @sm:w-7 @sm:h-7",
                      message.role === "user"
                        ? "bg-primary"
                        : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
                    )}
                  >
                    {message.role === "user" ? (
                      <User className="w-3 h-3 text-primary-foreground @sm:w-3.5 @sm:h-3.5" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-white @sm:w-3.5 @sm:h-3.5" />
                    )}
                  </div>
                  <div
                    className={cn(
                      "relative max-w-[80%] rounded-lg px-3 py-2 text-xs @sm:text-sm",
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "absolute -top-2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                        message.role === "user" ? "-left-6" : "-right-6"
                      )}
                      onClick={() => handleCopyMessage(message.content, message.id)}
                    >
                      {copiedId === message.id ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Indicador de escritura */}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center @sm:w-7 @sm:h-7">
                  <Bot className="w-3 h-3 text-white @sm:w-3.5 @sm:h-3.5" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <motion.span
                      className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.span
                      className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t bg-muted/30 p-2 @sm:p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 text-sm h-9"
              disabled={isTyping}
            />
            <Button
              size="sm"
              className="h-9 w-9 p-0"
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isTyping}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
