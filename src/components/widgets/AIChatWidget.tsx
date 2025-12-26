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
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
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

// Simulated AI responses based on keywords
const AI_RESPONSES: Record<string, string[]> = {
  hola: [
    "Hola! Soy tu asistente de IA simulado. Puedo ayudarte a organizar tus pensamientos.",
    "Hola! Aunque soy una IA simulada, puedo ser util para hacer brainstorming.",
    "Hola! Estoy aqui para ayudarte. Que tienes en mente?",
  ],
  ayuda: [
    "Puedo ayudarte con:\n- Lluvia de ideas\n- Organizar pensamientos\n- Tomar notas rapidas\n- Recordatorios simples\n\nEscribe lo que necesites!",
    "Soy un chat simulado, pero puedo ser util para:\n- Escribir borradores\n- Hacer listas\n- Reflexionar sobre ideas",
  ],
  gracias: [
    "De nada! Estoy aqui cuando me necesites.",
    "Un placer ayudar! Cualquier cosa, aqui estoy.",
    "No hay de que! Sigue explorando tus ideas.",
  ],
  ideas: [
    "Algunas tecnicas para generar ideas:\n1. Brainstorming libre\n2. Mind mapping\n3. Pregunta 'Por que?' 5 veces\n4. Invierte el problema\n5. Combina conceptos aleatorios",
    "Para nuevas ideas, intenta:\n- Escribir sin juzgar\n- Cambiar de ambiente\n- Buscar inspiracion en otros campos",
  ],
  productividad: [
    "Consejos de productividad:\n1. Usa la tecnica Pomodoro\n2. Prioriza con la matriz Eisenhower\n3. Bloquea tiempo para trabajo profundo\n4. Revisa y ajusta tus metas semanalmente",
    "Para ser mas productivo:\n- Define 3 tareas clave al dia\n- Minimiza distracciones\n- Toma descansos regulares",
  ],
  proyecto: [
    "Para planificar un proyecto:\n1. Define el objetivo final\n2. Divide en tareas pequenas\n3. Establece fechas limite\n4. Identifica dependencias\n5. Revisa el progreso regularmente",
    "Estructura tu proyecto:\n- Vision y objetivos\n- Milestones principales\n- Tareas semanales\n- Metricas de exito",
  ],
  codigo: [
    "Tips de programacion:\n1. Escribe codigo limpio y legible\n2. Usa control de versiones\n3. Haz pruebas unitarias\n4. Documenta lo importante\n5. Refactoriza regularmente",
    "Mejores practicas:\n- KISS: Mantenlo simple\n- DRY: No te repitas\n- SOLID: Principios de diseno\n- Code review: Aprende de otros",
  ],
  default: [
    "Interesante! Cuentame mas sobre eso.",
    "Entiendo. Que mas puedo ayudarte con ese tema?",
    "Buena pregunta! Aunque soy una IA simulada, puedo ayudarte a explorar esa idea.",
    "Me parece un tema fascinante. Quieres profundizar?",
    "AI respuesta simulada: He procesado tu mensaje. En que mas puedo asistirte?",
    "Tomo nota de eso. Tienes mas ideas relacionadas?",
  ],
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

function getAIResponse(userMessage: string): string {
  const lowerMessage = userMessage.toLowerCase();

  // Check for keywords
  for (const [keyword, responses] of Object.entries(AI_RESPONSES)) {
    if (keyword !== "default" && lowerMessage.includes(keyword)) {
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Default response
  const defaultResponses = AI_RESPONSES.default;
  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

export function AIChatWidget({ widget }: AIChatWidgetProps) {
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isTyping]);

  const handleSendMessage = useCallback(() => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date().toISOString(),
    };

    // Add user message
    const updatedMessages = [...messages, userMessage];
    updateConfig({ chatMessages: updatedMessages });
    setInputValue("");

    // Simulate AI typing
    setIsTyping(true);

    // Generate and add AI response after a delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: generateId(),
        role: "assistant",
        content: getAIResponse(userMessage.content),
        timestamp: new Date().toISOString(),
      };

      updateConfig({ chatMessages: [...updatedMessages, aiResponse] });
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  }, [inputValue, messages, updateConfig]);

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

  // Empty state
  if (messages.length === 0 && !isTyping) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col h-full">
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-6">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center mb-3 @md:w-14 @md:h-14">
              <Bot className="w-6 h-6 text-white @md:w-7 @md:h-7" />
            </div>
            <p className="text-sm font-medium mb-1 @md:text-base">Chat IA Simulado</p>
            <p className="text-xs text-muted-foreground mb-4 max-w-[200px] @md:text-sm @md:max-w-[250px]">
              Haz preguntas, lluvia de ideas o toma notas conversacionales
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["hola", "ideas", "ayuda"].map((suggestion) => (
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

            {/* Typing indicator */}
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
