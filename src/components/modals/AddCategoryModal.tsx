"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, FolderPlus } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

const formSchema = z.object({
  name: z.string().min(1, "required").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;


const colorOptions = [
  // Warm colors
  { labelKey: "color.red", value: "red", hex: "#ef4444" },
  { labelKey: "color.orange", value: "orange", hex: "#f97316" },
  { labelKey: "color.amber", value: "amber", hex: "#f59e0b" },
  { labelKey: "color.yellow", value: "yellow", hex: "#eab308" },
  { labelKey: "color.gold", value: "gold", hex: "#d4a853" },
  // Green colors
  { labelKey: "color.lime", value: "lime", hex: "#84cc16" },
  { labelKey: "color.green", value: "green", hex: "#22c55e" },
  { labelKey: "color.emerald", value: "emerald", hex: "#10b981" },
  { labelKey: "color.teal", value: "teal", hex: "#14b8a6" },
  // Blue colors
  { labelKey: "color.cyan", value: "cyan", hex: "#06b6d4" },
  { labelKey: "color.sky", value: "sky", hex: "#0ea5e9" },
  { labelKey: "color.blue", value: "blue", hex: "#3b82f6" },
  { labelKey: "color.indigo", value: "indigo", hex: "#6366f1" },
  // Purple/Pink colors
  { labelKey: "color.violet", value: "violet", hex: "#8b5cf6" },
  { labelKey: "color.purple", value: "purple", hex: "#a855f7" },
  { labelKey: "color.fuchsia", value: "fuchsia", hex: "#d946ef" },
  { labelKey: "color.pink", value: "pink", hex: "#ec4899" },
  { labelKey: "color.rose", value: "rose", hex: "#f43f5e" },
  // Neutral colors
  { labelKey: "color.slate", value: "slate", hex: "#64748b" },
  { labelKey: "color.gray", value: "gray", hex: "#6b7280" },
  { labelKey: "color.zinc", value: "zinc", hex: "#71717a" },
  { labelKey: "color.stone", value: "stone", hex: "#78716c" },
];

export function AddCategoryModal() {
  const { isAddCategoryModalOpen, setAddCategoryModalOpen, addCategory } =
    useLinksStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState("#6366f1");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          icon: selectedIcon,
          color: selectedColor,
        }),
      });

      if (response.ok) {
        const newCategory = await response.json();
        addCategory(newCategory);
        toast.success(t("addCategory.successCreate"));
        handleClose();
      } else {
        toast.error(t("addCategory.errorCreate"));
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error(t("addCategory.errorSave"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedIcon("folder");
    setSelectedColor("#6366f1");
    setAddCategoryModalOpen(false);
  };

  return (
    <Dialog
      open={isAddCategoryModalOpen}
      onOpenChange={setAddCategoryModalOpen}
    >
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            {t("addCategory.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addCategory.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("addCategory.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("addCategory.namePlaceholder")} {...field} />
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
                  <FormLabel>{t("addCategory.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("addCategory.descriptionPlaceholder")}
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium">{t("addCategory.color")}</label>
              <div className="grid grid-cols-11 gap-1.5 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.hex)}
                    className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${
                      selectedColor === color.hex
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "hover:ring-1 hover:ring-muted-foreground/30"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={t(color.labelKey)}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("addCategory.createCategory")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
