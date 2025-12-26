"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Component,
  Plus,
  ExternalLink,
  Copy,
  Filter,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  Code,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  ChevronRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
}

interface ComponentDoc {
  id: string;
  name: string;
  category: string;
  status: "stable" | "beta" | "deprecated" | "experimental";
  description: string;
  fullDescription?: string;
  props: ComponentProp[];
  usageExample: string;
  figmaUrl?: string;
  storybookUrl?: string;
  createdAt: number;
}

interface ComponentDocsConfig {
  components: ComponentDoc[];
  categories: string[];
}

const STATUS_CONFIG = {
  stable: {
    label: "Stable",
    color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    icon: CheckCircle2,
  },
  beta: {
    label: "Beta",
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    icon: Clock,
  },
  deprecated: {
    label: "Deprecated",
    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    icon: AlertCircle,
  },
  experimental: {
    label: "Experimental",
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    icon: Zap,
  },
};

const DEFAULT_CATEGORIES = ["UI", "Layout", "Form", "Data Display", "Navigation", "Feedback"];

export function ComponentDocsWidget({ widget }: { widget: Widget }) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as ComponentDocsConfig) || { components: [], categories: DEFAULT_CATEGORIES };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedComponent, setSelectedComponent] = useState<ComponentDoc | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ComponentDoc | null>(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);

  // Form state for add/edit dialog
  const [formData, setFormData] = useState<Partial<ComponentDoc>>({
    name: "",
    category: "",
    status: "stable",
    description: "",
    fullDescription: "",
    props: [],
    usageExample: "",
    figmaUrl: "",
    storybookUrl: "",
  });
  const [propForm, setPropForm] = useState<ComponentProp>({
    name: "",
    type: "",
    required: false,
    default: "",
    description: "",
  });

  const filteredComponents = useMemo(() => {
    return config.components.filter((comp) => {
      const matchesSearch =
        searchQuery === "" ||
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || comp.category === selectedCategory;
      const matchesStatus = selectedStatus === "all" || comp.status === selectedStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [config.components, searchQuery, selectedCategory, selectedStatus]);

  const updateConfig = (updates: Partial<ComponentDocsConfig>) => {
    updateWidget(widget.id, { config: { ...config, ...updates } as unknown as typeof widget.config });
  };

  const handleAddComponent = () => {
    if (!formData.name || !formData.category || !formData.description) return;

    const newComponent: ComponentDoc = {
      id: crypto.randomUUID(),
      name: formData.name,
      category: formData.category,
      status: formData.status || "stable",
      description: formData.description,
      fullDescription: formData.fullDescription || formData.description,
      props: formData.props || [],
      usageExample: formData.usageExample || "",
      figmaUrl: formData.figmaUrl,
      storybookUrl: formData.storybookUrl,
      createdAt: new Date().getTime(),
    };

    const updatedComponents = [...config.components, newComponent];
    const updatedCategories = config.categories.includes(formData.category)
      ? config.categories
      : [...config.categories, formData.category];

    updateConfig({
      components: updatedComponents,
      categories: updatedCategories,
    });

    resetForm();
    setIsAddDialogOpen(false);
  };

  const handleEditComponent = () => {
    if (!editingComponent || !formData.name || !formData.category || !formData.description) return;

    const updatedComponents = config.components.map((comp) =>
      comp.id === editingComponent.id
        ? {
            ...comp,
            name: formData.name!,
            category: formData.category!,
            status: formData.status || "stable",
            description: formData.description!,
            fullDescription: formData.fullDescription || formData.description,
            props: formData.props || [],
            usageExample: formData.usageExample || "",
            figmaUrl: formData.figmaUrl,
            storybookUrl: formData.storybookUrl,
          }
        : comp
    );

    const updatedCategories = config.categories.includes(formData.category!)
      ? config.categories
      : [...config.categories, formData.category!];

    updateConfig({
      components: updatedComponents,
      categories: updatedCategories,
    });

    resetForm();
    setIsEditDialogOpen(false);
    setEditingComponent(null);
    if (selectedComponent?.id === editingComponent.id) {
      setSelectedComponent(
        updatedComponents.find((c) => c.id === editingComponent.id) || null
      );
    }
  };

  const handleDeleteComponent = (id: string) => {
    updateConfig({
      components: config.components.filter((comp) => comp.id !== id),
    });
    if (selectedComponent?.id === id) {
      setSelectedComponent(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      status: "stable",
      description: "",
      fullDescription: "",
      props: [],
      usageExample: "",
      figmaUrl: "",
      storybookUrl: "",
    });
    setPropForm({
      name: "",
      type: "",
      required: false,
      default: "",
      description: "",
    });
  };

  const openEditDialog = (component: ComponentDoc) => {
    setEditingComponent(component);
    setFormData({
      name: component.name,
      category: component.category,
      status: component.status,
      description: component.description,
      fullDescription: component.fullDescription,
      props: component.props,
      usageExample: component.usageExample,
      figmaUrl: component.figmaUrl,
      storybookUrl: component.storybookUrl,
    });
    setIsEditDialogOpen(true);
  };

  const addProp = () => {
    if (!propForm.name || !propForm.type) return;
    setFormData({
      ...formData,
      props: [...(formData.props || []), { ...propForm }],
    });
    setPropForm({
      name: "",
      type: "",
      required: false,
      default: "",
      description: "",
    });
  };

  const removeProp = (index: number) => {
    setFormData({
      ...formData,
      props: formData.props?.filter((_, i) => i !== index),
    });
  };

  const copyToClipboard = async (text: string, _type: string) => {
    await navigator.clipboard.writeText(text);
    // Toast notification would go here
  };

  const getImportStatement = (name: string) => {
    return `import { ${name} } from "@/components/ui/${name.toLowerCase()}";`;
  };

  return (
    <div className="@container h-full flex flex-col bg-card rounded-lg border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Component className="w-4 h-4 shrink-0 text-muted-foreground" />
          <h3 className="font-semibold text-sm truncate">Component Docs</h3>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 shrink-0"
              onClick={() => resetForm()}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden @xl:inline ml-1">Add</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Add Component Documentation</DialogTitle>
              <DialogDescription>
                Document a new component for your design system
              </DialogDescription>
            </DialogHeader>
            <ComponentForm
              formData={formData}
              setFormData={setFormData}
              propForm={propForm}
              setPropForm={setPropForm}
              categories={config.categories}
              onAddProp={addProp}
              onRemoveProp={removeProp}
              onSubmit={handleAddComponent}
              submitLabel="Add Component"
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="experimental">Experimental</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
          >
            <Filter className="w-3 h-3 mr-1" />
            {selectedCategory === "all" ? "All Categories" : selectedCategory}
          </Button>

          {selectedComponent && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 ml-auto"
              onClick={() => setSelectedComponent(null)}
            >
              <X className="w-3 h-3 mr-1" />
              Close Details
            </Button>
          )}
        </div>

        <AnimatePresence>
          {showCategoryFilter && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-1.5 overflow-hidden"
            >
              <Badge
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Badge>
              {config.categories.map((category) => (
                <Badge
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Badge>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 flex @2xl:grid @2xl:grid-cols-2 @2xl:divide-x">
        {/* Component List */}
        <ScrollArea className={cn("flex-1", selectedComponent && "hidden @2xl:block")}>
          <div className="p-3 space-y-2">
            {filteredComponents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Component className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No components found</p>
                <p className="text-xs mt-1">Add your first component to get started</p>
              </div>
            ) : (
              filteredComponents.map((component) => (
                <ComponentCard
                  key={component.id}
                  component={component}
                  isSelected={selectedComponent?.id === component.id}
                  onClick={() => setSelectedComponent(component)}
                  onEdit={() => openEditDialog(component)}
                  onDelete={() => handleDeleteComponent(component.id)}
                  onCopyName={() => copyToClipboard(component.name, "name")}
                  onCopyImport={() => copyToClipboard(getImportStatement(component.name), "import")}
                />
              ))
            )}
          </div>
        </ScrollArea>

        {/* Component Detail */}
        <AnimatePresence mode="wait">
          {selectedComponent && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 @2xl:flex-none"
            >
              <ScrollArea className="h-full">
                <ComponentDetail
                  component={selectedComponent}
                  onCopyCode={() => copyToClipboard(selectedComponent.usageExample, "code")}
                  onCopyImport={() =>
                    copyToClipboard(getImportStatement(selectedComponent.name), "import")
                  }
                />
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Edit Component Documentation</DialogTitle>
            <DialogDescription>Update component documentation details</DialogDescription>
          </DialogHeader>
          <ComponentForm
            formData={formData}
            setFormData={setFormData}
            propForm={propForm}
            setPropForm={setPropForm}
            categories={config.categories}
            onAddProp={addProp}
            onRemoveProp={removeProp}
            onSubmit={handleEditComponent}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ComponentCard({
  component,
  isSelected,
  onClick,
  onEdit,
  onDelete,
  onCopyName,
  onCopyImport,
}: {
  component: ComponentDoc;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopyName: () => void;
  onCopyImport: () => void;
}) {
  const StatusIcon = STATUS_CONFIG[component.status].icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group relative p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent/50",
        isSelected && "bg-accent border-primary"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <FileCode className="w-4 h-4 shrink-0 text-primary" />
            <h4 className="font-medium text-sm truncate">{component.name}</h4>
            <Badge
              variant="outline"
              className={cn("text-xs shrink-0", STATUS_CONFIG[component.status].color)}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {STATUS_CONFIG[component.status].label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{component.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {component.category}
            </Badge>
            {component.props.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {component.props.length} prop{component.props.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyName(); }}>
              <Copy className="w-4 h-4 mr-2" />
              Copy Name
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyImport(); }}>
              <Code className="w-4 h-4 mr-2" />
              Copy Import
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {isSelected && (
        <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary hidden @2xl:block" />
      )}
    </motion.div>
  );
}

function ComponentDetail({
  component,
  onCopyCode,
  onCopyImport,
}: {
  component: ComponentDoc;
  onCopyCode: () => void;
  onCopyImport: () => void;
}) {
  const StatusIcon = STATUS_CONFIG[component.status].icon;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h2 className="text-lg font-bold">{component.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {component.fullDescription || component.description}
            </p>
          </div>
          <Badge variant="outline" className={cn(STATUS_CONFIG[component.status].color)}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {STATUS_CONFIG[component.status].label}
          </Badge>
        </div>
        <Badge variant="secondary">{component.category}</Badge>
      </div>

      {/* Import Statement */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold uppercase tracking-wide">Import</Label>
          <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCopyImport}>
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </Button>
        </div>
        <code className="block p-3 bg-muted rounded-md text-xs font-mono overflow-x-auto">
          {`import { ${component.name} } from "@/components/ui/${component.name.toLowerCase()}";`}
        </code>
      </div>

      {/* Props Table */}
      {component.props.length > 0 && (
        <div>
          <Label className="text-xs font-semibold uppercase tracking-wide mb-2 block">Props</Label>
          <div className="border rounded-lg overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 bg-muted/50 px-3 py-2 border-b text-xs font-medium text-muted-foreground">
              <div>Name</div>
              <div>Type</div>
              <div>Default</div>
              <div>Description</div>
            </div>
            {/* Rows */}
            <div className="divide-y">
              {component.props.map((prop, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 px-3 py-2 text-xs">
                  <div className="font-mono">
                    {prop.name}
                    {prop.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <div className="font-mono text-muted-foreground">
                    {prop.type}
                  </div>
                  <div className="font-mono text-muted-foreground">
                    {prop.default || "-"}
                  </div>
                  <div>{prop.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Usage Example */}
      {component.usageExample && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs font-semibold uppercase tracking-wide">Usage</Label>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCopyCode}>
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </Button>
          </div>
          <pre className="p-3 bg-muted rounded-lg text-xs font-mono overflow-x-auto">
            {component.usageExample}
          </pre>
        </div>
      )}

      {/* External Links */}
      {(component.figmaUrl || component.storybookUrl) && (
        <div className="flex gap-2">
          {component.figmaUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(component.figmaUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Figma
            </Button>
          )}
          {component.storybookUrl && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(component.storybookUrl, "_blank")}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Storybook
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function ComponentForm({
  formData,
  setFormData,
  propForm,
  setPropForm,
  categories,
  onAddProp,
  onRemoveProp,
  onSubmit,
  submitLabel,
}: {
  formData: Partial<ComponentDoc>;
  setFormData: (data: Partial<ComponentDoc>) => void;
  propForm: ComponentProp;
  setPropForm: (prop: ComponentProp) => void;
  categories: string[];
  onAddProp: () => void;
  onRemoveProp: (index: number) => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const [isNewCategory, setIsNewCategory] = useState(false);

  return (
    <div className="space-y-4">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Component Name *</Label>
          <Input
            id="name"
            placeholder="Button"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: ComponentDoc["status"]) => setFormData({ ...formData, status: value })}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="stable">Stable</SelectItem>
              <SelectItem value="beta">Beta</SelectItem>
              <SelectItem value="experimental">Experimental</SelectItem>
              <SelectItem value="deprecated">Deprecated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category *</Label>
        {isNewCategory ? (
          <div className="flex gap-2">
            <Input
              placeholder="Enter new category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsNewCategory(false);
                setFormData({ ...formData, category: "" });
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Select
              value={formData.category}
              onValueChange={(value) => {
                if (value === "new") {
                  setIsNewCategory(true);
                  setFormData({ ...formData, category: "" });
                } else {
                  setFormData({ ...formData, category: value });
                }
              }}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
                <SelectItem value="new">+ New Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="A brief description of the component"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fullDescription">Full Description</Label>
        <Textarea
          id="fullDescription"
          placeholder="Detailed component documentation"
          value={formData.fullDescription}
          onChange={(e) => setFormData({ ...formData, fullDescription: e.target.value })}
          rows={3}
        />
      </div>

      {/* Props */}
      <div className="space-y-2">
        <Label>Props</Label>
        <div className="border rounded-lg p-3 space-y-3">
          {formData.props && formData.props.length > 0 && (
            <div className="space-y-2 mb-3">
              {formData.props.map((prop, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded border text-xs"
                >
                  <code className="font-mono flex-1">
                    {prop.name}: {prop.type}
                    {prop.required && <span className="text-destructive">*</span>}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onRemoveProp(index)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Prop name"
              value={propForm.name}
              onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
            />
            <Input
              placeholder="Type (e.g., string)"
              value={propForm.type}
              onChange={(e) => setPropForm({ ...propForm, type: e.target.value })}
            />
            <Input
              placeholder="Default value"
              value={propForm.default}
              onChange={(e) => setPropForm({ ...propForm, default: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={propForm.description}
              onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="required"
              checked={propForm.required}
              onChange={(e) => setPropForm({ ...propForm, required: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="required" className="text-sm cursor-pointer">
              Required
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ml-auto"
              onClick={onAddProp}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Prop
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Example */}
      <div className="space-y-2">
        <Label htmlFor="usage">Usage Example</Label>
        <Textarea
          id="usage"
          placeholder="<Button variant='primary'>Click me</Button>"
          value={formData.usageExample}
          onChange={(e) => setFormData({ ...formData, usageExample: e.target.value })}
          rows={4}
          className="font-mono text-xs"
        />
      </div>

      {/* External Links */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="figma">Figma URL</Label>
          <Input
            id="figma"
            type="url"
            placeholder="https://figma.com/..."
            value={formData.figmaUrl}
            onChange={(e) => setFormData({ ...formData, figmaUrl: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="storybook">Storybook URL</Label>
          <Input
            id="storybook"
            type="url"
            placeholder="https://storybook.com/..."
            value={formData.storybookUrl}
            onChange={(e) => setFormData({ ...formData, storybookUrl: e.target.value })}
          />
        </div>
      </div>

      <Button onClick={onSubmit} className="w-full">
        {submitLabel}
      </Button>
    </div>
  );
}
