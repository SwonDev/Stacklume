/**
 * Test de desanclaje y menú contextual de pegatinas
 *
 * Prueba específicamente:
 * 1. Mover pegatina anclada a espacio vacío → desanclaje
 * 2. Menú contextual con todas sus opciones
 * 3. Doble clic para desanclar manualmente
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import jwt from 'jsonwebtoken';

const SCREENSHOTS_DIR = path.join(__dirname, '..', 'playwright-results', 'stickers');
const APP_URL = 'http://localhost:3001';
const AUTH_SECRET = '__REDACTED_AUTH_SECRET__';
const AUTH_USERNAME = 'WaterSwon';
const COOKIE_NAME = 'stacklume-auth';

function generateAuthToken(): string {
  return jwt.sign({ username: AUTH_USERNAME }, AUTH_SECRET, { expiresIn: '7d' });
}

async function screenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOTS_DIR, `desanclaje-${name}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  console.log(`  Screenshot: desanclaje-${name}.png`);
}

async function getPlacedStickers(page: Page) {
  const stored = await page.evaluate(() => localStorage.getItem('stacklume-stickers'));
  if (!stored) return [];
  return JSON.parse(stored)?.state?.placedStickers ?? [];
}

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test('Desanclaje y menú contextual de pegatinas', async ({ context, page }) => {

  // ── Auth ──────────────────────────────────────────────────────────────────
  await context.addCookies([{
    name: COOKIE_NAME,
    value: generateAuthToken(),
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    secure: false,
    sameSite: 'Lax',
  }]);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Cerrar tour si aparece
  const skipTour = page.locator('[aria-label="Saltar tour"], button:has-text("Saltar")');
  if (await skipTour.first().isVisible().catch(() => false)) {
    await skipTour.first().click();
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(1500);

  // ── PASO 1: Colocar una pegatina sobre un widget ──────────────────────────
  console.log('\n[PASO 1] Colocando pegatina sobre widget...');

  // Abrir libro
  await page.locator('[aria-label="Abrir libro de pegatinas"]').click();
  await page.waitForTimeout(1500);

  // Ir a página de stickers
  const nextBtn = page.locator('[aria-label="Página siguiente"]');
  await nextBtn.click();
  await page.waitForTimeout(1000);

  // Obtener el widget destino (el que aparece en pantalla sin scroll)
  const widgets = page.locator('[data-widget-id]');
  const widgetCount = await widgets.count();
  console.log(`  Widgets disponibles: ${widgetCount}`);

  // Usar el segundo widget (GitHub Search, en el centro) para mejor visibilidad
  const targetWidget = widgets.nth(1);
  const widgetBox = await targetWidget.boundingBox();
  const widgetId = await targetWidget.getAttribute('data-widget-id');
  console.log(`  Widget destino: ${widgetId?.substring(0, 12)}... en (${widgetBox?.x.toFixed(0)}, ${widgetBox?.y.toFixed(0)})`);

  // Obtener el primer sticker del libro
  const stickerItems = page.locator('[data-sticker-book] .cursor-grab');
  const firstStickerBox = await stickerItems.first().boundingBox();

  // Hacer el drag
  const fromX = firstStickerBox!.x + firstStickerBox!.width / 2;
  const fromY = firstStickerBox!.y + firstStickerBox!.height / 2;
  const toX = widgetBox!.x + widgetBox!.width / 2;
  const toY = widgetBox!.y + widgetBox!.height / 2;

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.waitForTimeout(150);
  for (let i = 1; i <= 15; i++) {
    await page.mouse.move(fromX + (toX - fromX) * (i / 15), fromY + (toY - fromY) * (i / 15));
    await page.waitForTimeout(30);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);

  const stickersAfterPlace = await getPlacedStickers(page);
  expect(stickersAfterPlace.length).toBeGreaterThan(0);
  const placedSticker = stickersAfterPlace[stickersAfterPlace.length - 1];
  console.log(`  Pegatina colocada: ${placedSticker.id}`);
  console.log(`  Anclada a widget: ${placedSticker.attachedToWidgetId ?? 'ninguno'}`);
  console.log(`  widgetOffsetX: ${placedSticker.widgetOffsetX}, widgetOffsetY: ${placedSticker.widgetOffsetY}`);

  // Cerrar el libro
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  await screenshot(page, '01-pegatina-sobre-widget');

  // ── PASO 2: Encontrar el elemento del sticker en el DOM ───────────────────
  console.log('\n[PASO 2] Localizando elemento del sticker en el DOM...');

  // El StickerLayer renderiza [data-sticker-item] dentro del scroll container
  const stickerEl = page.locator('[data-sticker-item]').first();
  const stickerElCount = await stickerEl.count();
  console.log(`  Elementos [data-sticker-item] en el DOM: ${stickerElCount}`);

  // Usar evaluate para obtener el bounding rect real del elemento,
  // incluyendo scroll del contenedor
  const stickerScreenPos = await page.evaluate(() => {
    const el = document.querySelector('[data-sticker-item]');
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  console.log(`  Posición real del elemento [data-sticker-item]: ${JSON.stringify(stickerScreenPos)}`);

  // También obtener posición usando el scroll container
  const freshWidgetBox = await targetWidget.boundingBox();
  const stickerScreenX_calc = freshWidgetBox!.x + placedSticker.widgetOffsetX;
  const stickerScreenY_calc = freshWidgetBox!.y + placedSticker.widgetOffsetY;
  console.log(`  Widget está en pantalla: (${freshWidgetBox?.x.toFixed(0)}, ${freshWidgetBox?.y.toFixed(0)})`);
  console.log(`  Pegatina calculada: (${stickerScreenX_calc.toFixed(0)}, ${stickerScreenY_calc.toFixed(0)})`);

  // Usar la posición real del elemento si está disponible
  const stickerCenterX = stickerScreenPos
    ? stickerScreenPos.x + stickerScreenPos.width / 2
    : stickerScreenX_calc + 36;
  const stickerCenterY = stickerScreenPos
    ? stickerScreenPos.y + stickerScreenPos.height / 2
    : stickerScreenY_calc + 36;
  console.log(`  Centro del sticker para interacción: (${stickerCenterX.toFixed(0)}, ${stickerCenterY.toFixed(0)})`);

  // Scroll hasta la pegatina si es necesario
  if (stickerScreenPos && (stickerScreenPos.y < 0 || stickerScreenPos.y > 900)) {
    console.log('  Haciendo scroll hasta la pegatina...');
    await stickerEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }

  // ── PASO 3: Hacer clic derecho en la pegatina (menú contextual) ───────────
  console.log('\n[PASO 3] Menú contextual de la pegatina...');

  // Clic izquierdo para seleccionar
  await page.mouse.click(stickerCenterX, stickerCenterY);
  await page.waitForTimeout(400);
  await screenshot(page, '02-pegatina-seleccionada');

  // Verificar handles de selección
  const resizeHandles = page.locator('[data-resize-handle]');
  const rotateHandle = page.locator('[data-rotate-handle]');
  const resizeCount = await resizeHandles.count();
  const rotateCount = await rotateHandle.count();
  console.log(`  Handles de resize: ${resizeCount} (esperado: 4)`);
  console.log(`  Handle de rotación: ${rotateCount} (esperado: 1)`);

  // Clic derecho para menú contextual
  await page.mouse.click(stickerCenterX, stickerCenterY, { button: 'right' });
  await page.waitForTimeout(800);
  await screenshot(page, '03-menu-contextual');

  const contextMenu = page.locator('[data-sticker-context-menu]');
  const menuVisible = await contextMenu.isVisible().catch(() => false);
  console.log(`  Menú contextual visible: ${menuVisible}`);

  if (menuVisible) {
    const menuText = await contextMenu.textContent();
    console.log(`  Opciones del menú: "${menuText?.replace(/\s+/g, ' ').trim().substring(0, 200)}"`);

    // Verificar las secciones del menú según StickerContextMenu.tsx
    const sizeLabel = contextMenu.locator('text=Size');
    const rotationLabel = contextMenu.locator('text=Rotation');
    const flipLabel = contextMenu.locator('text=Flip');
    const opacityLabel = contextMenu.locator('text=Opacity');
    const duplicateBtn = contextMenu.locator('text=Duplicate');
    const lockBtn = contextMenu.locator('text=Lock');
    const deleteBtn = contextMenu.locator('text=Delete');
    const bringToFrontBtn = contextMenu.locator('text=Bring to Front');

    console.log(`\n  Secciones del menú:`);
    console.log(`    Size: ${await sizeLabel.count() > 0}`);
    console.log(`    Rotation: ${await rotationLabel.count() > 0}`);
    console.log(`    Flip: ${await flipLabel.count() > 0}`);
    console.log(`    Opacity: ${await opacityLabel.count() > 0}`);
    console.log(`    Duplicate: ${await duplicateBtn.count() > 0}`);
    console.log(`    Lock/Unlock: ${await lockBtn.count() > 0}`);
    console.log(`    Delete: ${await deleteBtn.count() > 0}`);
    console.log(`    Bring to Front: ${await bringToFrontBtn.count() > 0}`);

    // Hacer zoom del menú contextual
    await screenshot(page, '03b-menu-detalle');
  }

  // Cerrar el menú
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ── PASO 4: Desanclaje mediante DOBLE CLIC ────────────────────────────────
  console.log('\n[PASO 4] Desanclaje mediante doble clic...');

  const stickerBefore = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
  console.log(`  Estado antes del doble clic:`);
  console.log(`    attachedToWidgetId: ${stickerBefore?.attachedToWidgetId ?? 'ninguno'}`);

  // Doble clic en la pegatina para desanclarla
  await page.mouse.dblclick(stickerCenterX, stickerCenterY);
  await page.waitForTimeout(800);
  await screenshot(page, '04-despues-doble-clic');

  const stickerAfterDoubleClick = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
  console.log(`  Estado después del doble clic:`);
  console.log(`    attachedToWidgetId: ${stickerAfterDoubleClick?.attachedToWidgetId ?? 'undefined (desanclado)'}`);

  if (stickerBefore?.attachedToWidgetId && !stickerAfterDoubleClick?.attachedToWidgetId) {
    console.log(`\n  DESANCLAJE POR DOBLE CLIC: VERIFICADO ✓`);
    console.log(`  La pegatina se desancló del widget al hacer doble clic.`);
  }

  // ── PASO 5: Mover pegatina desanclada → nuevo widget (re-anclaje) ─────────
  console.log('\n[PASO 5] Mover pegatina flotante → widget diferente (re-anclaje)...');

  // Ahora la pegatina es flotante. La movemos al tercer widget (si existe)
  const thirdWidget = widgets.nth(0); // GitHub Trending (izquierda)
  const thirdWidgetBox = await thirdWidget.boundingBox();
  const thirdWidgetId = await thirdWidget.getAttribute('data-widget-id');
  console.log(`  Widget destino: ${thirdWidgetId?.substring(0, 12)}... en (${thirdWidgetBox?.x.toFixed(0)}, ${thirdWidgetBox?.y.toFixed(0)})`);

  if (thirdWidgetBox) {
    // La pegatina ahora es flotante y está en stickerCenterX, stickerCenterY (aprox)
    // Obtenemos su posición actual del store
    const floatingStickerState = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
    const currentX = floatingStickerState?.x ?? stickerCenterX;
    const currentY = floatingStickerState?.y ?? stickerCenterY;
    console.log(`  Posición actual del sticker flotante: (${currentX.toFixed(0)}, ${currentY.toFixed(0)})`);

    // Calcular posición en pantalla (el sticker flotante usa posición absoluta del scroll container)
    const scrollContainer = page.locator('[data-sticker-container]');
    const scrollContainerBox = await scrollContainer.boundingBox();
    const screenX = (scrollContainerBox?.x ?? 0) + currentX - (await page.evaluate(() => document.querySelector('[data-sticker-container]')?.scrollLeft ?? 0));
    const screenY = (scrollContainerBox?.y ?? 0) + currentY - (await page.evaluate(() => document.querySelector('[data-sticker-container]')?.scrollTop ?? 0));

    console.log(`  Scroll container en: (${scrollContainerBox?.x.toFixed(0)}, ${scrollContainerBox?.y.toFixed(0)})`);
    console.log(`  Pegatina en pantalla (calculada): (${screenX.toFixed(0)}, ${screenY.toFixed(0)})`);

    const destX = thirdWidgetBox.x + 100;
    const destY = thirdWidgetBox.y + 100;

    await page.mouse.move(screenX + 36, screenY + 36);
    await page.mouse.down();
    await page.waitForTimeout(150);
    for (let i = 1; i <= 15; i++) {
      await page.mouse.move(
        screenX + 36 + (destX - (screenX + 36)) * (i / 15),
        screenY + 36 + (destY - (screenY + 36)) * (i / 15)
      );
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(1500);
    await screenshot(page, '05-pegatina-movida-a-nuevo-widget');

    const stickerAfterMove = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
    console.log(`  Estado después del movimiento:`);
    console.log(`    attachedToWidgetId: ${stickerAfterMove?.attachedToWidgetId ?? 'ninguno (flotante)'}`);

    if (stickerAfterMove?.attachedToWidgetId) {
      console.log(`\n  RE-ANCLAJE AUTOMÁTICO: VERIFICADO ✓`);
      console.log(`  La pegatina se ancló al nuevo widget: ${stickerAfterMove.attachedToWidgetId}`);
    }
  }

  // ── PASO 6: Desanclaje moviendo a espacio vacío ───────────────────────────
  console.log('\n[PASO 6] Mover pegatina → espacio vacío del scroll container...');

  // Obtener estado actual del sticker
  const currentStickerState = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
  console.log(`  attachedToWidgetId actual: ${currentStickerState?.attachedToWidgetId ?? 'ninguno'}`);

  if (currentStickerState?.attachedToWidgetId) {
    // Calcular posición en pantalla del sticker anclado
    const attachedWidget = page.locator(`[data-widget-id="${currentStickerState.attachedToWidgetId}"]`);
    const attachedWidgetBox = await attachedWidget.boundingBox();

    if (attachedWidgetBox) {
      const screenX = attachedWidgetBox.x + currentStickerState.widgetOffsetX;
      const screenY = attachedWidgetBox.y + currentStickerState.widgetOffsetY;

      // Espacio vacío: debajo de todos los widgets en pantalla
      // Usamos una posición central en la pantalla pero desplazada
      const emptyAreaX = 200; // Lejos de todos los widgets
      const emptyAreaY = 400; // Centro vertical

      console.log(`  Pegatina en pantalla: (${screenX.toFixed(0)}, ${screenY.toFixed(0)})`);
      console.log(`  Destino (espacio vacío): (${emptyAreaX}, ${emptyAreaY})`);

      // Verificar que el destino no tiene widget
      const widgetAtDest = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el?.closest('[data-widget-id]')?.getAttribute('data-widget-id') ?? null;
      }, { x: emptyAreaX, y: emptyAreaY });
      console.log(`  Widget en destino: ${widgetAtDest ?? 'ninguno (espacio vacío)'}`);

      await page.mouse.move(screenX + 36, screenY + 36);
      await page.mouse.down();
      await page.waitForTimeout(150);
      for (let i = 1; i <= 15; i++) {
        await page.mouse.move(
          screenX + 36 + (emptyAreaX - (screenX + 36)) * (i / 15),
          screenY + 36 + (emptyAreaY - (screenY + 36)) * (i / 15)
        );
        await page.waitForTimeout(30);
      }
      await page.mouse.up();
      await page.waitForTimeout(1500);
      await screenshot(page, '06-pegatina-espacio-vacio');

      const stickerAfterEmpty = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);
      console.log(`  Estado después de mover a espacio vacío:`);
      console.log(`    attachedToWidgetId: ${stickerAfterEmpty?.attachedToWidgetId ?? 'undefined (desanclado)'}`);
      console.log(`    Nueva posición: x=${stickerAfterEmpty?.x.toFixed(0)}, y=${stickerAfterEmpty?.y.toFixed(0)}`);

      if (!stickerAfterEmpty?.attachedToWidgetId) {
        console.log(`\n  DESANCLAJE AL SOLTAR EN ESPACIO VACÍO: VERIFICADO ✓`);
      } else {
        console.log(`\n  NOTA: El destino resultó estar sobre otro widget.`);
        console.log(`  Widget detectado: ${stickerAfterEmpty.attachedToWidgetId}`);
      }
    }
  }

  // ── PASO 7: Usar el menú contextual → Duplicate ───────────────────────────
  console.log('\n[PASO 7] Duplicar pegatina desde el menú contextual...');

  const countBeforeDuplicate = (await getPlacedStickers(page)).length;

  // Necesitamos hacer clic derecho en la pegatina
  // Obtenemos su posición actual
  const stickerForDuplicate = (await getPlacedStickers(page)).find((s: { id: string }) => s.id === placedSticker.id);

  if (stickerForDuplicate) {
    let clickX: number;
    let clickY: number;

    if (stickerForDuplicate.attachedToWidgetId) {
      const attachedW = page.locator(`[data-widget-id="${stickerForDuplicate.attachedToWidgetId}"]`);
      const attachedWBox = await attachedW.boundingBox();
      clickX = (attachedWBox?.x ?? 0) + stickerForDuplicate.widgetOffsetX + 36;
      clickY = (attachedWBox?.y ?? 0) + stickerForDuplicate.widgetOffsetY + 36;
    } else {
      const scrollContainerBox = await page.locator('[data-sticker-container]').boundingBox();
      const scrollLeft = await page.evaluate(() => document.querySelector('[data-sticker-container]')?.scrollLeft ?? 0);
      const scrollTop = await page.evaluate(() => document.querySelector('[data-sticker-container]')?.scrollTop ?? 0);
      clickX = (scrollContainerBox?.x ?? 0) + stickerForDuplicate.x - scrollLeft + 36;
      clickY = (scrollContainerBox?.y ?? 0) + stickerForDuplicate.y - scrollTop + 36;
    }

    console.log(`  Haciendo clic derecho en pegatina en (${clickX.toFixed(0)}, ${clickY.toFixed(0)})...`);
    await page.mouse.click(clickX, clickY, { button: 'right' });
    await page.waitForTimeout(600);

    const ctxMenu = page.locator('[data-sticker-context-menu]');
    if (await ctxMenu.isVisible().catch(() => false)) {
      const duplicateBtn = ctxMenu.locator('text=Duplicate');
      if (await duplicateBtn.isVisible().catch(() => false)) {
        await duplicateBtn.click();
        await page.waitForTimeout(500);
        const countAfterDuplicate = (await getPlacedStickers(page)).length;
        console.log(`  Stickers antes: ${countBeforeDuplicate}, después: ${countAfterDuplicate}`);
        if (countAfterDuplicate > countBeforeDuplicate) {
          console.log(`  DUPLICADO DESDE MENÚ CONTEXTUAL: VERIFICADO ✓`);
        }
        await screenshot(page, '07-despues-duplicar');
      }
    } else {
      console.log(`  No se pudo abrir el menú contextual para duplicar.`);
    }
  }

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  const finalStickers = await getPlacedStickers(page);
  await screenshot(page, '08-estado-final');

  console.log('\n══════════════════════════════════════════════════════');
  console.log('RESUMEN PRUEBAS DE DESANCLAJE Y MENÚ CONTEXTUAL');
  console.log('══════════════════════════════════════════════════════');
  console.log(`Total pegatinas colocadas al final: ${finalStickers.length}`);

  expect(finalStickers.length).toBeGreaterThan(0);
});
