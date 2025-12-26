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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileCheck,
  Plus,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Copy,
  Link2,
  ArrowUpDown,
  Calendar,
  User,
  Tag,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface Decision {
  id: string;
  title: string;
  status: "proposed" | "accepted" | "deprecated" | "superseded";
  date: string;
  author?: string;
  tags: string[];
  context: string;
  decision: string;
  consequences: string;
  supersededBy?: string;
  relatedDecisions: string[];
}

interface DecisionLogConfig {
  decisions: Decision[];
  sortBy: "date" | "title" | "status";
  sortOrder: "asc" | "desc";
  filterStatus: "all" | "proposed" | "accepted" | "deprecated" | "superseded";
}

const STATUS_CONFIG = {
  proposed: { label: "Proposed", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  accepted: { label: "Accepted", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  deprecated: { label: "Deprecated", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  superseded: { label: "Superseded", color: "bg-gray-500/10 text-gray-600 border-gray-500/20" },
} as const;

export function DecisionLogWidget({ widget }: { widget: Widget }) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as DecisionLogConfig) || {
    decisions: [],
    sortBy: "date",
    sortOrder: "desc",
    filterStatus: "all",
  };

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Decision>>({
    title: "",
    status: "proposed",
    author: "",
    tags: [],
    context: "",
    decision: "",
    consequences: "",
    supersededBy: "",
    relatedDecisions: [],
  });
  const [currentTag, setCurrentTag] = useState("");

  const updateConfig = (updates: Partial<DecisionLogConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const addDecision = () => {
    const newDecision: Decision = {
      id: crypto.randomUUID(),
      title: formData.title || "",
      status: formData.status || "proposed",
      date: new Date().toISOString(),
      author: formData.author,
      tags: formData.tags || [],
      context: formData.context || "",
      decision: formData.decision || "",
      consequences: formData.consequences || "",
      supersededBy: formData.supersededBy,
      relatedDecisions: formData.relatedDecisions || [],
    };

    updateConfig({
      decisions: [...config.decisions, newDecision],
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const updateDecision = () => {
    if (!selectedDecision) return;

    updateConfig({
      decisions: config.decisions.map((d) =>
        d.id === selectedDecision.id
          ? {
              ...d,
              title: formData.title || d.title,
              status: formData.status || d.status,
              author: formData.author,
              tags: formData.tags || d.tags,
              context: formData.context || d.context,
              decision: formData.decision || d.decision,
              consequences: formData.consequences || d.consequences,
              supersededBy: formData.supersededBy,
              relatedDecisions: formData.relatedDecisions || d.relatedDecisions,
            }
          : d
      ),
    });

    resetForm();
    setIsEditDialogOpen(false);
    setSelectedDecision(null);
  };

  const deleteDecision = (id: string) => {
    updateConfig({
      decisions: config.decisions.filter((d) => d.id !== id),
    });
    if (selectedDecision?.id === id) {
      setSelectedDecision(null);
      setIsViewDialogOpen(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      status: "proposed",
      author: "",
      tags: [],
      context: "",
      decision: "",
      consequences: "",
      supersededBy: "",
      relatedDecisions: [],
    });
    setCurrentTag("");
  };

  const openEditDialog = (decision: Decision) => {
    setSelectedDecision(decision);
    setFormData({
      title: decision.title,
      status: decision.status,
      author: decision.author,
      tags: decision.tags,
      context: decision.context,
      decision: decision.decision,
      consequences: decision.consequences,
      supersededBy: decision.supersededBy,
      relatedDecisions: decision.relatedDecisions,
    });
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(true);
  };

  const viewDecision = (decision: Decision) => {
    setSelectedDecision(decision);
    setIsViewDialogOpen(true);
  };

  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), currentTag.trim()],
      });
      setCurrentTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  const exportAsMarkdown = (decision: Decision) => {
    const supersededDecision = decision.supersededBy
      ? config.decisions.find((d) => d.id === decision.supersededBy)
      : null;

    const relatedDecisionsList = decision.relatedDecisions
      .map((id) => {
        const related = config.decisions.find((d) => d.id === id);
        return related ? `- ${related.title}` : null;
      })
      .filter(Boolean)
      .join("\n");

    const markdown = `# ${decision.title}

**Status:** ${STATUS_CONFIG[decision.status].label}
**Date:** ${new Date(decision.date).toLocaleDateString()}
${decision.author ? `**Author:** ${decision.author}  ` : ""}
${decision.tags.length > 0 ? `**Tags:** ${decision.tags.join(", ")}  ` : ""}

## Context

${decision.context}

## Decision

${decision.decision}

## Consequences

${decision.consequences}

${supersededDecision ? `\n## Superseded By\n\n${supersededDecision.title}\n` : ""}
${relatedDecisionsList ? `\n## Related Decisions\n\n${relatedDecisionsList}\n` : ""}
`;

    navigator.clipboard.writeText(markdown);
  };

  const exportAllAsMarkdown = () => {
    const markdown = config.decisions
      .map((decision, index) => {
        const supersededDecision = decision.supersededBy
          ? config.decisions.find((d) => d.id === decision.supersededBy)
          : null;

        return `# ADR ${index + 1}: ${decision.title}

**Status:** ${STATUS_CONFIG[decision.status].label}
**Date:** ${new Date(decision.date).toLocaleDateString()}
${decision.author ? `**Author:** ${decision.author}  ` : ""}
${decision.tags.length > 0 ? `**Tags:** ${decision.tags.join(", ")}  ` : ""}

## Context

${decision.context}

## Decision

${decision.decision}

## Consequences

${decision.consequences}

${supersededDecision ? `\n## Superseded By\n\n${supersededDecision.title}\n` : ""}

---
`;
      })
      .join("\n\n");

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-log-${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyDecisionId = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const filteredAndSortedDecisions = useMemo(() => {
    let filtered = [...config.decisions];

    // Filter by status
    if (config.filterStatus !== "all") {
      filtered = filtered.filter((d) => d.status === config.filterStatus);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(query) ||
          d.context.toLowerCase().includes(query) ||
          d.decision.toLowerCase().includes(query) ||
          d.tags.some((t) => t.toLowerCase().includes(query)) ||
          d.author?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (config.sortBy) {
        case "date":
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "status":
          comparison = a.status.localeCompare(b.status);
          break;
      }
      return config.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [config.decisions, config.filterStatus, config.sortBy, config.sortOrder, searchQuery]);

  const statusCounts = useMemo(() => {
    return config.decisions.reduce(
      (acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [config.decisions]);

  const toggleSort = () => {
    updateConfig({
      sortOrder: config.sortOrder === "asc" ? "desc" : "asc",
    });
  };

  return (
    <div className="@container h-full w-full p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCheck className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Decision Log</h3>
          {config.decisions.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {config.decisions.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowFilterMenu(!showFilterMenu)}
          >
            <Filter className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportAllAsMarkdown}>
                <Download className="mr-2 h-4 w-4" />
                Export All as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            onClick={() => setIsAddDialogOpen(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <AnimatePresence>
        {showFilterMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex items-center gap-2 pb-3 border-b">
              <Select
                value={config.filterStatus}
                onValueChange={(value) =>
                  updateConfig({
                    filterStatus: value as DecisionLogConfig["filterStatus"],
                  })
                }
              >
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="proposed">Proposed</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                  <SelectItem value="superseded">Superseded</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={config.sortBy}
                onValueChange={(value) =>
                  updateConfig({ sortBy: value as DecisionLogConfig["sortBy"] })
                }
              >
                <SelectTrigger className="h-8 w-[120px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="title">Sort by Title</SelectItem>
                  <SelectItem value="status">Sort by Status</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleSort}
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>

              {config.filterStatus !== "all" && (
                <div className="flex items-center gap-1 ml-auto">
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <Badge
                      key={status}
                      variant="secondary"
                      className={cn("text-xs", STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color)}
                    >
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search decisions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1 h-7 w-7"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Decisions List */}
      <ScrollArea className="flex-1">
        {filteredAndSortedDecisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">
              {searchQuery || config.filterStatus !== "all"
                ? "No decisions found"
                : "No decisions yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery || config.filterStatus !== "all"
                ? "Try adjusting your filters"
                : "Add your first architecture decision"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredAndSortedDecisions.map((decision) => (
                <motion.div
                  key={decision.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="group"
                >
                  <div
                    className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                    onClick={() => viewDecision(decision)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-medium text-sm flex-1 line-clamp-1">
                        {decision.title}
                      </h4>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(decision);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDecision(decision.id);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge
                        variant="outline"
                        className={cn("text-xs", STATUS_CONFIG[decision.status].color)}
                      >
                        {STATUS_CONFIG[decision.status].label}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(decision.date).toLocaleDateString()}
                      </div>
                      {decision.author && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {decision.author}
                        </div>
                      )}
                    </div>

                    {decision.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {decision.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {decision.context}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      {/* Add Decision Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Add Decision</DialogTitle>
            <DialogDescription>
              Record a new architecture decision for your project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="add-title">Title *</Label>
              <Input
                id="add-title"
                placeholder="e.g., Use React for frontend framework"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as Decision["status"],
                    })
                  }
                >
                  <SelectTrigger id="add-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposed">Proposed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="superseded">Superseded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="add-author">Author</Label>
                <Input
                  id="add-author"
                  placeholder="Optional"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="add-context">Context *</Label>
              <Textarea
                id="add-context"
                placeholder="What is the issue that we're seeing that is motivating this decision or change?"
                value={formData.context}
                onChange={(e) =>
                  setFormData({ ...formData, context: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="add-decision">Decision *</Label>
              <Textarea
                id="add-decision"
                placeholder="What is the change that we're proposing and/or doing?"
                value={formData.decision}
                onChange={(e) =>
                  setFormData({ ...formData, decision: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="add-consequences">Consequences *</Label>
              <Textarea
                id="add-consequences"
                placeholder="What becomes easier or more difficult to do because of this change?"
                value={formData.consequences}
                onChange={(e) =>
                  setFormData({ ...formData, consequences: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="add-tags">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="add-tags"
                  placeholder="Add a tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={addDecision}
              disabled={
                !formData.title ||
                !formData.context ||
                !formData.decision ||
                !formData.consequences
              }
            >
              Add Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Decision Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit Decision</DialogTitle>
            <DialogDescription>
              Update the architecture decision record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                placeholder="e.g., Use React for frontend framework"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      status: value as Decision["status"],
                    })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposed">Proposed</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="deprecated">Deprecated</SelectItem>
                    <SelectItem value="superseded">Superseded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-author">Author</Label>
                <Input
                  id="edit-author"
                  placeholder="Optional"
                  value={formData.author}
                  onChange={(e) =>
                    setFormData({ ...formData, author: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-context">Context *</Label>
              <Textarea
                id="edit-context"
                placeholder="What is the issue that we're seeing that is motivating this decision or change?"
                value={formData.context}
                onChange={(e) =>
                  setFormData({ ...formData, context: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-decision">Decision *</Label>
              <Textarea
                id="edit-decision"
                placeholder="What is the change that we're proposing and/or doing?"
                value={formData.decision}
                onChange={(e) =>
                  setFormData({ ...formData, decision: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-consequences">Consequences *</Label>
              <Textarea
                id="edit-consequences"
                placeholder="What becomes easier or more difficult to do because of this change?"
                value={formData.consequences}
                onChange={(e) =>
                  setFormData({ ...formData, consequences: e.target.value })
                }
                rows={3}
              />
            </div>

            {formData.status === "superseded" && (
              <div>
                <Label htmlFor="edit-superseded">Superseded By</Label>
                <Select
                  value={formData.supersededBy}
                  onValueChange={(value) =>
                    setFormData({ ...formData, supersededBy: value })
                  }
                >
                  <SelectTrigger id="edit-superseded">
                    <SelectValue placeholder="Select decision" />
                  </SelectTrigger>
                  <SelectContent>
                    {config.decisions
                      .filter((d) => d.id !== selectedDecision?.id)
                      .map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="edit-tags">Tags</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  id="edit-tags"
                  placeholder="Add a tag"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
                <Button type="button" onClick={addTag} variant="outline">
                  Add
                </Button>
              </div>
              {formData.tags && formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedDecision(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={updateDecision}
              disabled={
                !formData.title ||
                !formData.context ||
                !formData.decision ||
                !formData.consequences
              }
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Decision Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {selectedDecision && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <DialogTitle className="text-xl mb-2">
                      {selectedDecision.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-sm",
                          STATUS_CONFIG[selectedDecision.status].color
                        )}
                      >
                        {STATUS_CONFIG[selectedDecision.status].label}
                      </Badge>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(selectedDecision.date).toLocaleDateString()}
                      </div>
                      {selectedDecision.author && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          {selectedDecision.author}
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => openEditDialog(selectedDecision)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => exportAsMarkdown(selectedDecision)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy as Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => copyDecisionId(selectedDecision.id)}
                      >
                        <Link2 className="mr-2 h-4 w-4" />
                        Copy ID
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => deleteDecision(selectedDecision.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {selectedDecision.tags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Tag className="h-4 w-4" />
                      Tags
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDecision.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-sm mb-2">Context</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedDecision.context}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Decision</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedDecision.decision}
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Consequences</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedDecision.consequences}
                  </p>
                </div>

                {selectedDecision.supersededBy && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Superseded By
                    </h4>
                    <div className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer">
                      {(() => {
                        const supersededDecision = config.decisions.find(
                          (d) => d.id === selectedDecision.supersededBy
                        );
                        return supersededDecision ? (
                          <div
                            onClick={() => {
                              setSelectedDecision(supersededDecision);
                            }}
                          >
                            <p className="text-sm font-medium">
                              {supersededDecision.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs mt-1",
                                STATUS_CONFIG[supersededDecision.status].color
                              )}
                            >
                              {STATUS_CONFIG[supersededDecision.status].label}
                            </Badge>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Decision not found
                          </p>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {selectedDecision.relatedDecisions.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Related Decisions
                    </h4>
                    <div className="space-y-2">
                      {selectedDecision.relatedDecisions.map((id) => {
                        const related = config.decisions.find(
                          (d) => d.id === id
                        );
                        return related ? (
                          <div
                            key={id}
                            className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedDecision(related);
                            }}
                          >
                            <p className="text-sm font-medium">
                              {related.title}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs mt-1",
                                STATUS_CONFIG[related.status].color
                              )}
                            >
                              {STATUS_CONFIG[related.status].label}
                            </Badge>
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
