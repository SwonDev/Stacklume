"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

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
}

const TOOLTIP_OFFSET = 12;

// Arrow component for tooltip positioning - moved outside to avoid recreation during render
function TooltipArrow({ arrowPosition }: { arrowPosition: "top" | "bottom" | "left" | "right" | null }) {
  if (!arrowPosition) return null;

  const arrowClasses = cn(
    "absolute w-0 h-0 border-solid",
    "border-transparent"
  );

  switch (arrowPosition) {
    case "top":
      return (
        <div
          className={cn(
            arrowClasses,
            "left-1/2 -translate-x-1/2 -top-2",
            "border-b-card border-b-8 border-x-8"
          )}
        />
      );
    case "bottom":
      return (
        <div
          className={cn(
            arrowClasses,
            "left-1/2 -translate-x-1/2 -bottom-2",
            "border-t-card border-t-8 border-x-8"
          )}
        />
      );
    case "left":
      return (
        <div
          className={cn(
            arrowClasses,
            "top-1/2 -translate-y-1/2 -left-2",
            "border-r-card border-r-8 border-y-8"
          )}
        />
      );
    case "right":
      return (
        <div
          className={cn(
            arrowClasses,
            "top-1/2 -translate-y-1/2 -right-2",
            "border-l-card border-l-8 border-y-8"
          )}
        />
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
}: OnboardingTooltipProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate position based on target element
  const calculatePosition = useCallback(() => {
    const target = document.querySelector(targetSelector);
    if (!target || !tooltipRef.current) return;

    const targetRect = target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    setTargetRect(targetRect);

    // Determine best position (prefer bottom, then top, then sides)
    let top = 0;
    let left = 0;
    let arrowPosition: "top" | "bottom" | "left" | "right" = "top";

    // Try bottom
    const bottomSpace = viewportHeight - targetRect.bottom;
    const topSpace = targetRect.top;

    if (bottomSpace >= tooltipRect.height + TOOLTIP_OFFSET) {
      // Position below
      top = targetRect.bottom + TOOLTIP_OFFSET;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      arrowPosition = "top";
    } else if (topSpace >= tooltipRect.height + TOOLTIP_OFFSET) {
      // Position above
      top = targetRect.top - tooltipRect.height - TOOLTIP_OFFSET;
      left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      arrowPosition = "bottom";
    } else {
      // Position to the side with more space
      const leftSpace = targetRect.left;
      const rightSpace = viewportWidth - targetRect.right;

      if (rightSpace >= tooltipRect.width + TOOLTIP_OFFSET) {
        // Position right
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.right + TOOLTIP_OFFSET;
        arrowPosition = "left";
      } else if (leftSpace >= tooltipRect.width + TOOLTIP_OFFSET) {
        // Position left
        top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        left = targetRect.left - tooltipRect.width - TOOLTIP_OFFSET;
        arrowPosition = "right";
      } else {
        // Default to bottom with scroll adjustment
        top = targetRect.bottom + TOOLTIP_OFFSET;
        left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        arrowPosition = "top";
      }
    }

    // Keep tooltip within viewport bounds
    left = Math.max(16, Math.min(left, viewportWidth - tooltipRect.width - 16));
    top = Math.max(16, Math.min(top, viewportHeight - tooltipRect.height - 16));

    setPosition({ top, left, arrowPosition });
  }, [targetSelector]);

  // Recalculate on mount and window resize
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

  // Scroll target into view
  useEffect(() => {
    const target = document.querySelector(targetSelector);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [targetSelector]);

  return (
    <>
      {/* Spotlight overlay */}
      <div className="fixed inset-0 z-[3000] pointer-events-none">
        {/* Dark overlay with cutout */}
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              {targetRect && (
                <rect
                  x={targetRect.left - 8}
                  y={targetRect.top - 8}
                  width={targetRect.width + 16}
                  height={targetRect.height + 16}
                  rx="8"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.7)"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight border around target */}
        {targetRect && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_4px_rgba(var(--primary)/0.2)]"
            style={{
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          ref={tooltipRef}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.2 }}
          className={cn(
            "fixed z-[3001] w-[320px]",
            "bg-card border border-border rounded-lg shadow-xl",
            "pointer-events-auto"
          )}
          style={
            position
              ? { top: position.top, left: position.left }
              : { visibility: "hidden" }
          }
        >
          <TooltipArrow arrowPosition={position?.arrowPosition ?? null} />

          {/* Header */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {step} / {totalSteps}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onSkip}
              className="h-6 w-6 text-muted-foreground"
              aria-label="Saltar tour"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content */}
          <div className="px-4 pb-2">
            <h3 className="text-base font-semibold text-foreground mb-1">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1.5 py-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i + 1 === step ? "bg-primary" : "bg-muted-foreground/30"
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-4 pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              className="text-muted-foreground"
            >
              Saltar
            </Button>

            <div className="flex items-center gap-2">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onPrevious}
                  className="gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={isLast ? onComplete : onNext}
                className="gap-1"
              >
                {isLast ? "Finalizar" : "Siguiente"}
                {!isLast && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
