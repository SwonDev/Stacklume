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

const formSchema = z.object({
  title: z.string().min(1, "El nombre es obligatorio").max(50, "Máximo 50 caracteres"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddColumnModal() {
  const isAddColumnModalOpen = useKanbanStore((state) => state.isAddColumnModalOpen);
  const closeAddColumnModal = useKanbanStore((state) => state.closeAddColumnModal);
  const addColumn = useKanbanStore((state) => state.addColumn);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLUMN_COLOR_PRESETS[0].value);

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
      toast.success("Columna creada correctamente");
      handleClose();
    } catch (error) {
      console.error("Error creating column:", error);
      toast.error("Error al crear la columna");
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
            Nueva columna
          </DialogTitle>
          <DialogDescription>
            Añade una nueva columna a tu tablero Kanban
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
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: En revisión" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium">Color del encabezado</label>
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
              <label className="text-sm font-medium text-muted-foreground">Vista previa</label>
              <div className="mt-2 p-3 rounded-lg border bg-secondary/20">
                <div
                  className="h-1 rounded-full mb-2"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm font-semibold">
                  {form.watch("title") || "Nombre de columna"}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Crear columna
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
