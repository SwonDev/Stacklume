"use client";

import { memo, useMemo, useCallback, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import {
  Star,
  ExternalLink,
  Trash2,
  Pencil,
  GripVertical,
  Copy,
  FolderInput,
  BookMarked,
  Inbox,
  BookOpen,
  BookOpenCheck,
  Check,
  Globe,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { openExternalUrl } from "@/lib/desktop";
import { useTranslation } from "@/lib/i18n";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import type { Link } from "@/lib/db/schema";

interface KanbanLinkCardProps {
  link: Link;
  linkTags: { tagId: string; name: string; color: string }[];
  isDragging?: boolean;
}

export const KanbanLinkCard = memo(function KanbanLinkCard({
  link,
  linkTags,
  isDragging,
}: KanbanLinkCardProps) {
  const { t } = useTranslation();
  const categories = useLinksStore((state) => state.categories);
  const openEditLinkModal = useLinksStore((state) => state.openEditLinkModal);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: link.id,
    data: {
      type: "link",
      link,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    willChange: "transform" as const,
  };

  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const readingStatusColor = useMemo(() => {
    switch (link.readingStatus) {
      case "reading":
        return "bg-amber-500";
      case "done":
        return "bg-green-500";
      default:
        return "bg-blue-500";
    }
  }, [link.readingStatus]);

  const readingStatusLabel = useMemo(() => {
    switch (link.readingStatus) {
      case "reading":
        return t("kanbanLinkCard.statusReading");
      case "done":
        return t("kanbanLinkCard.statusDone");
      default:
        return t("kanbanLinkCard.statusInbox");
    }
  }, [link.readingStatus, t]);

  const handleOpenUrl = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      openExternalUrl(link.url);
    },
    [link.url]
  );

  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(link.url).then(() => {
      toast.success(t("richLink.copyUrlSuccess"));
    });
  }, [link.url, t]);

  const handleToggleFavorite = useCallback(async () => {
    try {
      const res = await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        credentials: "include",
        body: JSON.stringify({ isFavorite: !link.isFavorite }),
      });
      if (!res.ok) throw new Error();
      useLinksStore.getState().updateLink(link.id, { isFavorite: !link.isFavorite } as Partial<Link>);
      toast.success(
        link.isFavorite
          ? t("kanbanLinkCard.removedFavorite")
          : t("kanbanLinkCard.addedFavorite")
      );
      await useLinksStore.getState().refreshAllData();
    } catch {
      toast.error(t("kanbanLinkCard.favoriteError"));
    }
  }, [link.id, link.isFavorite, t]);

  const handleEdit = useCallback(() => {
    openEditLinkModal(link);
  }, [link, openEditLinkModal]);

  const handleDelete = useCallback(async () => {
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
  }, [link.id, t]);

  const handleUpdateReadingStatus = useCallback(
    async (status: string) => {
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
    },
    [link.id, t]
  );

  const handleMoveToCategory = useCallback(
    async (categoryId: string | null) => {
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
    },
    [link.id, categories, t]
  );

  const [imgError, setImgError] = useState(false);
  const isActive = isDragging || isSortableDragging;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          className={cn(
            "group/lcard flex items-start gap-2 p-2 rounded-lg border border-border/50 bg-card",
            "transition-shadow duration-150",
            "hover:shadow-md hover:border-border",
            isActive && "opacity-50 shadow-xl scale-[1.02] rotate-1"
          )}
        >
          {/* Drag handle */}
          <div
            {...attributes}
            {...listeners}
            className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none mt-0.5"
          >
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 group-hover/lcard:text-muted-foreground transition-colors" />
          </div>

          {/* Favicon */}
          <div className="flex-shrink-0 mt-0.5">
            {!imgError && link.faviconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={link.faviconUrl}
                alt=""
                className="w-4 h-4 rounded-sm"
                loading="lazy"
                decoding="async"
                onError={() => setImgError(true)}
              />
            ) : (
              <Globe className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {/* Reading status dot */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <span
                    className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      readingStatusColor
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top"><p>{readingStatusLabel}</p></TooltipContent>
              </Tooltip>
              <h4 className="text-sm font-medium truncate leading-tight">
                {link.title || hostname}
              </h4>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {hostname}
            </p>
            {/* Tags */}
            {linkTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {linkTags.slice(0, 3).map((tag) => (
                  <span
                    key={tag.tagId}
                    className="text-[10px] px-1.5 py-0 rounded-full border border-border/50 text-muted-foreground leading-relaxed"
                    style={{
                      borderColor: tag.color ? `${tag.color}40` : undefined,
                      color: tag.color || undefined,
                    }}
                  >
                    {tag.name}
                  </span>
                ))}
                {linkTags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground/60">
                    +{linkTags.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Hover actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover/lcard:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleFavorite();
              }}
              className="p-1 rounded-sm hover:bg-secondary transition-colors"
              aria-label={
                link.isFavorite
                  ? t("richLink.removeFavorite")
                  : t("richLink.addFavorite")
              }
            >
              <Star
                className={cn(
                  "w-3.5 h-3.5 transition-colors",
                  link.isFavorite
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground hover:text-yellow-500"
                )}
              />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="p-1 rounded-sm hover:bg-secondary transition-colors"
              aria-label={t("kanbanLinkCard.edit")}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
            </button>
            <button
              type="button"
              onClick={handleOpenUrl}
              className="p-1 rounded-sm hover:bg-secondary transition-colors"
              aria-label={t("kanbanLinkCard.openUrl")}
            >
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </div>
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleCopyUrl}>
          <Copy className="w-4 h-4" />
          {t("richLink.copyUrl")}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleOpenUrl}>
          <ExternalLink className="w-4 h-4" />
          {t("kanbanLinkCard.openUrl")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleToggleFavorite}>
          <Star
            className={cn(
              "w-4 h-4",
              link.isFavorite && "text-yellow-500 fill-yellow-500"
            )}
          />
          {link.isFavorite
            ? t("richLink.removeFavorite")
            : t("richLink.addFavorite")}
        </ContextMenuItem>
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <BookMarked className="w-4 h-4" />
            {t("richLink.readingStatus")}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent>
            <ContextMenuItem onClick={() => handleUpdateReadingStatus("inbox")}>
              <Inbox
                className={cn(
                  "w-4 h-4",
                  (!link.readingStatus || link.readingStatus === "inbox") &&
                    "text-primary"
                )}
              />
              {t("richLink.readingInbox")}
              {(!link.readingStatus || link.readingStatus === "inbox") && (
                <Check className="w-3 h-3 ml-auto" />
              )}
            </ContextMenuItem>
            <ContextMenuItem
              onClick={() => handleUpdateReadingStatus("reading")}
            >
              <BookOpen
                className={cn(
                  "w-4 h-4",
                  link.readingStatus === "reading" && "text-amber-500"
                )}
              />
              {t("richLink.readingReading")}
              {link.readingStatus === "reading" && (
                <Check className="w-3 h-3 ml-auto" />
              )}
            </ContextMenuItem>
            <ContextMenuItem onClick={() => handleUpdateReadingStatus("done")}>
              <BookOpenCheck
                className={cn(
                  "w-4 h-4",
                  link.readingStatus === "done" && "text-green-500"
                )}
              />
              {t("richLink.readingDone")}
              {link.readingStatus === "done" && (
                <Check className="w-3 h-3 ml-auto" />
              )}
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
            {categories
              .filter((c) => !c.deletedAt)
              .map((cat) => (
                <ContextMenuItem
                  key={cat.id}
                  onClick={() => handleMoveToCategory(cat.id)}
                >
                  {cat.name}
                  {link.categoryId === cat.id && (
                    <Check className="w-3 h-3 ml-auto" />
                  )}
                </ContextMenuItem>
              ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleEdit}>
          <Pencil className="w-4 h-4" />
          {t("kanbanLinkCard.edit")}
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onClick={handleDelete}>
          <Trash2 className="w-4 h-4" />
          {t("richLink.delete")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
