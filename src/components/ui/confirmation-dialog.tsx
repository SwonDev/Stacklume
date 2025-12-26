"use client";

import * as React from "react";
import { AlertTriangle, Trash2, Info } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "info";
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  /** Additional details to show (e.g., "This will affect X items") */
  details?: React.ReactNode;
}

const variantConfig = {
  destructive: {
    icon: Trash2,
    iconClassName: "text-destructive",
    actionClassName: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  },
  warning: {
    icon: AlertTriangle,
    iconClassName: "text-yellow-500",
    actionClassName: "bg-yellow-500 text-white hover:bg-yellow-600",
  },
  info: {
    icon: Info,
    iconClassName: "text-blue-500",
    actionClassName: "bg-blue-500 text-white hover:bg-blue-600",
  },
};

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "destructive",
  onConfirm,
  isLoading = false,
  details,
}: ConfirmationDialogProps) {
  const [isPending, setIsPending] = React.useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error("Confirmation action failed:", error);
    } finally {
      setIsPending(false);
    }
  };

  const loading = isLoading || isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.iconClassName)} />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>{description}</p>
              {details && (
                <div className="mt-2 p-3 rounded-md bg-muted text-sm text-muted-foreground">
                  {details}
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            className={cn(config.actionClassName)}
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Procesando...
              </span>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for managing confirmation dialog state
export function useConfirmationDialog() {
  const [state, setState] = React.useState<{
    open: boolean;
    props: Omit<ConfirmationDialogProps, "open" | "onOpenChange"> | null;
  }>({
    open: false,
    props: null,
  });

  const confirm = React.useCallback(
    (props: Omit<ConfirmationDialogProps, "open" | "onOpenChange">) => {
      setState({ open: true, props });
    },
    []
  );

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, open: false }));
  }, []);

  const DialogComponent = React.useMemo(() => {
    if (!state.props) return null;

    return (
      <ConfirmationDialog
        {...state.props}
        open={state.open}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      />
    );
  }, [state.open, state.props, close]);

  return {
    confirm,
    close,
    Dialog: DialogComponent,
  };
}
