"use client";

import { useState, useCallback, useEffect } from "react";
import { Share2, Link2, Copy, Check, ExternalLink, Trash2, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "motion/react";
import { motion } from "motion/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import type { SharedCollection } from "@/lib/db/schema";

interface ShareCollectionDialogProps {
  type: "category" | "tag" | "project";
  referenceId: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareCollectionDialog({
  type,
  referenceId,
  name,
  open,
  onOpenChange,
}: ShareCollectionDialogProps) {
  const [shared, setShared] = useState<SharedCollection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useExpiration, setUseExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState("");

  const getDefaultExpiration = useCallback(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  }, []);

  const fetchShared = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/shared", { credentials: "include", cache: "no-store" });
      if (!res.ok) throw new Error("Error al obtener compartidos");
      const all: SharedCollection[] = await res.json();
      const found = all.find((s) => s.type === type && s.referenceId === referenceId && s.isActive);
      setShared(found || null);
    } catch (e) {
      console.log("Error fetching shared collections:", e);
      toast.error("Error al verificar el estado de compartido");
    } finally {
      setIsLoading(false);
    }
  }, [type, referenceId]);

  useEffect(() => {
    if (open) {
      fetchShared();
      setExpirationDate(getDefaultExpiration());
      setCopied(false);
    }
  }, [open, fetchShared, getDefaultExpiration]);

  const shareUrl =
    shared && typeof window !== "undefined"
      ? `${window.location.origin}/shared/${shared.shareToken}`
      : "";

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const body: Record<string, unknown> = { type, referenceId };
      if (useExpiration && expirationDate) {
        body.expiresAt = new Date(expirationDate).toISOString();
      }
      const res = await fetch("/api/shared", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al crear enlace compartido");
      }
      const created: SharedCollection = await res.json();
      setShared(created);
      toast.success("Enlace compartido creado");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      toast.error(msg);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!shared) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/shared?id=${shared.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Error al desactivar");
      setShared(null);
      toast.success("Enlace compartido desactivado");
    } catch {
      toast.error("Error al desactivar el enlace compartido");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("URL copiada al portapapeles");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar al portapapeles");
    }
  };

  const typeLabel = type === "category" ? "categoría" : "etiqueta";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Compartir {typeLabel}
          </DialogTitle>
          <DialogDescription>
            Comparte la {typeLabel} &ldquo;{name}&rdquo; con un enlace público. Cualquier persona
            con el enlace podrá ver los links de esta {typeLabel}.
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center py-8"
            >
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </motion.div>
          ) : shared ? (
            <motion.div
              key="shared"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                >
                  <Link2 className="h-3 w-3 mr-1" />
                  Compartido
                </Badge>
                {shared.expiresAt && (
                  <Badge variant="outline" className="text-muted-foreground">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    Expira:{" "}
                    {new Date(shared.expiresAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Enlace público</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={shareUrl}
                    className="text-xs font-mono bg-muted/50"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={() => window.open(shareUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir en nueva pestaña
              </Button>

              <Separator />

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Desactivar el enlace lo hará inaccesible.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeactivate}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-1" />
                  )}
                  Desactivar
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-center">
                <Share2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Esta {typeLabel} aún no tiene enlace compartido.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="use-expiration" className="text-sm cursor-pointer">
                    Establecer fecha de expiración
                  </Label>
                  <Switch
                    id="use-expiration"
                    checked={useExpiration}
                    onCheckedChange={setUseExpiration}
                  />
                </div>

                <AnimatePresence>
                  {useExpiration && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="overflow-hidden"
                    >
                      <Input
                        type="date"
                        value={expirationDate}
                        onChange={(e) => setExpirationDate(e.target.value)}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        El enlace dejará de funcionar después de esta fecha.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && !shared && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Link2 className="h-4 w-4 mr-2" />
              )}
              Crear enlace compartido
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
