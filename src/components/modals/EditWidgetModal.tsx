"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Grid3x3, Trash2, Settings, X } from "lucide-react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useWidgetStore } from "@/stores/widget-store";
import { useLinksStore } from "@/stores/links-store";
import { useTranslation } from "@/lib/i18n";
import type { Category, Tag } from "@/lib/db/schema";
import {
  WIDGET_TYPE_METADATA,
  WIDGET_SIZE_PRESETS,
} from "@/types/widget";
import type { WidgetSize } from "@/types/widget";

const formSchema = z.object({
  title: z.string().min(1, "required"),
  size: z.enum(["small", "medium", "large", "wide", "tall"]),
  categoryId: z.string().optional(),
  tagId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

const SIZE_KEYS: Record<WidgetSize, string> = {
  small: "addWidget.sizeSmall",
  medium: "addWidget.sizeMedium",
  large: "addWidget.sizeLarge",
  wide: "addWidget.sizeWide",
  tall: "addWidget.sizeTall",
};

export function EditWidgetModal() {
  const isEditWidgetModalOpen = useWidgetStore((state) => state.isEditWidgetModalOpen);
  const closeEditWidgetModal = useWidgetStore((state) => state.closeEditWidgetModal);
  const selectedWidget = useWidgetStore((state) => state.selectedWidget);
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const removeWidget = useWidgetStore((state) => state.removeWidget);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      size: "medium",
      categoryId: "",
      tagId: "",
    },
  });

  const watchSize = form.watch("size");

  // Helper to normalize tags array - handles potential corrupted data where Tag objects were stored
  const normalizeTags = (tags: unknown): string[] => {
    if (!tags || !Array.isArray(tags)) return [];
    return tags.map((tag) => {
      if (typeof tag === 'string') return tag;
      if (tag && typeof tag === 'object' && 'id' in tag && typeof (tag as { id: unknown }).id === 'string') {
        return (tag as { id: string }).id;
      }
      return null;
    }).filter((id): id is string => id !== null);
  };

  // Update form when selectedWidget changes
  useEffect(() => {
    if (selectedWidget) {
      form.reset({
        title: selectedWidget.title,
        size: selectedWidget.size,
        categoryId: selectedWidget.categoryId || "",
        tagId: selectedWidget.tagId || "",
      });
      setSelectedTags(normalizeTags(selectedWidget.tags));
    }
  }, [selectedWidget, form]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedWidget) return;

    setIsLoading(true);
    try {
      updateWidget(selectedWidget.id, {
        title: values.title,
        size: values.size,
        categoryId: values.categoryId || undefined,
        tagId: values.tagId || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });

      toast.success(t("editWidget.successUpdate"));
      handleClose();
    } catch (error) {
      console.error("Error updating widget:", error);
      toast.error(t("editWidget.errorUpdate"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWidget) return;

    setIsDeleting(true);
    try {
      removeWidget(selectedWidget.id);
      toast.success(t("editWidget.successDelete"));
      handleClose();
    } catch (error) {
      console.error("Error deleting widget:", error);
      toast.error(t("editWidget.errorDelete"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedTags([]);
    closeEditWidgetModal();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (!selectedWidget) return null;

  const widgetMetadata = WIDGET_TYPE_METADATA[selectedWidget.type];
  const requiresCategory = widgetMetadata.requiresCategory;
  const requiresTag = widgetMetadata.requiresTag;
  const currentSizePreset = WIDGET_SIZE_PRESETS[watchSize];

  return (
    <Dialog open={isEditWidgetModalOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg glass max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            {t("editWidget.title")}
          </DialogTitle>
          <DialogDescription>
            {t("editWidget.description", { label: widgetMetadata.label })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2 scrollbar-thin">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Widget Type Info */}
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">{t("editWidget.type")}</span>
                <span className="font-medium">{widgetMetadata.label}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {widgetMetadata.description}
                </span>
              </div>
            </div>

            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addWidget.widgetTitle")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("addWidget.widgetTitlePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Size Selection */}
            <FormField
              control={form.control}
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addWidget.size")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.keys(SIZE_KEYS) as WidgetSize[]).map((size) => (
                        <SelectItem key={size} value={size}>
                          {t(SIZE_KEYS[size])}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Size Preview */}
            <div className="rounded-lg border border-border/50 bg-secondary/20 p-4">
              <p className="text-xs text-muted-foreground mb-3">
                {t("addWidget.sizePreview")}
              </p>
              <div className="flex items-center gap-4">
                <div
                  className="bg-primary/10 border-2 border-primary/30 rounded-md flex items-center justify-center"
                  style={{
                    width: `${currentSizePreset.w * 60}px`,
                    height: `${currentSizePreset.h * 40}px`,
                    minWidth: "60px",
                    minHeight: "80px",
                  }}
                >
                  <Grid3x3 className="w-6 h-6 text-primary/40" />
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>
                    {t("addWidget.width")}: {currentSizePreset.w} {currentSizePreset.w > 1 ? t("addWidget.columns") : t("addWidget.column")}
                  </p>
                  <p>
                    {t("addWidget.height")}: {currentSizePreset.h} {currentSizePreset.h > 1 ? t("addWidget.rows") : t("addWidget.row")}
                  </p>
                </div>
              </div>
            </div>

            {/* Category Selection (only for category widget type) */}
            {requiresCategory && (
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addWidget.category")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("addWidget.selectCategory")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {t("addWidget.noCategories")}
                          </div>
                        ) : (
                          categories.map((category: Category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Tag Selection (only for tag widget type) */}
            {requiresTag && (
              <FormField
                control={form.control}
                name="tagId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("addWidget.filterByTag")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("addWidget.selectTag")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {tags.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            {t("addWidget.noTags")}
                          </div>
                        ) : (
                          tags.map((tag: Tag) => (
                            <SelectItem key={tag.id} value={tag.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-2 h-2 rounded-full bg-${tag.color || "gray"}-500`}
                                />
                                {tag.name}
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Widget Tags Assignment (for all widget types) */}
            {tags.length > 0 && (
              <div className="space-y-2">
                <FormLabel>{t("addWidget.widgetTags")}</FormLabel>
                <p className="text-xs text-muted-foreground">
                  {t("addWidget.assignTags")}
                </p>
                <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border/50 bg-secondary/20 min-h-[60px]">
                  {tags.map((tag: Tag) => {
                    const isSelected = selectedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`
                          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all
                          ${
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary hover:bg-secondary/80 text-foreground"
                          }
                        `}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? "bg-primary-foreground/70" : `bg-${tag.color || "gray"}-500`
                          }`}
                        />
                        {tag.name}
                        {isSelected && (
                          <X className="w-3 h-3 ml-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedTags.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTags.length > 1
                      ? t("addWidget.tagsSelectedPlural", { count: selectedTags.length })
                      : t("addWidget.tagsSelected", { count: selectedTags.length })}
                  </p>
                )}
              </div>
            )}

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
                    {t("btn.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("editWidget.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("editWidget.deleteDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        t("btn.delete")
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {t("editWidget.saveChanges")}
                </Button>
              </div>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
