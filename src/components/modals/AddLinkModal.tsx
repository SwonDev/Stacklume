"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Loader2,
  Link as LinkIcon,
  Star,
  Sparkles,
  Play,
  Gamepad2,
  Music,
  Code,
  BookOpen,
  Globe,
  History,
  X,
} from "lucide-react";
import { useFormDraft, formatDraftTime } from "@/hooks/useFormDraft";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { motion, AnimatePresence } from "motion/react";
import type { Category } from "@/lib/db/schema";
import { getCsrfHeaders } from "@/hooks/useCsrf";

const formSchema = z.object({
  url: z.string().url("Introduce una URL válida"),
  title: z.string().min(1, "El título es obligatorio"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  isFavorite: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ScrapedData {
  title: string;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
  siteName: string | null;
  author: string | null;
  // Platform info
  platform?: string;
  contentType?: string;
  platformLabel?: string;
  platformColor?: string;
  platformIcon?: string;
}

// Content type icons mapping
const contentTypeIcons: Record<string, typeof Play> = {
  video: Play,
  game: Gamepad2,
  music: Music,
  code: Code,
  article: BookOpen,
  website: Globe,
};

// Content type labels in Spanish
const contentTypeLabels: Record<string, string> = {
  video: "Video",
  game: "Juego",
  music: "Música",
  code: "Código",
  article: "Artículo",
  social: "Social",
  shopping: "Tienda",
  image: "Imagen",
  document: "Documento",
  tool: "Herramienta",
  website: "Web",
};

export function AddLinkModal() {
  const { isAddLinkModalOpen, setAddLinkModalOpen, closeAddLinkModal, categories, addLink, prefillLinkData } =
    useLinksStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);

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

  // Form draft auto-save
  const { hasDraft, restoreDraft, clearDraft, dismissDraft, draftTimestamp, isDismissed } = useFormDraft({
    key: "add-link-modal",
    form,
    watchFields: ["url", "title", "description", "categoryId"],
    enabled: isAddLinkModalOpen,
    debounceMs: 1500,
  });

  const watchUrl = form.watch("url");

  // Prefill form when modal opens with prefill data
  useEffect(() => {
    if (isAddLinkModalOpen && prefillLinkData) {
      if (prefillLinkData.url) {
        form.setValue("url", prefillLinkData.url);
      }
      if (prefillLinkData.title) {
        form.setValue("title", prefillLinkData.title);
      }
      if (prefillLinkData.description) {
        form.setValue("description", prefillLinkData.description);
      }
    }
  }, [isAddLinkModalOpen, prefillLinkData, form]);

  // Auto-scrape when URL changes
  useEffect(() => {
    const scrapeUrl = async () => {
      if (!watchUrl) return;

      try {
        new URL(watchUrl);
      } catch {
        return;
      }

      setIsScraping(true);
      try {
        const response = await fetch("/api/scrape", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ url: watchUrl }),
        });

        if (response.ok) {
          const data: ScrapedData = await response.json();
          setScrapedData(data);

          // Auto-fill form fields
          if (data.title && !form.getValues("title")) {
            form.setValue("title", data.title);
          }
          if (data.description && !form.getValues("description")) {
            form.setValue("description", data.description);
          }
        }
      } catch (error) {
        console.error("Scrape error:", error);
      } finally {
        setIsScraping(false);
      }
    };

    const timeoutId = setTimeout(scrapeUrl, 500);
    return () => clearTimeout(timeoutId);
  }, [watchUrl, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({
          ...values,
          imageUrl: scrapedData?.imageUrl,
          faviconUrl: scrapedData?.faviconUrl,
          siteName: scrapedData?.siteName,
          author: scrapedData?.author,
          categoryId: values.categoryId || null,
          // Platform detection info
          platform: scrapedData?.platform,
          contentType: scrapedData?.contentType,
          platformColor: scrapedData?.platformColor,
        }),
      });

      if (response.ok) {
        const newLink = await response.json();
        addLink(newLink);
        clearDraft(); // Clear draft on successful submit
        toast.success("Enlace creado correctamente");
        handleClose();
      } else {
        // Try to get the actual error message from the server
        let errorMessage = "Error al crear el enlace";
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch {
          // If we can't parse the error response, use status text
          errorMessage = `Error ${response.status}: ${response.statusText || errorMessage}`;
        }
        console.error("Error creating link:", errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating link:", error);
      toast.error("Error al guardar el enlace");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setScrapedData(null);
    closeAddLinkModal();
  };

  return (
    <Dialog open={isAddLinkModalOpen} onOpenChange={setAddLinkModalOpen}>
      <DialogContent className="sm:max-w-lg glass max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            Añadir nuevo enlace
          </DialogTitle>
          <DialogDescription>
            Pega una URL y se obtendrán automáticamente los metadatos
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6 pb-2 scrollbar-thin">
          {/* Draft restoration prompt */}
          <AnimatePresence>
            {hasDraft && !isDismissed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4"
              >
                <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10">
                  <History className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      Borrador guardado
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDraftTime(draftTimestamp)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={dismissDraft}
                      className="h-7 px-2 text-xs"
                    >
                      <X className="w-3 h-3 mr-1" />
                      Descartar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={restoreDraft}
                      className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      Restaurar
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* URL Field */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="https://ejemplo.com"
                        {...field}
                        className="pr-10"
                      />
                      {isScraping && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Scraped Preview */}
            <AnimatePresence>
              {scrapedData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-lg border border-border/50 bg-secondary/30 overflow-hidden"
                >
                  {/* Large preview for video/game/music content */}
                  {scrapedData.imageUrl && ["video", "game", "music"].includes(scrapedData.contentType || "") ? (
                    <div className="relative">
                      <img
                        src={scrapedData.imageUrl}
                        alt=""
                        className="w-full aspect-video object-cover"
                      />
                      {/* Play button overlay for videos */}
                      {scrapedData.contentType === "video" && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="w-6 h-6 text-black ml-0.5" fill="currentColor" />
                          </div>
                        </div>
                      )}
                      {/* Platform badge */}
                      {scrapedData.platform && scrapedData.platform !== "generic" && (
                        <div
                          className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium text-white flex items-center gap-1"
                          style={{ backgroundColor: scrapedData.platformColor || "#6B7280" }}
                        >
                          {(() => {
                            const IconComponent = contentTypeIcons[scrapedData.contentType || "website"] || Globe;
                            return <IconComponent className="w-3 h-3" />;
                          })()}
                          {scrapedData.platformLabel || contentTypeLabels[scrapedData.contentType || "website"]}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        Vista previa
                      </span>
                      {scrapedData.platform && scrapedData.platform !== "generic" && !["video", "game", "music"].includes(scrapedData.contentType || "") && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white flex items-center gap-0.5 ml-auto"
                          style={{ backgroundColor: scrapedData.platformColor || "#6B7280" }}
                        >
                          {(() => {
                            const IconComponent = contentTypeIcons[scrapedData.contentType || "website"] || Globe;
                            return <IconComponent className="w-2.5 h-2.5" />;
                          })()}
                          {contentTypeLabels[scrapedData.contentType || "website"]}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {scrapedData.imageUrl && !["video", "game", "music"].includes(scrapedData.contentType || "") && (
                        <img
                          src={scrapedData.imageUrl}
                          alt=""
                          className="w-16 h-16 rounded-md object-cover flex-shrink-0"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium line-clamp-2">
                          {scrapedData.title}
                        </p>
                        {scrapedData.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {scrapedData.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {scrapedData.siteName && (
                            <Badge variant="secondary" className="text-xs">
                              {scrapedData.siteName}
                            </Badge>
                          )}
                          {scrapedData.author && (
                            <span className="text-xs text-muted-foreground">
                              por {scrapedData.author}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Title Field */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input placeholder="Título del enlace" {...field} />
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
                      placeholder="Añade una descripción..."
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Select */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoría (opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoría" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      {field.value ? "Favorito" : "Añadir a favoritos"}
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Guardar enlace
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
