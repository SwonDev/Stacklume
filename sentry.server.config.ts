// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
//
// En modo desktop (DESKTOP_MODE=true), @sentry/nextjs está en serverExternalPackages
// y no se incluye en el standalone. Este archivo no se cargará en desktop.

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Filter out certain errors that are not actionable
  ignoreErrors: [
    // Network errors
    "ECONNREFUSED",
    "ECONNRESET",
    "ETIMEDOUT",
    "ENOTFOUND",
    // Database connection issues (transient)
    "Connection terminated unexpectedly",
    "Connection timeout",
    // Cancelled requests
    "AbortError",
    "The operation was aborted",
  ],

  // Set environment
  environment: process.env.NODE_ENV,

  // Release tracking (set during build)
  release: process.env.SENTRY_RELEASE,

  // Spotlight (Sentry for development)
  spotlight: process.env.NODE_ENV === "development",
});
