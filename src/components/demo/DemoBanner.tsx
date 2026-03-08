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
        "relative z-50 w-full shrink-0",
        "bg-amber-950/80 border-b border-amber-800/60 backdrop-blur-sm",
        "text-amber-100 text-xs"
      )}
    >
      <div className="flex items-center gap-3 px-4 py-2 max-w-screen-xl mx-auto">
        <Info className="h-3.5 w-3.5 shrink-0 text-amber-400" />

        <p className="flex-1 leading-relaxed">
          <span className="font-semibold text-amber-300">Modo demo</span>
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
