"use client";

import { useState, useCallback, useEffect } from "react";
import DOMPurify from "dompurify";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Copy,
  Check,
  AlertCircle,
  Braces,
  Settings2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface JSONFormatterWidgetProps {
  widget: Widget;
}

interface JSONError {
  message: string;
  line?: number;
  column?: number;
}

export function JSONFormatterWidget({ widget }: JSONFormatterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  // State
  const [inputJSON, setInputJSON] = useState("");
  const [formattedJSON, setFormattedJSON] = useState("");
  const [error, setError] = useState<JSONError | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFormatted, setIsFormatted] = useState(false);

  // Config from widget
  const indentSize = widget.config?.indentSize ?? 2;
  const sortKeys = widget.config?.sortKeys ?? false;

  // Load saved JSON on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const savedJSON = widget.config?.jsonContent || "";
      if (savedJSON) {
        setInputJSON(savedJSON);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [widget.id, widget.config?.jsonContent]);

  // Save JSON to config
  const saveJSON = useCallback(
    (content: string) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          jsonContent: content,
        },
      });
    },
    [widget.id, widget.config]
  );

  // Update indent size
  const updateIndentSize = useCallback(
    (size: number) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          indentSize: size,
        },
      });
    },
    [widget.id, widget.config]
  );

  // Toggle sort keys
  const toggleSortKeys = useCallback(() => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        sortKeys: !sortKeys,
      },
    });
  }, [widget.id, widget.config, sortKeys]);

  // JSON value type for recursive JSON structures
  type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

  // Sort object keys recursively
  const sortObjectKeys = (obj: JsonValue): JsonValue => {
    if (Array.isArray(obj)) {
      return obj.map(sortObjectKeys);
    } else if (obj !== null && typeof obj === "object") {
      return Object.keys(obj)
        .sort()
        .reduce((sorted: { [key: string]: JsonValue }, key) => {
          sorted[key] = sortObjectKeys(obj[key]);
          return sorted;
        }, {});
    }
    return obj;
  };

  // Format JSON
  const formatJSON = useCallback(() => {
    if (!inputJSON.trim()) {
      setError({ message: "Por favor ingresa JSON para formatear" });
      setFormattedJSON("");
      setIsFormatted(false);
      return;
    }

    try {
      // Parse JSON
      let parsed = JSON.parse(inputJSON);

      // Sort keys if enabled
      if (sortKeys) {
        parsed = sortObjectKeys(parsed);
      }

      // Stringify with indentation
      const formatted = JSON.stringify(parsed, null, indentSize);

      setFormattedJSON(formatted);
      setError(null);
      setIsFormatted(true);
      saveJSON(inputJSON);
      toast.success("JSON formateado correctamente");
    } catch (err) {
      // Parse error to extract line and column
      const errorMsg = err instanceof Error ? err.message : "Error de sintaxis";

      // Try to extract position from error message
      const posMatch = errorMsg.match(/position (\d+)/);
      const lineMatch = errorMsg.match(/line (\d+)/);
      const colMatch = errorMsg.match(/column (\d+)/);

      let line: number | undefined;
      let column: number | undefined;

      if (posMatch) {
        const position = parseInt(posMatch[1]);
        const lines = inputJSON.substring(0, position).split("\n");
        line = lines.length;
        column = lines[lines.length - 1].length + 1;
      } else if (lineMatch && colMatch) {
        line = parseInt(lineMatch[1]);
        column = parseInt(colMatch[1]);
      }

      setError({
        message: errorMsg,
        line,
        column,
      });
      setFormattedJSON("");
      setIsFormatted(false);
      toast.error("Error al formatear JSON");
    }
  }, [inputJSON, indentSize, sortKeys, saveJSON]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!formattedJSON) return;

    try {
      await navigator.clipboard.writeText(formattedJSON);
      setIsCopied(true);
      toast.success("JSON copiado al portapapeles");

      setTimeout(() => {
        setIsCopied(false);
      }, 2000);
    } catch (_err) {
      toast.error("Error al copiar al portapapeles");
    }
  }, [formattedJSON]);

  // Clear all
  const clearAll = useCallback(() => {
    setInputJSON("");
    setFormattedJSON("");
    setError(null);
    setIsFormatted(false);
    saveJSON("");
  }, [saveJSON]);

  /**
   * DOMPurify configuration for JSON syntax highlighting
   * Only allows span elements with specific classes for syntax colors
   */
  const JSON_PURIFY_CONFIG = {
    ALLOWED_TAGS: ['span'],
    ALLOWED_ATTR: ['class'],
    ALLOWED_CLASSES: {
      'span': ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-orange-400'],
    },
  };

  // Syntax highlighting for JSON with XSS protection
  const renderHighlightedJSON = (json: string) => {
    // First, escape any HTML entities in the JSON to prevent XSS
    const escapedJson = json
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // Simple regex-based syntax highlighting on escaped content
    // We need to work with the escaped quotes
    const highlighted = escapedJson
      // Match JSON string keys and values (escaped quotes)
      .replace(/(&quot;(?:\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\&])*?&quot;)(\s*:)?/g, (match, str, colon) => {
        if (colon) {
          // Key
          return `<span class="text-blue-400">${str}</span>${colon}`;
        }
        // String value
        return `<span class="text-green-400">${match}</span>`;
      })
      .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>')
      .replace(/\b(-?\d+\.?\d*)\b/g, '<span class="text-orange-400">$1</span>');

    // Sanitize the final output with DOMPurify to ensure safety
    return DOMPurify.sanitize(highlighted, JSON_PURIFY_CONFIG);
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-2 @sm:p-3 @md:p-4 gap-2 @sm:gap-3">
        {/* Header with settings */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Braces className="w-4 h-4 text-primary @md:w-5 @md:h-5" />
            <span className="text-xs font-medium @md:text-sm hidden @sm:inline">
              JSON Formatter
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Settings dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 @md:h-8 @md:w-8"
                >
                  <Settings2 className="w-3.5 h-3.5 @md:w-4 @md:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Configuración</DropdownMenuLabel>
                <DropdownMenuSeparator />

                <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                  Indentación
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={indentSize.toString()}
                  onValueChange={(value) => updateIndentSize(parseInt(value))}
                >
                  <DropdownMenuRadioItem value="2">
                    2 espacios
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="4">
                    4 espacios
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>

                <DropdownMenuSeparator />

                <DropdownMenuCheckboxItem
                  checked={sortKeys}
                  onCheckedChange={toggleSortKeys}
                >
                  Ordenar claves alfabéticamente
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear button */}
            {(inputJSON || formattedJSON) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="h-7 px-2 text-xs @md:h-8 @md:px-3 @md:text-sm"
              >
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* Main content - split view or stacked based on container size */}
        <div className="flex-1 min-h-0 flex flex-col @lg:flex-row gap-2 @sm:gap-3">
          {/* Input section */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                JSON sin formatear
              </span>
              <span className="text-xs text-muted-foreground">
                {inputJSON.length} caracteres
              </span>
            </div>

            <Textarea
              value={inputJSON}
              onChange={(e) => {
                setInputJSON(e.target.value);
                setIsFormatted(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  formatJSON();
                }
              }}
              placeholder='Pega tu JSON aquí... Ej: {"name":"value"}'
              className={cn(
                "flex-1 font-mono text-xs resize-none",
                "@md:text-sm",
                "min-h-[120px] @lg:min-h-0"
              )}
            />
          </div>

          {/* Format button - changes to arrow on large screens */}
          <div className="flex items-center justify-center">
            <Button
              onClick={formatJSON}
              disabled={!inputJSON.trim()}
              className="w-full @lg:w-auto gap-2 @lg:h-12 @lg:px-3"
            >
              <Sparkles className="w-4 h-4" />
              <span className="@lg:hidden">Formatear JSON</span>
              <ArrowRight className="hidden @lg:block w-4 h-4" />
            </Button>
          </div>

          {/* Output section */}
          <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                JSON formateado
              </span>
              {formattedJSON && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyToClipboard}
                  className="h-6 px-2 gap-1.5"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="text-xs hidden @sm:inline">
                        Copiado
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span className="text-xs hidden @sm:inline">Copiar</span>
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex-1 min-h-0 rounded-md border bg-muted/30 min-h-[120px] @lg:min-h-0">
              {error ? (
                // Error display
                <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-destructive mb-1">
                      Error de sintaxis JSON
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {error.message}
                    </p>
                    {error.line && error.column && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Línea {error.line}, Columna {error.column}
                      </p>
                    )}
                  </div>
                </div>
              ) : formattedJSON ? (
                // Formatted JSON display
                <ScrollArea className="h-full">
                  <pre
                    className="p-3 @md:p-4 font-mono text-xs @md:text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: renderHighlightedJSON(formattedJSON),
                    }}
                  />
                </ScrollArea>
              ) : (
                // Empty state
                <div className="h-full flex flex-col items-center justify-center p-4 text-center gap-2">
                  <Braces className="w-8 h-8 text-muted-foreground/50" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      JSON formateado aparecerá aquí
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1 hidden @md:block">
                      Ctrl/Cmd + Enter para formatear
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer info */}
        {isFormatted && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <span className="hidden @sm:inline">
              Indentación: {indentSize} espacios
              {sortKeys && " • Claves ordenadas"}
            </span>
            <span className="text-green-500 flex items-center gap-1.5">
              <Check className="w-3 h-3" />
              JSON válido
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
