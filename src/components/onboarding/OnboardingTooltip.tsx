"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";

export interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: "top" | "bottom" | "left" | "right";
}

export interface OnboardingTooltipProps {
  targetSelector: string;
  title: string;
  description: string;
  step: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  isFirst: boolean;
  isLast: boolean;
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
}

const TOOLTIP_OFFSET = 14;

function TooltipArrow({ arrowPosition }: { arrowPosition: "top" | "bottom" | "left" | "right" | null }) {
  if (!arrowPosition) return null;

  const base: React.CSSProperties = {
    position: "absolute",
    width: 12,
    height: 12,
    background: "linear-gradient(145deg, #1a2744 0%, #1d2f54 100%)",
    zIndex: 1,
  };

  switch (arrowPosition) {
    case "top":
      return (
        <div style={{
          ...base,
          top: -6,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          borderLeft: "1px solid rgba(42, 58, 92, 0.8)",
          borderTop: "1px solid rgba(42, 58, 92, 0.8)",
        }} />
      );
    case "bottom":
      return (
        <div style={{
          ...base,
          bottom: -6,
          left: "50%",
          transform: "translateX(-50%) rotate(45deg)",
          borderRight: "1px solid rgba(42, 58, 92, 0.8)",
          borderBottom: "1px solid rgba(42, 58, 92, 0.8)",
        }} />
      );
    case "left":
      return (
        <div style={{
          ...base,
          left: -6,
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          borderLeft: "1px solid rgba(42, 58, 92, 0.8)",
          borderBottom: "1px solid rgba(42, 58, 92, 0.8)",
        }} />
      );
    case "right":
      return (
        <div style={{
          ...base,
          right: -6,
          top: "50%",
          transform: "translateY(-50%) rotate(45deg)",
          borderRight: "1px solid rgba(42, 58, 92, 0.8)",
          borderTop: "1px solid rgba(42, 58, 92, 0.8)",
        }} />
      );
  }
}

export function OnboardingTooltip({
  targetSelector,
  title,
  description,
  step,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  isFirst,
  isLast,
  icon: Icon,
}: OnboardingTooltipProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const calculatePosition = useCallback(() => {
    const target = document.querySelector(targetSelector);
    if (!target || !tooltipRef.current) return;

    const rect = target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    setTargetRect(rect);

    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    const bottomSpace = viewportHeight - rect.bottom;
    const topSpace = rect.top;

    if (bottomSpace >= tooltipRect.height + TOOLTIP_OFFSET) {
      top = rect.bottom + TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      arrowPosition = "top";
    } else if (topSpace >= tooltipRect.height + TOOLTIP_OFFSET) {
      top = rect.top - tooltipRect.height - TOOLTIP_OFFSET;
      left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      arrowPosition = "bottom";
    } else {
      const leftSpace = rect.left;
      const rightSpace = viewportWidth - rect.right;

      if (rightSpace >= tooltipRect.width + TOOLTIP_OFFSET) {
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.right + TOOLTIP_OFFSET;
        arrowPosition = "left";
      } else if (leftSpace >= tooltipRect.width + TOOLTIP_OFFSET) {
        top = rect.top + rect.height / 2 - tooltipRect.height / 2;
        left = rect.left - tooltipRect.width - TOOLTIP_OFFSET;
        arrowPosition = "right";
      } else {
        top = rect.bottom + TOOLTIP_OFFSET;
        left = rect.left + rect.width / 2 - tooltipRect.width / 2;
        arrowPosition = "top";
      }
    }

    left = Math.max(16, Math.min(left, viewportWidth - tooltipRect.width - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipRect.height - 16));

    setPosition({ top, left, arrowPosition });
  }, [targetSelector]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      calculatePosition();
    });
    const handleResize = () => calculatePosition();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [calculatePosition]);

  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [targetSelector]);

  const springTransition = { type: "spring" as const, stiffness: 250, damping: 28 };
  const fastSpring = { type: "spring" as const, stiffness: 400, damping: 35 };

  const highlightBoxShadow = reduceMotion
    ? "0 0 0 3px rgba(212,168,83,0.4), 0 0 20px rgba(212,168,83,0.12)"
    : [
        "0 0 0 3px rgba(212,168,83,0.4), 0 0 20px rgba(212,168,83,0.12)",
        "0 0 0 6px rgba(212,168,83,0.15), 0 0 36px rgba(212,168,83,0.22)",
        "0 0 0 3px rgba(212,168,83,0.4), 0 0 20px rgba(212,168,83,0.12)",
      ];

  return (
    <>
      {/* Spotlight overlay */}
      <div className="fixed inset-0 z-[3000] pointer-events-none">
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <motion.rect
                  initial={false}
                  animate={{
                    x: targetRect.left - 8,
                    y: targetRect.top - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                  }}
                  transition={reduceMotion ? { duration: 0.1 } : springTransition}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.74)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight border — animated position + continuous pulse */}
        {targetRect && (
          <motion.div
            className="absolute rounded-lg pointer-events-none"
            initial={false}
            animate={{
              opacity: 1,
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              boxShadow: highlightBoxShadow,
            }}
            transition={
              reduceMotion
                ? { duration: 0.1 }
                : {
                    top: springTransition,
                    left: springTransition,
                    width: springTransition,
                    height: springTransition,
                    boxShadow: {
                      repeat: Infinity,
                      duration: 2.5,
                      ease: "easeInOut",
                      repeatType: "mirror" as const,
                    },
                  }
            }
            style={{
              border: "2px solid rgba(212, 168, 83, 0.8)",
            }}
          />
        )}
      </div>

      {/* Tooltip card */}
      <div
        ref={tooltipRef}
        className="fixed z-[3001] w-[380px] rounded-xl shadow-2xl pointer-events-auto overflow-hidden"
        style={{
          ...(position
            ? { top: position.top, left: position.left }
            : { visibility: "hidden" as const }),
          background: "linear-gradient(145deg, #1a2744 0%, #1d2f54 100%)",
          border: "1px solid rgba(42, 58, 92, 0.8)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,168,83,0.08)",
        }}
      >
        <TooltipArrow arrowPosition={position?.arrowPosition ?? null} />

        {/* Progress bar */}
        <div
          className="mx-4 mt-3 h-0.5 rounded-full overflow-hidden"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: "#d4a853" }}
            initial={false}
            animate={{ width: `${(step / totalSteps) * 100}%` }}
            transition={reduceMotion ? { duration: 0.1 } : { type: "spring", stiffness: 200, damping: 25 }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 pt-3 pb-0">
          {Icon && (
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0"
              style={{ background: "rgba(212,168,83,0.13)" }}
            >
              <Icon className="w-4 h-4" style={{ color: "#d4a853" }} />
            </div>
          )}
          <h3 className="text-sm font-semibold flex-1 leading-snug" style={{ color: "#eef2ff" }}>
            {title}
          </h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span
              className="text-xs font-medium px-1.5 py-0.5 rounded-md"
              style={{ color: "#d4a853", backgroundColor: "rgba(212, 168, 83, 0.11)" }}
            >
              {step}/{totalSteps}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSkip}
              className="h-6 w-6"
              style={{ color: "#8b9dc3" }}
              aria-label="Saltar tour"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Animated content per step */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reduceMotion ? { duration: 0.1 } : fastSpring}
          >
            <div className="px-4 pt-2 pb-3">
              <p className="text-sm leading-relaxed" style={{ color: "#c5cee0" }}>
                {description}
              </p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-1.5 pb-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  initial={false}
                  animate={{
                    width: i + 1 === step ? 18 : 6,
                    backgroundColor:
                      i + 1 === step ? "#d4a853" : "rgba(139, 157, 195, 0.22)",
                  }}
                  transition={
                    reduceMotion
                      ? { duration: 0.1 }
                      : { type: "spring", stiffness: 300, damping: 25 }
                  }
                  style={{ height: 6 }}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Actions */}
        <div
          className="flex items-center justify-between px-4 py-2.5"
          style={{ borderTop: "1px solid rgba(42, 58, 92, 0.5)" }}
        >
          <span className="text-xs" style={{ color: "rgba(139, 157, 195, 0.45)" }}>
            ← → navegar · Esc saltar
          </span>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPrevious}
                className="gap-1 h-7 px-2.5"
                style={{
                  borderColor: "rgba(42, 58, 92, 0.8)",
                  color: "#c5cee0",
                  backgroundColor: "transparent",
                  fontSize: "0.75rem",
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Ant.
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLast ? onComplete : onNext}
              className="gap-1 h-7 px-3"
              style={{
                backgroundColor: "#d4a853",
                color: "#0a1628",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {isLast ? "¡Empezar!" : "Siguiente"}
              {!isLast && <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
