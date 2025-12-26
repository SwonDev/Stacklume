"use client";

import { useState, useCallback, useRef, useEffect, forwardRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

export interface DropZoneProps {
  children: React.ReactNode;
  onDrop?: (data: DataTransfer) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  accept?: string[]; // MIME types to accept
  dropHint?: string;
  disabled?: boolean;
  className?: string;
  activeClassName?: string;
  invalidClassName?: string;
  showIndicator?: boolean;
  validateDrop?: (data: DataTransfer) => boolean;
}

export const DropZone = forwardRef<HTMLDivElement, DropZoneProps>(
  (
    {
      children,
      onDrop,
      onDragEnter,
      onDragLeave,
      accept,
      dropHint = "Suelta aqui",
      disabled = false,
      className,
      activeClassName,
      invalidClassName,
      showIndicator = true,
      validateDrop,
    },
    ref
  ) => {
    const reduceMotion = useSettingsStore((state) => state.reduceMotion);
    const [isActive, setIsActive] = useState(false);
    const [isInvalid, setIsInvalid] = useState(false);
    const dragCounter = useRef(0);

    const handleDragEnter = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled) return;

        dragCounter.current++;

        if (dragCounter.current === 1) {
          // Validate the drop if validator provided
          if (validateDrop && e.dataTransfer) {
            const isValid = validateDrop(e.dataTransfer);
            setIsInvalid(!isValid);
          } else if (accept && e.dataTransfer?.types) {
            // Check MIME types
            const hasValidType = accept.some((type) =>
              e.dataTransfer.types.includes(type)
            );
            setIsInvalid(!hasValidType);
          }

          setIsActive(true);
          onDragEnter?.();
        }
      },
      [disabled, accept, validateDrop, onDragEnter]
    );

    const handleDragLeave = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled) return;

        dragCounter.current--;

        if (dragCounter.current === 0) {
          setIsActive(false);
          setIsInvalid(false);
          onDragLeave?.();
        }
      },
      [disabled, onDragLeave]
    );

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (disabled) return;

        // Set drop effect based on validity
        e.dataTransfer.dropEffect = isInvalid ? "none" : "copy";
      },
      [disabled, isInvalid]
    );

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();

        dragCounter.current = 0;
        setIsActive(false);
        setIsInvalid(false);

        if (disabled || isInvalid) return;

        onDrop?.(e.dataTransfer);
      },
      [disabled, isInvalid, onDrop]
    );

    return (
      <div
        ref={ref}
        data-drop-zone
        data-drop-active={isActive && !isInvalid}
        data-drop-invalid={isActive && isInvalid}
        data-drop-hint={dropHint}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative",
          className,
          isActive && !isInvalid && activeClassName,
          isActive && isInvalid && invalidClassName
        )}
      >
        {children}

        {/* Visual indicator overlay */}
        <AnimatePresence>
          {showIndicator && isActive && !isInvalid && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95 }}
              className={cn(
                "absolute inset-0 z-50 flex items-center justify-center",
                "bg-primary/5 backdrop-blur-[2px] rounded-lg",
                "pointer-events-none"
              )}
            >
              <div className="flex flex-col items-center gap-2 text-primary">
                <motion.div
                  animate={reduceMotion ? {} : { y: [0, -4, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <Download className="w-8 h-8" />
                </motion.div>
                <span className="text-sm font-medium">{dropHint}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

DropZone.displayName = "DropZone";

// Hook for managing drop zone state manually
export interface UseDropZoneOptions {
  onDrop?: (data: DataTransfer) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  accept?: string[];
  disabled?: boolean;
  validateDrop?: (data: DataTransfer) => boolean;
}

export interface UseDropZoneReturn {
  isActive: boolean;
  isInvalid: boolean;
  dropZoneProps: {
    "data-drop-zone": boolean;
    "data-drop-active": string;
    "data-drop-invalid": string;
    onDragEnter: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
}

export function useDropZone(options: UseDropZoneOptions = {}): UseDropZoneReturn {
  const {
    onDrop,
    onDragEnter,
    onDragLeave,
    accept,
    disabled = false,
    validateDrop,
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [isInvalid, setIsInvalid] = useState(false);
  const dragCounter = useRef(0);

  // Reset state when disabled changes
  useEffect(() => {
    if (disabled) {
      const frame = requestAnimationFrame(() => {
        setIsActive(false);
        setIsInvalid(false);
        dragCounter.current = 0;
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [disabled]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current++;

      if (dragCounter.current === 1) {
        if (validateDrop && e.dataTransfer) {
          const isValid = validateDrop(e.dataTransfer);
          setIsInvalid(!isValid);
        } else if (accept && e.dataTransfer?.types) {
          const hasValidType = accept.some((type) =>
            e.dataTransfer.types.includes(type)
          );
          setIsInvalid(!hasValidType);
        }

        setIsActive(true);
        onDragEnter?.();
      }
    },
    [disabled, accept, validateDrop, onDragEnter]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      dragCounter.current--;

      if (dragCounter.current === 0) {
        setIsActive(false);
        setIsInvalid(false);
        onDragLeave?.();
      }
    },
    [disabled, onDragLeave]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (disabled) return;

      e.dataTransfer.dropEffect = isInvalid ? "none" : "copy";
    },
    [disabled, isInvalid]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      dragCounter.current = 0;
      setIsActive(false);
      setIsInvalid(false);

      if (disabled || isInvalid) return;

      onDrop?.(e.dataTransfer);
    },
    [disabled, isInvalid, onDrop]
  );

  return {
    isActive,
    isInvalid,
    dropZoneProps: {
      "data-drop-zone": true,
      "data-drop-active": String(isActive && !isInvalid),
      "data-drop-invalid": String(isActive && isInvalid),
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },
  };
}

// File drop zone specifically for file uploads
export interface FileDropZoneProps {
  children: React.ReactNode;
  onFilesDropped: (files: File[]) => void;
  accept?: string; // File input accept attribute format
  multiple?: boolean;
  maxSize?: number; // Max file size in bytes
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
  dropHint?: string;
}

export function FileDropZone({
  children,
  onFilesDropped,
  accept,
  multiple = true,
  maxSize,
  maxFiles,
  disabled = false,
  className,
  dropHint = "Suelta archivos aqui",
}: FileDropZoneProps) {
  const validateFiles = useCallback(
    (dataTransfer: DataTransfer): boolean => {
      const files = Array.from(dataTransfer.files);

      if (files.length === 0) return false;
      if (!multiple && files.length > 1) return false;
      if (maxFiles && files.length > maxFiles) return false;

      // Check file types
      if (accept) {
        const acceptedTypes = accept.split(",").map((t) => t.trim().toLowerCase());
        const allValid = files.every((file) => {
          const fileType = file.type.toLowerCase();
          const fileExt = `.${file.name.split(".").pop()?.toLowerCase()}`;

          return acceptedTypes.some((accepted) => {
            if (accepted.startsWith(".")) {
              return fileExt === accepted;
            }
            if (accepted.endsWith("/*")) {
              return fileType.startsWith(accepted.replace("/*", "/"));
            }
            return fileType === accepted;
          });
        });

        if (!allValid) return false;
      }

      // Check file sizes
      if (maxSize) {
        const allWithinSize = files.every((file) => file.size <= maxSize);
        if (!allWithinSize) return false;
      }

      return true;
    },
    [accept, multiple, maxSize, maxFiles]
  );

  const handleDrop = useCallback(
    (dataTransfer: DataTransfer) => {
      const files = Array.from(dataTransfer.files);
      if (files.length > 0) {
        onFilesDropped(multiple ? files : [files[0]]);
      }
    },
    [multiple, onFilesDropped]
  );

  return (
    <DropZone
      onDrop={handleDrop}
      validateDrop={validateFiles}
      dropHint={dropHint}
      disabled={disabled}
      className={className}
      accept={["Files"]}
    >
      {children}
    </DropZone>
  );
}
