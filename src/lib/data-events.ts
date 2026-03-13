/**
 * Bus de eventos liviano para sincronización de datos en tiempo real.
 *
 * Permite que cualquier parte de la app notifique cambios sin coupling directo.
 * Usado principalmente en desktop (Tauri/WebView2) donde componentes con estado
 * local no se enteran de cambios hechos desde otro contexto.
 *
 * Uso básico:
 *   dispatchDataChanged("sessions");            // emitir
 *   const unsub = onDataChanged("sessions", cb); // escuchar
 *   unsub();                                     // limpiar en useEffect cleanup
 */

export type DataEventType =
  | "links"
  | "widgets"
  | "categories"
  | "tags"
  | "sessions"
  | "all";

const EVENT_NAME = "stacklume:data-changed";

/** Emite un evento de cambio de datos. No-op en SSR. */
export function dispatchDataChanged(type: DataEventType = "all"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { type } }));
}

/**
 * Suscribe un callback a eventos de cambio de datos.
 * @returns función de limpieza para usar en useEffect
 */
export function onDataChanged(
  type: DataEventType | DataEventType[],
  callback: () => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const types = Array.isArray(type) ? type : [type];

  const handler = (event: Event) => {
    const { type: eventType } = (event as CustomEvent<{ type: DataEventType }>).detail ?? {};
    if (
      eventType === "all" ||
      types.includes("all") ||
      types.includes(eventType)
    ) {
      callback();
    }
  };

  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
