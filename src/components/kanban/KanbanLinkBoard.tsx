"use client";

import {
  useState,
  useCallback,
  useMemo,
  useDeferredValue,
  memo,
} from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { toast } from "sonner";
import {
  Search,
  X,
  Inbox,
  BookOpen,
  BookOpenCheck,
  FolderOpen,
  Tag as TagIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { KanbanLinkCard } from "./KanbanLinkCard";
import type { Link } from "@/lib/db/schema";

interface KanbanLinkBoardProps {
  groupBy: "category" | "tag" | "readingStatus";
}

interface LinkColumn {
  id: string;
  title: string;
  color: string;
  icon?: React.ReactNode;
  linkIds: string[];
}

// --- Column component ---
const KanbanLinkColumn = memo(function KanbanLinkColumn({
  column,
  links,
  linkTagsMap,
}: {
  column: LinkColumn;
  links: Link[];
  linkTagsMap: Map<string, { tagId: string; name: string; color: string }[]>;
}) {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className={cn(
        "flex-shrink-0 w-[300px] flex flex-col rounded-lg border border-border/50 bg-secondary/20 overflow-hidden",
        isOver && "ring-2 ring-primary/50 bg-primary/5"
      )}
    >
      {/* Column header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/50 bg-card/30 flex-shrink-0">
        {column.color && (
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: column.color }}
          />
        )}
        {column.icon}
        <h3 className="text-sm font-medium truncate flex-1">{column.title}</h3>
        <Badge
          variant="secondary"
          className="h-5 min-w-5 px-1.5 text-[10px] font-medium"
        >
          {links.length}
        </Badge>
      </div>

      {/* Column content */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[100px] scrollbar-thin"
      >
        <SortableContext
          items={links.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {links.length === 0 ? (
            <div className="flex items-center justify-center h-20 text-xs text-muted-foreground/60">
              {t("kanbanLinkBoard.noLinks")}
            </div>
          ) : (
            links.map((link) => (
              <KanbanLinkCard
                key={link.id}
                link={link}
                linkTags={linkTagsMap.get(link.id) ?? []}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
});

// --- Main board ---
export function KanbanLinkBoard({ groupBy }: KanbanLinkBoardProps) {
  const { t } = useTranslation();

  const links = useLinksStore((state) => state.links);
  const categories = useLinksStore((state) => state.categories);
  const tags = useLinksStore((state) => state.tags);
  const linkTags = useLinksStore((state) => state.linkTags);

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);
  const [activeLink, setActiveLink] = useState<Link | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Filter links by search
  const filteredLinks = useMemo(() => {
    const active = links.filter((l) => !l.deletedAt);
    if (!deferredSearch.trim()) return active;
    const term = deferredSearch.toLowerCase();
    return active.filter(
      (l) =>
        l.title?.toLowerCase().includes(term) ||
        l.url.toLowerCase().includes(term)
    );
  }, [links, deferredSearch]);

  // Build a map of linkId -> tag info for display
  const linkTagsMap = useMemo(() => {
    const map = new Map<
      string,
      { tagId: string; name: string; color: string }[]
    >();
    for (const lt of linkTags) {
      const tag = tags.find((t) => t.id === lt.tagId);
      if (!tag || tag.deletedAt) continue;
      const arr = map.get(lt.linkId) ?? [];
      arr.push({
        tagId: tag.id,
        name: tag.name,
        color: tag.color ?? "#6B7280",
      });
      map.set(lt.linkId, arr);
    }
    return map;
  }, [linkTags, tags]);

  // Build columns based on groupBy
  const columns: LinkColumn[] = useMemo(() => {
    if (groupBy === "category") {
      const activeCats = categories.filter((c) => !c.deletedAt);
      const cols: LinkColumn[] = activeCats.map((cat) => ({
        id: `cat-${cat.id}`,
        title: cat.name,
        color: cat.color ?? "#6B7280",
        linkIds: filteredLinks
          .filter((l) => l.categoryId === cat.id)
          .map((l) => l.id),
      }));
      // "Sin categoría" column
      const uncategorized = filteredLinks
        .filter((l) => !l.categoryId)
        .map((l) => l.id);
      cols.push({
        id: "cat-none",
        title: t("kanbanLinkBoard.noCategory"),
        color: "#6B7280",
        linkIds: uncategorized,
      });
      return cols;
    }

    if (groupBy === "tag") {
      const activeTags = tags.filter((tg) => !tg.deletedAt);
      const cols: LinkColumn[] = activeTags.map((tag) => {
        const tagLinkIds = linkTags
          .filter((lt) => lt.tagId === tag.id)
          .map((lt) => lt.linkId);
        const matchingIds = filteredLinks
          .filter((l) => tagLinkIds.includes(l.id))
          .map((l) => l.id);
        return {
          id: `tag-${tag.id}`,
          title: tag.name,
          color: tag.color ?? "#6B7280",
          linkIds: matchingIds,
        };
      });
      // "Sin etiqueta" column
      const taggedLinkIds = new Set(linkTags.map((lt) => lt.linkId));
      const untagged = filteredLinks
        .filter((l) => !taggedLinkIds.has(l.id))
        .map((l) => l.id);
      cols.push({
        id: "tag-none",
        title: t("kanbanLinkBoard.noTag"),
        color: "#6B7280",
        linkIds: untagged,
      });
      return cols;
    }

    // readingStatus
    return [
      {
        id: "status-inbox",
        title: t("kanbanLinkBoard.statusInbox"),
        color: "#3B82F6",
        icon: <Inbox className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />,
        linkIds: filteredLinks
          .filter(
            (l) => !l.readingStatus || l.readingStatus === "inbox"
          )
          .map((l) => l.id),
      },
      {
        id: "status-reading",
        title: t("kanbanLinkBoard.statusReading"),
        color: "#F59E0B",
        icon: <BookOpen className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />,
        linkIds: filteredLinks
          .filter((l) => l.readingStatus === "reading")
          .map((l) => l.id),
      },
      {
        id: "status-done",
        title: t("kanbanLinkBoard.statusDone"),
        color: "#22C55E",
        icon: (
          <BookOpenCheck className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
        ),
        linkIds: filteredLinks
          .filter((l) => l.readingStatus === "done")
          .map((l) => l.id),
      },
    ];
  }, [groupBy, categories, tags, linkTags, filteredLinks, t]);

  // Build link lookup
  const linkMap = useMemo(() => {
    const map = new Map<string, Link>();
    for (const l of filteredLinks) map.set(l.id, l);
    return map;
  }, [filteredLinks]);

  // Resolve links for a column (maintain column order)
  const getLinksForColumn = useCallback(
    (col: LinkColumn): Link[] =>
      col.linkIds
        .map((id) => linkMap.get(id))
        .filter((l): l is Link => l !== undefined),
    [linkMap]
  );

  // Find which column contains a link
  const findColumnForLink = useCallback(
    (linkId: UniqueIdentifier): string | null => {
      for (const col of columns) {
        if (col.linkIds.includes(linkId as string)) return col.id;
      }
      return null;
    },
    [columns]
  );

  // --- DnD handlers ---
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const link = linkMap.get(event.active.id as string) ?? null;
      setActiveLink(link);
    },
    [linkMap]
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDragOver = useCallback((_event: DragOverEvent) => {
    // Cross-column visual feedback is handled by useDroppable isOver
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveLink(null);
      if (!over) return;

      const activeId = active.id as string;
      const overId = over.id as string;

      const sourceColId = findColumnForLink(activeId);
      // Check if dropped on a column directly or on another link
      const isOverColumn = columns.some((c) => c.id === overId);
      const targetColId = isOverColumn ? overId : findColumnForLink(overId);

      if (!sourceColId || !targetColId) return;

      // Same column reorder — not persisted to server, just visual
      if (sourceColId === targetColId && !isOverColumn) {
        // No server-side reorder for links in kanban — just visual feedback
        return;
      }

      // Cross-column move
      if (sourceColId !== targetColId) {
        const link = linkMap.get(activeId);
        if (!link) return;

        try {
          if (groupBy === "category") {
            // Extract real category ID
            const catId = targetColId === "cat-none" ? null : targetColId.replace("cat-", "");
            const res = await fetch(`/api/links/${activeId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                ...getCsrfHeaders(),
              },
              credentials: "include",
              body: JSON.stringify({ categoryId: catId }),
            });
            if (!res.ok) throw new Error();
            useLinksStore.getState().updateLink(activeId, { categoryId: catId } as Partial<Link>);
            toast.success(t("kanbanLinkBoard.movedSuccess"));
            await useLinksStore.getState().refreshAllData();
          } else if (groupBy === "readingStatus") {
            const statusMap: Record<string, string> = {
              "status-inbox": "inbox",
              "status-reading": "reading",
              "status-done": "done",
            };
            const newStatus = statusMap[targetColId];
            if (!newStatus) return;
            const res = await fetch(`/api/links/${activeId}/reading-status`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
                ...getCsrfHeaders(),
              },
              credentials: "include",
              body: JSON.stringify({ readingStatus: newStatus }),
            });
            if (!res.ok) throw new Error();
            useLinksStore.getState().updateLink(activeId, { readingStatus: newStatus } as Partial<Link>);
            toast.success(t("kanbanLinkBoard.movedSuccess"));
            await useLinksStore.getState().refreshAllData();
          } else if (groupBy === "tag") {
            const sourceTagId = sourceColId === "tag-none" ? null : sourceColId.replace("tag-", "");
            const targetTagId = targetColId === "tag-none" ? null : targetColId.replace("tag-", "");

            // Remove from source tag (if it had one)
            if (sourceTagId) {
              await fetch(`/api/tags/link?linkId=${activeId}&tagId=${sourceTagId}`, {
                method: "DELETE",
                headers: getCsrfHeaders(),
                credentials: "include",
              });
              useLinksStore.getState().removeLinkTag(activeId, sourceTagId);
            }
            // Add to target tag (if it has one)
            if (targetTagId) {
              await fetch("/api/tags/link", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  ...getCsrfHeaders(),
                },
                credentials: "include",
                body: JSON.stringify({ linkId: activeId, tagId: targetTagId }),
              });
              useLinksStore.getState().addLinkTag(activeId, targetTagId);
            }
            toast.success(t("kanbanLinkBoard.movedSuccess"));
            await useLinksStore.getState().refreshAllData();
          }
        } catch {
          toast.error(t("kanbanLinkBoard.moveError"));
        }
      }
    },
    [findColumnForLink, columns, linkMap, groupBy, t]
  );

  const totalLinks = filteredLinks.length;
  const hasSearch = deferredSearch.trim() !== "";

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border/50 flex-shrink-0 bg-card/30 backdrop-blur-sm">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t("kanbanLinkBoard.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 pr-8 text-sm bg-secondary/30 border-primary/20 focus:border-primary/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Stats */}
        <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded-full">
          {hasSearch
            ? t("kanbanLinkBoard.filteredCount", {
                filtered: totalLinks,
                total: links.filter((l) => !l.deletedAt).length,
              })
            : t("kanbanLinkBoard.totalCount", {
                count: totalLinks,
                columns: columns.length,
              })}
        </span>

        {/* Group by indicator */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {groupBy === "category" && (
            <FolderOpen className="w-3.5 h-3.5" />
          )}
          {groupBy === "tag" && <TagIcon className="w-3.5 h-3.5" />}
          {groupBy === "readingStatus" && (
            <BookOpen className="w-3.5 h-3.5" />
          )}
          <span>
            {groupBy === "category" && t("kanbanLinkBoard.groupByCategory")}
            {groupBy === "tag" && t("kanbanLinkBoard.groupByTag")}
            {groupBy === "readingStatus" &&
              t("kanbanLinkBoard.groupByStatus")}
          </span>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <ScrollArea className="flex-1">
          <div className="flex gap-4 p-4 h-full min-h-[400px]">
            {columns.map((col) => (
              <KanbanLinkColumn
                key={col.id}
                column={col}
                links={getLinksForColumn(col)}
                linkTagsMap={linkTagsMap}
              />
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Drag overlay */}
        <DragOverlay>
          {activeLink ? (
            <div className="opacity-90 rotate-2 shadow-xl w-[280px]">
              <KanbanLinkCard
                link={activeLink}
                linkTags={linkTagsMap.get(activeLink.id) ?? []}
                isDragging
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
