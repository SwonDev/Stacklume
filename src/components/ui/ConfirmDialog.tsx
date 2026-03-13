"use client";

import { useLayoutEffect, useState } from "react";
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
import { buttonVariants } from "@/components/ui/button";

interface ConfirmOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
}

interface ConfirmState {
  open: boolean;
  options: ConfirmOptions;
  resolve: ((value: boolean) => void) | null;
}

const CLOSED: ConfirmState = {
  open: false,
  options: { title: "", description: "" },
  resolve: null,
};

// Referencia al setter del estado del diálogo — se asigna cuando el componente monta
let _set: React.Dispatch<React.SetStateAction<ConfirmState>> | null = null;

/**
 * Muestra un diálogo de confirmación personalizado con el estilo de la aplicación.
 * Sustituye a window.confirm(). Devuelve una promesa que resuelve a true si el usuario confirma.
 *
 * @example
 * const ok = await showConfirm({ title: "Eliminar enlace", description: "¿Eliminar este enlace?", variant: "destructive" });
 * if (!ok) return;
 */
export function showConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    _set?.({ open: true, options, resolve });
  });
}

/**
 * Componente global de diálogo de confirmación.
 * Debe montarse UNA SOLA VEZ en AppShell (dentro del bloque {mounted && ...}).
 */
export function ConfirmDialog() {
  const [state, setState] = useState<ConfirmState>(CLOSED);

  // Sincronizar el setter en un efecto para no mutar una variable de módulo durante el render
  useLayoutEffect(() => {
    _set = setState;
    return () => { _set = null; };
  }, [setState]);

  const close = (result: boolean) => {
    state.resolve?.(result);
    setState(CLOSED);
  };

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{state.options.title}</AlertDialogTitle>
          <AlertDialogDescription>{state.options.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>
            {state.options.cancelLabel ?? "Cancelar"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={
              state.options.variant === "destructive"
                ? cn(buttonVariants({ variant: "destructive" }))
                : undefined
            }
          >
            {state.options.confirmLabel ?? "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
