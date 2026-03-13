"use client";

import { useState, useEffect, useCallback } from "react";
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
  Tags,
  Check,
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
import { MultiCategorySelector } from "@/components/ui/multi-category-selector";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { motion, AnimatePresence } from "motion/react";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";
import { cn } from "@/lib/utils";

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
  // DevKit
  installCommands?: string[];
}

interface TagSuggestion {
  name: string;
  color: string;
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

// Content type i18n key mapping
const contentTypeKeys: Record<string, string> = {
  video: "addLink.contentType.video",
  game: "addLink.contentType.game",
  music: "addLink.contentType.music",
  code: "addLink.contentType.code",
  article: "addLink.contentType.article",
  social: "addLink.contentType.social",
  shopping: "addLink.contentType.shopping",
  image: "addLink.contentType.image",
  document: "addLink.contentType.document",
  tool: "addLink.contentType.tool",
  website: "addLink.contentType.website",
};

// Pure function: generates tag suggestions from scraped data and URL
function suggestTagsForLink(scrapedData: ScrapedData, url: string): TagSuggestion[] {
  const suggestions = new Map<string, TagSuggestion>(); // lowercase key → suggestion

  const add = (name: string, color: string) => {
    const key = name.toLowerCase();
    if (!suggestions.has(key)) suggestions.set(key, { name, color });
  };

  // Content type → tags
  switch (scrapedData.contentType) {
    case "video":    add("Video", "red"); break;
    case "game":     add("Juego", "purple"); add("Gaming", "violet"); break;
    case "music":    add("Música", "pink"); break;
    case "code":     add("Código", "blue"); add("Desarrollo", "cyan"); break;
    case "article":  add("Artículo", "orange"); add("Lectura", "amber"); break;
    case "social":   add("Social", "sky"); break;
    case "shopping": add("Tienda", "green"); add("Compras", "emerald"); break;
    case "image":    add("Imagen", "pink"); break;
    case "document": add("Documento", "slate"); break;
    case "tool":     add("Herramienta", "teal"); break;
  }

  // Platform → tags
  const platformMap: Record<string, [string, string][]> = {
    youtube:       [["YouTube", "red"]],
    github:        [["GitHub", "slate"], ["Open Source", "blue"]],
    twitter:       [["Twitter", "sky"]],
    x:             [["Twitter", "sky"]],
    reddit:        [["Reddit", "orange"]],
    stackoverflow: [["Stack Overflow", "orange"]],
    medium:        [["Medium", "gray"]],
    devto:         [["Dev.to", "slate"]],
    twitch:        [["Twitch", "violet"], ["Streaming", "purple"]],
    spotify:       [["Spotify", "green"]],
    steam:         [["Steam", "blue"]],
    figma:         [["Figma", "violet"], ["Diseño", "pink"]],
    npmjs:         [["npm", "red"]],
    vercel:        [["Vercel", "slate"]],
    netlify:       [["Netlify", "teal"]],
    codepen:       [["CodePen", "slate"]],
    codesandbox:   [["CodeSandbox", "blue"]],
    linkedin:      [["LinkedIn", "blue"]],
    wikipedia:     [["Wikipedia", "gray"]],
    amazon:        [["Amazon", "orange"], ["Compras", "green"]],
    nintendo:      [["Nintendo", "red"]],
  };

  if (scrapedData.platform && scrapedData.platform !== "generic") {
    const ptTags = platformMap[scrapedData.platform];
    if (ptTags) ptTags.forEach(([n, c]) => add(n, c));
  }

  // URL domain/path keyword detection
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace("www.", "").toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    if (domain.includes("blog") || path.includes("/blog")) add("Blog", "orange");
    if (domain.includes("docs") || path.includes("/docs") || domain.includes("documentation")) add("Documentación", "blue");
    if (domain.includes("tutorial") || path.includes("tutorial") || path.includes("/learn") || path.includes("/course")) add("Tutorial", "amber");
    if (domain.includes("design") || domain.includes("dribbble") || domain.includes("behance") || domain.includes("awwwards")) add("Diseño", "pink");
    if (domain.includes("openai") || domain.includes("anthropic") || domain.includes("huggingface") || domain.includes("replicate")) add("IA", "violet");
    if (domain.includes("pypi") || domain.includes("crates.io")) add("Librería", "blue");
    if (domain.includes("udemy") || domain.includes("coursera") || domain.includes("edx") || domain.includes("pluralsight") || domain.includes("egghead")) add("Curso", "amber");
    if (domain.includes("security") || domain.includes("hack") || domain.includes("cyber")) add("Seguridad", "red");
    if (domain.includes("cloud") || (domain.includes("aws.") && !domain.includes("github")) || domain.includes("azure.") || domain.includes("gcloud")) add("Cloud", "sky");
  } catch {
    // URL inválida, omitir detección de dominio
  }

  // Extracción de palabras clave del título
  if (scrapedData.title) {
    const title = scrapedData.title.toLowerCase();

    if (title.includes("tutorial") || title.includes("how to") || title.includes("cómo") || title.includes("guía") || title.includes("guia")) {
      add("Tutorial", "amber");
    }
    if (title.includes("react") || title.includes("vue") || title.includes("angular") || title.includes("svelte") || title.includes("next.js") || title.includes("nextjs")) {
      add("Frontend", "cyan");
    }
    if (title.includes("node.js") || title.includes("nodejs") || title.includes("express") || title.includes("fastapi") || title.includes("django") || title.includes("laravel")) {
      add("Backend", "green");
    }
    if (title.includes("typescript") || title.includes(" ts ") || title.includes(".tsx")) {
      add("TypeScript", "blue");
    }
    if (title.includes("python")) {
      add("Python", "yellow");
    }
    if (title.includes("javascript") || title.includes(" js ") || title.includes(".jsx")) {
      add("JavaScript", "yellow");
    }
    if (title.includes(" ai ") || title.includes("machine learning") || title.includes("llm") || title.includes("gpt") || title.includes("claude") || title.includes("artificial intelligence") || title.includes("inteligencia artificial")) {
      add("IA", "violet");
    }
    if (title.includes("database") || title.includes("sql") || title.includes("mongodb") || title.includes("postgres") || title.includes("redis")) {
      add("Base de datos", "emerald");
    }
    if (title.includes("css") || title.includes("html") || title.includes("tailwind") || title.includes("sass") || title.includes("bootstrap")) {
      add("CSS", "blue");
    }
    if (title.includes("docker") || title.includes("kubernetes") || title.includes("devops") || title.includes("ci/cd")) {
      add("DevOps", "orange");
    }
    if (title.includes("design") || title.includes("diseño") || (title.includes(" ui ") && !suggestions.has("diseño")) || (title.includes(" ux ") && !suggestions.has("diseño"))) {
      add("Diseño", "pink");
    }
    if (title.includes("free") || title.includes("gratis") || title.includes("gratuito") || title.includes("open source")) {
      add("Gratis", "green");
    }
    if (title.includes("portfolio") || title.includes("inspiración") || title.includes("inspiration") || title.includes("showcase")) {
      add("Inspiración", "rose");
    }
    if (title.includes("security") || title.includes("seguridad") || title.includes("vulnerability") || title.includes("hacking") || title.includes("pentest")) {
      add("Seguridad", "red");
    }
    if (title.includes("game") || title.includes("juego") || title.includes("gaming") || title.includes("indie")) {
      add("Juego", "purple");
    }
    if (title.includes("resource") || title.includes("recurso") || title.includes("awesome") || (title.includes("tool") && !suggestions.has("herramienta"))) {
      add("Herramienta", "teal");
    }
    if (title.includes(" api ") || title.includes("rest api") || title.includes("graphql") || title.includes("endpoint")) {
      add("API", "indigo");
    }
    if (title.includes("curso") || title.includes("course") || title.includes("bootcamp") || title.includes("aprende") || (title.includes("learn") && !suggestions.has("tutorial"))) {
      add("Curso", "amber");
    }
  }

  return Array.from(suggestions.values()).slice(0, 8);
}

export function AddLinkModal() {
  const isAddLinkModalOpen = useLinksStore((state) => state.isAddLinkModalOpen);
  const prefillLinkData = useLinksStore((state) => state.prefillLinkData);
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [scrapedData, setScrapedData] = useState<ScrapedData | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [suggestedTags, setSuggestedTags] = useState<TagSuggestion[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<Set<string>>(new Set());

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

          // Generate tag suggestions based on scraped data
          const suggestions = suggestTagsForLink(data, watchUrl);
          setSuggestedTags(suggestions);
          // Pre-select all suggestions so the user only has to deselect if needed
          setSelectedTagNames(new Set(suggestions.map((s) => s.name)));
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

  const toggleSuggestedTag = useCallback((name: string) => {
    setSelectedTagNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

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
          categoryId: selectedCategoryIds[0] || values.categoryId || null,
          // Platform detection info
          platform: scrapedData?.platform,
          contentType: scrapedData?.contentType,
          platformColor: scrapedData?.platformColor,
          installCommands: scrapedData?.installCommands ?? null,
        }),
      });

      if (response.ok) {
        const newLink = await response.json();
        useLinksStore.getState().addLink(newLink);

        // Save multi-category associations if more than one category selected
        if (selectedCategoryIds.length > 0) {
          try {
            const lcRes = await fetch("/api/link-categories", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
              credentials: "include",
              body: JSON.stringify({ linkId: newLink.id, categoryIds: selectedCategoryIds }),
            });
            if (lcRes.ok) {
              const newAssocs = selectedCategoryIds.map((cid) => ({ linkId: newLink.id, categoryId: cid }));
              const store = useLinksStore.getState();
              store.setLinkCategories([...store.linkCategories, ...newAssocs]);
            }
          } catch (e) {
            console.error("Error saving link-categories:", e);
          }
        }

        // Process selected tag suggestions
        if (selectedTagNames.size > 0) {
          const existingTags = useLinksStore.getState().tags;

          for (const tagName of Array.from(selectedTagNames)) {
            let tagId: string | null = null;

            // Check if tag already exists (case-insensitive)
            const existingTag = existingTags.find(
              (t) => t.name.toLowerCase() === tagName.toLowerCase() && !t.deletedAt
            );

            if (existingTag) {
              tagId = existingTag.id;
            } else {
              // Create the tag
              try {
                const suggestion = suggestedTags.find((s) => s.name === tagName);
                const tagRes = await fetch("/api/tags", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                  credentials: "include",
                  body: JSON.stringify({ name: tagName, color: suggestion?.color || "blue" }),
                });
                if (tagRes.ok) {
                  const createdTag = await tagRes.json();
                  tagId = createdTag.id;
                }
              } catch (e) {
                console.error("Error creating tag:", e);
              }
            }

            if (tagId) {
              try {
                await fetch("/api/tags/link", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
                  credentials: "include",
                  body: JSON.stringify({ linkId: newLink.id, tagId }),
                });
              } catch (e) {
                console.error("Error associating tag:", e);
              }
            }
          }

          // Refresh store to pick up new tags and link-tag associations
          await useLinksStore.getState().refreshAllData();
        }

        clearDraft();
        toast.success(t("addLink.successCreate"));
        handleClose();
      } else {
        // Try to get the actual error message from the server
        let errorMessage = t("addLink.errorCreate");
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          if (errorData.details) {
            errorMessage += `: ${errorData.details}`;
          }
        } catch {
          errorMessage = `Error ${response.status}: ${response.statusText || errorMessage}`;
        }
        console.error("Error creating link:", errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error("Error creating link:", error);
      toast.error(t("addLink.errorSave"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    form.reset();
    setScrapedData(null);
    setSelectedCategoryIds([]);
    setSuggestedTags([]);
    setSelectedTagNames(new Set());
    useLinksStore.getState().closeAddLinkModal();
  };

  return (
    <Dialog open={isAddLinkModalOpen} onOpenChange={(open) => useLinksStore.getState().setAddLinkModalOpen(open)}>
      <DialogContent className="sm:max-w-lg glass max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" />
            {t("addLink.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addLink.description")}
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
                      {t("addLink.draftSaved")}
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
                      {t("btn.discard")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={restoreDraft}
                      className="h-7 px-2 text-xs bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      {t("btn.restore")}
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
                        placeholder={t("addLink.urlPlaceholder")}
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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
                          {scrapedData.platformLabel || t(contentTypeKeys[scrapedData.contentType || "website"])}
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        {t("addLink.preview")}
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
                          {t(contentTypeKeys[scrapedData.contentType || "website"])}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {scrapedData.imageUrl && !["video", "game", "music"].includes(scrapedData.contentType || "") && (
                        /* eslint-disable-next-line @next/next/no-img-element */
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
                              {t("addLink.by")} {scrapedData.author}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Suggested Tags */}
            <AnimatePresence>
              {suggestedTags.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2 overflow-hidden"
                >
                  <div className="flex items-center gap-1.5">
                    <Tags className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium">{t("addLink.suggestedTags")}</span>
                    {selectedTagNames.size > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs py-0">
                        {selectedTagNames.size} {t("addLink.tagsSelected")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("addLink.suggestedTagsHint")}</p>
                  <div className="flex flex-wrap gap-3 pt-2 pr-2 pb-1 pl-1">
                    {suggestedTags.map((tag) => {
                      const isSelected = selectedTagNames.has(tag.name);
                      return (
                        <button
                          key={tag.name}
                          type="button"
                          onClick={() => toggleSuggestedTag(tag.name)}
                          className={cn(
                            "relative p-0 leading-none rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-primary/50",
                            !isSelected && "opacity-50 hover:opacity-80"
                          )}
                        >
                          {isSelected && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center z-10 ring-1 ring-background pointer-events-none">
                              <Check className="w-2.5 h-2.5 text-primary-foreground" />
                            </span>
                          )}
                          <TagBadge
                            name={tag.name}
                            color={tag.color}
                            size="sm"
                            className={cn("transition-all", isSelected && "ring-2 ring-primary/60")}
                          />
                        </button>
                      );
                    })}
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
                  <FormLabel>{t("addLink.linkTitle")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("addLink.titlePlaceholder")} {...field} />
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
                  <FormLabel>{t("addLink.descriptionLabel")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("addLink.descriptionPlaceholder")}
                      className="resize-none"
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category Select (multi) */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("addLink.categories")}</label>
              <MultiCategorySelector
                selectedCategoryIds={selectedCategoryIds}
                onCategoriesChange={setSelectedCategoryIds}
              />
            </div>

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
                      {field.value ? t("addLink.favorite") : t("addLink.addToFavorites")}
                    </Button>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={handleClose}>
                {t("btn.cancel")}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t("addLink.saveLink")}
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
