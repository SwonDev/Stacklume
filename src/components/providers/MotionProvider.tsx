"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { MotionConfig } from "motion/react";
import { useReducedMotion, useMotionConfig } from "@/hooks/useReducedMotion";

/**
 * Motion context providing animation configuration
 */
interface MotionContextValue {
  /** Whether reduced motion is preferred */
  prefersReducedMotion: boolean;
  /** Whether animations should be enabled */
  shouldAnimate: boolean;
  /** Default duration for animations */
  duration: number;
  /** Spring configuration for motion animations */
  springConfig: { duration: number } | { type: "spring"; stiffness: number; damping: number };
  /** Transition preset for fade animations */
  fadeTransition: { duration: number; ease?: string } | { duration: number };
  /** Transition preset for slide animations */
  slideTransition: { duration: number } | { type: "spring"; stiffness: number; damping: number };
}

const MotionContext = createContext<MotionContextValue | null>(null);

/**
 * Hook to access motion configuration from context
 *
 * @example
 * ```tsx
 * const { shouldAnimate, springConfig } = useMotionContext();
 *
 * return (
 *   <motion.div
 *     animate={shouldAnimate ? { scale: 1.1 } : undefined}
 *     transition={springConfig}
 *   />
 * );
 * ```
 */
export function useMotionContext(): MotionContextValue {
  const context = useContext(MotionContext);

  if (!context) {
    // Return defaults if used outside provider (shouldn't happen in normal use)
    return {
      prefersReducedMotion: false,
      shouldAnimate: true,
      duration: 0.3,
      springConfig: { type: "spring", stiffness: 300, damping: 30 },
      fadeTransition: { duration: 0.2, ease: "easeOut" },
      slideTransition: { type: "spring", stiffness: 400, damping: 35 },
    };
  }

  return context;
}

interface MotionProviderProps {
  children: ReactNode;
}

/**
 * Provider component that wraps the application with motion configuration.
 * Automatically disables animations when reduced motion is preferred.
 *
 * Features:
 * - Respects CSS prefers-reduced-motion media query
 * - Respects app's reduceMotion setting
 * - Provides global MotionConfig for motion library
 * - Exposes motion context for components to check animation state
 *
 * @example
 * ```tsx
 * // In your root layout or providers
 * <MotionProvider>
 *   <App />
 * </MotionProvider>
 * ```
 */
export function MotionProvider({ children }: MotionProviderProps) {
  const prefersReducedMotion = useReducedMotion();
  const motionConfig = useMotionConfig();

  const contextValue = useMemo<MotionContextValue>(
    () => ({
      prefersReducedMotion,
      ...motionConfig,
    }),
    [prefersReducedMotion, motionConfig]
  );

  return (
    <MotionContext.Provider value={contextValue}>
      <MotionConfig
        reducedMotion={prefersReducedMotion ? "always" : "never"}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: "spring", stiffness: 300, damping: 30 }
        }
      >
        {children}
      </MotionConfig>
    </MotionContext.Provider>
  );
}

/**
 * Wrapper component that conditionally renders motion or static content
 * based on reduced motion preference.
 *
 * @example
 * ```tsx
 * <AnimationWrapper
 *   animate={<motion.div animate={{ x: 100 }}>Animated</motion.div>}
 *   static={<div>Static</div>}
 * />
 * ```
 */
export function AnimationWrapper({
  animate,
  static: staticContent,
}: {
  animate: ReactNode;
  static: ReactNode;
}) {
  const { shouldAnimate } = useMotionContext();
  return <>{shouldAnimate ? animate : staticContent}</>;
}

/**
 * HOC to create motion-aware components
 * Returns a component that respects reduced motion preference
 *
 * @example
 * ```tsx
 * const AnimatedCard = withMotionAwareness(motion.div, 'div');
 *
 * // AnimatedCard will render as motion.div normally,
 * // or regular div when reduced motion is preferred
 * ```
 */
export function withMotionAwareness<P extends object>(
  MotionComponent: React.ComponentType<P>,
  FallbackComponent: React.ComponentType<P>
) {
  return function MotionAwareComponent(props: P) {
    const { shouldAnimate } = useMotionContext();
    const Component = shouldAnimate ? MotionComponent : FallbackComponent;
    return <Component {...props} />;
  };
}
