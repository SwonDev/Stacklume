"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Link as LinkIcon,
  FolderOpen,
  Tag as TagIcon,
  LayoutGrid,
  Loader2,
  Package,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useLinksStore } from "@/stores/links-store";
import { useTranslation } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/es";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface TrashTotals {
  links: number;
  categories: number;
  tags: number;
  widgets: number;
  total: number;
}

interface TrashLink {
  id: string;
  title: string;
  url: string;
  deletedAt: string | null;
  type: "link";
  [key: string]: unknown;
}

interface TrashCategory {
  id: string;
  name: string;
  deletedAt: string | null;
  type: "category";
  color?: string | null;
  icon?: string | null;
  [key: string]: unknown;
}

interface TrashTag {
  id: string;
  name: string;
  deletedAt: string | null;
  type: "tag";
  color?: string | null;
  [key: string]: unknown;
}

interface TrashWidget {
  id: string;
  title: string | null;
  type: "widget";
  deletedAt: string | null;
  size?: string | null;
  [key: string]: unknown;
}

type TrashItem = TrashLink | TrashCategory | TrashTag | TrashWidget;

interface TrashData {
  links: TrashLink[];
  categories: TrashCategory[];
  tags: TrashTag[];
  widgets: TrashWidget[];
  totals: TrashTotals;
}

interface TrashViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

type TFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

function getRelativeTime(dateStr: string | null, t: TFn): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 30) {
    const diffMonths = Math.floor(diffDays / 30);
    return diffMonths === 1 ? t("trash.timeMonth") : t("trash.timeMonths", { count: diffMonths });
  }
  if (diffDays > 0) {
    return diffDays === 1 ? t("trash.timeDay") : t("trash.timeDays", { count: diffDays });
  }
  if (diffHours > 0) {
    return diffHours === 1 ? t("trash.timeHour") : t("trash.timeHours", { count: diffHours });
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? t("trash.timeMinute") : t("trash.timeMinutes", { count: diffMinutes });
  }
  return t("trash.timeJustNow");
}

function getItemDisplayName(item: TrashItem, t: TFn): string {
  switch (item.type) {
    case "link":
      return (item as TrashLink).title || (item as TrashLink).url;
    case "category":
      return (item as TrashCategory).name;
    case "tag":
      return (item as TrashTag).name;
    case "widget":
      return (item as TrashWidget).title || t("trash.untitledWidget");
  }
}

function getItemIcon(type: TrashItem["type"]) {
  switch (type) {
    case "link":
      return <LinkIcon className="h-4 w-4 text-blue-500" />;
    case "category":
      return <FolderOpen className="h-4 w-4 text-amber-500" />;
    case "tag":
      return <TagIcon className="h-4 w-4 text-purple-500" />;
    case "widget":
      return <LayoutGrid className="h-4 w-4 text-emerald-500" />;
  }
}

function getTypeLabel(type: TrashItem["type"], t: TFn): string {
  const map: Record<TrashItem["type"], string> = {
    link: t("trash.typeLink"),
    category: t("trash.typeCategory"),
    tag: t("trash.typeTag"),
    widget: t("trash.typeWidget"),
  };
  return map[type];
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────────

function TrashItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 animate-pulse">
      <div className="h-4 w-4 rounded bg-muted" />
      <div className="flex-1 space-y-1.5">
        <div className="h-4 w-3/5 rounded bg-muted" />
        <div className="h-3 w-1/4 rounded bg-muted" />
      </div>
      <div className="flex gap-1">
        <div className="h-7 w-7 rounded bg-muted" />
        <div className="h-7 w-7 rounded bg-muted" />
      </div>
    </div>
  );
}

// ─── Trash Item Row ─────────────────────────────────────────────────────────────

interface TrashItemRowProps {
  item: TrashItem;
  onRestore: (item: TrashItem) => void;
  onDelete: (item: TrashItem) => void;
  isRestoring: boolean;
  isDeleting: boolean;
  t: TFn;
}

function TrashItemRow({ item, onRestore, onDelete, isRestoring, isDeleting, t }: TrashItemRowProps) {
  const displayName = getItemDisplayName(item, t);
  const relativeTime = getRelativeTime(item.deletedAt, t);
  const isBusy = isRestoring || isDeleting;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
    >
      {getItemIcon(item.type)}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{displayName}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{getTypeLabel(item.type, t)}</span>
          {relativeTime && (
            <>
              <span className="text-muted-foreground/40">&middot;</span>
              <span>{relativeTime}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={() => onRestore(item)}
          disabled={isBusy}
          title={t("trash.restore")}
        >
          {isRestoring ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(item)}
          disabled={isBusy}
          title={t("trash.deletePermanently")}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </motion.div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────────

function EmptyTrash({ filtered, t }: { filtered?: boolean; t: TFn }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Package className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {filtered
          ? t("trash.emptyFiltered")
          : t("trash.emptyAll")}
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        {filtered
          ? t("trash.emptyFilteredDesc")
          : t("trash.emptyAllDesc")}
      </p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export function TrashView({ open, onOpenChange }: TrashViewProps) {
  const [trashData, setTrashData] = useState<TrashData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restoringIds, setRestoringIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [confirmDeleteItem, setConfirmDeleteItem] = useState<TrashItem | null>(null);
  const [confirmEmptyAll, setConfirmEmptyAll] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  const refreshAllData = useLinksStore((s) => s.refreshAllData);
  const { t } = useTranslation();

  // Fetch trash data when dialog opens
  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/trash", {
        credentials: "include",
        cache: "no-store",
      });
      if (res.ok) {
        const data: TrashData = await res.json();
        setTrashData(data);
      } else {
        toast.error(t("trash.errorLoad"));
      }
    } catch (error) {
      console.log("Error fetching trash:", error);
      toast.error(t("trash.errorLoad"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (open) {
      fetchTrash();
    }
  }, [open, fetchTrash]);

  // Restore an item
  const handleRestore = useCallback(async (item: TrashItem) => {
    setRestoringIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch("/api/trash", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        body: JSON.stringify({ id: item.id, type: item.type }),
      });

      if (res.ok) {
        toast.success(t("trash.successRestore", { type: getTypeLabel(item.type, t) }));
        // Remove from local state immediately
        setTrashData((prev) => {
          if (!prev) return prev;
          const typeKey = `${item.type}s` as keyof Omit<TrashData, "totals">;
          // Properly handle the category -> categories pluralization
          const key = item.type === "category" ? "categories" : typeKey;
          const updatedItems = (prev[key] as TrashItem[]).filter((i) => i.id !== item.id);
          return {
            ...prev,
            [key]: updatedItems,
            totals: {
              ...prev.totals,
              [key]: updatedItems.length,
              total: prev.totals.total - 1,
            },
          };
        });
        // Refresh main data
        await refreshAllData();
      } else {
        const data = await res.json();
        toast.error(data.error || t("trash.errorRestore"));
      }
    } catch (error) {
      console.log("Error restoring item:", error);
      toast.error(t("trash.errorRestore"));
    } finally {
      setRestoringIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, [refreshAllData, t]);

  // Permanently delete an item
  const handlePermanentDelete = useCallback(async (item: TrashItem) => {
    setDeletingIds((prev) => new Set(prev).add(item.id));
    try {
      const res = await fetch(
        `/api/trash?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(item.type)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            ...getCsrfHeaders(),
          },
        }
      );

      if (res.ok) {
        toast.success(t("trash.successDelete", { type: getTypeLabel(item.type, t) }));
        // Remove from local state immediately
        setTrashData((prev) => {
          if (!prev) return prev;
          const key = item.type === "category" ? "categories" : (`${item.type}s` as keyof Omit<TrashData, "totals">);
          const updatedItems = (prev[key] as TrashItem[]).filter((i) => i.id !== item.id);
          return {
            ...prev,
            [key]: updatedItems,
            totals: {
              ...prev.totals,
              [key]: updatedItems.length,
              total: prev.totals.total - 1,
            },
          };
        });
      } else {
        const data = await res.json();
        toast.error(data.error || t("trash.errorDelete"));
      }
    } catch (error) {
      console.log("Error deleting item:", error);
      toast.error(t("trash.errorDelete"));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      setConfirmDeleteItem(null);
    }
  }, [t]);

  // Empty all trash
  const handleEmptyAll = useCallback(async () => {
    if (!trashData) return;

    setIsEmptying(true);
    const allItems: TrashItem[] = [
      ...trashData.links,
      ...trashData.categories,
      ...trashData.tags,
      ...trashData.widgets,
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const item of allItems) {
      try {
        const res = await fetch(
          `/api/trash?id=${encodeURIComponent(item.id)}&type=${encodeURIComponent(item.type)}`,
          {
            method: "DELETE",
            credentials: "include",
            headers: {
              ...getCsrfHeaders(),
            },
          }
        );
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch {
        errorCount++;
      }
    }

    if (errorCount === 0) {
      toast.success(t("trash.successEmpty", { count: successCount }));
    } else {
      toast.warning(t("trash.partialEmpty", { success: successCount, errors: errorCount }));
    }

    setTrashData({
      links: [],
      categories: [],
      tags: [],
      widgets: [],
      totals: { links: 0, categories: 0, tags: 0, widgets: 0, total: 0 },
    });
    setIsEmptying(false);
    setConfirmEmptyAll(false);
  }, [trashData, t]);

  const totalCount = trashData?.totals.total ?? 0;

  // Build the item list for each tab
  const renderItemList = (items: TrashItem[]) => {
    if (items.length === 0) {
      return <EmptyTrash filtered t={t} />;
    }

    return (
      <div className="space-y-0.5">
        <AnimatePresence mode="popLayout">
          {items.map((item) => (
            <TrashItemRow
              key={item.id}
              item={item}
              onRestore={handleRestore}
              onDelete={(i) => setConfirmDeleteItem(i)}
              isRestoring={restoringIds.has(item.id)}
              isDeleting={deletingIds.has(item.id)}
              t={t}
            />
          ))}
        </AnimatePresence>
      </div>
    );
  };

  // All items combined, sorted by deletedAt descending
  const allItems: TrashItem[] = trashData
    ? [...trashData.links, ...trashData.categories, ...trashData.tags, ...trashData.widgets]
        .sort((a, b) => {
          const aDate = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
          const bDate = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
          return bDate - aDate;
        })
    : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t("trash.title")}
              {totalCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {totalCount}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("trash.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Empty all button */}
          {totalCount > 0 && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setConfirmEmptyAll(true)}
                disabled={isEmptying}
              >
                {isEmptying ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-1.5" />
                )}
                {t("trash.emptyTrash")}
              </Button>
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="space-y-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <TrashItemSkeleton key={i} />
              ))}
            </div>
          ) : totalCount === 0 ? (
            <EmptyTrash t={t} />
          ) : (
            <Tabs defaultValue="all" className="flex-1 min-h-0 flex flex-col">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="gap-1">
                  {t("trash.all")}
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {totalCount}
                  </Badge>
                </TabsTrigger>
                <TabsTrigger value="links" className="gap-1">
                  {t("trash.links")}
                  {(trashData?.totals.links ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {trashData?.totals.links}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-1">
                  {t("trash.categories")}
                  {(trashData?.totals.categories ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {trashData?.totals.categories}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-1">
                  {t("trash.tags")}
                  {(trashData?.totals.tags ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {trashData?.totals.tags}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="widgets" className="gap-1">
                  {t("trash.widgets")}
                  {(trashData?.totals.widgets ?? 0) > 0 && (
                    <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                      {trashData?.totals.widgets}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 -mx-6 px-6 mt-2" style={{ maxHeight: "calc(80vh - 240px)" }}>
                <TabsContent value="all" className="mt-0">
                  {renderItemList(allItems)}
                </TabsContent>
                <TabsContent value="links" className="mt-0">
                  {renderItemList(trashData?.links ?? [])}
                </TabsContent>
                <TabsContent value="categories" className="mt-0">
                  {renderItemList(trashData?.categories ?? [])}
                </TabsContent>
                <TabsContent value="tags" className="mt-0">
                  {renderItemList(trashData?.tags ?? [])}
                </TabsContent>
                <TabsContent value="widgets" className="mt-0">
                  {renderItemList(trashData?.widgets ?? [])}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm permanent delete single item */}
      <AlertDialog
        open={confirmDeleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("trash.deletePermanently")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDeleteItem && (
                t("trash.confirmDeleteDesc", { name: getItemDisplayName(confirmDeleteItem, t) })
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteItem) {
                  handlePermanentDelete(confirmDeleteItem);
                }
              }}
            >
              {t("trash.deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm empty all trash */}
      <AlertDialog open={confirmEmptyAll} onOpenChange={setConfirmEmptyAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t("trash.emptyTrash")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("trash.confirmEmptyDesc", { count: totalCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleEmptyAll}
            >
              {isEmptying ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : null}
              {t("trash.emptyTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
