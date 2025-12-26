"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Code2,
  Copy,
  Star,
  Trash2,
  Edit,
  Filter,
  Plus,
  Check,
  Search,
  X,
  MoreHorizontal,
  StarOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface CodeSnippet {
  id: string;
  title: string;
  language: string;
  code: string;
  description?: string;
  tags?: string[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CodeSnippetsConfig {
  snippets?: CodeSnippet[];
}

interface CodeSnippetsWidgetProps {
  widget: Widget;
}

const LANGUAGES = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "C++",
  "C#",
  "Go",
  "Rust",
  "PHP",
  "Ruby",
  "Swift",
  "Kotlin",
  "HTML",
  "CSS",
  "SCSS",
  "JSON",
  "YAML",
  "SQL",
  "Bash",
  "PowerShell",
  "Markdown",
] as const;

const SORT_OPTIONS = [
  { value: "title", label: "Title" },
  { value: "date", label: "Date Added" },
  { value: "language", label: "Language" },
] as const;

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  TypeScript: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  Python: "bg-green-500/20 text-green-700 dark:text-green-400",
  Java: "bg-red-500/20 text-red-700 dark:text-red-400",
  "C++": "bg-pink-500/20 text-pink-700 dark:text-pink-400",
  "C#": "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  Go: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
  Rust: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  PHP: "bg-indigo-500/20 text-indigo-700 dark:text-indigo-400",
  Ruby: "bg-red-600/20 text-red-700 dark:text-red-400",
  Swift: "bg-orange-600/20 text-orange-700 dark:text-orange-400",
  Kotlin: "bg-purple-600/20 text-purple-700 dark:text-purple-400",
  HTML: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
  CSS: "bg-blue-600/20 text-blue-700 dark:text-blue-400",
  SCSS: "bg-pink-600/20 text-pink-700 dark:text-pink-400",
  JSON: "bg-gray-500/20 text-gray-700 dark:text-gray-400",
  YAML: "bg-red-400/20 text-red-700 dark:text-red-400",
  SQL: "bg-blue-400/20 text-blue-700 dark:text-blue-400",
  Bash: "bg-green-600/20 text-green-700 dark:text-green-400",
  PowerShell: "bg-blue-700/20 text-blue-700 dark:text-blue-400",
  Markdown: "bg-gray-600/20 text-gray-700 dark:text-gray-400",
};

export default function CodeSnippetsWidget({ widget }: CodeSnippetsWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as CodeSnippetsConfig) || { snippets: [] };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedSnippet, setSelectedSnippet] = useState<CodeSnippet | null>(null);
  const [editingSnippet, setEditingSnippet] = useState<CodeSnippet | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"title" | "date" | "language">("date");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formLanguage, setFormLanguage] = useState("JavaScript");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formFavorite, setFormFavorite] = useState(false);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    (config.snippets ?? []).forEach((snippet) => {
      snippet.tags?.forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort();
  }, [config.snippets]);

  // Filter and sort snippets
  const filteredSnippets = useMemo(() => {
    let filtered = config.snippets ?? [];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (snippet) =>
          snippet.title.toLowerCase().includes(query) ||
          snippet.code.toLowerCase().includes(query) ||
          snippet.description?.toLowerCase().includes(query) ||
          snippet.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Language filter
    if (languageFilter !== "all") {
      filtered = filtered.filter((snippet) => snippet.language === languageFilter);
    }

    // Tag filter
    if (tagFilter !== "all") {
      filtered = filtered.filter((snippet) => snippet.tags?.includes(tagFilter));
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "date") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === "language") {
        return a.language.localeCompare(b.language);
      }
      return 0;
    });

    // Favorites first
    return sorted.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return 0;
    });
  }, [config.snippets, searchQuery, languageFilter, tagFilter, sortBy]);

  const resetForm = () => {
    setFormTitle("");
    setFormLanguage("JavaScript");
    setFormCode("");
    setFormDescription("");
    setFormTags("");
    setFormFavorite(false);
  };

  const handleAddSnippet = () => {
    if (!formTitle.trim() || !formCode.trim()) return;

    const now = new Date().toISOString();
    const newSnippet: CodeSnippet = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      language: formLanguage,
      code: formCode.trim(),
      description: formDescription.trim() || undefined,
      tags: formTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isFavorite: formFavorite,
      createdAt: now,
      updatedAt: now,
    };

    updateWidget(widget.id, {
      config: {
        ...config,
        snippets: [...(config.snippets ?? []), newSnippet],
      },
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEditSnippet = () => {
    if (!editingSnippet || !formTitle.trim() || !formCode.trim()) return;

    const updatedSnippets = (config.snippets ?? []).map((snippet) =>
      snippet.id === editingSnippet.id
        ? {
            ...snippet,
            title: formTitle.trim(),
            language: formLanguage,
            code: formCode.trim(),
            description: formDescription.trim() || undefined,
            tags: formTags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
            isFavorite: formFavorite,
            updatedAt: new Date().toISOString(),
          }
        : snippet
    );

    updateWidget(widget.id, {
      config: {
        ...config,
        snippets: updatedSnippets,
      },
    });

    resetForm();
    setEditingSnippet(null);
    setIsEditDialogOpen(false);
  };

  const handleDeleteSnippet = (id: string) => {
    updateWidget(widget.id, {
      config: {
        ...config,
        snippets: (config.snippets ?? []).filter((snippet) => snippet.id !== id),
      },
    });
  };

  const handleToggleFavorite = (id: string) => {
    const updatedSnippets = (config.snippets ?? []).map((snippet) =>
      snippet.id === id ? { ...snippet, isFavorite: !snippet.isFavorite } : snippet
    );

    updateWidget(widget.id, {
      config: {
        ...config,
        snippets: updatedSnippets,
      },
    });
  };

  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy code:", error);
    }
  };

  const openViewDialog = (snippet: CodeSnippet) => {
    setSelectedSnippet(snippet);
    setIsViewDialogOpen(true);
  };

  const openEditDialog = (snippet: CodeSnippet) => {
    setEditingSnippet(snippet);
    setFormTitle(snippet.title);
    setFormLanguage(snippet.language);
    setFormCode(snippet.code);
    setFormDescription(snippet.description || "");
    setFormTags(snippet.tags?.join(", ") || "");
    setFormFavorite(snippet.isFavorite ?? false);
    setIsEditDialogOpen(true);
  };

  const activeFiltersCount =
    (searchQuery ? 1 : 0) +
    (languageFilter !== "all" ? 1 : 0) +
    (tagFilter !== "all" ? 1 : 0);

  return (
    <div className="@container h-full flex flex-col">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1">
            <Code2 className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Code Snippets</h3>
          </div>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search snippets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-1.5 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs font-medium">
                      {activeFiltersCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setLanguageFilter("all")}>
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      languageFilter === "all" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  All Languages
                </DropdownMenuItem>
                {LANGUAGES.map((lang) => (
                  <DropdownMenuItem
                    key={lang}
                    onClick={() => setLanguageFilter(lang)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        languageFilter === lang ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {lang}
                  </DropdownMenuItem>
                ))}
                {allTags.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Tags</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setTagFilter("all")}>
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          tagFilter === "all" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      All Tags
                    </DropdownMenuItem>
                    {allTags.map((tag) => (
                      <DropdownMenuItem
                        key={tag}
                        onClick={() => setTagFilter(tag)}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            tagFilter === tag ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {tag}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Select value={sortBy} onValueChange={(value: "title" | "date" | "language") => setSortBy(value)}>
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Snippets List */}
        {filteredSnippets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Code2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h4 className="font-semibold text-lg mb-1">
              {(config.snippets ?? []).length === 0
                ? "No snippets yet"
                : "No snippets found"}
            </h4>
            <p className="text-sm text-muted-foreground mb-4">
              {(config.snippets ?? []).length === 0
                ? "Start saving your code snippets"
                : "Try adjusting your filters"}
            </p>
            {(config.snippets ?? []).length === 0 && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Snippet
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredSnippets.map((snippet) => (
                <motion.div
                  key={snippet.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group relative border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => openViewDialog(snippet)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {snippet.title}
                        </h4>
                        {snippet.isFavorite && (
                          <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500 shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                            LANGUAGE_COLORS[snippet.language] ||
                              "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                          )}
                        >
                          {snippet.language}
                        </span>
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div className="flex items-center gap-1">
                            {snippet.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                            {snippet.tags.length > 2 && (
                              <span className="text-xs text-muted-foreground">
                                +{snippet.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {snippet.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          {snippet.description}
                        </p>
                      )}
                      <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto line-clamp-2">
                        <code className={`language-${snippet.language.toLowerCase()}`}>
                          {snippet.code}
                        </code>
                      </pre>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite(snippet.id);
                        }}
                      >
                        {snippet.isFavorite ? (
                          <StarOff className="h-3.5 w-3.5" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyCode(snippet.code, snippet.id);
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Code
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(snippet);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSnippet(snippet.id);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add Snippet Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Add Code Snippet</DialogTitle>
            <DialogDescription>
              Save a new reusable code snippet to your collection
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="e.g., Debounce hook"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Language *</Label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Textarea
                id="code"
                placeholder="Paste your code here..."
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of what this snippet does"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="e.g., hooks, utility, react (comma-separated)"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="favorite"
                checked={formFavorite}
                onChange={(e) => setFormFavorite(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="favorite" className="cursor-pointer">
                Mark as favorite
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setIsAddDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddSnippet}
              disabled={!formTitle.trim() || !formCode.trim()}
            >
              Add Snippet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Snippet Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {selectedSnippet && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <DialogTitle className="truncate">
                      {selectedSnippet.title}
                    </DialogTitle>
                    {selectedSnippet.isFavorite && (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleCopyCode(
                          selectedSnippet.code,
                          selectedSnippet.id
                        );
                      }}
                    >
                      {copiedId === selectedSnippet.id ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsViewDialogOpen(false);
                        openEditDialog(selectedSnippet);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
                      LANGUAGE_COLORS[selectedSnippet.language] ||
                        "bg-gray-500/20 text-gray-700 dark:text-gray-400"
                    )}
                  >
                    {selectedSnippet.language}
                  </span>
                  {selectedSnippet.tags && selectedSnippet.tags.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      {selectedSnippet.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {selectedSnippet.description && (
                  <DialogDescription className="pt-2">
                    {selectedSnippet.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              <div className="py-4">
                <pre className="bg-muted rounded-lg p-4 overflow-x-auto">
                  <code
                    className={`language-${selectedSnippet.language.toLowerCase()} font-mono text-sm`}
                  >
                    {selectedSnippet.code}
                  </code>
                </pre>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Snippet Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit Code Snippet</DialogTitle>
            <DialogDescription>
              Update your code snippet details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Debounce hook"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-language">Language *</Label>
              <Select value={formLanguage} onValueChange={setFormLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-code">Code *</Label>
              <Textarea
                id="edit-code"
                placeholder="Paste your code here..."
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                placeholder="Brief description of what this snippet does"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                placeholder="e.g., hooks, utility, react (comma-separated)"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-favorite"
                checked={formFavorite}
                onChange={(e) => setFormFavorite(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="edit-favorite" className="cursor-pointer">
                Mark as favorite
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm();
                setEditingSnippet(null);
                setIsEditDialogOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSnippet}
              disabled={!formTitle.trim() || !formCode.trim()}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
