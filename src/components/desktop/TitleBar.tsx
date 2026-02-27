"use client";

import { useEffect, useState } from "react";
import { useElectron } from "@/hooks/useElectron";

/**
 * Barra de título personalizada estilo macOS para el modo desktop (Tauri v2).
 * Traffic lights a la izquierda, logo centrado, drag region en todo el ancho.
 * Solo se renderiza dentro del WebView de Tauri.
 */
export function DesktopTitleBar() {
  const { isTauri, minimizeWindow, maximizeWindow, closeWindow } = useElectron();
  const [isMaximized, setIsMaximized] = useState(false);
  const [isGroupHovered, setIsGroupHovered] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    // Clase en <html> para que el CSS pueda bajar el header fijo
    document.documentElement.classList.add("tauri-desktop");

    const handleResize = () => {
      const isMax =
        window.outerWidth >= window.screen.availWidth &&
        window.outerHeight >= window.screen.availHeight;
      setIsMaximized(isMax);
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isTauri]);

  if (!isTauri) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[200] flex items-center h-10 bg-background/95 backdrop-blur-sm border-b border-border/30 select-none"
      style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      role="banner"
      aria-label="Barra de título"
    >
      {/* Traffic lights estilo macOS — izquierda */}
      <div
        className="flex items-center gap-[7px] px-4 py-0"
        style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
        onMouseEnter={() => setIsGroupHovered(true)}
        onMouseLeave={() => setIsGroupHovered(false)}
      >
        {/* Cerrar — rojo */}
        <button
          onClick={closeWindow}
          className="w-[13px] h-[13px] rounded-full transition-all duration-100 flex items-center justify-center"
          style={{ backgroundColor: "#FF5F57" }}
          aria-label="Cerrar ventana"
        >
          {isGroupHovered && (
            <svg width="6" height="6" viewBox="0 0 6 6" fill="none" aria-hidden="true">
              <path
                d="M1 1L5 5M5 1L1 5"
                stroke="#7A1210"
                strokeWidth="1.1"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>

        {/* Minimizar — amarillo */}
        <button
          onClick={minimizeWindow}
          className="w-[13px] h-[13px] rounded-full transition-all duration-100 flex items-center justify-center"
          style={{ backgroundColor: "#FEBC2E" }}
          aria-label="Minimizar ventana"
        >
          {isGroupHovered && (
            <svg width="7" height="1.5" viewBox="0 0 7 1.5" fill="none" aria-hidden="true">
              <rect x="0" y="0.25" width="7" height="1" rx="0.5" fill="#7A4C0A" />
            </svg>
          )}
        </button>

        {/* Maximizar / Restaurar — verde */}
        <button
          onClick={maximizeWindow}
          className="w-[13px] h-[13px] rounded-full transition-all duration-100 flex items-center justify-center"
          style={{ backgroundColor: "#28C840" }}
          aria-label={isMaximized ? "Restaurar ventana" : "Maximizar ventana"}
        >
          {isGroupHovered && (
            isMaximized ? (
              /* Icono restaurar: dos rectángulos superpuestos */
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
                <path
                  d="M1 3V1H3M5 1H6V2M6 4V6H4M2 6H1V5"
                  stroke="#0F5A1A"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              /* Icono maximizar: flechas diagonales hacia afuera */
              <svg width="7" height="7" viewBox="0 0 7 7" fill="none" aria-hidden="true">
                <path
                  d="M1 3V1H3M5 1H6V2M6 4V6H4M2 6H1V5"
                  stroke="#0F5A1A"
                  strokeWidth="1.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )
          )}
        </button>
      </div>

      {/* Nombre centrado — no interactivo (dentro del drag region) */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <span className="text-xs font-semibold tracking-tight text-foreground/70">
          Stacklume
        </span>
      </div>
    </div>
  );
}
