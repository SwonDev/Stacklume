import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [
    react({
      // Support React 19
      jsxRuntime: 'automatic',
    }),
  ],
  test: {
    // Use happy-dom for better React 19 support
    environment: 'happy-dom',

    // Setup files to run before each test file
    setupFiles: ['./src/test/setup.ts'],

    // Dependencies that need to be resolved/inlined
    server: {
      deps: {
        inline: ['pino', 'pino-pretty'],
      },
    },

    // Global test utilities
    globals: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/.next/**',
        'dist/',
        'coverage/',
        'src/types/**', // Type definitions and constants don't need coverage
        'src/components/widgets/**', // 120+ widget implementations
      ],
      // Set meaningful thresholds
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },

    // Include/exclude patterns
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.next', 'coverage', 'playwright', 'e2e'],

    // Mock CSS imports
    css: {
      modules: {
        classNameStrategy: 'non-scoped',
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Mock pino since it's not installed
      'pino': path.resolve(__dirname, './src/test/__mocks__/pino.ts'),
    },
  },
});
