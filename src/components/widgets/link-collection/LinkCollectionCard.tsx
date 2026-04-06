"use client";

import { memo, useCallback } from "react";
import {
  Star,
  ExternalLink,
  X,
  Globe,
  BookOpen,
  CheckCheck,
  Inbox,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Link } from "@/lib/db/schema";

type ReadingStatus = "inbox" | "reading" | "done";

interface LinkCollectionCardProps {
  link: Link;
  categoryName?: string;
  categoryColor?: string;
  tagNames: string[];
  tagColors: string[];
  variant: "card" | "compact" | "list";
  isSelecting?: boolean;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onFavoriteToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReadingStatusChange?: (id: string, status: ReadingStatus) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const READING_STATUS_ICON: Record<ReadingStatus, typeof Inbox> = {
  inbox: Inbox,
  reading: BookOpen,
  done: CheckCheck,
};
const READING_STATUS_NEXT: Record<ReadingStatus, ReadingStatus> = {
  inbox: "reading",
  reading: "done",
  done: "inbox",
};
const READING_STATUS_COLOR: Record<ReadingStatus, string> = {
  inbox: "text-muted-foreground",
  reading: "text-blue-500",
  done: "text-green-500",
};

/** Glowing dot component for category color indicator */
function CategoryDot({ color }: { color?: string }) {
  if (!color) return null;
  return (
    <span
      className="inline-block shrink-0 h-[6px] w-[6px] rounded-full"
      style={{
        backgroundColor: color,
        boxShadow: `0 0 6px 1px ${color}80, 0 0 2px 0px ${color}`,
      }}
    />
  );
}

export const LinkCollectionCard = memo(function LinkCollectionCard({
  link,
  categoryName,
  categoryColor,
  tagNames,
  tagColors,
  variant,
  isSelecting,
  isSelected,
  onSelect,
  onFavoriteToggle,
  onRemove,
  onReadingStatusChange,
  t,
}: LinkCollectionCardProps) {
  const domain = getDomain(link.url);
  const readingStatus = (link.readingStatus as ReadingStatus) || "inbox";
  const StatusIcon = READING_STATUS_ICON[readingStatus];
  const hasImage = !!link.imageUrl;

  const handleOpen = useCallback(() => {
    window.open(link.url, "_blank", "noopener,noreferrer");
  }, [link.url]);

  const handleFavorite = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onFavoriteToggle(link.id); },
    [link.id, onFavoriteToggle]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onRemove(link.id); },
    [link.id, onRemove]
  );

  const handleReadingStatus = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); onReadingStatusChange?.(link.id, READING_STATUS_NEXT[readingStatus]); },
    [link.id, readingStatus, onReadingStatusChange]
  );

  // ─── Card variant (glassmorphic) ──────────────────────────────────────
  if (variant === "card") {
    return (
      <div
        className={cn(
          "group relative isolate w-full overflow-hidden rounded-xl p-[1px]",
          "bg-gradient-to-br from-border/50 to-border/10",
          "transition-all duration-300 hover:from-primary/20 hover:to-primary/5",
          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
        )}
      >
        <div
          className={cn(
            "relative w-full h-full rounded-[11px] flex flex-col overflow-hidden",
            "bg-card dark:bg-card/90",
            "backdrop-blur-md",
            "transition-all duration-200"
          )}
        >
          {/* Thumbnail banner */}
          {hasImage && (
            <div className="relative w-full h-[88px] shrink-0 overflow-hidden bg-muted/20">
              <Image
                src={link.imageUrl!}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                unoptimized
                sizes="(max-width: 600px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
              {/* Favicon overlaid on thumbnail */}
              <div className="absolute bottom-2 left-3 h-7 w-7 rounded-lg bg-card/80 backdrop-blur-sm flex items-center justify-center overflow-hidden shadow-sm border border-border/30">
                {link.faviconUrl ? (
                  <Image src={link.faviconUrl} alt="" width={20} height={20} className="h-5 w-5 object-cover rounded-[3px]" unoptimized />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
            </div>
          )}

          <div className={cn("p-3 flex flex-col flex-1 gap-2", !hasImage && "pt-3.5")}>
            {/* Header without thumbnail: favicon + domain row */}
            {!hasImage && (
              <div className="flex items-center gap-2">
                {isSelecting && (
                  <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(link.id)} onClick={(e) => e.stopPropagation()} className="shrink-0" />
                )}
                <div className="shrink-0 h-6 w-6 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden">
                  {link.faviconUrl ? (
                    <Image src={link.faviconUrl} alt="" width={20} height={20} className="h-5 w-5 object-cover rounded-[3px]" unoptimized />
                  ) : (
                    <Globe className="h-3 w-3 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">{link.siteName || domain}</span>
                {link.isFavorite && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />}
              </div>
            )}

            {/* With thumbnail: checkbox + favorite on separate row */}
            {hasImage && (
              <div className="flex items-center gap-2">
                {isSelecting && (
                  <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(link.id)} onClick={(e) => e.stopPropagation()} className="shrink-0" />
                )}
                <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">{link.siteName || domain}</span>
                {link.isFavorite && <Star className="h-3 w-3 fill-yellow-500 text-yellow-500 shrink-0" />}
                <StatusIcon className={cn("h-3 w-3 shrink-0", READING_STATUS_COLOR[readingStatus])} />
              </div>
            )}

            {/* Title + Description */}
            <button type="button" onClick={handleOpen} className="text-left w-full flex-1">
              <h4 className="text-[13px] font-semibold leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
                {link.title}
              </h4>
              {link.description && (
                <p className="mt-1 text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
                  {link.description}
                </p>
              )}
            </button>

            {/* Footer: tags + category dot + date */}
            <div className="flex items-center gap-1.5 flex-wrap mt-auto pt-1">
              {categoryName && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0 h-[18px] font-medium"
                  style={categoryColor ? { backgroundColor: `${categoryColor}15`, color: categoryColor } : undefined}
                >
                  {categoryName}
                </Badge>
              )}
              {tagNames.slice(0, 2).map((name, i) => (
                <Badge
                  key={name}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-[18px]"
                  style={tagColors[i] ? { borderColor: `${tagColors[i]}60`, color: tagColors[i] } : undefined}
                >
                  {name}
                </Badge>
              ))}
              {tagNames.length > 2 && (
                <span className="text-[10px] text-muted-foreground">+{tagNames.length - 2}</span>
              )}
              <span className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground shrink-0">
                {!hasImage && <StatusIcon className={cn("h-2.5 w-2.5", READING_STATUS_COLOR[readingStatus])} />}
                <CategoryDot color={categoryColor} />
                {new Date(link.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Hover actions */}
          <div className="absolute top-2 right-2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-background/80 dark:bg-card/90 backdrop-blur-md rounded-lg p-0.5 shadow-lg border border-border/30">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" onClick={handleReadingStatus}>
                  <StatusIcon className={cn("h-3 w-3", READING_STATUS_COLOR[readingStatus])} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{readingStatus === "inbox" ? "Marcar leyendo" : readingStatus === "reading" ? "Marcar leído" : "Volver a inbox"}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" onClick={handleFavorite}>
                  <Star className={cn("h-3 w-3", link.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("linkCollection.markFavorite")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-muted/80" onClick={handleOpen}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("linkCollection.openLink")}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={handleRemove}>
                  <X className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{t("linkCollection.removeFromCollection")}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  }

  // ─── Compact variant ──────────────────────────────────────────────────
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "group flex items-center gap-2.5 px-3 py-1.5 rounded-lg",
          "hover:bg-muted/40 transition-colors cursor-pointer",
          isSelected && "bg-primary/10"
        )}
        onClick={isSelecting ? () => onSelect?.(link.id) : handleOpen}
      >
        {isSelecting && (
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(link.id)} onClick={(e) => e.stopPropagation()} className="shrink-0" />
        )}
        <div className="shrink-0 h-5 w-5 rounded bg-muted/40 flex items-center justify-center overflow-hidden">
          {link.faviconUrl ? (
            <Image src={link.faviconUrl} alt="" width={16} height={16} className="h-4 w-4 object-cover rounded-[2px]" unoptimized />
          ) : (
            <Globe className="h-2.5 w-2.5 text-muted-foreground" />
          )}
        </div>
        <span className="flex-1 text-[13px] truncate min-w-0">{link.title}</span>
        <CategoryDot color={categoryColor} />
        <StatusIcon className={cn("h-2.5 w-2.5 shrink-0", READING_STATUS_COLOR[readingStatus])} />
        {link.isFavorite && <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500 shrink-0" />}
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={handleFavorite}>
            <Star className={cn("h-2.5 w-2.5", link.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={handleRemove}>
            <X className="h-2.5 w-2.5" />
          </Button>
        </div>
      </div>
    );
  }

  // ─── List variant ─────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        "group rounded-lg border border-border/40 p-3",
        "hover:bg-muted/20 hover:border-border/60 transition-all duration-200",
        isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background"
      )}
    >
      <div className="flex items-start gap-3">
        {isSelecting && (
          <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(link.id)} className="shrink-0 mt-1" />
        )}
        {hasImage ? (
          <div className="shrink-0 w-16 h-12 rounded-md overflow-hidden bg-muted/20 relative">
            <Image src={link.imageUrl!} alt="" fill className="object-cover" unoptimized sizes="64px" />
          </div>
        ) : (
          <div className="shrink-0 h-8 w-8 rounded-lg bg-muted/40 flex items-center justify-center overflow-hidden mt-0.5">
            {link.faviconUrl ? (
              <Image src={link.faviconUrl} alt="" width={24} height={24} className="h-6 w-6 object-cover rounded-[3px]" unoptimized />
            ) : (
              <Globe className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <button type="button" onClick={handleOpen} className="text-left w-full">
            <h4 className="text-[13px] font-medium truncate group-hover:text-primary transition-colors">{link.title}</h4>
          </button>
          {link.description && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-1 mt-0.5">{link.description}</p>
          )}
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground/60">{domain}</span>
            {categoryName && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-[16px]" style={categoryColor ? { backgroundColor: `${categoryColor}15`, color: categoryColor } : undefined}>
                {categoryName}
              </Badge>
            )}
            {tagNames.slice(0, 3).map((name, i) => (
              <Badge key={name} variant="outline" className="text-[10px] px-1.5 py-0 h-[16px]" style={tagColors[i] ? { borderColor: `${tagColors[i]}60`, color: tagColors[i] } : undefined}>
                {name}
              </Badge>
            ))}
            <span className="ml-auto flex items-center gap-1.5 shrink-0">
              <StatusIcon className={cn("h-2.5 w-2.5", READING_STATUS_COLOR[readingStatus])} />
              <CategoryDot color={categoryColor} />
              <span className="text-[10px] text-muted-foreground/60">{new Date(link.createdAt).toLocaleDateString()}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReadingStatus}>
            <StatusIcon className={cn("h-3 w-3", READING_STATUS_COLOR[readingStatus])} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleFavorite}>
            <Star className={cn("h-3 w-3", link.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground")} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpen}>
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={handleRemove}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
});
