"use client";

import { useState } from "react";
import { X, MonitorDown, Database, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      className={cn(
        // Fixed en la parte superior, encima del header (z-50 → usamos z-[60])
        // El header es h-12 (48px), ponemos top-12 para quedar justo debajo
        "fixed top-12 left-0 right-0 z-[60]",
        "bg-amber-950/95 border-b border-amber-800/60 backdrop-blur-sm shadow-md",
        "text-amber-100 text-xs"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
        <Info className="h-3.5 w-3.5 shrink-0 text-amber-400" />

        <p className="flex-1 leading-relaxed">
          <span className="font-semibold text-amber-300">Modo demo</span>
          {/* Texto corto en mobile */}
          <span className="sm:hidden">
            {" — "}Datos solo en este navegador.{" "}
            <a
              href="https://github.com/SwonDev/Stacklume/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 text-amber-300 hover:text-amber-100 transition-colors font-medium"
            >
              <MonitorDown className="h-3 w-3" />
              Descargar
            </a>
          </span>
          {/* Texto completo en sm+ */}
          <span className="hidden sm:inline">
            {" — "}
            Tus datos se guardan{" "}
            <span className="font-medium">solo en este navegador</span>{" "}
            <Database className="inline h-3 w-3 mx-0.5 text-amber-400" />
            y son completamente privados. Para la experiencia completa descarga la
            app de escritorio.
            {" "}
            <a
              href="https://github.com/SwonDev/Stacklume/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 underline underline-offset-2 text-amber-300 hover:text-amber-100 transition-colors font-medium"
            >
              <MonitorDown className="h-3 w-3" />
              Descargar Stacklume
            </a>
          </span>
        </p>

        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:bg-amber-800/50 transition-colors text-amber-400 hover:text-amber-100"
          aria-label="Cerrar aviso de modo demo"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
