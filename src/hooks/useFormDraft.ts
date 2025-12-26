"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { UseFormReturn, FieldValues, Path, PathValue } from "react-hook-form";

interface UseFormDraftOptions<T extends FieldValues> {
  /** Unique key for storing draft in localStorage */
  key: string;
  /** React Hook Form instance */
  form: UseFormReturn<T>;
  /** Fields to watch and save (if not provided, saves all fields) */
  watchFields?: Path<T>[];
  /** Debounce delay in milliseconds (default: 1000) */
  debounceMs?: number;
  /** Whether the draft functionality is enabled (default: true) */
  enabled?: boolean;
}

interface UseFormDraftReturn {
  /** Whether a draft exists and can be restored */
  hasDraft: boolean;
  /** Restore the saved draft to the form */
  restoreDraft: () => void;
  /** Clear the saved draft */
  clearDraft: () => void;
  /** Dismiss the draft prompt without restoring */
  dismissDraft: () => void;
  /** Timestamp when draft was last saved */
  draftTimestamp: Date | null;
  /** Whether the draft prompt has been dismissed */
  isDismissed: boolean;
}

interface DraftData<T> {
  data: Partial<T>;
  timestamp: string;
}

const DRAFT_PREFIX = "stacklume-draft-";

/**
 * Hook for auto-saving and restoring form drafts using localStorage.
 *
 * Features:
 * - Debounced auto-save on form changes
 * - Draft restoration with prompt
 * - Automatic cleanup on successful submit
 * - Support for specific field watching
 *
 * @example
 * ```tsx
 * const form = useForm<FormValues>({ ... });
 * const { hasDraft, restoreDraft, clearDraft, dismissDraft } = useFormDraft({
 *   key: "add-link-modal",
 *   form,
 *   watchFields: ["url", "title", "description"],
 * });
 *
 * // In your component, show a prompt when hasDraft is true
 * if (hasDraft && !isDismissed) {
 *   return <DraftPrompt onRestore={restoreDraft} onDismiss={dismissDraft} />;
 * }
 * ```
 */
export function useFormDraft<T extends FieldValues>({
  key,
  form,
  watchFields,
  debounceMs = 1000,
  enabled = true,
}: UseFormDraftOptions<T>): UseFormDraftReturn {
  const [hasDraft, setHasDraft] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<Date | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringRef = useRef(false);

  const storageKey = `${DRAFT_PREFIX}${key}`;

  // Check for existing draft on mount
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const frame = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const draft: DraftData<T> = JSON.parse(saved);
          const hasContent = draft.data && Object.values(draft.data).some(
            (value) => value !== "" && value !== null && value !== undefined
          );
          if (hasContent) {
            setHasDraft(true);
            setDraftTimestamp(new Date(draft.timestamp));
          }
        }
      } catch (error) {
        console.error("Error loading draft:", error);
        // Clear corrupted draft
        localStorage.removeItem(storageKey);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [storageKey, enabled]);

  // Save draft function
  const saveDraft = useCallback(
    (data: Partial<T>) => {
      if (!enabled || typeof window === "undefined" || isRestoringRef.current) return;

      // Only save if there's actual content
      const hasContent = Object.values(data).some(
        (value) => value !== "" && value !== null && value !== undefined
      );

      if (hasContent) {
        const draftData: DraftData<T> = {
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draftData));
      }
    },
    [storageKey, enabled]
  );

  // Watch form changes and auto-save
  useEffect(() => {
    if (!enabled) return;

    const subscription = form.watch((data) => {
      if (isRestoringRef.current) return;

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounced save
      saveTimeoutRef.current = setTimeout(() => {
        if (watchFields) {
          // Only save specified fields
          const filteredData: Partial<T> = {};
          for (const field of watchFields) {
            const value = data[field as string];
            if (value !== undefined) {
              (filteredData as Record<string, unknown>)[field as string] = value;
            }
          }
          saveDraft(filteredData);
        } else {
          // Save all fields
          saveDraft(data as Partial<T>);
        }
      }, debounceMs);
    });

    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, watchFields, debounceMs, saveDraft, enabled]);

  // Restore draft to form
  const restoreDraft = useCallback(() => {
    if (!enabled || typeof window === "undefined") return;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const draft: DraftData<T> = JSON.parse(saved);
        isRestoringRef.current = true;

        // Restore each field
        Object.entries(draft.data).forEach(([field, value]) => {
          if (value !== undefined) {
            form.setValue(field as Path<T>, value as PathValue<T, Path<T>>, {
              shouldDirty: true,
              shouldValidate: false,
            });
          }
        });

        // Clear the draft after restoring
        setHasDraft(false);
        setIsDismissed(true);

        // Allow saves again after a short delay
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      }
    } catch (error) {
      console.error("Error restoring draft:", error);
    }
  }, [storageKey, form, enabled]);

  // Clear draft from storage
  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") return;

    localStorage.removeItem(storageKey);
    setHasDraft(false);
    setDraftTimestamp(null);
    setIsDismissed(false);
  }, [storageKey]);

  // Dismiss draft prompt without restoring
  const dismissDraft = useCallback(() => {
    setIsDismissed(true);
    clearDraft();
  }, [clearDraft]);

  return {
    hasDraft,
    restoreDraft,
    clearDraft,
    dismissDraft,
    draftTimestamp,
    isDismissed,
  };
}

/**
 * Utility to format draft timestamp in a human-readable way
 */
export function formatDraftTime(date: Date | null): string {
  if (!date) return "";

  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "hace un momento";
  if (minutes === 1) return "hace 1 minuto";
  if (minutes < 60) return `hace ${minutes} minutos`;
  if (hours === 1) return "hace 1 hora";
  if (hours < 24) return `hace ${hours} horas`;
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} dias`;

  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}
