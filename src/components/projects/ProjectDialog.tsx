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
import { useTranslation } from "@/lib/i18n";

const formSchema = (nameRequiredMsg: string) =>
  z.object({
    name: z.string().min(1, nameRequiredMsg).max(100),
    description: z.string().max(500).optional(),
  });

type FormValues = z.infer<ReturnType<typeof formSchema>>;

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
  const { t } = useTranslation();
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
    resolver: zodResolver(formSchema(t("projects.nameRequired"))),
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
        toast.success(t("projects.successCreate"));
      } else if (selectedProject) {
        await updateProject(selectedProject.id, projectData);
        toast.success(t("projects.successUpdate"));
      }

      handleClose();
    } catch (error) {
      console.error("Error saving project:", error);
      toast.error(t("projects.errorSave"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedProject) return;

    setIsLoading(true);
    try {
      await deleteProject(selectedProject.id);
      toast.success(t("projects.successDelete"));
      handleClose();
    } catch (error) {
      console.error("Error deleting project:", error);
      toast.error(t("projects.errorDelete"));
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
            {mode === "add" ? t("projects.newProject") : t("projects.editProject")}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? t("projects.createDesc")
              : t("projects.editDesc")}
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
                  <FormLabel>{t("projects.name")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("projects.namePlaceholder")} {...field} />
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
                  <FormLabel>{t("projects.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("projects.descriptionPlaceholder")}
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
              <label className="text-sm font-medium">{t("projects.icon")}</label>
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
              <label className="text-sm font-medium">{t("projects.color")}</label>
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
                        {t("projects.deleteButton")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("projects.deleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("projects.deleteDesc")}
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
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={handleClose}>
                  {t("btn.cancel")}
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === "add" ? t("projects.createButton") : t("projects.saveChanges")}
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
