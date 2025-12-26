"use client";

import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { LinkManagerItem } from "./LinkManagerItem";
import type { Link } from "@/lib/db/schema";

interface LinkManagerListProps {
  links: Link[];
  linkTagsMap: Map<string, string[]>;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onEdit: (link: Link) => void;
}

export function LinkManagerList({
  links,
  linkTagsMap,
  selectedIds,
  onSelect,
  onSelectAll,
  onEdit,
}: LinkManagerListProps) {
  const allSelected = links.length > 0 && selectedIds.size === links.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < links.length;

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="text-muted-foreground">
          <p className="text-sm">No hay enlaces para mostrar</p>
          <p className="text-xs mt-1">Prueba ajustando los filtros</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with select all */}
      <div className="flex items-center gap-3 px-3 py-2 border-b border-border/50 bg-muted/30">
        <Checkbox
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={onSelectAll}
          className="flex-shrink-0"
          aria-label="Seleccionar todos"
        />
        <span className="text-xs text-muted-foreground">
          {selectedIds.size > 0
            ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? "s" : ""}`
            : `${links.length} enlace${links.length > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Scrollable list */}
      <ScrollArea className="flex-1">
        <SortableContext items={links.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {links.map((link) => (
            <LinkManagerItem
              key={link.id}
              link={link}
              linkTagIds={linkTagsMap.get(link.id) || []}
              isSelected={selectedIds.has(link.id)}
              onSelect={() => onSelect(link.id)}
              onEdit={() => onEdit(link)}
            />
          ))}
        </SortableContext>
      </ScrollArea>
    </div>
  );
}
