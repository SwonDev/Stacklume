"use client";

import { useMemo } from "react";
import { Bell, CheckCircle, ExternalLink, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { openExternalUrl, isTauriWebView } from "@/lib/desktop";
import type { Widget } from "@/types/widget";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface RemindersWidgetProps {
  widget: Widget;
}

/** Formatea la diferencia de tiempo entre ahora y una fecha */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffMs < 0) {
    // Pasado
    const absDiff = Math.abs(diffMs);
    const absDay = Math.round(absDiff / (1000 * 60 * 60 * 24));
    const absHour = Math.round(absDiff / (1000 * 60 * 60));
    const absMin = Math.round(absDiff / (1000 * 60));
    if (absDay >= 1) return `hace ${absDay} día${absDay !== 1 ? "s" : ""}`;
    if (absHour >= 1) return `hace ${absHour} hora${absHour !== 1 ? "s" : ""}`;
    if (absMin >= 1) return `hace ${absMin} minuto${absMin !== 1 ? "s" : ""}`;
    return "hace un momento";
  }

  // Futuro
  if (diffDay >= 1) return `en ${diffDay} día${diffDay !== 1 ? "s" : ""}`;
  if (diffHour >= 1) return `en ${diffHour} hora${diffHour !== 1 ? "s" : ""}`;
  if (diffMin >= 1) return `en ${diffMin} minuto${diffMin !== 1 ? "s" : ""}`;
  return "ahora";
}

/** Determina si una fecha es hoy */
function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** Determina si una fecha ya pasó */
function isPast(date: Date): boolean {
  return date.getTime() < new Date().getTime();
}

export function RemindersWidget({ widget: _widget }: RemindersWidgetProps) {
  const links = useLinksStore((s) => s.links);

  const reminders = useMemo(() => {
    return links
      .filter(
        (l) =>
          l.reminderAt !== null &&
          l.reminderAt !== undefined &&
          !(l.isRead ?? false)
      )
      .map((l) => ({
        ...l,
        reminderDate: new Date(l.reminderAt as string | Date),
      }))
      .sort((a, b) => {
        const aIsPast = isPast(a.reminderDate);
        const bIsPast = isPast(b.reminderDate);
        // Vencidos primero
        if (aIsPast && !bIsPast) return -1;
        if (!aIsPast && bIsPast) return 1;
        // Luego por fecha más próxima
        return a.reminderDate.getTime() - b.reminderDate.getTime();
      });
  }, [links]);

  const handleOpenLink = (url: string) => {
    if (isTauriWebView()) {
      openExternalUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleMarkRead = async (linkId: string) => {
    // Optimistic update
    useLinksStore.getState().updateLink(linkId, { isRead: true });

    try {
      const response = await fetch(`/api/links/${linkId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ isRead: true }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el enlace");
      }

      await useLinksStore.getState().refreshAllData();
      toast.success("Recordatorio marcado como leído");
    } catch (error) {
      console.error("Error marcando como leído:", error);
      // Revertir optimistic update
      useLinksStore.getState().updateLink(linkId, { isRead: false });
      toast.error("Error al marcar el recordatorio");
    }
  };

  const visibleReminders = reminders.slice(0, 10);
  const extraCount = reminders.length - visibleReminders.length;

  if (reminders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
        <Bell className="w-8 h-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No tienes recordatorios pendientes</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Contador */}
      <div className="flex items-center gap-2 px-1">
        <Bell className="w-3.5 h-3.5 text-primary flex-shrink-0" />
        <span className="text-xs text-muted-foreground">
          {reminders.length} recordatorio{reminders.length !== 1 ? "s" : ""} pendiente{reminders.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Lista de recordatorios */}
      <div className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-hidden">
        {visibleReminders.map((reminder) => {
          const past = isPast(reminder.reminderDate);
          const today = isToday(reminder.reminderDate);

          return (
            <div
              key={reminder.id}
              className={cn(
                "flex items-start gap-2 p-2 rounded-lg border text-xs",
                past
                  ? "border-red-500/30 bg-red-500/5"
                  : today
                    ? "border-orange-500/30 bg-orange-500/5"
                    : "border-blue-500/20 bg-blue-500/5"
              )}
            >
              {/* Indicador de urgencia */}
              <div className={cn(
                "flex-shrink-0 mt-0.5",
                past ? "text-red-500" : today ? "text-orange-500" : "text-blue-500"
              )}>
                <Clock className="w-3 h-3" />
              </div>

              {/* Contenido */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate leading-tight">{reminder.title}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1 py-0 h-4 border-0",
                      past
                        ? "text-red-600 dark:text-red-400 bg-red-500/10"
                        : today
                          ? "text-orange-600 dark:text-orange-400 bg-orange-500/10"
                          : "text-blue-600 dark:text-blue-400 bg-blue-500/10"
                    )}
                  >
                    {formatRelativeTime(reminder.reminderDate)}
                  </Badge>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  type="button"
                  title="Abrir enlace"
                  onClick={() => handleOpenLink(reminder.url)}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  title="Marcar como leído"
                  onClick={() => handleMarkRead(reminder.id)}
                  className="p-1 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-green-500"
                >
                  <CheckCircle className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {extraCount > 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-1">
            + {extraCount} más
          </p>
        )}
      </div>
    </div>
  );
}
