"use client";

import * as React from "react";
import { useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FolderInput,
  Tags,
  Star,
  Trash2,
  X,
  ChevronDown,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useTranslation } from "@/lib/i18n";
import type { Category, Tag } from "@/lib/db/schema";

interface BulkActionsBarProps {
  selectedCount: number;
  onMoveToCategory: (categoryId: string | null) => void;
  onManageTags: (action: "add" | "remove", tagIds: string[]) => void;
  onToggleFavorites: (isFavorite: boolean) => void;
  onDelete: () => void;
  onClearSelection: () => void;
  categories: Category[];
  tags: Tag[];
}

export function BulkActionsBar({
  selectedCount,
  onMoveToCategory,
  onManageTags,
  onToggleFavorites,
  onDelete,
  onClearSelection,
  categories,
  tags,
}: BulkActionsBarProps) {
  const { t } = useTranslation();
  const [tagPopoverOpen, setTagPopoverOpen] = React.useState(false);
  const [selectedTagIds, setSelectedTagIds] = React.useState<string[]>([]);
  const [tagAction, setTagAction] = React.useState<"add" | "remove">("add");
  const prefersReducedMotion = useReducedMotion();

  // Refs for toolbar keyboard navigation
  const toolbarRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Number of focusable buttons in the toolbar (excluding clear selection at the end)
  const BUTTON_COUNT = 4;

  const handleApplyTags = () => {
    if (selectedTagIds.length > 0) {
      onManageTags(tagAction, selectedTagIds);
      setSelectedTagIds([]);
      setTagPopoverOpen(false);
    }
  };

  const handleToggleTag = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Keyboard navigation handler for toolbar
  const handleToolbarKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentIndex = buttonRefs.current.findIndex(
      (ref) => ref === document.activeElement
    );

    if (currentIndex === -1) return;

    let newIndex = currentIndex;

    switch (event.key) {
      case "ArrowRight":
        event.preventDefault();
        newIndex = (currentIndex + 1) % BUTTON_COUNT;
        break;
      case "ArrowLeft":
        event.preventDefault();
        newIndex = (currentIndex - 1 + BUTTON_COUNT) % BUTTON_COUNT;
        break;
      case "Home":
        event.preventDefault();
        newIndex = 0;
        break;
      case "End":
        event.preventDefault();
        newIndex = BUTTON_COUNT - 1;
        break;
      default:
        return;
    }

    buttonRefs.current[newIndex]?.focus();
  }, []);

  // Animation configuration based on reduced motion preference
  const animationProps = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0 },
      }
    : {
        initial: { y: 100, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: 100, opacity: 0 },
        transition: { type: "spring" as const, damping: 25, stiffness: 300 },
      };

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          {...animationProps}
          className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2"
          role="region"
          aria-label={selectedCount !== 1 ? t("linkManager.bulkActionsBarPlural", { count: selectedCount }) : t("linkManager.bulkActionsBar", { count: selectedCount })}
        >
          <div
            ref={toolbarRef}
            role="toolbar"
            aria-label={t("linkManager.bulkActionsToolbar")}
            aria-orientation="horizontal"
            onKeyDown={handleToolbarKeyDown}
            className="bg-background/95 backdrop-blur-md border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3"
          >
            {/* Selection count - live region for screen readers */}
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {selectedCount !== 1 ? t("linkManager.bulkSelectedCountPlural", { count: selectedCount }) : t("linkManager.bulkSelectedCount", { count: selectedCount })}
              </span>
              <div className="w-px h-6 bg-border" aria-hidden="true" />
            </div>

            {/* Move to category */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={(el) => { buttonRefs.current[0] = el; }}
                  variant="outline"
                  size="sm"
                  aria-label={t("linkManager.bulkMoveToCategory")}
                  aria-haspopup="menu"
                  tabIndex={0}
                >
                  <FolderInput className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("linkManager.bulkMoveTo")}</span>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onMoveToCategory(null)}>
                  {t("linkManager.bulkNoCategory")}
                </DropdownMenuItem>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category.id}
                    onClick={() => onMoveToCategory(category.id)}
                  >
                    {category.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Manage tags */}
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  ref={(el) => { buttonRefs.current[1] = el; }}
                  variant="outline"
                  size="sm"
                  aria-label={t("linkManager.bulkManageTagsAria")}
                  aria-haspopup="dialog"
                  aria-expanded={tagPopoverOpen}
                  tabIndex={-1}
                >
                  <Tags className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("linkManager.bulkTags")}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent align="center" className="w-80" role="dialog" aria-label={t("linkManager.bulkManageTags")}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 id="tags-dialog-title" className="font-semibold">{t("linkManager.bulkManageTags")}</h3>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setTagPopoverOpen(false)}
                      aria-label={t("linkManager.bulkCloseTagsPanel")}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </div>

                  {/* Action selector */}
                  <div className="flex gap-2" role="radiogroup" aria-label={t("linkManager.bulkTagActionLabel")}>
                    <Button
                      variant={tagAction === "add" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTagAction("add")}
                      className="flex-1"
                      role="radio"
                      aria-checked={tagAction === "add"}
                    >
                      <Plus className="size-4" aria-hidden="true" />
                      {t("linkManager.bulkAddTags")}
                    </Button>
                    <Button
                      variant={tagAction === "remove" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTagAction("remove")}
                      className="flex-1"
                      role="radio"
                      aria-checked={tagAction === "remove"}
                    >
                      <Minus className="size-4" aria-hidden="true" />
                      {t("linkManager.bulkRemoveTags")}
                    </Button>
                  </div>

                  {/* Tags selection */}
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">
                      {t("linkManager.bulkSelectTags")}
                    </legend>
                    {tags.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {t("linkManager.bulkNoTagsAvailable")}
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2" role="group" aria-label={t("linkManager.bulkTagsList")}>
                        {tags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <Badge
                              key={tag.id}
                              variant={isSelected ? "default" : "outline"}
                              className={cn(
                                "cursor-pointer transition-colors",
                                isSelected &&
                                  "bg-primary text-primary-foreground"
                              )}
                              style={
                                isSelected && tag.color
                                  ? { backgroundColor: tag.color }
                                  : undefined
                              }
                              onClick={() => handleToggleTag(tag.id)}
                              role="checkbox"
                              aria-checked={isSelected}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  handleToggleTag(tag.id);
                                }
                              }}
                            >
                              {tag.name}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </fieldset>

                  {/* Apply button */}
                  <Button
                    onClick={handleApplyTags}
                    disabled={selectedTagIds.length === 0}
                    className="w-full"
                    aria-describedby={selectedTagIds.length === 0 ? "tags-hint" : undefined}
                  >
                    {t("linkManager.bulkApplyChanges")}
                  </Button>
                  {selectedTagIds.length === 0 && (
                    <span id="tags-hint" className="sr-only">
                      {t("linkManager.bulkSelectAtLeastOneTag")}
                    </span>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Toggle favorites */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  ref={(el) => { buttonRefs.current[2] = el; }}
                  variant="outline"
                  size="sm"
                  aria-label={t("linkManager.bulkManageFavorites")}
                  aria-haspopup="menu"
                  tabIndex={-1}
                >
                  <Star className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("linkManager.bulkFavorites")}</span>
                  <ChevronDown className="size-4" aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onToggleFavorites(true)}>
                  {t("linkManager.bulkMarkAsFavorites")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleFavorites(false)}>
                  {t("linkManager.bulkUnmarkFavorites")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  ref={(el) => { buttonRefs.current[3] = el; }}
                  variant="outline"
                  size="sm"
                  aria-label={selectedCount !== 1 ? t("linkManager.bulkDeleteAriaPlural", { count: selectedCount }) : t("linkManager.bulkDeleteAria", { count: selectedCount })}
                  tabIndex={-1}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("linkManager.bulkDelete")}</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("linkManager.bulkDeleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {selectedCount !== 1
                      ? t("linkManager.bulkDeleteConfirmDescPlural", { count: selectedCount })
                      : t("linkManager.bulkDeleteConfirmDesc", { count: selectedCount })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("linkManager.cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDelete}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {t("linkManager.bulkDelete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Clear selection */}
            <div className="w-px h-6 bg-border" aria-hidden="true" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClearSelection}
              aria-label={t("linkManager.bulkClearSelection")}
            >
              <X className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
