/**
 * Inicialización de la base de datos en modo desktop.
 * Llama a esta función al arrancar el servidor cuando DESKTOP_MODE=true.
 */

import { getDatabase } from "./index";

export async function initDesktopDatabase(): Promise<void> {
  if (process.env.DESKTOP_MODE !== "true") return;

  try {
    await getDatabase();
    console.log(
      "[Desktop] SQLite inicializado en:",
      process.env.DATABASE_PATH ?? "./stacklume-dev.db"
    );
  } catch (error) {
    console.error("[Desktop] Error inicializando SQLite:", error);
    throw error;
  }
}
