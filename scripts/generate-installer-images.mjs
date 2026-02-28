#!/usr/bin/env node
/**
 * generate-installer-images.mjs
 *
 * Genera las imágenes BMP para el instalador NSIS de Stacklume.
 * Paleta de marca: Navy Blue (#0d1117) + Gold (#d4a520), estilo shadcn dark.
 *
 *   src-tauri/nsis/sidebar.bmp  — 164×314 px — páginas Welcome y Finish
 *   src-tauri/nsis/header.bmp   — 150×57  px — cabecera de páginas interiores
 *
 * Sin dependencias externas. Genera BMP 24-bit puro.
 * Uso: node scripts/generate-installer-images.mjs
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT     = join(__dirname, '..');
const NSIS_DIR = join(ROOT, 'src-tauri', 'nsis');

// ─── Paleta [R, G, B] ────────────────────────────────────────────────────────
const C = {
  bg:      [13,  17,  23],   // #0d1117 — navy fondo
  bgMid:   [22,  30,  50],   // #161e32 — navy medio
  bgLight: [32,  44,  72],   // #202c48 — navy claro (bordes tarjetas)
  gold:    [212, 165, 32],   // #d4a520 — dorado principal
  goldHi:  [228, 193, 80],   // #e4c150 — dorado claro (highlight)
  goldDim: [130, 100, 20],   // #826414 — dorado oscuro (separadores)
};

// ─── Fuente de píxeles 5×7 ───────────────────────────────────────────────────
// Formato: 7 filas, cada fila 5 bits ('0'=vacío, '1'=píxel). Fila 0 = arriba.
const FONT = {
  ' ': ['00000','00000','00000','00000','00000','00000','00000'],
  A:   ['00100','01010','10001','11111','10001','10001','10001'],
  C:   ['01110','10001','10000','10000','10000','10001','01110'],
  E:   ['11111','10000','10000','11110','10000','10000','11111'],
  K:   ['10001','10010','10100','11000','10100','10010','10001'],
  L:   ['10000','10000','10000','10000','10000','10001','11111'],
  M:   ['10001','11011','10101','10001','10001','10001','10001'],
  S:   ['01110','10001','10000','01110','00001','10001','01110'],
  T:   ['11111','00100','00100','00100','00100','00100','00100'],
  U:   ['10001','10001','10001','10001','10001','10001','01110'],
};

// ─── Motor BMP 24-bit ─────────────────────────────────────────────────────────
/**
 * Crea un buffer BMP 24-bit bottom-up.
 * @param {number} width
 * @param {number} height
 * @param {function} drawFn - recibe { rect, glyph, text, setPixel }
 */
function makeBMP(width, height, drawFn) {
  // Cada fila se rellena hasta múltiplo de 4 bytes
  const rowSize      = Math.ceil((width * 3) / 4) * 4;
  const pixelDataSize = rowSize * height;
  const buf          = Buffer.alloc(54 + pixelDataSize, 0);

  // ── Cabecera de archivo BMP (14 bytes) ──
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(54 + pixelDataSize, 2);   // tamaño total
  buf.writeUInt32LE(54, 10);                   // offset a datos de píxel

  // ── DIB BITMAPINFOHEADER (40 bytes) ──
  buf.writeUInt32LE(40, 14);                   // tamaño de cabecera DIB
  buf.writeInt32LE(width,  18);
  buf.writeInt32LE(height, 22);                // positivo = almacenamiento bottom-up
  buf.writeUInt16LE(1,  26);                   // planos de color
  buf.writeUInt16LE(24, 28);                   // bits por píxel
  buf.writeUInt32LE(pixelDataSize, 34);        // tamaño de datos de píxel
  buf.writeInt32LE(2835, 38);                  // píxeles por metro X (~72 dpi)
  buf.writeInt32LE(2835, 42);                  // píxeles por metro Y

  /** Escribe un píxel. y=0 es la fila superior de la imagen. */
  function setPixel(x, y, [r, g, b]) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    // BMP bottom-up: fila de imagen y → fila de archivo (height-1-y)
    const off = 54 + (height - 1 - y) * rowSize + x * 3;
    buf[off] = b; buf[off + 1] = g; buf[off + 2] = r; // orden BGR
  }

  /** Rellena un rectángulo con un color. */
  function rect(x, y, w, h, color) {
    for (let dy = 0; dy < h; dy++)
      for (let dx = 0; dx < w; dx++)
        setPixel(x + dx, y + dy, color);
  }

  /** Dibuja un glifo 5×7 escalado `s` veces. */
  function glyph(ch, x, y, s, color) {
    const rows = FONT[ch.toUpperCase()] ?? FONT[' '];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++)
        if (rows[row][col] === '1')
          rect(x + col * s, y + row * s, s, s, color);
  }

  /**
   * Dibuja una cadena de texto. Cada carácter ocupa (5+1)×s píxeles de ancho.
   * Ancho total = (n-1)*(5+1)*s + 5*s = (n*6-1)*s
   */
  function text(str, x, y, s, color) {
    let cx = x;
    for (const ch of str) {
      glyph(ch, cx, y, s, color);
      cx += (5 + 1) * s;
    }
  }

  // Fondo inicial en color navy oscuro
  rect(0, 0, width, height, C.bg);

  drawFn({ rect, glyph, text, setPixel });
  return buf;
}

// ─── Logo "S" con efecto de relieve ──────────────────────────────────────────
/**
 * Dibuja la "S" de Stacklume como logo de píxeles con celdas de `cell` px.
 * Cada celda activa tiene borde dorado + interior más claro (efecto highlight).
 */
function drawLogoS(rect, x, y, cell) {
  const rows = FONT['S'];
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (rows[row][col] === '1') {
        const bx = x + col * cell;
        const by = y + row * cell;
        rect(bx, by, cell, cell, C.gold);
        // Highlight interior (deja un borde dorado oscuro de `pad` px)
        if (cell >= 4) {
          const pad = Math.max(1, Math.floor(cell / 5));
          rect(bx + pad, by + pad, cell - pad * 2, cell - pad * 2, C.goldHi);
        }
      }
    }
  }
}

// ─── SIDEBAR 164 × 314 ───────────────────────────────────────────────────────
// Mostrada en las páginas Welcome y Finish del instalador (lado izquierdo).
const sidebar = makeBMP(164, 314, ({ rect, text, setPixel }) => {
  const W = 164, H = 314;

  // ── Bandas doradas de encuadre ──
  rect(0,     0, W,  8, C.gold);   // banda superior
  rect(0, H - 8, W,  8, C.gold);   // banda inferior
  rect(0,     0, 5,  H, C.gold);   // franja vertical izquierda

  // ── Logo "S" grande (8 px/celda → 40×56 px) ──
  const CELL = 8;
  const logoW = 5 * CELL;          // 40 px
  const logoH = 7 * CELL;          // 56 px
  const logoX = Math.round((W - logoW) / 2); // ≈ 62
  const logoY = 24;
  drawLogoS(rect, logoX, logoY, CELL);

  // ── Separador dorado bajo el logo ──
  const sepY = logoY + logoH + 14; // ≈ 94
  rect(28, sepY, W - 46, 2, C.gold);

  // ── Título "STACKLUME" en escala 2 ──
  //   Ancho: (9*6-1)*2 = 106 px → centrado en 164 px → x ≈ 29
  const TITLE  = 'STACKLUME';
  const tScale = 2;
  const tW     = (TITLE.length * 6 - 1) * tScale; // 106 px
  const tX     = Math.round((W - tW) / 2);         // ≈ 29
  const tY     = sepY + 10;                         // ≈ 104
  text(TITLE, tX, tY, tScale, C.gold);

  // ── Cuadrícula bento 3×4 (tarjetas alternadas dorado/navy) ──
  //   Cada tarjeta: 24×24 px, separación: 8 px
  //   Ancho total: 3*24 + 2*8 = 88 px → centrado en 164 px → x ≈ 38
  const SQ   = 24, GAP = 8;
  const COLS = 3,  ROWS = 4;
  const gW   = COLS * SQ + (COLS - 1) * GAP;        // 88 px
  const gX   = Math.round((W - gW) / 2);             // ≈ 38
  const gY   = tY + 7 * tScale + 20;                 // ≈ 138

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const sx = gX + c * (SQ + GAP);
      const sy = gY + r * (SQ + GAP);
      if ((r + c) % 2 === 0) {
        // Tarjeta activa: borde dorado + interior navy medio
        rect(sx,     sy,     SQ,     SQ,     C.gold);
        rect(sx + 2, sy + 2, SQ - 4, SQ - 4, C.bgMid);
      } else {
        // Tarjeta inactiva: borde navy claro + interior navy oscuro
        rect(sx,     sy,     SQ,     SQ,     C.bgLight);
        rect(sx + 2, sy + 2, SQ - 4, SQ - 4, C.bg);
      }
    }
  }

  // ── Textura de puntos sutiles bajo la cuadrícula ──
  const dotY0 = gY + ROWS * (SQ + GAP) + 4;
  for (let y = dotY0; y < H - 14; y += 8)
    for (let x = 10; x < W - 5; x += 8)
      setPixel(x, y, C.bgLight);
});

// ─── HEADER 150 × 57 ─────────────────────────────────────────────────────────
// Mostrada en la cabecera de las páginas interiores (directorio, progreso, etc.).
// En NSIS MUI2, aparece en el lado derecho de la barra de cabecera.
// El borde izquierdo de la imagen toca el área de texto del instalador.
const header = makeBMP(150, 57, ({ rect, text }) => {
  const W = 150, H = 57;

  // Franja dorada izquierda (borde visual junto al área de texto del instalador)
  rect(0,     0, 4,  H, C.gold);
  // Línea dorada inferior
  rect(0, H - 3, W,  3, C.gold);

  // Fondo navy medio en la zona del logo/texto (da profundidad)
  rect(4, 0, 58, H, C.bgMid);

  // ── Logo "S" pequeño (4 px/celda → 20×28 px) ──
  const CELL = 4;
  const sH   = 7 * CELL;                          // 28 px
  const sX   = 12;
  const sY   = Math.round((H - sH) / 2);          // centrado vertical ≈ 14
  drawLogoS(rect, sX, sY, CELL);

  // ── Texto "STACKLUME" en escala 2 a la derecha del logo ──
  //   logoX(12) + logoW(20) + gap(8) = 40
  //   Ancho texto: (9*6-1)*2 = 106 px → final x = 40+106 = 146 < 150 ✓
  const TITLE  = 'STACKLUME';
  const tScale = 2;
  const tX     = sX + 5 * CELL + 8;               // 40
  const tY     = Math.round((H - 7 * tScale) / 2); // centrado vertical ≈ 21
  text(TITLE, tX, tY, tScale, C.gold);
});

// ─── Guardar archivos ─────────────────────────────────────────────────────────
mkdirSync(NSIS_DIR, { recursive: true });
writeFileSync(join(NSIS_DIR, 'sidebar.bmp'), sidebar);
writeFileSync(join(NSIS_DIR, 'header.bmp'),  header);

console.log('[installer-images] ✓ sidebar.bmp generado (164×314 px, navy+gold)');
console.log('[installer-images] ✓ header.bmp  generado (150×57  px, navy+gold)');
console.log('[installer-images]   Ruta: src-tauri/nsis/');
