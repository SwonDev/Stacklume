"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Link as LinkIcon, Star, Trash2, Tag as TagIcon, BookOpen, StickyNote, Bell, Wand2, Inbox, CheckCheck } from "lucide-react";
import { TagSelector } from "@/components/ui/tag-selector";
import { MultiCategorySelector } from "@/components/ui/multi-category-selector";
import type { Tag } from "@/lib/db/schema";
import { randomTagColor } from "@/lib/colors";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

const formSchema = z.object({
  url: z.string().url("Introduce una URL válida"),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isFavorite: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditLinkModal() {
  const isEditLinkModalOpen = useLinksStore((state) => state.isEditLinkModalOpen);
  const selectedLink = useLinksStore((state) => state.selectedLink);
  const _tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);
  const linkCategories = useLinksStore((state) => state.linkCategories);
  const confirmBeforeDelete = useSettingsStore((state) => state.confirmBeforeDelete);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [aiGenerating, setAiGenerating] = useState<"title" | "description" | "tags" | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [readingStatus, setReadingStatus] = useState<string>("inbox");
  const [notes, setNotes] = useState("");
  const [reminderAt, setReminderAt] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      title: "",
      description: "",
      categoryId: "",
      isFavorite: false,
    },
  });

  // Update form when selectedLink changes
  useEffect(() => {
    if (selectedLink) {
      form.reset({
        url: selectedLink.url,
        title: selectedLink.title,
        description: selectedLink.description || "",
        categoryId: selectedLink.categoryId || "",
        isFavorite: selectedLink.isFavorite ?? false,
      });
      // Load current tags for this link
      const currentTagIds = linkTags
        .filter((lt: { linkId: string; tagId: string }) => lt.linkId === selectedLink.id)
        .map((lt: { linkId: string; tagId: string }) => lt.tagId);
      setSelectedTagIds(currentTagIds);
      // Load current categories (multi-category), fallback to single categoryId
      const currentCategoryIds = linkCategories
        .filter((lc: { linkId: string; categoryId: string }) => lc.linkId === selectedLink.id)
        .map((lc: { linkId: string; categoryId: string }) => lc.categoryId);
      setSelectedCategoryIds(currentCategoryIds.length > 0 ? currentCategoryIds : (selectedLink.categoryId ? [selectedLink.categoryId] : []));
      // Load personal tracking fields
      setReadingStatus(selectedLink.readingStatus ?? "inbox");
      setNotes(selectedLink.notes || "");
      if (selectedLink.reminderAt) {
        const d = new Date(selectedLink.reminderAt);
        const pad = (n: number) => String(n).padStart(2, "0");
        setReminderAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
      } else {
        setReminderAt(null);
      }
    }
  }, [selectedLink, form, linkTags, linkCategories]);

  const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const generateWithAI = async (type: "title" | "description" | "tags") => {
    const url = form.getValues("url");
    if (!url) return;
    setAiGenerating(type);
    try {
      let llamaPort = 0;
      try {
        const internals = (window as unknown as Record<string, unknown>)
          .__TAURI_INTERNALS__ as { invoke?: (cmd: string, args?: unknown) => Promise<number> } | undefined;
        if (internals?.invoke) llamaPort = await internals.invoke("get_llama_port");
      } catch { /* */ }
      const thinkingEnabled = localStorage.getItem("stacklume-llm-thinking") === "true";
      let modelFamily = "qwen3";
      try {
        const i2 = (window as unknown as Record<string, unknown>)
          .__TAURI_INTERNALS__ as { invoke?: (cmd: string) => Promise<{ family?: string } | null> } | undefined;
        if (i2?.invoke) { const info = await i2.invoke("get_active_model"); if (info?.family) modelFamily = info.family; }
      } catch { /* */ }
      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, currentTitle: form.getValues("title"), currentDescription: form.getValues("description"), type, llamaPort, enableThinking: thinkingEnabled, modelFamily }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
      const data = await res.json();
      if (type === "tags" && data.tags) {
        // Buscar o crear las etiquetas generadas y seleccionarlas
        const allTags = useLinksStore.getState().tags;
        const newSelectedIds = [...selectedTagIds];
        for (const tagName of data.tags as string[]) {
          const existing = allTags.find((t: Tag) => t.name.toLowerCase() === tagName.toLowerCase());
          if (existing && !newSelectedIds.includes(existing.id)) {
            newSelectedIds.push(existing.id);
          } else if (!existing) {
            // Crear tag nuevo
            try {
              const tagRes = await fetch("/api/tags", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                credentials: "include",
                body: JSON.stringify({ name: tagName, color: randomTagColor() }),
              });
              if (tagRes.ok) {
                const newTag = await tagRes.json();
                useLinksStore.getState().addTag(newTag);
                newSelectedIds.push(newTag.id);
              }
            } catch { /* skip */ }
          }
        }
        setSelectedTagIds(newSelectedIds);
        toast.success(`${(data.tags as string[]).length} etiquetas generadas`);
      } else if (data.result) {
        form.setValue(type as "title" | "description", data.result);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar con IA");
    } finally {
      setAiGenerating(null);
    }
  };

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
          categoryId: selectedCategoryIds[0] || values.categoryId || null,
          isRead: readingStatus === "done",
          readingStatus,
          notes: notes || null,
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : null,
        }),
      });

      if (response.ok) {
        const updatedLink = await response.json();
        useLinksStore.getState().updateLink(selectedLink.id, updatedLink);

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
            useLinksStore.getState().removeLinkTag(selectedLink.id, tagId);
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
            useLinksStore.getState().addLinkTag(selectedLink.id, tagId);
          }
        }

        // Save multi-category associations
        try {
          const lcRes = await fetch("/api/link-categories", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ linkId: selectedLink.id, categoryIds: selectedCategoryIds }),
          });
          if (lcRes.ok) {
            const store = useLinksStore.getState();
            const others = store.linkCategories.filter((lc) => lc.linkId !== selectedLink.id);
            const updated = selectedCategoryIds.map((cid) => ({ linkId: selectedLink.id, categoryId: cid }));
            store.setLinkCategories([...others, ...updated]);
          }
        } catch (e) {
          console.error("Error saving link-categories:", e);
        }

        toast.success(t("editLink.successUpdate"));
        useLinksStore.getState().closeEditLinkModal();
        // Sincronizar estado servidor → cliente para reflejar cambios en todos los widgets
        await useLinksStore.getState().refreshAllData();
      } else {
        toast.error(t("editLink.errorUpdate"));
      }
    } catch (error) {
      console.error("Error updating link:", error);
      toast.error(t("editLink.errorSaveChanges"));
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
        useLinksStore.getState().removeLink(selectedLink.id);
        toast.success(t("editLink.successDelete"));
        useLinksStore.getState().closeEditLinkModal();
        // Sincronizar estado servidor → cliente
        await useLinksStore.getState().refreshAllData();
      } else {
        toast.error(t("editLink.errorDelete"));
      }
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error(t("editLink.errorDelete"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTagIds([]);
    setSelectedCategoryIds([]);
    setReadingStatus("inbox");
    setNotes("");
    setReminderAt(null);
    useLinksStore.getState().closeEditLinkModal();
  };

  return (
    <Dialog open={isEditLinkModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg glass max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            {t("editLink.title")}
          </DialogTitle>
          <DialogDescription>
            {t("editLink.description")}
          </DialogDescription>
        </DialogHeader>

        {/* Link Image Preview */}
        {selectedLink?.imageUrl && (
          <div className="relative w-full h-32 rounded-lg overflow-hidden bg-secondary mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedLink.imageUrl}
              alt={selectedLink.title || ""}
              className="w-full h-full object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
            {/* URL Field */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input placeholder={t("addLink.urlPlaceholder")} {...field} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addLink.linkTitle")}</FormLabel>
                    {isDesktop && (
                      <button type="button" onClick={() => generateWithAI("title")} disabled={aiGenerating !== null}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40" title="Generar título con IA">
                        {aiGenerating === "title" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        <span>IA</span>
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Input placeholder={t("addLink.titlePlaceholder")} {...field} />
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addLink.descriptionLabel")}</FormLabel>
                    {isDesktop && (
                      <button type="button" onClick={() => generateWithAI("description")} disabled={aiGenerating !== null}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40" title="Generar descripción con IA">
                        {aiGenerating === "description" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        <span>IA</span>
                      </button>
                    )}
                  </div>
                  <FormControl>
                    <Textarea
                      placeholder={t("addLink.descriptionPlaceholder")}
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Select (multi) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("addLink.categories")}</label>
              <MultiCategorySelector
                selectedCategoryIds={selectedCategoryIds}
                onCategoriesChange={setSelectedCategoryIds}
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("editLink.tags")}</span>
                </div>
                {isDesktop && (
                  <button type="button" onClick={() => generateWithAI("tags")} disabled={aiGenerating !== null}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40" title="Generar etiquetas con IA">
                    {aiGenerating === "tags" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    <span>IA</span>
                  </button>
                )}
              </div>
              <TagSelector
                selectedTagIds={selectedTagIds}
                onTagsChange={setSelectedTagIds}
                placeholder={t("editLink.addTags")}
              />
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
                      {field.value ? t("addLink.favorite") : t("addLink.addToFavorites")}
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Reading Status */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                {t("editLink.readingStatus")}
              </label>
              <Select value={readingStatus} onValueChange={setReadingStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">
                    <span className="flex items-center gap-2">
                      <Inbox className="w-3.5 h-3.5 text-blue-500" />
                      {t("editLink.readingInbox")}
                    </span>
                  </SelectItem>
                  <SelectItem value="reading">
                    <span className="flex items-center gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      {t("editLink.readingInProgress")}
                    </span>
                  </SelectItem>
                  <SelectItem value="done">
                    <span className="flex items-center gap-2">
                      <CheckCheck className="w-3.5 h-3.5 text-green-500" />
                      {t("editLink.readingDone")}
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Personal Notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <StickyNote className="w-4 h-4 text-muted-foreground" />
                {t("editLink.personalNotes")}
              </label>
              <Textarea
                placeholder={t("editLink.notesPlaceholder")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[80px] resize-y"
              />
            </div>

            {/* Reminder */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Bell className="w-4 h-4 text-muted-foreground" />
                {t("editLink.reminder")}
              </label>
              <Input
                type="datetime-local"
                value={reminderAt || ""}
                onChange={(e) => setReminderAt(e.target.value || null)}
              />
              {reminderAt && (
                <Button variant="ghost" size="sm" onClick={() => setReminderAt(null)}>
                  {t("editLink.removeReminder")}
                </Button>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              {confirmBeforeDelete ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="gap-1.5"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      {t("btn.delete")}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("editLink.deleteLink")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("editLink.deleteLinkDesc")}
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
              ) : (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {t("btn.delete")}
                </Button>
              )}

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {t("editLink.saveChanges")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
