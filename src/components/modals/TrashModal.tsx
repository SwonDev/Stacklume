"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Trash2,
  RotateCcw,
  Loader2,
  Link as LinkIcon,
  FolderOpen,
  Tag as TagIcon,
  LayoutGrid,
  Inbox,
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

interface TrashModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TrashItemType = "link" | "category" | "tag" | "widget";
type FilterTab = "all" | TrashItemType;

interface TrashItem {
  id: string;
  type: TrashItemType;
  name: string;
  deletedAt: string;
}

interface TrashTotals {
  links: number;
  categories: number;
  tags: number;
  widgets: number;
  total: number;
}

const TYPE_CONFIG: Record<TrashItemType, { icon: typeof LinkIcon; color: string; bg: string; labelKey: string }> = {
  link:     { icon: LinkIcon,    color: "text-blue-500",   bg: "bg-blue-500/10",   labelKey: "trash.typeLink" },
  category: { icon: FolderOpen,  color: "text-amber-500",  bg: "bg-amber-500/10",  labelKey: "trash.typeCategory" },
  tag:      { icon: TagIcon,     color: "text-pink-500",   bg: "bg-pink-500/10",   labelKey: "trash.typeTag" },
  widget:   { icon: LayoutGrid,  color: "text-green-500",  bg: "bg-green-500/10",  labelKey: "trash.typeWidget" },
};

function getRelativeTime(dateStr: string, t: (key: string, params?: Record<string, string | number>) => string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return t("trash.justNow");
  if (diffMins < 60) return t("trash.minutesAgo", { count: diffMins });
  if (diffHours < 24) return t("trash.hoursAgo", { count: diffHours });
  if (diffDays === 1) return t("trash.yesterday");
  if (diffDays < 30) return t("trash.daysAgo", { count: diffDays });
  return date.toLocaleDateString();
}

export function TrashModal({ open, onOpenChange }: TrashModalProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<TrashItem[]>([]);
  const [totals, setTotals] = useState<TrashTotals>({ links: 0, categories: 0, tags: 0, widgets: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Confirmation dialogs
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<TrashItem | null>(null);
  const [showEmptyAlert, setShowEmptyAlert] = useState(false);
  const [isEmptying, setIsEmptying] = useState(false);

  const fetchTrash = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/trash", {
        headers: getCsrfHeaders(),
        credentials: "include",
      });
      if (!response.ok) throw new Error("Error fetching trash");
      const data = await response.json();

      // Normalize all items into a flat array
      const allItems: TrashItem[] = [
        ...((data.links || []) as Array<{ id: string; title?: string; url?: string; deletedAt: string }>).map(
          (item) => ({
            id: item.id,
            type: "link" as const,
            name: item.title || item.url || "Sin título",
            deletedAt: item.deletedAt,
          })
        ),
        ...((data.categories || []) as Array<{ id: string; name?: string; deletedAt: string }>).map(
          (item) => ({
            id: item.id,
            type: "category" as const,
            name: item.name || "Sin nombre",
            deletedAt: item.deletedAt,
          })
        ),
        ...((data.tags || []) as Array<{ id: string; name?: string; deletedAt: string }>).map(
          (item) => ({
            id: item.id,
            type: "tag" as const,
            name: item.name || "Sin nombre",
            deletedAt: item.deletedAt,
          })
        ),
        ...((data.widgets || []) as Array<{ id: string; title?: string; type?: string; deletedAt: string }>).map(
          (item) => ({
            id: item.id,
            type: "widget" as const,
            name: item.title || item.type || "Widget",
            deletedAt: item.deletedAt,
          })
        ),
      ];

      // Sort by deletedAt descending (most recent first)
      allItems.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

      setItems(allItems);
      setTotals(data.totals || { links: 0, categories: 0, tags: 0, widgets: 0, total: 0 });
    } catch (error) {
      console.error("Error fetching trash:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on open
  useEffect(() => {
    if (open) {
      fetchTrash();
    }
  }, [open, fetchTrash]);

  const handleRestore = useCallback(async (item: TrashItem) => {
    setRestoringId(item.id);
    try {
      const response = await fetch("/api/trash", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCsrfHeaders(),
        },
        credentials: "include",
        body: JSON.stringify({ id: item.id, type: item.type }),
      });
      if (!response.ok) throw new Error("Error restoring item");

      // Remove from local state
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setTotals((prev) => ({
        ...prev,
        [item.type === "link" ? "links" : item.type === "category" ? "categories" : item.type === "tag" ? "tags" : "widgets"]:
          prev[item.type === "link" ? "links" : item.type === "category" ? "categories" : item.type === "tag" ? "tags" : "widgets"] - 1,
        total: prev.total - 1,
      }));

      // Refresh global data so restored items appear in the UI
      useLinksStore.getState().refreshAllData();
    } catch (error) {
      console.error("Error restoring item:", error);
    } finally {
      setRestoringId(null);
    }
  }, []);

  const confirmDelete = useCallback((item: TrashItem) => {
    setPendingDeleteItem(item);
    setShowDeleteAlert(true);
  }, []);

  const handlePermanentDelete = useCallback(async () => {
    if (!pendingDeleteItem) return;
    setDeletingId(pendingDeleteItem.id);
    setShowDeleteAlert(false);
    try {
      const response = await fetch(
        `/api/trash?id=${pendingDeleteItem.id}&type=${pendingDeleteItem.type}`,
        {
          method: "DELETE",
          headers: getCsrfHeaders(),
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Error deleting item");

      // Remove from local state
      setItems((prev) => prev.filter((i) => i.id !== pendingDeleteItem.id));
      const key = pendingDeleteItem.type === "link" ? "links"
        : pendingDeleteItem.type === "category" ? "categories"
        : pendingDeleteItem.type === "tag" ? "tags"
        : "widgets";
      setTotals((prev) => ({
        ...prev,
        [key]: prev[key] - 1,
        total: prev.total - 1,
      }));
    } catch (error) {
      console.error("Error permanently deleting item:", error);
    } finally {
      setDeletingId(null);
      setPendingDeleteItem(null);
    }
  }, [pendingDeleteItem]);

  const handleEmptyTrash = useCallback(async () => {
    setIsEmptying(true);
    setShowEmptyAlert(false);
    try {
      // Delete all items one by one
      for (const item of items) {
        await fetch(`/api/trash?id=${item.id}&type=${item.type}`, {
          method: "DELETE",
          headers: getCsrfHeaders(),
          credentials: "include",
        });
      }

      setItems([]);
      setTotals({ links: 0, categories: 0, tags: 0, widgets: 0, total: 0 });
    } catch (error) {
      console.error("Error emptying trash:", error);
      // Re-fetch to get accurate state
      fetchTrash();
    } finally {
      setIsEmptying(false);
    }
  }, [items, fetchTrash]);

  const filteredItems = useMemo(() => {
    if (activeTab === "all") return items;
    return items.filter((i) => i.type === activeTab);
  }, [items, activeTab]);

  const tabs: { id: FilterTab; labelKey: string; count: number }[] = [
    { id: "all",      labelKey: "trash.tabAll",        count: totals.total },
    { id: "link",     labelKey: "trash.tabLinks",      count: totals.links },
    { id: "category", labelKey: "trash.tabCategories", count: totals.categories },
    { id: "tag",      labelKey: "trash.tabTags",       count: totals.tags },
    { id: "widget",   labelKey: "trash.tabWidgets",    count: totals.widgets },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl glass max-h-[88vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" />
              {t("trash.title")}
              {totals.total > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {totals.total}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {t("trash.description")}
            </DialogDescription>
          </DialogHeader>

          {/* Loading */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">{t("trash.loading")}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && totals.total === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center">
                <Inbox className="w-7 h-7 text-muted-foreground" />
              </div>
              <div>
                <h4 className="font-medium">{t("trash.empty")}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("trash.emptyDesc")}
                </p>
              </div>
            </div>
          )}

          {/* Content */}
          {!isLoading && totals.total > 0 && (
            <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-hidden">
              {/* Tab bar */}
              <div className="flex gap-1.5 overflow-x-auto shrink-0 pb-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                      activeTab === tab.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 border border-transparent"
                    )}
                  >
                    {t(tab.labelKey)}
                    {tab.count > 0 && (
                      <Badge
                        variant={activeTab === tab.id ? "default" : "secondary"}
                        className="h-4 min-w-4 px-1 text-[10px]"
                      >
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>

              {/* Items list */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-1 pr-1">
                  {filteredItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-6">
                      {t("trash.noItemsInTab")}
                    </p>
                  ) : (
                    filteredItems.map((item) => {
                      const cfg = TYPE_CONFIG[item.type];
                      const Icon = cfg.icon;
                      const isRestoring = restoringId === item.id;
                      const isDeleting = deletingId === item.id;

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors"
                        >
                          {/* Type icon */}
                          <div className={cn("p-1.5 rounded-md shrink-0", cfg.bg)}>
                            <Icon className={cn("w-3.5 h-3.5", cfg.color)} />
                          </div>

                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-[10px] h-4 shrink-0">
                                {t(cfg.labelKey)}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">
                                {getRelativeTime(item.deletedAt, t)}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Restore */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-green-600 hover:bg-green-500/10"
                              onClick={() => handleRestore(item)}
                              disabled={isRestoring || isDeleting}
                              aria-label={t("trash.restore")}
                            >
                              {isRestoring ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>

                            {/* Permanent delete */}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                              onClick={() => confirmDelete(item)}
                              disabled={isRestoring || isDeleting}
                              aria-label={t("trash.deletePermanently")}
                            >
                              {isDeleting ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Footer with empty trash button */}
              <div className="flex justify-between items-center pt-1 shrink-0 border-t border-border/40">
                <p className="text-xs text-muted-foreground">
                  {t("trash.itemCount", { count: totals.total })}
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowEmptyAlert(true)}
                  disabled={isEmptying}
                  className="gap-1.5"
                >
                  {isEmptying ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                  {t("trash.emptyTrash")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trash.deleteConfirmDesc", { name: pendingDeleteItem?.name || "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("trash.deletePermanently")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty trash confirmation */}
      <AlertDialog open={showEmptyAlert} onOpenChange={setShowEmptyAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("trash.emptyConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("trash.emptyConfirmDesc", { count: totals.total })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("btn.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("trash.emptyTrash")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
