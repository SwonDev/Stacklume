"use client";

import { useEffect } from "react";
import { installDemoInterceptor } from "@/lib/demo/interceptor";

/**
 * DemoProvider — Instala el interceptor de fetch en el cliente antes de que
 * cualquier otro componente haga peticiones a /api/*.
 * Se monta en layout.tsx solo cuando NEXT_PUBLIC_DEMO_MODE=true.
 */
export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Instalamos de forma síncrona en el cuerpo del componente para que el
  // interceptor esté activo incluso en el primer render del cliente.
  // (useEffect sería demasiado tarde — las stores ya habrían hecho fetch.)
  if (typeof window !== "undefined") {
    installDemoInterceptor();
  }

  useEffect(() => {
    // Asegurar instalación en caso de hidratación tardía
    installDemoInterceptor();
  }, []);

  return <>{children}</>;
}
