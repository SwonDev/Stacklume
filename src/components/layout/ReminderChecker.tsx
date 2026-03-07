"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLinksStore } from "@/stores/links-store";
import { openExternalUrl } from "@/lib/desktop";

export function ReminderChecker() {
  const links = useLinksStore((s) => s.links);
  const notifiedIds = useRef(new Set<string>());

  useEffect(() => {
    const check = () => {
      const now = new Date();
      for (const link of links) {
        if (
          link.reminderAt &&
          new Date(link.reminderAt) <= now &&
          !link.isRead &&
          !notifiedIds.current.has(link.id)
        ) {
          notifiedIds.current.add(link.id);
          toast.info(`Recordatorio: ${link.title}`, {
            description: link.notes || link.url,
            action: {
              label: "Abrir",
              onClick: () => openExternalUrl(link.url),
            },
            duration: 10000,
          });
        }
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [links]);

  return null;
}
