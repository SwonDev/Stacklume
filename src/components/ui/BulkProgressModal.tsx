"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  AlertCircle,
  FileUp,
  Trash2,
  FolderSync,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/stores/settings-store";
import { cn } from "@/lib/utils";

export type BulkOperationType =
  | "delete"
  | "import"
  | "export"
  | "move"
  | "sync"
  | "custom";

export type OperationStatus = "pending" | "processing" | "success" | "error";

export interface BulkOperationItem {
  id: string;
  label: string;
  status: OperationStatus;
  error?: string;
}

interface BulkProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationType: BulkOperationType;
  title?: string;
  description?: string;
  items: BulkOperationItem[];
  progress: number; // 0-100
  isComplete: boolean;
  onCancel?: () => void;
  canCancel?: boolean;
  showItemDetails?: boolean;
}

const OPERATION_ICONS: Record<BulkOperationType, React.ReactNode> = {
  delete: <Trash2 className="w-5 h-5" />,
  import: <FileUp className="w-5 h-5" />,
  export: <FileUp className="w-5 h-5 rotate-180" />,
  move: <FolderSync className="w-5 h-5" />,
  sync: <FolderSync className="w-5 h-5" />,
  custom: <Loader2 className="w-5 h-5" />,
};

const OPERATION_TITLES: Record<BulkOperationType, string> = {
  delete: "Eliminando elementos",
  import: "Importando datos",
  export: "Exportando datos",
  move: "Moviendo elementos",
  sync: "Sincronizando",
  custom: "Procesando",
};

const OPERATION_DESCRIPTIONS: Record<BulkOperationType, string> = {
  delete: "Eliminando los elementos seleccionados...",
  import: "Importando datos al sistema...",
  export: "Preparando datos para exportar...",
  move: "Moviendo elementos a la nueva ubicacion...",
  sync: "Sincronizando datos...",
  custom: "Procesando operacion...",
};

export function BulkProgressModal({
  isOpen,
  onClose,
  operationType,
  title,
  description,
  items,
  progress,
  isComplete,
  onCancel,
  canCancel = true,
  showItemDetails = true,
}: BulkProgressModalProps) {
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to show latest processing item
  useEffect(() => {
    if (scrollAreaRef.current && !isComplete) {
      const processingItem = scrollAreaRef.current.querySelector(
        '[data-status="processing"]'
      );
      if (processingItem) {
        processingItem.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [items, isComplete]);

  const finalTitle = title || OPERATION_TITLES[operationType];
  const finalDescription = description || OPERATION_DESCRIPTIONS[operationType];

  const successCount = items.filter((i) => i.status === "success").length;
  const errorCount = items.filter((i) => i.status === "error").length;
  const totalCount = items.length;

  const getStatusIcon = (status: OperationStatus) => {
    switch (status) {
      case "pending":
        return (
          <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
        );
      case "processing":
        return (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        );
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && onClose()}>
      <DialogContent
        className="sm:max-w-[480px]"
        showCloseButton={isComplete}
        onPointerDownOutside={(e) => {
          if (!isComplete) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!isComplete) e.preventDefault();
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                isComplete
                  ? errorCount > 0
                    ? "bg-destructive/10 text-destructive"
                    : "bg-green-500/10 text-green-500"
                  : "bg-primary/10 text-primary"
              )}
            >
              {isComplete ? (
                errorCount > 0 ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )
              ) : (
                <motion.div
                  animate={reduceMotion ? {} : { rotate: 360 }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {OPERATION_ICONS[operationType]}
                </motion.div>
              )}
            </div>
            <div>
              <DialogTitle>
                {isComplete
                  ? errorCount > 0
                    ? "Completado con errores"
                    : "Operacion completada"
                  : finalTitle}
              </DialogTitle>
              <DialogDescription>
                {isComplete
                  ? `${successCount} de ${totalCount} elementos procesados${
                      errorCount > 0 ? ` (${errorCount} errores)` : ""
                    }`
                  : finalDescription}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Progress section */}
        <div className="space-y-4 py-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progreso</span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Items list */}
          {showItemDetails && items.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 px-3 py-2 border-b border-border">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Elementos ({successCount + errorCount} / {totalCount})
                </span>
              </div>
              <ScrollArea className="h-[200px]" ref={scrollAreaRef}>
                <div className="divide-y divide-border">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        data-status={item.status}
                        initial={
                          reduceMotion ? { opacity: 0 } : { opacity: 0, x: -10 }
                        }
                        animate={
                          reduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }
                        }
                        className={cn(
                          "flex items-center gap-3 px-3 py-2",
                          item.status === "processing" && "bg-primary/5",
                          item.status === "error" && "bg-destructive/5"
                        )}
                      >
                        {getStatusIcon(item.status)}
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm truncate",
                              item.status === "error" && "text-destructive"
                            )}
                          >
                            {item.label}
                          </p>
                          {item.error && (
                            <p className="text-xs text-destructive truncate">
                              {item.error}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Summary for completed state */}
          {isComplete && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
              className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span>{successCount} exitosos</span>
              </div>
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="w-4 h-4 text-destructive" />
                  <span>{errorCount} errores</span>
                </div>
              )}
            </motion.div>
          )}
        </div>

        <DialogFooter>
          {!isComplete && canCancel && onCancel && (
            <Button variant="outline" onClick={onCancel}>
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
          )}
          {isComplete && (
            <Button onClick={onClose}>Cerrar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook to manage bulk operation state
export interface UseBulkProgressOptions {
  operationType: BulkOperationType;
  title?: string;
  description?: string;
}

export interface UseBulkProgressReturn {
  // Modal props
  isOpen: boolean;
  progress: number;
  items: BulkOperationItem[];
  isComplete: boolean;
  operationType: BulkOperationType;
  title?: string;
  description?: string;

  // Actions
  start: (itemLabels: string[]) => void;
  updateItem: (index: number, status: OperationStatus, error?: string) => void;
  complete: () => void;
  cancel: () => void;
  reset: () => void;

  // Helper to process items sequentially
  processItems: <T>(
    items: T[],
    processor: (item: T, index: number) => Promise<void>,
    getLabel: (item: T) => string
  ) => Promise<{ success: number; errors: number }>;
}

export function useBulkProgress(
  options: UseBulkProgressOptions
): UseBulkProgressReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [items, setItems] = useState<BulkOperationItem[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const cancelledRef = useRef(false);

  const start = useCallback((itemLabels: string[]) => {
    cancelledRef.current = false;
    setItems(
      itemLabels.map((label, index) => ({
        id: `item-${index}`,
        label,
        status: "pending",
      }))
    );
    setProgress(0);
    setIsComplete(false);
    setIsOpen(true);
  }, []);

  const updateItem = useCallback(
    (index: number, status: OperationStatus, error?: string) => {
      setItems((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], status, error };
        return updated;
      });

      // Update progress
      setProgress((index + 1) / items.length * 100);
    },
    [items.length]
  );

  const complete = useCallback(() => {
    setIsComplete(true);
    setProgress(100);
  }, []);

  const cancel = useCallback(() => {
    cancelledRef.current = true;
    setIsComplete(true);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setProgress(0);
    setItems([]);
    setIsComplete(false);
    cancelledRef.current = false;
  }, []);

  const processItems = useCallback(
    async <T,>(
      itemsToProcess: T[],
      processor: (item: T, index: number) => Promise<void>,
      getLabel: (item: T) => string
    ): Promise<{ success: number; errors: number }> => {
      // Initialize items
      const labels = itemsToProcess.map(getLabel);
      start(labels);

      let successCount = 0;
      let errorCount = 0;

      for (let i = 0; i < itemsToProcess.length; i++) {
        if (cancelledRef.current) break;

        // Update to processing
        setItems((prev) => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: "processing" };
          return updated;
        });

        try {
          await processor(itemsToProcess[i], i);
          setItems((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: "success" };
            return updated;
          });
          successCount++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Error desconocido";
          setItems((prev) => {
            const updated = [...prev];
            updated[i] = { ...updated[i], status: "error", error: errorMessage };
            return updated;
          });
          errorCount++;
        }

        // Update progress
        setProgress(((i + 1) / itemsToProcess.length) * 100);

        // Small delay for visual feedback
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      complete();
      return { success: successCount, errors: errorCount };
    },
    [start, complete]
  );

  return {
    isOpen,
    progress,
    items,
    isComplete,
    operationType: options.operationType,
    title: options.title,
    description: options.description,
    start,
    updateItem,
    complete,
    cancel,
    reset,
    processItems,
  };
}
