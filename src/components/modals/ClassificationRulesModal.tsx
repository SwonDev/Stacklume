"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";

interface ClassificationRule {
  id: string;
  name: string;
  conditionType: "url_pattern" | "title_keyword" | "platform" | "domain";
  conditionValue: string;
  actionType: "set_category" | "add_tag";
  actionValue: string;
  order: number;
  isActive: boolean;
}

interface ClassificationRulesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONDITION_TYPE_LABELS: Record<string, string> = {
  url_pattern: "Patrón de URL (regex)",
  title_keyword: "Palabra en título",
  platform: "Plataforma exacta",
  domain: "Dominio",
};

const ACTION_TYPE_LABELS: Record<string, string> = {
  set_category: "Asignar categoría",
  add_tag: "Añadir etiqueta",
};

interface RuleForm {
  name: string;
  conditionType: "url_pattern" | "title_keyword" | "platform" | "domain";
  conditionValue: string;
  actionType: "set_category" | "add_tag";
  actionValue: string;
}

const EMPTY_FORM: RuleForm = {
  name: "",
  conditionType: "url_pattern",
  conditionValue: "",
  actionType: "add_tag",
  actionValue: "",
};

export function ClassificationRulesModal({ open, onOpenChange }: ClassificationRulesModalProps) {
  const [rules, setRules] = useState<ClassificationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const categories = useLinksStore((s) => s.categories);
  const tags = useLinksStore((s) => s.tags);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/classification-rules");
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch {
      toast.error("No se pudieron cargar las reglas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchRules();
      setForm(EMPTY_FORM);
    }
  }, [open, fetchRules]);

  const handleCreate = async () => {
    if (!form.name.trim() || !form.conditionValue.trim() || !form.actionValue) {
      toast.error("Completa todos los campos antes de guardar");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/classification-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, order: rules.length }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al crear regla");
      }

      toast.success("Regla creada");
      setForm(EMPTY_FORM);
      await fetchRules();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al crear regla");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule: ClassificationRule) => {
    try {
      const res = await fetch(`/api/classification-rules/${rule.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      if (!res.ok) throw new Error();
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r))
      );
    } catch {
      toast.error("No se pudo actualizar la regla");
    }
  };

  const handleDelete = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/classification-rules/${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Regla eliminada");
    } catch {
      toast.error("No se pudo eliminar la regla");
    }
  };

  const getActionLabel = (rule: ClassificationRule) => {
    if (rule.actionType === "set_category") {
      const cat = categories.find((c) => c.id === rule.actionValue);
      return cat ? `→ Categoría: ${cat.name}` : `→ Categoría: ${rule.actionValue.slice(0, 8)}…`;
    }
    const tag = tags.find((t) => t.id === rule.actionValue);
    return tag ? `→ Etiqueta: ${tag.name}` : `→ Etiqueta: ${rule.actionValue.slice(0, 8)}…`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>Reglas de autoclasificación</DialogTitle>
          <DialogDescription>
            Define condiciones para asignar categorías o etiquetas automáticamente al añadir
            nuevos enlaces.
          </DialogDescription>
        </DialogHeader>

        {/* Lista de reglas existentes */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-4">Cargando reglas…</p>
          )}
          {!loading && rules.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay reglas configuradas. Crea la primera abajo.
            </p>
          )}
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium truncate">{rule.name}</span>
                  {!rule.isActive && (
                    <Badge variant="outline" className="text-xs">Inactiva</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {CONDITION_TYPE_LABELS[rule.conditionType]}: <code className="bg-muted px-1 rounded">{rule.conditionValue}</code>{" "}
                  {getActionLabel(rule)}
                </p>
              </div>
              <button
                onClick={() => handleToggle(rule)}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title={rule.isActive ? "Desactivar" : "Activar"}
              >
                {rule.isActive ? (
                  <ToggleRight className="h-5 w-5 text-primary" />
                ) : (
                  <ToggleLeft className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={() => handleDelete(rule.id)}
                className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                title="Eliminar regla"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Formulario nueva regla */}
        <div className="border-t border-border px-6 py-4 space-y-4 bg-muted/30">
          <p className="text-sm font-medium">Nueva regla</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label htmlFor="rule-name" className="text-xs mb-1 block">Nombre de la regla</Label>
              <Input
                id="rule-name"
                placeholder="Ej: YouTube → etiqueta vídeos"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Tipo de condición</Label>
              <Select
                value={form.conditionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, conditionType: v as RuleForm["conditionType"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition-value" className="text-xs mb-1 block">
                {form.conditionType === "url_pattern" ? "Patrón (regex)" : "Valor"}
              </Label>
              <Input
                id="condition-value"
                placeholder={
                  form.conditionType === "url_pattern"
                    ? "youtube\\.com"
                    : form.conditionType === "domain"
                    ? "github.com"
                    : form.conditionType === "platform"
                    ? "youtube"
                    : "tutorial"
                }
                value={form.conditionValue}
                onChange={(e) => setForm((f) => ({ ...f, conditionValue: e.target.value }))}
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Acción</Label>
              <Select
                value={form.actionType}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, actionType: v as RuleForm["actionType"], actionValue: "" }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACTION_TYPE_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">
                {form.actionType === "set_category" ? "Categoría" : "Etiqueta"}
              </Label>
              <Select
                value={form.actionValue}
                onValueChange={(v) => setForm((f) => ({ ...f, actionValue: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar…" />
                </SelectTrigger>
                <SelectContent>
                  {form.actionType === "set_category"
                    ? categories
                        .filter((c) => !c.deletedAt)
                        .map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))
                    : tags
                        .filter((t) => !t.deletedAt)
                        .map((t) => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleCreate}
            disabled={saving}
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {saving ? "Guardando…" : "Añadir regla"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
