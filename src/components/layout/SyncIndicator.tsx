"use client";

import { useState, useEffect } from "react";
import { Cloud, CloudOff, Loader2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";

type SyncStatus = "saved" | "saving" | "error";

// Event-based sync system: any module can notify sync status changes
const syncListeners = new Set<(status: SyncStatus) => void>();

/**
 * Notifica un cambio en el estado de sincronización.
 * Llamar desde stores o componentes que realizan operaciones de guardado.
 *
 * Ejemplo:
 *   notifySyncStatus("saving");
 *   await fetch(...);
 *   notifySyncStatus("saved");
 */
export function notifySyncStatus(status: SyncStatus) {
  syncListeners.forEach((fn) => fn(status));
}

export function SyncIndicator() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<SyncStatus>("saved");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Suscribirse al sistema de eventos de sincronización
  useEffect(() => {
    syncListeners.add(setStatus);
    return () => {
      syncListeners.delete(setStatus);
    };
  }, []);

  // Auto-reset a "saved" si lleva más de 5s en "saving" (timeout de seguridad)
  useEffect(() => {
    if (status === "saving") {
      const timer = setTimeout(() => setStatus("saved"), 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Auto-reset de "error" a "saved" después de 4s
  useEffect(() => {
    if (status === "error") {
      const timer = setTimeout(() => setStatus("saved"), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // No renderizar antes de la hidratación
  if (!isMounted) return null;

  // En estado "saved" no se muestra nada para no ocupar espacio
  if (status === "saved") return null;

  const label =
    status === "saving"
      ? t("sync.saving")
      : t("sync.error");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-md transition-colors",
            status === "saving" && "bg-amber-500/10",
            status === "error" && "bg-red-500/10"
          )}
          aria-label={label}
        >
          {status === "saving" && (
            <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
          )}
          {status === "error" && (
            <CloudOff className="h-4 w-4 text-red-500" />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
