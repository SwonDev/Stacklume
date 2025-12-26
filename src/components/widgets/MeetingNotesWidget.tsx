"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  ClipboardList,
  Users,
  Calendar,
  CheckSquare,
  Plus,
  Search,
  MoreVertical,
  Copy,
  Trash2,
  Edit2,
  ArrowUpDown,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  dueDate: string;
  completed: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  attendees: string[];
  agenda: string[];
  notes: string;
  actionItems: ActionItem[];
  decisions: string[];
}

interface MeetingNotesConfig {
  meetings: Meeting[];
  sortBy: "date" | "title";
  sortOrder: "asc" | "desc";
}

interface MeetingNotesWidgetProps {
  widget: Widget;
}

export function MeetingNotesWidget({ widget }: MeetingNotesWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const config = (widget.config as unknown as MeetingNotesConfig) || {
    meetings: [],
    sortBy: "date",
    sortOrder: "desc",
  };

  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    config.meetings[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [isAddMeetingOpen, setIsAddMeetingOpen] = useState(false);
  const [_isEditMeetingOpen, _setIsEditMeetingOpen] = useState(false);
  const [isAddActionOpen, setIsAddActionOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);

  // Form states
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    date: new Date().toISOString().split("T")[0],
    attendees: "",
    agenda: "",
  });

  const [newAction, setNewAction] = useState({
    task: "",
    assignee: "",
    dueDate: new Date().toISOString().split("T")[0],
  });

  const updateConfig = (updates: Partial<MeetingNotesConfig>) => {
    updateWidget(widget.id, {
      config: { ...config, ...updates } as unknown as typeof widget.config,
    });
  };

  const selectedMeeting = useMemo(
    () => config.meetings.find((m) => m.id === selectedMeetingId),
    [config.meetings, selectedMeetingId]
  );

  // Filter and sort meetings
  const filteredMeetings = useMemo(() => {
    let filtered = config.meetings;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.attendees.some((a) => a.toLowerCase().includes(query))
      );
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter((m) => {
        const meetingDate = new Date(m.date);
        const diffDays = Math.floor(
          (now.getTime() - meetingDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        switch (dateFilter) {
          case "today":
            return diffDays === 0;
          case "week":
            return diffDays <= 7;
          case "month":
            return diffDays <= 30;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      if (config.sortBy === "date") {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        comparison = a.title.localeCompare(b.title);
      }
      return config.sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [config.meetings, searchQuery, dateFilter, config.sortBy, config.sortOrder]);

  const addMeeting = () => {
    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title,
      date: newMeeting.date,
      attendees: newMeeting.attendees
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      agenda: newMeeting.agenda
        .split("\n")
        .map((a) => a.trim())
        .filter(Boolean),
      notes: "",
      actionItems: [],
      decisions: [],
    };

    updateConfig({ meetings: [...config.meetings, meeting] });
    setSelectedMeetingId(meeting.id);
    setNewMeeting({
      title: "",
      date: new Date().toISOString().split("T")[0],
      attendees: "",
      agenda: "",
    });
    setIsAddMeetingOpen(false);
  };

  const updateMeeting = (
    meetingId: string,
    updates: Partial<Omit<Meeting, "id">>
  ) => {
    updateConfig({
      meetings: config.meetings.map((m) =>
        m.id === meetingId ? { ...m, ...updates } : m
      ),
    });
  };

  const deleteMeeting = (meetingId: string) => {
    updateConfig({
      meetings: config.meetings.filter((m) => m.id !== meetingId),
    });
    if (selectedMeetingId === meetingId) {
      setSelectedMeetingId(config.meetings[0]?.id || null);
    }
  };

  const addActionItem = () => {
    if (!selectedMeeting) return;

    const action: ActionItem = {
      id: Date.now().toString(),
      task: newAction.task,
      assignee: newAction.assignee,
      dueDate: newAction.dueDate,
      completed: false,
    };

    updateMeeting(selectedMeeting.id, {
      actionItems: [...selectedMeeting.actionItems, action],
    });

    setNewAction({
      task: "",
      assignee: "",
      dueDate: new Date().toISOString().split("T")[0],
    });
    setIsAddActionOpen(false);
  };

  const updateActionItem = () => {
    if (!selectedMeeting || !editingAction) return;

    updateMeeting(selectedMeeting.id, {
      actionItems: selectedMeeting.actionItems.map((a) =>
        a.id === editingAction.id ? editingAction : a
      ),
    });

    setEditingAction(null);
  };

  const deleteActionItem = (actionId: string) => {
    if (!selectedMeeting) return;

    updateMeeting(selectedMeeting.id, {
      actionItems: selectedMeeting.actionItems.filter((a) => a.id !== actionId),
    });
  };

  const toggleActionComplete = (actionId: string) => {
    if (!selectedMeeting) return;

    updateMeeting(selectedMeeting.id, {
      actionItems: selectedMeeting.actionItems.map((a) =>
        a.id === actionId ? { ...a, completed: !a.completed } : a
      ),
    });
  };

  const copyAsMarkdown = () => {
    if (!selectedMeeting) return;

    const markdown = `# ${selectedMeeting.title}

**Date:** ${new Date(selectedMeeting.date).toLocaleDateString()}
**Attendees:** ${selectedMeeting.attendees.join(", ")}

## Agenda
${selectedMeeting.agenda.map((item) => `- ${item}`).join("\n")}

## Notes
${selectedMeeting.notes}

## Action Items
${selectedMeeting.actionItems
  .map(
    (item) =>
      `- [${item.completed ? "x" : " "}] ${item.task} (@${item.assignee}, Due: ${new Date(item.dueDate).toLocaleDateString()})`
  )
  .join("\n")}

## Decisions
${selectedMeeting.decisions.map((item) => `- ${item}`).join("\n")}
`;

    navigator.clipboard.writeText(markdown);
  };

  const toggleSort = () => {
    if (config.sortOrder === "asc") {
      updateConfig({ sortOrder: "desc" });
    } else {
      updateConfig({ sortOrder: "asc" });
    }
  };

  const _pendingActions = selectedMeeting?.actionItems.filter(
    (a) => !a.completed
  ).length || 0;
  const completedActions = selectedMeeting?.actionItems.filter(
    (a) => a.completed
  ).length || 0;

  return (
    <div className="@container h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Meeting Notes</h3>
        </div>
        <Dialog open={isAddMeetingOpen} onOpenChange={setIsAddMeetingOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Meeting</DialogTitle>
              <DialogDescription>
                Create a new meeting with agenda and attendees
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Weekly Team Sync"
                  value={newMeeting.title}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attendees">Attendees (comma-separated)</Label>
                <Input
                  id="attendees"
                  placeholder="John Doe, Jane Smith, Bob Johnson"
                  value={newMeeting.attendees}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, attendees: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda (one per line)</Label>
                <Textarea
                  id="agenda"
                  placeholder="Review last week's progress&#10;Discuss upcoming features&#10;Plan next sprint"
                  rows={4}
                  value={newMeeting.agenda}
                  onChange={(e) =>
                    setNewMeeting({ ...newMeeting, agenda: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddMeetingOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={addMeeting}
                disabled={!newMeeting.title || !newMeeting.date}
              >
                Create Meeting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-col @sm:flex-row gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search meetings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={toggleSort}>
            <ArrowUpDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex-1 grid @3xl:grid-cols-[350px_1fr] min-h-0">
        {/* Meetings List */}
        <div className="border-r @max-3xl:border-b">
          <ScrollArea className="h-full">
            <div className="p-2 space-y-1">
              {filteredMeetings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <ClipboardList className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-sm">No meetings found</p>
                </div>
              ) : (
                filteredMeetings.map((meeting) => {
                  const pending = meeting.actionItems.filter(
                    (a) => !a.completed
                  ).length;
                  const total = meeting.actionItems.length;

                  return (
                    <motion.button
                      key={meeting.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => setSelectedMeetingId(meeting.id)}
                      className={cn(
                        "w-full p-3 rounded-lg text-left transition-colors hover:bg-accent/50",
                        selectedMeetingId === meeting.id &&
                          "bg-accent ring-2 ring-primary/20"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">
                          {meeting.title}
                        </h4>
                        <ChevronRight
                          className={cn(
                            "w-4 h-4 text-muted-foreground shrink-0 transition-transform",
                            selectedMeetingId === meeting.id && "rotate-90"
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(meeting.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {meeting.attendees.length}
                        </div>
                      </div>
                      {total > 0 && (
                        <Badge
                          variant={pending > 0 ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {pending > 0 ? `${pending} pending` : "All complete"}
                        </Badge>
                      )}
                    </motion.button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Meeting Detail */}
        <div className="@max-3xl:hidden">
          {selectedMeeting ? (
            <div className="h-full flex flex-col">
              {/* Meeting Header */}
              <div className="p-4 border-b space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                      {selectedMeeting.title}
                    </h2>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedMeeting.date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={copyAsMarkdown}
                      title="Copy as markdown"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteMeeting(selectedMeeting.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Meeting
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Attendees */}
                {selectedMeeting.attendees.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    {selectedMeeting.attendees.map((attendee, i) => (
                      <Badge key={i} variant="secondary">
                        {attendee}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Action Items Summary */}
                {selectedMeeting.actionItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {completedActions} of {selectedMeeting.actionItems.length}{" "}
                      action items completed
                    </span>
                  </div>
                )}
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                  {/* Agenda */}
                  {selectedMeeting.agenda.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Agenda</h3>
                      <ul className="space-y-1 list-disc list-inside text-sm">
                        {selectedMeeting.agenda.map((item, i) => (
                          <li key={i} className="text-muted-foreground">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <Textarea
                      placeholder="Add meeting notes..."
                      rows={6}
                      value={selectedMeeting.notes}
                      onChange={(e) =>
                        updateMeeting(selectedMeeting.id, {
                          notes: e.target.value,
                        })
                      }
                      className="resize-none"
                    />
                  </div>

                  {/* Action Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold">Action Items</h3>
                      <Dialog
                        open={isAddActionOpen}
                        onOpenChange={setIsAddActionOpen}
                      >
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <Plus className="w-4 h-4 mr-1" />
                            Add Action
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>New Action Item</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="task">Task</Label>
                              <Input
                                id="task"
                                placeholder="Follow up with client"
                                value={newAction.task}
                                onChange={(e) =>
                                  setNewAction({
                                    ...newAction,
                                    task: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="assignee">Assignee</Label>
                              <Input
                                id="assignee"
                                placeholder="John Doe"
                                value={newAction.assignee}
                                onChange={(e) =>
                                  setNewAction({
                                    ...newAction,
                                    assignee: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="dueDate">Due Date</Label>
                              <Input
                                id="dueDate"
                                type="date"
                                value={newAction.dueDate}
                                onChange={(e) =>
                                  setNewAction({
                                    ...newAction,
                                    dueDate: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              variant="outline"
                              onClick={() => setIsAddActionOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={addActionItem}
                              disabled={!newAction.task || !newAction.assignee}
                            >
                              Add Action
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {selectedMeeting.actionItems.length === 0 ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-sm text-muted-foreground text-center py-4"
                          >
                            No action items yet
                          </motion.div>
                        ) : (
                          selectedMeeting.actionItems.map((action) => (
                            <motion.div
                              key={action.id}
                              layout
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border bg-card transition-opacity",
                                action.completed && "opacity-60"
                              )}
                            >
                              <Checkbox
                                checked={action.completed}
                                onCheckedChange={() =>
                                  toggleActionComplete(action.id)
                                }
                                className="mt-0.5"
                              />
                              <div className="flex-1 min-w-0">
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    action.completed && "line-through"
                                  )}
                                >
                                  {action.task}
                                </p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                  <span>@{action.assignee}</span>
                                  <span>
                                    Due:{" "}
                                    {new Date(
                                      action.dueDate
                                    ).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingAction(action);
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => deleteActionItem(action.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Decisions */}
                  <div>
                    <h3 className="font-semibold mb-2">Decisions Made</h3>
                    <Textarea
                      placeholder="Add decisions (one per line)..."
                      rows={4}
                      value={selectedMeeting.decisions.join("\n")}
                      onChange={(e) =>
                        updateMeeting(selectedMeeting.id, {
                          decisions: e.target.value
                            .split("\n")
                            .map((d) => d.trim())
                            .filter(Boolean),
                        })
                      }
                      className="resize-none"
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Select a meeting to view details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Action Dialog */}
      <Dialog
        open={!!editingAction}
        onOpenChange={(open) => !open && setEditingAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-task">Task</Label>
                <Input
                  id="edit-task"
                  value={editingAction.task}
                  onChange={(e) =>
                    setEditingAction({ ...editingAction, task: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignee">Assignee</Label>
                <Input
                  id="edit-assignee"
                  value={editingAction.assignee}
                  onChange={(e) =>
                    setEditingAction({
                      ...editingAction,
                      assignee: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dueDate">Due Date</Label>
                <Input
                  id="edit-dueDate"
                  type="date"
                  value={editingAction.dueDate}
                  onChange={(e) =>
                    setEditingAction({
                      ...editingAction,
                      dueDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAction(null)}>
              Cancel
            </Button>
            <Button onClick={updateActionItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
