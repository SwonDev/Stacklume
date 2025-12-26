"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { motion, AnimatePresence } from "motion/react";
import {
  Settings2,
  Plus,
  Copy,
  Eye,
  EyeOff,
  Key,
  Trash2,
  Edit2,
  Download,
  Search,
  X,
  Check,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface EnvVarsWidgetProps {
  widget: Widget;
}

type VarType = "string" | "number" | "boolean" | "url" | "secret";
type Environment = "development" | "staging" | "production";

interface EnvVariable {
  id: string;
  key: string;
  description: string;
  type: VarType;
  required: boolean;
  defaultValue?: string;
  values: Record<Environment, string>;
  tags: string[];
  createdAt: number;
}

interface EnvVarsConfig {
  variables: EnvVariable[];
  environments: Environment[];
  showSecrets: boolean;
}

const TYPE_COLORS: Record<VarType, string> = {
  string: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  number: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  boolean: "bg-green-500/10 text-green-600 dark:text-green-400",
  url: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  secret: "bg-red-500/10 text-red-600 dark:text-red-400",
};

const ENV_COLORS: Record<Environment, { bg: string; border: string; text: string }> = {
  development: {
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    text: "text-green-600 dark:text-green-400",
  },
  staging: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500/20",
    text: "text-yellow-600 dark:text-yellow-400",
  },
  production: {
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    text: "text-red-600 dark:text-red-400",
  },
};

const DEFAULT_CONFIG: EnvVarsConfig = {
  variables: [],
  environments: ["development", "staging", "production"],
  showSecrets: false,
};

// Helper to normalize tags - handles corrupted data where Tag objects {id, name, color} were stored instead of strings
function normalizeTag(tag: unknown): string | null {
  if (typeof tag === 'string') return tag;
  if (tag && typeof tag === 'object' && 'name' in tag && typeof (tag as { name: unknown }).name === 'string') {
    return (tag as { name: string }).name;
  }
  if (tag && typeof tag === 'object' && 'id' in tag && typeof (tag as { id: unknown }).id === 'string') {
    return (tag as { id: string }).id;
  }
  return null;
}

function normalizeTags(tags: unknown): string[] {
  if (!tags || !Array.isArray(tags)) return [];
  return tags.map(normalizeTag).filter((t): t is string => t !== null);
}

// Helper to normalize environment - handles object format {id, name, color} from database
function normalizeEnvironment(env: unknown): Environment | null {
  if (typeof env === 'string') {
    // Map legacy IDs to proper environment names
    const envMap: Record<string, Environment> = {
      'dev': 'development',
      'development': 'development',
      'staging': 'staging',
      'prod': 'production',
      'production': 'production',
    };
    return envMap[env.toLowerCase()] || null;
  }
  if (env && typeof env === 'object') {
    // Extract id or name from object
    const obj = env as Record<string, unknown>;
    const id = obj.id || obj.name;
    if (typeof id === 'string') {
      const envMap: Record<string, Environment> = {
        'dev': 'development',
        'development': 'development',
        'staging': 'staging',
        'prod': 'production',
        'production': 'production',
      };
      return envMap[id.toLowerCase()] || null;
    }
  }
  return null;
}

// Normalize the entire config to ensure all variable tags are strings
function normalizeConfig(rawConfig: Partial<EnvVarsConfig>): EnvVarsConfig {
  const config = { ...DEFAULT_CONFIG, ...rawConfig };

  // Normalize environments array - might be objects {id, name, color} from old format
  if (rawConfig.environments && Array.isArray(rawConfig.environments)) {
    const normalizedEnvs = rawConfig.environments
      .map(normalizeEnvironment)
      .filter((e): e is Environment => e !== null);
    // Only use normalized if we got valid environments, otherwise keep defaults
    if (normalizedEnvs.length > 0) {
      config.environments = normalizedEnvs;
    }
  }

  // Normalize all variable tags
  if (config.variables && Array.isArray(config.variables)) {
    config.variables = config.variables.map((variable) => ({
      ...variable,
      tags: normalizeTags(variable.tags),
    }));
  }

  return config;
}

export default function EnvVarsWidget({ widget }: EnvVarsWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config: EnvVarsConfig = normalizeConfig(widget.config as unknown as Partial<EnvVarsConfig>);

  const [activeEnv, setActiveEnv] = useState<Environment>("development");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSecrets, setShowSecrets] = useState(config.showSecrets);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<EnvVariable | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form state for add/edit dialog
  const [formKey, setFormKey] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formType, setFormType] = useState<VarType>("string");
  const [formRequired, setFormRequired] = useState(false);
  const [formDefaultValue, setFormDefaultValue] = useState("");
  const [formValues, setFormValues] = useState<Record<Environment, string>>({
    development: "",
    staging: "",
    production: "",
  });
  const [formTags, setFormTags] = useState("");

  // Get all unique tags (normalized to handle corrupted data)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    config.variables.forEach((v) => {
      const normalizedTags = normalizeTags(v.tags as unknown[]);
      normalizedTags.forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [config.variables]);

  // Filtered variables
  const filteredVariables = useMemo(() => {
    return config.variables.filter((v) => {
      const matchesSearch =
        searchQuery === "" ||
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Normalize tags before comparison to handle corrupted data
      const normalizedVarTags = normalizeTags(v.tags as unknown[]);
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => normalizedVarTags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [config.variables, searchQuery, selectedTags]);

  const updateConfig = (updates: Partial<EnvVarsConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const resetForm = () => {
    setFormKey("");
    setFormDescription("");
    setFormType("string");
    setFormRequired(false);
    setFormDefaultValue("");
    setFormValues({ development: "", staging: "", production: "" });
    setFormTags("");
    setEditingVar(null);
  };

  const openAddDialog = () => {
    resetForm();
    setIsAddDialogOpen(true);
  };

  const openEditDialog = (variable: EnvVariable) => {
    setFormKey(variable.key);
    setFormDescription(variable.description);
    setFormType(variable.type);
    setFormRequired(variable.required);
    setFormDefaultValue(variable.defaultValue || "");
    setFormValues(variable.values);
    // Normalize tags before joining to handle any remaining corrupted data
    setFormTags(normalizeTags(variable.tags).join(", "));
    setEditingVar(variable);
    setIsAddDialogOpen(true);
  };

  const handleSaveVariable = () => {
    const tags = formTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const newVariable: EnvVariable = {
      id: editingVar?.id || `var-${Date.now()}`,
      key: formKey.toUpperCase().replace(/\s+/g, "_"),
      description: formDescription,
      type: formType,
      required: formRequired,
      defaultValue: formDefaultValue || undefined,
      values: formValues,
      tags,
      createdAt: editingVar?.createdAt || Date.now(),
    };

    if (editingVar) {
      // Update existing
      const updatedVariables = config.variables.map((v) =>
        v.id === editingVar.id ? newVariable : v
      );
      updateConfig({ variables: updatedVariables });
    } else {
      // Add new
      updateConfig({ variables: [...config.variables, newVariable] });
    }

    setIsAddDialogOpen(false);
    resetForm();
  };

  const handleDeleteVariable = (id: string) => {
    updateConfig({
      variables: config.variables.filter((v) => v.id !== id),
    });
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyValue = (value: string) => {
    navigator.clipboard.writeText(value);
  };

  const handleExportEnv = (env: Environment) => {
    const envContent = config.variables
      .filter((v) => v.values[env] || v.defaultValue)
      .map((v) => {
        const value = v.values[env] || v.defaultValue || "";
        const comment = v.description ? `# ${v.description}\n` : "";
        return `${comment}${v.key}=${value}`;
      })
      .join("\n\n");

    const blob = new Blob([envContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `.env.${env}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleShowSecrets = () => {
    const newValue = !showSecrets;
    setShowSecrets(newValue);
    updateConfig({ showSecrets: newValue });
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const maskValue = (value: string) => {
    if (!value) return "";
    return "•".repeat(Math.min(value.length, 20));
  };

  return (
    <div className="@container h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Environment Variables</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={toggleShowSecrets}
            title={showSecrets ? "Hide secrets" : "Show secrets"}
          >
            {showSecrets ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Download className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {config.environments.map((env) => (
                <DropdownMenuItem key={env} onClick={() => handleExportEnv(env)}>
                  Export .env.{env}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={openAddDialog}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
              <DialogHeader>
                <DialogTitle>
                  {editingVar ? "Edit Variable" : "Add Variable"}
                </DialogTitle>
                <DialogDescription>
                  {editingVar
                    ? "Update environment variable configuration"
                    : "Create a new environment variable"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Key */}
                <div className="space-y-2">
                  <Label htmlFor="key">
                    Key <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="key"
                    value={formKey}
                    onChange={(e) =>
                      setFormKey(e.target.value.toUpperCase().replace(/\s+/g, "_"))
                    }
                    placeholder="DATABASE_URL"
                    className="font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Connection string for the PostgreSQL database"
                    rows={2}
                  />
                </div>

                {/* Type and Required */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as VarType)}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="number">Number</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="url">URL</SelectItem>
                        <SelectItem value="secret">Secret</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="required">Required</Label>
                    <div className="flex items-center h-10">
                      <Switch
                        id="required"
                        checked={formRequired}
                        onCheckedChange={setFormRequired}
                      />
                      <Label htmlFor="required" className="ml-2 cursor-pointer">
                        {formRequired ? "Yes" : "No"}
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Default Value */}
                <div className="space-y-2">
                  <Label htmlFor="defaultValue">Default Value</Label>
                  <Input
                    id="defaultValue"
                    value={formDefaultValue}
                    onChange={(e) => setFormDefaultValue(e.target.value)}
                    placeholder="Optional fallback value"
                    className="font-mono text-sm"
                  />
                </div>

                {/* Environment Values */}
                <div className="space-y-2">
                  <Label>Environment Values</Label>
                  <div className="space-y-3">
                    {config.environments.map((env) => (
                      <div key={env} className="space-y-1">
                        <Label
                          htmlFor={`value-${env}`}
                          className={cn("text-xs capitalize", ENV_COLORS[env]?.text)}
                        >
                          {env}
                        </Label>
                        <Input
                          id={`value-${env}`}
                          value={formValues[env]}
                          onChange={(e) =>
                            setFormValues({ ...formValues, [env]: e.target.value })
                          }
                          placeholder={`Value for ${env}`}
                          className="font-mono text-sm"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="database, auth, api (comma-separated)"
                  />
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
                <Button onClick={handleSaveVariable} disabled={!formKey.trim()}>
                  {editingVar ? "Update" : "Add"} Variable
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="p-4 space-y-3 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search variables..."
            className="pl-9 pr-9 h-9 text-sm"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((tag) => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTagFilter(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Environment Tabs */}
      <Tabs value={activeEnv} onValueChange={(v) => setActiveEnv(v as Environment)} className="flex-1 flex flex-col min-h-0">
        <TabsList className="w-full grid grid-cols-3 mx-4 mt-4">
          {config.environments.map((env) => (
            <TabsTrigger key={env} value={env} className="capitalize text-xs">
              <span className={cn("flex items-center gap-1.5", ENV_COLORS[env]?.text)}>
                <div className={cn("h-2 w-2 rounded-full", ENV_COLORS[env]?.text?.replace("text-", "bg-"))} />
                {env}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {config.environments.map((env) => (
          <TabsContent key={env} value={env} className="flex-1 mt-0 overflow-y-auto">
            {filteredVariables.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Key className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  {searchQuery || selectedTags.length > 0
                    ? "No variables match your filters"
                    : "No variables yet"}
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {searchQuery || selectedTags.length > 0
                    ? "Try adjusting your search or filters"
                    : "Click the + button to add your first variable"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <AnimatePresence mode="popLayout">
                  {filteredVariables.map((variable, index) => {
                    const value = variable.values[env] || variable.defaultValue || "";
                    const isSecret = variable.type === "secret";
                    const displayValue =
                      isSecret && !showSecrets ? maskValue(value) : value;

                    return (
                      <motion.div
                        key={variable.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                        className={cn(
                          "group relative rounded-lg border p-3 hover:bg-accent/50 transition-colors",
                          variable.required && "border-l-4 border-l-orange-500"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Key and badges */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <code className="font-mono text-sm font-semibold">
                                {variable.key}
                              </code>
                              <Badge
                                variant="outline"
                                className={cn("text-xs", TYPE_COLORS[variable.type as VarType])}
                              >
                                {variable.type}
                              </Badge>
                              {variable.required && (
                                <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Required
                                </Badge>
                              )}
                            </div>

                            {/* Description */}
                            {variable.description && (
                              <p className="text-xs text-muted-foreground">
                                {variable.description}
                              </p>
                            )}

                            {/* Value */}
                            <div className="flex items-center gap-2">
                              <code
                                className={cn(
                                  "flex-1 px-2 py-1.5 rounded bg-muted/50 text-xs font-mono break-all",
                                  !value && "text-muted-foreground/50"
                                )}
                              >
                                {displayValue || "(not set)"}
                              </code>
                              {value && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleCopyValue(value)}
                                >
                                  <Copy className="h-3 w-3" />
                                </Button>
                              )}
                            </div>

                            {/* Tags */}
                            {(() => {
                              const normalizedTags = normalizeTags(variable.tags);
                              return normalizedTags.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {normalizedTags.map((tag) => (
                                    <Badge
                                      key={tag}
                                      variant="secondary"
                                      className="text-xs px-1.5 py-0"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null;
                            })()}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyKey(variable.key)}
                            >
                              {copiedKey === variable.key ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Key className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(variable)}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleDeleteVariable(variable.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Stats Footer */}
      {filteredVariables.length > 0 && (
        <div className="flex items-center justify-between gap-2 p-3 border-t text-xs text-muted-foreground">
          <span>
            {filteredVariables.length} variable{filteredVariables.length !== 1 ? "s" : ""}
            {config.variables.length !== filteredVariables.length &&
              ` of ${config.variables.length}`}
          </span>
          <span>
            {filteredVariables.filter((v) => v.required).length} required
          </span>
        </div>
      )}
    </div>
  );
}
