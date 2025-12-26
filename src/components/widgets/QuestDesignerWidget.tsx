"use client";

import { useState, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  Scroll,
  Target,
  Gift,
  Map,
  Users,
  Plus,
  Trash2,
  Download,
  Copy,
  Eye,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Code2,
  Sparkles,
  Trophy,
  Coins,
  Sword,
  MessageSquare,
  Package,
  Flag,
  Link2,
  Settings,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuestDesignerWidgetProps {
  widget: Widget;
}

type QuestType = "main" | "side" | "daily" | "repeatable";
type ObjectiveType = "kill" | "collect" | "talk" | "explore" | "escort" | "deliver";
type ObjectiveOrder = "sequential" | "any";

interface Objective {
  id: string;
  type: ObjectiveType;
  description: string;
  targetName: string;
  targetCount: number;
  currentCount: number;
  optional: boolean;
}

interface Reward {
  xp: number;
  gold: number;
  items: string[];
  reputation: Array<{ faction: string; amount: number }>;
  unlocks: string[];
}

interface QuestStage {
  id: string;
  name: string;
  description: string;
  objectives: Objective[];
}

interface Quest {
  id: string;
  name: string;
  description: string;
  summary: string;
  type: QuestType;
  levelRequirement: number;
  prerequisites: string[];
  questGiver: string;
  location: string;
  objectives: Objective[];
  objectiveOrder: ObjectiveOrder;
  rewards: Reward;
  stages: QuestStage[];
  chainedQuests: string[];
  completed: boolean;
  markerColor: string;
}

const OBJECTIVE_TYPE_ICONS: Record<ObjectiveType, typeof Target> = {
  kill: Sword,
  collect: Package,
  talk: MessageSquare,
  explore: Map,
  escort: Users,
  deliver: Gift,
};

const QUEST_TYPE_COLORS: Record<QuestType, string> = {
  main: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
  side: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  daily: "text-green-500 bg-green-500/10 border-green-500/20",
  repeatable: "text-purple-500 bg-purple-500/10 border-purple-500/20",
};

const QUEST_TEMPLATES = {
  fetch: {
    name: "Fetch Quest",
    description: "Collect items and return them to the quest giver",
    objectives: [
      { type: "collect" as ObjectiveType, description: "Collect Ancient Herbs", targetName: "Ancient Herb", targetCount: 5 },
      { type: "deliver" as ObjectiveType, description: "Return to quest giver", targetName: "Quest Giver", targetCount: 1 },
    ],
  },
  kill: {
    name: "Extermination Quest",
    description: "Defeat a number of enemies",
    objectives: [
      { type: "kill" as ObjectiveType, description: "Defeat Goblins", targetName: "Goblin", targetCount: 10 },
      { type: "talk" as ObjectiveType, description: "Report back", targetName: "Quest Giver", targetCount: 1 },
    ],
  },
  story: {
    name: "Story Quest",
    description: "Multi-stage narrative quest",
    stages: [
      { name: "Investigation", description: "Gather information" },
      { name: "Confrontation", description: "Face the antagonist" },
      { name: "Resolution", description: "Complete the story arc" },
    ],
  },
};

export function QuestDesignerWidget({ widget }: QuestDesignerWidgetProps) {
  const { updateWidget } = useWidgetStore();

  const [quests, setQuests] = useState<Quest[]>((widget.config?.quests as Quest[] | undefined) || []);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [expandedQuestIds, setExpandedQuestIds] = useState<Set<string>>(new Set());
  const [isAddingQuest, setIsAddingQuest] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "flow" | "stats">("list");

  const selectedQuest = useMemo(() => {
    return quests.find((q) => q.id === selectedQuestId);
  }, [quests, selectedQuestId]);

  const questStats = useMemo(() => {
    const totalXP = quests.reduce((sum, q) => sum + q.rewards.xp, 0);
    const totalGold = quests.reduce((sum, q) => sum + q.rewards.gold, 0);
    const completedQuests = quests.filter((q) => q.completed).length;
    const avgCompletionTime = Math.floor(
      quests.reduce((sum, q) => sum + q.objectives.length * 5, 0) / (quests.length || 1)
    );

    return {
      total: quests.length,
      completed: completedQuests,
      totalXP,
      totalGold,
      avgCompletionTime,
      byType: {
        main: quests.filter((q) => q.type === "main").length,
        side: quests.filter((q) => q.type === "side").length,
        daily: quests.filter((q) => q.type === "daily").length,
        repeatable: quests.filter((q) => q.type === "repeatable").length,
      },
    };
  }, [quests]);

  const saveQuests = (updatedQuests: Quest[]) => {
    setQuests(updatedQuests);
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        quests: updatedQuests,
      },
    });
  };

  const addQuest = (template?: keyof typeof QUEST_TEMPLATES) => {
    const newQuest: Quest = {
      id: `quest-${Date.now()}`,
      name: template ? QUEST_TEMPLATES[template].name : "New Quest",
      description: template ? QUEST_TEMPLATES[template].description : "",
      summary: "",
      type: "side",
      levelRequirement: 1,
      prerequisites: [],
      questGiver: "Unknown NPC",
      location: "Unknown Location",
      objectives: template && 'objectives' in QUEST_TEMPLATES[template]
        ? (QUEST_TEMPLATES[template] as { objectives: Array<{ type: ObjectiveType; description: string; targetName: string; targetCount: number }> }).objectives.map((obj, idx) => ({
            id: `obj-${Date.now()}-${idx}`,
            type: obj.type,
            description: obj.description,
            targetName: obj.targetName,
            targetCount: obj.targetCount,
            currentCount: 0,
            optional: false,
          }))
        : [],
      objectiveOrder: "sequential",
      rewards: {
        xp: 100,
        gold: 50,
        items: [],
        reputation: [],
        unlocks: [],
      },
      stages: template && 'stages' in QUEST_TEMPLATES[template]
        ? (QUEST_TEMPLATES[template] as { stages: Array<{ name: string; description: string }> }).stages.map((stage, idx) => ({
            id: `stage-${Date.now()}-${idx}`,
            name: stage.name,
            description: stage.description,
            objectives: [],
          }))
        : [],
      chainedQuests: [],
      completed: false,
      markerColor: "#FFD700",
    };

    const updatedQuests = [...quests, newQuest];
    saveQuests(updatedQuests);
    setSelectedQuestId(newQuest.id);
    setIsAddingQuest(false);
  };

  const updateQuest = (questId: string, updates: Partial<Quest>) => {
    const updatedQuests = quests.map((q) =>
      q.id === questId ? { ...q, ...updates } : q
    );
    saveQuests(updatedQuests);
  };

  const deleteQuest = (questId: string) => {
    const updatedQuests = quests.filter((q) => q.id !== questId);
    saveQuests(updatedQuests);
    if (selectedQuestId === questId) {
      setSelectedQuestId(null);
    }
  };

  const addObjective = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const newObjective: Objective = {
      id: `obj-${Date.now()}`,
      type: "kill",
      description: "New objective",
      targetName: "Target",
      targetCount: 1,
      currentCount: 0,
      optional: false,
    };

    updateQuest(questId, {
      objectives: [...quest.objectives, newObjective],
    });
  };

  const updateObjective = (questId: string, objectiveId: string, updates: Partial<Objective>) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const updatedObjectives = quest.objectives.map((obj) =>
      obj.id === objectiveId ? { ...obj, ...updates } : obj
    );

    updateQuest(questId, { objectives: updatedObjectives });
  };

  const deleteObjective = (questId: string, objectiveId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    updateQuest(questId, {
      objectives: quest.objectives.filter((obj) => obj.id !== objectiveId),
    });
  };

  const addStage = (questId: string) => {
    const quest = quests.find((q) => q.id === questId);
    if (!quest) return;

    const newStage: QuestStage = {
      id: `stage-${Date.now()}`,
      name: `Stage ${quest.stages.length + 1}`,
      description: "",
      objectives: [],
    };

    updateQuest(questId, {
      stages: [...quest.stages, newStage],
    });
  };

  const exportAsJSON = () => {
    const json = JSON.stringify(quests, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quests-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportAsJavaScript = () => {
    const js = `// Quest Data Export
export const quests = ${JSON.stringify(quests, null, 2)};

// Quest Helper Functions
export function getQuestById(id) {
  return quests.find(q => q.id === id);
}

export function getQuestsByType(type) {
  return quests.filter(q => q.type === type);
}

export function getAvailableQuests(playerLevel) {
  return quests.filter(q => q.levelRequirement <= playerLevel && !q.completed);
}

export function checkQuestPrerequisites(questId, completedQuestIds) {
  const quest = getQuestById(questId);
  if (!quest) return false;
  return quest.prerequisites.every(prereqId => completedQuestIds.includes(prereqId));
}
`;

    const blob = new Blob([js], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quests-${Date.now()}.js`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyQuestData = () => {
    if (selectedQuest) {
      navigator.clipboard.writeText(JSON.stringify(selectedQuest, null, 2));
    }
  };

  const toggleExpanded = (questId: string) => {
    const newExpanded = new Set(expandedQuestIds);
    if (newExpanded.has(questId)) {
      newExpanded.delete(questId);
    } else {
      newExpanded.add(questId);
    }
    setExpandedQuestIds(newExpanded);
  };

  return (
    <div className="h-full w-full @container">
      <ScrollArea className="h-full w-full">
        <div className="p-3 @xs:p-4 space-y-3 @xs:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Scroll className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-lg">Quest Designer</h3>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isAddingQuest} onOpenChange={setIsAddingQuest}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    <span className="hidden @sm:inline">New Quest</span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Quest</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Button
                      onClick={() => addQuest()}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Blank Quest
                    </Button>
                    <Button
                      onClick={() => addQuest("fetch")}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Fetch Quest Template
                    </Button>
                    <Button
                      onClick={() => addQuest("kill")}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Sword className="w-4 h-4 mr-2" />
                      Extermination Quest Template
                    </Button>
                    <Button
                      onClick={() => addQuest("story")}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <Scroll className="w-4 h-4 mr-2" />
                      Story Quest Template
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "outline"}
              onClick={() => setViewMode("list")}
              className="flex-1"
            >
              <Scroll className="w-4 h-4 mr-2" />
              List
            </Button>
            <Button
              size="sm"
              variant={viewMode === "flow" ? "default" : "outline"}
              onClick={() => setViewMode("flow")}
              className="flex-1"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Flow
            </Button>
            <Button
              size="sm"
              variant={viewMode === "stats" ? "default" : "outline"}
              onClick={() => setViewMode("stats")}
              className="flex-1"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Stats
            </Button>
          </div>

          {/* Stats View */}
          {viewMode === "stats" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 @md:grid-cols-4 gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Quests</div>
                  <div className="text-2xl font-bold text-blue-500">{questStats.total}</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Completed</div>
                  <div className="text-2xl font-bold text-green-500">{questStats.completed}</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg border border-yellow-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total XP</div>
                  <div className="text-2xl font-bold text-yellow-500">{questStats.totalXP}</div>
                </div>
                <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                  <div className="text-sm text-muted-foreground mb-1">Total Gold</div>
                  <div className="text-2xl font-bold text-orange-500">{questStats.totalGold}</div>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Quest Distribution
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Main Quests</span>
                    <Badge variant="outline" className={QUEST_TYPE_COLORS.main}>
                      {questStats.byType.main}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Side Quests</span>
                    <Badge variant="outline" className={QUEST_TYPE_COLORS.side}>
                      {questStats.byType.side}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Daily Quests</span>
                    <Badge variant="outline" className={QUEST_TYPE_COLORS.daily}>
                      {questStats.byType.daily}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Repeatable Quests</span>
                    <Badge variant="outline" className={QUEST_TYPE_COLORS.repeatable}>
                      {questStats.byType.repeatable}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Avg. Completion Time</div>
                <div className="text-xl font-bold">{questStats.avgCompletionTime} minutes</div>
              </div>

              <div className="flex gap-2">
                <Button onClick={exportAsJSON} variant="outline" className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Export JSON
                </Button>
                <Button onClick={exportAsJavaScript} variant="outline" className="flex-1 gap-2">
                  <Code2 className="w-4 h-4" />
                  Export JS
                </Button>
              </div>
            </div>
          )}

          {/* Flow View */}
          {viewMode === "flow" && (
            <div className="space-y-3">
              <div className="p-4 bg-secondary/30 rounded-lg min-h-[300px]">
                <div className="text-sm text-muted-foreground text-center mb-4">Quest Chain Flow</div>
                {quests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Scroll className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No quests yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {quests.map((quest, idx) => (
                      <motion.div
                        key={quest.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="relative"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full border-2"
                            style={{ borderColor: quest.markerColor, backgroundColor: quest.markerColor }}
                          />
                          <div className="flex-1 p-3 bg-secondary/50 rounded-lg border">
                            <div className="font-medium">{quest.name}</div>
                            <div className="text-xs text-muted-foreground">
                              Level {quest.levelRequirement} • {quest.type}
                            </div>
                          </div>
                          {quest.chainedQuests.length > 0 && (
                            <Link2 className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        {idx < quests.length - 1 && (
                          <div className="w-0.5 h-4 bg-border ml-[5px] mt-1" />
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List View */}
          {viewMode === "list" && (
            <div className="grid grid-cols-1 @lg:grid-cols-2 gap-4">
              {/* Quest List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Quests ({quests.length})</h4>
                {quests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center bg-secondary/30 rounded-lg">
                    <Scroll className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No quests yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Click &ldquo;New Quest&rdquo; to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {quests.map((quest) => (
                        <motion.div
                          key={quest.id}
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "p-3 rounded-lg border cursor-pointer transition-colors",
                            selectedQuestId === quest.id
                              ? "bg-primary/10 border-primary"
                              : "bg-secondary/30 border-border hover:bg-secondary/50"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(quest.id);
                              }}
                            >
                              {expandedQuestIds.has(quest.id) ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                            <div
                              className="flex-1"
                              onClick={() => setSelectedQuestId(quest.id)}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                {quest.completed ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                ) : (
                                  <Circle className="w-4 h-4 text-muted-foreground" />
                                )}
                                <span className="font-medium">{quest.name}</span>
                                <Badge variant="outline" className={cn("text-xs", QUEST_TYPE_COLORS[quest.type])}>
                                  {quest.type}
                                </Badge>
                              </div>
                              {expandedQuestIds.has(quest.id) && (
                                <div className="mt-2 space-y-2 text-xs">
                                  <div className="text-muted-foreground">{quest.summary || quest.description}</div>
                                  <div className="flex items-center gap-3 text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Flag className="w-3 h-3" />
                                      Level {quest.levelRequirement}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Target className="w-3 h-3" />
                                      {quest.objectives.length} objectives
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-red-500/20 hover:text-red-500"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteQuest(quest.id);
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Quest Editor */}
              <div className="space-y-3">
                {selectedQuest ? (
                  <Tabs defaultValue="details">
                    <TabsList className="grid grid-cols-3 w-full">
                      <TabsTrigger value="details" className="text-xs">
                        <Settings className="w-3 h-3 mr-1" />
                        Details
                      </TabsTrigger>
                      <TabsTrigger value="objectives" className="text-xs">
                        <Target className="w-3 h-3 mr-1" />
                        Objectives
                      </TabsTrigger>
                      <TabsTrigger value="rewards" className="text-xs">
                        <Gift className="w-3 h-3 mr-1" />
                        Rewards
                      </TabsTrigger>
                    </TabsList>

                    {/* Details Tab */}
                    <TabsContent value="details" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label>Quest Name</Label>
                        <Input
                          value={selectedQuest.name}
                          onChange={(e) => updateQuest(selectedQuest.id, { name: e.target.value })}
                          placeholder="Enter quest name"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          value={selectedQuest.description}
                          onChange={(e) => updateQuest(selectedQuest.id, { description: e.target.value })}
                          placeholder="Full quest description"
                          rows={3}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Summary (Journal Entry)</Label>
                        <Textarea
                          value={selectedQuest.summary}
                          onChange={(e) => updateQuest(selectedQuest.id, { summary: e.target.value })}
                          placeholder="Short summary for quest journal"
                          rows={2}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Type</Label>
                          <Select
                            value={selectedQuest.type}
                            onValueChange={(v: QuestType) => updateQuest(selectedQuest.id, { type: v })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="main">Main Quest</SelectItem>
                              <SelectItem value="side">Side Quest</SelectItem>
                              <SelectItem value="daily">Daily Quest</SelectItem>
                              <SelectItem value="repeatable">Repeatable</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Level Requirement</Label>
                          <Input
                            type="number"
                            value={selectedQuest.levelRequirement}
                            onChange={(e) =>
                              updateQuest(selectedQuest.id, { levelRequirement: Number(e.target.value) })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Quest Giver</Label>
                          <Input
                            value={selectedQuest.questGiver}
                            onChange={(e) => updateQuest(selectedQuest.id, { questGiver: e.target.value })}
                            placeholder="NPC name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            value={selectedQuest.location}
                            onChange={(e) => updateQuest(selectedQuest.id, { location: e.target.value })}
                            placeholder="Quest location"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Marker Color</Label>
                        <Input
                          type="color"
                          value={selectedQuest.markerColor}
                          onChange={(e) => updateQuest(selectedQuest.id, { markerColor: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateQuest(selectedQuest.id, { completed: !selectedQuest.completed })}
                          variant={selectedQuest.completed ? "default" : "outline"}
                          className="flex-1"
                        >
                          {selectedQuest.completed ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            <>
                              <Circle className="w-4 h-4 mr-2" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={copyQuestData}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </TabsContent>

                    {/* Objectives Tab */}
                    <TabsContent value="objectives" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label>Objective Order</Label>
                        <Select
                          value={selectedQuest.objectiveOrder}
                          onValueChange={(v: ObjectiveOrder) =>
                            updateQuest(selectedQuest.id, { objectiveOrder: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sequential">Sequential (in order)</SelectItem>
                            <SelectItem value="any">Any Order</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Objectives ({selectedQuest.objectives.length})</Label>
                          <Button
                            size="sm"
                            onClick={() => addObjective(selectedQuest.id)}
                            className="h-7"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {selectedQuest.objectives.map((obj, idx) => {
                            const Icon = OBJECTIVE_TYPE_ICONS[obj.type];
                            return (
                              <div
                                key={obj.id}
                                className="p-3 bg-secondary/30 rounded-lg border space-y-2"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">#{idx + 1}</span>
                                  <Select
                                    value={obj.type}
                                    onValueChange={(v: ObjectiveType) =>
                                      updateObjective(selectedQuest.id, obj.id, { type: v })
                                    }
                                  >
                                    <SelectTrigger className="h-7 text-xs">
                                      <div className="flex items-center gap-2">
                                        <Icon className="w-3 h-3" />
                                        <SelectValue />
                                      </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="kill">Kill</SelectItem>
                                      <SelectItem value="collect">Collect</SelectItem>
                                      <SelectItem value="talk">Talk</SelectItem>
                                      <SelectItem value="explore">Explore</SelectItem>
                                      <SelectItem value="escort">Escort</SelectItem>
                                      <SelectItem value="deliver">Deliver</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Badge variant={obj.optional ? "secondary" : "outline"} className="text-xs">
                                    {obj.optional ? "Optional" : "Required"}
                                  </Badge>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-auto hover:bg-red-500/20 hover:text-red-500"
                                    onClick={() => deleteObjective(selectedQuest.id, obj.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>

                                <Input
                                  value={obj.description}
                                  onChange={(e) =>
                                    updateObjective(selectedQuest.id, obj.id, { description: e.target.value })
                                  }
                                  placeholder="Objective description"
                                  className="h-8 text-xs"
                                />

                                <div className="grid grid-cols-2 gap-2">
                                  <Input
                                    value={obj.targetName}
                                    onChange={(e) =>
                                      updateObjective(selectedQuest.id, obj.id, { targetName: e.target.value })
                                    }
                                    placeholder="Target name"
                                    className="h-8 text-xs"
                                  />
                                  <Input
                                    type="number"
                                    value={obj.targetCount}
                                    onChange={(e) =>
                                      updateObjective(selectedQuest.id, obj.id, {
                                        targetCount: Number(e.target.value),
                                      })
                                    }
                                    placeholder="Count"
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {selectedQuest.objectives.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-8">
                              No objectives yet. Click &ldquo;Add&rdquo; to create one.
                            </div>
                          )}
                        </div>
                      </div>

                      {selectedQuest.objectives.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => addStage(selectedQuest.id)}
                          className="w-full"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Quest Stage
                        </Button>
                      )}
                    </TabsContent>

                    {/* Rewards Tab */}
                    <TabsContent value="rewards" className="space-y-3 mt-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            Experience
                          </Label>
                          <Input
                            type="number"
                            value={selectedQuest.rewards.xp}
                            onChange={(e) =>
                              updateQuest(selectedQuest.id, {
                                rewards: {
                                  ...selectedQuest.rewards,
                                  xp: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            Gold
                          </Label>
                          <Input
                            type="number"
                            value={selectedQuest.rewards.gold}
                            onChange={(e) =>
                              updateQuest(selectedQuest.id, {
                                rewards: {
                                  ...selectedQuest.rewards,
                                  gold: Number(e.target.value),
                                },
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Gift className="w-3 h-3 text-purple-500" />
                          Items (comma-separated)
                        </Label>
                        <Textarea
                          value={selectedQuest.rewards.items.join(", ")}
                          onChange={(e) =>
                            updateQuest(selectedQuest.id, {
                              rewards: {
                                ...selectedQuest.rewards,
                                items: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              },
                            })
                          }
                          placeholder="Health Potion, Magic Scroll, Iron Sword"
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Trophy className="w-3 h-3 text-green-500" />
                          Unlocks (comma-separated)
                        </Label>
                        <Textarea
                          value={selectedQuest.rewards.unlocks.join(", ")}
                          onChange={(e) =>
                            updateQuest(selectedQuest.id, {
                              rewards: {
                                ...selectedQuest.rewards,
                                unlocks: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                              },
                            })
                          }
                          placeholder="New Area, Skill Tree, Fast Travel Point"
                          rows={2}
                        />
                      </div>

                      {/* Reward Preview */}
                      <div className="p-3 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-lg border border-yellow-500/20">
                        <h4 className="font-semibold text-sm mb-2">Reward Preview</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            <span>{selectedQuest.rewards.xp} XP</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Coins className="w-3 h-3 text-yellow-500" />
                            <span>{selectedQuest.rewards.gold} Gold</span>
                          </div>
                          {selectedQuest.rewards.items.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Gift className="w-3 h-3 text-purple-500 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {selectedQuest.rewards.items.map((item, idx) => (
                                  <Badge key={idx} variant="secondary" className="text-xs">
                                    {item}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {selectedQuest.rewards.unlocks.length > 0 && (
                            <div className="flex items-start gap-2">
                              <Trophy className="w-3 h-3 text-green-500 mt-0.5" />
                              <div className="flex flex-wrap gap-1">
                                {selectedQuest.rewards.unlocks.map((unlock, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {unlock}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <Eye className="w-12 h-12 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">Select a quest to edit</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
