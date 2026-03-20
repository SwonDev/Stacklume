"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { openExternalUrl } from "@/lib/desktop";

const NOTIFIED_KEY = "stacklume-notified-reminders";

function loadNotifiedFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set<string>(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveNotifiedToStorage(set: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage lleno — ignorar
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function showNativeNotification(title: string, body: string, url: string): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    const notification = new Notification(`Recordatorio: ${title}`, {
      body,
      icon: "/favicon-32x32.png",
      tag: `reminder-${url}`,
      requireInteraction: true,
    });
    notification.onclick = () => {
      notification.close();
      openExternalUrl(url);
    };
  } catch {
    // Fallo silencioso — el toast ya se mostró
  }
}

/** Limpia el campo reminderAt vía API y actualiza el store local. */
async function clearReminder(linkId: string): Promise<void> {
  try {
    await fetch(`/api/links/${linkId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getCsrfHeaders(),
      },
      credentials: "include",
      body: JSON.stringify({ reminderAt: null }),
    });
    useLinksStore.getState().updateLink(linkId, { reminderAt: null });
  } catch {
    // Fallo silencioso — el recordatorio ya fue mostrado y está en localStorage
    console.log("[ReminderChecker] Error al limpiar reminderAt para", linkId);
  }
}

export function ReminderChecker() {
  const links = useLinksStore((s) => s.links);
  // Ref mutable — se inicializa lazy desde localStorage
  const notifiedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    // Inicializar desde localStorage una sola vez
    if (!notifiedRef.current) {
      notifiedRef.current = loadNotifiedFromStorage();
    }
    const notified = notifiedRef.current;

    const check = async () => {
      const now = new Date();
      const newIds: string[] = [];

      for (const link of links) {
        if (
          link.reminderAt &&
          new Date(link.reminderAt) <= now &&
          !notified.has(link.id)
        ) {
          notified.add(link.id);
          newIds.push(link.id);

          const description = link.notes || link.url;

          toast.info(`Recordatorio: ${link.title}`, {
            description,
            action: {
              label: "Ver",
              onClick: () => openExternalUrl(link.url),
            },
            duration: 10000,
          });

          const hasPermission = await requestNotificationPermission();
          if (hasPermission) {
            showNativeNotification(link.title, description, link.url);
          }

          // Limpiar el campo reminderAt en la BD para que no se repita
          clearReminder(link.id);
        }
      }

      if (newIds.length > 0) {
        saveNotifiedToStorage(notified);
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [links]);

  return null;
}
