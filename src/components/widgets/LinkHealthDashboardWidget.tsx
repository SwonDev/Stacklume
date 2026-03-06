"use client";

import { useState, useCallback } from "react";
import { Shield, CheckCircle2, XCircle, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LinkHealthDashboardWidgetProps {
  widget: Widget;
}

export function LinkHealthDashboardWidget({ widget: _widget }: LinkHealthDashboardWidgetProps) {
  const links = useLinksStore((s) => s.links);
  const [isChecking, setIsChecking] = useState(false);

  const healthy = links.filter((l) => l.healthStatus === "ok");
  const broken = links.filter(
    (l) =>
      l.healthStatus === "broken" ||
      l.healthStatus === "timeout" ||
      l.healthStatus === "error"
  );
  const unchecked = links.filter(
    (l) =>
      !l.healthStatus ||
      l.healthStatus === null ||
      l.healthStatus === "redirect"
  );

  const handleVerify = useCallback(async () => {
    if (isChecking) return;

    const linksToCheck = unchecked.slice(0, 20);
    if (linksToCheck.length === 0) {
      toast.info("No hay enlaces pendientes de verificar");
      return;
    }

    setIsChecking(true);
    try {
      const response = await fetch("/api/links/health-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ linkIds: linksToCheck.map((l) => l.id) }),
      });

      if (!response.ok) {
        throw new Error("Error al verificar enlaces");
      }

      const data = await response.json();
      await useLinksStore.getState().refreshAllData();

      const { summary } = data;
      if (summary) {
        toast.success(
          `Verificación completada: ${summary.ok} activos, ${summary.broken + summary.timeout + summary.error} rotos`
        );
      } else {
        toast.success("Verificación completada");
      }
    } catch (error) {
      console.error("Error en health check:", error);
      toast.error("Error al verificar los enlaces");
    } finally {
      setIsChecking(false);
    }
  }, [isChecking, unchecked]);

  const allHealthy = broken.length === 0 && links.length > 0 && unchecked.length === 0;

  return (
    <div className="flex flex-col gap-3 h-full p-1">
      {/* Header con icono */}
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-xs font-medium text-muted-foreground">Estado de tus enlaces</span>
      </div>

      {/* Pills de estadísticas */}
      <div className="flex flex-wrap gap-2">
        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-2 py-1 text-xs border-green-500/40 text-green-600 dark:text-green-400 bg-green-500/10"
        >
          <CheckCircle2 className="w-3 h-3" />
          <span>{healthy.length} activos</span>
        </Badge>

        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 text-xs",
            broken.length > 0
              ? "border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10"
              : "border-muted text-muted-foreground"
          )}
        >
          <XCircle className="w-3 h-3" />
          <span>{broken.length} rotos</span>
        </Badge>

        <Badge
          variant="outline"
          className="flex items-center gap-1.5 px-2 py-1 text-xs border-muted text-muted-foreground"
        >
          <Clock className="w-3 h-3" />
          <span>{unchecked.length} sin verificar</span>
        </Badge>
      </div>

      {/* Estado vacío / todos saludables */}
      {allHealthy ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-2 text-center py-2">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
          <p className="text-xs text-muted-foreground">Todos tus enlaces están saludables</p>
        </div>
      ) : broken.length > 0 ? (
        /* Lista de enlaces rotos */
        <div className="flex-1 min-h-0 overflow-hidden">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            Enlaces con problemas
          </p>
          <div className="space-y-1">
            {broken.slice(0, 5).map((link) => (
              <div
                key={link.id}
                className="flex items-start gap-2 p-1.5 rounded-md bg-red-500/5 border border-red-500/20"
              >
                <XCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{link.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate opacity-70">
                    {link.url}
                  </p>
                </div>
              </div>
            ))}
            {broken.length > 5 && (
              <p className="text-[10px] text-muted-foreground text-center py-1">
                + {broken.length - 5} más
              </p>
            )}
          </div>
        </div>
      ) : null}

      {/* Botón verificar */}
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs h-7 mt-auto"
        onClick={handleVerify}
        disabled={isChecking || unchecked.length === 0}
      >
        {isChecking ? (
          <>
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
            Verificando...
          </>
        ) : (
          <>
            <RefreshCw className="w-3 h-3 mr-1.5" />
            {unchecked.length > 0
              ? `Verificar ${Math.min(unchecked.length, 20)} enlaces`
              : "Todo verificado"}
          </>
        )}
      </Button>
    </div>
  );
}
