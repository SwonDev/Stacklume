"use client";

import { useMemo } from "react";
import { Star, Clock, FolderOpen, ExternalLink, Tag as TagIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import type { Widget } from "@/types/widget";
import type { Link, Category } from "@/lib/db/schema";
import { motion } from "motion/react";

interface KanbanLinkListWidgetProps {
  widget: Widget;
}

interface LinkItemProps {
  title: string;
  url: string;
  faviconUrl?: string | null;
  isFavorite?: boolean;
}

function LinkItem({ title, url, faviconUrl, isFavorite }: LinkItemProps) {
  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname.replace("www.", "");
    } catch {
      return url;
    }
  }, [url]);

  return (
    <motion.a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group/link flex w-full gap-2 p-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
      whileHover={{ x: 2 }}
    >
      <div className="flex-shrink-0 w-6 h-6 rounded-md overflow-hidden bg-secondary flex items-center justify-center">
        {faviconUrl ? (
          <img src={faviconUrl} alt="" className="w-3.5 h-3.5" loading="lazy" />
        ) : (
          <ExternalLink className="w-3 h-3 text-muted-foreground" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <h4 className="text-xs font-medium truncate group-hover/link:text-primary transition-colors">
            {title}
          </h4>
          {isFavorite && (
            <Star className="w-2.5 h-2.5 text-primary fill-primary flex-shrink-0" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground/60 truncate">{hostname}</p>
      </div>
    </motion.a>
  );
}

export function KanbanLinkListWidget({ widget }: KanbanLinkListWidgetProps) {
  const { links, categories, getLinksForTag } = useLinksStore();

  const { icon, items, isEmpty } = useMemo(() => {
    if (widget.type === "favorites") {
      const favLinks = links.filter((l: Link) => l.isFavorite).slice(0, 8);
      return {
        icon: <Star className="w-4 h-4 text-primary" />,
        items: favLinks,
        isEmpty: favLinks.length === 0,
      };
    }

    if (widget.type === "recent") {
      const recentLinks = [...links]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 8);
      return {
        icon: <Clock className="w-4 h-4 text-muted-foreground" />,
        items: recentLinks,
        isEmpty: recentLinks.length === 0,
      };
    }

    if (widget.type === "category" && widget.categoryId) {
      const categoryLinks = links.filter((l: Link) => l.categoryId === widget.categoryId).slice(0, 8);
      return {
        icon: <FolderOpen className="w-4 h-4 text-primary" />,
        items: categoryLinks,
        isEmpty: categoryLinks.length === 0,
      };
    }

    if (widget.type === "tag" && widget.tagId) {
      const tagLinks = getLinksForTag(widget.tagId).slice(0, 8);
      return {
        icon: <TagIcon className="w-4 h-4 text-primary" />,
        items: tagLinks,
        isEmpty: tagLinks.length === 0,
      };
    }

    if (widget.type === "categories") {
      return {
        icon: <FolderOpen className="w-4 h-4 text-muted-foreground" />,
        items: [],
        isEmpty: categories.length === 0,
        isCategories: true,
      };
    }

    return {
      icon: <FolderOpen className="w-4 h-4 text-muted-foreground" />,
      items: links.slice(0, 8),
      isEmpty: links.length === 0,
    };
  }, [widget, links, categories, getLinksForTag]);

  // Special render for categories widget
  if (widget.type === "categories") {
    if (categories.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full py-4 text-center">
          <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center mb-2">
            <FolderOpen className="w-4 h-4 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Sin categorías</p>
        </div>
      );
    }

    return (
      <div className="space-y-0.5 w-full">
        {categories.map((category: Category) => {
          const count = links.filter((l: Link) => l.categoryId === category.id).length;
          return (
            <motion.div
              key={category.id}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
              whileHover={{ x: 2 }}
            >
              <FolderOpen className="w-3.5 h-3.5 text-primary flex-shrink-0" />
              <span className="flex-1 text-xs truncate">{category.name}</span>
              <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                {count}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-4 text-center">
        <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center mb-2">
          {icon}
        </div>
        <p className="text-xs text-muted-foreground">Sin enlaces</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5 w-full">
      {items.map((link: Link) => (
        <LinkItem
          key={link.id}
          title={link.title}
          url={link.url}
          faviconUrl={link.faviconUrl}
          isFavorite={link.isFavorite ?? false}
        />
      ))}
    </div>
  );
}
