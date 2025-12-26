"use client";

import { useState, useMemo } from "react";
import {
  AlertTriangle,
  Plus,
  Filter,
  Check,
  Bug,
  Code,
  Package,
  TestTube,
  Zap,
  Shield,
  FileText,
  MoreHorizontal,
  Pencil,
  Trash2,
  Download,
  X,
  ChevronDown,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";

interface TechDebtWidgetProps {
  widget: Widget;
}

type DebtType = "code-smell" | "outdated-dependency" | "missing-tests" | "poor-performance" | "security" | "documentation" | "other";
type DebtSeverity = "low" | "medium" | "high" | "critical";
type DebtEffort = "small" | "medium" | "large" | "xlarge";
type DebtStatus = "identified" | "planned" | "in-progress" | "resolved";

interface TechDebtItem {
  id: string;
  title: string;
  description: string;
  location: string;
  type: DebtType;
  severity: DebtSeverity;
  effort: DebtEffort;
  status: DebtStatus;
  tags: string[];
  createdAt: string;
  resolvedAt?: string;
}

const debtTypeConfig = {
  "code-smell": { label: "Code Smell", icon: Code, color: "text-purple-500" },
  "outdated-dependency": { label: "Outdated Dep", icon: Package, color: "text-amber-500" },
  "missing-tests": { label: "Missing Tests", icon: TestTube, color: "text-pink-500" },
  "poor-performance": { label: "Performance", icon: Zap, color: "text-yellow-500" },
  "security": { label: "Security", icon: Shield, color: "text-red-500" },
  "documentation": { label: "Documentation", icon: FileText, color: "text-blue-500" },
  "other": { label: "Other", icon: Bug, color: "text-gray-500" },
};

const severityConfig = {
  low: { label: "Low", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400", dotColor: "bg-blue-500" },
  medium: { label: "Medium", color: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400", dotColor: "bg-yellow-500" },
  high: { label: "High", color: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dotColor: "bg-orange-500" },
  critical: { label: "Critical", color: "bg-red-500/10 text-red-600 dark:text-red-400", dotColor: "bg-red-500" },
};

const effortConfig = {
  small: { label: "S", fullLabel: "Small" },
  medium: { label: "M", fullLabel: "Medium" },
  large: { label: "L", fullLabel: "Large" },
  xlarge: { label: "XL", fullLabel: "X-Large" },
};

const statusConfig = {
  identified: { label: "Identified", color: "bg-slate-500/10 text-slate-600 dark:text-slate-400" },
  planned: { label: "Planned", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  "in-progress": { label: "In Progress", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
  resolved: { label: "Resolved", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
};

export function TechDebtWidget({ widget }: TechDebtWidgetProps) {
  const { updateWidget } = useWidgetStore();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TechDebtItem | null>(null);
  const [filterType, setFilterType] = useState<DebtType | "all">("all");
  const [filterSeverity, setFilterSeverity] = useState<DebtSeverity | "all">("all");
  const [sortBy, setSortBy] = useState<"severity" | "effort" | "date">("severity");
  const [showFilters, setShowFilters] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formType, setFormType] = useState<DebtType>("code-smell");
  const [formSeverity, setFormSeverity] = useState<DebtSeverity>("medium");
  const [formEffort, setFormEffort] = useState<DebtEffort>("medium");
  const [formTags, setFormTags] = useState("");

  const debtItems: TechDebtItem[] = widget.config?.debtItems || [];

  const saveItems = (items: TechDebtItem[]) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        debtItems: items,
      },
    });
  };

  const resetForm = () => {
    setFormTitle("");
    setFormDescription("");
    setFormLocation("");
    setFormType("code-smell");
    setFormSeverity("medium");
    setFormEffort("medium");
    setFormTags("");
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (item: TechDebtItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormLocation(item.location);
    setFormType(item.type);
    setFormSeverity(item.severity);
    setFormEffort(item.effort);
    setFormTags(item.tags.join(", "));
    setIsEditDialogOpen(true);
  };

  const addItem = () => {
    if (!formTitle.trim()) return;

    const newItem: TechDebtItem = {
      id: crypto.randomUUID(),
      title: formTitle.trim(),
      description: formDescription.trim(),
      location: formLocation.trim(),
      type: formType,
      severity: formSeverity,
      effort: formEffort,
      status: "identified",
      tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    saveItems([newItem, ...debtItems]);
    setIsAddDialogOpen(false);
    resetForm();
  };

  const updateItem = () => {
    if (!editingItem || !formTitle.trim()) return;

    const updatedItems = debtItems.map((item) =>
      item.id === editingItem.id
        ? {
            ...item,
            title: formTitle.trim(),
            description: formDescription.trim(),
            location: formLocation.trim(),
            type: formType,
            severity: formSeverity,
            effort: formEffort,
            tags: formTags.split(",").map((t) => t.trim()).filter(Boolean),
          }
        : item
    );

    saveItems(updatedItems);
    setIsEditDialogOpen(false);
    setEditingItem(null);
    resetForm();
  };

  const deleteItem = (id: string) => {
    saveItems(debtItems.filter((item) => item.id !== id));
  };

  const changeStatus = (id: string, newStatus: DebtStatus) => {
    const updatedItems = debtItems.map((item) =>
      item.id === id
        ? {
            ...item,
            status: newStatus,
            resolvedAt: newStatus === "resolved" ? new Date().toISOString() : item.resolvedAt,
          }
        : item
    );
    saveItems(updatedItems);
  };

  const exportAsMarkdown = () => {
    const activeItems = debtItems.filter((item) => item.status !== "resolved");
    const resolvedItems = debtItems.filter((item) => item.status === "resolved");

    let markdown = "# Technical Debt Report\n\n";
    markdown += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- Total Items: ${debtItems.length}\n`;
    markdown += `- Active: ${activeItems.length}\n`;
    markdown += `- Resolved: ${resolvedItems.length}\n`;
    markdown += `- Debt Score: ${calculateDebtScore}\n\n`;

    if (activeItems.length > 0) {
      markdown += "## Active Items\n\n";
      activeItems.forEach((item) => {
        markdown += `### ${item.title}\n\n`;
        markdown += `- **Type:** ${debtTypeConfig[item.type].label}\n`;
        markdown += `- **Severity:** ${severityConfig[item.severity].label}\n`;
        markdown += `- **Effort:** ${effortConfig[item.effort].fullLabel}\n`;
        markdown += `- **Status:** ${statusConfig[item.status].label}\n`;
        if (item.location) markdown += `- **Location:** \`${item.location}\`\n`;
        if (item.description) markdown += `\n${item.description}\n`;
        if (item.tags.length > 0) markdown += `\n**Tags:** ${item.tags.join(", ")}\n`;
        markdown += "\n---\n\n";
      });
    }

    if (resolvedItems.length > 0) {
      markdown += "## Resolved Items\n\n";
      resolvedItems.forEach((item) => {
        markdown += `- ${item.title} (${new Date(item.resolvedAt!).toLocaleDateString()})\n`;
      });
    }

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tech-debt-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Computed without useMemo - React Compiler handles optimization
  const calculateDebtScore = (() => {
    const severityWeights = { low: 1, medium: 3, high: 5, critical: 10 };
    const activeItems = debtItems.filter((item) => item.status !== "resolved");
    return activeItems.reduce((score, item) => score + severityWeights[item.severity], 0);
  })();

  const filteredAndSortedItems = useMemo(() => {
    let filtered = debtItems;

    // Apply filters
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType);
    }
    if (filterSeverity !== "all") {
      filtered = filtered.filter((item) => item.severity === filterSeverity);
    }

    // Sort
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const effortOrder = { small: 0, medium: 1, large: 2, xlarge: 3 };

    filtered.sort((a, b) => {
      if (sortBy === "severity") {
        return severityOrder[a.severity] - severityOrder[b.severity];
      } else if (sortBy === "effort") {
        return effortOrder[a.effort] - effortOrder[b.effort];
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return filtered;
  }, [debtItems, filterType, filterSeverity, sortBy]);

  const activeCount = debtItems.filter((item) => item.status !== "resolved").length;
  const resolvedCount = debtItems.filter((item) => item.status === "resolved").length;

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <div className="flex flex-col @sm:flex-row @sm:items-center @sm:gap-2">
              <span className="text-xs text-muted-foreground">
                {activeCount} active, {resolvedCount} resolved
              </span>
              <Separator orientation="vertical" className="hidden @sm:block h-3" />
              <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Score: {calculateDebtScore}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setShowFilters(!showFilters)}
              title="Filters"
            >
              <Filter className={cn("w-4 h-4", showFilters && "text-primary")} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={openAddDialog}
              title="Add item"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-3"
            >
              <div className="flex flex-col @sm:flex-row gap-2 p-2 bg-muted/30 rounded-lg">
                <div className="flex-1">
                  <Select value={filterType} onValueChange={(value) => setFilterType(value as DebtType | "all")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {Object.entries(debtTypeConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={filterSeverity} onValueChange={(value) => setFilterSeverity(value as DebtSeverity | "all")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Severity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Severities</SelectItem>
                      {Object.entries(severityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as "severity" | "effort" | "date")}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="severity">Severity</SelectItem>
                      <SelectItem value="effort">Effort</SelectItem>
                      <SelectItem value="date">Date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Items list */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <AnimatePresence mode="popLayout">
            {filteredAndSortedItems.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 text-muted-foreground"
              >
                <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No tech debt items</p>
                <p className="text-xs opacity-70 mt-1">Add items to start tracking</p>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {filteredAndSortedItems.map((item) => {
                  const TypeIcon = debtTypeConfig[item.type].icon;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className={cn(
                        "group relative p-3 rounded-lg border transition-all",
                        item.status === "resolved" ? "bg-muted/30 opacity-60" : "bg-card hover:border-primary/50"
                      )}
                    >
                      {/* Priority indicator */}
                      <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", severityConfig[item.severity].dotColor)} />

                      <div className="flex items-start gap-3 pl-2">
                        <TypeIcon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", debtTypeConfig[item.type].color)} />

                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Title and badges */}
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={cn(
                              "text-sm font-medium truncate",
                              item.status === "resolved" && "line-through text-muted-foreground"
                            )}>
                              {item.title}
                            </h4>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEditDialog(item)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {Object.entries(statusConfig).map(([status, config]) => (
                                  <DropdownMenuItem
                                    key={status}
                                    onClick={() => changeStatus(item.id, status as DebtStatus)}
                                    disabled={item.status === status}
                                  >
                                    {item.status === status && <Check className="w-3.5 h-3.5 mr-2" />}
                                    {item.status !== status && <span className="w-3.5 mr-2" />}
                                    {config.label}
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => deleteItem(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Badges */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", severityConfig[item.severity].color)}>
                              {severityConfig[item.severity].label}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                              {effortConfig[item.effort].label}
                            </Badge>
                            <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", statusConfig[item.status].color)}>
                              {statusConfig[item.status].label}
                            </Badge>
                            {item.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                                {tag}
                              </Badge>
                            ))}
                          </div>

                          {/* Description */}
                          {item.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          {/* Location */}
                          {item.location && (
                            <p className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded truncate">
                              {item.location}
                            </p>
                          )}

                          {/* Footer info */}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {item.status === "resolved" && item.resolvedAt ? (
                              <span>Resolved {new Date(item.resolvedAt).toLocaleDateString()}</span>
                            ) : (
                              <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        {debtItems.length > 0 && (
          <div className="pt-2 mt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={exportAsMarkdown}
            >
              <Download className="w-3 h-3 mr-1" />
              Export as Markdown
            </Button>
          </div>
        )}
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Add Tech Debt Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detailed explanation of the technical debt..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="src/components/MyComponent.tsx"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={formType} onValueChange={(value) => setFormType(value as DebtType)}>
                  <SelectTrigger id="type" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(debtTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="severity">Severity</Label>
                <Select value={formSeverity} onValueChange={(value) => setFormSeverity(value as DebtSeverity)}>
                  <SelectTrigger id="severity" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(severityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="effort">Effort</Label>
                <Select value={formEffort} onValueChange={(value) => setFormEffort(value as DebtEffort)}>
                  <SelectTrigger id="effort" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(effortConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.fullLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="refactor, legacy, hot-path"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addItem} disabled={!formTitle.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Tech Debt Item
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Brief description of the issue"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Detailed explanation of the technical debt..."
                className="mt-1.5 min-h-[80px]"
              />
            </div>
            <div>
              <Label htmlFor="edit-location">Location</Label>
              <Input
                id="edit-location"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
                placeholder="src/components/MyComponent.tsx"
                className="mt-1.5 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="edit-type">Type</Label>
                <Select value={formType} onValueChange={(value) => setFormType(value as DebtType)}>
                  <SelectTrigger id="edit-type" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(debtTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-severity">Severity</Label>
                <Select value={formSeverity} onValueChange={(value) => setFormSeverity(value as DebtSeverity)}>
                  <SelectTrigger id="edit-severity" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(severityConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-effort">Effort</Label>
                <Select value={formEffort} onValueChange={(value) => setFormEffort(value as DebtEffort)}>
                  <SelectTrigger id="edit-effort" className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(effortConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        {config.fullLabel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={formTags}
                onChange={(e) => setFormTags(e.target.value)}
                placeholder="refactor, legacy, hot-path"
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateItem} disabled={!formTitle.trim()}>
              <Check className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
