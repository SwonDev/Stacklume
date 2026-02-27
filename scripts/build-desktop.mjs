#!/usr/bin/env node
/**
 * Pipeline de build para la versión desktop (Tauri + Next.js standalone)
 *
 * Pasos:
 * 1. Limpiar .next/
 * 2. Build de Next.js en modo standalone con DESKTOP_MODE=true
 * 3. Copiar static assets al standalone
 * 4. Descargar Node.js portable para Windows (si no existe en cache)
 * 5. Preparar recursos en src-tauri/resources/
 */

import { execSync } from "child_process";
import { existsSync, mkdirSync, rmSync, cpSync, readFileSync, writeFileSync, readdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { get } from "https";
import { createReadStream } from "fs";
import { Extract } from "unzipper";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");

// Versión de Node.js portable a descargar — debe coincidir con la versión local
// para que los native addons (@libsql/client) funcionen sin recompilar.
// Verificar con: node --version → debe coincidir con esta constante.
const NODE_VERSION = "25.6.1";
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;
const NODE_FOLDER = `node-v${NODE_VERSION}-win-x64`;

const PATHS = {
  next: join(ROOT, ".next"),
  standalone: join(ROOT, ".next", "standalone"),
  static: join(ROOT, ".next", "static"),
  public: join(ROOT, "public"),
  tmp: join(ROOT, "tmp"),
  resources: join(ROOT, "src-tauri", "resources"),
  nodeResources: join(ROOT, "src-tauri", "resources", "node"),
  serverResources: join(ROOT, "src-tauri", "resources", "server"),
};

function run(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", cwd: ROOT, ...opts });
}

function log(msg) {
  console.log(`\n[build-desktop] ${msg}`);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest);
    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      rmSync(dest, { force: true });
      reject(err);
    });
  });
}

async function extractZip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    createReadStream(zipPath)
      .pipe(Extract({ path: destDir }))
      .on("close", resolve)
      .on("error", reject);
  });
}

async function main() {
  // ── 1. Limpiar .next ────────────────────────────────────────────────────────
  log("Limpiando .next/...");
  if (existsSync(PATHS.next)) {
    rmSync(PATHS.next, { recursive: true, force: true });
  }

  // ── 2. Build Next.js standalone ─────────────────────────────────────────────
  log("Compilando Next.js (standalone, DESKTOP_MODE=true)...");
  run("pnpm build", {
    env: {
      ...process.env,
      DESKTOP_MODE: "true",
      ELECTRON_BUILD: "true",
      NODE_ENV: "production",
    },
  });

  // ── 3. Copiar static y public al standalone ─────────────────────────────────
  log("Copiando .next/static → .next/standalone/.next/static...");
  cpSync(PATHS.static, join(PATHS.standalone, ".next", "static"), { recursive: true });

  log("Copiando public/ → .next/standalone/public/...");
  cpSync(PATHS.public, join(PATHS.standalone, "public"), { recursive: true });

  // ── 4. Descargar Node.js portable ──────────────────────────────────────────
  mkdirSync(PATHS.tmp, { recursive: true });
  const zipDest = join(PATHS.tmp, NODE_ZIP);
  const nodeExtracted = join(PATHS.tmp, NODE_FOLDER);

  if (!existsSync(join(nodeExtracted, "node.exe"))) {
    log(`Descargando Node.js ${NODE_VERSION} portable...`);
    await downloadFile(NODE_URL, zipDest);

    log("Extrayendo Node.js...");
    mkdirSync(PATHS.tmp, { recursive: true });
    await extractZip(zipDest, PATHS.tmp);
    rmSync(zipDest, { force: true });
  } else {
    log(`Node.js ${NODE_VERSION} ya en caché (tmp/${NODE_FOLDER})`);
  }

  // ── 5. Preparar recursos en src-tauri/resources/ ───────────────────────────
  log("Preparando src-tauri/resources/...");
  mkdirSync(PATHS.resources, { recursive: true });

  // node/node.exe
  if (existsSync(PATHS.nodeResources)) {
    rmSync(PATHS.nodeResources, { recursive: true, force: true });
  }
  mkdirSync(PATHS.nodeResources, { recursive: true });
  cpSync(join(nodeExtracted, "node.exe"), join(PATHS.nodeResources, "node.exe"));
  log("✓ node.exe copiado");

  // VCRUNTIME140.dll — requerida por @libsql/win32-x64-msvc/index.node (native addon de SQLite).
  // La copiamos desde System32 para garantizar que la app funciona en Windows sin
  // Visual C++ Redistributable instalado. Microsoft permite redistribuir estas DLLs.
  const system32 = join(process.env.SystemRoot || "C:\\Windows", "System32");
  const vcDlls = ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll"];
  let vcCopiadas = 0;
  for (const dll of vcDlls) {
    const src = join(system32, dll);
    if (existsSync(src)) {
      cpSync(src, join(PATHS.nodeResources, dll));
      vcCopiadas++;
      log(`✓ ${dll} bundleada desde System32`);
    }
  }
  if (vcCopiadas === 0) {
    log("⚠ VCRUNTIME140.dll no encontrada en System32 — instala Visual C++ 2022 Redistributable");
  }

  // server/ (Next.js standalone)
  if (existsSync(PATHS.serverResources)) {
    rmSync(PATHS.serverResources, { recursive: true, force: true });
  }
  // dereference:true convierte los symlinks de pnpm en archivos reales,
  // lo que permite eliminar .pnpm/ con sus rutas largas que rompen NSIS (MAX_PATH=260)
  cpSync(PATHS.standalone, PATHS.serverResources, { recursive: true, dereference: true });
  log("✓ Next.js standalone copiado como server/");

  // ── Incrustar claves privadas desde .env.local en resources/server/.env.keys ─
  // Este archivo va dentro de src-tauri/resources/ que está en .gitignore.
  // Solo se empaqueta en el instalador cuando el usuario construye desde su propia máquina.
  // Las builds públicas no tendrán este archivo → widgets requieren configuración.
  const envLocalPath = join(ROOT, ".env.local");
  if (existsSync(envLocalPath)) {
    const envContent = readFileSync(envLocalPath, "utf-8");
    const privateVars = [
      "NINTENDO_ALGOLIA_APP_ID",
      "NINTENDO_ALGOLIA_API_KEY",
    ];
    const lines = [];
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.startsWith("#") || !trimmed.includes("=")) continue;
      const key = trimmed.split("=")[0].trim();
      if (privateVars.includes(key)) {
        lines.push(trimmed);
      }
    }
    if (lines.length > 0) {
      writeFileSync(
        join(PATHS.serverResources, ".env.keys"),
        lines.join("\n") + "\n",
        "utf-8"
      );
      log(`✓ Claves privadas incrustadas en server/.env.keys (${lines.length} vars, no subido a git)`);
    } else {
      log("ℹ Ninguna clave privada encontrada en .env.local — widgets externos sin configurar en la build pública");
    }
  } else {
    log("ℹ .env.local no encontrado — widgets externos sin configurar en la build pública");
  }

  // Aplanar .pnpm/ → node_modules/ ANTES de borrarlo.
  //
  // PROBLEMA: El tracer de Next.js (nft) a veces genera stubs para módulos externos
  // (solo package.json, sin el código real). Por ejemplo, whatwg-url@15 aparece como
  // stub porque @libsql/client es externo y nft no rastrea todos sus archivos.
  //
  // SOLUCIÓN EN 2 FASES:
  //   1. Aplanar .pnpm/ eligiendo siempre la copia MÁS COMPLETA (más archivos) de
  //      cada paquete — evita que un stub sobreescriba una copia completa.
  //   2. Reparar stubs restantes copiando la versión completa desde el store LOCAL
  //      del proyecto (node_modules/.pnpm/), que siempre tiene los archivos reales.
  const pnpmDir = join(PATHS.serverResources, "node_modules", ".pnpm");
  if (existsSync(pnpmDir)) {
    log("Aplanando .pnpm/ → node_modules/ (fase 1: recopilar versiones más completas)...");
    const topLevel = join(PATHS.serverResources, "node_modules");

    // Mapa: pkgKey → { src, fileCount }  (pkgKey = "nombre" o "@scope/nombre")
    const bestCopy = new Map();

    const collectPkg = (src, pkgKey) => {
      if (!existsSync(src)) return;
      let count;
      try { count = readdirSync(src).length; } catch (_) { return; }
      const prev = bestCopy.get(pkgKey);
      if (!prev || count > prev.fileCount) {
        bestCopy.set(pkgKey, { src, fileCount: count });
      }
    };

    for (const entry of readdirSync(pnpmDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const virtualNm = join(pnpmDir, entry.name, "node_modules");
      if (!existsSync(virtualNm)) continue;

      for (const pkg of readdirSync(virtualNm, { withFileTypes: true })) {
        if (!pkg.isDirectory()) continue;
        if (pkg.name === ".modules.yaml" || pkg.name === ".package-lock.json") continue;

        if (pkg.name.startsWith("@")) {
          const scopeSrc = join(virtualNm, pkg.name);
          try {
            for (const sp of readdirSync(scopeSrc, { withFileTypes: true })) {
              if (!sp.isDirectory()) continue;
              collectPkg(join(scopeSrc, sp.name), pkg.name + "/" + sp.name);
            }
          } catch (_) {}
        } else {
          collectPkg(join(virtualNm, pkg.name), pkg.name);
        }
      }
    }

    // Copiar al top-level (solo si no existe ya con más archivos)
    let copiados = 0;
    for (const [pkgKey, { src, fileCount }] of bestCopy) {
      let dest;
      if (pkgKey.startsWith("@")) {
        const [scope, name] = pkgKey.split("/");
        mkdirSync(join(topLevel, scope), { recursive: true });
        dest = join(topLevel, scope, name);
      } else {
        dest = join(topLevel, pkgKey);
      }
      if (!existsSync(dest)) {
        try {
          cpSync(src, dest, { recursive: true, dereference: true });
          copiados++;
        } catch (_) {}
      } else {
        // Existe pero podría ser un stub anterior; reemplazar si el nuevo es más completo
        try {
          const existingCount = readdirSync(dest).length;
          if (fileCount > existingCount && existingCount <= 1) {
            rmSync(dest, { recursive: true, force: true });
            cpSync(src, dest, { recursive: true, dereference: true });
          }
        } catch (_) {}
      }
    }
    log(`✓ ${copiados} paquetes aplanados al nivel superior`);

    // Fase 2: Reparar stubs desde el store LOCAL del proyecto
    // El store local (node_modules/.pnpm/) siempre tiene los archivos reales.
    log("Reparando paquetes incompletos desde el store local de pnpm (fase 2)...");
    const localPnpm = join(ROOT, "node_modules", ".pnpm");
    let reparados = 0;

    const repairPkg = (pkgDir, pkgKey) => {
      let files;
      try { files = readdirSync(pkgDir).filter(f => f !== ".package-lock.json"); }
      catch (_) { return; }
      if (files.length > 1) return; // Parece completo

      // Leer versión del package.json stub
      const pkgJsonPath = join(pkgDir, "package.json");
      if (!existsSync(pkgJsonPath)) return;
      let version;
      try { version = JSON.parse(readFileSync(pkgJsonPath, "utf-8")).version; }
      catch (_) { return; }

      // Buscar en el store local: "@scope/name" → "scope+name@version..."
      const safeKey = pkgKey.startsWith("@")
        ? pkgKey.slice(1).replace("/", "+")
        : pkgKey;
      const needle = safeKey + "@" + version;

      let localEntries = [];
      try { localEntries = readdirSync(localPnpm).filter(e => e.startsWith(needle)); }
      catch (_) { return; }

      // Si no hay coincidencia exacta, buscar cualquier versión del mismo paquete
      if (localEntries.length === 0) {
        try { localEntries = readdirSync(localPnpm).filter(e => e.startsWith(safeKey + "@")); }
        catch (_) {}
      }

      for (const localEntry of localEntries) {
        const localPkgPath = join(localPnpm, localEntry, "node_modules", pkgKey);
        if (!existsSync(localPkgPath)) continue;
        let localCount;
        try { localCount = readdirSync(localPkgPath).length; } catch (_) { continue; }
        if (localCount <= 1) continue; // También es stub en local

        try {
          rmSync(pkgDir, { recursive: true, force: true });
          cpSync(localPkgPath, pkgDir, { recursive: true, dereference: true });
          reparados++;
          return;
        } catch (_) {}
      }
    };

    // Reparar todos los paquetes top-level
    for (const entry of readdirSync(topLevel, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      if (entry.name.startsWith("@")) {
        const scopeDir = join(topLevel, entry.name);
        try {
          for (const sp of readdirSync(scopeDir, { withFileTypes: true })) {
            if (!sp.isDirectory()) continue;
            repairPkg(join(scopeDir, sp.name), entry.name + "/" + sp.name);
          }
        } catch (_) {}
      } else {
        repairPkg(join(topLevel, entry.name), entry.name);
      }
    }

    if (reparados > 0) log(`✓ ${reparados} paquetes stubs reparados desde store local`);
    log("Eliminando .pnpm/ (rutas largas incompatibles con NSIS MAX_PATH=260)...");
    rmSync(pnpmDir, { recursive: true, force: true });
    log("✓ .pnpm/ eliminado");
  }

  // ── 6. Actualizar tauri.conf.json con los recursos ─────────────────────────
  log("Verificando archivos clave antes de continuar...");
  const nodeExeCheck = join(PATHS.nodeResources, "node.exe");
  const serverJsCheck = join(PATHS.serverResources, "server.js");
  if (!existsSync(nodeExeCheck)) {
    throw new Error(`node.exe no encontrado en ${nodeExeCheck}`);
  }
  if (!existsSync(serverJsCheck)) {
    throw new Error(`server.js no encontrado en ${serverJsCheck}`);
  }
  log("✓ node.exe y server.js verificados");

  log("Actualizando src-tauri/tauri.conf.json con recursos...");
  const tauriConfPath = join(ROOT, "src-tauri", "tauri.conf.json");
  const tauriConf = JSON.parse(readFileSync(tauriConfPath, "utf-8"));
  tauriConf.bundle.resources = ["resources/**/*"];
  writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + "\n", "utf-8");
  log("✓ tauri.conf.json actualizado con resources");

  log("\n✅ Build desktop listo. Ejecuta `pnpm tauri:build` para generar el instalador.\n");
}

main().catch((err) => {
  console.error("\n❌ Error en build-desktop:", err);
  process.exit(1);
});
