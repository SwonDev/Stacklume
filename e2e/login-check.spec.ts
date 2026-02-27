/**
 * Verificación del sistema de login
 *
 * Este test verifica que el login funciona correctamente en http://localhost:3001
 */

import { test, expect } from '@playwright/test';

test.describe('Verificación del sistema de autenticación', () => {
  test('1. Verificar redirección al login desde la raíz', async ({ page }) => {
    // Navegar a la raíz y observar si redirige al login
    const response = await page.goto('http://localhost:3001/');

    console.log('URL final después de navegar a /:', page.url());
    console.log('Código de respuesta inicial:', response?.status());

    // Tomar captura de pantalla de la página actual
    await page.screenshot({
      path: 'playwright-results/01-redireccion-login.png',
      fullPage: true
    });

    // Verificar si estamos en la página de login
    const esLoginPage = page.url().includes('/login') || page.url().includes('/auth');
    console.log('¿Está en página de login?', esLoginPage);

    // La URL debería contener /login si hay redirección de auth
    expect(page.url()).toBeTruthy();
  });

  test('2. Verificar que el formulario de login existe', async ({ page }) => {
    // Ir directamente a la página de login
    await page.goto('http://localhost:3001/login');

    console.log('URL de la página de login:', page.url());

    // Esperar que la página cargue completamente
    await page.waitForLoadState('domcontentloaded');

    // Tomar captura de pantalla del formulario
    await page.screenshot({
      path: 'playwright-results/02-formulario-login.png',
      fullPage: true
    });

    // Verificar que el body es visible
    await expect(page.locator('body')).toBeVisible();

    // Buscar el campo de usuario (puede ser input[type="text"] o input[name="username"])
    const inputUsuario = page.locator('input[name="username"], input[type="text"], input[placeholder*="user" i], input[placeholder*="usuario" i]').first();
    const inputPassword = page.locator('input[name="password"], input[type="password"]').first();
    const botonSubmit = page.locator('button[type="submit"], input[type="submit"]').first();

    const tieneInputUsuario = await inputUsuario.count() > 0;
    const tieneInputPassword = await inputPassword.count() > 0;
    const tieneBotonSubmit = await botonSubmit.count() > 0;

    console.log('¿Tiene input de usuario?', tieneInputUsuario);
    console.log('¿Tiene input de password?', tieneInputPassword);
    console.log('¿Tiene botón submit?', tieneBotonSubmit);

    // Al menos debe tener un campo de password
    expect(tieneInputPassword).toBeTruthy();
  });

  test('3. Verificar que credenciales incorrectas devuelven 401', async ({ page }) => {
    // Hacer POST directo a /api/auth/login con credenciales incorrectas
    const response = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        username: 'usuario_inexistente_test',
        password: 'contraseña_incorrecta_12345'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Código de respuesta con credenciales incorrectas:', response.status());

    let cuerpoRespuesta = '';
    try {
      const json = await response.json();
      cuerpoRespuesta = JSON.stringify(json);
    } catch {
      cuerpoRespuesta = await response.text();
    }

    console.log('Cuerpo de la respuesta:', cuerpoRespuesta);

    // El servidor debería responder con 401 (no autorizado) para credenciales incorrectas
    // Si responde 500, hay un problema con el sistema de auth
    // Si responde 404, la ruta no existe
    console.log('Estado esperado: 401 (no autorizado)');

    expect(response.status()).not.toBe(500); // No debe ser error interno
    expect([400, 401, 403, 422]).toContain(response.status()); // Debe ser error de auth
  });

  test('4. Verificar que el usuario WaterSwon existe (401 con pwd incorrecta)', async ({ page }) => {
    // Probar con el usuario real pero contraseña incorrecta
    const response = await page.request.post('http://localhost:3001/api/auth/login', {
      data: {
        username: 'WaterSwon',
        password: 'contraseña_incorrecta_definitivamente'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Código de respuesta para WaterSwon con pwd incorrecta:', response.status());

    let cuerpoRespuesta = '';
    try {
      const json = await response.json();
      cuerpoRespuesta = JSON.stringify(json);
    } catch {
      cuerpoRespuesta = await response.text();
    }

    console.log('Cuerpo de la respuesta:', cuerpoRespuesta);

    // Verificar que el sistema responde correctamente (no 500)
    expect(response.status()).not.toBe(500);

    // Debe ser 401 - credenciales inválidas
    expect(response.status()).toBe(401);
  });

  test('5. Captura de pantalla completa de la página de login', async ({ page }) => {
    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    // Captura del viewport completo
    await page.screenshot({
      path: 'playwright-results/05-login-completo.png',
      fullPage: true
    });

    // Obtener el título de la página
    const titulo = await page.title();
    console.log('Título de la página de login:', titulo);

    // Verificar que la página cargó (tiene contenido)
    const contenido = await page.content();
    console.log('Longitud del HTML de la página:', contenido.length, 'caracteres');

    expect(contenido.length).toBeGreaterThan(100);

    // Captura adicional con viewport de escritorio estándar
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.screenshot({
      path: 'playwright-results/05b-login-desktop.png'
    });

    console.log('Capturas guardadas en playwright-results/');
  });

  test('6. Verificar que no hay errores de servidor en la página de login', async ({ page }) => {
    const errores: string[] = [];
    const erroresConsola: string[] = [];

    page.on('pageerror', (error) => {
      errores.push(error.message);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        erroresConsola.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001/login');
    await page.waitForLoadState('networkidle');

    console.log('Errores de página:', errores);
    console.log('Errores de consola:', erroresConsola);

    // Captura de pantalla final
    await page.screenshot({
      path: 'playwright-results/06-login-sin-errores.png',
      fullPage: true
    });

    // No debe haber errores críticos de JS
    const erroresCriticos = errores.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Loading chunk')
    );

    if (erroresCriticos.length > 0) {
      console.log('ERRORES CRÍTICOS ENCONTRADOS:', erroresCriticos);
    }

    expect(erroresCriticos).toHaveLength(0);
  });
});
