#!/usr/bin/env node
/**
 * build-release.mjs — Wrapper de build con firma automática y generación de update manifest.
 *
 * Pasos:
 * 1. Carga TAURI_SIGNING_PRIVATE_KEY desde .env.local si no está ya en el entorno
 * 2. Ejecuta `tauri build` (que a su vez ejecuta build:desktop como beforeBuildCommand)
 * 3. Lee el .sig generado por Tauri junto al instalador NSIS
 * 4. Genera update-manifest.json con versión, URL y firma
 * 5. (Opcional) Sube instalador + manifest a la GitHub release del tag actual
 *
 * Uso:
 *   pnpm tauri:build          → build completo con firma + manifest
 */

import { execSync, spawnSync } from "child_process";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// ─── 1. Cargar clave de firma desde .env.local si no está en el entorno ─────

if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  const envPath = join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    const lines = readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^(TAURI_SIGNING[^=]*)=(.+)$/);
      if (m) {
        process.env[m[1].trim()] = m[2].trim();
      }
    }
    if (process.env.TAURI_SIGNING_PRIVATE_KEY) {
      console.log("[build-release] ✓ Clave de firma cargada desde .env.local");
    }
  }
}

if (!process.env.TAURI_SIGNING_PRIVATE_KEY) {
  console.warn("[build-release] ⚠ TAURI_SIGNING_PRIVATE_KEY no encontrada — el instalador no será firmado y el auto-updater no funcionará.");
}

// ─── 2. Ejecutar tauri build (beforeBuildCommand ya incluye Next.js + recursos) ──

console.log("\n[build-release] Iniciando tauri build...\n");
try {
  execSync("pnpm exec tauri build", {
    stdio: "inherit",
    cwd: ROOT,
    env: process.env,
  });
} catch {
  process.exit(1);
}

// ─── 3. Leer versión y localizar el instalador + firma ────────────────────────

const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const version = pkg.version;
const nsisDir = join(ROOT, "src-tauri/target/release/bundle/nsis");
const installerName = `Stacklume_${version}_x64-setup.exe`;
const installerPath = join(nsisDir, installerName);
const sigPath = `${installerPath}.sig`;

if (!existsSync(installerPath)) {
  console.error(`[build-release] ✗ Instalador no encontrado: ${installerPath}`);
  process.exit(1);
}

// ─── 4. Generar update-manifest.json ──────────────────────────────────────────

const manifestPath = join(nsisDir, "update-manifest.json");

if (!existsSync(sigPath)) {
  console.warn("[build-release] ⚠ Archivo .sig no encontrado — manifest sin firma (el auto-updater no aceptará esta actualización).");
  process.exit(0);
}

const signature = readFileSync(sigPath, "utf8").trim();

const manifest = {
  version,
  notes: `Stacklume v${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      url: `https://github.com/SwonDev/Stacklume/releases/download/v${version}/${installerName}`,
      signature,
    },
  },
};

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`\n[build-release] ✓ update-manifest.json generado`);
console.log(`  Versión:   ${version}`);
console.log(`  Instalador: ${installerName}`);
console.log(`  Firma:     ${signature.slice(0, 40)}…`);

// ─── 5. Subir a GitHub release si el tag ya existe ───────────────────────────

const tag = `v${version}`;
console.log(`\n[build-release] Comprobando si existe la GitHub release ${tag}...`);

const ghCheck = spawnSync("gh", ["release", "view", tag, "--json", "tagName"], {
  encoding: "utf8",
  cwd: ROOT,
});

if (ghCheck.status === 0) {
  // La release existe — subir / sobrescribir assets
  console.log(`[build-release] Release ${tag} encontrada — subiendo assets...`);

  const uploadAssets = [
    { path: installerPath, name: installerName },
    { path: sigPath, name: `${installerName}.sig` },
    { path: manifestPath, name: "update-manifest.json" },
  ];

  for (const asset of uploadAssets) {
    console.log(`  → Subiendo ${asset.name}...`);
    const result = spawnSync(
      "gh",
      ["release", "upload", tag, `${asset.path}#${asset.name}`, "--clobber"],
      { encoding: "utf8", cwd: ROOT }
    );
    if (result.status !== 0) {
      console.error(`    ✗ Error: ${result.stderr}`);
    } else {
      console.log(`    ✓ OK`);
    }
  }

  console.log(`\n✅ Release ${tag} actualizada con auto-updater:`);
  console.log(`   https://github.com/SwonDev/Stacklume/releases/tag/${tag}`);
} else {
  // La release no existe — mostrar instrucciones
  console.log(`\n[build-release] Release ${tag} no encontrada en GitHub.`);
  console.log(`Para crear la release con auto-updater, ejecuta:\n`);
  console.log(`  gh release create ${tag} \\`);
  console.log(`    "${installerPath}#${installerName}" \\`);
  console.log(`    "${sigPath}#${installerName}.sig" \\`);
  console.log(`    "${manifestPath}#update-manifest.json" \\`);
  console.log(`    --title "Stacklume ${tag}" --notes "..."`);
}
