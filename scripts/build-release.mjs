#!/usr/bin/env node
/**
 * build-release.mjs — Wrapper de build con firma automática y generación de update manifest.
 *
 * Pasos:
 * 1. Carga TAURI_SIGNING_PRIVATE_KEY desde .env.local si no está ya en el entorno
 * 2. Ejecuta `tauri build` (que a su vez ejecuta build:desktop como beforeBuildCommand)
 * 3. Si Tauri no generó el .sig automáticamente, firma explícitamente con tauri signer sign
 * 4. Genera update-manifest.json con versión, URL y firma
 * 5. Sube instalador + .sig + manifest a la GitHub release del tag actual (--clobber)
 *
 * Uso:
 *   pnpm tauri:build          → build completo con firma + manifest + upload
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
  console.warn("[build-release] ⚠ TAURI_SIGNING_PRIVATE_KEY no encontrada — el auto-updater no funcionará.");
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

// ─── 3. Localizar instalador ────────────────────────────────────────────────

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

// ─── 4. Firmar el instalador si Tauri no lo hizo automáticamente ─────────────

if (!existsSync(sigPath)) {
  const signingKey = process.env.TAURI_SIGNING_PRIVATE_KEY;

  if (!signingKey) {
    console.warn("[build-release] ⚠ Sin clave de firma — saltando firma y manifest");
    process.exit(0);
  }

  console.log("[build-release] Firmando instalador con tauri signer sign...");

  const password = process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD ?? "";

  const result = spawnSync(
    "pnpm",
    [
      "exec", "tauri", "signer", "sign",
      "-k", signingKey,
      "-p", password,
      installerPath,
    ],
    { encoding: "utf8", cwd: ROOT, stdio: "pipe" }
  );

  if (result.status !== 0) {
    console.error("[build-release] ✗ Error al firmar:", result.stderr || result.stdout);
    process.exit(1);
  }

  console.log("[build-release] ✓ Instalador firmado correctamente");
}

// ─── 5. Generar update-manifest.json ─────────────────────────────────────────

const manifestPath = join(nsisDir, "update-manifest.json");

if (!existsSync(sigPath)) {
  console.error("[build-release] ✗ Archivo .sig sigue sin existir tras el intento de firma");
  process.exit(1);
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
console.log(`  Versión:    ${version}`);
console.log(`  Instalador: ${installerName}`);
console.log(`  Firma:      ${signature.slice(0, 50)}…`);

// ─── 6. Subir a GitHub release si el tag ya existe ───────────────────────────

const tag = `v${version}`;
console.log(`\n[build-release] Comprobando release GitHub ${tag}...`);

const ghCheck = spawnSync("gh", ["release", "view", tag, "--json", "tagName"], {
  encoding: "utf8",
  cwd: ROOT,
});

if (ghCheck.status === 0) {
  console.log(`[build-release] Release ${tag} encontrada — subiendo assets...`);

  const uploadAssets = [
    { path: installerPath, name: installerName },
    { path: sigPath, name: `${installerName}.sig` },
    { path: manifestPath, name: "update-manifest.json" },
  ];

  for (const asset of uploadAssets) {
    process.stdout.write(`  → ${asset.name}... `);
    const result = spawnSync(
      "gh",
      ["release", "upload", tag, `${asset.path}#${asset.name}`, "--clobber"],
      { encoding: "utf8", cwd: ROOT }
    );
    if (result.status !== 0) {
      console.error(`✗\n    ${result.stderr}`);
    } else {
      console.log("✓");
    }
  }

  console.log(`\n✅ Release ${tag} lista con auto-updater:`);
  console.log(`   https://github.com/SwonDev/Stacklume/releases/tag/${tag}`);
} else {
  console.log(`[build-release] No existe release ${tag} en GitHub todavía.`);
  console.log(`Crea la release con:\n`);
  console.log(`  gh release create ${tag} \\`);
  console.log(`    "${installerPath}#${installerName}" \\`);
  console.log(`    "${sigPath}#${installerName}.sig" \\`);
  console.log(`    "${manifestPath}#update-manifest.json" \\`);
  console.log(`    --title "Stacklume ${tag}" --notes "..."`);
}
