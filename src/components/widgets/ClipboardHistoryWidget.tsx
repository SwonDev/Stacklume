"use client";

import { useState, useCallback } from "react";
import {
  Clipboard,
  Plus,
  Copy,
  Trash2,
  Search,
  X,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n";

interface ClipboardHistoryWidgetProps {
  widget: Widget;
}

interface ClipboardItem {
  id: string;
  content: string;
  timestamp: string;
  type: "text" | "url" | "code";
}

const MAX_ITEMS = 50;

function detectContentType(content: string): "text" | "url" | "code" {
  // Check if it's a URL
  try {
    new URL(content);
    return "url";
  } catch {
    // Not a URL
  }

  // Check if it looks like code
  const codePatterns = [
    /^[\s]*[{}[\]()]/,
    /function\s*\(/,
    /const\s+\w+/,
    /let\s+\w+/,
    /var\s+\w+/,
    /=>/,
    /import\s+.*from/,
    /export\s+(default\s+)?/,
    /<\/?[a-zA-Z][a-zA-Z0-9]*[^>]*>/,
  ];

  if (codePatterns.some((pattern) => pattern.test(content))) {
    return "code";
  }

  return "text";
}

export function ClipboardHistoryWidget({ widget }: ClipboardHistoryWidgetProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const clipboardHistory: ClipboardItem[] = widget.config?.clipboardHistory || [];

  const saveHistory = useCallback(
    (items: ClipboardItem[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          clipboardHistory: items.slice(0, MAX_ITEMS),
        },
      });
    },
    [widget.id, widget.config]
  );

  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return t("clipboardHistory.timeNow");
    if (minutes < 60) return t("clipboardHistory.timeMinutes", { count: minutes });

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("clipboardHistory.timeHours", { count: hours });

    const days = Math.floor(hours / 24);
    if (days < 7) return t("clipboardHistory.timeDays", { count: days });

    return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  };

  const addFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();

      if (!text.trim()) {
        toast.error(t("clipboardHistory.emptyClipboard"));
        return;
      }

      // Check for duplicates
      const isDuplicate = clipboardHistory.some(
        (item) => item.content === text.trim()
      );

      if (isDuplicate) {
        toast.info(t("clipboardHistory.alreadyExists"));
        return;
      }

      const newItem: ClipboardItem = {
        id: crypto.randomUUID(),
        content: text.trim(),
        timestamp: new Date().toISOString(),
        type: detectContentType(text.trim()),
      };

      saveHistory([newItem, ...clipboardHistory]);
      toast.success(t("clipboardHistory.added"));
    } catch (_error) {
      toast.error(t("clipboardHistory.accessError"));
    }
  };

  const copyToClipboard = async (item: ClipboardItem) => {
    try {
      await navigator.clipboard.writeText(item.content);
      toast.success(t("clipboardHistory.copied"));
    } catch (_error) {
      toast.error(t("clipboardHistory.copyError"));
    }
  };

  const deleteItem = (id: string) => {
    saveHistory(clipboardHistory.filter((item) => item.id !== id));
    toast.success(t("clipboardHistory.deleted"));
  };

  const clearAll = () => {
    saveHistory([]);
    toast.success(t("clipboardHistory.cleared"));
  };

  const filteredItems = searchQuery.trim()
    ? clipboardHistory.filter((item) =>
        item.content.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : clipboardHistory;

  const getTypeColor = (type: ClipboardItem["type"]) => {
    switch (type) {
      case "url":
        return "text-blue-500";
      case "code":
        return "text-green-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getTypeLabel = (type: ClipboardItem["type"]) => {
    switch (type) {
      case "url":
        return t("clipboardHistory.typeUrl");
      case "code":
        return t("clipboardHistory.typeCode");
      default:
        return t("clipboardHistory.typeText");
    }
  };

  // Empty state
  if (clipboardHistory.length === 0) {
    return (
      <div className="@container h-full w-full">
        <div className="flex flex-col items-center justify-center h-full py-6 text-center px-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
            <Clipboard className="w-6 h-6 text-purple-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-1">{t("clipboardHistory.noHistory")}</p>
          <p className="text-xs text-muted-foreground/60 mb-4">
            {t("clipboardHistory.noHistoryDesc")}
          </p>
          <Button size="sm" onClick={addFromClipboard}>
            <Plus className="w-4 h-4 mr-2" />
            {t("clipboardHistory.addCurrent")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 gap-2">
          <div className="flex items-center gap-2">
            <Clipboard className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground hidden @sm:inline">
              {t("clipboardHistory.elements", { count: clipboardHistory.length })}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsSearching(!isSearching)}
              title={t("clipboardHistory.search")}
            >
              <Search className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={addFromClipboard}
              title={t("clipboardHistory.addFromClipboard")}
            >
              <Plus className="w-4 h-4" />
            </Button>
            {clipboardHistory.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive"
                onClick={clearAll}
                title={t("clipboardHistory.clearAll")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Search input */}
        <AnimatePresence>
          {isSearching && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3"
            >
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t("clipboardHistory.searchPlaceholder")}
                  className="h-8 text-sm pl-8 pr-8"
                  autoFocus
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Clipboard items list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <AnimatePresence mode="popLayout">
            {filteredItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
              >
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">{t("clipboardHistory.noResults")}</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="group relative p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={cn(
                              "text-[10px] font-medium uppercase",
                              getTypeColor(item.type)
                            )}
                          >
                            {getTypeLabel(item.type)}
                          </span>
                          <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimestamp(item.timestamp)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "text-xs line-clamp-2 break-all",
                            item.type === "code" && "font-mono"
                          )}
                        >
                          {item.content}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => copyToClipboard(item)}
                          title={t("clipboardHistory.copy")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-destructive"
                          onClick={() => deleteItem(item.id)}
                          title={t("clipboardHistory.delete")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </div>
    </div>
  );
}
