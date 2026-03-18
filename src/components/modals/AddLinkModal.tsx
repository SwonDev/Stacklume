"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Wand2,
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

// ─── Detección de comandos de paquetes ────────────────────────────────────────

interface CommandInfo {
  packageName: string;
  manager: string; // npm, pnpm, yarn, pip, brew, etc.
  command: string; // el comando original completo
  registryUrl: string; // URL del registro del paquete
  icon: string; // emoji/label del gestor
}

/** Detecta si el input es un comando de instalación y extrae info del paquete */
function detectCommand(input: string): CommandInfo | null {
  const trimmed = input.trim();
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) return null;

  // Helper: extraer nombre de paquete del comando (soporta @scope/name y name)
  function extractPkg(cmd: string, prefixRe: RegExp): string | null {
    const m = cmd.match(prefixRe);
    if (!m) return null;
    // Después del comando, buscar el nombre del paquete (skip flags como -g, -D)
    const rest = cmd.slice(m[0].length).trim();
    const parts = rest.split(/\s+/).filter(p => !p.startsWith("-"));
    return parts[0]?.replace(/@[^/]*$/, "") || null; // quitar @version al final
  }

  // npm install / npm i / npx
  const npmPkg = extractPkg(trimmed, /^(?:npm\s+(?:install|i|add)|npx)\s+/i);
  if (npmPkg) {
    return { packageName: npmPkg, manager: "npm", command: trimmed, registryUrl: `https://www.npmjs.com/package/${npmPkg}`, icon: "npm" };
  }

  // pnpm add / pnpm i / pnpm install / pnpm dlx
  const pnpmPkg = extractPkg(trimmed, /^pnpm\s+(?:add|install|i|dlx)\s+/i);
  if (pnpmPkg) {
    return { packageName: pnpmPkg, manager: "pnpm", command: trimmed, registryUrl: `https://www.npmjs.com/package/${pnpmPkg}`, icon: "pnpm" };
  }

  // yarn add
  const yarnPkg = extractPkg(trimmed, /^yarn\s+(?:add|global\s+add)\s+/i);
  if (yarnPkg) {
    return { packageName: yarnPkg, manager: "yarn", command: trimmed, registryUrl: `https://www.npmjs.com/package/${yarnPkg}`, icon: "yarn" };
  }

  // bun add / bun i / bunx
  const bunPkg = extractPkg(trimmed, /^(?:bun\s+(?:add|install|i)|bunx)\s+/i);
  if (bunPkg) {
    return { packageName: bunPkg, manager: "bun", command: trimmed, registryUrl: `https://www.npmjs.com/package/${bunPkg}`, icon: "bun" };
  }

  // pip install / pip3 install
  const pipMatch = trimmed.match(/^pip3?\s+install\s+(?:-[UuI]\s+)*([a-zA-Z0-9_-]+)/i);
  if (pipMatch) {
    const pkg = pipMatch[1];
    return { packageName: pkg, manager: "pip", command: trimmed, registryUrl: `https://pypi.org/project/${pkg}/`, icon: "pip" };
  }

  // brew install
  const brewMatch = trimmed.match(/^brew\s+(?:install|cask\s+install)\s+([a-zA-Z0-9_@/-]+)/i);
  if (brewMatch) {
    const pkg = brewMatch[1];
    return { packageName: pkg, manager: "brew", command: trimmed, registryUrl: `https://formulae.brew.sh/formula/${pkg}`, icon: "brew" };
  }

  // cargo install / cargo add
  const cargoMatch = trimmed.match(/^cargo\s+(?:install|add)\s+([a-zA-Z0-9_-]+)/i);
  if (cargoMatch) {
    const pkg = cargoMatch[1];
    return { packageName: pkg, manager: "cargo", command: trimmed, registryUrl: `https://crates.io/crates/${pkg}`, icon: "cargo" };
  }

  // go install
  const goMatch = trimmed.match(/^go\s+install\s+(\S+)/i);
  if (goMatch) {
    const pkg = goMatch[1].replace(/@.*$/, "");
    return { packageName: pkg.split("/").pop() || pkg, manager: "go", command: trimmed, registryUrl: `https://pkg.go.dev/${pkg}`, icon: "go" };
  }

  // gem install
  const gemMatch = trimmed.match(/^gem\s+install\s+([a-zA-Z0-9_-]+)/i);
  if (gemMatch) {
    const pkg = gemMatch[1];
    return { packageName: pkg, manager: "gem", command: trimmed, registryUrl: `https://rubygems.org/gems/${pkg}`, icon: "gem" };
  }

  // composer require
  const composerMatch = trimmed.match(/^composer\s+require\s+([a-zA-Z0-9_/-]+)/i);
  if (composerMatch) {
    const pkg = composerMatch[1];
    return { packageName: pkg, manager: "composer", command: trimmed, registryUrl: `https://packagist.org/packages/${pkg}`, icon: "php" };
  }

  // dotnet add package
  const dotnetMatch = trimmed.match(/^dotnet\s+add\s+package\s+([a-zA-Z0-9_.]+)/i);
  if (dotnetMatch) {
    const pkg = dotnetMatch[1];
    return { packageName: pkg, manager: "dotnet", command: trimmed, registryUrl: `https://www.nuget.org/packages/${pkg}`, icon: "dotnet" };
  }

  return null;
}

const formSchema = z.object({
  url: z.string().min(1, "Introduce una URL o comando"),
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
  const [aiGenerating, setAiGenerating] = useState<"title" | "description" | "tags" | null>(null);
  const [detectedCommand, setDetectedCommand] = useState<CommandInfo | null>(null);
  const commandResolvedUrlRef = useRef<string | null>(null); // Evita loop de scraping al setear URL del registro

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

      // Si la URL fue seteada por la resolución de un comando, no re-scrapear
      if (commandResolvedUrlRef.current === watchUrl) return;

      // Detectar si es un comando de paquete (npm i, pip install, etc.)
      const cmd = detectCommand(watchUrl);
      if (cmd) {
        setDetectedCommand(cmd);
        setIsScraping(true);
        try {
          // Reemplazar el campo URL por la URL del registro
          commandResolvedUrlRef.current = cmd.registryUrl;
          form.setValue("url", cmd.registryUrl);

          // Obtener info del paquete via API del registro (npm, PyPI, crates.io, etc.)
          const response = await fetch("/api/package-info", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packageName: cmd.packageName, manager: cmd.manager }),
          });

          if (response.ok) {
            const data = await response.json() as {
              title: string; description: string; homepage: string; keywords: string[];
            };
            form.setValue("title", data.title || cmd.packageName);
            form.setValue("description",
              data.description
                ? `${data.description}\n\nComando: ${cmd.command}`
                : `Comando: ${cmd.command}`
            );

            // Generar etiquetas combinando keywords del paquete + tipo de comando
            const cmdTags: TagSuggestion[] = [
              { name: "Comando", color: "#f59e0b" },
              { name: cmd.manager.toUpperCase(), color: "#3b82f6" },
            ];
            // Añadir keywords del registro como etiquetas (máx 3)
            for (const kw of data.keywords.slice(0, 3)) {
              if (kw.length > 1 && kw.length < 25) {
                cmdTags.push({ name: kw, color: "#10b981" });
              }
            }
            setSuggestedTags(cmdTags);
            setSelectedTagNames(new Set(cmdTags.map((t) => t.name)));
          } else {
            form.setValue("title", cmd.packageName);
            form.setValue("description", `Comando: ${cmd.command}`);
            const cmdTags: TagSuggestion[] = [
              { name: "Comando", color: "#f59e0b" },
              { name: cmd.manager.toUpperCase(), color: "#3b82f6" },
            ];
            setSuggestedTags(cmdTags);
            setSelectedTagNames(new Set(cmdTags.map((t) => t.name)));
          }
        } catch {
          form.setValue("title", cmd.packageName);
          form.setValue("description", `Comando: ${cmd.command}`);
        } finally {
          setIsScraping(false);
        }
        return;
      }

      setDetectedCommand(null);

      // Validar que es una URL válida antes de scrapear
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

  // ─── Generación con IA ──────────────────────────────────────────────────────

  const isDesktop = typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

  const generateWithAI = useCallback(async (type: "title" | "description" | "tags") => {
    const url = form.getValues("url");
    if (!url) {
      toast.error("Introduce una URL primero");
      return;
    }
    setAiGenerating(type);
    try {
      // Obtener puerto LLM desde Tauri
      let llamaPort = 0;
      try {
        const internals = (window as unknown as Record<string, unknown>)
          .__TAURI_INTERNALS__ as { invoke?: (cmd: string, args?: unknown) => Promise<number> } | undefined;
        if (internals?.invoke) {
          llamaPort = await internals.invoke("get_llama_port");
        }
      } catch { /* ignorar */ }

      // Leer preferencia de thinking y familia del modelo
      const thinkingEnabled = localStorage.getItem("stacklume-llm-thinking") === "true";
      let modelFamily = "qwen3";
      try {
        const internals2 = (window as unknown as Record<string, unknown>)
          .__TAURI_INTERNALS__ as { invoke?: (cmd: string) => Promise<{ family?: string } | null> } | undefined;
        if (internals2?.invoke) {
          const info = await internals2.invoke("get_active_model");
          if (info?.family) modelFamily = info.family;
        }
      } catch { /* */ }

      const res = await fetch("/api/llm/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          currentTitle: form.getValues("title"),
          currentDescription: form.getValues("description"),
          type,
          llamaPort,
          enableThinking: thinkingEnabled,
          modelFamily,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      const data = await res.json();

      if (type === "title" && data.result) {
        form.setValue("title", data.result);
      } else if (type === "description" && data.result) {
        form.setValue("description", data.result);
      } else if (type === "tags" && data.tags) {
        // Añadir las etiquetas generadas como sugerencias
        const tagColors = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ef4444", "#ec4899", "#06b6d4", "#84cc16"];
        const newTags: TagSuggestion[] = (data.tags as string[]).map((name: string, i: number) => ({
          name,
          color: tagColors[i % tagColors.length],
        }));
        // Fusionar con sugerencias existentes (evitar duplicados)
        setSuggestedTags((prev) => {
          const existingNames = new Set(prev.map((t) => t.name.toLowerCase()));
          const toAdd = newTags.filter((t) => !existingNames.has(t.name.toLowerCase()));
          return [...prev, ...toAdd];
        });
        // Seleccionar todas las nuevas
        setSelectedTagNames((prev) => {
          const next = new Set(prev);
          newTags.forEach((t) => next.add(t.name));
          return next;
        });
        toast.success(`${(data.tags as string[]).length} etiquetas generadas`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al generar con IA");
    } finally {
      setAiGenerating(null);
    }
  }, [form]);

  const handleClose = () => {
    form.reset();
    setScrapedData(null);
    setDetectedCommand(null);
    commandResolvedUrlRef.current = null;
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
            {/* URL / Command Field */}
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>URL / Comando</FormLabel>
                    {detectedCommand && (
                      <span className="text-[10px] font-medium text-primary flex items-center gap-1">
                        <Code className="w-3 h-3" />
                        {detectedCommand.manager} detectado
                      </span>
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        placeholder="https://... o npm install paquete"
                        {...field}
                        className={cn("pr-10", detectedCommand && "font-mono text-xs")}
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

            {/* AI Tag Generation (when no suggestions or desktop available) */}
            {isDesktop && suggestedTags.length === 0 && form.getValues("url") && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Tags className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium">Etiquetas</span>
                </div>
                <button
                  type="button"
                  onClick={() => generateWithAI("tags")}
                  disabled={aiGenerating !== null}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors border border-dashed border-border rounded-lg px-3 py-2 w-full hover:border-primary/50 disabled:opacity-40"
                >
                  {aiGenerating === "tags" ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>Generar etiquetas con IA</span>
                </button>
              </div>
            )}

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
                    {isDesktop && (
                      <button
                        type="button"
                        onClick={() => generateWithAI("tags")}
                        disabled={aiGenerating !== null || !form.getValues("url")}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        title="Generar más etiquetas con IA"
                      >
                        {aiGenerating === "tags" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        <span>IA</span>
                      </button>
                    )}
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addLink.linkTitle")}</FormLabel>
                    {isDesktop && (
                      <button
                        type="button"
                        onClick={() => generateWithAI("title")}
                        disabled={aiGenerating !== null || !form.getValues("url")}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        title="Generar título con IA"
                      >
                        {aiGenerating === "title" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        <span>IA</span>
                      </button>
                    )}
                  </div>
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
                  <div className="flex items-center justify-between">
                    <FormLabel>{t("addLink.descriptionLabel")}</FormLabel>
                    {isDesktop && (
                      <button
                        type="button"
                        onClick={() => generateWithAI("description")}
                        disabled={aiGenerating !== null || !form.getValues("url")}
                        className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                        title="Generar descripción con IA"
                      >
                        {aiGenerating === "description" ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        <span>IA</span>
                      </button>
                    )}
                  </div>
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
