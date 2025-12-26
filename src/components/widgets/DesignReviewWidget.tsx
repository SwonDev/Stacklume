"use client";

import { useState } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Plus,
  Copy,
  ExternalLink,
  Filter,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  text: string;
  category: ChecklistCategory;
  description?: string;
  checked: boolean;
}

type ChecklistCategory =
  | "accessibility"
  | "usability"
  | "consistency"
  | "branding"
  | "responsive"
  | "performance";

type ReviewStatus = "pending" | "approved" | "needs-changes";

interface ChecklistTemplate {
  id: string;
  name: string;
  items: Omit<ChecklistItem, "id" | "checked">[];
}

interface DesignReview {
  id: string;
  name: string;
  url?: string;
  templateId: string;
  items: ChecklistItem[];
  status: ReviewStatus;
  notes: string;
  createdAt: string;
}

interface DesignReviewConfig {
  reviews: DesignReview[];
  templates: ChecklistTemplate[];
  activeReviewId?: string;
  filterCategory?: ChecklistCategory;
}

interface DesignReviewWidgetProps {
  widget: Widget;
}

const DEFAULT_TEMPLATES: ChecklistTemplate[] = [
  {
    id: "default",
    name: "Default Design Review",
    items: [
      {
        text: "Keyboard navigation works throughout",
        category: "accessibility",
        description: "Tab order is logical, focus indicators are visible",
      },
      {
        text: "Color contrast meets WCAG AA standards",
        category: "accessibility",
        description: "Text and interactive elements have sufficient contrast",
      },
      {
        text: "Alt text provided for all images",
        category: "accessibility",
        description: "Meaningful descriptions for screen readers",
      },
      {
        text: "ARIA labels used appropriately",
        category: "accessibility",
        description: "Screen reader support for dynamic content",
      },
      {
        text: "Interactive elements have clear affordances",
        category: "usability",
        description: "Buttons, links, and controls are obviously interactive",
      },
      {
        text: "Error messages are clear and actionable",
        category: "usability",
        description: "Users understand what went wrong and how to fix it",
      },
      {
        text: "Loading states are clearly indicated",
        category: "usability",
        description: "Users know when the app is processing",
      },
      {
        text: "Navigation is intuitive and consistent",
        category: "usability",
        description: "Users can predict where actions will take them",
      },
      {
        text: "Typography follows design system",
        category: "consistency",
        description: "Font sizes, weights, and families are consistent",
      },
      {
        text: "Spacing follows grid system",
        category: "consistency",
        description: "Margins and padding use design tokens",
      },
      {
        text: "Component styles match design system",
        category: "consistency",
        description: "Buttons, inputs, cards follow patterns",
      },
      {
        text: "Icons are consistent in style and size",
        category: "consistency",
        description: "Same icon set used throughout",
      },
      {
        text: "Brand colors used correctly",
        category: "branding",
        description: "Primary, secondary, and accent colors match guidelines",
      },
      {
        text: "Logo placement and sizing is correct",
        category: "branding",
        description: "Brand identity is properly represented",
      },
      {
        text: "Tone of voice matches brand guidelines",
        category: "branding",
        description: "Copy reflects brand personality",
      },
      {
        text: "Layout works on mobile devices",
        category: "responsive",
        description: "Design adapts to small screens",
      },
      {
        text: "Touch targets are appropriately sized",
        category: "responsive",
        description: "Minimum 44x44px for mobile interactions",
      },
      {
        text: "Content reflows without horizontal scroll",
        category: "responsive",
        description: "No content is cut off at different viewports",
      },
      {
        text: "Images are optimized and responsive",
        category: "performance",
        description: "Appropriate formats and sizes for different screens",
      },
      {
        text: "Animations are performant",
        category: "performance",
        description: "No jank or layout shifts during animations",
      },
      {
        text: "Page load time is acceptable",
        category: "performance",
        description: "Core Web Vitals meet thresholds",
      },
    ],
  },
  {
    id: "quick",
    name: "Quick Review",
    items: [
      {
        text: "Meets accessibility basics",
        category: "accessibility",
      },
      {
        text: "User flow is clear",
        category: "usability",
      },
      {
        text: "Matches design system",
        category: "consistency",
      },
      {
        text: "Brand identity is present",
        category: "branding",
      },
      {
        text: "Mobile friendly",
        category: "responsive",
      },
      {
        text: "Loads quickly",
        category: "performance",
      },
    ],
  },
];

const CATEGORY_CONFIG: Record<
  ChecklistCategory,
  { color: string; bgColor: string; label: string }
> = {
  accessibility: {
    color: "text-purple-700 dark:text-purple-300",
    bgColor: "bg-purple-100 dark:bg-purple-950",
    label: "Accessibility",
  },
  usability: {
    color: "text-blue-700 dark:text-blue-300",
    bgColor: "bg-blue-100 dark:bg-blue-950",
    label: "Usability",
  },
  consistency: {
    color: "text-green-700 dark:text-green-300",
    bgColor: "bg-green-100 dark:bg-green-950",
    label: "Consistency",
  },
  branding: {
    color: "text-pink-700 dark:text-pink-300",
    bgColor: "bg-pink-100 dark:bg-pink-950",
    label: "Branding",
  },
  responsive: {
    color: "text-orange-700 dark:text-orange-300",
    bgColor: "bg-orange-100 dark:bg-orange-950",
    label: "Responsive",
  },
  performance: {
    color: "text-yellow-700 dark:text-yellow-300",
    bgColor: "bg-yellow-100 dark:bg-yellow-950",
    label: "Performance",
  },
};

const STATUS_CONFIG: Record<
  ReviewStatus,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-gray-700 dark:text-gray-300",
  },
  approved: {
    icon: CheckCircle,
    label: "Approved",
    color: "text-green-700 dark:text-green-300",
  },
  "needs-changes": {
    icon: AlertCircle,
    label: "Needs Changes",
    color: "text-red-700 dark:text-red-300",
  },
};

export function DesignReviewWidget({ widget }: DesignReviewWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const rawConfig = (widget.config as unknown as Partial<DesignReviewConfig>) || {};
  const config: DesignReviewConfig = {
    reviews: [],
    templates: DEFAULT_TEMPLATES,
    activeReviewId: undefined,
    filterCategory: undefined,
    ...rawConfig,
  };

  const [view, setView] = useState<"reviews" | "new-review" | "templates">("reviews");
  const [expandedCategories, setExpandedCategories] = useState<Set<ChecklistCategory>>(
    new Set(["accessibility", "usability", "consistency", "branding", "responsive", "performance"])
  );
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newReviewForm, setNewReviewForm] = useState({
    name: "",
    url: "",
    templateId: "default",
  });

  const activeReview = config.reviews.find((r) => r.id === config.activeReviewId);
  const templates = config.templates.length > 0 ? config.templates : DEFAULT_TEMPLATES;

  const updateConfig = (updates: Partial<DesignReviewConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const createReview = () => {
    if (!newReviewForm.name.trim()) return;

    const template = templates.find((t) => t.id === newReviewForm.templateId) || templates[0];
    const reviewId = crypto.randomUUID();
    const review: DesignReview = {
      id: reviewId,
      name: newReviewForm.name,
      url: newReviewForm.url || undefined,
      templateId: template.id,
      items: template.items.map((item, index) => ({
        ...item,
        id: `${reviewId}-${index}`,
        checked: false,
      })),
      status: "pending",
      notes: "",
      createdAt: new Date().toISOString(),
    };

    updateConfig({
      reviews: [...config.reviews, review],
      activeReviewId: review.id,
    });

    setNewReviewForm({ name: "", url: "", templateId: "default" });
    setView("reviews");
  };

  const deleteReview = (reviewId: string) => {
    const newReviews = config.reviews.filter((r) => r.id !== reviewId);
    updateConfig({
      reviews: newReviews,
      activeReviewId:
        config.activeReviewId === reviewId
          ? newReviews[0]?.id
          : config.activeReviewId,
    });
  };

  const toggleItem = (itemId: string) => {
    if (!activeReview) return;

    const updatedItems = activeReview.items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    updateConfig({
      reviews: config.reviews.map((r) =>
        r.id === activeReview.id ? { ...r, items: updatedItems } : r
      ),
    });
  };

  const updateReviewStatus = (status: ReviewStatus) => {
    if (!activeReview) return;

    updateConfig({
      reviews: config.reviews.map((r) =>
        r.id === activeReview.id ? { ...r, status } : r
      ),
    });
  };

  const updateReviewNotes = (notes: string) => {
    if (!activeReview) return;

    updateConfig({
      reviews: config.reviews.map((r) =>
        r.id === activeReview.id ? { ...r, notes } : r
      ),
    });
  };

  const copyChecklistAsMarkdown = () => {
    if (!activeReview) return;

    const template = templates.find((t) => t.id === activeReview.templateId);
    let markdown = `# ${activeReview.name}\n\n`;

    if (activeReview.url) {
      markdown += `**Design URL:** ${activeReview.url}\n\n`;
    }

    markdown += `**Status:** ${STATUS_CONFIG[activeReview.status].label}\n\n`;

    if (template) {
      markdown += `**Template:** ${template.name}\n\n`;
    }

    const progress = calculateProgress(activeReview.items);
    markdown += `**Progress:** ${progress}%\n\n`;

    const categories = Array.from(
      new Set(activeReview.items.map((item) => item.category))
    );

    categories.forEach((category) => {
      const categoryItems = activeReview.items.filter(
        (item) => item.category === category
      );
      markdown += `## ${CATEGORY_CONFIG[category].label}\n\n`;
      categoryItems.forEach((item) => {
        markdown += `- [${item.checked ? "x" : " "}] ${item.text}\n`;
        if (item.description) {
          markdown += `  ${item.description}\n`;
        }
      });
      markdown += "\n";
    });

    if (activeReview.notes) {
      markdown += `## Notes\n\n${activeReview.notes}\n`;
    }

    navigator.clipboard.writeText(markdown);
  };

  const toggleCategory = (category: ChecklistCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const calculateProgress = (items: ChecklistItem[]) => {
    if (items.length === 0) return 0;
    return Math.round((items.filter((i) => i.checked).length / items.length) * 100);
  };

  // Computed without useMemo - React Compiler handles optimization
  const filteredItems = (() => {
    if (!activeReview) return [];

    if (config.filterCategory) {
      return activeReview.items.filter((item) => item.category === config.filterCategory);
    }

    return activeReview.items;
  })();

  // Computed without useMemo - React Compiler handles optimization
  const itemsByCategory = (() => {
    const grouped: Record<ChecklistCategory, ChecklistItem[]> = {
      accessibility: [],
      usability: [],
      consistency: [],
      branding: [],
      responsive: [],
      performance: [],
    };

    filteredItems.forEach((item) => {
      grouped[item.category].push(item);
    });

    return grouped;
  })();

  const createCustomTemplate = () => {
    const newTemplate: ChecklistTemplate = {
      id: crypto.randomUUID(),
      name: "Custom Template",
      items: [],
    };

    updateConfig({
      templates: [...templates, newTemplate],
    });

    setEditingTemplate(newTemplate.id);
  };

  const deleteTemplate = (templateId: string) => {
    if (templates.length <= 1) return;

    updateConfig({
      templates: templates.filter((t) => t.id !== templateId),
    });
  };

  const addTemplateItem = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const newItem: Omit<ChecklistItem, "id" | "checked"> = {
      text: "New item",
      category: "usability",
      description: "",
    };

    updateConfig({
      templates: templates.map((t) =>
        t.id === templateId ? { ...t, items: [...t.items, newItem] } : t
      ),
    });
  };

  const updateTemplateItem = (
    templateId: string,
    itemIndex: number,
    updates: Partial<Omit<ChecklistItem, "id" | "checked">>
  ) => {
    updateConfig({
      templates: templates.map((t) =>
        t.id === templateId
          ? {
              ...t,
              items: t.items.map((item, i) =>
                i === itemIndex ? { ...item, ...updates } : item
              ),
            }
          : t
      ),
    });
  };

  const deleteTemplateItem = (templateId: string, itemIndex: number) => {
    updateConfig({
      templates: templates.map((t) =>
        t.id === templateId
          ? { ...t, items: t.items.filter((_, i) => i !== itemIndex) }
          : t
      ),
    });
  };

  const updateTemplateName = (templateId: string, name: string) => {
    updateConfig({
      templates: templates.map((t) =>
        t.id === templateId ? { ...t, name } : t
      ),
    });
  };

  if (view === "new-review") {
    return (
      <div className="@container h-full w-full p-4 overflow-auto">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">New Design Review</h3>
            <Button variant="ghost" size="sm" onClick={() => setView("reviews")}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="design-name">Design Name *</Label>
              <Input
                id="design-name"
                placeholder="Landing page redesign"
                value={newReviewForm.name}
                onChange={(e) =>
                  setNewReviewForm({ ...newReviewForm, name: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="design-url">Design URL (optional)</Label>
              <Input
                id="design-url"
                type="url"
                placeholder="https://figma.com/..."
                value={newReviewForm.url}
                onChange={(e) =>
                  setNewReviewForm({ ...newReviewForm, url: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={newReviewForm.templateId}
                onValueChange={(value) =>
                  setNewReviewForm({ ...newReviewForm, templateId: value })
                }
              >
                <SelectTrigger id="template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name} ({template.items.length} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              className="w-full"
              onClick={createReview}
              disabled={!newReviewForm.name.trim()}
            >
              Create Review
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (view === "templates") {
    return (
      <div className="@container h-full w-full overflow-auto">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Templates</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={createCustomTemplate}>
                <Plus className="h-4 w-4 mr-1" />
                New Template
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setView("reviews")}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border rounded-lg p-3 space-y-3"
              >
                {editingTemplate === template.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={template.name}
                        onChange={(e) =>
                          updateTemplateName(template.id, e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(null)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {template.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 border rounded"
                        >
                          <div className="flex-1 space-y-2">
                            <Input
                              value={item.text}
                              onChange={(e) =>
                                updateTemplateItem(template.id, index, {
                                  text: e.target.value,
                                })
                              }
                              placeholder="Item text"
                            />
                            <Input
                              value={item.description || ""}
                              onChange={(e) =>
                                updateTemplateItem(template.id, index, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Description (optional)"
                            />
                            <Select
                              value={item.category}
                              onValueChange={(value) =>
                                updateTemplateItem(template.id, index, {
                                  category: value as ChecklistCategory,
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(CATEGORY_CONFIG).map(
                                  ([key, config]) => (
                                    <SelectItem key={key} value={key}>
                                      {config.label}
                                    </SelectItem>
                                  )
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteTemplateItem(template.id, index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addTemplateItem(template.id)}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium">{template.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {template.items.length} items
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingTemplate(template.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {!DEFAULT_TEMPLATES.find((t) => t.id === template.id) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!activeReview) {
    return (
      <div className="@container h-full w-full flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="font-semibold mb-1">No Active Reviews</h3>
            <p className="text-sm text-muted-foreground">
              Start a new design review to track quality
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => setView("new-review")}>
              <Plus className="h-4 w-4 mr-1" />
              New Review
            </Button>
            <Button variant="outline" onClick={() => setView("templates")}>
              <Edit2 className="h-4 w-4 mr-1" />
              Templates
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress(activeReview.items);
  const _StatusIcon = STATUS_CONFIG[activeReview.status].icon;

  return (
    <div className="@container h-full w-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{activeReview.name}</h3>
            {activeReview.url && (
              <a
                href={activeReview.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate"
              >
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{activeReview.url}</span>
              </a>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyChecklistAsMarkdown}
              title="Copy as Markdown"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Select
              value={config.activeReviewId}
              onValueChange={(value) => updateConfig({ activeReviewId: value })}
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {config.reviews.map((review) => (
                  <SelectItem key={review.id} value={review.id}>
                    {review.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex items-center justify-between gap-2">
          <Select value={activeReview.status} onValueChange={updateReviewStatus}>
            <SelectTrigger className="h-8 w-auto">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4" />
                      {config.label}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                updateConfig({
                  filterCategory: config.filterCategory ? undefined : "accessibility",
                })
              }
            >
              <Filter
                className={cn(
                  "h-4 w-4",
                  config.filterCategory && "text-primary"
                )}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("new-review")}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteReview(activeReview.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {config.filterCategory && (
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                CATEGORY_CONFIG[config.filterCategory].bgColor,
                CATEGORY_CONFIG[config.filterCategory].color
              )}
            >
              {CATEGORY_CONFIG[config.filterCategory].label}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => updateConfig({ filterCategory: undefined })}
            >
              Clear filter
            </Button>
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {Object.entries(itemsByCategory).map(([category, items]) => {
          if (items.length === 0) return null;

          const categoryKey = category as ChecklistCategory;
          const isExpanded = expandedCategories.has(categoryKey);
          const categoryConfig = CATEGORY_CONFIG[categoryKey];
          const checkedCount = items.filter((i) => i.checked).length;

          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <button
                onClick={() => toggleCategory(categoryKey)}
                className="w-full flex items-center justify-between p-2 rounded hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <Badge
                    className={cn(categoryConfig.bgColor, categoryConfig.color)}
                  >
                    {categoryConfig.label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {checkedCount}/{items.length}
                  </span>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {items.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                          item.checked
                            ? "bg-accent/50 border-accent"
                            : "hover:bg-accent/30"
                        )}
                      >
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => toggleItem(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "text-sm",
                              item.checked && "line-through text-muted-foreground"
                            )}
                          >
                            {item.text}
                          </p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Notes Section */}
      <div className="border-t p-4 space-y-2">
        <Label htmlFor="review-notes" className="text-sm font-medium">
          Feedback Notes
        </Label>
        <Textarea
          id="review-notes"
          placeholder="Add any feedback or notes about this review..."
          value={activeReview.notes}
          onChange={(e) => updateReviewNotes(e.target.value)}
          className="min-h-[80px] resize-none"
        />
      </div>
    </div>
  );
}
