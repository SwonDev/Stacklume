"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Puzzle } from "lucide-react";
import type { Widget } from "@/types/widget";
import type { CustomUserWidgetConfig } from "@/types/widgets/configs";
import type { CustomWidgetType } from "@/lib/db/schema";

interface CustomUserWidgetProps {
  widget: Widget;
}

/**
 * Renderiza un widget personalizado creado por el usuario/IA vía MCP.
 * Carga la definición desde /api/custom-widget-types/[id] y la muestra
 * en un <iframe sandbox="allow-scripts"> para aislamiento completo.
 *
 * Template variables disponibles en el HTML:
 *   {{CONFIG_JSON}} — sustituido por JSON.stringify(config) antes del render
 */
export function CustomUserWidget({ widget }: CustomUserWidgetProps) {
  const config = widget.config as CustomUserWidgetConfig | null;
  const customTypeId = config?._customTypeId;

  const [definition, setDefinition] = useState<CustomWidgetType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!customTypeId) {
      setError("ID de tipo de widget no configurado");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch(`/api/custom-widget-types/${customTypeId}`, {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: CustomWidgetType) => {
        if (!cancelled) setDefinition(data);
      })
      .catch((err) => {
        if (!cancelled && err.name !== "AbortError") {
          setError("No se pudo cargar el widget personalizado");
          console.error("[CustomUserWidget] Error loading definition:", err);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [customTypeId]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !definition) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-xs text-muted-foreground">{error ?? "Widget no disponible"}</p>
        {customTypeId && (
          <p className="text-[10px] text-muted-foreground/50 font-mono">
            ID: {customTypeId.slice(0, 8)}…
          </p>
        )}
      </div>
    );
  }

  // Sustituir {{CONFIG_JSON}} con la config serializada
  const userConfig = config ? { ...config } : {};
  // Eliminar la meta-propiedad interna antes de pasar al template
  delete (userConfig as Record<string, unknown>)._customTypeId;

  const processedHtml = definition.htmlTemplate.replace(
    /\{\{CONFIG_JSON\}\}/g,
    JSON.stringify(userConfig)
  );

  return (
    <div className="relative w-full h-full">
      {/* Etiqueta de "Widget personalizado" en modo dev para identificación */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400 pointer-events-none select-none">
          <Puzzle className="w-2.5 h-2.5" />
          custom
        </div>
      )}
      <iframe
        title={widget.title ?? definition.name}
        sandbox="allow-scripts"
        srcDoc={processedHtml}
        className="w-full h-full border-0 rounded-[inherit]"
        loading="lazy"
      />
    </div>
  );
}
