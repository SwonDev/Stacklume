"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Link } from "@/lib/db/schema";
import type { ContentType } from "@/lib/platform-detection";

interface RichLinkCardProps {
  link: Link;
  isEditMode?: boolean;
  onEdit?: () => void;
  onToggleFavorite?: () => void;
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

// Content type labels in Spanish
const contentTypeLabels: Record<ContentType, string> = {
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

export function RichLinkCard({
  link,
  isEditMode = false,
  onEdit,
  onToggleFavorite,
  variant = "default",
  showImage = true,
}: RichLinkCardProps) {
  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const contentType = (link.contentType as ContentType) || "website";
  const ContentIcon = contentTypeIcons[contentType] || Globe;
  const platformColor = link.platformColor || "#6B7280";

  const handleClick = (e: React.MouseEvent) => {
    if (isEditMode && onEdit) {
      e.preventDefault();
      onEdit();
    }
  };

  // Determine if we should show a large image preview
  const hasRichPreview = link.imageUrl && ["video", "game", "music"].includes(contentType);

  if (variant === "large" || hasRichPreview) {
    return (
      <motion.a
        href={isEditMode ? undefined : link.url}
        target={isEditMode ? undefined : "_blank"}
        rel={isEditMode ? undefined : "noopener noreferrer"}
        onClick={handleClick}
        className={cn(
          "group/link block rounded-xl overflow-hidden transition-all",
          isEditMode
            ? "cursor-pointer ring-2 ring-transparent hover:ring-primary/50"
            : "hover:shadow-lg"
        )}
        whileHover={{ scale: isEditMode ? 1.02 : 1.01 }}
      >
        {/* Large Image Preview */}
        {showImage && link.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden bg-secondary">
            <img
              src={link.imageUrl}
              alt={link.title}
              className="w-full h-full object-cover transition-transform group-hover/link:scale-105"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
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
                {link.siteName || contentTypeLabels[contentType]}
              </div>
            )}
            {/* Interactive Favorite star */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite?.();
              }}
              className={cn(
                "absolute top-2 right-2 p-1.5 rounded-full transition-all hover:scale-110 active:scale-95",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                link.isFavorite
                  ? "bg-black/20 backdrop-blur-sm"
                  : "bg-black/30 backdrop-blur-sm opacity-0 group-hover/link:opacity-100"
              )}
              title={link.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
            >
              <Star className={cn(
                "w-5 h-5 drop-shadow-lg transition-colors",
                link.isFavorite
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-white/80 hover:text-yellow-400"
              )} />
            </button>
            {/* Edit indicator */}
            {isEditMode && (
              <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-primary/90 text-primary-foreground text-xs flex items-center gap-1 opacity-0 group-hover/link:opacity-100 transition-opacity">
                <Pencil className="w-3 h-3" />
                Editar
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3 bg-card">
          <div className="flex items-start gap-2">
            {/* Favicon */}
            {link.faviconUrl && (
              <img
                src={link.faviconUrl}
                alt=""
                className="w-4 h-4 mt-0.5 rounded-sm flex-shrink-0"
                loading="lazy"
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
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <span className="truncate">{hostname}</span>
                {link.author && (
                  <>
                    <span>•</span>
                    <span className="truncate">{link.author}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.a>
    );
  }

  // Default/Compact variant
  return (
    <motion.a
      href={isEditMode ? undefined : link.url}
      target={isEditMode ? undefined : "_blank"}
      rel={isEditMode ? undefined : "noopener noreferrer"}
      onClick={handleClick}
      className={cn(
        "group/link flex w-full rounded-lg transition-colors",
        "gap-2 p-2",
        isEditMode
          ? "hover:bg-primary/10 cursor-pointer border border-transparent hover:border-primary/30"
          : "hover:bg-secondary/50"
      )}
      whileHover={{ x: isEditMode ? 0 : 2, scale: isEditMode ? 1.02 : 1 }}
    >
      {/* Thumbnail or Favicon */}
      <div className="flex-shrink-0 rounded-md overflow-hidden bg-secondary flex items-center justify-center w-10 h-10">
        {showImage && link.imageUrl ? (
          <img
            src={link.imageUrl}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        {link.faviconUrl && !(showImage && link.imageUrl) ? (
          <img
            src={link.faviconUrl}
            alt=""
            className="w-5 h-5"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.nextElementSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        <ContentIcon className={cn(
          "w-4 h-4 text-muted-foreground",
          (link.imageUrl || link.faviconUrl) && "hidden"
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <h4 className="font-medium text-sm truncate group-hover/link:text-primary transition-colors">
            {link.title}
          </h4>
          {/* Interactive favorite star */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite?.();
            }}
            className={cn(
              "flex-shrink-0 p-0.5 rounded-sm transition-all hover:scale-110 active:scale-95",
              "focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
              !link.isFavorite && "opacity-0 group-hover/link:opacity-60 hover:!opacity-100"
            )}
            title={link.isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
          >
            <Star className={cn(
              "w-3 h-3 transition-colors",
              link.isFavorite
                ? "text-yellow-500 fill-yellow-500"
                : "text-muted-foreground hover:text-yellow-500"
            )} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Platform badge */}
          {link.platform && link.platform !== "generic" && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium text-white flex items-center gap-0.5"
              style={{ backgroundColor: platformColor }}
            >
              <ContentIcon className="w-2.5 h-2.5" />
              {contentTypeLabels[contentType]}
            </span>
          )}
          <span className="text-xs text-muted-foreground truncate">
            {hostname}
          </span>
        </div>
      </div>

      {/* Actions */}
      {isEditMode ? (
        <Pencil className="w-4 h-4 text-primary opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0 mt-2" />
      ) : (
        <ExternalLink className="w-4 h-4 text-muted-foreground/40 opacity-0 group-hover/link:opacity-100 transition-opacity flex-shrink-0 mt-2" />
      )}
    </motion.a>
  );
}

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
