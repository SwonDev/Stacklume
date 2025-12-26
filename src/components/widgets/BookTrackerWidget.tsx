"use client";

import { useState, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Target,
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface BookTrackerWidgetProps {
  widget: Widget;
}

interface Book {
  id: string;
  title: string;
  author?: string;
  totalPages: number;
  currentPage: number;
  addedAt: string;
  completedAt?: string;
}

export function BookTrackerWidget({ widget }: BookTrackerWidgetProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [newTotalPages, setNewTotalPages] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);

  const books: Book[] = widget.config?.books || [];
  const yearlyGoal: number = widget.config?.yearlyGoal || 12;
  const currentYear = new Date().getFullYear();

  const saveBooks = useCallback(
    (items: Book[]) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          books: items,
        },
      });
    },
    [widget.id, widget.config]
  );

  const saveYearlyGoal = useCallback(
    (goal: number) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          yearlyGoal: goal,
        },
      });
    },
    [widget.id, widget.config]
  );

  const addBook = () => {
    if (!newTitle.trim() || !newTotalPages.trim()) return;

    const newBook: Book = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      author: newAuthor.trim(),
      totalPages: parseInt(newTotalPages) || 1,
      currentPage: 0,
      addedAt: new Date().toISOString(),
    };

    saveBooks([newBook, ...books]);
    setNewTitle("");
    setNewAuthor("");
    setNewTotalPages("");
    setIsAdding(false);
  };

  const deleteBook = (id: string) => {
    saveBooks(books.filter((b) => b.id !== id));
  };

  const updateBookPage = (id: string, page: number) => {
    saveBooks(
      books.map((b) => {
        if (b.id !== id) return b;
        const newPage = Math.max(0, Math.min(page, b.totalPages));
        const isNowComplete = newPage >= b.totalPages && b.currentPage < b.totalPages;
        return {
          ...b,
          currentPage: newPage,
          completedAt: isNowComplete ? new Date().toISOString() : b.completedAt,
        };
      })
    );
  };

  const startEditingPage = (book: Book) => {
    setEditingBookId(book.id);
    setEditingPage(book.currentPage.toString());
  };

  const confirmPageEdit = (bookId: string) => {
    const page = parseInt(editingPage);
    if (!isNaN(page)) {
      updateBookPage(bookId, page);
    }
    setEditingBookId(null);
    setEditingPage("");
  };

  const cancelPageEdit = () => {
    setEditingBookId(null);
    setEditingPage("");
  };

  // Calculate yearly stats
  const booksCompletedThisYear = books.filter((b) => {
    if (!b.completedAt) return false;
    return new Date(b.completedAt).getFullYear() === currentYear;
  }).length;

  const yearlyProgress = Math.min((booksCompletedThisYear / yearlyGoal) * 100, 100);

  const activeBooks = books.filter((b) => b.currentPage < b.totalPages);
  const completedBooks = books.filter((b) => b.currentPage >= b.totalPages);

  const getProgressPercentage = (book: Book) =>
    Math.round((book.currentPage / book.totalPages) * 100);

  const renderBookCard = (book: Book) => {
    const progress = getProgressPercentage(book);
    const isCompleted = book.currentPage >= book.totalPages;
    const isEditing = editingBookId === book.id;

    return (
      <motion.div
        key={book.id}
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className={cn(
          "group p-3 rounded-lg border transition-colors",
          isCompleted
            ? "bg-emerald-500/5 border-emerald-500/20"
            : "bg-card border-border hover:border-primary/30"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs @sm:text-sm font-medium truncate">{book.title}</p>
            {book.author && (
              <p className="text-[10px] @sm:text-xs text-muted-foreground truncate">
                {book.author}
              </p>
            )}
          </div>
          <button
            onClick={() => deleteBook(book.id)}
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Section */}
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] @sm:text-xs">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editingPage}
                  onChange={(e) => setEditingPage(e.target.value)}
                  className="h-5 w-14 text-[10px] px-1"
                  type="number"
                  min={0}
                  max={book.totalPages}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") confirmPageEdit(book.id);
                    if (e.key === "Escape") cancelPageEdit();
                  }}
                />
                <span className="text-muted-foreground">/ {book.totalPages}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => confirmPageEdit(book.id)}
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={cancelPageEdit}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => startEditingPage(book)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>
                  {book.currentPage} / {book.totalPages} paginas
                </span>
                <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100" />
              </button>
            )}
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] @sm:text-[10px] h-4",
                isCompleted
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                  : "bg-primary/10 text-primary border-primary/30"
              )}
            >
              {progress}%
            </Badge>
          </div>
          <Progress value={progress} className="h-1.5" />

          {/* Quick page update buttons */}
          {!isCompleted && !isEditing && (
            <div className="flex gap-1 pt-1">
              {[10, 25, 50].map((pages) => (
                <Button
                  key={pages}
                  variant="outline"
                  size="sm"
                  className="h-5 px-1.5 text-[9px] flex-1"
                  onClick={() => updateBookPage(book.id, book.currentPage + pages)}
                  disabled={book.currentPage + pages > book.totalPages}
                >
                  +{pages}
                </Button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">
              {activeBooks.length} leyendo
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Yearly Goal */}
        <div className="mb-3 p-2 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] @sm:text-xs font-medium">
                Meta {currentYear}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-xs"
                onClick={() => saveYearlyGoal(Math.max(1, yearlyGoal - 1))}
              >
                -
              </Button>
              <span className="text-[10px] @sm:text-xs text-muted-foreground min-w-[4ch] text-center">
                {booksCompletedThisYear}/{yearlyGoal}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-xs"
                onClick={() => saveYearlyGoal(yearlyGoal + 1)}
              >
                +
              </Button>
            </div>
          </div>
          <Progress value={yearlyProgress} className="h-1.5" />
        </div>

        {/* Add Form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mb-3 space-y-2 overflow-hidden"
            >
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titulo del libro..."
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <Input
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="Autor"
                  className="h-8 text-sm flex-1"
                />
                <Input
                  value={newTotalPages}
                  onChange={(e) => setNewTotalPages(e.target.value)}
                  placeholder="Paginas"
                  type="number"
                  className="h-8 text-sm w-20"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-7 flex-1"
                  onClick={addBook}
                  disabled={!newTitle.trim() || !newTotalPages.trim()}
                >
                  Agregar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTitle("");
                    setNewAuthor("");
                    setNewTotalPages("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Books List */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          {books.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BookOpen className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Sin libros guardados</p>
              <p className="text-xs">Agrega uno para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Active Books */}
              {activeBooks.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] @sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Leyendo ({activeBooks.length})
                  </p>
                  <AnimatePresence mode="popLayout">
                    {activeBooks.map(renderBookCard)}
                  </AnimatePresence>
                </div>
              )}

              {/* Completed Books */}
              {completedBooks.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center gap-1 text-[10px] @sm:text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground transition-colors"
                  >
                    {showCompleted ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                    Completados ({completedBooks.length})
                  </button>
                  <AnimatePresence>
                    {showCompleted && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {completedBooks.map(renderBookCard)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
