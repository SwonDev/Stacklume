#!/usr/bin/env node
/**
 * scripts/build-extension.mjs
 *
 * Empaqueta la extensión de navegador en un ZIP listo para subir a:
 *   • Chrome Web Store  https://chrome.google.com/webstore/devconsole
 *   • Firefox AMO       https://addons.mozilla.org/developers/
 *   • Edge Add-ons      https://partner.microsoft.com/dashboard/microsoftedge/
 *
 * Uso: pnpm build:extension
 */

import { readFileSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root      = resolve(__dirname, '..');
const extDir    = join(root, 'extension');
const distDir   = join(root, 'dist-extension');

// ── Leer versión del manifest ────────────────────────────────────────────────

const manifest = JSON.parse(readFileSync(join(extDir, 'manifest.json'), 'utf-8'));
const { version } = manifest;
const zipName   = `stacklume-extension-v${version}.zip`;
const outputZip = join(distDir, zipName);

// ── Limpiar y crear directorio de salida ─────────────────────────────────────

if (existsSync(distDir)) rmSync(distDir, { recursive: true });
mkdirSync(distDir, { recursive: true });

console.log(`\n📦  Empaquetando Stacklume Extension v${version}...\n`);

// ── Crear ZIP ────────────────────────────────────────────────────────────────
// Windows → PowerShell Compress-Archive
// macOS/Linux → zip

if (process.platform === 'win32') {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${extDir}\\*' -DestinationPath '${outputZip}'"`,
    { stdio: 'inherit' }
  );
} else {
  execSync(`cd "${extDir}" && zip -r "${outputZip}" .`, { stdio: 'inherit', shell: true });
}

const sizeKB = (statSync(outputZip).size / 1024).toFixed(1);

console.log(`\n✓  Empaquetado: dist-extension/${zipName}  (${sizeKB} KB)\n`);
console.log('─────────────────────────────────────────────────────────────────');
console.log('  Subir el ZIP a las stores:');
console.log('');
console.log('  Chrome Web Store  → https://chrome.google.com/webstore/devconsole');
console.log('    (Cuenta de desarrollador: $5 única vez en pay.google.com/about/developer)');
console.log('');
console.log('  Firefox AMO       → https://addons.mozilla.org/developers/');
console.log('    (Gratuito, misma cuenta de Firefox)');
console.log('');
console.log('  Edge Add-ons      → https://partner.microsoft.com/dashboard/microsoftedge/');
console.log('    (Gratuito, cuenta Microsoft)');
console.log('─────────────────────────────────────────────────────────────────\n');
