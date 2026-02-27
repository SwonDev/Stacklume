#!/usr/bin/env node
/**
 * Genera los assets BMP para el instalador NSIS de Stacklume.
 *
 * Tauri v2 NSIS acepta:
 *   headerImage  — 150×57 px BMP (banner superior en cada página del instalador)
 *   sidebarImage — 164×314 px BMP (columna izquierda en welcome/finish)
 *
 * NSIS renderiza estos BMPs sobre su propio fondo blanco/gris.
 * Formato requerido: BMP 24-bit sin compresión, bottom-up (biHeight positivo).
 */

import { mkdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const NSIS_DIR = join(ROOT, "src-tauri", "nsis");

mkdirSync(NSIS_DIR, { recursive: true });

// ── Paleta Stacklume ──────────────────────────────────────────────────────────
const C = {
  // Fondos
  white:    [255, 255, 255],
  offwhite: [248, 249, 255],   // azul muy tenue — distintivo pero limpio
  light:    [240, 243, 255],
  dark:     [10,  10,  16],
  deeper:   [15,  15,  26],
  // Acentos
  indigo:   [99,  102, 241],   // #6366f1
  violet:   [139, 92,  246],   // #8b5cf6
  indDark:  [67,  56,  202],   // #4338ca
  purple:   [109, 40,  217],   // #6d28d9
  // Textos
  gray:     [100, 116, 139],
};

/** Mezcla lineal entre dos colores */
function lerp(a, b, t) {
  return Math.round(a + (b - a) * Math.max(0, Math.min(1, t)));
}
function lerpC([r1, g1, b1], [r2, g2, b2], t) {
  return [lerp(r1, r2, t), lerp(g1, g2, t), lerp(b1, b2, t)];
}

/**
 * Crea un buffer BMP 24-bit.
 * @param {number} width
 * @param {number} height
 * @param {(x: number, y: number) => [number, number, number]} pixelFn
 */
function createBMP(width, height, pixelFn) {
  const rowStride = Math.floor((width * 3 + 3) / 4) * 4; // alineado a 4 bytes
  const pixelDataSize = rowStride * height;
  const headerSize = 14 + 40;
  const fileSize = headerSize + pixelDataSize;
  const buf = Buffer.alloc(fileSize, 0);

  // BITMAPFILEHEADER
  buf.write("BM", 0, "ascii");
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(headerSize, 10);

  // BITMAPINFOHEADER
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(width, 18);
  buf.writeInt32LE(height, 22);   // positivo = bottom-up (requerido por NSIS)
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30);       // BI_RGB
  buf.writeUInt32LE(pixelDataSize, 34);
  buf.writeInt32LE(2835, 38);
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);

  // Píxeles (BMP bottom-up: fila 0 del buffer = fila BOTTOM de la imagen)
  for (let y = 0; y < height; y++) {
    const imgY = height - 1 - y; // invertir: y=0 → fila superior de la imagen
    for (let x = 0; x < width; x++) {
      const [r, g, b] = pixelFn(x, imgY);
      const off = headerSize + y * rowStride + x * 3;
      buf[off] = b; buf[off + 1] = g; buf[off + 2] = r; // BGR
    }
  }
  return buf;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEADER BMP — 150×57 px
//
// Diseño:
//   • Fondo blanco azulado (#f8f9ff) — se integra con el marco del instalador
//   • Franja de acento izquierda (8 px) con gradiente indigo→violeta vertical
//   • Gradiente horizontal muy sutil en el fondo (izq → der)
//   • Línea inferior de 2 px con gradiente indigo→violeta de plena intensidad
//   • Separador interior (1 px) junto a la franja
// ─────────────────────────────────────────────────────────────────────────────
const HEADER_W = 150;
const HEADER_H = 57;

const headerBmp = createBMP(HEADER_W, HEADER_H, (x, y) => {
  const tY = y / HEADER_H;      // 0 = arriba, 1 = abajo
  const tX = x / HEADER_W;      // 0 = izq,   1 = der

  // Franja de acento: 8 px izquierda — gradiente indigo→violeta
  if (x < 8) {
    return lerpC(C.indigo, C.violet, tY);
  }

  // Línea de separación interna (px 8): sombra suave
  if (x === 8) {
    const shadow = lerpC(C.indigo, C.light, 0.55);
    return shadow;
  }

  // Línea inferior (últimos 2 px): gradiente completo indigo→violeta
  if (y >= HEADER_H - 2) {
    const t = (x - 9) / (HEADER_W - 9);
    return lerpC(C.indigo, C.violet, t);
  }

  // Fondo: blanco azulado con gradiente horizontal muy sutil
  const base = lerpC(C.offwhite, C.white, tX * 0.5);
  // Tinte leve hacia arriba (brillo)
  const brightness = lerp(0, 8, (1 - tY) * 0.4);
  return base.map(ch => Math.min(255, ch + brightness));
});

writeFileSync(join(NSIS_DIR, "header.bmp"), headerBmp);
console.log(`✓ header.bmp  (${HEADER_W}×${HEADER_H})`);

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR BMP — 164×314 px
//
// Diseño (welcome/finish pages):
//   • Fondo: degradado vertical oscuro indigo profundo → violeta oscuro → casi negro
//   • Patrón de cuadrícula de puntos tenues
//   • Franja superior de 4 px: gradiente horizontal indigo→violeta (marca)
//   • Franja derecha de 1 px: acento brillante
//   • Área inferior con tono más claro para contraste
// ─────────────────────────────────────────────────────────────────────────────
const SIDE_W = 164;
const SIDE_H = 314;

const sidebarBmp = createBMP(SIDE_W, SIDE_H, (x, y) => {
  const tY = y / SIDE_H;
  const tX = x / SIDE_W;

  // Franja superior (top 4px): gradiente indigo→violeta completo
  if (y < 4) {
    return lerpC(C.indigo, C.violet, tX);
  }

  // Franja derecha (1px): acento brillante
  if (x >= SIDE_W - 1) {
    return lerpC(C.indigo, C.violet, tY);
  }

  // Patrón de puntos (cuadrícula 18px): tenues
  const dotX = (x % 18) === 9;
  const dotY = (y % 18) === 9;
  if (dotX && dotY) {
    const accent = lerpC(C.indigo, C.violet, tY);
    return lerpC(C.dark, accent, 0.30);
  }

  // Gradiente de fondo: indigo oscuro (arriba) → casi negro (abajo)
  // Arriba: [20,20,50]  Centro: [14,10,36]  Abajo: [8,8,18]
  const top    = [20, 20, 50];
  const middle = [14, 10, 36];
  const bottom = [8,  8,  18];

  let bg;
  if (tY < 0.5) {
    bg = lerpC(top, middle, tY * 2);
  } else {
    bg = lerpC(middle, bottom, (tY - 0.5) * 2);
  }

  // Tinte de acento de indigo muy sutil (horizontal)
  const accentStrength = 0.08 * (1 - tX * 0.7);
  const accent = lerpC(C.indigo, C.violet, tY);
  return bg.map((ch, i) => Math.min(255, Math.round(ch + accent[i] * accentStrength)));
});

writeFileSync(join(NSIS_DIR, "sidebar.bmp"), sidebarBmp);
console.log(`✓ sidebar.bmp (${SIDE_W}×${SIDE_H})`);

console.log(`\n✅ Assets NSIS generados en src-tauri/nsis/`);
