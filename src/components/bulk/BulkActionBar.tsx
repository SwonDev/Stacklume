"use client";

import { motion, AnimatePresence } from "motion/react";
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useLinksStore } from "@/stores/links-store";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Trash2,
  Star,
  FolderOpen,
  Tag,
  X,
  CheckSquare,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { useTranslation } from "@/lib/i18n";

export function BulkActionBar() {
  const { isSelecting, selectedIds, clearSelection, exitSelecting, selectAll } =
    useMultiSelect();
  const links = useLinksStore((s) => s.links);
  const categories = useLinksStore((s) => s.categories);
  const tags = useLinksStore((s) => s.tags);
  const refreshAllData = useLinksStore((s) => s.refreshAllData);
  const { t } = useTranslation();
  const count = selectedIds.size;

  if (!isSelecting || count === 0) return null;

  const handleBulkFavorite = async (isFavorite: boolean) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ isFavorite }),
          })
        )
      );
      await refreshAllData();
      toast.success(
        t(isFavorite ? "bulk.successFavorite" : "bulk.successUnfavorite", { count: ids.length })
      );
      clearSelection();
    } catch {
      toast.error(t("bulk.errorFavorite"));
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "DELETE",
            headers: { ...getCsrfHeaders() },
            credentials: "include",
          })
        )
      );
      await refreshAllData();
      toast.success(t("bulk.successDelete", { count: ids.length }));
      clearSelection();
    } catch {
      toast.error(t("bulk.errorDelete"));
    }
  };

  const handleBulkMove = async (categoryId: string | null) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ categoryId }),
          })
        )
      );
      await refreshAllData();
      toast.success(t("bulk.successMove", { count: ids.length }));
      clearSelection();
    } catch {
      toast.error(t("bulk.errorMove"));
    }
  };

  const handleBulkTag = async (tagId: string) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch("/api/link-tags", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ linkId: id, tagId }),
          })
        )
      );
      await refreshAllData();
      toast.success(t("bulk.successTag", { count: ids.length }));
      clearSelection();
    } catch {
      toast.error(t("bulk.errorTag"));
    }
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ isRead: true }),
          })
        )
      );
      await refreshAllData();
      toast.success(t("bulk.successRead", { count: ids.length }));
      clearSelection();
    } catch {
      toast.error(t("bulk.errorRead"));
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/95 backdrop-blur border rounded-xl shadow-xl px-4 py-3"
        role="toolbar"
        aria-label={t("bulk.ariaToolbar")}
      >
        <span className="text-sm font-medium mr-2 whitespace-nowrap">
          {t("bulk.selected", { count })}
        </span>

        <div className="flex items-center gap-1">
          {/* Seleccionar todos */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => selectAll(links.map((l) => l.id))}
                aria-label={t("bulk.selectAll")}
              >
                <CheckSquare className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t("bulk.selectAll")}</p>
            </TooltipContent>
          </Tooltip>

          {/* Marcar como favorito */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleBulkFavorite(true)}
                aria-label={t("bulk.markFavorites")}
              >
                <Star className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t("bulk.markFavorites")}</p>
            </TooltipContent>
          </Tooltip>

          {/* Marcar como leído */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBulkMarkRead}
                aria-label={t("bulk.markRead")}
              >
                <Eye className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t("bulk.markRead")}</p>
            </TooltipContent>
          </Tooltip>

          {/* Mover a categoría */}
          <Select
            onValueChange={(val) => handleBulkMove(val === "none" ? null : val)}
          >
            <SelectTrigger className="h-8 w-auto gap-1 text-xs border-none bg-transparent hover:bg-accent">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{t("bulk.move")}</span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t("bulk.noCategory")}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Añadir etiqueta */}
          {tags.length > 0 && (
            <Select onValueChange={handleBulkTag}>
              <SelectTrigger className="h-8 w-auto gap-1 text-xs border-none bg-transparent hover:bg-accent">
                <Tag className="w-3.5 h-3.5" />
                <span>{t("bulk.label")}</span>
              </SelectTrigger>
              <SelectContent>
                {tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Eliminar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleBulkDelete}
                aria-label={t("bulk.deleteLabel")}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{t("bulk.deleteLabel")}</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Cerrar selección */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              onClick={exitSelecting}
              aria-label={t("bulk.cancel")}
            >
              <X className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p>{t("bulk.cancel")}</p>
          </TooltipContent>
        </Tooltip>
      </motion.div>
    </AnimatePresence>
  );
}
