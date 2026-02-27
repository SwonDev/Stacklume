import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// Check if building for Electron or Tauri (standalone mode)
const isDesktopMode = process.env.DESKTOP_MODE === "true";
const isElectronBuild = process.env.ELECTRON_BUILD === "true" || isDesktopMode;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Content Security Policy (CSP) Configuration
 *
 * This CSP is designed to protect against XSS, clickjacking, and other injection attacks
 * while allowing the application to function properly with Tailwind CSS and external resources.
 */
const ContentSecurityPolicy = `
  default-src 'self' http://localhost:*;
  script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sentry.io http://localhost:*;
  style-src 'self' 'unsafe-inline' http://localhost:*;
  img-src 'self' data: blob: https: http: http://localhost:*;
  font-src 'self' data: http://localhost:*;
  connect-src 'self' http://localhost:* ws://localhost:* https: http://localhost:*;
  media-src 'self' https://www.youtube.com https://*.spotify.com http://localhost:*;
  frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://open.spotify.com https://codepen.io http://localhost:*;
  frame-ancestors 'self';
  form-action 'self' http://localhost:*;
  base-uri 'self';
  object-src 'none';
`.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

const nextConfig: NextConfig = {
  // Standalone output for Electron - creates a self-contained server
  output: "standalone",

  // Excluir módulos con addons nativos del bundle
  // En modo desktop también excluimos Sentry y OpenTelemetry: no se necesitan
  // en la app de escritorio y sus rutas pnpm sobrepasan el límite de NSIS (260 chars)
  serverExternalPackages: [
    "@libsql/client",
    "libsql",
    ...(isDesktopMode
      ? [
          "@sentry/nextjs",
          "@sentry/node",
          "@sentry/core",
          "@opentelemetry/api",
          "@opentelemetry/resources",
          "@opentelemetry/sdk-trace-base",
          "@opentelemetry/sdk-node",
          "@opentelemetry/instrumentation",
        ]
      : []),
  ],

  // Fix Turbopack workspace root inference on Windows
  // Without this, Turbopack incorrectly infers src/app as the project root
  turbopack: {
    root: process.cwd(),
  },

  // Image optimization configuration
  images: {
    // Disable image optimization for standalone/Electron builds
    // Next.js image optimization requires a running server with Sharp
    // which doesn't work well in Electron's standalone mode
    unoptimized: isElectronBuild || isProduction,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.youtube.com",
      },
      {
        protocol: "https",
        hostname: "cdn.cloudflare.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "opengraph.githubassets.com",
      },
      {
        protocol: "https",
        hostname: "repository-images.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.twimg.com",
      },
      {
        protocol: "https",
        hostname: "*.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.unsplash.com",
      },
    ],
  },

  // Security headers
  async headers() {
    // En modo desktop el WebView2 gestiona su propia seguridad
    if (isDesktopMode) return [];

    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Automatically annotate React components to show their full name in breadcrumbs and session replay
  reactComponentAnnotation: {
    enabled: true,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
};

// Wrap config with Sentry (only in production or when SENTRY_DSN is set)
const configWithSentry = process.env.SENTRY_DSN
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

export default configWithSentry;
