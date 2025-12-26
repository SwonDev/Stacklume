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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Filter,
  Plus,
  Search,
  MoreVertical,
  ArrowUpRight,
  Edit,
  Trash2,
  SortAsc,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ParkingLotIdea {
  id: string;
  title: string;
  description: string;
  category: "feature" | "improvement" | "bug" | "research" | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "new" | "under-review" | "planned" | "rejected";
  votes: number;
  tags: string[];
  createdAt: number;
}

interface ParkingLotConfig {
  ideas: ParkingLotIdea[];
}

const CATEGORY_COLORS = {
  feature: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  improvement: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  bug: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  research: "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20",
  other: "bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20",
};

const PRIORITY_COLORS = {
  low: "text-gray-500",
  medium: "text-yellow-500",
  high: "text-orange-500",
  critical: "text-red-500",
};

const STATUS_COLORS = {
  new: "bg-green-500/10 text-green-700 dark:text-green-400",
  "under-review": "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  planned: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  rejected: "bg-gray-500/10 text-gray-700 dark:text-gray-400",
};

export default function ParkingLotWidget({ widget }: { widget: Widget }) {
  const { updateWidget } = useWidgetStore();
  const config = (widget.config || {}) as ParkingLotConfig;
  const ideas = config.ideas || [];

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIdea, setEditingIdea] = useState<ParkingLotIdea | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"votes" | "priority" | "date">("votes");

  const [newIdea, setNewIdea] = useState<{
    title: string;
    description: string;
    category: ParkingLotIdea["category"];
    priority: ParkingLotIdea["priority"];
    tags: string;
  }>({
    title: "",
    description: "",
    category: "feature",
    priority: "medium",
    tags: "",
  });

  const updateConfig = (updates: Partial<ParkingLotConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const addIdea = () => {
    if (!newIdea.title.trim()) return;

    const idea: ParkingLotIdea = {
      id: crypto.randomUUID(),
      title: newIdea.title,
      description: newIdea.description,
      category: newIdea.category,
      priority: newIdea.priority,
      status: "new",
      votes: 0,
      tags: newIdea.tags.split(",").map((t) => t.trim()).filter(Boolean),
      createdAt: Date.now(),
    };

    updateConfig({ ideas: [...ideas, idea] });
    setNewIdea({
      title: "",
      description: "",
      category: "feature",
      priority: "medium",
      tags: "",
    });
    setIsAddDialogOpen(false);
  };

  const updateIdea = () => {
    if (!editingIdea || !editingIdea.title.trim()) return;

    const updatedIdeas = ideas.map((idea) =>
      idea.id === editingIdea.id ? editingIdea : idea
    );
    updateConfig({ ideas: updatedIdeas });
    setIsEditDialogOpen(false);
    setEditingIdea(null);
  };

  const deleteIdea = (id: string) => {
    updateConfig({ ideas: ideas.filter((idea) => idea.id !== id) });
  };

  const vote = (id: string, delta: number) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === id ? { ...idea, votes: Math.max(0, idea.votes + delta) } : idea
    );
    updateConfig({ ideas: updatedIdeas });
  };

  const changeStatus = (id: string, status: ParkingLotIdea["status"]) => {
    const updatedIdeas = ideas.map((idea) =>
      idea.id === id ? { ...idea, status } : idea
    );
    updateConfig({ ideas: updatedIdeas });
  };

  const promoteIdea = (id: string) => {
    changeStatus(id, "planned");
  };

  const filteredAndSortedIdeas = useMemo(() => {
    const filtered = ideas.filter((idea) => {
      const matchesSearch =
        idea.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        idea.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" || idea.category === categoryFilter;

      const matchesStatus =
        statusFilter === "all" || idea.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });

    filtered.sort((a, b) => {
      if (sortBy === "votes") {
        return b.votes - a.votes;
      } else if (sortBy === "priority") {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else {
        return b.createdAt - a.createdAt;
      }
    });

    return filtered;
  }, [ideas, searchQuery, categoryFilter, statusFilter, sortBy]);

  const openEditDialog = (idea: ParkingLotIdea) => {
    setEditingIdea({ ...idea });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="h-full flex flex-col gap-3 @container">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold">Parking Lot</h3>
          <Badge variant="secondary" className="@sm:inline-flex hidden">
            {ideas.length}
          </Badge>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              <span className="@sm:inline hidden">Add Idea</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Idea</DialogTitle>
              <DialogDescription>
                Add a new idea or feature to the parking lot for later consideration.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={newIdea.title}
                  onChange={(e) =>
                    setNewIdea({ ...newIdea, title: e.target.value })
                  }
                  placeholder="Brief idea title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newIdea.description}
                  onChange={(e) =>
                    setNewIdea({ ...newIdea, description: e.target.value })
                  }
                  placeholder="Describe the idea in more detail..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newIdea.category}
                    onValueChange={(value) =>
                      setNewIdea({
                        ...newIdea,
                        category: value as ParkingLotIdea["category"],
                      })
                    }
                  >
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newIdea.priority}
                    onValueChange={(value) =>
                      setNewIdea({
                        ...newIdea,
                        priority: value as ParkingLotIdea["priority"],
                      })
                    }
                  >
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tags">Tags (comma separated)</Label>
                <Input
                  id="tags"
                  value={newIdea.tags}
                  onChange={(e) =>
                    setNewIdea({ ...newIdea, tags: e.target.value })
                  }
                  placeholder="ui, backend, api"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={addIdea}>Add Idea</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col @sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="w-4 h-4" />
                <span className="@md:inline hidden">Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Category</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setCategoryFilter("all")}>
                All Categories
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("feature")}>
                Feature
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("improvement")}>
                Improvement
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("bug")}>
                Bug
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("research")}>
                Research
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCategoryFilter("other")}>
                Other
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Status
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("new")}>
                New
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("under-review")}>
                Under Review
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("planned")}>
                Planned
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("rejected")}>
                Rejected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SortAsc className="w-4 h-4" />
                <span className="@md:inline hidden">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("votes")}>
                By Votes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("priority")}>
                By Priority
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("date")}>
                By Date
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Ideas List */}
      <ScrollArea className="flex-1">
        <AnimatePresence mode="popLayout">
          {filteredAndSortedIdeas.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground"
            >
              <Lightbulb className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">
                {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                  ? "No ideas match your filters"
                  : "No ideas yet. Add your first idea!"}
              </p>
            </motion.div>
          ) : (
            <div className="grid gap-3 pb-2">
              {filteredAndSortedIdeas.map((idea) => (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="border rounded-lg p-4 space-y-3 hover:shadow-sm transition-shadow bg-card"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium">{idea.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={CATEGORY_COLORS[idea.category]}
                          >
                            {idea.category}
                          </Badge>
                          <span
                            className={`text-xs font-medium ${
                              PRIORITY_COLORS[idea.priority]
                            }`}
                          >
                            {idea.priority}
                          </span>
                        </div>
                      </div>
                      {idea.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {idea.description}
                        </p>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(idea)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => promoteIdea(idea.id)}>
                          <ArrowUpRight className="w-4 h-4 mr-2" />
                          Promote to Planned
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => changeStatus(idea.id, "new")}
                        >
                          New
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changeStatus(idea.id, "under-review")}
                        >
                          Under Review
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changeStatus(idea.id, "planned")}
                        >
                          Planned
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => changeStatus(idea.id, "rejected")}
                        >
                          Rejected
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteIdea(idea.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 border rounded-md">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => vote(idea.id, 1)}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </Button>
                        <span className="text-sm font-medium px-2 min-w-[2ch] text-center">
                          {idea.votes}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => vote(idea.id, -1)}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <Badge variant="secondary" className={STATUS_COLORS[idea.status]}>
                        {idea.status.replace("-", " ")}
                      </Badge>
                    </div>

                    {idea.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {idea.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </ScrollArea>

      {/* Edit Dialog */}
      {editingIdea && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Idea</DialogTitle>
              <DialogDescription>
                Update the idea details and settings.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editingIdea.title}
                  onChange={(e) =>
                    setEditingIdea({ ...editingIdea, title: e.target.value })
                  }
                  placeholder="Brief idea title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingIdea.description}
                  onChange={(e) =>
                    setEditingIdea({
                      ...editingIdea,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe the idea in more detail..."
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Category</Label>
                  <Select
                    value={editingIdea.category}
                    onValueChange={(value) =>
                      setEditingIdea({
                        ...editingIdea,
                        category: value as ParkingLotIdea["category"],
                      })
                    }
                  >
                    <SelectTrigger id="edit-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="feature">Feature</SelectItem>
                      <SelectItem value="improvement">Improvement</SelectItem>
                      <SelectItem value="bug">Bug</SelectItem>
                      <SelectItem value="research">Research</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <Select
                    value={editingIdea.priority}
                    onValueChange={(value) =>
                      setEditingIdea({
                        ...editingIdea,
                        priority: value as ParkingLotIdea["priority"],
                      })
                    }
                  >
                    <SelectTrigger id="edit-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingIdea.status}
                  onValueChange={(value) =>
                    setEditingIdea({
                      ...editingIdea,
                      status: value as ParkingLotIdea["status"],
                    })
                  }
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="under-review">Under Review</SelectItem>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-tags">Tags (comma separated)</Label>
                <Input
                  id="edit-tags"
                  value={editingIdea.tags.join(", ")}
                  onChange={(e) =>
                    setEditingIdea({
                      ...editingIdea,
                      tags: e.target.value
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="ui, backend, api"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingIdea(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={updateIdea}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
