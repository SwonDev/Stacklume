"use client";

import { useState } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  GitPullRequest,
  X,
  Plus,
  Copy,
  MoreVertical,
  Edit,
  Trash,
  FileText,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  checked: boolean;
}

interface ChecklistTemplate {
  id: string;
  name: string;
  items: Omit<ChecklistItem, "id" | "checked">[];
}

interface ActiveReview {
  id: string;
  title: string;
  url?: string;
  templateId: string;
  items: ChecklistItem[];
  status: "in-progress" | "approved" | "changes-requested";
  notes: string;
  createdAt: number;
}

interface PRChecklistConfig {
  templates: ChecklistTemplate[];
  activeReviews: ActiveReview[];
  selectedReviewId: string | null;
}

const DEFAULT_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "default",
    name: "Standard Code Review",
    items: [
      { text: "Code follows style guidelines and conventions", category: "Code Quality" },
      { text: "No unnecessary code duplication", category: "Code Quality" },
      { text: "Functions are small and focused", category: "Code Quality" },
      { text: "Variable and function names are descriptive", category: "Code Quality" },
      { text: "Error handling is implemented properly", category: "Code Quality" },
      { text: "Unit tests are included and passing", category: "Testing" },
      { text: "Edge cases are tested", category: "Testing" },
      { text: "Test coverage is adequate", category: "Testing" },
      { text: "No sensitive data exposed", category: "Security" },
      { text: "Input validation is implemented", category: "Security" },
      { text: "Authentication/authorization is correct", category: "Security" },
      { text: "Code comments explain why, not what", category: "Documentation" },
      { text: "README updated if needed", category: "Documentation" },
      { text: "API documentation updated", category: "Documentation" },
      { text: "No performance regressions", category: "Performance" },
      { text: "Efficient algorithms and data structures", category: "Performance" },
      { text: "No unnecessary re-renders or loops", category: "Performance" },
    ],
  },
  {
    id: "frontend",
    name: "Frontend Review",
    items: [
      { text: "UI matches design specifications", category: "Code Quality" },
      { text: "Components are reusable and composable", category: "Code Quality" },
      { text: "Responsive design works on all breakpoints", category: "Code Quality" },
      { text: "Accessibility standards met (ARIA, keyboard nav)", category: "Code Quality" },
      { text: "Component tests are included", category: "Testing" },
      { text: "User interactions are tested", category: "Testing" },
      { text: "No XSS vulnerabilities", category: "Security" },
      { text: "Secure handling of user input", category: "Security" },
      { text: "No unnecessary re-renders", category: "Performance" },
      { text: "Images are optimized", category: "Performance" },
      { text: "Bundle size impact is acceptable", category: "Performance" },
    ],
  },
  {
    id: "backend",
    name: "Backend Review",
    items: [
      { text: "API endpoints follow RESTful conventions", category: "Code Quality" },
      { text: "Database queries are optimized", category: "Code Quality" },
      { text: "Proper error handling and logging", category: "Code Quality" },
      { text: "Integration tests included", category: "Testing" },
      { text: "Database migrations tested", category: "Testing" },
      { text: "SQL injection prevention", category: "Security" },
      { text: "Rate limiting implemented", category: "Security" },
      { text: "Secure data transmission (HTTPS)", category: "Security" },
      { text: "API documentation updated", category: "Documentation" },
      { text: "Database schema documented", category: "Documentation" },
      { text: "No N+1 query problems", category: "Performance" },
      { text: "Caching strategy implemented", category: "Performance" },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  "Code Quality": "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  Testing: "bg-green-500/10 text-green-600 dark:text-green-400",
  Security: "bg-red-500/10 text-red-600 dark:text-red-400",
  Documentation: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  Performance: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

export default function PRChecklistWidget({ widget }: { widget: Widget }) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  // Use spread with defaults to handle empty object {} case
  const rawConfig = (widget.config as unknown as Partial<PRChecklistConfig>) || {};
  const config: PRChecklistConfig = {
    templates: DEFAULT_TEMPLATES,
    activeReviews: [],
    selectedReviewId: null,
    ...rawConfig,
  };

  const [showNewReviewDialog, setShowNewReviewDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChecklistTemplate | null>(null);
  const [newReviewData, setNewReviewData] = useState({
    title: "",
    url: "",
    templateId: "default",
  });
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    items: [] as Omit<ChecklistItem, "id" | "checked">[],
  });
  const [newItemText, setNewItemText] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Code Quality");
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const selectedReview = config.activeReviews.find(
    (r) => r.id === config.selectedReviewId
  );

  const updateConfig = (updates: Partial<PRChecklistConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const startNewReview = () => {
    const template = config.templates.find((t) => t.id === newReviewData.templateId);
    if (!template) return;

    const reviewId = crypto.randomUUID();
    const newReview: ActiveReview = {
      id: reviewId,
      title: newReviewData.title,
      url: newReviewData.url || undefined,
      templateId: template.id,
      items: template.items.map((item, idx) => ({
        id: `${reviewId}-item-${idx}`,
        ...item,
        checked: false,
      })),
      status: "in-progress",
      notes: "",
      createdAt: new Date().getTime(),
    };

    updateConfig({
      activeReviews: [...config.activeReviews, newReview],
      selectedReviewId: newReview.id,
    });

    setNewReviewData({ title: "", url: "", templateId: "default" });
    setShowNewReviewDialog(false);
  };

  const toggleItem = (itemId: string) => {
    if (!selectedReview) return;

    const updatedReview = {
      ...selectedReview,
      items: selectedReview.items.map((item) =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      ),
    };

    updateConfig({
      activeReviews: config.activeReviews.map((r) =>
        r.id === selectedReview.id ? updatedReview : r
      ),
    });
  };

  const updateReviewStatus = (status: ActiveReview["status"]) => {
    if (!selectedReview) return;

    updateConfig({
      activeReviews: config.activeReviews.map((r) =>
        r.id === selectedReview.id ? { ...r, status } : r
      ),
    });
  };

  const updateReviewNotes = (notes: string) => {
    if (!selectedReview) return;

    updateConfig({
      activeReviews: config.activeReviews.map((r) =>
        r.id === selectedReview.id ? { ...r, notes } : r
      ),
    });
  };

  const deleteReview = (reviewId: string) => {
    const newReviews = config.activeReviews.filter((r) => r.id !== reviewId);
    updateConfig({
      activeReviews: newReviews,
      selectedReviewId:
        config.selectedReviewId === reviewId
          ? newReviews[0]?.id || null
          : config.selectedReviewId,
    });
  };

  const copyAsMarkdown = () => {
    if (!selectedReview) return;

    const template = config.templates.find((t) => t.id === selectedReview.templateId);
    const checkedCount = selectedReview.items.filter((i) => i.checked).length;
    const totalCount = selectedReview.items.length;

    let markdown = `# PR Review: ${selectedReview.title}\n\n`;
    if (selectedReview.url) {
      markdown += `**PR URL**: ${selectedReview.url}\n\n`;
    }
    markdown += `**Template**: ${template?.name || "Unknown"}\n`;
    markdown += `**Progress**: ${checkedCount}/${totalCount} items checked\n`;
    markdown += `**Status**: ${selectedReview.status.replace("-", " ").toUpperCase()}\n\n`;

    const categories = Array.from(new Set(selectedReview.items.map((i) => i.category)));
    categories.forEach((category) => {
      markdown += `## ${category}\n\n`;
      selectedReview.items
        .filter((i) => i.category === category)
        .forEach((item) => {
          markdown += `- [${item.checked ? "x" : " "}] ${item.text}\n`;
        });
      markdown += "\n";
    });

    if (selectedReview.notes) {
      markdown += `## Notes\n\n${selectedReview.notes}\n`;
    }

    navigator.clipboard.writeText(markdown);
  };

  const saveTemplate = () => {
    if (!newTemplate.name || newTemplate.items.length === 0) return;

    const template: ChecklistTemplate = {
      id: editingTemplate?.id || crypto.randomUUID(),
      name: newTemplate.name,
      items: newTemplate.items,
    };

    updateConfig({
      templates: editingTemplate
        ? config.templates.map((t) => (t.id === editingTemplate.id ? template : t))
        : [...config.templates, template],
    });

    setNewTemplate({ name: "", items: [] });
    setEditingTemplate(null);
    setShowTemplateDialog(false);
  };

  const deleteTemplate = (templateId: string) => {
    if (DEFAULT_TEMPLATES.some((t) => t.id === templateId)) return;
    updateConfig({
      templates: config.templates.filter((t) => t.id !== templateId),
    });
  };

  const addItemToTemplate = () => {
    if (!newItemText) return;
    setNewTemplate({
      ...newTemplate,
      items: [...newTemplate.items, { text: newItemText, category: newItemCategory }],
    });
    setNewItemText("");
  };

  const removeItemFromTemplate = (index: number) => {
    setNewTemplate({
      ...newTemplate,
      items: newTemplate.items.filter((_, idx) => idx !== index),
    });
  };

  // Computed without useMemo - React Compiler handles optimization
  const progress = (() => {
    if (!selectedReview) return 0;
    const checked = selectedReview.items.filter((i) => i.checked).length;
    return (checked / selectedReview.items.length) * 100;
  })();

  // Computed without useMemo - React Compiler handles optimization
  const itemsByCategory = (() => {
    if (!selectedReview) return {};
    return selectedReview.items.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      },
      {} as Record<string, ChecklistItem[]>
    );
  })();

  const toggleCategory = (category: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="@container flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 @sm:p-4">
        <div className="flex items-center gap-2">
          <GitPullRequest className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm @sm:text-base">PR Checklist</h3>
        </div>
        <div className="flex items-center gap-1">
          {selectedReview && (
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAsMarkdown}
              className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
            >
              <Copy className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowNewReviewDialog(true)}
            className="h-7 w-7 p-0 @sm:h-8 @sm:w-8"
          >
            <Plus className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 @sm:h-8 @sm:w-8">
                <MoreVertical className="h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowTemplateDialog(true)}>
                <FileText className="mr-2 h-4 w-4" />
                Manage Templates
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {config.activeReviews.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <GitPullRequest className="h-10 w-10 text-muted-foreground/50 @sm:h-12 @sm:w-12" />
          <div>
            <p className="font-medium text-sm @sm:text-base">No Active Reviews</p>
            <p className="text-muted-foreground text-xs @sm:text-sm">
              Start a new PR review to get started
            </p>
          </div>
          <Button onClick={() => setShowNewReviewDialog(true)} size="sm" className="@sm:h-9">
            <Plus className="mr-2 h-4 w-4" />
            New Review
          </Button>
        </div>
      ) : (
        <>
          {/* Review Selector */}
          <div className="px-3 pb-2 @sm:px-4">
            <Select
              value={config.selectedReviewId || undefined}
              onValueChange={(value) => updateConfig({ selectedReviewId: value })}
            >
              <SelectTrigger className="h-8 text-xs @sm:h-9 @sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.activeReviews.map((review) => (
                  <SelectItem key={review.id} value={review.id}>
                    <div className="flex items-center gap-2">
                      {review.status === "approved" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      )}
                      {review.status === "changes-requested" && (
                        <XCircle className="h-3.5 w-3.5 text-red-600" />
                      )}
                      <span className="truncate">{review.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReview && (
            <>
              {/* Progress */}
              <div className="px-3 pb-2 @sm:px-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-medium text-xs text-muted-foreground @sm:text-sm">
                    Progress
                  </span>
                  <span className="font-medium text-xs @sm:text-sm">
                    {selectedReview.items.filter((i) => i.checked).length}/
                    {selectedReview.items.length}
                  </span>
                </div>
                <Progress value={progress} className="h-1.5 @sm:h-2" />
              </div>

              {/* Status Actions */}
              <div className="flex gap-2 px-3 pb-2 @sm:px-4">
                <Button
                  variant={selectedReview.status === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateReviewStatus("approved")}
                  className="h-7 flex-1 text-xs @sm:h-8 @sm:text-sm"
                >
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
                  Approve
                </Button>
                <Button
                  variant={
                    selectedReview.status === "changes-requested" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => updateReviewStatus("changes-requested")}
                  className="h-7 flex-1 text-xs @sm:h-8 @sm:text-sm"
                >
                  <XCircle className="mr-1.5 h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
                  Changes
                </Button>
              </div>

              <Separator />

              {/* Checklist Items */}
              <ScrollArea className="flex-1">
                <div className="space-y-1 p-3 @sm:space-y-2 @sm:p-4">
                  {Object.entries(itemsByCategory).map(([category, items]) => (
                    <div key={category} className="space-y-1">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex w-full items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-accent"
                      >
                        {collapsedCategories.has(category) ? (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-xs @sm:text-sm",
                            CATEGORY_COLORS[category] || ""
                          )}
                        >
                          {category}
                        </Badge>
                        <span className="text-muted-foreground text-xs @sm:text-sm">
                          {items.filter((i) => i.checked).length}/{items.length}
                        </span>
                      </button>

                      <AnimatePresence>
                        {!collapsedCategories.has(category) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-1 overflow-hidden pl-4 @sm:space-y-2"
                          >
                            {items.map((item) => (
                              <motion.div
                                key={item.id}
                                layout
                                className="flex items-start gap-2.5 rounded-md p-2 transition-colors hover:bg-accent @sm:gap-3 @sm:p-2.5"
                              >
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={() => toggleItem(item.id)}
                                  className="mt-0.5"
                                />
                                <motion.span
                                  animate={{
                                    opacity: item.checked ? 0.5 : 1,
                                    textDecoration: item.checked
                                      ? "line-through"
                                      : "none",
                                  }}
                                  className="flex-1 text-xs leading-relaxed @sm:text-sm"
                                >
                                  {item.text}
                                </motion.span>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <Separator />

              {/* Notes */}
              <div className="p-3 @sm:p-4">
                <Textarea
                  placeholder="Add review notes..."
                  value={selectedReview.notes}
                  onChange={(e) => updateReviewNotes(e.target.value)}
                  className="min-h-[60px] resize-none text-xs @sm:min-h-[80px] @sm:text-sm"
                />
              </div>

              {/* Delete Review */}
              <div className="border-t p-3 @sm:p-4">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteReview(selectedReview.id)}
                  className="h-7 w-full text-xs @sm:h-8 @sm:text-sm"
                >
                  <Trash className="mr-2 h-3.5 w-3.5 @sm:h-4 @sm:w-4" />
                  Delete Review
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {/* New Review Dialog */}
      <Dialog open={showNewReviewDialog} onOpenChange={setShowNewReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start New Review</DialogTitle>
            <DialogDescription>
              Create a new pull request review checklist
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block font-medium text-sm">PR Title *</label>
              <Input
                placeholder="Add authentication middleware"
                value={newReviewData.title}
                onChange={(e) =>
                  setNewReviewData({ ...newReviewData, title: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block font-medium text-sm">PR URL (Optional)</label>
              <Input
                placeholder="https://github.com/user/repo/pull/123"
                value={newReviewData.url}
                onChange={(e) =>
                  setNewReviewData({ ...newReviewData, url: e.target.value })
                }
              />
            </div>

            <div>
              <label className="mb-1.5 block font-medium text-sm">Template</label>
              <Select
                value={newReviewData.templateId}
                onValueChange={(value) =>
                  setNewReviewData({ ...newReviewData, templateId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {config.templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewReviewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={startNewReview} disabled={!newReviewData.title}>
              Start Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog
        open={showTemplateDialog}
        onOpenChange={(open) => {
          setShowTemplateDialog(open);
          if (!open) {
            setEditingTemplate(null);
            setNewTemplate({ name: "", items: [] });
          }
        }}
      >
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Manage Templates"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Edit your checklist template"
                : "Create and manage custom review templates"}
            </DialogDescription>
          </DialogHeader>

          {!editingTemplate && !newTemplate.name ? (
            <div className="space-y-3">
              <ScrollArea className="h-[300px]">
                {config.templates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-lg border p-3 mb-2"
                  >
                    <div>
                      <p className="font-medium">{template.name}</p>
                      <p className="text-muted-foreground text-sm">
                        {template.items.length} items
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingTemplate(template);
                          setNewTemplate({
                            name: template.name,
                            items: [...template.items],
                          });
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!DEFAULT_TEMPLATES.some((t) => t.id === template.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </ScrollArea>
              <Button
                onClick={() => setNewTemplate({ name: "", items: [] })}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Create New Template
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block font-medium text-sm">Template Name *</label>
                <Input
                  placeholder="My Custom Template"
                  value={newTemplate.name}
                  onChange={(e) =>
                    setNewTemplate({ ...newTemplate, name: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="mb-1.5 block font-medium text-sm">Checklist Items</label>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Item text"
                    value={newItemText}
                    onChange={(e) => setNewItemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addItemToTemplate();
                      }
                    }}
                    className="flex-1"
                  />
                  <Select
                    value={newItemCategory}
                    onValueChange={setNewItemCategory}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Code Quality">Code Quality</SelectItem>
                      <SelectItem value="Testing">Testing</SelectItem>
                      <SelectItem value="Security">Security</SelectItem>
                      <SelectItem value="Documentation">Documentation</SelectItem>
                      <SelectItem value="Performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={addItemToTemplate} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <ScrollArea className="h-[200px] rounded-md border p-2">
                  {newTemplate.items.length === 0 ? (
                    <p className="text-center text-muted-foreground text-sm py-8">
                      No items added yet
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {newTemplate.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-2 rounded-md bg-accent/50 p-2"
                        >
                          <Badge
                            variant="secondary"
                            className={cn(
                              "shrink-0 text-xs",
                              CATEGORY_COLORS[item.category] || ""
                            )}
                          >
                            {item.category}
                          </Badge>
                          <span className="flex-1 text-sm">{item.text}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItemFromTemplate(idx)}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <DialogFooter>
            {(newTemplate.name || editingTemplate) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTemplate(null);
                    setNewTemplate({ name: "", items: [] });
                  }}
                >
                  Back
                </Button>
                <Button
                  onClick={saveTemplate}
                  disabled={!newTemplate.name || newTemplate.items.length === 0}
                >
                  {editingTemplate ? "Save Changes" : "Create Template"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
