"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Pencil, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { useKanbanStore, COLUMN_COLOR_PRESETS } from "@/stores/kanban-store";
import { useTranslation } from "@/lib/i18n";

const formSchema = z.object({
  title: z.string().min(1, "required").max(50, "max50"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditColumnModal() {
  const {
    isEditColumnModalOpen,
    closeEditColumnModal,
    selectedColumn,
    updateColumn,
    removeColumn,
    columns,
  } = useKanbanStore();

  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLUMN_COLOR_PRESETS[0].value);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  // Update form when selected column changes
  useEffect(() => {
    if (selectedColumn) {
      form.reset({ title: selectedColumn.title });
      setSelectedColor(selectedColumn.color);
    }
  }, [selectedColumn, form]);

  const onSubmit = async (values: FormValues) => {
    if (!selectedColumn) return;

    setIsLoading(true);
    try {
      updateColumn(selectedColumn.id, {
        title: values.title,
        color: selectedColor,
      });
      toast.success(t("editColumn.successUpdate"));
      handleClose();
    } catch (error) {
      console.error("Error updating column:", error);
      toast.error(t("editColumn.errorUpdate"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedColumn) return;

    if (columns.length <= 1) {
      toast.error(t("editColumn.cannotDeleteLast"));
      return;
    }

    removeColumn(selectedColumn.id);
    toast.success(t("editColumn.successDelete"));
    handleClose();
  };

  const handleClose = () => {
    form.reset();
    setSelectedColor(COLUMN_COLOR_PRESETS[0].value);
    closeEditColumnModal();
  };

  if (!selectedColumn) return null;

  return (
    <Dialog open={isEditColumnModalOpen} onOpenChange={closeEditColumnModal}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" />
            {t("editColumn.title")}
          </DialogTitle>
          <DialogDescription>
            {t("editColumn.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("editColumn.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("editColumn.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium">{t("editColumn.headerColor")}</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {COLUMN_COLOR_PRESETS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${
                      selectedColor === color.value
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="text-sm font-medium text-muted-foreground">{t("editColumn.preview")}</label>
              <div className="mt-2 p-3 rounded-lg border bg-secondary/20">
                <div
                  className="h-1 rounded-full mb-2"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm font-semibold">
                  {form.watch("title") || t("editColumn.columnNameDefault")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-2">
              {/* Delete Button with Confirmation */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={columns.length <= 1}
                    title={columns.length <= 1 ? t("editColumn.cannotDeleteLast") : t("editColumn.deleteTooltip")}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    {t("btn.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("editColumn.deleteTitle")}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t("editColumn.deleteDesc")}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      {t("btn.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {t("editColumn.saveChanges")}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
