"use client";

import { useState } from "react";
import {
  Tag,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { TagBadge, type TagColor } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

// Hex values for rendering color swatches — TagColor names used in DB
const tagColorOptions: Array<{ value: TagColor; hex: string }> = [
  { value: "red",     hex: "#ef4444" },
  { value: "orange",  hex: "#f97316" },
  { value: "amber",   hex: "#f59e0b" },
  { value: "yellow",  hex: "#eab308" },
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
  { value: "neutral", hex: "#737373" },
  { value: "stone",   hex: "#78716c" },
];

export function ManageTagsModal() {
  const {
    tags,
    linkTags,
    isManageTagsModalOpen,
    setManageTagsModalOpen,
    updateTag,
    removeTag,
    setAddTagModalOpen,
    setLinkTags,
  } = useLinksStore();

  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState<TagColor>("blue");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getTagLinkCount = (tagId: string) => {
    return linkTags.filter((lt) => lt.tagId === tagId).length;
  };

  const handleStartEdit = (id: string, name: string, color: string | null | undefined) => {
    setEditingId(id);
    setEditingName(name);
    const validColor = tagColorOptions.find((c) => c.value === color);
    setEditingColor(validColor ? (color as TagColor) : "blue");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingColor("blue");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    try {
      const response = await fetch(`/api/tags`, {
        method: "PUT",
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
        updateTag(editingId, { name: editingName.trim(), color: editingColor });
        toast.success(t("manageTags.successUpdate"));
        handleCancelEdit();
      } else {
        toast.error(t("manageTags.errorUpdate"));
      }
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error(t("manageTags.errorUpdate"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/tags?id=${deleteId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        removeTag(deleteId);
        setLinkTags(linkTags.filter((lt) => lt.tagId !== deleteId));
        toast.success(t("manageTags.successDelete"));
        setDeleteId(null);
      } else {
        toast.error(t("manageTags.errorDelete"));
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error(t("manageTags.errorDelete"));
    }
  };

  return (
    <>
      <Dialog
        open={isManageTagsModalOpen}
        onOpenChange={setManageTagsModalOpen}
      >
        <DialogContent className="sm:max-w-lg glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              {t("manageTags.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setManageTagsModalOpen(false);
                setAddTagModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("manageTags.newTag")}
            </Button>

            {/* Tags list */}
            <ScrollArea className="h-[360px] pr-4">
              {tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Tag className="w-12 h-12 mb-2 opacity-50" />
                  <p>{t("manageTags.noTags")}</p>
                  <p className="text-sm">{t("manageTags.createFirst")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tags.map((tag) => {
                    const linkCount = getTagLinkCount(tag.id);
                    const isEditing = editingId === tag.id;

                    return (
                      <div
                        key={tag.id}
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
                            {/* Name input + live preview */}
                            <div className="flex items-center gap-2">
                              <TagBadge
                                name={editingName || tag.name}
                                color={editingColor}
                                size="sm"
                                className="flex-shrink-0"
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
                                {tagColorOptions.map((c) => (
                                  <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setEditingColor(c.value)}
                                    className={cn(
                                      "w-6 h-6 rounded-full transition-all hover:scale-110",
                                      editingColor === c.value
                                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                                        : "hover:ring-1 hover:ring-muted-foreground/30"
                                    )}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.value}
                                  />
                                ))}
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
                            <TagBadge
                              name={tag.name}
                              color={(tag.color as TagColor) ?? "blue"}
                              size="sm"
                              className="flex-shrink-0"
                            />
                            <span className="flex-1 truncate text-sm">{tag.name}</span>
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
                                  handleStartEdit(tag.id, tag.name, tag.color)
                                }
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeleteId(tag.id)}
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
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              {t("manageTags.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getTagLinkCount(deleteId) > 0 ? (
                <>
                  {t("manageTags.deleteWithLinks", { count: getTagLinkCount(deleteId!) })}
                </>
              ) : (
                t("manageTags.deleteConfirm")
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("btn.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
