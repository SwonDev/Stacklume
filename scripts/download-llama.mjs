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

// GitHub API: release b8303 de llama.cpp — verificado que funciona con CREATE_NO_WINDOW + CUDA.
// b8405+ se cuelga con CREATE_NO_WINDOW por un cambio en la inicialización de backends.
const API_URL =
  "https://api.github.com/repos/ggerganov/llama.cpp/releases/tags/b8303";

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

  // 2. Buscar assets: preferir CUDA 12.4, fallback a CPU
  const assets = release.assets || [];

  // Prioridad: CUDA 13.1 > CUDA 12.4 > CPU (para usar GPU NVIDIA)
  // CUDA 13.1 es compatible con drivers más recientes (NVIDIA 595+)
  const winCudaAsset = assets.find(
    (a) =>
      a.name.includes("win") &&
      a.name.includes("cuda-13.1") &&
      a.name.includes("x64") &&
      a.name.endsWith(".zip") &&
      !a.name.startsWith("cudart-")
  ) || assets.find(
    (a) =>
      a.name.includes("win") &&
      a.name.includes("cuda-12.4") &&
      a.name.includes("x64") &&
      a.name.endsWith(".zip") &&
      !a.name.startsWith("cudart-")
  );

  // CUDA runtime DLLs — misma versión que el build principal
  const cudaVer = winCudaAsset?.name.includes("13.1") ? "13.1" : "12.4";
  const cudartAsset = assets.find(
    (a) =>
      a.name.startsWith("cudart-") &&
      a.name.includes(`cuda-${cudaVer}`) &&
      a.name.includes("x64") &&
      a.name.endsWith(".zip")
  );

  const winCpuAsset = assets.find(
    (a) =>
      a.name.includes("win") &&
      a.name.includes("cpu") &&
      a.name.includes("x64") &&
      a.name.endsWith(".zip")
  );

  // Usar CUDA si disponible, sino CPU
  const mainAsset = winCudaAsset || winCpuAsset;

  if (!mainAsset) {
    const names = assets.map((a) => a.name).join(", ");
    throw new Error(
      `No se encontró asset win x64 en el release ${tagName}.\nAssets: ${names}`
    );
  }

  console.log(`  Asset principal: ${mainAsset.name} (${(mainAsset.size / 1024 / 1024).toFixed(1)} MB)`);
  if (winCudaAsset) {
    console.log(`  ✓ Build CUDA 12.4 detectado — se usará GPU NVIDIA`);
    if (cudartAsset) {
      console.log(`  CUDA Runtime: ${cudartAsset.name} (${(cudartAsset.size / 1024 / 1024).toFixed(1)} MB)`);
    }
  } else {
    console.log(`  ⚠ Solo CPU disponible (sin CUDA)`);
  }

  // 3. Preparar directorio destino
  if (existsSync(DEST_DIR) && FORCE) {
    rmSync(DEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(DEST_DIR, { recursive: true });

  // 4. Descargar y extraer el zip principal (CUDA o CPU)
  const zipPath = join(DEST_DIR, "_llama_tmp.zip");
  const writeStream = createWriteStream(zipPath);
  console.log(`  Descargando desde: ${mainAsset.browser_download_url}`);
  await downloadTo(mainAsset.browser_download_url, writeStream);

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
  try { rmSync(zipPath, { force: true }); } catch { /* */ }

  // 5. Si hay CUDA, descargar también las DLLs de CUDA Runtime
  if (cudartAsset) {
    const cudartZip = join(DEST_DIR, "_cudart_tmp.zip");
    const cudartStream = createWriteStream(cudartZip);
    console.log(`  Descargando CUDA Runtime: ${cudartAsset.browser_download_url}`);
    await downloadTo(cudartAsset.browser_download_url, cudartStream);

    console.log("  Extrayendo CUDA Runtime...");
    let cudartExtracted = 0;
    await new Promise((resolve, reject) => {
      createReadStream(cudartZip)
        .pipe(Extract({ path: DEST_DIR }))
        .on("entry", (entry) => {
          if (entry.path.toLowerCase().endsWith(".dll")) cudartExtracted++;
        })
        .on("finish", resolve)
        .on("error", reject);
    });
    console.log(`  CUDA Runtime DLLs extraídas: ${cudartExtracted}`);
    try { rmSync(cudartZip, { force: true }); } catch { /* */ }
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
