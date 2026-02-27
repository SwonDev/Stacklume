import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests de stickers
 * Usa el servidor existente en localhost:3001 sin iniciar uno nuevo
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/stickers-desanclaje.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report-stickers' }],
    ['list'],
  ],

  use: {
    // Usar el servidor existente en :3001
    baseURL: 'http://localhost:3001',
    trace: 'on',
    screenshot: 'on',
    video: 'on',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Usar viewport de escritorio amplio
        viewport: { width: 1280, height: 800 },
        // Preservar cookies y localStorage entre tests dentro del mismo describe
        storageState: undefined,
      },
    },
  ],

  // Sin webServer - usar el servidor existente
  // webServer: comentado para usar localhost:3001 ya corriendo

  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },

  outputDir: 'playwright-results/stickers',
});
