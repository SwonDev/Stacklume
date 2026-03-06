"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, Star, Trash2, Tag as TagIcon, BookOpen } from "lucide-react";
import { TagSelector } from "@/components/ui/tag-selector";
import { TagBadge } from "@/components/ui/tag-badge";
import { CategorySelector } from "@/components/ui/category-selector";
import type { Tag } from "@/lib/db/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";

const formSchema = z.object({
  url: z.string().url("Introduce una URL válida"),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isFavorite: z.boolean(),
  isRead: z.boolean(),
  reminderAt: z.string().optional().nullable(),
  notes: z.string().max(2000, "Máximo 2000 caracteres").optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditLinkModal() {
  const {
    isEditLinkModalOpen,
    closeEditLinkModal,
    selectedLink,
    tags,
    linkTags,
    updateLink,
    removeLink,
    addLinkTag,
    removeLinkTag,
  } = useLinksStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      categoryId: "",
      isFavorite: false,
      isRead: false,
      reminderAt: null,
      notes: null,
    },
  });

  const { formState: { isDirty } } = form;

  // Update form when selectedLink changes
  useEffect(() => {
    if (selectedLink) {
      form.reset({
        url: selectedLink.url,
        title: selectedLink.title,
        description: selectedLink.description || "",
        categoryId: selectedLink.categoryId || "",
        isFavorite: selectedLink.isFavorite ?? false,
        isRead: (selectedLink as Record<string, unknown>).isRead as boolean ?? false,
        reminderAt: (selectedLink as Record<string, unknown>).reminderAt
          ? String((selectedLink as Record<string, unknown>).reminderAt)
          : null,
        notes: (selectedLink as Record<string, unknown>).notes as string | null ?? null,
      });
      // Load current tags for this link
      const currentTagIds = linkTags
        .filter((lt: { linkId: string; tagId: string }) => lt.linkId === selectedLink.id)
        .map((lt: { linkId: string; tagId: string }) => lt.tagId);
      setSelectedTagIds(currentTagIds);
    }
  }, [selectedLink, form, linkTags]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedLink) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/links/${selectedLink.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          categoryId: values.categoryId || null,
        }),
      });

      if (response.ok) {
        const updatedLink = await response.json();
        updateLink(selectedLink.id, updatedLink);

        // Update tags: remove old ones, add new ones
        const currentTagIds = linkTags
          .filter((lt: { linkId: string; tagId: string }) => lt.linkId === selectedLink.id)
          .map((lt: { linkId: string; tagId: string }) => lt.tagId);

        // Remove tags that were deselected
        for (const tagId of currentTagIds) {
          if (!selectedTagIds.includes(tagId)) {
            await fetch(`/api/tags/link?linkId=${selectedLink.id}&tagId=${tagId}`, {
              method: "DELETE",
              headers: getCsrfHeaders(),
              credentials: "include",
            });
            removeLinkTag(selectedLink.id, tagId);
          }
        }

        // Add new tags
        for (const tagId of selectedTagIds) {
          if (!currentTagIds.includes(tagId)) {
            await fetch("/api/tags/link", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                ...getCsrfHeaders(),
              },
              credentials: "include",
              body: JSON.stringify({ linkId: selectedLink.id, tagId }),
            });
            addLinkTag(selectedLink.id, tagId);
          }
        }

        // Resetear el formulario con los valores guardados para limpiar isDirty
        form.reset({
          url: updatedLink.url,
          title: updatedLink.title,
          description: updatedLink.description || "",
          categoryId: updatedLink.categoryId || "",
          isFavorite: updatedLink.isFavorite ?? false,
          isRead: updatedLink.isRead ?? false,
          reminderAt: updatedLink.reminderAt
            ? String(updatedLink.reminderAt)
            : null,
          notes: updatedLink.notes ?? null,
        });
        toast.success("Enlace actualizado correctamente");
        closeEditLinkModal();
      } else {
        toast.error("Error al actualizar el enlace");
      }
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedLink) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/links/${selectedLink.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });

      if (response.ok) {
        removeLink(selectedLink.id);
        toast.success("Enlace eliminado correctamente");
        closeEditLinkModal();
      } else {
        toast.error("Error al eliminar el enlace");
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Error al eliminar el enlace");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTagIds([]);
    closeEditLinkModal();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && isDirty) {
      setShowDiscardDialog(true);
      return;
    }
    if (!open) {
      handleClose();
    }
  };

  const handleCancelWithCheck = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      handleClose();
    }
  };

  return (
    <>
    <Dialog open={isEditLinkModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Editar enlace
          </DialogTitle>
          <DialogDescription>
            Modifica los datos del enlace guardado
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* URL Field */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título del enlace" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Añade una descripción..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Select */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (opcional)</FormLabel>
                  <FormControl>
                    <CategorySelector
                      selectedCategoryId={field.value || null}
                      onCategoryChange={(id) => field.onChange(id ?? "")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Etiquetas</span>
              </div>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                placeholder="Añadir etiquetas..."
              />
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {selectedTagIds.map(tagId => {
                    const tag = tags.find((t: Tag) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <TagBadge
                        key={tag.id}
                        name={tag.name}
                        color={tag.color || "gray"}
                        size="sm"
                        onRemove={() => setSelectedTagIds(prev => prev.filter(id => id !== tagId))}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            {/* Favorite Toggle */}
            <FormField
              control={form.control}
              name="isFavorite"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <Button
                      type="button"
                      variant={field.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => field.onChange(!field.value)}
                      className="gap-1.5"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          field.value ? "fill-current" : ""
                        }`}
                      />
                      {field.value ? "Favorito" : "Añadir a favoritos"}
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Opciones avanzadas */}
            <Separator className="my-2" />
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <BookOpen className="w-4 h-4" />
                <span>Opciones avanzadas</span>
              </div>

              {/* isRead */}
              <FormField
                control={form.control}
                name="isRead"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Button
                        type="button"
                        variant={field.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => field.onChange(!field.value)}
                        className="gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {field.value ? "Marcado como leído" : "Marcar como leído"}
                      </Button>
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* reminderAt */}
              <FormField
                control={form.control}
                name="reminderAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recordatorio</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={
                          field.value
                            ? new Date(field.value).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) => field.onChange(e.target.value || null)}
                        className="bg-background"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notas privadas</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Añade notas privadas sobre este enlace..."
                        className="resize-none bg-background"
                        rows={3}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Eliminar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar enlace?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. El enlace se eliminará
                      permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Eliminar"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleCancelWithCheck}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Guardar cambios
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Descartar cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Tienes cambios sin guardar. Si cierras ahora, se perderán.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowDiscardDialog(false)}>
            Seguir editando
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setShowDiscardDialog(false);
              handleClose();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Descartar cambios
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
