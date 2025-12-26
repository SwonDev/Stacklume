"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, FolderPlus, Trash2 } from "lucide-react";
import * as Icons from "lucide-react";
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
import { useProjectsStore } from "@/stores/projects-store";

const formSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
  description: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// Available icon options
const iconOptions = [
  { name: "Folder", icon: Icons.Folder },
  { name: "Star", icon: Icons.Star },
  { name: "Briefcase", icon: Icons.Briefcase },
  { name: "Code", icon: Icons.Code },
  { name: "Music", icon: Icons.Music },
  { name: "Video", icon: Icons.Video },
  { name: "Book", icon: Icons.Book },
  { name: "Zap", icon: Icons.Zap },
  { name: "Heart", icon: Icons.Heart },
  { name: "Target", icon: Icons.Target },
  { name: "Palette", icon: Icons.Palette },
  { name: "Terminal", icon: Icons.Terminal },
  { name: "Rocket", icon: Icons.Rocket },
  { name: "Globe", icon: Icons.Globe },
  { name: "Package", icon: Icons.Package },
  { name: "Database", icon: Icons.Database },
];

// Color options with names
const colorOptions = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
];

interface ProjectDialogProps {
  mode: "add" | "edit";
}

export function ProjectDialog({ mode }: ProjectDialogProps) {
  const {
    isAddProjectModalOpen,
    isEditProjectModalOpen,
    selectedProject,
    closeAddProjectModal,
    closeEditProjectModal,
    createProject,
    updateProject,
    deleteProject,
  } = useProjectsStore();

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState("Folder");
  const [selectedColor, setSelectedColor] = useState("#6366f1");

  const isOpen = mode === "add" ? isAddProjectModalOpen : isEditProjectModalOpen;
  const closeModal = mode === "add" ? closeAddProjectModal : closeEditProjectModal;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  // Load selected project data when editing
  useEffect(() => {
    if (mode === "edit" && selectedProject) {
      form.reset({
        name: selectedProject.name,
        description: selectedProject.description || "",
      });
      setSelectedIcon(selectedProject.icon || "Folder");
      setSelectedColor(selectedProject.color || "#6366f1");
    }
  }, [mode, selectedProject, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const projectData = {
        name: values.name,
        description: values.description || null,
        icon: selectedIcon,
        color: selectedColor,
      };

      if (mode === "add") {
        // Calculate next order
        const projects = useProjectsStore.getState().projects;
        const maxOrder = projects.reduce((max, p) => Math.max(max, p.order), -1);

        await createProject({
          ...projectData,
          order: maxOrder + 1,
        });
        toast.success("Proyecto creado correctamente");
      } else if (selectedProject) {
        await updateProject(selectedProject.id, projectData);
        toast.success("Proyecto actualizado correctamente");
      }

      handleClose();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error("Error al guardar el proyecto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      await deleteProject(selectedProject.id);
      toast.success("Proyecto eliminado correctamente");
      handleClose();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error("Error al eliminar el proyecto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setSelectedIcon("Folder");
    setSelectedColor("#6366f1");
    closeModal();
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-md glass">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" />
            {mode === "add" ? "Nuevo proyecto" : "Editar proyecto"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Crea un proyecto para organizar tus widgets"
              : "Actualiza la información del proyecto"}
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
                    <Input placeholder="Ej: Desarrollo Web" {...field} />
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
                      placeholder="Describe este proyecto..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Icon Selection */}
            <div>
              <label className="text-sm font-medium">Icono</label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {iconOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => setSelectedIcon(option.name)}
                      className={`p-2 rounded-lg transition-all hover:bg-secondary ${
                        selectedIcon === option.name
                          ? "bg-primary/10 text-primary ring-2 ring-primary"
                          : "text-muted-foreground"
                      }`}
                      title={option.name}
                    >
                      <IconComponent className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Color Selection */}
            <div>
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setSelectedColor(color.value)}
                    className={`w-full h-8 rounded-lg transition-all ${
                      selectedColor === color.value
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-2 pt-2">
              <div>
                {mode === "edit" && selectedProject && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción eliminará el proyecto y todos sus widgets asociados.
                          Esta acción no se puede deshacer.
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
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === "add" ? "Crear proyecto" : "Guardar cambios"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Wrapper components for convenience
export function AddProjectModal() {
  return <ProjectDialog mode="add" />;
}

export function EditProjectModal() {
  return <ProjectDialog mode="edit" />;
}
