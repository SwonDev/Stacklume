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
import { useLinksStore } from "@/stores/links-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const getTagLinkCount = (tagId: string) => {
    return linkTags.filter((lt) => lt.tagId === tagId).length;
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
      const response = await fetch(`/api/tags`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, name: editingName.trim() }),
      });

      if (response.ok) {
        updateTag(editingId, { name: editingName.trim() });
        toast.success("Etiqueta actualizada");
        handleCancelEdit();
      } else {
        toast.error("Error al actualizar la etiqueta");
      }
    } catch (error) {
      console.error("Error updating tag:", error);
      toast.error("Error al actualizar la etiqueta");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/tags?id=${deleteId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        removeTag(deleteId);
        // Also remove link-tag associations for this tag
        setLinkTags(linkTags.filter((lt) => lt.tagId !== deleteId));
        toast.success("Etiqueta eliminada");
        setDeleteId(null);
      } else {
        toast.error("Error al eliminar la etiqueta");
      }
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error("Error al eliminar la etiqueta");
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
              Gestionar Etiquetas
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
              Nueva Etiqueta
            </Button>

            {/* Tags list */}
            <ScrollArea className="h-[300px] pr-4">
              {tags.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Tag className="w-12 h-12 mb-2 opacity-50" />
                  <p>No hay etiquetas</p>
                  <p className="text-sm">Crea tu primera etiqueta</p>
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
                          "flex items-center gap-2 p-3 rounded-lg border transition-colors",
                          isEditing
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-secondary/50"
                        )}
                      >
                        <Tag className="w-4 h-4 text-primary flex-shrink-0" />

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
                          <span className="flex-1 truncate">{tag.name}</span>
                        )}

                        <Badge variant="secondary" className="flex-shrink-0">
                          {linkCount} {linkCount === 1 ? "enlace" : "enlaces"}
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
                                handleStartEdit(tag.id, tag.name)
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
              Eliminar Etiqueta
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteId && getTagLinkCount(deleteId) > 0 ? (
                <>
                  Esta etiqueta está asignada a{" "}
                  <strong>{getTagLinkCount(deleteId)}</strong> enlaces.
                  La etiqueta se eliminará de todos los enlaces.
                </>
              ) : (
                "¿Estás seguro de que quieres eliminar esta etiqueta?"
              )}
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
    </>
  );
}
