"use client";

import { useState, useEffect, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Copy,
  Type,
  ArrowUpDown,
  Trash2,
  AlignLeft,
  Link2,
  Scissors,
  Hash,
} from "lucide-react";

interface TextToolsWidgetProps {
  widget: Widget;
}

type TextTool =
  | "uppercase"
  | "lowercase"
  | "titlecase"
  | "sentencecase"
  | "reverse"
  | "removeWhitespace"
  | "removeLineBreaks"
  | "urlEncode"
  | "urlDecode"
  | "trim";

export function TextToolsWidget({ widget }: TextToolsWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const [text, setText] = useState<string>("");
  const [result, setResult] = useState<string>("");

  // Load saved text from widget config
  useEffect(() => {
    const savedText = widget.config?.textContent || "";
    setText(savedText);
    setResult(savedText);
  }, [widget.config?.textContent, widget.id]);

  // Save text to widget config with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text !== widget.config?.textContent) {
        useWidgetStore.getState().updateWidget(widget.id, {
          config: {
            ...widget.config,
            textContent: text,
          },
        });
      }
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, widget.id]);

  // Statistics
  const stats = useMemo(() => {
    const chars = result.length;
    const words = result.trim() ? result.trim().split(/\s+/).length : 0;
    const lines = result ? result.split("\n").length : 0;
    return { chars, words, lines };
  }, [result]);

  // Text transformation functions
  const transformText = (tool: TextTool) => {
    if (!text.trim()) {
      toast.error("No hay texto para procesar");
      return;
    }

    let transformed = text;

    try {
      switch (tool) {
        case "uppercase":
          transformed = text.toUpperCase();
          break;

        case "lowercase":
          transformed = text.toLowerCase();
          break;

        case "titlecase":
          transformed = text
            .toLowerCase()
            .split(" ")
            .map((word) => {
              if (word.length === 0) return word;
              return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
          break;

        case "sentencecase":
          transformed = text
            .toLowerCase()
            .replace(/(^\s*\w|[.!?]\s*\w)/g, (match) => match.toUpperCase());
          break;

        case "reverse":
          transformed = text.split("").reverse().join("");
          break;

        case "removeWhitespace":
          transformed = text.replace(/\s+/g, "");
          break;

        case "removeLineBreaks":
          transformed = text.replace(/\n+/g, " ").replace(/\s+/g, " ");
          break;

        case "urlEncode":
          transformed = encodeURIComponent(text);
          break;

        case "urlDecode":
          try {
            transformed = decodeURIComponent(text);
          } catch (_error) {
            toast.error("Error al decodificar URL: texto no válido");
            return;
          }
          break;

        case "trim":
          transformed = text.trim();
          break;

        default:
          transformed = text;
      }

      setResult(transformed);
      toast.success("Texto transformado");

      // Update last tool used
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          lastTool: tool,
        },
      });
    } catch (error) {
      toast.error("Error al procesar el texto");
      console.error(error);
    }
  };

  const handleCopy = async () => {
    if (!result) {
      toast.error("No hay resultado para copiar");
      return;
    }

    try {
      await navigator.clipboard.writeText(result);
      toast.success("Copiado al portapapeles");
    } catch (error) {
      toast.error("Error al copiar");
      console.error(error);
    }
  };

  const handleClear = () => {
    setText("");
    setResult("");
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        textContent: "",
      },
    });
  };

  const toolButtons: Array<{
    tool: TextTool;
    label: string;
    icon: React.ReactNode;
    variant?: "default" | "outline" | "secondary";
  }> = [
    {
      tool: "uppercase",
      label: "MAYÚSCULAS",
      icon: <Type className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "lowercase",
      label: "minúsculas",
      icon: <Type className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "titlecase",
      label: "Título",
      icon: <Type className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "sentencecase",
      label: "Oración",
      icon: <AlignLeft className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "reverse",
      label: "Invertir",
      icon: <ArrowUpDown className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "trim",
      label: "Recortar",
      icon: <Scissors className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "removeWhitespace",
      label: "Sin espacios",
      icon: <Hash className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "removeLineBreaks",
      label: "Sin saltos",
      icon: <AlignLeft className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "urlEncode",
      label: "URL Encode",
      icon: <Link2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
    {
      tool: "urlDecode",
      label: "URL Decode",
      icon: <Link2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />,
    },
  ];

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full w-full gap-2 @sm:gap-3 p-3 @sm:p-4">
        {/* Input Textarea */}
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 @sm:gap-2">
          <label className="text-xs @sm:text-sm font-medium text-muted-foreground">
            Texto de entrada
          </label>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Escribe o pega tu texto aquí..."
            className="h-full min-h-[80px] @xs:min-h-[100px] @sm:min-h-[120px] resize-none text-xs @sm:text-sm"
          />
        </div>

        {/* Tool Buttons - Responsive Grid */}
        <div className="grid grid-cols-2 @xs:grid-cols-3 @sm:grid-cols-4 @md:grid-cols-5 gap-1.5 @sm:gap-2">
          {toolButtons.map(({ tool, label, icon }) => (
            <Button
              key={tool}
              onClick={() => transformText(tool)}
              variant="outline"
              size="sm"
              className="h-7 @xs:h-8 @sm:h-9 text-xs @sm:text-sm gap-1 @sm:gap-1.5 px-2 @sm:px-3"
              disabled={!text.trim()}
            >
              {icon}
              <span className="hidden @xs:inline truncate">{label}</span>
            </Button>
          ))}
        </div>

        {/* Result Textarea */}
        <div className="flex-1 min-h-0 flex flex-col gap-1.5 @sm:gap-2">
          <label className="text-xs @sm:text-sm font-medium text-muted-foreground">
            Resultado
          </label>
          <Textarea
            value={result}
            readOnly
            placeholder="El resultado aparecerá aquí..."
            className="h-full min-h-[80px] @xs:min-h-[100px] @sm:min-h-[120px] resize-none text-xs @sm:text-sm bg-muted/30 cursor-default"
          />
        </div>

        {/* Bottom Bar - Stats and Actions */}
        <div className="border-t pt-2 @sm:pt-3 flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-2 @sm:gap-3">
          {/* Statistics */}
          <div className="flex items-center gap-2 @sm:gap-3 text-xs @sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1 @sm:gap-1.5">
              <Type className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              {stats.chars}
            </span>
            <span className="hidden @xs:inline">{stats.words} palabras</span>
            <span className="hidden @sm:inline">{stats.lines} líneas</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 @sm:gap-2 w-full @sm:w-auto">
            <Button
              onClick={handleCopy}
              variant="default"
              size="sm"
              className="flex-1 @sm:flex-none h-7 @sm:h-8 text-xs @sm:text-sm gap-1 @sm:gap-1.5"
              disabled={!result}
            >
              <Copy className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              Copiar
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="h-7 @sm:h-8 text-xs @sm:text-sm gap-1 @sm:gap-1.5 px-2 @sm:px-3"
              disabled={!text && !result}
            >
              <Trash2 className="w-3 h-3 @sm:w-3.5 @sm:h-3.5" />
              <span className="hidden @sm:inline">Limpiar</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
