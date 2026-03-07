/**
 * dev-tauri.mjs
 * Arranca Next.js en modo Tauri desktop para desarrollo.
 * Equivale exactamente al instalador compilado:
 *   - DESKTOP_MODE=true  → bypassa auth/CSRF, usa SQLite
 *   - DATABASE_PATH      → ./stacklume-dev.db (separado de producción)
 * Uso: pnpm dev:tauri  (lanzado automáticamente por `pnpm tauri:dev`)
 */

import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dbPath = resolve(root, "stacklume-dev.db").replace(/\\/g, "/");

const PORT = "7878";

console.log("\x1b[36m[dev:tauri]\x1b[0m DESKTOP_MODE=true");
console.log("\x1b[36m[dev:tauri]\x1b[0m SQLite →", dbPath);
console.log(`\x1b[36m[dev:tauri]\x1b[0m URL    → http://localhost:${PORT}\n`);

const child = spawn("pnpm", ["exec", "next", "dev", "--port", PORT], {
  cwd: root,
  stdio: "inherit",
  shell: true,
  env: {
    ...process.env,
    DESKTOP_MODE: "true",
    DATABASE_PATH: dbPath,
    PORT,
    HOSTNAME: "127.0.0.1",
  },
});

process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.on("exit", (code) => process.exit(code ?? 0));
