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

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;


const colorOptions = [
  // Warm colors
  { name: "Rojo", value: "red", hex: "#ef4444" },
  { name: "Naranja", value: "orange", hex: "#f97316" },
  { name: "Ámbar", value: "amber", hex: "#f59e0b" },
  { name: "Amarillo", value: "yellow", hex: "#eab308" },
  { name: "Dorado", value: "gold", hex: "#d4a853" },
  // Green colors
  { name: "Lima", value: "lime", hex: "#84cc16" },
  { name: "Verde", value: "green", hex: "#22c55e" },
  { name: "Esmeralda", value: "emerald", hex: "#10b981" },
  { name: "Teal", value: "teal", hex: "#14b8a6" },
  // Blue colors
  { name: "Cian", value: "cyan", hex: "#06b6d4" },
  { name: "Celeste", value: "sky", hex: "#0ea5e9" },
  { name: "Azul", value: "blue", hex: "#3b82f6" },
  { name: "Índigo", value: "indigo", hex: "#6366f1" },
  // Purple/Pink colors
  { name: "Violeta", value: "violet", hex: "#8b5cf6" },
  { name: "Púrpura", value: "purple", hex: "#a855f7" },
  { name: "Fucsia", value: "fuchsia", hex: "#d946ef" },
  { name: "Rosa", value: "pink", hex: "#ec4899" },
  { name: "Rosa claro", value: "rose", hex: "#f43f5e" },
  // Neutral colors
  { name: "Pizarra", value: "slate", hex: "#64748b" },
  { name: "Gris", value: "gray", hex: "#6b7280" },
  { name: "Zinc", value: "zinc", hex: "#71717a" },
  { name: "Piedra", value: "stone", hex: "#78716c" },
];

export function AddCategoryModal() {
  const { isAddCategoryModalOpen, setAddCategoryModalOpen, addCategory } =
    useLinksStore();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedColor, setSelectedColor] = useState("indigo");

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
        toast.success("Categoría creada correctamente");
        handleClose();
      } else {
        toast.error("Error al crear la categoría");
      }
    } catch (error) {
      console.error("Error creating category:", error);
      toast.error("Error al guardar la categoría");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedIcon("folder");
    setSelectedColor("indigo");
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
            Nueva categoría
          </DialogTitle>
          <DialogDescription>
            Crea una categoría para organizar tus enlaces
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
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Herramientas UI" {...field} />
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
                      placeholder="Describe esta categoría..."
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
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-11 gap-1.5 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-7 h-7 rounded-full transition-all hover:scale-110 ${
                      selectedColor === color.value
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                        : "hover:ring-1 hover:ring-muted-foreground/30"
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear categoría
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
