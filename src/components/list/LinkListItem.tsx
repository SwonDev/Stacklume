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
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
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

// Content type labels in Spanish
const contentTypeLabels: Record<ContentType, string> = {
  video: "Video",
  game: "Juego",
  music: "Musica",
  code: "Codigo",
  article: "Articulo",
  social: "Social",
  shopping: "Tienda",
  image: "Imagen",
  document: "Documento",
  tool: "Herramienta",
  website: "Web",
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
        });
        removeLinkTag(link.id, tagId);
      } else {
        // Add tag
        await fetch("/api/tags/link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: newValue }),
      });
      updateLink(link.id, { isFavorite: newValue });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [link.id, link.isFavorite, updateLink]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!confirm("¿Eliminar este enlace?")) return;
    try {
      await fetch(`/api/links/${link.id}`, { method: "DELETE" });
      removeLink(link.id);
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  }, [link.id, removeLink]);

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

  const faviconSizes = {
    compact: "w-4 h-4",
    normal: "w-5 h-5",
    comfortable: "w-6 h-6",
  };

  const titleSizes = {
    compact: "text-xs",
    normal: "text-sm",
    comfortable: "text-base",
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
      className={cn(
        "group flex items-center gap-2 border-b border-border/50 hover:bg-secondary/30 transition-colors",
        densityStyles[viewDensity],
        isOverlay && "bg-card border border-border rounded-lg shadow-lg",
        className
      )}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}

      {/* Favicon */}
      <div className="flex-shrink-0">
        {link.faviconUrl ? (
          <img
            src={link.faviconUrl}
            alt=""
            className={cn("rounded-sm", faviconSizes[viewDensity])}
            loading="lazy"
            onError={(e) => {
              // Hide broken image and show fallback
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

      {/* Main content */}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        {/* Title and URL */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
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
                {contentTypeLabels[contentType]}
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
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Agregar etiqueta"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-0" align="end">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Buscar etiquetas..."
                  value={tagSearch}
                  onValueChange={setTagSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="py-4 text-center text-sm text-muted-foreground">
                      No hay etiquetas disponibles
                    </div>
                  </CommandEmpty>
                  {filteredTags.length > 0 && (
                    <CommandGroup heading="Etiquetas disponibles">
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
                    <CommandGroup heading="Etiquetas asignadas">
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
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={handleFavoriteToggle}
          title={link.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              title="Mas opciones"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleEdit}>
              <Pencil className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyUrl}>
              <Copy className="w-4 h-4 mr-2" />
              Copiar URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleDelete}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-secondary transition-colors"
          title="Abrir enlace"
        >
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        </a>
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
