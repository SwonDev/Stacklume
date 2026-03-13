#!/usr/bin/env node
/**
 * Descarga llama-server.exe (build CPU Windows) desde los releases de llama.cpp.
 * Extraemos todos los archivos del zip a src-tauri/resources/llama/
 *
 * Uso:
 *   node scripts/download-llama.mjs          # descarga la versión más reciente
 *   node scripts/download-llama.mjs --force  # sobreescribe si ya existe
 *
 * Este script se ejecuta como paso del pipeline de build-desktop.
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import { pipeline as streamPipeline } from "node:stream/promises";
import { get } from "node:https";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Extract } from "unzipper";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

const DEST_DIR = join(ROOT, "src-tauri", "resources", "llama");
const LLAMA_EXE = join(DEST_DIR, "llama-server.exe");

const FORCE = process.argv.includes("--force");

// GitHub API: último release de llama.cpp
const API_URL =
  "https://api.github.com/repos/ggerganov/llama.cpp/releases/latest";

/**
 * Realiza una petición HTTPS y devuelve el body como string.
 * Sigue hasta 5 redirects.
 */
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const reqHeaders = {
      "User-Agent": "Stacklume-Build/1.0",
      ...headers,
    };
    const req = get(
      { hostname: opts.hostname, path: opts.pathname + opts.search, headers: reqHeaders },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(httpsGet(res.headers.location, headers));
          return;
        }
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on("error", reject);
    req.end();
  });
}

/**
 * Descarga un archivo HTTPS hacia un WriteStream, siguiendo redirects.
 */
function downloadTo(url, dest) {
  return new Promise((resolve, reject) => {
    const opts = new URL(url);
    const req = get(
      {
        hostname: opts.hostname,
        path: opts.pathname + opts.search,
        headers: { "User-Agent": "Stacklume-Build/1.0" },
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          resolve(downloadTo(res.headers.location, dest));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} al descargar ${url}`));
          return;
        }
        const total = parseInt(res.headers["content-length"] || "0", 10);
        let received = 0;
        let lastPct = -1;
        res.on("data", (chunk) => {
          received += chunk.length;
          if (total > 0) {
            const pct = Math.floor((received / total) * 100);
            if (pct !== lastPct && pct % 10 === 0) {
              process.stdout.write(`\r  Descargando... ${pct}%`);
              lastPct = pct;
            }
          }
        });
        res.pipe(dest);
        dest.on("finish", () => {
          process.stdout.write("\r  Descargando... 100%\n");
          resolve();
        });
        dest.on("error", reject);
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function main() {
  if (existsSync(LLAMA_EXE) && !FORCE) {
    console.log(`✓ llama-server.exe ya existe en ${DEST_DIR}`);
    console.log("  Usa --force para sobreescribir.");
    return;
  }

  console.log("🦙 Buscando última versión de llama.cpp...");

  // 1. Obtener el último release
  const { status, body } = await httpsGet(API_URL);
  if (status !== 200) {
    throw new Error(`GitHub API devolvió HTTP ${status}. ¿Rate limit?`);
  }

  const release = JSON.parse(body);
  const tagName = release.tag_name;
  console.log(`  Versión encontrada: ${tagName}`);

  // 2. Buscar el asset para Windows CPU x64
  const assets = release.assets || [];
  const winCpuAsset = assets.find(
    (a) =>
      a.name.includes("win") &&
      a.name.includes("cpu") &&
      a.name.includes("x64") &&
      a.name.endsWith(".zip")
  );

  if (!winCpuAsset) {
    const names = assets.map((a) => a.name).join(", ");
    throw new Error(
      `No se encontró asset win-cpu-x64.zip en el release ${tagName}.\nAssets disponibles: ${names}`
    );
  }

  console.log(`  Asset: ${winCpuAsset.name} (${(winCpuAsset.size / 1024 / 1024).toFixed(1)} MB)`);

  // 3. Preparar directorio destino
  if (existsSync(DEST_DIR) && FORCE) {
    rmSync(DEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(DEST_DIR, { recursive: true });

  // 4. Descargar el zip a un archivo temporal
  const zipPath = join(DEST_DIR, "_llama_tmp.zip");
  const writeStream = createWriteStream(zipPath);
  console.log(`  Descargando desde: ${winCpuAsset.browser_download_url}`);
  await downloadTo(winCpuAsset.browser_download_url, writeStream);

  // 5. Extraer todos los archivos del zip
  console.log("  Extrayendo archivos...");
  let extracted = 0;
  await new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(Extract({ path: DEST_DIR }))
      .on("entry", (entry) => {
        const lname = entry.path.toLowerCase();
        if (lname.endsWith(".exe") || lname.endsWith(".dll")) {
          extracted++;
        }
      })
      .on("finish", resolve)
      .on("error", reject);
  });

  console.log(`  Archivos extraídos: ${extracted}`);

  // 6. Limpiar zip temporal
  try {
    rmSync(zipPath, { force: true });
  } catch {
    // Ignorar errores de limpieza
  }

  // 7. Verificar que llama-server.exe está ahí (puede estar en subdirectorio)
  if (!existsSync(LLAMA_EXE)) {
    // Buscar en subdirectorios
    function findInDir(dir, filename) {
      try {
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          try {
            if (statSync(full).isDirectory()) {
              const found = findInDir(full, filename);
              if (found) return found;
            } else if (entry.toLowerCase() === filename.toLowerCase()) {
              return full;
            }
          } catch {
            // ignorar
          }
        }
      } catch {
        // ignorar
      }
      return null;
    }

    const found = findInDir(DEST_DIR, "llama-server.exe");
    if (found && found !== LLAMA_EXE) {
      copyFileSync(found, LLAMA_EXE);
      console.log(`  Copiado desde subdirectorio: ${found}`);
    }
  }

  if (existsSync(LLAMA_EXE)) {
    console.log(`✓ llama-server.exe listo en ${DEST_DIR}`);
  } else {
    console.warn(
      "⚠ llama-server.exe no se encontró después de la extracción.\n" +
        "  El binario puede estar en un subdirectorio dentro del zip.\n" +
        `  Directorio de destino: ${DEST_DIR}`
    );
  }
}

main().catch((err) => {
  console.error("✗ Error al descargar llama-server:", err.message);
  process.exit(1);
});
