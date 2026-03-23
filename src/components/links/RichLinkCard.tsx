"use client";

import { memo, useMemo, useState, useCallback } from "react";
import { toast } from "sonner";
import { useSettingsStore } from "@/stores/settings-store";
import { useLinksStore } from "@/stores/links-store";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import {
  Star,
  ExternalLink,
  Play,
  Gamepad2,
  Music,
  Code,
  BookOpen,
  Users,
  ShoppingCart,
  Image as ImageIcon,
  FileText,
  Wrench,
  Globe,
  Pencil,
  Check,
  Archive,
  StickyNote,
  BookOpenText,
  Copy,
  Trash2,
  FolderInput,
  BookMarked,
  Inbox,
  BookOpenCheck,
} from "lucide-react";
import { ReaderModeModal } from "@/components/modals/ReaderModeModal";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/desktop";
import { useTranslation } from "@/lib/i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import type { Link } from "@/lib/db/schema";
import type { ContentType } from "@/lib/platform-detection";

/** Genera un gradiente determinístico + icono cuando la imagen del enlace falla o no existe */
function generateFallbackStyle(url: string, title: string) {
  // Hash simple de la URL para generar colores consistentes
  let hash = 0;
  const str = url + title;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + (Math.abs(hash >> 8) % 60)) % 360;
  return {
    background: `linear-gradient(135deg, oklch(0.35 0.12 ${hue1}), oklch(0.25 0.08 ${hue2}))`,
  };
}

/** Icono de fallback según contentType */
function FallbackIcon({ contentType, className }: { contentType: string; className?: string }) {
  const iconClass = cn("text-white/40", className);
  switch (contentType) {
    case "video": return <Play className={iconClass} />;
    case "game": return <Gamepad2 className={iconClass} />;
    case "music": return <Music className={iconClass} />;
    case "code": return <Code className={iconClass} />;
    case "article": return <FileText className={iconClass} />;
    case "image": return <ImageIcon className={iconClass} />;
    case "tool": return <Wrench className={iconClass} />;
    case "shop": return <ShoppingCart className={iconClass} />;
    default: return <Globe className={iconClass} />;
  }
}

interface RichLinkCardProps {
  link: Link;
  isEditMode?: boolean;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
  onDelete?: () => void;
  variant?: "default" | "compact" | "large";
  showImage?: boolean;
}

// Content type icon mapping
const contentTypeIcons: Record<ContentType, typeof Play> = {
  video: Play,
  game: Gamepad2,
  music: Music,
  code: Code,
  article: BookOpen,
  social: Users,
  shopping: ShoppingCart,
  image: ImageIcon,
  document: FileText,
  tool: Wrench,
  website: Globe,
};

// Content type label keys for i18n
const contentTypeLabelKeys: Record<ContentType, string> = {
  video: "contentType.video",
  game: "contentType.game",
  music: "contentType.music",
  code: "contentType.code",
  article: "contentType.article",
  social: "contentType.social",
  shopping: "contentType.shopping",
  image: "contentType.image",
  document: "contentType.document",
  tool: "contentType.tool",
  website: "contentType.website",
};

export const RichLinkCard = memo(function RichLinkCard({
  link,
  isEditMode = false,
  onEdit,
  onToggleFavorite,
  onDelete,
  variant = "default",
  showImage = true,
}: RichLinkCardProps) {
  const { t } = useTranslation();
  const thumbnailSize = useSettingsStore((state) => state.thumbnailSize);
  const linkClickBehavior = useSettingsStore((state) => state.linkClickBehavior);
  const isSelecting = useMultiSelect((state) => state.isSelecting);
  const isItemSelected = useMultiSelect((state) => state.isSelected(link.id));
  const categories = useLinksStore((state) => state.categories);
  const [readerOpen, setReaderOpen] = useState(false);

  const handleOpenReader = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setReaderOpen(true);
  }, []);

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(link.url).then(() => {
      toast.success(t("richLink.copyUrlSuccess"));
    });
  }, [link.url, t]);

  const handleCopyMarkdown = useCallback(() => {
    navigator.clipboard.writeText(`[${link.title}](${link.url})`).then(() => {
      toast.success(t("richLink.copyMarkdownSuccess"));
    });
  }, [link.title, link.url, t]);

  const handleUpdateReadingStatus = useCallback(async (status: string) => {
    try {
      const res = await fetch(`/api/links/${link.id}/reading-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify({ readingStatus: status }),
      });
      if (!res.ok) throw new Error();
      useLinksStore.getState().updateLink(link.id, { readingStatus: status } as Partial<Link>);
      toast.success(t("richLink.readingStatusUpdated"));
      await useLinksStore.getState().refreshAllData();
    } catch {
      toast.error(t("richLink.readingStatusError"));
    }
  }, [link.id, t]);

  const handleMoveToCategory = useCallback(async (categoryId: string | null) => {
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify({ categoryId }),
      });
      if (!res.ok) throw new Error();
      const catName = categoryId
        ? categories.find((c) => c.id === categoryId)?.name ?? ""
        : t("richLink.noCategory");
      useLinksStore.getState().updateLink(link.id, { categoryId } as Partial<Link>);
      toast.success(t("richLink.movedToCategory", { category: catName }));
      await useLinksStore.getState().refreshAllData();
    } catch {
      toast.error(t("richLink.moveCategoryError"));
    }
  }, [link.id, categories, t]);

  const handleDeleteLink = useCallback(async () => {
    if (onDelete) {
      onDelete();
      return;
    }
    const confirmed = await showConfirm({
      title: t("richLink.delete"),
      description: t("editLink.deleteLinkDesc"),
      variant: "destructive",
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      useLinksStore.getState().removeLink(link.id);
      toast.success(t("richLink.deleteSuccess"));
      await useLinksStore.getState().refreshAllData();
    } catch {
      toast.error(t("richLink.deleteError"));
    }
  }, [link.id, onDelete, t]);

  // thumbnailSize="none" hides all images; other values scale the preview
  const effectiveShowImage = thumbnailSize !== "none" && showImage;
  const linkTarget = (isEditMode || isSelecting) ? undefined : (linkClickBehavior === "same-tab" ? "_self" : "_blank");
  const thumbnailHeightClass =
    thumbnailSize === "small" ? "aspect-[3/1]" :
    thumbnailSize === "large" ? "aspect-[4/3]" :
    "aspect-video"; // medium (default)

  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const fallbackStyle = useMemo(() => generateFallbackStyle(link.url, link.title), [link.url, link.title]);

  const contentType = (link.contentType as ContentType) || "website";
  const ContentIcon = contentTypeIcons[contentType] || Globe;
  const platformColor = link.platformColor || "#6B7280";

  const handleClick = (e: React.MouseEvent) => {
    if (isSelecting) {
      e.preventDefault();
      useMultiSelect.getState().toggleItem(link.id);
      return;
    }
    if (isEditMode && onEdit) {
      e.preventDefault();
      onEdit();
    }
  };

  // Checkbox overlay shown when in multi-select mode
  const SelectionCheckbox = (
    <div
      className={cn(
        "absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-all z-10",
        isItemSelected
          ? "bg-primary border-primary"
          : "bg-background/80 border-muted-foreground/50 backdrop-blur-sm"
      )}
    >
      {isItemSelected && <Check className="w-3 h-3 text-primary-foreground" />}
    </div>
  );

  // Shared context menu content for both variants
  const linkContextMenu = (
    <ContextMenuContent>
      <ContextMenuItem onClick={handleCopyUrl}>
        <Copy className="w-4 h-4" />
        {t("richLink.copyUrl")}
      </ContextMenuItem>
      <ContextMenuItem onClick={handleCopyMarkdown}>
        <FileText className="w-4 h-4" />
        {t("richLink.copyMarkdown")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => openExternalUrl(`https://web.archive.org/web/*/${link.url}`)}>
        <Archive className="w-4 h-4" />
        {t("richLink.openWayback")}
      </ContextMenuItem>
      <ContextMenuItem onClick={() => setReaderOpen(true)}>
        <BookOpenText className="w-4 h-4" />
        {t("richLink.readerView")}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => onToggleFavorite?.()}>
        <Star className={cn("w-4 h-4", link.isFavorite && "text-yellow-500 fill-yellow-500")} />
        {link.isFavorite ? t("richLink.removeFavorite") : t("richLink.addFavorite")}
      </ContextMenuItem>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <BookMarked className="w-4 h-4" />
          {t("richLink.readingStatus")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => handleUpdateReadingStatus("inbox")}>
            <Inbox className={cn("w-4 h-4", (!link.readingStatus || link.readingStatus === "inbox") && "text-primary")} />
            {t("richLink.readingInbox")}
            {(!link.readingStatus || link.readingStatus === "inbox") && <Check className="w-3 h-3 ml-auto" />}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleUpdateReadingStatus("reading")}>
            <BookOpen className={cn("w-4 h-4", link.readingStatus === "reading" && "text-amber-500")} />
            {t("richLink.readingReading")}
            {link.readingStatus === "reading" && <Check className="w-3 h-3 ml-auto" />}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => handleUpdateReadingStatus("done")}>
            <BookOpenCheck className={cn("w-4 h-4", link.readingStatus === "done" && "text-green-500")} />
            {t("richLink.readingDone")}
            {link.readingStatus === "done" && <Check className="w-3 h-3 ml-auto" />}
          </ContextMenuItem>
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSub>
        <ContextMenuSubTrigger>
          <FolderInput className="w-4 h-4" />
          {t("richLink.moveToCategory")}
        </ContextMenuSubTrigger>
        <ContextMenuSubContent>
          <ContextMenuItem onClick={() => handleMoveToCategory(null)}>
            {t("richLink.noCategory")}
            {!link.categoryId && <Check className="w-3 h-3 ml-auto" />}
          </ContextMenuItem>
          {categories.filter((c) => !c.deletedAt).map((cat) => (
            <ContextMenuItem key={cat.id} onClick={() => handleMoveToCategory(cat.id)}>
              {cat.name}
              {link.categoryId === cat.id && <Check className="w-3 h-3 ml-auto" />}
            </ContextMenuItem>
          ))}
        </ContextMenuSubContent>
      </ContextMenuSub>
      <ContextMenuSeparator />
      <ContextMenuItem variant="destructive" onClick={handleDeleteLink}>
        <Trash2 className="w-4 h-4" />
        {t("richLink.delete")}
      </ContextMenuItem>
    </ContextMenuContent>
  );

  // Determine if we should show a large image preview
  const hasRichPreview = link.imageUrl && ["video", "game", "music"].includes(contentType);

  if (variant === "large" || hasRichPreview) {
    return (
      <ContextMenu>
      <ContextMenuTrigger asChild>
      <a
        href={(isEditMode || isSelecting) ? undefined : link.url}
        target={linkTarget}
        rel={(isEditMode || isSelecting) ? undefined : "noopener noreferrer"}
        onClick={handleClick}
        className={cn(
          "group/link block rounded-xl overflow-hidden transition-all duration-200 relative",
          "hover:shadow-lg hover:-translate-y-0.5",
          isSelecting && "cursor-pointer",
          isSelecting && isItemSelected && "ring-2 ring-primary",
          isEditMode
            ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/50"
            : ""
        )}
      >
        {isSelecting && SelectionCheckbox}
        {/* Large Image Preview */}
        {effectiveShowImage && link.imageUrl && (
          <div className={cn("relative w-full overflow-hidden bg-secondary", thumbnailHeightClass)}>
            {/* Fallback: gradiente + icono (oculto hasta que la imagen falle) */}
            <div
              className="absolute inset-0 flex items-center justify-center hidden"
              data-fallback
              style={fallbackStyle}
            >
              <FallbackIcon contentType={contentType} className="w-10 h-10" />
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={link.imageUrl}
              alt={link.title}
              className="w-full h-full object-cover transition-transform group-hover/link:scale-105"
              loading="lazy"
              decoding="async"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                // Mostrar el fallback de gradiente
                const fallback = e.currentTarget.parentElement?.querySelector("[data-fallback]") as HTMLElement;
                if (fallback) fallback.classList.remove("hidden");
              }}
            />
            {/* Play button overlay for videos */}
            {contentType === "video" && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover/link:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                  <Play className="w-8 h-8 text-black ml-1" fill="currentColor" />
                </div>
              </div>
            )}
            {/* Platform badge */}
            {link.platform && link.platform !== "generic" && (
              <div
                className="absolute top-2 left-2 px-2 py-1 rounded-md text-xs font-medium text-white flex items-center gap-1"
                style={{ backgroundColor: platformColor }}
              >
                <ContentIcon className="w-3 h-3" />
                {link.siteName || t(contentTypeLabelKeys[contentType])}
              </div>
            )}
            {/* Interactive Favorite star */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleFavorite?.();
                  }}
                  aria-label={link.isFavorite ? t("richLink.removeFavorite") : t("richLink.addFavorite")}
                  className={cn(
                    "absolute top-2 right-2 p-1.5 rounded-full transition-all hover:scale-110 active:scale-95",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                    link.isFavorite
                      ? "bg-black/20 backdrop-blur-sm"
                      : "bg-black/30 backdrop-blur-sm opacity-0 group-hover/link:opacity-100"
                  )}
                >
                  <Star className={cn(
                    "w-5 h-5 drop-shadow-lg transition-colors",
                    link.isFavorite
                      ? "text-yellow-400 fill-yellow-400"
                      : "text-white/80 hover:text-yellow-400"
                  )} />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {link.isFavorite ? t("richLink.removeFavorite") : t("richLink.addFavorite")}
              </TooltipContent>
            </Tooltip>
            {/* Edit indicator */}
            {isEditMode && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground text-xs flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
                {t("richLink.edit")}
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3 bg-card">
          <div className="flex items-start gap-2">
            {/* Favicon */}
            {link.faviconUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={link.faviconUrl}
                alt=""
                className="w-4 h-4 mt-0.5 rounded-sm flex-shrink-0"
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm line-clamp-2 group-hover/link:text-primary transition-colors">
                {link.title}
              </h4>
              {link.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {link.description}
                </p>
              )}
              {/* Resumen generado por IA */}
              {link.summary && (
                <p className="text-[11px] text-muted-foreground/70 italic line-clamp-3 mt-1.5 leading-relaxed">
                  {link.summary}
                </p>
              )}
              {/* Etiquetas semánticas generadas por IA */}
              {link.semanticTags && (() => {
                try {
                  const parsed = JSON.parse(link.semanticTags) as string[];
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {parsed.slice(0, 8).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground/70"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    );
                  }
                } catch { /* JSON inválido — no mostrar */ }
                return null;
              })()}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="truncate">{hostname}</span>
                {link.author && (
                  <>
                    <span>•</span>
                    <span className="truncate">{link.author}</span>
                  </>
                )}
                {/* Reading status indicator */}
                {link.readingStatus === "reading" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.statusReading")}</TooltipContent>
                  </Tooltip>
                )}
                {link.readingStatus === "done" && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.statusDone")}</TooltipContent>
                  </Tooltip>
                )}
                {/* Notes indicator */}
                {link.notes && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-shrink-0">
                        <StickyNote className="w-3 h-3 text-muted-foreground/60" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.hasNotes")}</TooltipContent>
                  </Tooltip>
                )}
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleOpenReader}
                        aria-label="Vista de lectura"
                        className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <BookOpenText className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Vista de lectura</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openExternalUrl(`https://web.archive.org/web/*/${link.url}`);
                        }}
                        aria-label={t("richLink.waybackMachine")}
                        className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <Archive className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.waybackMachine")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyUrl();
                        }}
                        aria-label={t("richLink.copyUrl")}
                        className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.copyUrl")}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleCopyMarkdown();
                        }}
                        aria-label={t("richLink.copyMarkdown")}
                        className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                      >
                        <FileText className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t("richLink.copyMarkdown")}</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </div>
        {readerOpen && (
          <ReaderModeModal
            open={readerOpen}
            onOpenChange={setReaderOpen}
            linkId={link.id}
            linkUrl={link.url}
            linkTitle={link.title}
          />
        )}
      </a>
      </ContextMenuTrigger>
      {linkContextMenu}
      </ContextMenu>
    );
  }

  // Default/Compact variant
  return (
    <ContextMenu>
    <ContextMenuTrigger asChild>
    <a
      href={(isEditMode || isSelecting) ? undefined : link.url}
      target={linkTarget}
      rel={(isEditMode || isSelecting) ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      className={cn(
        "group/link flex w-full rounded-lg transition-all duration-200 relative",
        isSelecting ? "gap-2 p-2 pl-6" : "gap-2 p-2",
        isSelecting && "cursor-pointer",
        isSelecting && isItemSelected && "bg-primary/10 ring-1 ring-primary",
        isEditMode
          ? "hover:bg-primary/10 cursor-pointer border border-transparent hover:border-primary/30 hover:scale-[1.02]"
          : !isSelecting && "hover:bg-secondary/50 hover:translate-x-0.5"
      )}
    >
      {isSelecting && (
        <div
          className={cn(
            "absolute top-1/2 -translate-y-1/2 left-1 w-4 h-4 rounded border-2 flex items-center justify-center transition-all z-10 flex-shrink-0",
            isItemSelected
              ? "bg-primary border-primary"
              : "bg-background/80 border-muted-foreground/50"
          )}
        >
          {isItemSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </div>
      )}
      {/* Thumbnail or Favicon */}
      <div
        className="flex-shrink-0 rounded-md overflow-hidden bg-secondary flex items-center justify-center w-10 h-10"
        style={!link.imageUrl && !link.faviconUrl ? fallbackStyle : undefined}
      >
        {effectiveShowImage && link.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={link.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              // Aplicar gradiente al contenedor
              const parent = e.currentTarget.parentElement;
              if (parent) {
                Object.assign(parent.style, fallbackStyle);
              }
              // Mostrar el icono fallback
              e.currentTarget.parentElement?.querySelector("[data-icon-fallback]")?.classList.remove("hidden");
            }}
          />
        ) : null}
        {link.faviconUrl && !(effectiveShowImage && link.imageUrl) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={link.faviconUrl}
            alt=""
            className="w-5 h-5"
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const parent = e.currentTarget.parentElement;
              if (parent) {
                Object.assign(parent.style, fallbackStyle);
              }
              e.currentTarget.parentElement?.querySelector("[data-icon-fallback]")?.classList.remove("hidden");
            }}
          />
        ) : null}
        <ContentIcon
          data-icon-fallback=""
          className={cn(
            "w-4 h-4",
            ((effectiveShowImage && link.imageUrl) || link.faviconUrl)
              ? "hidden text-white/60"
              : "text-white/60"
          )}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-medium text-sm truncate group-hover/link:text-primary transition-colors">
            {link.title}
          </h4>
          {/* Interactive favorite star */}
          <Tooltip>
          <TooltipTrigger asChild>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            aria-label={link.isFavorite ? t("richLink.removeFavorite") : t("richLink.addFavorite")}
            className={cn(
              "flex-shrink-0 p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              !link.isFavorite && "opacity-0 group-hover/link:opacity-60 hover:!opacity-100"
            )}
          >
            <Star className={cn(
              "w-3 h-3 transition-colors",
              link.isFavorite
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground hover:text-yellow-500"
            )} />
          </button>
          </TooltipTrigger>
          <TooltipContent>
            {link.isFavorite ? t("richLink.removeFavorite") : t("richLink.addFavorite")}
          </TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Platform badge */}
          {link.platform && link.platform !== "generic" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white flex items-center gap-0.5"
              style={{ backgroundColor: platformColor }}
            >
              <ContentIcon className="w-2.5 h-2.5" />
              {t(contentTypeLabelKeys[contentType])}
            </span>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {hostname}
          </span>
          {/* Reading status indicator */}
          {link.readingStatus === "reading" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>{t("richLink.statusReading")}</TooltipContent>
            </Tooltip>
          )}
          {link.readingStatus === "done" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>{t("richLink.statusDone")}</TooltipContent>
            </Tooltip>
          )}
          {/* Notes indicator */}
          {link.notes && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex-shrink-0">
                  <StickyNote className="w-3 h-3 text-muted-foreground/60" />
                </span>
              </TooltipTrigger>
              <TooltipContent>{t("richLink.hasNotes")}</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Actions */}
      {isEditMode ? (
        <Pencil className="w-4 h-4 text-primary opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0 mt-2" />
      ) : (
        <div className="flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0 mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleOpenReader}
                aria-label="Vista de lectura"
                className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <BookOpenText className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Vista de lectura</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  openExternalUrl(`https://web.archive.org/web/*/${link.url}`);
                }}
                aria-label={t("richLink.waybackMachine")}
                className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <Archive className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("richLink.waybackMachine")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyUrl();
                }}
                aria-label={t("richLink.copyUrl")}
                className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <Copy className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("richLink.copyUrl")}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyMarkdown();
                }}
                aria-label={t("richLink.copyMarkdown")}
                className="p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <FileText className="w-3.5 h-3.5 text-muted-foreground/40 hover:text-primary transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("richLink.copyMarkdown")}</TooltipContent>
          </Tooltip>
          <ExternalLink className="w-4 h-4 text-muted-foreground/40" />
        </div>
      )}
      <ReaderModeModal
        open={readerOpen}
        onOpenChange={setReaderOpen}
        linkId={link.id}
        linkUrl={link.url}
        linkTitle={link.title}
      />
    </a>
    </ContextMenuTrigger>
    {linkContextMenu}
    </ContextMenu>
  );
});

// Grid variant for displaying multiple rich links
export function RichLinkGrid({
  links,
  isEditMode = false,
  onEdit,
  onToggleFavorite,
  columns = 2,
}: {
  links: Link[];
  isEditMode?: boolean;
  onEdit?: (link: Link) => void;
  onToggleFavorite?: (link: Link) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {links.map((link) => (
        <RichLinkCard
          key={link.id}
          link={link}
          isEditMode={isEditMode}
          onEdit={() => onEdit?.(link)}
          onToggleFavorite={() => onToggleFavorite?.(link)}
          variant="large"
        />
      ))}
    </div>
  );
}
