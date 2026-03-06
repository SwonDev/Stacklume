"use client";

import { useEffect, useState, useRef } from "react";
import { Loader2, AlertCircle, Puzzle } from "lucide-react";
import type { Widget } from "@/types/widget";
import type { CustomUserWidgetConfig } from "@/types/widgets/configs";
import type { CustomWidgetType } from "@/lib/db/schema";
import { useWidgetStore } from "@/stores/widget-store";

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
 *
 * El iframe recibe postMessages de tipo { type: "stacklume:resize", width, height }
 * cada vez que el widget cambia de tamaño, para que los templates canvas-based
 * puedan actualizar sus dimensiones sin depender de ResizeObserver interno.
 */
export function CustomUserWidget({ widget }: CustomUserWidgetProps) {
  const config = widget.config as CustomUserWidgetConfig | null;
  const customTypeId = config?._customTypeId;

  const [definition, setDefinition] = useState<CustomWidgetType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Config en runtime — null hasta que definition carga
  const [runtimeConfig, setRuntimeConfig] = useState<Record<string, unknown> | null>(null);

  // Refs para el ResizeObserver externo
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Dimensiones en píxeles exactos para el iframe (evita el lag de 100%/100vh durante resize)
  const [iframeDims, setIframeDims] = useState<{ w: number; h: number } | null>(null);

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
        if (!cancelled) {
          setDefinition(data);
          // Inicializar runtimeConfig con la config del widget (sin _customTypeId)
          const cfg = config ? { ...config } : {};
          delete (cfg as Record<string, unknown>)._customTypeId;
          setRuntimeConfig(cfg);
        }
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

  // ResizeObserver externo: setea dimensiones en píxeles exactos en el iframe
  // para que reaccione sin retraso durante el drag de react-grid-layout.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !definition) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      const w = Math.round(width);
      const h = Math.round(height);
      setIframeDims({ w, h });
      // Notificar al contenido del iframe para que actualice canvas u otros
      // elementos dependientes del tamaño sin necesitar su propio ResizeObserver
      try {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "stacklume:resize", width: w, height: h },
          "*"
        );
      } catch {
        // El iframe puede no estar listo aún; no es un error crítico
      }
    });

    ro.observe(container);
    return () => ro.disconnect();
  }, [definition]); // Se re-inicializa cuando carga la definición

  // Listener bidireccional: recibe stacklume:save y stacklume:get-config del iframe
  useEffect(() => {
    const handle = async (ev: MessageEvent) => {
      if (!ev.data?.type) return;

      if (ev.data.type === "stacklume:save") {
        const newCfg = { ...(ev.data.config as Record<string, unknown>) };
        // Actualizar estado local inmediatamente → re-renderiza iframe con nuevos datos
        setRuntimeConfig(newCfg);
        // Persistir en DB via widget store (optimistic + PATCH /api/widgets)
        const withMeta: Record<string, unknown> = { ...newCfg, _customTypeId: customTypeId };
        try {
          await useWidgetStore.getState().updateWidget(widget.id, {
            config: withMeta as Record<string, unknown>,
          });
          iframeRef.current?.contentWindow?.postMessage(
            { type: "stacklume:saved", success: true },
            "*"
          );
        } catch {
          iframeRef.current?.contentWindow?.postMessage(
            { type: "stacklume:saved", success: false },
            "*"
          );
        }
      }

      if (ev.data.type === "stacklume:get-config") {
        iframeRef.current?.contentWindow?.postMessage(
          { type: "stacklume:config", config: runtimeConfig ?? {} },
          "*"
        );
      }
    };

    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, [widget.id, customTypeId, runtimeConfig]);

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

  // Usar runtimeConfig si está disponible (permite auto-guardado desde el iframe)
  // Si runtimeConfig es null (cargando), usar config de props como fallback
  const displayConfig = runtimeConfig ?? (() => {
    const cfg = config ? { ...config } : {};
    delete (cfg as Record<string, unknown>)._customTypeId;
    return cfg;
  })();

  // Bloquear templates excesivamente grandes antes de procesar
  if (definition.htmlTemplate.length > 200000) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <AlertCircle className="w-6 h-6 text-destructive" />
        <p className="text-xs text-muted-foreground">Widget demasiado grande para renderizar</p>
      </div>
    );
  }

  const CSP_META =
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src *;">`;

  let processedHtml = definition.htmlTemplate.replace(
    /\{\{CONFIG_JSON\}\}/g,
    JSON.stringify(displayConfig)
  );

  // Inyectar CSP meta tag justo después de <head> (o al inicio si no hay <head>)
  const headIndex = processedHtml.search(/<head[\s>]/i);
  if (headIndex !== -1) {
    const insertAt = processedHtml.indexOf(">", headIndex) + 1;
    processedHtml = processedHtml.slice(0, insertAt) + CSP_META + processedHtml.slice(insertAt);
  } else {
    processedHtml = CSP_META + processedHtml;
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* Etiqueta de "Widget personalizado" en modo dev para identificación */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-1 right-1 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] bg-purple-500/20 text-purple-400 pointer-events-none select-none">
          <Puzzle className="w-2.5 h-2.5" />
          custom
        </div>
      )}
      <iframe
        ref={iframeRef}
        title={widget.title ?? definition.name}
        sandbox="allow-scripts"
        srcDoc={processedHtml}
        className="absolute inset-0 border-0 rounded-[inherit]"
        style={
          iframeDims
            ? { width: iframeDims.w, height: iframeDims.h }
            : { width: "100%", height: "100%" }
        }
      />
    </div>
  );
}
