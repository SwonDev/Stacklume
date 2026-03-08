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
  GripVertical,
  CheckIcon,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useSettingsStore } from "@/stores/settings-store";
import { useTranslation } from "@/lib/i18n";
import { showConfirm } from "@/components/ui/ConfirmDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Link, Tag } from "@/lib/db/schema";
import type { ContentType } from "@/lib/platform-detection";

interface LinkManagerItemProps {
  link: Link;
  linkTagIds: string[];
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

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

export function LinkManagerItem({
  link,
  linkTagIds,
  isSelected,
  onSelect,
  onEdit,
}: LinkManagerItemProps) {
  const { t } = useTranslation();
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const tags = useLinksStore((state) => state.tags);
  const updateLink = useLinksStore((state) => state.updateLink);
  const removeLink = useLinksStore((state) => state.removeLink);
  const addLinkTag = useLinksStore((state) => state.addLinkTag);
  const removeLinkTag = useLinksStore((state) => state.removeLinkTag);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);
  const confirmBeforeDelete = useSettingsStore((state) => state.confirmBeforeDelete);
  const linkClickBehavior = useSettingsStore((state) => state.linkClickBehavior);

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
        description: t("linkManager.confirmDeleteLink"),
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

  // Copy URL
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(link.url);
  }, [link.url]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="touch-manipulation"
    >
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{
          opacity: isDragging ? 0.4 : 1,
          y: 0,
        }}
        exit={reduceMotion ? undefined : { opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "group flex items-center gap-3 border-b border-border/50 hover:bg-secondary/30 transition-colors py-2.5 px-3",
          isSelected && "bg-primary/10"
        )}
      >
        {/* Drag handle */}
        <div
          {...listeners}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Selection checkbox */}
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="flex-shrink-0"
        />

        {/* Favicon */}
        <div className="flex-shrink-0">
          {link.faviconUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={link.faviconUrl}
              alt=""
              className="w-5 h-5 rounded-sm"
              loading="lazy"
            />
          ) : (
            <div className="w-5 h-5 rounded-sm bg-secondary flex items-center justify-center">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {/* Title and URL */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <a
                href={link.url}
                target={linkClickBehavior === "same-tab" ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="text-sm font-medium truncate hover:text-primary transition-colors"
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
            <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label={t("linkManager.addTag")}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top"><p>{t("linkManager.addTag")}</p></TooltipContent>
              </Tooltip>
              <PopoverContent className="w-56 p-0" align="end">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder={t("linkManager.searchTags")}
                    value={tagSearch}
                    onValueChange={setTagSearch}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="py-4 text-center text-sm text-muted-foreground">
                        {t("linkManager.noTagsAvailable")}
                      </div>
                    </CommandEmpty>
                    {filteredTags.length > 0 && (
                      <CommandGroup heading={t("linkManager.availableTags")}>
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
                      <CommandGroup heading={t("linkManager.assignedTags")}>
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
                aria-label={link.isFavorite ? t("linkManager.removeFromFavorites") : t("linkManager.addToFavorites")}
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
            <TooltipContent side="top"><p>{link.isFavorite ? t("linkManager.removeFromFavorites") : t("linkManager.addToFavorites")}</p></TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    aria-label={t("linkManager.moreOptions")}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top"><p>{t("linkManager.moreOptions")}</p></TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                {t("linkManager.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyUrl}>
                <Copy className="w-4 h-4 mr-2" />
                {t("linkManager.copyUrl")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("linkManager.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href={link.url}
                target={linkClickBehavior === "same-tab" ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
                aria-label={t("linkManager.openLink")}
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </a>
            </TooltipTrigger>
            <TooltipContent side="top"><p>{t("linkManager.openLink")}</p></TooltipContent>
          </Tooltip>
        </div>
      </motion.div>
    </div>
  );
}
