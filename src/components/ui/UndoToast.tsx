"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUndoToast } from "@/hooks/useUndoRedo";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

const AUTO_DISMISS_MS = 5000;

export function UndoToast() {
  const { showToast, action, dismiss, undo } = useUndoToast();
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    if (showToast) {
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Set new timer
      timerRef.current = setTimeout(() => {
        dismiss();
      }, AUTO_DISMISS_MS);

      // Reset progress animation
      if (progressRef.current) {
        progressRef.current.style.transition = "none";
        progressRef.current.style.width = "100%";
        // Force reflow
        void progressRef.current.offsetWidth;
        progressRef.current.style.transition = `width ${AUTO_DISMISS_MS}ms linear`;
        progressRef.current.style.width = "0%";
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [showToast, dismiss, action?.id]);

  const handleUndo = useCallback(async () => {
    // Clear the timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    dismiss();
    await undo();
  }, [dismiss, undo]);

  const handleDismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    dismiss();
  }, [dismiss]);

  // Pause timer on hover
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    if (progressRef.current) {
      // Pause the animation by getting current width and stopping
      const computedStyle = window.getComputedStyle(progressRef.current);
      const currentWidth = computedStyle.width;
      progressRef.current.style.transition = "none";
      progressRef.current.style.width = currentWidth;
    }
  }, []);

  // Resume timer on mouse leave
  const handleMouseLeave = useCallback(() => {
    if (!showToast) return;

    // Get remaining time based on current progress width
    const remaining = progressRef.current
      ? (parseFloat(progressRef.current.style.width) / 100) * AUTO_DISMISS_MS
      : AUTO_DISMISS_MS;

    // Restart timer with remaining time
    timerRef.current = setTimeout(() => {
      dismiss();
    }, Math.max(remaining, 1000));

    // Resume animation
    if (progressRef.current) {
      progressRef.current.style.transition = `width ${remaining}ms linear`;
      progressRef.current.style.width = "0%";
    }
  }, [showToast, dismiss]);

  if (!action) return null;

  return (
    <AnimatePresence mode="wait">
      {showToast && (
        <motion.div
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 50, scale: 0.9 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.2, ease: "easeOut" }}
          className={cn(
            "fixed bottom-4 left-1/2 -translate-x-1/2 z-[2000]",
            "bg-card border border-border rounded-lg shadow-lg",
            "min-w-[300px] max-w-[400px] overflow-hidden"
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          role="alert"
          aria-live="polite"
        >
          {/* Content */}
          <div className="flex items-center gap-3 p-3">
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
              <Undo2 className="w-4 h-4 text-destructive" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {action.description}
              </p>
              <p className="text-xs text-muted-foreground">
                Pulsa Deshacer o Ctrl+Z para revertir
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                variant="default"
                size="sm"
                onClick={handleUndo}
                className="h-8"
              >
                Deshacer
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleDismiss}
                className="h-8 w-8"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-muted/50 w-full">
            <div
              ref={progressRef}
              className="h-full bg-primary/50"
              style={{ width: "100%" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Alternative inline toast for specific contexts
interface InlineUndoToastProps {
  description: string;
  onUndo: () => void;
  onDismiss: () => void;
  className?: string;
}

export function InlineUndoToast({
  description,
  onUndo,
  onDismiss,
  className,
}: InlineUndoToastProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);

    if (progressRef.current) {
      progressRef.current.style.transition = `width ${AUTO_DISMISS_MS}ms linear`;
      progressRef.current.style.width = "0%";
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onDismiss]);

  const handleUndo = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    onUndo();
  };

  return (
    <motion.div
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      className={cn(
        "bg-card border border-border rounded-lg shadow-md overflow-hidden",
        className
      )}
    >
      <div className="flex items-center gap-2 p-2 text-sm">
        <span className="text-muted-foreground">{description}</span>
        <Button
          variant="link"
          size="sm"
          onClick={handleUndo}
          className="h-auto p-0 text-primary"
        >
          Deshacer
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDismiss}
          className="h-6 w-6 ml-auto"
          aria-label="Cerrar"
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="h-0.5 bg-muted/50 w-full">
        <div
          ref={progressRef}
          className="h-full bg-primary/50"
          style={{ width: "100%" }}
        />
      </div>
    </motion.div>
  );
}
