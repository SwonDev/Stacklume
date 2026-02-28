"use client";

import { useState, useMemo, useCallback } from "react";
import {
  KeyRound,
  Plus,
  Eye,
  EyeOff,
  Copy,
  ExternalLink,
  Star,
  Pencil,
  Trash2,
  Search,
  Shuffle,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { openExternalUrl, isTauriWebView } from "@/lib/desktop";
import type { PasswordEntry, PasswordManagerConfig } from "@/types/widgets/configs";

// ── Utilidades de codificación ────────────────────────────────────────────────

function encodePassword(plain: string): string {
  try {
    return btoa(unescape(encodeURIComponent(plain)));
  } catch {
    return btoa(plain);
  }
}

function decodePassword(encoded: string): string {
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    try {
      return atob(encoded);
    } catch {
      return encoded;
    }
  }
}

function generatePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

function getFaviconUrl(url?: string): string | null {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return null;
  }
}

// ── Tipos y constantes ────────────────────────────────────────────────────────

type Category = PasswordEntry["category"];

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "work", label: "Trabajo" },
  { value: "finance", label: "Finanzas" },
  { value: "gaming", label: "Gaming" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Otro" },
];

const CATEGORY_COLORS: Record<NonNullable<Category>, string> = {
  email: "bg-blue-500/20 text-blue-400",
  social: "bg-purple-500/20 text-purple-400",
  work: "bg-orange-500/20 text-orange-400",
  finance: "bg-green-500/20 text-green-400",
  gaming: "bg-pink-500/20 text-pink-400",
  personal: "bg-cyan-500/20 text-cyan-400",
  other: "bg-zinc-500/20 text-zinc-400",
};

const FILTER_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "email", label: "Email" },
  { value: "social", label: "Social" },
  { value: "work", label: "Trabajo" },
  { value: "finance", label: "Finanzas" },
  { value: "gaming", label: "Gaming" },
  { value: "personal", label: "Personal" },
  { value: "favorites", label: "Favoritos" },
];

// ── Formulario de entrada ─────────────────────────────────────────────────────

interface EntryFormState {
  service: string;
  url: string;
  username: string;
  password: string;
  notes: string;
  category: Category;
  isFavorite: boolean;
}

const EMPTY_FORM: EntryFormState = {
  service: "",
  url: "",
  username: "",
  password: "",
  notes: "",
  category: "personal",
  isFavorite: false,
};

function EntryDialog({
  open,
  onClose,
  onSave,
  initial,
  title,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: EntryFormState) => void;
  initial?: EntryFormState;
  title: string;
}) {
  const [form, setForm] = useState<EntryFormState>(initial ?? EMPTY_FORM);
  const [showPwd, setShowPwd] = useState(false);

  const set = (key: keyof EntryFormState, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }));

  const valid = form.service.trim() && form.username.trim() && form.password.trim();

  const handleSave = () => {
    if (!valid) {
      toast.error("Servicio, usuario y contraseña son obligatorios");
      return;
    }
    onSave(form);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          {/* Servicio */}
          <div className="grid gap-1.5">
            <Label htmlFor="pm-service">Servicio *</Label>
            <Input
              id="pm-service"
              placeholder="Gmail, GitHub, Netflix..."
              value={form.service}
              onChange={(e) => set("service", e.target.value)}
            />
          </div>

          {/* URL */}
          <div className="grid gap-1.5">
            <Label htmlFor="pm-url">URL del sitio</Label>
            <Input
              id="pm-url"
              placeholder="https://..."
              value={form.url}
              onChange={(e) => set("url", e.target.value)}
            />
          </div>

          {/* Usuario */}
          <div className="grid gap-1.5">
            <Label htmlFor="pm-user">Usuario / Email *</Label>
            <Input
              id="pm-user"
              placeholder="usuario@ejemplo.com"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
            />
          </div>

          {/* Contraseña */}
          <div className="grid gap-1.5">
            <Label htmlFor="pm-pwd">Contraseña *</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="pm-pwd"
                  type={showPwd ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                title="Generar contraseña aleatoria"
                onClick={() => {
                  set("password", generatePassword());
                  setShowPwd(true);
                }}
              >
                <Shuffle className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Categoría + Favorito */}
          <div className="flex gap-3">
            <div className="flex-1 grid gap-1.5">
              <Label>Categoría</Label>
              <Select
                value={form.category ?? "personal"}
                onValueChange={(v) => set("category", v as Category)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value!}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Favorito</Label>
              <Button
                type="button"
                variant={form.isFavorite ? "default" : "outline"}
                size="icon"
                className="h-9 w-9"
                onClick={() => set("isFavorite", !form.isFavorite)}
              >
                <Star
                  className={`w-4 h-4 ${form.isFavorite ? "fill-current" : ""}`}
                />
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div className="grid gap-1.5">
            <Label htmlFor="pm-notes">Notas</Label>
            <Textarea
              id="pm-notes"
              placeholder="Notas adicionales..."
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!valid}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface PasswordManagerWidgetProps {
  widget: Widget;
}

export function PasswordManagerWidget({ widget }: PasswordManagerWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const config = (widget.config as PasswordManagerConfig | undefined) ?? {};
  const entries: PasswordEntry[] = config.entries ?? [];

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Dialog estados
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PasswordEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PasswordEntry | null>(null);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const saveEntries = useCallback(
    (next: PasswordEntry[]) => {
      updateWidget(widget.id, {
        config: { ...widget.config, entries: next },
      });
    },
    [widget.id, widget.config, updateWidget]
  );

  const handleAdd = (form: EntryFormState) => {
    const now = new Date().toISOString();
    const entry: PasswordEntry = {
      id: crypto.randomUUID(),
      service: form.service.trim(),
      url: form.url.trim() || undefined,
      username: form.username.trim(),
      password: encodePassword(form.password),
      notes: form.notes.trim() || undefined,
      category: form.category,
      isFavorite: form.isFavorite,
      createdAt: now,
      updatedAt: now,
    };
    saveEntries([...entries, entry]);
    toast.success(`"${entry.service}" añadido`);
  };

  const handleEdit = (form: EntryFormState) => {
    if (!editTarget) return;
    const updated = entries.map((e) =>
      e.id === editTarget.id
        ? {
            ...e,
            service: form.service.trim(),
            url: form.url.trim() || undefined,
            username: form.username.trim(),
            password: encodePassword(form.password),
            notes: form.notes.trim() || undefined,
            category: form.category,
            isFavorite: form.isFavorite,
            updatedAt: new Date().toISOString(),
          }
        : e
    );
    saveEntries(updated);
    toast.success("Entrada actualizada");
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveEntries(entries.filter((e) => e.id !== deleteTarget.id));
    toast.success(`"${deleteTarget.service}" eliminado`);
    setDeleteTarget(null);
  };

  const toggleFavorite = (id: string) => {
    saveEntries(entries.map((e) => (e.id === id ? { ...e, isFavorite: !e.isFavorite } : e)));
  };

  // ── Visibilidad y portapapeles ────────────────────────────────────────────

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copyToClipboard = async (text: string, fieldKey: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      toast.success(`${label} copiado`);
      setTimeout(() => setCopiedField(null), 1500);
    } catch {
      toast.error("Error al copiar al portapapeles");
    }
  };

  const openUrl = (url: string) => {
    if (isTauriWebView()) {
      void openExternalUrl(url);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // ── Filtrado ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = entries;

    if (activeFilter === "favorites") {
      list = list.filter((e) => e.isFavorite);
    } else if (activeFilter !== "all") {
      list = list.filter((e) => e.category === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.service.toLowerCase().includes(q) ||
          e.username.toLowerCase().includes(q) ||
          (e.url ?? "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [entries, activeFilter, search]);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="@container flex flex-col h-full gap-2 p-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">
            {entries.length} {entries.length === 1 ? "entrada" : "entradas"}
          </span>
        </div>
        <Button size="sm" className="h-7 text-xs gap-1 shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" />
          Añadir
        </Button>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Buscar servicio o usuario..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-7 text-xs pl-8 pr-7"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtros de categoría */}
      <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
        {FILTER_TABS.filter((t) => {
          if (t.value === "favorites") return entries.some((e) => e.isFavorite);
          if (t.value === "all") return true;
          return entries.some((e) => e.category === t.value);
        }).map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors ${
              activeFilter === tab.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      <ScrollArea className="flex-1 -mx-2 px-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center gap-2">
            {entries.length === 0 ? (
              <>
                <KeyRound className="w-8 h-8 text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">
                  Ningún login guardado aún.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Añadir el primero
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Sin resultados</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {filtered.map((entry) => {
              const favicon = getFaviconUrl(entry.url);
              const isVisible = visiblePasswords.has(entry.id);
              const decodedPwd = decodePassword(entry.password);

              return (
                <div
                  key={entry.id}
                  className="group flex flex-col gap-1.5 p-2 rounded-md bg-muted/40 hover:bg-muted/70 transition-colors border border-transparent hover:border-border/40"
                >
                  {/* Fila superior: icono + nombre + acciones */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Favicon */}
                    <div className="w-6 h-6 rounded shrink-0 flex items-center justify-center bg-muted overflow-hidden">
                      {favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={favicon}
                          alt=""
                          width={16}
                          height={16}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <KeyRound className="w-3 h-3 text-muted-foreground" />
                      )}
                    </div>

                    {/* Servicio y URL */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium truncate">{entry.service}</span>
                        {entry.category && (
                          <span
                            className={`text-[9px] px-1.5 py-0 rounded-full shrink-0 font-medium ${CATEGORY_COLORS[entry.category]}`}
                          >
                            {CATEGORIES.find((c) => c.value === entry.category)?.label}
                          </span>
                        )}
                      </div>
                      {entry.url && (
                        <button
                          onClick={() => openUrl(entry.url!)}
                          className="text-[10px] text-muted-foreground hover:text-primary truncate max-w-full flex items-center gap-0.5 group/link"
                        >
                          <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          <span className="truncate">{entry.url}</span>
                        </button>
                      )}
                    </div>

                    {/* Acciones rápidas */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => toggleFavorite(entry.id)}
                        className={`p-1 rounded hover:bg-background/60 ${entry.isFavorite ? "text-yellow-400" : "text-muted-foreground"}`}
                        title={entry.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
                      >
                        <Star className={`w-3 h-3 ${entry.isFavorite ? "fill-current" : ""}`} />
                      </button>
                      <button
                        onClick={() => {
                          setEditTarget(entry);
                        }}
                        className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
                        title="Editar"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(entry)}
                        className="p-1 rounded hover:bg-background/60 text-muted-foreground hover:text-red-400"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Fila de credenciales */}
                  <div className="flex flex-col gap-1 pl-8">
                    {/* Usuario */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground shrink-0 w-16">Usuario</span>
                      <span className="text-[11px] font-mono truncate flex-1">{entry.username}</span>
                      <button
                        onClick={() => copyToClipboard(entry.username, `user-${entry.id}`, "Usuario")}
                        className="p-0.5 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground shrink-0"
                        title="Copiar usuario"
                      >
                        {copiedField === `user-${entry.id}` ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Contraseña */}
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground shrink-0 w-16">Contraseña</span>
                      <span className="text-[11px] font-mono truncate flex-1">
                        {isVisible ? decodedPwd : "••••••••"}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => togglePasswordVisibility(entry.id)}
                          className="p-0.5 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
                          title={isVisible ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {isVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(decodedPwd, `pwd-${entry.id}`, "Contraseña")}
                          className="p-0.5 rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
                          title="Copiar contraseña"
                        >
                          {copiedField === `pwd-${entry.id}` ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Notas */}
                    {entry.notes && (
                      <p className="text-[10px] text-muted-foreground italic truncate">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Diálogo: Añadir */}
      <EntryDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        title="Añadir login"
      />

      {/* Diálogo: Editar */}
      {editTarget && (
        <EntryDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEdit}
          title={`Editar: ${editTarget.service}`}
          initial={{
            service: editTarget.service,
            url: editTarget.url ?? "",
            username: editTarget.username,
            password: decodePassword(editTarget.password),
            notes: editTarget.notes ?? "",
            category: editTarget.category ?? "personal",
            isFavorite: editTarget.isFavorite ?? false,
          }}
        />
      )}

      {/* Diálogo: Confirmar eliminar */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará el login de <strong>{deleteTarget?.service}</strong>. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
