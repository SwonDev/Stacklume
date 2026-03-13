"use client";

import { useState } from "react";
import { Star, FolderOpen, Tag, Trash2, X, CheckSquare, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
import { useMultiSelect } from "@/hooks/useMultiSelect";
import { useLinksStore } from "@/stores/links-store";
import { getCsrfHeaders } from "@/hooks/useCsrf";
import { toast } from "sonner";
import { DevPromptModal } from "@/components/modals/DevPromptModal";

export function BulkActionsBar() {
  const { isSelecting, selectedIds, clearSelection, exitSelecting, selectAll } =
    useMultiSelect();
  const links = useLinksStore((s) => s.links);
  const categories = useLinksStore((s) => s.categories);
  const tags = useLinksStore((s) => s.tags);
  const refreshAllData = useLinksStore((s) => s.refreshAllData);
  const [devPromptOpen, setDevPromptOpen] = useState(false);

  const count = selectedIds.size;

  const handleMarkFavorite = async (isFavorite: boolean) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ isFavorite }),
          })
        )
      );
      await refreshAllData();
      toast.success(
        `${ids.length} enlace${ids.length > 1 ? "s" : ""} ${isFavorite ? "marcado" : "desmarcado"}${ids.length > 1 ? "s" : ""} como favorito${ids.length > 1 ? "s" : ""}`
      );
      clearSelection();
    } catch {
      toast.error("Error al actualizar favoritos");
    }
  };

  const handleMoveToCategory = async (categoryId: string) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ categoryId: categoryId === "none" ? null : categoryId }),
          })
        )
      );
      await refreshAllData();
      toast.success(
        `${ids.length} enlace${ids.length > 1 ? "s" : ""} movido${ids.length > 1 ? "s" : ""}`
      );
      clearSelection();
    } catch {
      toast.error("Error al mover enlaces");
    }
  };

  const handleAddTag = async (tagId: string) => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch("/api/tags/link", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
            credentials: "include",
            body: JSON.stringify({ linkId: id, tagId }),
          })
        )
      );
      await refreshAllData();
      toast.success(`Etiqueta añadida a ${ids.length} enlace${ids.length > 1 ? "s" : ""}`);
      clearSelection();
    } catch {
      toast.error("Error al etiquetar");
    }
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/links/${id}`, {
            method: "DELETE",
            headers: getCsrfHeaders(),
            credentials: "include",
          })
        )
      );
      await refreshAllData();
      toast.success(
        `${ids.length} enlace${ids.length > 1 ? "s" : ""} movido${ids.length > 1 ? "s" : ""} a la papelera`
      );
      exitSelecting();
    } catch {
      toast.error("Error al eliminar");
    }
  };

  return (
    <>
    <AnimatePresence>
      {isSelecting && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-background/95 backdrop-blur border rounded-xl shadow-xl px-4 py-3"
          role="toolbar"
          aria-label="Acciones en lote"
        >
          <span className="text-sm font-medium mr-2 whitespace-nowrap">
            {count > 0 ? `${count} seleccionado${count > 1 ? "s" : ""}` : "Seleccionar enlaces"}
          </span>

          <div className="flex items-center gap-1">
            {/* Seleccionar todos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => selectAll(links.map((l) => l.id))}
                  aria-label="Seleccionar todos"
                >
                  <CheckSquare className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Seleccionar todos</p>
              </TooltipContent>
            </Tooltip>

            {/* Acciones que requieren selección */}
            {count > 0 && (<>
            {/* Marcar como favoritos */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleMarkFavorite(true)}
                  aria-label="Marcar como favoritos"
                >
                  <Star className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Marcar como favoritos</p>
              </TooltipContent>
            </Tooltip>

            {/* Mover a categoría */}
            <Select onValueChange={handleMoveToCategory}>
              <SelectTrigger className="h-8 w-auto gap-1 text-xs border-none bg-transparent hover:bg-accent">
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Mover</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Etiquetar (solo si hay tags) */}
            {tags.length > 0 && (
              <Select onValueChange={handleAddTag}>
                <SelectTrigger className="h-8 w-auto gap-1 text-xs border-none bg-transparent hover:bg-accent">
                  <Tag className="w-3.5 h-3.5" />
                  <span>Etiquetar</span>
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

            {/* DevKit — generar prompt */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-primary hover:text-primary hover:bg-primary/10"
                  onClick={() => setDevPromptOpen(true)}
                  aria-label="Generar prompt DevKit"
                >
                  <Terminal className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>DevKit — Generar prompt</p>
              </TooltipContent>
            </Tooltip>

            {/* Eliminar */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  aria-label="Eliminar seleccionados"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Eliminar</p>
              </TooltipContent>
            </Tooltip>
            </>)}
          </div>

          {/* Cancelar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                onClick={exitSelecting}
                aria-label="Cancelar selección"
              >
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Cancelar</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>
      )}
    </AnimatePresence>

    <DevPromptModal open={devPromptOpen} onClose={() => setDevPromptOpen(false)} />
    </>
  );
}
