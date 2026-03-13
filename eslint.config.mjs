import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vercel build output
    ".vercel/**",
    // Tauri Rust build output and bundled resources
    "src-tauri/target/**",
    "src-tauri/resources/**",
    // Temporary and generated files
    "tmp/**",
    "scripts/i18n-keys-*.json",
    // Archivos auto-generados por Astro (stacklume-web) y artefactos de build
    "stacklume-web/.astro/**",
    "stacklume-web/.vercel/**",
    "stacklume-web/dist/**",
    // Extensión de navegador (no es código Next.js)
    "extension/**",
    // Cobertura de tests
    "coverage/**",
  ]),
  // Custom rule overrides
  {
    rules: {
      // Allow underscore-prefixed variables to indicate intentionally unused
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
]);

export default eslintConfig;
