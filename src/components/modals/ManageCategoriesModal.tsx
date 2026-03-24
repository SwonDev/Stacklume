"use client";

import { useState } from "react";
import {
  FolderOpen,
  Pencil,
  Trash2,
  Check,
  X,
  Plus,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";
import { Pipette } from "lucide-react";

const colorOptions = [
  { value: "red",     hex: "#ef4444" },
  { value: "orange",  hex: "#f97316" },
  { value: "amber",   hex: "#f59e0b" },
  { value: "yellow",  hex: "#eab308" },
  { value: "gold",    hex: "#d4a853" },
  { value: "lime",    hex: "#84cc16" },
  { value: "green",   hex: "#22c55e" },
  { value: "emerald", hex: "#10b981" },
  { value: "teal",    hex: "#14b8a6" },
  { value: "cyan",    hex: "#06b6d4" },
  { value: "sky",     hex: "#0ea5e9" },
  { value: "blue",    hex: "#3b82f6" },
  { value: "indigo",  hex: "#6366f1" },
  { value: "violet",  hex: "#8b5cf6" },
  { value: "purple",  hex: "#a855f7" },
  { value: "fuchsia", hex: "#d946ef" },
  { value: "pink",    hex: "#ec4899" },
  { value: "rose",    hex: "#f43f5e" },
  { value: "slate",   hex: "#64748b" },
  { value: "gray",    hex: "#6b7280" },
  { value: "zinc",    hex: "#71717a" },
  { value: "stone",   hex: "#78716c" },
];

// Resuelve el color almacenado (hex o nombre) a un hex válido para el preview
function resolveHex(color: string | null | undefined): string {
  if (!color) return "#6b7280";
  if (color.startsWith("#")) return color;
  return colorOptions.find((c) => c.value === color)?.hex ?? "#6b7280";
}

export function ManageCategoriesModal() {
  const {
    categories,
    links,
    isManageCategoriesModalOpen,
    setManageCategoriesModalOpen,
    updateCategory,
    removeCategory,
    setAddCategoryModalOpen,
  } = useLinksStore();

  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#6366f1");
  const [editingCustomHex, setEditingCustomHex] = useState("#6366f1");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCategoryLinkCount = (categoryId: string) => {
    return links.filter((l) => l.categoryId === categoryId).length;
  };

  const handleStartEdit = (id: string, name: string, color: string | null | undefined) => {
    setEditingId(id);
    setEditingName(name);
    const hex = resolveHex(color);
    setEditingColor(hex);
    setEditingCustomHex(hex);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("#6366f1");
    setEditingCustomHex("#6366f1");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      const response = await fetch(`/api/categories`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          id: editingId,
          name: editingName.trim(),
          color: editingColor,
        }),
      });

      if (response.ok) {
        updateCategory(editingId, { name: editingName.trim(), color: editingColor });
        toast.success(t("manageCategories.successUpdate"));
        handleCancelEdit();
        // Propagar nombre/color actualizado a todos los componentes reactivos
        useLinksStore.getState().refreshAllData();
      } else {
        toast.error(t("manageCategories.errorUpdate"));
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error(t("manageCategories.errorUpdate"));
    }
  };

  const handleDelete = async (deleteLinks: boolean) => {
    if (!deleteId) return;

    const linkCount = getCategoryLinkCount(deleteId);
    const deleteLinksParam = deleteLinks ? "&deleteLinks=true" : "";

    try {
      const response = await fetch(`/api/categories?id=${deleteId}${deleteLinksParam}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        removeCategory(deleteId);
        if (deleteLinks && linkCount > 0) {
          toast.success(t("manageCategories.successDeleteWithLinksDeleted", { count: linkCount }));
        } else if (linkCount > 0) {
          toast.success(t("manageCategories.successDeleteWithLinks", { count: linkCount }));
        } else {
          toast.success(t("manageCategories.successDelete"));
        }
        setDeleteId(null);
        // refreshAllData() actualiza los links en el store
        useLinksStore.getState().refreshAllData();
      } else {
        toast.error(t("manageCategories.errorDelete"));
      }
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error(t("manageCategories.errorDelete"));
    }
  };

  return (
    <>
      <Dialog
        open={isManageCategoriesModalOpen}
        onOpenChange={setManageCategoriesModalOpen}
      >
        <DialogContent className="sm:max-w-lg glass max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              {t("manageCategories.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
            {/* Add button */}
            <Button
              variant="outline"
              className="w-full gap-2 shrink-0"
              onClick={() => {
                setManageCategoriesModalOpen(false);
                setAddCategoryModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("manageCategories.newCategory")}
            </Button>

            {/* Categories list */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-4">
              {categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <FolderOpen className="w-12 h-12 mb-2 opacity-50" />
                  <p>{t("manageCategories.noCategories")}</p>
                  <p className="text-sm">{t("manageCategories.createFirst")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => {
                    const linkCount = getCategoryLinkCount(category.id);
                    const isEditing = editingId === category.id;

                    return (
                      <div
                        key={category.id}
                        className={cn(
                          "rounded-lg border transition-colors",
                          isEditing
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary/50"
                        )}
                      >
                        {isEditing ? (
                          /* ── Expanded edit panel ── */
                          <div className="p-3 space-y-3">
                            {/* Name + color preview */}
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: editingColor }}
                              />
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="h-8 flex-1"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                              />
                            </div>

                            {/* Color picker */}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">
                                {t("addCategory.color")}
                              </p>
                              <div className="grid grid-cols-11 gap-1">
                                {colorOptions.map((c) => (
                                  <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setEditingColor(c.hex)}
                                    className={cn(
                                      "w-6 h-6 rounded-full transition-all hover:scale-110",
                                      editingColor === c.hex
                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                                        : "hover:ring-1 hover:ring-muted-foreground/30"
                                    )}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.value}
                                  />
                                ))}
                                {/* Color personalizado */}
                                <label
                                  className={cn(
                                    "w-6 h-6 rounded-full cursor-pointer flex items-center justify-center relative transition-all hover:scale-110",
                                    !colorOptions.some((c) => c.hex === editingColor)
                                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                                      : "border-2 border-dashed border-muted-foreground/40 hover:border-muted-foreground/70"
                                  )}
                                  style={!colorOptions.some((c) => c.hex === editingColor) ? { backgroundColor: editingColor } : undefined}
                                  title="Color personalizado"
                                >
                                  <input
                                    type="color"
                                    value={editingCustomHex}
                                    onChange={(e) => {
                                      setEditingCustomHex(e.target.value);
                                      setEditingColor(e.target.value);
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                  />
                                  {colorOptions.some((c) => c.hex === editingColor) && (
                                    <Pipette className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </label>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-3"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                {t("btn.cancel")}
                              </Button>
                              <Button
                                size="sm"
                                className="h-8 px-3"
                                onClick={handleSaveEdit}
                                disabled={!editingName.trim()}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {t("btn.save")}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          /* ── Normal row ── */
                          <div className="flex items-center gap-2 p-3">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: resolveHex(category.color) }}
                            />
                            <span className="flex-1 truncate">{category.name}</span>
                            <Badge variant="secondary" className="flex-shrink-0">
                              {linkCount}{" "}
                              {linkCount === 1
                                ? t("manageCategories.linkSingular")
                                : t("manageCategories.linkPlural")}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  handleStartEdit(category.id, category.name, category.color)
                                }
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(category.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — 3 options when category has links */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("manageCategories.deleteTitle")}
            </DialogTitle>
          </DialogHeader>
          {deleteId && getCategoryLinkCount(deleteId) > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("manageCategories.deleteAskAboutLinks", {
                  count: getCategoryLinkCount(deleteId),
                })}
              </p>
              <div className="flex flex-col gap-2">
                <Button
                  variant="destructive"
                  className="w-full justify-start gap-2"
                  onClick={() => handleDelete(true)}
                >
                  <Trash2 className="w-4 h-4" />
                  {t("manageCategories.deleteWithLinksOption")}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                  onClick={() => handleDelete(false)}
                >
                  <FolderOpen className="w-4 h-4" />
                  {t("manageCategories.moveToUncategorizedOption")}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => setDeleteId(null)}
                >
                  <X className="w-4 h-4" />
                  {t("btn.cancel")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                {t("manageCategories.deleteConfirm")}
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setDeleteId(null)}>
                  {t("btn.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(false)}
                >
                  {t("btn.delete")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
