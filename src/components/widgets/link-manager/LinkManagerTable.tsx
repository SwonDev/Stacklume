"use client";

import { useMemo, useState, useCallback } from "react";
import {
  Star,
  ExternalLink,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Plus,
  Tag as TagIcon,
  CheckIcon,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TagBadge } from "@/components/ui/tag-badge";
import { useLinksStore } from "@/stores/links-store";
import type { Link, Tag, Category } from "@/lib/db/schema";
import { getCsrfHeaders } from "@/hooks/useCsrf";

interface LinkManagerTableProps {
  links: Link[];
  linkTagsMap: Map<string, string[]>;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (link: Link) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (column: string) => void;
}

type SortableColumn = "title" | "createdAt" | "updatedAt";

// Moved outside component to avoid "Cannot create components during render" error
function SortHeader({
  column,
  children,
  sortBy,
  sortOrder,
  onSortChange,
}: {
  column: SortableColumn;
  children: React.ReactNode;
  sortBy: string;
  sortOrder: "asc" | "desc";
  onSortChange: (column: string) => void;
}) {
  return (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => onSortChange(column)}
    >
      {children}
      {sortBy === column && (
        sortOrder === "asc" ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )
      )}
    </button>
  );
}

export function LinkManagerTable({
  links,
  linkTagsMap,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
  sortBy,
  sortOrder,
  onSortChange,
}: LinkManagerTableProps) {
  const tags = useLinksStore((state) => state.tags);
  const categories = useLinksStore((state) => state.categories);
  const updateLink = useLinksStore((state) => state.updateLink);
  const removeLink = useLinksStore((state) => state.removeLink);
  const addLinkTag = useLinksStore((state) => state.addLinkTag);
  const removeLinkTag = useLinksStore((state) => state.removeLinkTag);

  const allSelected = links.length > 0 && selectedIds.size === links.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < links.length;

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
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground sticky top-0">
        <div className="w-8 flex-shrink-0">
          <Checkbox
            checked={allSelected ? true : someSelected ? "indeterminate" : false}
            onCheckedChange={(checked) => onSelectAll(checked === true)}
          />
        </div>
        <div className="w-8 flex-shrink-0" />
        <div className="flex-1 min-w-[200px]">
          <SortHeader column="title" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange}>Título</SortHeader>
        </div>
        <div className="w-[150px] flex-shrink-0 hidden @lg:block">URL</div>
        <div className="w-[120px] flex-shrink-0 hidden @md:block">Categoría</div>
        <div className="w-[150px] flex-shrink-0 hidden @lg:block">Etiquetas</div>
        <div className="w-[100px] flex-shrink-0 hidden @xl:block">
          <SortHeader column="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSortChange={onSortChange}>Creado</SortHeader>
        </div>
        <div className="w-8 flex-shrink-0" />
        <div className="w-8 flex-shrink-0" />
      </div>

      {/* Body */}
      <ScrollArea className="flex-1">
        <div className="divide-y divide-border/50">
          {links.map((link) => (
            <TableRow
              key={link.id}
              link={link}
              linkTagIds={linkTagsMap.get(link.id) || []}
              tags={tags}
              categories={categories}
              isSelected={selectedIds.has(link.id)}
              onSelect={() => onSelect(link.id)}
              onEdit={() => onEdit(link)}
              onUpdateLink={updateLink}
              onRemoveLink={removeLink}
              onAddLinkTag={addLinkTag}
              onRemoveLinkTag={removeLinkTag}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

interface TableRowProps {
  link: Link;
  linkTagIds: string[];
  tags: Tag[];
  categories: Category[];
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onUpdateLink: (id: string, updates: Partial<Link>) => void;
  onRemoveLink: (id: string) => void;
  onAddLinkTag: (linkId: string, tagId: string) => void;
  onRemoveLinkTag: (linkId: string, tagId: string) => void;
}

function TableRow({
  link,
  linkTagIds,
  tags,
  categories,
  isSelected,
  onSelect,
  onEdit,
  onUpdateLink,
  onRemoveLink,
  onAddLinkTag,
  onRemoveLinkTag,
}: TableRowProps) {
  const [isTagPopoverOpen, setIsTagPopoverOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  const hostname = useMemo(() => {
    try {
      return new URL(link.url).hostname.replace("www.", "");
    } catch {
      return link.url;
    }
  }, [link.url]);

  const category = useMemo(() => {
    return categories.find((c) => c.id === link.categoryId);
  }, [categories, link.categoryId]);

  const selectedTags = useMemo(() => {
    return tags.filter((tag) => linkTagIds.includes(tag.id));
  }, [tags, linkTagIds]);

  const filteredTags = useMemo(() => {
    const availableTags = tags.filter((tag) => !linkTagIds.includes(tag.id));
    if (!tagSearch.trim()) return availableTags;
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(tagSearch.toLowerCase())
    );
  }, [tags, linkTagIds, tagSearch]);

  const handleTagToggle = useCallback(
    async (tagId: string, isSelected: boolean) => {
      try {
        if (isSelected) {
          await fetch(`/api/tags/link?linkId=${link.id}&tagId=${tagId}`, {
            method: "DELETE",
            headers: getCsrfHeaders(),
            credentials: "include",
          });
          onRemoveLinkTag(link.id, tagId);
        } else {
          await fetch("/api/tags/link", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getCsrfHeaders(),
            },
            credentials: "include",
            body: JSON.stringify({ linkId: link.id, tagId }),
          });
          onAddLinkTag(link.id, tagId);
        }
      } catch (error) {
        console.error("Error toggling tag:", error);
      }
    },
    [link.id, onAddLinkTag, onRemoveLinkTag]
  );

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

  const createdAt = useMemo(() => {
    const date = new Date(link.createdAt);
    return date.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });
  }, [link.createdAt]);

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/30 transition-colors",
        isSelected && "bg-primary/10"
      )}
    >
      {/* Checkbox */}
      <div className="w-8 flex-shrink-0">
        <Checkbox checked={isSelected} onCheckedChange={onSelect} />
      </div>

      {/* Favicon */}
      <div className="w-8 flex-shrink-0">
        {link.faviconUrl ? (
          <img
            src={link.faviconUrl}
            alt=""
            className="w-5 h-5 rounded-sm"
          />
        ) : (
          <ExternalLink className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      {/* Title */}
      <div className="flex-1 min-w-[200px] truncate">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          {link.title}
        </a>
      </div>

      {/* URL */}
      <div className="w-[150px] flex-shrink-0 hidden @lg:block">
        <span className="text-muted-foreground truncate block">
          {hostname}
        </span>
      </div>

      {/* Category */}
      <div className="w-[120px] flex-shrink-0 hidden @md:block">
        {category ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs"
            style={{ backgroundColor: `${category.color || "#6B7280"}20`, color: category.color || "#6B7280" }}
          >
            {category.name}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">—</span>
        )}
      </div>

      {/* Tags */}
      <div className="w-[150px] flex-shrink-0 hidden @lg:flex items-center gap-1">
        {selectedTags.slice(0, 2).map((tag) => (
          <TagBadge key={tag.id} name={tag.name} color={tag.color || "blue"} size="sm" />
        ))}
        {linkTagIds.length > 2 && (
          <span className="text-xs text-muted-foreground">
            +{linkTagIds.length - 2}
          </span>
        )}
        <Popover open={isTagPopoverOpen} onOpenChange={setIsTagPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
            >
              <Plus className="w-3 h-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar etiqueta..."
                value={tagSearch}
                onValueChange={setTagSearch}
              />
              <CommandList>
                <CommandEmpty>No se encontraron etiquetas</CommandEmpty>
                <CommandGroup heading="Etiquetas asignadas">
                  {selectedTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => handleTagToggle(tag.id, true)}
                    >
                      <CheckIcon className="w-4 h-4 mr-2 text-primary" />
                      <TagBadge name={tag.name} color={tag.color || "blue"} size="sm" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                {filteredTags.length > 0 && (
                  <CommandGroup heading="Disponibles">
                    {filteredTags.map((tag) => (
                      <CommandItem
                        key={tag.id}
                        onSelect={() => handleTagToggle(tag.id, false)}
                      >
                        <div className="w-4 h-4 mr-2" />
                        <TagBadge name={tag.name} color={tag.color || "blue"} size="sm" />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Created */}
      <div className="w-[100px] flex-shrink-0 hidden @xl:block">
        <span className="text-muted-foreground text-xs">{createdAt}</span>
      </div>

      {/* Favorite */}
      <div className="w-8 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
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
      </div>

      {/* Actions */}
      <div className="w-8 flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
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
    </div>
  );
}
