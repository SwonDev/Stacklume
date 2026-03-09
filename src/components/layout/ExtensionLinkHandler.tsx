"use client";

import { useEffect, useRef } from "react";
import { useLinksStore } from "@/stores/links-store";

/**
 * ExtensionLinkHandler
 *
 * Detecta los parámetros ?action=add-link&url=...&title=...&description=...
 * que envía la extensión de navegador de Stacklume y abre el modal de
 * añadir enlace con los datos pre-rellenados.
 *
 * Se monta una sola vez y limpia la URL inmediatamente para evitar que
 * los parámetros queden visibles o se procesen de nuevo en recargas.
 */
export function ExtensionLinkHandler() {
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("action") !== "add-link") return;

    const url = params.get("url") || "";
    const title = params.get("title") || undefined;
    const description = params.get("description") || undefined;

    if (!url) return;

    handled.current = true;

    // Limpiar parámetros de la barra de URL sin recargar la página
    window.history.replaceState({}, "", window.location.pathname);

    // Esperar a que el store termine de cargar datos (isLoading = false)
    // y luego abrir el modal con los datos pre-rellenados.
    let attempts = 0;
    const maxAttempts = 40; // 40 × 150ms = 6s máximo de espera

    const poll = setInterval(() => {
      attempts++;
      const { isLoading } = useLinksStore.getState();

      if (!isLoading || attempts >= maxAttempts) {
        clearInterval(poll);
        useLinksStore.getState().openAddLinkModal({ url, title, description });
      }
    }, 150);

    return () => clearInterval(poll);
  }, []);

  return null;
}
