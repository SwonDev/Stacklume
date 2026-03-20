"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Archive, Loader2, X, ExternalLink, AlignLeft,
  RotateCcw, FolderOpen, FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { openExternalUrl } from "@/lib/desktop";
import { getCsrfHeaders } from "@/hooks/useCsrf";

interface PageArchive {
  id: string;
  linkId: string;
  title?: string;
  textContent?: string;
  htmlContent?: string;
  archivedAt: string;
  wordCount: number;
  size: number;
}

interface ReaderModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkId: string;
  linkUrl: string;
  linkTitle: string;
}

type FontSize = "sm" | "base" | "lg";

const fontSizeClasses: Record<FontSize, string> = {
  sm: "text-sm leading-relaxed",
  base: "text-base leading-relaxed",
  lg: "text-lg leading-[1.8]",
};

export function ReaderModeModal({
  open,
  onOpenChange,
  linkId,
  linkUrl,
  linkTitle,
}: ReaderModeModalProps) {
  const [archive, setArchive] = useState<PageArchive | null>(null);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>("base");

  const isLocalFile = linkUrl.startsWith("local://");

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setArchive(null), 300);
      return () => clearTimeout(t);
    }

    // Los archivos locales no se pueden archivar desde el servidor
    if (isLocalFile) return;
    if (!linkId) return;

    const fetchArchive = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/archives?linkId=${linkId}`);
        if (res.ok) {
          const data = await res.json();
          setArchive(Array.isArray(data) ? (data[0] ?? null) : (data ?? null));
        }
      } catch {
        // sin archivo aún
      } finally {
        setLoading(false);
      }
    };

    fetchArchive();
  }, [open, linkId, isLocalFile]);

  const handleArchive = async () => {
    setArchiving(true);
    try {
      const res = await fetch("/api/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ linkId, url: linkUrl }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Error al archivar");
      }

      const data = await res.json();
      setArchive(data);
      toast.success("Página archivada correctamente");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al archivar la página");
    } finally {
      setArchiving(false);
    }
  };

  const handleDeleteArchive = async () => {
    if (!archive) return;
    try {
      const res = await fetch(`/api/archives/${archive.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) throw new Error();
      setArchive(null);
      toast.success("Archivo eliminado");
    } catch {
      toast.error("Error al eliminar el archivo");
    }
  };

  const readingTime = archive ? Math.max(1, Math.ceil(archive.wordCount / 200)) : 0;

  const paragraphs = archive?.textContent
    ? archive.textContent
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0)
        .slice(0, 300)
    : [];

  const displayUrl = (() => {
    if (isLocalFile) {
      const path = linkUrl.slice("local://".length);
      return path.length > 50 ? "…" + path.slice(-47) : path;
    }
    try {
      const u = new URL(linkUrl);
      return u.hostname.replace(/^www\./, "") + u.pathname.slice(0, 40);
    } catch {
      return linkUrl.slice(0, 50);
    }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] flex flex-col gap-0 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-start gap-3 min-w-0">
            {/* Título y URL */}
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-semibold leading-snug line-clamp-2 pr-2">
                {linkTitle}
              </DialogTitle>
              <button
                className="text-xs text-muted-foreground hover:text-primary truncate max-w-full text-left mt-0.5 transition-colors block"
                onClick={() => openExternalUrl(linkUrl)}
                title={linkUrl}
              >
                {isLocalFile && (
                  <FolderOpen className="inline h-3 w-3 mr-1 text-indigo-500" />
                )}
                {displayUrl}
              </button>
            </div>

            {/* Meta + acciones de cabecera */}
            <div className="flex items-center gap-1.5 shrink-0">
              {archive && (
                <>
                  <Badge variant="secondary" className="text-xs gap-1 h-6 hidden sm:flex">
                    <AlignLeft className="h-3 w-3" />
                    {archive.wordCount.toLocaleString()} palabras · {readingTime} min
                  </Badge>

                  {/* Control de tamaño de fuente */}
                  <div className="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
                    {(["sm", "base", "lg"] as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => setFontSize(size)}
                        title={`Tamaño ${size}`}
                        className={`px-1.5 py-0.5 transition-colors ${
                          fontSize === size
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <span
                          className={`font-medium leading-none ${
                            size === "sm" ? "text-[10px]" : size === "base" ? "text-xs" : "text-sm"
                          }`}
                        >
                          A
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Eliminar archivo */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={handleDeleteArchive}
                    title="Eliminar archivo"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* ── Contenido ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">

          {/* Archivo local — no se puede archivar */}
          {isLocalFile && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-indigo-500" />
              </div>
              <p className="text-sm font-semibold mb-1.5">Archivo local</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
                Los archivos locales no pueden archivarse en modo lectura.
                Ábrelo directamente con la aplicación asociada en tu sistema.
              </p>
              <Button
                className="gap-2 h-9"
                onClick={() => openExternalUrl(linkUrl)}
              >
                <FolderOpen className="h-4 w-4" />
                Abrir archivo
              </Button>
            </div>
          )}

          {/* Cargando */}
          {!isLocalFile && loading && (
            <div className="space-y-3 animate-pulse py-2">
              <div className="h-5 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-5/6" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-4 bg-muted rounded w-4/5" />
              <div className="h-4 bg-muted rounded w-full mt-4" />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-4 bg-muted rounded w-full" />
            </div>
          )}

          {/* Sin archivo */}
          {!isLocalFile && !loading && !archive && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-semibold mb-1.5">Sin archivo guardado</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs leading-relaxed">
                Guarda una copia offline de esta página para leerla sin conexión
                y sin anuncios.
              </p>
              <div className="flex flex-wrap gap-2.5 justify-center">
                <Button onClick={handleArchive} disabled={archiving} className="gap-2 h-9">
                  {archiving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Archive className="h-4 w-4" />
                  )}
                  {archiving ? "Archivando…" : "Archivar página"}
                </Button>
                <Button
                  variant="outline"
                  className="gap-2 h-9"
                  onClick={() => openExternalUrl(linkUrl)}
                >
                  <ExternalLink className="h-4 w-4" />
                  Abrir en navegador
                </Button>
              </div>
            </div>
          )}

          {/* Contenido archivado */}
          {!isLocalFile && !loading && archive && (
            <article className="max-w-prose mx-auto">
              {archive.title && archive.title !== linkTitle && (
                <h2 className="text-xl font-bold mb-5 leading-tight text-foreground">
                  {archive.title}
                </h2>
              )}
              {archive.htmlContent ? (
                <div
                  className={`reader-prose ${fontSizeClasses[fontSize]}`}
                  dangerouslySetInnerHTML={{ __html: archive.htmlContent }}
                />
              ) : (
                <div className={fontSizeClasses[fontSize]}>
                  {paragraphs.map((paragraph, i) => (
                    <p key={i} className="mb-4 text-foreground/85">
                      {paragraph}
                    </p>
                  ))}
                  {paragraphs.length === 0 && (
                    <p className="text-muted-foreground italic">
                      No se pudo extraer el contenido de esta página. Prueba a abrirla en el navegador.
                    </p>
                  )}
                </div>
              )}
            </article>
          )}
        </div>

        {/* ── Footer ── */}
        {!isLocalFile && !loading && archive && (
          <div className="px-5 py-3 border-t border-border shrink-0 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Archivado el{" "}
              {new Date(archive.archivedAt).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" · "}
              <span className="font-medium">{(archive.size / 1024).toFixed(0)} KB</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={archiving}
                className="gap-1.5 h-7 text-xs"
                title="Volver a archivar la página"
              >
                {archiving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Actualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openExternalUrl(linkUrl)}
                className="gap-1.5 h-7 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
                Abrir original
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
