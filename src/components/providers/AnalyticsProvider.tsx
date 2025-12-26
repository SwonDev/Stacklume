"use client";

import { useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics";

const PLAUSIBLE_DOMAIN = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
const PLAUSIBLE_SCRIPT_URL =
  process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || "https://plausible.io/js/script.js";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Analytics Provider Component
 *
 * Loads Plausible Analytics script and tracks page views in SPA mode.
 * Only active when NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set.
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Track page views on route changes (SPA mode)
  useEffect(() => {
    if (!PLAUSIBLE_DOMAIN) return;

    // Construct the full URL for tracking
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    trackPageView(url);
  }, [pathname, searchParams]);

  // Don't render script if domain is not configured
  if (!PLAUSIBLE_DOMAIN) {
    return <>{children}</>;
  }

  return (
    <>
      <Script
        defer
        data-domain={PLAUSIBLE_DOMAIN}
        src={PLAUSIBLE_SCRIPT_URL}
        strategy="afterInteractive"
      />
      {/* Initialize plausible queue for custom events */}
      <Script id="plausible-init" strategy="afterInteractive">
        {`
          window.plausible = window.plausible || function() {
            (window.plausible.q = window.plausible.q || []).push(arguments)
          };
        `}
      </Script>
      {children}
    </>
  );
}
