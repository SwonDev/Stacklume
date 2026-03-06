"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string[];
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: ["Ctrl", "K"], description: "Búsqueda rápida" },
  { keys: ["Ctrl", "N"], description: "Nuevo enlace" },
  { keys: ["Esc"], description: "Cerrar / Limpiar búsqueda" },
  { keys: ["?"], description: "Ver atajos de teclado" },
  { keys: ["Ctrl", "Shift", "S"], description: "Mostrar ventana (escritorio)" },
  { keys: ["Ctrl", "Shift", "L"], description: "Añadir enlace rápido (escritorio)" },
];

export function KeyboardShortcutsModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
          <DialogDescription>
            Acciones rápidas disponibles en la aplicación
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1 mt-2">
          {shortcuts.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((k, ki) => (
                  <span key={ki} className="flex items-center gap-1">
                    <kbd className="px-2 py-0.5 text-xs bg-muted border border-border rounded font-mono">
                      {k}
                    </kbd>
                    {ki < s.keys.length - 1 && (
                      <span className="text-xs text-muted-foreground">+</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
