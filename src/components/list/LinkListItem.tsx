"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Star,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Plus,
  CheckIcon,
  GripVertical,
  Check,
} from "lucide-react";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import type { Link, Tag } from "@/lib/db/schema";
import type { ContentType } from "@/lib/platform-detection";

interface LinkListItemProps {
  link: Link;
  linkTagIds: string[];
  onEdit?: () => void;
  className?: string;
  isDragging?: boolean;
  isOverlay?: boolean;
}

// Content type translation keys (reuse addLink.contentType.* keys)
const contentTypeLabelKeys: Record<ContentType, string> = {
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

// Inner content component used by both regular and sortable versions
export function LinkListItemContent({
  link,
  linkTagIds,
  onEdit,
  className,
  isDragging = false,
  isOverlay = false,
  dragHandleProps,
}: LinkListItemProps & { dragHandleProps?: React.HTMLAttributes<HTMLDivElement> }) {
  const { t } = useTranslation();
  const isSelecting = useMultiSelect((state) => state.isSelecting);
  const isItemSelected = useMultiSelect((state) => state.isSelected(link.id));
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const tags = useLinksStore((state) => state.tags);
  const updateLink = useLinksStore((state) => state.updateLink);
  const removeLink = useLinksStore((state) => state.removeLink);
  const addLinkTag = useLinksStore((state) => state.addLinkTag);
  const removeLinkTag = useLinksStore((state) => state.removeLinkTag);
  const openEditLinkModal = useLinksStore((state) => state.openEditLinkModal);
  const viewDensity = useSettingsStore((state) => state.viewDensity);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const linkClickBehavior = useSettingsStore((state) => state.linkClickBehavior);
  const confirmBeforeDelete = useSettingsStore((state) => state.confirmBeforeDelete);
  const thumbnailSize = useSettingsStore((state) => state.thumbnailSize);

  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const contentType = (link.contentType as ContentType) || "website";
  const platformColor = link.platformColor || "#6B7280";

  // Filter tags based on search
  const filteredTags = useMemo(() => {
    const availableTags = tags.filter((tag: Tag) => !linkTagIds.includes(tag.id));
    if (!tagSearch.trim()) return availableTags;
    return availableTags.filter((tag: Tag) =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tags, linkTagIds, tagSearch]);

  const selectedTags = useMemo(() => {
    return tags.filter((tag: Tag) => linkTagIds.includes(tag.id));
  }, [tags, linkTagIds]);

  // Handle tag toggle
  const handleTagToggle = useCallback(async (tagId: string, isSelected: boolean) => {
    try {
      if (isSelected) {
        // Remove tag
        await fetch(`/api/tags/link?linkId=${link.id}&tagId=${tagId}`, {
          method: "DELETE",
          headers: getCsrfHeaders(),
          credentials: "include",
        });
        removeLinkTag(link.id, tagId);
      } else {
        // Add tag
        await fetch("/api/tags/link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCsrfHeaders(),
          },
          credentials: "include",
          body: JSON.stringify({ linkId: link.id, tagId }),
        });
        addLinkTag(link.id, tagId);
      }
    } catch (error) {
      console.error("Error toggling tag:", error);
    }
  }, [link.id, addLinkTag, removeLinkTag]);

  // Handle favorite toggle
  const handleFavoriteToggle = useCallback(async () => {
    try {
      const newValue = !link.isFavorite;
      await fetch(`/api/links/${link.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ isFavorite: newValue }),
      });
      updateLink(link.id, { isFavorite: newValue });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [link.id, link.isFavorite, updateLink]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (confirmBeforeDelete) {
      const ok = await showConfirm({
        title: t("listView.confirmDeleteTitle"),
        description: t("listView.confirmDelete"),
        confirmLabel: t("btn.delete"),
        cancelLabel: t("btn.cancel"),
        variant: "destructive",
      });
      if (!ok) return;
    }
    try {
      await fetch(`/api/links/${link.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      removeLink(link.id);
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  }, [link.id, removeLink, t, confirmBeforeDelete]);

  // Handle edit
  const handleEdit = useCallback(() => {
    openEditLinkModal(link);
    onEdit?.();
  }, [link, openEditLinkModal, onEdit]);

  // Copy URL
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(link.url);
  }, [link.url]);

  // Density-based styles
  const densityStyles = {
    compact: "py-1.5 px-2",
    normal: "py-2.5 px-3",
    comfortable: "py-3.5 px-4",
  };

  // Favicon sizes controlled by thumbnailSize setting
  const faviconSizeMap: Record<string, Record<string, string>> = {
    none: { compact: "hidden", normal: "hidden", comfortable: "hidden" },
    small: { compact: "w-3.5 h-3.5", normal: "w-4 h-4", comfortable: "w-5 h-5" },
    medium: { compact: "w-4 h-4", normal: "w-5 h-5", comfortable: "w-6 h-6" },
    large: { compact: "w-6 h-6", normal: "w-8 h-8", comfortable: "w-10 h-10" },
  };
  const faviconSizes = faviconSizeMap[thumbnailSize] || faviconSizeMap.medium;

  const titleSizes = {
    compact: "text-xs",
    normal: "text-sm",
    comfortable: "text-base",
  };

  const handleSelectionClick = (e: React.MouseEvent) => {
    if (isSelecting) {
      e.preventDefault();
      e.stopPropagation();
      useMultiSelect.getState().toggleItem(link.id);
    }
  };

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{
        opacity: isDragging && !isOverlay ? 0.4 : 1,
        y: 0,
        scale: isOverlay ? 1.02 : 1,
        boxShadow: isOverlay
          ? "0 10px 30px -5px rgba(0, 0, 0, 0.3), 0 4px 10px -5px rgba(0, 0, 0, 0.2)"
          : "none",
      }}
      exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      onClick={handleSelectionClick}
      className={cn(
        "group flex items-center gap-2 border-b border-border/50 hover:bg-secondary/30 transition-colors",
        densityStyles[viewDensity],
        isOverlay && "bg-card border border-border rounded-lg shadow-lg",
        isSelecting && "cursor-pointer",
        isSelecting && isItemSelected && "bg-primary/10 border-b-primary/20",
        className
      )}
    >
      {/* Selection checkbox (shown in multi-select mode) */}
      {isSelecting && (
        <div
          className={cn(
            "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            isItemSelected
              ? "bg-primary border-primary"
              : "bg-background border-muted-foreground/50"
          )}
        >
          {isItemSelected && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
        </div>
      )}

      {/* Drag handle (hidden in select mode) */}
      {dragHandleProps && !isSelecting && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Favicon — hidden when thumbnailSize is "none" */}
      {thumbnailSize !== "none" && (
        <div className="flex-shrink-0">
          {link.faviconUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={link.faviconUrl}
              alt=""
              className={cn("rounded-sm object-contain", faviconSizes[viewDensity])}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={cn(
              "rounded-sm bg-secondary flex items-center justify-center",
              faviconSizes[viewDensity],
              link.faviconUrl && "hidden"
            )}
          >
            <ExternalLink className="w-3 h-3 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {/* Title and URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={isSelecting ? undefined : link.url}
              target={isSelecting ? undefined : (linkClickBehavior === "same-tab" ? "_self" : "_blank")}
              rel={isSelecting ? undefined : "noopener noreferrer"}
              onClick={isSelecting ? (e) => e.preventDefault() : undefined}
              className={cn(
                "font-medium truncate hover:text-primary transition-colors",
                titleSizes[viewDensity]
              )}
            >
              {link.title}
            </a>
            {link.isFavorite && (
              <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Platform badge */}
            {link.platform && link.platform !== "generic" && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white flex-shrink-0"
                style={{ backgroundColor: platformColor }}
              >
                {t(contentTypeLabelKeys[contentType])}
              </span>
            )}
            <span className="text-xs text-muted-foreground truncate">
              {hostname}
            </span>
          </div>
        </div>

        {/* Tags section */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Show existing tags */}
          {selectedTags.slice(0, 3).map((tag: Tag) => (
            <TagBadge
              key={tag.id}
              name={tag.name}
              color={tag.color || "blue"}
              size="sm"
              onRemove={() => handleTagToggle(tag.id, true)}
            />
          ))}
          {selectedTags.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{selectedTags.length - 3}
            </span>
          )}

          {/* Add tag button */}
          <Tooltip>
            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t("listView.addTag")}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={t("listView.searchTags")}
                  value={tagSearch}
                  onValueChange={setTagSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      {t("listView.noTagsAvailable")}
                    </div>
                  </CommandEmpty>
                  {filteredTags.length > 0 && (
                    <CommandGroup heading={t("listView.availableTags")}>
                      {filteredTags.map((tag: Tag) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.id}
                          onSelect={() => handleTagToggle(tag.id, false)}
                          className="cursor-pointer"
                        >
                          <TagBadge
                            name={tag.name}
                            color={tag.color || "blue"}
                            size="sm"
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {selectedTags.length > 0 && (
                    <CommandGroup heading={t("listView.assignedTags")}>
                      {selectedTags.map((tag: Tag) => (
                        <CommandItem
                          key={tag.id}
                          value={tag.id}
                          onSelect={() => handleTagToggle(tag.id, true)}
                          className="cursor-pointer"
                        >
                          <CheckIcon className="w-3 h-3 mr-2 text-primary" />
                          <TagBadge
                            name={tag.name}
                            color={tag.color || "blue"}
                            size="sm"
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
            </Popover>
            <TooltipContent>{t("listView.addTag")}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleFavoriteToggle}
              aria-label={link.isFavorite ? t("listView.removeFromFavorites") : t("listView.addToFavorites")}
            >
              <Star
                className={cn(
                  "w-4 h-4",
                  link.isFavorite
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                )}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {link.isFavorite ? t("listView.removeFromFavorites") : t("listView.addToFavorites")}
          </TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  aria-label={t("listView.moreOptions")}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>{t("listView.moreOptions")}</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              {t("listView.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyUrl}>
              <Copy className="w-4 h-4 mr-2" />
              {t("listView.copyUrl")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t("listView.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={link.url}
              target={linkClickBehavior === "same-tab" ? "_self" : "_blank"}
              rel="noopener noreferrer"
              aria-label={t("listView.openLink")}
              className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
            >
              <ExternalLink className="w-4 h-4 text-muted-foreground" />
            </a>
          </TooltipTrigger>
          <TooltipContent>{t("listView.openLink")}</TooltipContent>
        </Tooltip>
      </div>
    </motion.div>
  );
}

// Sortable wrapper for LinkListItem
export function SortableLinkListItem({
  link,
  linkTagIds,
  onEdit,
  className,
}: LinkListItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="touch-manipulation"
    >
      <LinkListItemContent
        link={link}
        linkTagIds={linkTagIds}
        onEdit={onEdit}
        className={className}
        isDragging={isDragging}
        dragHandleProps={listeners}
      />
    </div>
  );
}

// Default export for non-sortable usage
export function LinkListItem(props: LinkListItemProps) {
  return <LinkListItemContent {...props} />;
}
