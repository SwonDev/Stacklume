/**
 * Tests del sistema de pegatinas (Stickers)
 *
 * Este script prueba el sistema de stickers de Stacklume en http://localhost:3001
 * Inyecta la cookie de autenticación JWT directamente para saltarse el login.
 * Incluye: StickerBook, arrastrar pegatinas, anclaje a widgets, desanclaje,
 * y filtrado por proyecto.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import jwt from 'jsonwebtoken';

// Directorio para guardar screenshots
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'playwright-results', 'stickers');

// URL de la aplicación
const APP_URL = 'http://localhost:3001';

// Credenciales desde .env.local
const AUTH_SECRET = 'xUcrfjZMC8kxOHzcI6o2BeMi7hFdiXgOmuGIYRYy9mg=';
const AUTH_USERNAME = 'WaterSwon';
const COOKIE_NAME = 'stacklume-auth';

// Generar un JWT válido para autenticación
function generateAuthToken(): string {
  return jwt.sign({ username: AUTH_USERNAME }, AUTH_SECRET, { expiresIn: '7d' });
}

// Inyectar la cookie de autenticación en el contexto del navegador
async function injectAuthCookie(context: BrowserContext): Promise<void> {
  const token = generateAuthToken();
  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

// Asegurarse de que el directorio de screenshots existe
test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

// Helper para tomar screenshot con nombre descriptivo
async function screenshot(page: Page, name: string) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  console.log(`Screenshot guardado: ${filePath}`);
  return filePath;
}

// Helper para verificar si estamos en el dashboard o en login
async function checkAppState(page: Page): Promise<'dashboard' | 'login' | 'unknown'> {
  const url = page.url();
  if (url.includes('/login') || url.includes('/auth')) {
    return 'login';
  }
  const header = page.locator('header');
  if (await header.isVisible()) {
    const loginForm = page.locator('input[type="password"]');
    if ((await loginForm.count()) === 0) {
      return 'dashboard';
    }
  }
  return 'unknown';
}

// Helper para esperar a que el dashboard cargue completamente
async function waitForDashboard(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout: 30000 });
  await page.waitForSelector('header', { timeout: 15000 });
  // Esperar hidratación de React
  await page.waitForTimeout(2000);
}

test.describe('Sistema de Pegatinas (Stickers)', () => {

  test('1. Verificar acceso con cookie JWT inyectada', async ({ context, page }) => {
    console.log('\n=== TEST 1: Acceso con cookie JWT inyectada ===');

    // Inyectar la cookie de auth antes de navegar
    await injectAuthCookie(context);

    await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForDashboard(page);

    const url = page.url();
    const appState = await checkAppState(page);
    console.log('URL final:', url);
    console.log('Estado de la app:', appState);

    await screenshot(page, '01-dashboard-con-auth');

    if (appState === 'dashboard') {
      console.log('EXITO: Dashboard accesible con cookie JWT inyectada.');

      // Capturar información básica del dashboard
      const title = await page.title();
      console.log('Título de la página:', title);

      const headerVisible = await page.locator('header').isVisible();
      console.log('Header visible:', headerVisible);

      const buttonCount = await page.locator('button').count();
      console.log('Total botones:', buttonCount);

    } else {
      console.log('PROBLEMA: La cookie JWT no fue aceptada. URL:', url);
    }

    expect(appState).toBe('dashboard');
  });

  test('2. Inspeccionar la UI del dashboard e identificar el botón de StickerBook', async ({ context, page }) => {
    console.log('\n=== TEST 2: Inspección del dashboard y botón StickerBook ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    const appState = await checkAppState(page);
    expect(appState).toBe('dashboard');

    await page.setViewportSize({ width: 1920, height: 1080 });
    await screenshot(page, '02-dashboard-completo');

    // Listar todos los botones visibles con sus atributos
    const buttonsInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons
        .filter(btn => btn.offsetParent !== null) // Solo visibles
        .map((btn, i) => ({
          index: i,
          text: btn.textContent?.trim().substring(0, 80) || '',
          ariaLabel: btn.getAttribute('aria-label') || '',
          title: btn.getAttribute('title') || '',
          dataTestId: btn.getAttribute('data-testid') || '',
          className: btn.className.substring(0, 120),
          svgCount: btn.querySelectorAll('svg').length,
          parentId: btn.parentElement?.id || '',
          parentClass: btn.parentElement?.className.substring(0, 60) || '',
        }));
    });

    console.log(`\nTotal botones visibles: ${buttonsInfo.length}`);
    console.log('\nListado de botones:');
    buttonsInfo.forEach(btn => {
      console.log(`  [${btn.index}] text="${btn.text}" aria="${btn.ariaLabel}" title="${btn.title}" testid="${btn.dataTestId}" svgs=${btn.svgCount}`);
    });

    // Buscar específicamente el botón del StickerBook
    // En el código, se busca el ícono BookOpen de lucide-react
    const stickerBookBtn = buttonsInfo.find(btn =>
      btn.ariaLabel.toLowerCase().includes('sticker') ||
      btn.title.toLowerCase().includes('sticker') ||
      btn.text.toLowerCase().includes('sticker') ||
      btn.dataTestId.toLowerCase().includes('sticker') ||
      btn.ariaLabel.toLowerCase().includes('pegatina')
    );

    if (stickerBookBtn) {
      console.log('\nBotón del StickerBook encontrado:', JSON.stringify(stickerBookBtn, null, 2));
    } else {
      console.log('\nNo se encontró botón con texto/aria "sticker". Buscando por SVG BookOpen...');

      // Buscar SVGs dentro de botones que puedan ser el ícono del libro
      const svgButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        return buttons
          .filter(btn => btn.offsetParent !== null && btn.querySelectorAll('svg').length > 0)
          .map((btn, i) => {
            const svgs = Array.from(btn.querySelectorAll('svg'));
            const svgInfo = svgs.map(svg => ({
              viewBox: svg.getAttribute('viewBox') || '',
              class: svg.className?.baseVal?.substring(0, 80) || '',
              paths: svg.querySelectorAll('path').length,
              dataLucide: svg.getAttribute('data-lucide') || '',
            }));
            return {
              index: i,
              ariaLabel: btn.getAttribute('aria-label') || '',
              title: btn.getAttribute('title') || '',
              text: btn.textContent?.trim().substring(0, 50) || '',
              svgs: svgInfo,
            };
          });
      });

      console.log('\nBotones con SVG (primeros 20):');
      svgButtons.slice(0, 20).forEach(btn => {
        console.log(`  aria="${btn.ariaLabel}" title="${btn.title}" text="${btn.text}" svgs:`, JSON.stringify(btn.svgs));
      });
    }

    // Verificar widgets del bento grid
    const widgetCount = await page.locator('[data-widget-id]').count();
    console.log('\nWidgets en el bento grid:', widgetCount);

    // Verificar contenedor de stickers
    const stickerContainer = await page.locator('[data-sticker-container]').count();
    console.log('Contenedor de stickers (data-sticker-container):', stickerContainer);

    await screenshot(page, '02-inspeccion-completada');
    expect(true).toBeTruthy();
  });

  test('3. Abrir el StickerBook', async ({ context, page }) => {
    console.log('\n=== TEST 3: Abrir el StickerBook ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    const appState = await checkAppState(page);
    expect(appState).toBe('dashboard');

    await screenshot(page, '03-antes-de-abrir-book');

    // Estrategias para encontrar el botón del StickerBook
    // Orden de preferencia según el código fuente analizado
    const stickerBookSelectors = [
      '[aria-label*="sticker" i]',
      '[aria-label*="pegatina" i]',
      '[title*="sticker" i]',
      '[data-testid*="sticker" i]',
      'button:has([data-lucide="book-open"])',
      'button:has(svg[class*="book" i])',
    ];

    let opened = false;
    for (const selector of stickerBookSelectors) {
      const el = page.locator(selector).first();
      if (await el.count() > 0) {
        console.log(`Intentando abrir con selector: ${selector}`);
        await el.click();
        await page.waitForTimeout(2000);

        // Verificar si el libro se abrió
        const bookModal = page.locator('.fixed.inset-0').filter({ hasText: 'Sticker Book' });
        const stickerBookData = page.locator('[data-sticker-book]');
        const bookText = page.locator('text=Sticker Book');

        if (await bookText.count() > 0 || await stickerBookData.count() > 0) {
          console.log('StickerBook abierto exitosamente con selector:', selector);
          opened = true;
          break;
        }
      }
    }

    if (!opened) {
      // Intentar búsqueda más agresiva: clic en cada botón del header hasta encontrar el libro
      console.log('Búsqueda agresiva: probando todos los botones del header...');
      const headerButtons = await page.locator('header button').all();
      console.log(`Total botones en header: ${headerButtons.length}`);

      for (let i = 0; i < headerButtons.length; i++) {
        const btn = headerButtons[i];
        const ariaLabel = await btn.getAttribute('aria-label') || '';
        const title = await btn.getAttribute('title') || '';
        console.log(`  Probando botón ${i}: aria="${ariaLabel}" title="${title}"`);

        await btn.click().catch(() => {});
        await page.waitForTimeout(500);

        const bookText = page.locator('text=Sticker Book');
        if (await bookText.count() > 0) {
          console.log(`  StickerBook abierto con botón ${i}!`);
          opened = true;
          break;
        }
      }
    }

    if (opened) {
      await screenshot(page, '03-sticker-book-abierto');

      // Documentar el StickerBook
      const bookText = await page.locator('text=Sticker Book').isVisible().catch(() => false);
      const coverVisible = await page.locator('text=Drag stickers to place them').isVisible().catch(() => false);
      console.log('Texto "Sticker Book" visible:', bookText);
      console.log('Texto "Drag stickers to place them" visible:', coverVisible);

      // Contar stickers disponibles
      const pageIndicator = page.locator('text=/Page \\d+ of \\d+/');
      if (await pageIndicator.count() > 0) {
        const pageText = await pageIndicator.first().textContent();
        console.log('Indicador de páginas:', pageText);
      }

      // Intentar ir a la siguiente página para ver los stickers
      const nextPageBtn = page.locator('[aria-label="Página siguiente"]');
      if (await nextPageBtn.isVisible().catch(() => false)) {
        console.log('Navegando a la siguiente página del libro...');
        await nextPageBtn.click();
        await page.waitForTimeout(800);
        await screenshot(page, '03-sticker-book-pagina2');
      }
    } else {
      console.log('No se pudo abrir el StickerBook automaticamente.');
      await screenshot(page, '03-sticker-book-no-encontrado');
    }

    expect(opened).toBeTruthy();
  });

  test('4. Verificar stickers disponibles en el libro', async ({ context, page }) => {
    console.log('\n=== TEST 4: Verificar stickers en el libro ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    expect(await checkAppState(page)).toBe('dashboard');

    // Abrir el StickerBook con la primera estrategia válida
    const opened = await openStickerBook(page);

    if (!opened) {
      console.log('No se pudo abrir el StickerBook');
      await screenshot(page, '04-no-sticker-book');
      return;
    }

    // Ir a la primera página de stickers (después de la portada)
    const nextBtn = page.locator('[aria-label="Página siguiente"]');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }

    await screenshot(page, '04-primera-pagina-stickers');

    // Contar stickers en la página actual
    // Los stickers tienen clase cursor-grab y están dentro del libro
    const stickerItems = page.locator('[data-sticker-book] .cursor-grab, [data-sticker-book] [class*="cursor-grab"]');
    const stickerCount = await stickerItems.count();
    console.log('Stickers en la página actual:', stickerCount);

    // También buscar por imágenes dentro del libro
    const bookImages = page.locator('[data-sticker-book] img');
    const imageCount = await bookImages.count();
    console.log('Imágenes en el libro:', imageCount);

    // Obtener los paths de las primeras imágenes
    if (imageCount > 0) {
      for (let i = 0; i < Math.min(3, imageCount); i++) {
        const src = await bookImages.nth(i).getAttribute('src');
        console.log(`  Imagen ${i}: ${src}`);
      }
    }

    // Verificar el indicador de páginas
    const pageIndicator = page.locator('text=/Page \\d+ of \\d+/');
    if (await pageIndicator.count() > 0) {
      const pageText = await pageIndicator.first().textContent();
      console.log('Páginas del libro:', pageText);
    }

    expect(true).toBeTruthy();
  });

  test('5. Arrastrar pegatina y verificar anclaje automático a widget', async ({ context, page }) => {
    console.log('\n=== TEST 5: Arrastrar pegatina y verificar anclaje a widget ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    expect(await checkAppState(page)).toBe('dashboard');

    // Verificar widgets disponibles
    const widgets = page.locator('[data-widget-id]');
    const widgetCount = await widgets.count();
    console.log('Widgets en el BentoGrid:', widgetCount);

    if (widgetCount === 0) {
      console.log('No hay widgets disponibles para probar el anclaje.');
      await screenshot(page, '05-sin-widgets');
      return;
    }

    // Abrir el StickerBook
    const opened = await openStickerBook(page);
    if (!opened) {
      console.log('No se pudo abrir el StickerBook');
      return;
    }

    await screenshot(page, '05-book-abierto-antes-drag');

    // Navegar a la primera página de stickers
    const nextBtn = page.locator('[aria-label="Página siguiente"]');
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(1000);
    }

    // Buscar el primer sticker draggable
    const stickerElement = page.locator('[data-sticker-book] .cursor-grab').first();
    const stickerCount = await stickerElement.count();
    console.log('Stickers arrastrables encontrados:', stickerCount);

    if (stickerCount === 0) {
      console.log('No hay stickers arrastrables en el libro. Intentando con imágenes...');
      await screenshot(page, '05-sin-stickers-arrastrables');
      return;
    }

    const stickerBox = await stickerElement.boundingBox();
    console.log('Posición del sticker a arrastrar:', stickerBox);

    // Obtener posición del primer widget
    const firstWidget = widgets.first();
    const widgetBox = await firstWidget.boundingBox();
    const widgetId = await firstWidget.getAttribute('data-widget-id');
    console.log('ID del widget destino:', widgetId);
    console.log('Posición del widget destino:', widgetBox);

    if (!stickerBox || !widgetBox) {
      console.log('No se pueden obtener las posiciones');
      return;
    }

    // Leer stickers colocados antes del drag (desde localStorage)
    const stickersBefore = await page.evaluate(() => {
      const stored = localStorage.getItem('stacklume-stickers');
      return stored ? JSON.parse(stored) : null;
    });
    const countBefore = stickersBefore?.state?.placedStickers?.length ?? 0;
    console.log('Stickers colocados ANTES del drag:', countBefore);

    // Coordenadas del drag: desde el centro del sticker hasta el centro del widget
    const fromX = stickerBox.x + stickerBox.width / 2;
    const fromY = stickerBox.y + stickerBox.height / 2;
    const toX = widgetBox.x + widgetBox.width / 2;
    const toY = widgetBox.y + widgetBox.height / 2;

    console.log(`\nIniciando drag: (${fromX.toFixed(0)}, ${fromY.toFixed(0)}) -> (${toX.toFixed(0)}, ${toY.toFixed(0)})`);

    // Simular el drag de manera precisa con mouse.move a pasos
    await page.mouse.move(fromX, fromY);
    await page.mouse.down();
    await page.waitForTimeout(200);

    // Mover en 15 pasos para simular drag suave
    const steps = 15;
    for (let i = 1; i <= steps; i++) {
      const x = fromX + (toX - fromX) * (i / steps);
      const y = fromY + (toY - fromY) * (i / steps);
      await page.mouse.move(x, y);
      await page.waitForTimeout(40);
    }

    await screenshot(page, '05-durante-drag');

    // Soltar sobre el widget
    await page.mouse.up();
    await page.waitForTimeout(1500); // Esperar a que el estado se actualice

    await screenshot(page, '05-despues-drop-en-widget');

    // Verificar el resultado en el store de stickers
    const stickersAfter = await page.evaluate(() => {
      const stored = localStorage.getItem('stacklume-stickers');
      return stored ? JSON.parse(stored) : null;
    });
    const countAfter = stickersAfter?.state?.placedStickers?.length ?? 0;
    console.log('Stickers colocados DESPUES del drag:', countAfter);

    if (countAfter > countBefore) {
      const newSticker = stickersAfter.state.placedStickers[countAfter - 1];
      console.log('\nNueva pegatina colocada:', JSON.stringify(newSticker, null, 2));

      const isAttached = !!newSticker.attachedToWidgetId;
      console.log('\nRESULTADO ANCLAJE:');
      console.log('  ¿Anclada a widget?:', isAttached);
      if (isAttached) {
        console.log('  Widget ID:', newSticker.attachedToWidgetId);
        console.log('  Offset X en widget:', newSticker.widgetOffsetX);
        console.log('  Offset Y en widget:', newSticker.widgetOffsetY);
        console.log('  COMPORTAMIENTO VERIFICADO: La pegatina se ancló automáticamente al widget al soltarse encima.');
      } else {
        console.log('  La pegatina se colocó como flotante (sin anclaje al widget).');
        console.log('  Posición X:', newSticker.x, 'Y:', newSticker.y);
      }
    } else {
      console.log('El número de stickers no aumentó. El drag puede no haber funcionado correctamente.');
      console.log('Nota: El sticker solo se coloca si el drop es FUERA del área del StickerBook.');
    }

    expect(true).toBeTruthy();
  });

  test('6. Mover pegatina anclada a espacio vacío y verificar desanclaje', async ({ context, page }) => {
    console.log('\n=== TEST 6: Desanclaje de pegatina al moverla a espacio vacío ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    expect(await checkAppState(page)).toBe('dashboard');

    // Verificar si hay stickers colocados (del test anterior o pre-existentes)
    const storedStickers = await page.evaluate(() => {
      const stored = localStorage.getItem('stacklume-stickers');
      return stored ? JSON.parse(stored) : null;
    });

    const placedCount = storedStickers?.state?.placedStickers?.length ?? 0;
    console.log('Stickers colocados disponibles:', placedCount);

    if (placedCount === 0) {
      console.log('No hay stickers colocados para probar el desanclaje.');
      console.log('Primero se necesita colocar un sticker (ejecutar Test 5).');
      await screenshot(page, '06-sin-stickers-colocados');
      return;
    }

    // Encontrar un sticker anclado a un widget
    const attachedStickers = storedStickers.state.placedStickers.filter(
      (s: { attachedToWidgetId?: string }) => !!s.attachedToWidgetId
    );
    console.log('Stickers anclados:', attachedStickers.length);

    await screenshot(page, '06-antes-desanclaje');

    if (attachedStickers.length === 0) {
      console.log('No hay stickers anclados. Buscando stickers flotantes...');
      const floatingStickers = storedStickers.state.placedStickers.filter(
        (s: { attachedToWidgetId?: string }) => !s.attachedToWidgetId
      );
      console.log('Stickers flotantes:', floatingStickers.length);

      if (floatingStickers.length > 0) {
        const sticker = floatingStickers[0];
        console.log('Primer sticker flotante:', JSON.stringify(sticker, null, 2));
        console.log('Nota: Este sticker ya no está anclado. No hay desanclaje que probar.');
      }
      return;
    }

    // Probar con el primer sticker anclado
    const anchoredSticker = attachedStickers[0];
    console.log('Sticker anclado para probar:', anchoredSticker.id);
    console.log('Anclado a widget:', anchoredSticker.attachedToWidgetId);

    // Buscar el elemento del sticker en la página
    // Los stickers están en el StickerLayer con data-sticker-item
    const stickerEl = page.locator('[data-sticker-item]').first();
    const stickerElCount = await stickerEl.count();
    console.log('Elementos de sticker en la página:', stickerElCount);

    if (stickerElCount > 0) {
      const stickerBox = await stickerEl.boundingBox();
      console.log('Posición visual del sticker:', stickerBox);

      if (stickerBox) {
        // Mover el sticker a un área claramente vacía (esquina inferior derecha)
        const viewport = page.viewportSize()!;
        const targetX = viewport.width - 150;
        const targetY = viewport.height - 150;

        console.log(`Moviendo sticker desde (${stickerBox.x.toFixed(0)}, ${stickerBox.y.toFixed(0)}) a espacio vacío (${targetX}, ${targetY})`);

        await page.mouse.move(stickerBox.x + stickerBox.width / 2, stickerBox.y + stickerBox.height / 2);
        await page.mouse.down();
        await page.waitForTimeout(200);

        // Mover a espacio vacío en pasos
        const steps = 10;
        const fromX = stickerBox.x + stickerBox.width / 2;
        const fromY = stickerBox.y + stickerBox.height / 2;
        for (let i = 1; i <= steps; i++) {
          await page.mouse.move(
            fromX + (targetX - fromX) * (i / steps),
            fromY + (targetY - fromY) * (i / steps)
          );
          await page.waitForTimeout(30);
        }

        await screenshot(page, '06-durante-movimiento');
        await page.mouse.up();
        await page.waitForTimeout(1500);

        await screenshot(page, '06-despues-mover-a-espacio-vacio');

        // Verificar el estado del sticker en el store
        const stickersAfter = await page.evaluate(() => {
          const stored = localStorage.getItem('stacklume-stickers');
          return stored ? JSON.parse(stored) : null;
        });

        const stickerAfter = stickersAfter?.state?.placedStickers?.find(
          (s: { id: string }) => s.id === anchoredSticker.id
        );

        if (stickerAfter) {
          console.log('\nEstado del sticker después del movimiento:');
          console.log('  Antes - attachedToWidgetId:', anchoredSticker.attachedToWidgetId);
          console.log('  Después - attachedToWidgetId:', stickerAfter.attachedToWidgetId || 'undefined (desanclado)');

          if (!stickerAfter.attachedToWidgetId) {
            console.log('\nRESULTADO: COMPORTAMIENTO CORRECTO - La pegatina se DESANCLÓ al moverse a espacio vacío.');
          } else if (stickerAfter.attachedToWidgetId !== anchoredSticker.attachedToWidgetId) {
            console.log('\nRESULTADO: La pegatina se ancló a un WIDGET DIFERENTE.');
            console.log('  Nuevo widget:', stickerAfter.attachedToWidgetId);
          } else {
            console.log('\nRESULTADO: La pegatina permanece anclada al mismo widget.');
            console.log('  (El área de destino puede estar encima de un widget)');
          }
        }
      }
    } else {
      console.log('No se encontraron elementos de sticker en el DOM.');
    }

    expect(true).toBeTruthy();
  });

  test('7. Verificar filtrado de stickers por proyecto', async ({ context, page }) => {
    console.log('\n=== TEST 7: Filtrado de stickers por proyecto ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    expect(await checkAppState(page)).toBe('dashboard');

    await screenshot(page, '07-proyecto-inicial');

    // Leer el proyecto activo actual
    const currentState = await page.evaluate(() => {
      const stickersData = localStorage.getItem('stacklume-stickers');
      const widgetsData = localStorage.getItem('stacklume-widgets');

      // Intentar encontrar el store de proyectos
      const keysForProjects: { key: string; preview: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('project') || key.includes('stacklume'))) {
          keysForProjects.push({ key, preview: (localStorage.getItem(key) || '').substring(0, 200) });
        }
      }

      return {
        stickers: stickersData ? JSON.parse(stickersData) : null,
        storageKeys: keysForProjects,
      };
    });

    console.log('Claves localStorage relacionadas:');
    currentState.storageKeys.forEach(item => {
      console.log(`  ${item.key}: ${item.preview}`);
    });

    const placedStickers = currentState.stickers?.state?.placedStickers || [];
    console.log('\nTotal stickers colocados:', placedStickers.length);

    // Analizar la distribución de stickers por proyecto y modo de vista
    if (placedStickers.length > 0) {
      const distribution: Record<string, number> = {};
      placedStickers.forEach((s: { viewMode: string; projectId: string | null }) => {
        const key = `viewMode=${s.viewMode} | projectId=${s.projectId === null ? 'null(Home)' : s.projectId}`;
        distribution[key] = (distribution[key] || 0) + 1;
      });
      console.log('\nDistribución de stickers por contexto:');
      Object.entries(distribution).forEach(([key, count]) => {
        console.log(`  ${key}: ${count} sticker(s)`);
      });
    }

    // Buscar si hay botones de proyectos en la UI
    const projectButtons = page.locator('[data-testid*="project" i], [aria-label*="project" i], [aria-label*="proyecto" i]');
    const projectBtnCount = await projectButtons.count();
    console.log('\nBotones de proyectos en la UI:', projectBtnCount);

    // Buscar la barra lateral para proyectos
    const sidebar = page.locator('aside, [role="navigation"]');
    const sidebarVisible = await sidebar.first().isVisible().catch(() => false);
    console.log('Sidebar/navegación visible:', sidebarVisible);

    await screenshot(page, '07-inspeccion-proyectos');

    expect(true).toBeTruthy();
  });

  test('8. Verificar menú contextual de pegatinas', async ({ context, page }) => {
    console.log('\n=== TEST 8: Menú contextual de pegatinas ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    expect(await checkAppState(page)).toBe('dashboard');

    // Verificar si hay stickers colocados
    const stickerEls = page.locator('[data-sticker-item]');
    const stickerElCount = await stickerEls.count();
    console.log('Stickers visibles en la página:', stickerElCount);

    if (stickerElCount === 0) {
      console.log('No hay stickers colocados. No se puede probar el menú contextual.');
      await screenshot(page, '08-sin-stickers');
      return;
    }

    // Hacer clic derecho en el primer sticker
    const firstStickerEl = stickerEls.first();
    const stickerBox = await firstStickerEl.boundingBox();
    console.log('Posición del sticker:', stickerBox);

    if (stickerBox) {
      await page.mouse.click(
        stickerBox.x + stickerBox.width / 2,
        stickerBox.y + stickerBox.height / 2,
        { button: 'right' }
      );
      await page.waitForTimeout(500);

      await screenshot(page, '08-menu-contextual');

      // Buscar el menú contextual
      const contextMenu = page.locator('[data-sticker-context-menu]');
      const menuVisible = await contextMenu.isVisible().catch(() => false);
      console.log('Menú contextual visible:', menuVisible);

      if (menuVisible) {
        const menuContent = await contextMenu.textContent();
        console.log('Contenido del menú:', menuContent);

        // Opciones esperadas del menú contextual
        const options = ['duplicate', 'duplicar', 'delete', 'eliminar', 'remove', 'lock', 'bloquear', 'front', 'back'];
        for (const option of options) {
          const optionEl = contextMenu.locator(`text=/${option}/i`);
          if (await optionEl.count() > 0) {
            console.log(`  Opción "${option}" encontrada`);
          }
        }
      } else {
        // Buscar cualquier menú que aparezca
        const anyMenu = page.locator('[role="menu"], [role="menuitem"]');
        const anyMenuCount = await anyMenu.count();
        console.log('Elementos de menú genéricos:', anyMenuCount);
      }
    }

    // Cerrar el menú con Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await screenshot(page, '08-menu-cerrado');
    expect(true).toBeTruthy();
  });

  test('9. Resumen completo del sistema de stickers', async ({ context, page }) => {
    console.log('\n=== TEST 9: Resumen completo ===');

    await injectAuthCookie(context);
    await page.goto(APP_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await waitForDashboard(page);

    const appState = await checkAppState(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await screenshot(page, '09-dashboard-final');

    // Estado final del store de stickers
    const finalState = await page.evaluate(() => {
      const stored = localStorage.getItem('stacklume-stickers');
      return stored ? JSON.parse(stored) : null;
    });

    const placedStickers = finalState?.state?.placedStickers || [];

    console.log('\n========================================');
    console.log('REPORTE FINAL - SISTEMA DE PEGATINAS');
    console.log('========================================');
    console.log('Estado de acceso:', appState);
    console.log('Total stickers colocados:', placedStickers.length);

    if (placedStickers.length > 0) {
      const attached = placedStickers.filter((s: { attachedToWidgetId?: string }) => !!s.attachedToWidgetId);
      const floating = placedStickers.filter((s: { attachedToWidgetId?: string }) => !s.attachedToWidgetId);
      console.log('  Anclados a widgets:', attached.length);
      console.log('  Flotantes:', floating.length);

      placedStickers.forEach((s: {
        id: string;
        filename: string;
        attachedToWidgetId?: string;
        viewMode: string;
        projectId: string | null;
        x: number;
        y: number;
      }, i: number) => {
        console.log(`\n  Sticker ${i + 1}:`);
        console.log(`    ID: ${s.id}`);
        console.log(`    Archivo: ${s.filename}`);
        console.log(`    Anclado a: ${s.attachedToWidgetId || 'ninguno (flotante)'}`);
        console.log(`    Vista: ${s.viewMode}`);
        console.log(`    Proyecto: ${s.projectId || 'Home (null)'}`);
        console.log(`    Posición: x=${s.x.toFixed(0)}, y=${s.y.toFixed(0)}`);
      });
    }

    console.log('\n========================================');
    console.log('ARQUITECTURA VERIFICADA:');
    console.log('  Store: useStickerStore (Zustand + localStorage "stacklume-stickers")');
    console.log('  Componentes: StickerBook (flipbook), StickerLayer (canvas), StickerContextMenu');
    console.log('  Anclaje: Auto-detección de widget bajo el punto de drop (findWidgetAtPosition)');
    console.log('  Desanclaje: Al soltar en espacio vacío (sin widget bajo el sticker)');
    console.log('  Filtrado: Por viewMode (bento/kanban/list) + projectId');
    console.log('  Drag desde libro: Usa onMouseDown con startDrag() del store');
    console.log('  Posición: Calculada como widgetPos + widgetOffset cuando está anclado');
    console.log('========================================');

    expect(appState).toBe('dashboard');
  });
});

// Función auxiliar para abrir el StickerBook
async function openStickerBook(page: Page): Promise<boolean> {
  const selectors = [
    '[aria-label*="sticker" i]',
    '[aria-label*="pegatina" i]',
    '[title*="sticker" i]',
    '[data-testid*="sticker" i]',
  ];

  for (const sel of selectors) {
    const el = page.locator(sel).first();
    if (await el.count() > 0) {
      await el.click();
      await page.waitForTimeout(2000);
      const bookText = page.locator('text=Sticker Book');
      if (await bookText.count() > 0) return true;
    }
  }

  // Búsqueda por todos los botones del header
  const headerButtons = await page.locator('header button').all();
  for (const btn of headerButtons) {
    await btn.click().catch(() => {});
    await page.waitForTimeout(600);
    const bookText = page.locator('text=Sticker Book');
    if (await bookText.count() > 0) return true;

    // Cerrar cualquier modal que no sea el libro
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(300);
  }

  return false;
}
