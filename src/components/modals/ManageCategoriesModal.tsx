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
import { useLinksStore } from "@/stores/links-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

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
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getCategoryLinkCount = (categoryId: string) => {
    return links.filter((l) => l.categoryId === categoryId).length;
  };

  const handleStartEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName("");
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
        body: JSON.stringify({ id: editingId, name: editingName.trim() }),
      });

      if (response.ok) {
        updateCategory(editingId, { name: editingName.trim() });
        toast.success(t("manageCategories.successUpdate"));
        handleCancelEdit();
      } else {
        toast.error(t("manageCategories.errorUpdate"));
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error(t("manageCategories.errorUpdate"));
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    const linkCount = getCategoryLinkCount(deleteId);

    try {
      const response = await fetch(`/api/categories?id=${deleteId}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        removeCategory(deleteId);
        toast.success(
          linkCount > 0
            ? t("manageCategories.successDeleteWithLinks", { count: linkCount })
            : t("manageCategories.successDelete")
        );
        setDeleteId(null);
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
        <DialogContent className="sm:max-w-lg glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              {t("manageCategories.title")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => {
                setManageCategoriesModalOpen(false);
                setAddCategoryModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4" />
              {t("manageCategories.newCategory")}
            </Button>

            {/* Categories list */}
            <ScrollArea className="h-[300px] pr-4">
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
                          "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                          isEditing
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary/50"
                        )}
                      >
                        <FolderOpen className="w-4 h-4 text-primary flex-shrink-0" />

                        {isEditing ? (
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
                        ) : (
                          <span className="flex-1 truncate">{category.name}</span>
                        )}

                        <Badge variant="secondary" className="flex-shrink-0">
                          {linkCount} {linkCount === 1 ? t("manageCategories.linkSingular") : t("manageCategories.linkPlural")}
                        </Badge>

                        {isEditing ? (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                              onClick={handleSaveEdit}
                              disabled={!editingName.trim()}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleCancelEdit}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleStartEdit(category.id, category.name)
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
              {t("manageCategories.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getCategoryLinkCount(deleteId) > 0 ? (
                <>
                  {t("manageCategories.deleteWithLinks", { count: getCategoryLinkCount(deleteId!) })}
                </>
              ) : (
                t("manageCategories.deleteConfirm")
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
