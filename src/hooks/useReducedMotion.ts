"use client";

import { useSyncExternalStore } from "react";
import { useSettingsStore } from "@/stores/settings-store";

/**
 * Media query for prefers-reduced-motion
 */
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Subscribe to media query changes
 */
function subscribeToMediaQuery(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);

  // Modern API
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener("change", callback);
    return () => mediaQuery.removeEventListener("change", callback);
  }

  // Legacy API fallback
  mediaQuery.addListener(callback);
  return () => mediaQuery.removeListener(callback);
}

/**
 * Get current media query value
 */
function getMediaQuerySnapshot(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Server-side snapshot (defaults to false - no reduced motion)
 */
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Hook that checks if reduced motion is preferred.
 * Combines both the CSS media query (prefers-reduced-motion) AND
 * the app's reduceMotion setting from the settings store.
 *
 * Returns true if either:
 * 1. The user's OS has prefers-reduced-motion enabled
 * 2. The user has enabled reduceMotion in app settings
 *
 * Use this hook to conditionally disable or simplify animations.
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * return (
 *   <motion.div
 *     animate={{ x: 100 }}
 *     transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3 }}
 *   />
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  // Check CSS media query using useSyncExternalStore for proper SSR support
  const prefersReducedMotionOS = useSyncExternalStore(
    subscribeToMediaQuery,
    getMediaQuerySnapshot,
    getServerSnapshot
  );

  // Check app setting from settings store
  const reduceMotionSetting = useSettingsStore((state) => state.reduceMotion);

  // Return true if either preference is enabled
  return prefersReducedMotionOS || reduceMotionSetting;
}

/**
 * Hook that returns animation configuration based on reduced motion preference.
 * Provides sensible defaults for common animation use cases.
 *
 * @example
 * ```tsx
 * const { shouldAnimate, duration, springConfig } = useMotionConfig();
 *
 * return (
 *   <motion.div
 *     animate={shouldAnimate ? { opacity: 1 } : undefined}
 *     transition={{ duration }}
 *   />
 * );
 * ```
 */
export function useMotionConfig() {
  const prefersReducedMotion = useReducedMotion();

  return {
    /** Whether animations should be enabled */
    shouldAnimate: !prefersReducedMotion,
    /** Duration for animations (0 when reduced motion) */
    duration: prefersReducedMotion ? 0 : 0.3,
    /** Spring configuration for motion animations */
    springConfig: prefersReducedMotion
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 300, damping: 30 },
    /** Transition preset for fade animations */
    fadeTransition: prefersReducedMotion
      ? { duration: 0 }
      : { duration: 0.2, ease: "easeOut" as const },
    /** Transition preset for slide animations */
    slideTransition: prefersReducedMotion
      ? { duration: 0 }
      : { type: "spring" as const, stiffness: 400, damping: 35 },
  };
}

/**
 * Utility function to get reduced motion value outside of React components.
 * Useful for imperative code or callbacks.
 *
 * Note: This only checks the CSS media query, not the app setting.
 * For full support, use the useReducedMotion hook instead.
 */
export function getReducedMotionPreference(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  // Check both CSS media query and app setting
  const osPreference = window.matchMedia(REDUCED_MOTION_QUERY).matches;
  const appSetting = useSettingsStore.getState().reduceMotion;

  return osPreference || appSetting;
}
