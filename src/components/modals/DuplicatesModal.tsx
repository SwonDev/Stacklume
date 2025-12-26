"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import {
  Copy,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
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
import { useLinksStore } from "@/stores/links-store";
import { cn } from "@/lib/utils";
import type { Link } from "@/lib/db/schema";
import { motion, AnimatePresence } from "motion/react";

interface DuplicatesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DuplicateGroup {
  url: string;
  links: Link[];
  expanded: boolean;
  selectedIds: Set<string>;
}

export function DuplicatesModal({ open, onOpenChange }: DuplicatesModalProps) {
  const findDuplicates = useLinksStore((state) => state.findDuplicates);
  const removeLink = useLinksStore((state) => state.removeLink);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const duplicates = useMemo(() => findDuplicates(), [findDuplicates]);

  const [groups, setGroups] = useState<DuplicateGroup[]>(() =>
    duplicates.map((d) => ({
      ...d,
      expanded: false,
      selectedIds: new Set<string>(),
    }))
  );

  // Use ref to track previous groups for merging state
  const groupsRef = useRef(groups);

  // Update ref in useEffect to avoid accessing during render
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Update groups when duplicates change
  useEffect(() => {
    setGroups(
      duplicates.map((d) => {
        const existing = groupsRef.current.find((g) => g.url === d.url);
        return {
          ...d,
          expanded: existing?.expanded || false,
          selectedIds: existing?.selectedIds || new Set<string>(),
        };
      })
    );
  }, [duplicates]);

  const toggleExpand = (url: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.url === url ? { ...g, expanded: !g.expanded } : g
      )
    );
  };

  const toggleSelect = (url: string, linkId: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.url !== url) return g;
        const newSelected = new Set(g.selectedIds);
        if (newSelected.has(linkId)) {
          newSelected.delete(linkId);
        } else {
          newSelected.add(linkId);
        }
        return { ...g, selectedIds: newSelected };
      })
    );
  };

  const selectAllExceptFirst = (url: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.url !== url) return g;
        // Select all except the first (oldest or most complete)
        const idsToSelect = g.links.slice(1).map((l) => l.id);
        return { ...g, selectedIds: new Set(idsToSelect) };
      })
    );
  };

  const handleDelete = async () => {
    if (pendingDeleteIds.length === 0) return;

    // Delete via API
    for (const id of pendingDeleteIds) {
      try {
        await fetch(`/api/links/${id}`, { method: "DELETE" });
        removeLink(id);
      } catch (error) {
        console.error("Error deleting link:", error);
      }
    }

    setPendingDeleteIds([]);
    setShowDeleteAlert(false);

    // Clear selections
    setGroups((prev) =>
      prev.map((g) => ({ ...g, selectedIds: new Set<string>() }))
    );
  };

  const confirmDeleteSelected = () => {
    const allSelected = groups.flatMap((g) => Array.from(g.selectedIds));
    if (allSelected.length === 0) return;
    setPendingDeleteIds(allSelected);
    setShowDeleteAlert(true);
  };

  const totalSelected = groups.reduce(
    (acc, g) => acc + g.selectedIds.size,
    0
  );

  if (duplicates.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-primary" />
              Duplicados
            </DialogTitle>
            <DialogDescription>
              Detecta y elimina enlaces duplicados
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-green-500" />
            </div>
            <h4 className="font-medium">No hay duplicados</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Todos tus enlaces son únicos
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl glass">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Duplicados encontrados
            </DialogTitle>
            <DialogDescription>
              Se encontraron {duplicates.length} URLs con enlaces duplicados
            </DialogDescription>
          </DialogHeader>

          {/* Actions bar */}
          {totalSelected > 0 && (
            <div className="flex items-center justify-between p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <span className="text-sm">
                {totalSelected} enlace{totalSelected > 1 ? "s" : ""} seleccionado{totalSelected > 1 ? "s" : ""}
              </span>
              <Button
                size="sm"
                variant="destructive"
                onClick={confirmDeleteSelected}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar seleccionados
              </Button>
            </div>
          )}

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2">
              {groups.map((group) => (
                <div
                  key={group.url}
                  className="rounded-lg border border-border/50 overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    onClick={() => toggleExpand(group.url)}
                    className="w-full flex items-center gap-2 p-3 hover:bg-secondary/50 transition-colors text-left"
                  >
                    {group.expanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate flex-1">
                      {group.url}
                    </span>
                    <Badge variant="secondary" className="flex-shrink-0">
                      {group.links.length} duplicados
                    </Badge>
                  </button>

                  {/* Expanded links */}
                  <AnimatePresence>
                    {group.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-border/50"
                      >
                        {/* Quick action */}
                        <div className="p-2 bg-secondary/30 border-b border-border/50">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => selectAllExceptFirst(group.url)}
                          >
                            Seleccionar todos excepto el primero
                          </Button>
                        </div>

                        {/* Links list */}
                        <div className="divide-y divide-border/30">
                          {group.links.map((link, index) => (
                            <div
                              key={link.id}
                              className={cn(
                                "flex items-center gap-3 p-3",
                                group.selectedIds.has(link.id) &&
                                  "bg-destructive/5"
                              )}
                            >
                              <Checkbox
                                checked={group.selectedIds.has(link.id)}
                                onCheckedChange={() =>
                                  toggleSelect(group.url, link.id)
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium truncate">
                                    {link.title}
                                  </span>
                                  {index === 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] h-5"
                                    >
                                      Original
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                                  <span>
                                    Creado:{" "}
                                    {new Date(link.createdAt).toLocaleDateString()}
                                  </span>
                                  {link.categoryId && (
                                    <span>• Con categoría</span>
                                  )}
                                  {link.isFavorite && (
                                    <span>• Favorito</span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={link.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                              >
                                <ExternalLink className="w-4 h-4 text-muted-foreground" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar enlaces duplicados?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán {pendingDeleteIds.length} enlace
              {pendingDeleteIds.length > 1 ? "s" : ""} duplicado
              {pendingDeleteIds.length > 1 ? "s" : ""}. Esta acción no se puede
              deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
