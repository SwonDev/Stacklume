"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Columns3 } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useKanbanStore, COLUMN_COLOR_PRESETS } from "@/stores/kanban-store";
import { useTranslation } from "@/lib/i18n";

const formSchema = z.object({
  title: z.string().min(1, "required").max(50, "max50"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddColumnModal() {
  const isAddColumnModalOpen = useKanbanStore((state) => state.isAddColumnModalOpen);
  const closeAddColumnModal = useKanbanStore((state) => state.closeAddColumnModal);
  const addColumn = useKanbanStore((state) => state.addColumn);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLUMN_COLOR_PRESETS[0].value);
  const { t } = useTranslation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      addColumn({
        title: values.title,
        color: selectedColor,
      });
      toast.success(t("addColumn.successCreate"));
      handleClose();
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error(t("addColumn.errorCreate"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedColor(COLUMN_COLOR_PRESETS[0].value);
    closeAddColumnModal();
  };

  return (
    <Dialog open={isAddColumnModalOpen} onOpenChange={closeAddColumnModal}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Columns3 className="w-5 h-5 text-primary" />
            {t("addColumn.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addColumn.description")}
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
                  <FormLabel>{t("addColumn.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("addColumn.namePlaceholder")} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium">{t("addColumn.headerColor")}</label>
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
              <label className="text-sm font-medium text-muted-foreground">{t("addColumn.preview")}</label>
              <div className="mt-2 p-3 rounded-lg border bg-secondary/20">
                <div
                  className="h-1 rounded-full mb-2"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm font-semibold">
                  {form.watch("title") || t("addColumn.columnNameDefault")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("addColumn.createColumn")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
