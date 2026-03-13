"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Play, Plus, Trash2, Layers, Link2, Pencil, Check, X, Settings2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useLinksStore } from "@/stores/links-store";
import { openExternalUrl } from "@/lib/desktop";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { dispatchDataChanged, onDataChanged } from "@/lib/data-events";
import { showConfirm } from "@/components/ui/ConfirmDialog";

interface LinkSession {
  id: string;
  name: string;
  description?: string;
  linkIds: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export function SessionLauncherWidget() {
  const [sessions, setSessions] = useState<LinkSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [launching, setLaunching] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDesc, setEditingDesc] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // ── Estado del diálogo "Gestionar links" ────────────────────────────────────
  const [managingSession, setManagingSession] = useState<LinkSession | null>(null);
  const [selectedLinkIds, setSelectedLinkIds] = useState<Set<string>>(new Set());
  const [linkSearch, setLinkSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const links = useLinksStore((s) => s.links);
  const activeLinks = useMemo(() => links.filter((l) => !l.deletedAt), [links]);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      // Cache-busting: WebView2 puede cachear respuestas aunque no cambien
      const res = await fetch(`/api/link-sessions?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) setSessions(await res.json());
    } catch {
      // silencioso
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Escuchar cambios de sesiones desde otras instancias del widget o desde otros contextos
    return onDataChanged("sessions", fetchSessions);
  }, [fetchSessions]);

  // ── Lanzar sesión ──────────────────────────────────────────────────────────
  const handleLaunch = async (session: LinkSession) => {
    const activeIds = session.linkIds.filter((id) => {
      const l = links.find((ll) => ll.id === id);
      return l && !l.deletedAt;
    });

    if (activeIds.length === 0) {
      toast.error("Esta sesión no tiene enlaces activos");
      return;
    }

    setLaunching(session.id);
    try {
      const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
      for (let i = 0; i < activeIds.length; i++) {
        const link = links.find((l) => l.id === activeIds[i]);
        if (link) {
          await openExternalUrl(link.url);
          if (i < activeIds.length - 1) await delay(300);
        }
      }
      toast.success(`Sesión "${session.name}" lanzada — ${activeIds.length} enlace${activeIds.length !== 1 ? "s" : ""} abierto${activeIds.length !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Error al lanzar la sesión");
    } finally {
      setLaunching(null);
    }
  };

  // ── Crear sesión ───────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newName.trim()) {
      toast.error("Introduce un nombre para la sesión");
      return;
    }

    setCreating(true);
    try {
      // Por defecto, añadir los 5 links más recientes como ejemplo
      const recentIds = activeLinks.slice(0, 5).map((l) => l.id);

      const res = await fetch("/api/link-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: newName.trim(), linkIds: recentIds }),
      });

      if (!res.ok) throw new Error();
      toast.success("Sesión creada");
      setNewName("");
      await fetchSessions();
      dispatchDataChanged("sessions");
    } catch {
      toast.error("Error al crear la sesión");
    } finally {
      setCreating(false);
    }
  };

  // ── Edición inline del nombre ──────────────────────────────────────────────
  const handleStartEdit = (session: LinkSession) => {
    setEditingId(session.id);
    setEditingName(session.name);
    setEditingDesc(session.description ?? "");
    setTimeout(() => editInputRef.current?.focus(), 30);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingDesc(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) {
      handleCancelEdit();
      return;
    }

    const trimmed = editingName.trim();
    const desc = editingDesc?.trim() || undefined;
    // Actualizar optimista
    setSessions((prev) =>
      prev.map((s) => (s.id === editingId ? { ...s, name: trimmed, description: desc } : s))
    );
    handleCancelEdit();

    try {
      const res = await fetch(`/api/link-sessions/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ name: trimmed, description: desc }),
      });
      if (!res.ok) throw new Error();
      dispatchDataChanged("sessions");
    } catch {
      toast.error("Error al renombrar la sesión");
      await fetchSessions(); // revertir
    }
  };

  // ── Eliminar con confirmación ──────────────────────────────────────────────
  const handleDelete = async (sessionId: string, sessionName: string) => {
    const ok = await showConfirm({
      title: "Eliminar sesión",
      description: `¿Eliminar la sesión "${sessionName}"? Esta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      variant: "destructive",
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/link-sessions/${sessionId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
      });
      if (!res.ok) throw new Error();
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      dispatchDataChanged("sessions");
    } catch {
      toast.error("Error al eliminar la sesión");
    }
  };

  // ── Gestionar links de la sesión ───────────────────────────────────────────
  const handleOpenManage = (session: LinkSession) => {
    setManagingSession(session);
    setSelectedLinkIds(new Set(session.linkIds));
    setLinkSearch("");
  };

  const handleCloseManage = () => {
    setManagingSession(null);
    setSelectedLinkIds(new Set());
    setLinkSearch("");
  };

  const handleToggleLink = (linkId: string) => {
    setSelectedLinkIds((prev) => {
      const next = new Set(prev);
      if (next.has(linkId)) {
        next.delete(linkId);
      } else {
        next.add(linkId);
      }
      return next;
    });
  };

  const handleSaveLinks = async () => {
    if (!managingSession) return;
    setSaving(true);
    const linkIds = Array.from(selectedLinkIds);
    // Actualizar optimista
    setSessions((prev) =>
      prev.map((s) => (s.id === managingSession.id ? { ...s, linkIds } : s))
    );
    handleCloseManage();

    try {
      const res = await fetch(`/api/link-sessions/${managingSession.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ linkIds }),
      });
      if (!res.ok) throw new Error();
      dispatchDataChanged("sessions");
      toast.success("Links de la sesión actualizados");
    } catch {
      toast.error("Error al guardar los links");
      await fetchSessions(); // revertir
    } finally {
      setSaving(false);
    }
  };

  const filteredManageLinks = useMemo(() => {
    if (!linkSearch.trim()) return activeLinks;
    const q = linkSearch.toLowerCase();
    return activeLinks.filter(
      (l) =>
        l.title.toLowerCase().includes(q) ||
        l.url.toLowerCase().includes(q)
    );
  }, [activeLinks, linkSearch]);

  return (
    <>
    {/* ── Diálogo gestionar links ──────────────────────────────────────────── */}
    <Dialog open={!!managingSession} onOpenChange={(open) => { if (!open) handleCloseManage(); }}>
      <DialogContent className="sm:max-w-md flex flex-col max-h-[80vh] p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm min-w-0 truncate">
              Gestionar links — <span className="text-muted-foreground font-normal">{managingSession?.name}</span>
            </DialogTitle>
            <div className="flex gap-1 shrink-0">
              <button
                onClick={() => setSelectedLinkIds(new Set(activeLinks.map((l) => l.id)))}
                className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Seleccionar todos"
              >
                Todos
              </button>
              <button
                onClick={() => setSelectedLinkIds(new Set())}
                className="text-[10px] px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Deseleccionar todos"
              >
                Ninguno
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Búsqueda */}
        <div className="px-3 py-2 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar links…"
              value={linkSearch}
              onChange={(e) => setLinkSearch(e.target.value)}
              className="h-8 pl-8 text-xs"
              autoFocus
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {selectedLinkIds.size} enlace{selectedLinkIds.size !== 1 ? "s" : ""} seleccionado{selectedLinkIds.size !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Lista de links */}
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5 min-h-0">
          {filteredManageLinks.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {linkSearch ? "Sin resultados" : "No hay links guardados"}
            </p>
          )}
          {filteredManageLinks.map((link) => {
            const checked = selectedLinkIds.has(link.id);
            let hostname = link.url;
            try { hostname = new URL(link.url).hostname.replace("www.", ""); } catch { /* noop */ }
            return (
              <div
                key={link.id}
                className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 cursor-pointer transition-colors ${
                  checked ? "bg-primary/8" : "hover:bg-muted/50"
                }`}
                onClick={() => handleToggleLink(link.id)}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => handleToggleLink(link.id)}
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                {link.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={link.faviconUrl} alt="" className="h-4 w-4 rounded shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded bg-muted shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{link.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{hostname}</p>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="px-4 py-3 border-t border-border shrink-0 flex-row gap-2">
          <Button variant="ghost" size="sm" onClick={handleCloseManage} className="flex-1">
            Cancelar
          </Button>
          <Button size="sm" onClick={handleSaveLinks} disabled={saving} className="flex-1">
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border shrink-0">
        <Layers className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium flex-1">Sesiones de links</span>
        <Badge variant="secondary" className="text-xs">{sessions.length}</Badge>
      </div>

      {/* Lista de sesiones */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && (
          <p className="text-xs text-muted-foreground text-center py-4">Cargando…</p>
        )}
        {!loading && sessions.length === 0 && (
          <div className="text-center py-6">
            <Layers className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sin sesiones guardadas</p>
            <p className="text-xs text-muted-foreground mt-1">
              Crea grupos de links para abrirlos todos a la vez
            </p>
          </div>
        )}
        {sessions.map((session) => {
          const activeCount = links.filter(
            (l) => session.linkIds.includes(l.id) && !l.deletedAt
          ).length;
          const isEditing = editingId === session.id;

          return (
            <div
              key={session.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-card/50 px-2.5 py-2 group"
            >
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Input
                        ref={editInputRef}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSaveEdit();
                          if (e.key === "Escape") handleCancelEdit();
                        }}
                        className="h-6 text-xs px-1.5 flex-1"
                        placeholder="Nombre de la sesión"
                      />
                      <button
                        onMouseDown={(e) => { e.preventDefault(); handleSaveEdit(); }}
                        className="p-0.5 text-green-500 hover:text-green-600"
                        title="Guardar"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); handleCancelEdit(); }}
                        className="p-0.5 text-muted-foreground hover:text-foreground"
                        title="Cancelar"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={editingDesc ?? ""}
                      onChange={(e) => setEditingDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="h-6 text-[10px] px-1.5"
                      placeholder="Descripción (opcional)"
                    />
                  </div>
                ) : (
                  <>
                    <p
                      className="text-sm font-medium truncate cursor-pointer hover:text-primary transition-colors"
                      onClick={() => handleStartEdit(session)}
                      title="Haz clic para renombrar"
                    >
                      {session.name}
                    </p>
                    {session.description && (
                      <p className="text-[10px] text-muted-foreground/70 truncate italic mt-0.5">
                        {session.description}
                      </p>
                    )}
                  </>
                )}
                {/* Favicons de los primeros links de la sesión */}
                <div className="flex items-center gap-1 mt-1">
                  <div className="flex -space-x-1">
                    {session.linkIds
                      .slice(0, 5)
                      .map((lid) => {
                        const l = links.find((ll) => ll.id === lid && !ll.deletedAt);
                        if (!l) return null;
                        return l.faviconUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={lid}
                            src={l.faviconUrl}
                            alt=""
                            className="h-3.5 w-3.5 rounded-sm border border-background"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                        ) : (
                          <div key={lid} className="h-3.5 w-3.5 rounded-sm bg-muted border border-background flex items-center justify-center">
                            <Link2 className="h-2 w-2 text-muted-foreground/50" />
                          </div>
                        );
                      })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {activeCount} enlace{activeCount !== 1 ? "s" : ""}
                    {session.linkIds.length > activeCount && (
                      <span className="text-muted-foreground/50 ml-1">
                        ({session.linkIds.length - activeCount} eliminados)
                      </span>
                    )}
                  </span>
                </div>
              </div>
              {!isEditing && (
                <div className="flex gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 gap-1 text-xs"
                    onClick={() => handleLaunch(session)}
                    disabled={launching === session.id}
                  >
                    <Play className="h-3 w-3" />
                    {launching === session.id ? "Abriendo…" : "Lanzar"}
                  </Button>
                  <button
                    onClick={() => handleOpenManage(session)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:text-primary text-muted-foreground transition-all"
                    title="Gestionar links de la sesión"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleStartEdit(session)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:text-primary text-muted-foreground transition-all"
                    title="Renombrar sesión"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(session.id, session.name)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:text-destructive text-muted-foreground transition-all"
                    title="Eliminar sesión"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Crear nueva sesión */}
      <div className="px-2 py-2.5 border-t border-border shrink-0">
        <div className="flex gap-1.5">
          <Input
            placeholder="Nombre de la sesión…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            className="h-8 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 shrink-0"
            onClick={handleCreate}
            disabled={creating}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
    </>
  );
}
