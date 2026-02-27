import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";

/**
 * GET /api/health
 * Health check endpoint para Tauri — verifica que el servidor Next.js está listo.
 *
 * En modo desktop: inicializa la base de datos SQLite aquí.
 * Tauri espera que este endpoint responda 200 antes de navegar el WebView,
 * por lo que la DB estará inicializada para todas las rutas API subsiguientes.
 */
export async function GET() {
  if (process.env.DESKTOP_MODE === "true") {
    await getDatabase();
  }

  return NextResponse.json(
    {
      status: "ok",
      mode: process.env.DESKTOP_MODE === "true" ? "desktop" : "web",
      timestamp: Date.now(),
    },
    { status: 200 }
  );
}
