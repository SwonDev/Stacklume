"use client";

import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useState, useMemo } from "react";
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
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from "motion/react";
import {
  Server,
  Plus,
  Copy,
  Filter,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronRight,
  Settings,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface APIEndpoint {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  description: string;
  parameters: Parameter[];
  responseExample: string;
  tags: string[];
}

interface APIReferenceConfig {
  baseUrl: string;
  endpoints: APIEndpoint[];
}

const METHOD_COLORS = {
  GET: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
  POST: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  PUT: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  PATCH: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  DELETE: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

const DEFAULT_ENDPOINTS: APIEndpoint[] = [
  {
    id: "1",
    method: "GET",
    path: "/api/links",
    description: "Get all links with optional filtering",
    parameters: [
      { name: "category", type: "string", required: false, description: "Filter by category ID" },
      { name: "tag", type: "string", required: false, description: "Filter by tag ID" },
      { name: "search", type: "string", required: false, description: "Search in title and description" },
    ],
    responseExample: JSON.stringify([
      {
        id: "1",
        title: "Example Link",
        url: "https://example.com",
        description: "An example link",
        categoryId: "cat1",
        createdAt: "2025-12-12T00:00:00Z",
      },
    ], null, 2),
    tags: ["links", "read"],
  },
  {
    id: "2",
    method: "POST",
    path: "/api/links",
    description: "Create a new link",
    parameters: [
      { name: "url", type: "string", required: true, description: "The URL to save" },
      { name: "title", type: "string", required: false, description: "Custom title" },
      { name: "description", type: "string", required: false, description: "Custom description" },
      { name: "categoryId", type: "string", required: false, description: "Category ID" },
    ],
    responseExample: JSON.stringify({
      id: "1",
      title: "Example Link",
      url: "https://example.com",
      description: "An example link",
      categoryId: "cat1",
      createdAt: "2025-12-12T00:00:00Z",
    }, null, 2),
    tags: ["links", "write"],
  },
];

export default function APIReferenceWidget({ widget }: { widget: Widget }) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as APIReferenceConfig) || {
    baseUrl: "http://localhost:3000",
    endpoints: DEFAULT_ENDPOINTS,
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMethods, setSelectedMethods] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [expandedEndpoints, setExpandedEndpoints] = useState<Set<string>>(new Set());
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isBaseUrlDialogOpen, setIsBaseUrlDialogOpen] = useState(false);
  const [baseUrlInput, setBaseUrlInput] = useState(config.baseUrl);

  // Add endpoint form state
  const [newEndpoint, setNewEndpoint] = useState<Omit<APIEndpoint, "id">>({
    method: "GET",
    path: "",
    description: "",
    parameters: [],
    responseExample: "",
    tags: [],
  });
  const [parameterInput, setParameterInput] = useState({ name: "", type: "string", required: false, description: "" });
  const [tagInput, setTagInput] = useState("");

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    config.endpoints.forEach((endpoint) => {
      endpoint.tags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [config.endpoints]);

  // Filter endpoints
  const filteredEndpoints = useMemo(() => {
    return config.endpoints.filter((endpoint) => {
      // Method filter
      if (selectedMethods.length > 0 && !selectedMethods.includes(endpoint.method)) {
        return false;
      }

      // Tag filter
      if (selectedTags.length > 0 && !endpoint.tags.some((tag) => selectedTags.includes(tag))) {
        return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          endpoint.path.toLowerCase().includes(query) ||
          endpoint.description.toLowerCase().includes(query) ||
          endpoint.tags.some((tag) => tag.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [config.endpoints, selectedMethods, selectedTags, searchQuery]);

  const toggleEndpoint = (id: string) => {
    const newExpanded = new Set(expandedEndpoints);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedEndpoints(newExpanded);
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedStates({ ...copiedStates, [key]: true });
    setTimeout(() => {
      setCopiedStates((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const generateCurlCommand = (endpoint: APIEndpoint) => {
    const url = `${config.baseUrl}${endpoint.path}`;
    let curl = `curl -X ${endpoint.method} "${url}"`;

    if (endpoint.method !== "GET" && endpoint.parameters.length > 0) {
      const body = endpoint.parameters
        .filter((p) => p.required)
        .reduce((acc, p) => ({ ...acc, [p.name]: `<${p.type}>` }), {});
      curl += ` \\\n  -H "Content-Type: application/json" \\\n  -d '${JSON.stringify(body)}'`;
    }

    return curl;
  };

  const handleAddEndpoint = () => {
    const endpoint: APIEndpoint = {
      id: Date.now().toString(),
      ...newEndpoint,
    };

    updateWidget(widget.id, {
      config: {
        ...config,
        endpoints: [...config.endpoints, endpoint],
      },
    });

    // Reset form
    setNewEndpoint({
      method: "GET",
      path: "",
      description: "",
      parameters: [],
      responseExample: "",
      tags: [],
    });
    setIsAddDialogOpen(false);
  };

  const handleDeleteEndpoint = (id: string) => {
    updateWidget(widget.id, {
      config: {
        ...config,
        endpoints: config.endpoints.filter((e) => e.id !== id),
      },
    });
  };

  const handleUpdateBaseUrl = () => {
    updateWidget(widget.id, {
      config: {
        ...config,
        baseUrl: baseUrlInput,
      },
    });
    setIsBaseUrlDialogOpen(false);
  };

  const addParameter = () => {
    if (parameterInput.name && parameterInput.type) {
      setNewEndpoint({
        ...newEndpoint,
        parameters: [...newEndpoint.parameters, { ...parameterInput }],
      });
      setParameterInput({ name: "", type: "string", required: false, description: "" });
    }
  };

  const removeParameter = (index: number) => {
    setNewEndpoint({
      ...newEndpoint,
      parameters: newEndpoint.parameters.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (tagInput && !newEndpoint.tags.includes(tagInput)) {
      setNewEndpoint({
        ...newEndpoint,
        tags: [...newEndpoint.tags, tagInput],
      });
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setNewEndpoint({
      ...newEndpoint,
      tags: newEndpoint.tags.filter((t) => t !== tag),
    });
  };

  return (
    <div className="@container h-full flex flex-col bg-gradient-to-br from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-4 h-4 text-slate-600 dark:text-slate-400 flex-shrink-0" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            API Reference
          </h3>
          <Badge variant="outline" className="text-xs flex-shrink-0">
            {config.endpoints.length}
          </Badge>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Base URL Settings */}
          <Dialog open={isBaseUrlDialogOpen} onOpenChange={setIsBaseUrlDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Configure base URL"
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
              <DialogHeader>
                <DialogTitle>Base URL Configuration</DialogTitle>
                <DialogDescription>
                  Set the base URL for all API endpoints
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    value={baseUrlInput}
                    onChange={(e) => setBaseUrlInput(e.target.value)}
                    placeholder="http://localhost:3000"
                    className="font-mono text-sm"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsBaseUrlDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateBaseUrl}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Filter endpoints"
              >
                <Filter className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Method</DropdownMenuLabel>
              {(["GET", "POST", "PUT", "PATCH", "DELETE"] as const).map((method) => (
                <DropdownMenuCheckboxItem
                  key={method}
                  checked={selectedMethods.includes(method)}
                  onCheckedChange={(checked) => {
                    setSelectedMethods(
                      checked
                        ? [...selectedMethods, method]
                        : selectedMethods.filter((m) => m !== method)
                    );
                  }}
                >
                  <Badge className={cn("mr-2 text-xs", METHOD_COLORS[method])}>
                    {method}
                  </Badge>
                </DropdownMenuCheckboxItem>
              ))}

              {allTags.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Filter by Tag</DropdownMenuLabel>
                  {allTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag}
                      checked={selectedTags.includes(tag)}
                      onCheckedChange={(checked) => {
                        setSelectedTags(
                          checked
                            ? [...selectedTags, tag]
                            : selectedTags.filter((t) => t !== tag)
                        );
                      }}
                    >
                      {tag}
                    </DropdownMenuCheckboxItem>
                  ))}
                </>
              )}

              {(selectedMethods.length > 0 || selectedTags.length > 0) && (
                <>
                  <DropdownMenuSeparator />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setSelectedMethods([]);
                      setSelectedTags([]);
                    }}
                  >
                    Clear Filters
                  </Button>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Add Endpoint Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                title="Add endpoint"
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add API Endpoint</DialogTitle>
                <DialogDescription>
                  Add a new endpoint to your API reference
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4 py-4">
                  {/* Method and Path */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="method">Method</Label>
                      <Select
                        value={newEndpoint.method}
                        onValueChange={(value: APIEndpoint["method"]) =>
                          setNewEndpoint({ ...newEndpoint, method: value })
                        }
                      >
                        <SelectTrigger id="method">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-2">
                      <Label htmlFor="path">Path</Label>
                      <Input
                        id="path"
                        value={newEndpoint.path}
                        onChange={(e) =>
                          setNewEndpoint({ ...newEndpoint, path: e.target.value })
                        }
                        placeholder="/api/resource"
                        className="font-mono text-sm"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newEndpoint.description}
                      onChange={(e) =>
                        setNewEndpoint({ ...newEndpoint, description: e.target.value })
                      }
                      placeholder="What does this endpoint do?"
                    />
                  </div>

                  {/* Parameters */}
                  <div className="space-y-2">
                    <Label>Parameters</Label>
                    <div className="space-y-2">
                      {newEndpoint.parameters.map((param, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-800"
                        >
                          <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                            <span className="font-mono font-semibold">{param.name}</span>
                            <span className="text-slate-500">{param.type}</span>
                            <Badge
                              variant={param.required ? "default" : "outline"}
                              className="text-xs w-fit"
                            >
                              {param.required ? "required" : "optional"}
                            </Badge>
                            <span className="text-slate-600 dark:text-slate-400 truncate">
                              {param.description}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => removeParameter(index)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}

                      <div className="grid grid-cols-12 gap-2">
                        <Input
                          placeholder="Name"
                          value={parameterInput.name}
                          onChange={(e) =>
                            setParameterInput({ ...parameterInput, name: e.target.value })
                          }
                          className="col-span-3 h-8 text-xs"
                        />
                        <Select
                          value={parameterInput.type}
                          onValueChange={(value) =>
                            setParameterInput({ ...parameterInput, type: value })
                          }
                        >
                          <SelectTrigger className="col-span-2 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="string">string</SelectItem>
                            <SelectItem value="number">number</SelectItem>
                            <SelectItem value="boolean">boolean</SelectItem>
                            <SelectItem value="object">object</SelectItem>
                            <SelectItem value="array">array</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="col-span-2 flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={parameterInput.required}
                            onChange={(e) =>
                              setParameterInput({
                                ...parameterInput,
                                required: e.target.checked,
                              })
                            }
                            className="rounded"
                          />
                          Required
                        </label>
                        <Input
                          placeholder="Description"
                          value={parameterInput.description}
                          onChange={(e) =>
                            setParameterInput({
                              ...parameterInput,
                              description: e.target.value,
                            })
                          }
                          className="col-span-4 h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          onClick={addParameter}
                          className="col-span-1 h-8"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Response Example */}
                  <div className="space-y-2">
                    <Label htmlFor="response">Response Example (JSON)</Label>
                    <Textarea
                      id="response"
                      value={newEndpoint.responseExample}
                      onChange={(e) =>
                        setNewEndpoint({ ...newEndpoint, responseExample: e.target.value })
                      }
                      placeholder='{\n  "id": "1",\n  "data": "example"\n}'
                      className="font-mono text-xs min-h-[100px]"
                    />
                  </div>

                  {/* Tags */}
                  <div className="space-y-2">
                    <Label>Tags</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {newEndpoint.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="gap-1">
                          {tag}
                          <button
                            onClick={() => removeTag(tag)}
                            className="hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add tag"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                          }
                        }}
                        className="h-8 text-xs"
                      />
                      <Button size="sm" onClick={addTag} className="h-8">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </ScrollArea>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddEndpoint}
                  disabled={!newEndpoint.path || !newEndpoint.description}
                >
                  Add Endpoint
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <Input
            placeholder="Search endpoints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Endpoints List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filteredEndpoints.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 dark:text-slate-400">
              {config.endpoints.length === 0
                ? "No endpoints yet. Add your first endpoint!"
                : "No endpoints match your filters"}
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredEndpoints.map((endpoint) => {
                const isExpanded = expandedEndpoints.has(endpoint.id);
                const curlKey = `curl-${endpoint.id}`;
                const urlKey = `url-${endpoint.id}`;

                return (
                  <motion.div
                    key={endpoint.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                  >
                    {/* Endpoint Header */}
                    <button
                      onClick={() => toggleEndpoint(endpoint.id)}
                      className="w-full flex items-center gap-2 p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                      <Badge className={cn("text-xs font-mono", METHOD_COLORS[endpoint.method])}>
                        {endpoint.method}
                      </Badge>
                      <span className="font-mono text-sm text-slate-900 dark:text-slate-100 flex-1 text-left truncate">
                        {endpoint.path}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 flex-shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEndpoint(endpoint.id);
                        }}
                        title="Delete endpoint"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </Button>
                    </button>

                    {/* Endpoint Details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="border-t border-slate-200 dark:border-slate-800"
                        >
                          <div className="p-3 space-y-3">
                            {/* Description */}
                            <div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                {endpoint.description}
                              </p>
                            </div>

                            {/* Tags */}
                            {endpoint.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {endpoint.tags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {/* Parameters */}
                            {endpoint.parameters.length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Parameters
                                </h4>
                                <div className="space-y-1">
                                  {endpoint.parameters.map((param, index) => (
                                    <div
                                      key={index}
                                      className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/50"
                                    >
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                                          {param.name}
                                        </span>
                                        <span className="text-slate-500">{param.type}</span>
                                        <Badge
                                          variant={param.required ? "default" : "outline"}
                                          className="text-xs"
                                        >
                                          {param.required ? "required" : "optional"}
                                        </Badge>
                                      </div>
                                      <p className="text-slate-600 dark:text-slate-400">
                                        {param.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Response Example */}
                            {endpoint.responseExample && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                  Response Example
                                </h4>
                                <pre className="text-xs p-2 rounded bg-slate-50 dark:bg-slate-800/50 overflow-x-auto font-mono text-slate-900 dark:text-slate-100">
                                  {endpoint.responseExample}
                                </pre>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  copyToClipboard(
                                    `${config.baseUrl}${endpoint.path}`,
                                    urlKey
                                  )
                                }
                              >
                                {copiedStates[urlKey] ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                Copy URL
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  copyToClipboard(generateCurlCommand(endpoint), curlKey)
                                }
                              >
                                {copiedStates[curlKey] ? (
                                  <Check className="w-3 h-3" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                                Copy cURL
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                onClick={() =>
                                  window.open(`${config.baseUrl}${endpoint.path}`, "_blank")
                                }
                              >
                                <ExternalLink className="w-3 h-3" />
                                Open
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </ScrollArea>

      {/* Footer with Base URL */}
      <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Base:</span>
          <code className="text-xs font-mono text-slate-700 dark:text-slate-300 flex-1 truncate">
            {config.baseUrl}
          </code>
        </div>
      </div>
    </div>
  );
}
