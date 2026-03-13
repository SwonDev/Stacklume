"use client";

import { useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  BookOpen, Inbox, CheckCheck, RotateCcw, Archive, ExternalLink,
  CheckSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";
import { openExternalUrl } from "@/lib/desktop";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { ReaderModeModal } from "@/components/modals/ReaderModeModal";

type ReadingStatus = "inbox" | "reading" | "done";

interface ReadingQueueWidgetProps {
  widgetId?: string;
}

const STATUS_CONFIG: Record<
  ReadingStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    emptyText: string;
    emptySubtext: string;
  }
> = {
  inbox: {
    label: "Pendientes",
    icon: Inbox,
    color: "text-blue-500",
    emptyText: "Bandeja vacía",
    emptySubtext: "Todos tus enlaces están organizados. ¡Buen trabajo!",
  },
  reading: {
    label: "Leyendo",
    icon: BookOpen,
    color: "text-amber-500",
    emptyText: "Nada en curso",
    emptySubtext: "Marca un enlace como «Leyendo» para verlo aquí.",
  },
  done: {
    label: "Leídos",
    icon: CheckCheck,
    color: "text-green-500",
    emptyText: "Sin completar aún",
    emptySubtext: "Los enlaces que termines de leer aparecerán aquí.",
  },
};

export function ReadingQueueWidget({ widgetId: _widgetId }: ReadingQueueWidgetProps) {
  const [activeTab, setActiveTab] = useState<ReadingStatus>("inbox");
  const [updating, setUpdating] = useState<string | null>(null);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [readerLink, setReaderLink] = useState<{
    id: string;
    url: string;
    title: string;
  } | null>(null);

  const links = useLinksStore((s) => s.links);
  const refreshAllData = useLinksStore((s) => s.refreshAllData);

  // Filtrar links por estado de lectura
  const byStatus = useCallback(
    (status: ReadingStatus) =>
      links.filter(
        (l) => !l.deletedAt && (l.readingStatus ?? "inbox") === status
      ),
    [links]
  );

  const tabLinks = useMemo(() => byStatus(activeTab), [byStatus, activeTab]);

  // Calcular stats
  const stats = useMemo(
    () => ({
      inbox: byStatus("inbox").length,
      reading: byStatus("reading").length,
      done: byStatus("done").length,
    }),
    [byStatus]
  );

  const updateStatus = async (linkId: string, status: ReadingStatus) => {
    setUpdating(linkId);
    try {
      const res = await fetch(`/api/links/${linkId}/reading-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ readingStatus: status }),
      });
      if (!res.ok) throw new Error();
      await refreshAllData();
    } catch {
      toast.error("No se pudo actualizar el estado");
    } finally {
      setUpdating(null);
    }
  };

  // Acción masiva: marcar todos los del tab actual como un status destino
  const handleBulkMark = async (targetStatus: ReadingStatus) => {
    if (tabLinks.length === 0) return;
    setBulkUpdating(true);
    try {
      await Promise.all(
        tabLinks.map((link) =>
          fetch(`/api/links/${link.id}/reading-status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            body: JSON.stringify({ readingStatus: targetStatus }),
          })
        )
      );
      await refreshAllData();
      toast.success(
        `${tabLinks.length} enlace${tabLinks.length !== 1 ? "s" : ""} marcado${tabLinks.length !== 1 ? "s" : ""} como ${STATUS_CONFIG[targetStatus].label.toLowerCase()}`
      );
    } catch {
      toast.error("Error al actualizar los enlaces");
    } finally {
      setBulkUpdating(false);
    }
  };

  const getHostname = (url: string) => {
    if (url.startsWith("local://")) return "Archivo local";
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url;
    }
  };

  const cfg = STATUS_CONFIG[activeTab];

  return (
    <>
      {readerLink && (
        <ReaderModeModal
          open={!!readerLink}
          onOpenChange={(open) => {
            if (!open) setReaderLink(null);
          }}
          linkId={readerLink.id}
          linkUrl={readerLink.url}
          linkTitle={readerLink.title}
        />
      )}

      <div className="flex flex-col h-full">
        {/* ── Tabs ── */}
        <div className="flex gap-1 p-2 border-b border-border shrink-0">
          {(["inbox", "reading", "done"] as ReadingStatus[]).map((status) => {
            const c = STATUS_CONFIG[status];
            const Icon = c.icon;
            const isActive = activeTab === status;
            return (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-muted text-muted-foreground"
                }`}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{c.label}</span>
                <Badge
                  variant={isActive ? "secondary" : "outline"}
                  className={`text-xs h-4 px-1 min-w-[16px] ml-0.5 ${
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground border-transparent"
                      : ""
                  }`}
                >
                  {stats[status]}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* ── Lista ── */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
          {/* Estado vacío */}
          {tabLinks.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-6 px-4">
              <div className={`mb-3 ${cfg.color}`}>
                {(() => {
                  const Icon = cfg.icon;
                  return (
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto">
                      <Icon className="h-6 w-6 opacity-50" />
                    </div>
                  );
                })()}
              </div>
              <p className="text-sm font-medium text-foreground/80">{cfg.emptyText}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {cfg.emptySubtext}
              </p>
            </div>
          )}

          {/* Items */}
          {tabLinks.map((link) => {
            const isUpdating = updating === link.id;
            const hostname = getHostname(link.url);

            return (
              <div
                key={link.id}
                className={`group flex items-start gap-2 rounded-lg border border-border bg-card/50 px-2.5 py-2 hover:bg-muted/40 transition-colors ${
                  isUpdating ? "opacity-60 pointer-events-none" : ""
                }`}
              >
                {/* Favicon */}
                {link.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={link.faviconUrl}
                    alt=""
                    className="h-4 w-4 mt-0.5 rounded shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                )}

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <button
                    className="text-xs font-semibold truncate text-left w-full hover:text-primary transition-colors leading-snug"
                    onClick={() => openExternalUrl(link.url)}
                  >
                    {link.title}
                  </button>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {hostname}
                  </p>
                  {link.notes && (
                    <p className="text-[10px] text-muted-foreground/70 truncate mt-0.5 italic">
                      {link.notes}
                    </p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Abrir en navegador */}
                  <button
                    onClick={() => openExternalUrl(link.url)}
                    title="Abrir enlace"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </button>

                  {/* Reader mode */}
                  <button
                    onClick={() =>
                      setReaderLink({ id: link.id, url: link.url, title: link.title })
                    }
                    title="Modo lectura"
                    className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Archive className="h-3 w-3" />
                  </button>

                  {/* Marcar leyendo */}
                  {activeTab !== "reading" && (
                    <button
                      onClick={() => updateStatus(link.id, "reading")}
                      disabled={isUpdating}
                      title="Marcar como leyendo"
                      className="p-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-500 transition-colors"
                    >
                      <BookOpen className="h-3 w-3" />
                    </button>
                  )}

                  {/* Marcar completado */}
                  {activeTab !== "done" && (
                    <button
                      onClick={() => updateStatus(link.id, "done")}
                      disabled={isUpdating}
                      title="Marcar como completado"
                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-green-500 transition-colors"
                    >
                      <CheckCheck className="h-3 w-3" />
                    </button>
                  )}

                  {/* Volver a pendientes */}
                  {activeTab === "done" && (
                    <button
                      onClick={() => updateStatus(link.id, "inbox")}
                      disabled={isUpdating}
                      title="Mover a pendientes"
                      className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-500 transition-colors"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="px-3 py-2 border-t border-border shrink-0 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground shrink-0">
            <span className="font-medium text-green-600 dark:text-green-400">
              {stats.done}
            </span>{" "}
            leídos
            {stats.reading > 0 && (
              <>
                {" · "}
                <span className="font-medium text-amber-500">{stats.reading}</span>{" "}
                en curso
              </>
            )}
          </p>

          {/* Acción masiva — aparece solo cuando hay ítems en el tab */}
          {tabLinks.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 text-xs px-2 shrink-0 ${
                activeTab === "done"
                  ? "text-blue-500 hover:text-blue-600"
                  : "text-green-600 hover:text-green-700"
              }`}
              disabled={bulkUpdating}
              onClick={() =>
                handleBulkMark(activeTab === "done" ? "inbox" : "done")
              }
              title={
                activeTab === "done"
                  ? "Mover todos a pendientes"
                  : "Marcar todos como leídos"
              }
            >
              <CheckSquare className="h-3 w-3 mr-1" />
              {bulkUpdating
                ? "…"
                : activeTab === "done"
                ? "Todos a pendientes"
                : "Marcar todos leídos"}
            </Button>
          )}

          {stats.inbox > 0 && activeTab !== "inbox" && tabLinks.length <= 1 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 text-blue-500 hover:text-blue-600 shrink-0"
              onClick={() => setActiveTab("inbox")}
            >
              {stats.inbox} pendientes
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
