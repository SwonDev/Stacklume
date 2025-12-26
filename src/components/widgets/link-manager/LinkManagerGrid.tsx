"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  Star,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import { useSettingsStore } from "@/stores/settings-store";
import type { Link, Tag } from "@/lib/db/schema";
import type { ContentType } from "@/lib/platform-detection";
import { getCsrfHeaders } from "@/hooks/useCsrf";

interface LinkManagerGridProps {
  links: Link[];
  linkTagsMap: Map<string, string[]>;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (link: Link) => void;
}

// Content type labels
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

export function LinkManagerGrid({
  links,
  linkTagsMap,
  selectedIds,
  onSelect,
  onEdit,
}: LinkManagerGridProps) {
  const tags = useLinksStore((state) => state.tags);
  const updateLink = useLinksStore((state) => state.updateLink);
  const removeLink = useLinksStore((state) => state.removeLink);
  const reduceMotion = useSettingsStore((state) => state.reduceMotion);

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <p className="text-muted-foreground text-sm">
          No se encontraron enlaces
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="grid grid-cols-1 @md:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-3">
          {links.map((link, index) => (
            <LinkGridCard
              key={link.id}
              link={link}
              linkTagIds={linkTagsMap.get(link.id) || []}
              tags={tags}
              isSelected={selectedIds.has(link.id)}
              onSelect={() => onSelect(link.id)}
              onEdit={() => onEdit(link)}
              onUpdateLink={updateLink}
              onRemoveLink={removeLink}
              reduceMotion={reduceMotion}
              index={index}
            />
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

interface LinkGridCardProps {
  link: Link;
  linkTagIds: string[];
  tags: Tag[];
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onUpdateLink: (id: string, updates: Partial<Link>) => void;
  onRemoveLink: (id: string) => void;
  reduceMotion: boolean;
  index: number;
}

function LinkGridCard({
  link,
  linkTagIds,
  tags,
  isSelected,
  onSelect,
  onEdit,
  onUpdateLink,
  onRemoveLink,
  reduceMotion,
  index,
}: LinkGridCardProps) {
  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const contentType = (link.contentType as ContentType) || "website";
  const platformColor = link.platformColor || "#6B7280";

  const selectedTags = useMemo(() => {
    return tags.filter((tag) => linkTagIds.includes(tag.id)).slice(0, 2);
  }, [tags, linkTagIds]);

  const handleFavoriteToggle = async () => {
    try {
      const newValue = !link.isFavorite;
      await fetch(`/api/links/${link.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ isFavorite: newValue }),
      });
      onUpdateLink(link.id, { isFavorite: newValue });
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(link.url);
  };

  const handleDelete = async () => {
    try {
      await fetch(`/api/links/${link.id}`, {
        method: "DELETE",
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      onRemoveLink(link.id);
    } catch (error) {
      console.error("Error deleting link:", error);
    }
  };

  const isVideo = contentType === "video";

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.2 }}
      className={cn(
        "group relative bg-card border border-border rounded-lg overflow-hidden transition-all hover:border-primary/50 hover:shadow-md",
        isSelected && "ring-2 ring-primary border-primary"
      )}
    >
      {/* Selection checkbox */}
      <div className="absolute top-2 left-2 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="bg-background/80 backdrop-blur-sm"
        />
      </div>

      {/* Favorite button */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 z-10 h-7 w-7 p-0 bg-background/80 backdrop-blur-sm"
        onClick={handleFavoriteToggle}
      >
        <Star
          className={cn(
            "w-4 h-4",
            link.isFavorite
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground"
          )}
        />
      </Button>

      {/* Image */}
      <div className="relative aspect-video bg-muted">
        {link.imageUrl ? (
          <img
            src={link.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: `${platformColor}20` }}
          >
            {link.faviconUrl ? (
              <img
                src={link.faviconUrl}
                alt=""
                className="w-12 h-12 rounded-md"
              />
            ) : (
              <ExternalLink
                className="w-8 h-8 text-muted-foreground"
                style={{ color: platformColor }}
              />
            )}
          </div>
        )}

        {/* Play button for videos */}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: platformColor }}
            >
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Platform badge */}
        {link.platform && (
          <div
            className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-xs font-medium text-white"
            style={{ backgroundColor: platformColor }}
          >
            {contentTypeLabels[contentType]}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block group/link"
        >
          <h3 className="font-medium text-sm line-clamp-2 group-hover/link:text-primary transition-colors">
            {link.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {hostname}
          </p>
        </a>

        {/* Tags */}
        {selectedTags.length > 0 && (
          <div className="flex items-center gap-1 mt-2 flex-wrap">
            {selectedTags.map((tag) => (
              <TagBadge key={tag.id} name={tag.name} color={tag.color || "blue"} size="sm" />
            ))}
            {linkTagIds.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{linkTagIds.length - 2}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 w-7 p-0"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
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
      </div>
    </motion.div>
  );
}
