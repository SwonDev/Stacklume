"use client";

import { useEffect, useRef } from "react";
import { useLinksStore } from "@/stores/links-store";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/desktop";
import { useTranslation } from "@/lib/i18n";

/**
 * Componente invisible que verifica periódicamente si hay recordatorios
 * pendientes en los enlaces. Cuando un recordatorio alcanza su fecha/hora,
 * muestra un toast de notificación al usuario.
 */
export function ReminderChecker() {
  const { t } = useTranslation();
  const links = useLinksStore((s) => s.links);
  // Track which reminders have already been shown to avoid duplicates
  const shownRemindersRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      links.forEach((link) => {
        if (
          link.reminderAt &&
          new Date(link.reminderAt) <= now &&
          !link.isRead &&
          !shownRemindersRef.current.has(link.id)
        ) {
          // Limitar tamaño del Set para evitar memory leak en sesiones largas
          if (shownRemindersRef.current.size > 500) {
            const entries = Array.from(shownRemindersRef.current);
            shownRemindersRef.current = new Set(entries.slice(-250));
          }
          shownRemindersRef.current.add(link.id);
          toast.info(t("reminder.title", { title: link.title }), {
            description: link.notes || link.url,
            action: {
              label: t("reminder.open"),
              onClick: () => openExternalUrl(link.url),
            },
            duration: 10000,
          });
        }
      });
    };

    check();
    const interval = setInterval(check, 60000); // Verificar cada minuto
    return () => clearInterval(interval);
  }, [links]);

  return null;
}
