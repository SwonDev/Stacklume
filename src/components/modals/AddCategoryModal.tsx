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
import { cn } from "@/lib/utils";
import { Pipette } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/colors";

const formSchema = z.object({
  name: z.string().min(1, "required").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;



export function AddCategoryModal() {
  const { isAddCategoryModalOpen, setAddCategoryModalOpen, addCategory } =
    useLinksStore();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState("#6366f1");
  const [customHex, setCustomHex] = useState("#6366f1");

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
    setCustomHex("#6366f1");
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
                {CATEGORY_COLORS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => setSelectedColor(hex)}
                    className={cn(
                      "w-7 h-7 rounded-full transition-all hover:scale-110",
                      selectedColor === hex
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "hover:ring-1 hover:ring-muted-foreground/30"
                    )}
                    style={{ backgroundColor: hex }}
                  />
                ))}
                {/* Color personalizado */}
                <label
                  className={cn(
                    "w-7 h-7 rounded-full cursor-pointer flex items-center justify-center relative transition-all hover:scale-110",
                    !CATEGORY_COLORS.includes(selectedColor)
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "border-2 border-dashed border-muted-foreground/40 hover:border-muted-foreground/70"
                  )}
                  style={!CATEGORY_COLORS.includes(selectedColor) ? { backgroundColor: selectedColor } : undefined}
                  title="Color personalizado"
                >
                  <input
                    type="color"
                    value={customHex}
                    onChange={(e) => {
                      setCustomHex(e.target.value);
                      setSelectedColor(e.target.value);
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {CATEGORY_COLORS.includes(selectedColor) && (
                    <Pipette className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                </label>
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
