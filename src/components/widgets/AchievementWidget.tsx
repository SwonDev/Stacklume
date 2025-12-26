"use client";

import { useState, useCallback, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy,
  Star,
  Medal,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  Sparkles,
  Target,
  Eye,
  EyeOff,
  Settings,
  BarChart3,
  FileJson,
  FileCode,
  Check,
  Crown,
  Coins,
  Sword,
  Map,
  BookOpen,
  Package,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AchievementWidgetProps {
  widget: Widget;
}

type RarityTier = "bronze" | "silver" | "gold" | "platinum";
type AchievementCategory = "story" | "combat" | "exploration" | "collection" | "secrets" | "mastery" | "challenges" | "social" | "misc";
type SortOption = "points" | "rarity" | "category" | "completion" | "name";

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  points: number;
  rarity: RarityTier;
  category: AchievementCategory;
  isHidden: boolean;
  unlockCondition: string;
  currentProgress: number;
  targetProgress: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  dependsOn?: string[]; // Achievement chains
}

interface AchievementConfig {
  achievements?: Achievement[];
  categories?: string[];
  achievementSortBy?: SortOption;
  showHidden?: boolean;
  showUnlockedOnly?: boolean;
  notificationStyle?: "modern" | "classic" | "minimal";
  [key: string]: unknown;
}

const RARITY_CONFIG: Record<RarityTier, { label: string; bg: string; text: string; border: string; points: number }> = {
  bronze: { label: "Bronze", bg: "bg-amber-900/20", text: "text-amber-600", border: "border-amber-700/40", points: 10 },
  silver: { label: "Silver", bg: "bg-zinc-700/20", text: "text-zinc-300", border: "border-zinc-600/40", points: 25 },
  gold: { label: "Gold", bg: "bg-yellow-600/20", text: "text-yellow-500", border: "border-yellow-600/40", points: 50 },
  platinum: { label: "Platinum", bg: "bg-cyan-600/20", text: "text-cyan-400", border: "border-cyan-600/40", points: 100 },
};

const CATEGORY_CONFIG: Record<AchievementCategory, { label: string; icon: typeof Sword; color: string }> = {
  story: { label: "Story", icon: BookOpen, color: "text-purple-500" },
  combat: { label: "Combat", icon: Sword, color: "text-red-500" },
  exploration: { label: "Exploration", icon: Map, color: "text-green-500" },
  collection: { label: "Collection", icon: Package, color: "text-blue-500" },
  secrets: { label: "Secrets", icon: Eye, color: "text-indigo-500" },
  mastery: { label: "Mastery", icon: Crown, color: "text-yellow-500" },
  challenges: { label: "Challenges", icon: Target, color: "text-orange-500" },
  social: { label: "Social", icon: Star, color: "text-pink-500" },
  misc: { label: "Misc", icon: Sparkles, color: "text-gray-500" },
};

const EMOJI_PRESETS = [
  "🏆", "⭐", "🎖️", "🏅", "👑", "💎", "⚔️", "🛡️", "🎯", "🔥",
  "💪", "🧠", "👁️", "🗡️", "🏰", "🗺️", "📚", "🎮", "🎨", "🎭",
  "🎪", "🎸", "🎺", "🎻", "🎼", "🎵", "🎶", "🎤", "🎧", "📻",
  "🔔", "🔑", "🔒", "🔓", "⚡", "💫", "✨", "🌟", "💥", "🔮",
];

const PRESET_TEMPLATES = {
  platformer: {
    name: "Platformer Game",
    achievements: [
      { name: "First Steps", description: "Complete the tutorial", category: "story", rarity: "bronze", points: 10, icon: "👣", target: 1 },
      { name: "Jump Master", description: "Perform 1000 jumps", category: "mastery", rarity: "silver", points: 25, icon: "🦘", target: 1000 },
      { name: "Coin Collector", description: "Collect 500 coins", category: "collection", rarity: "bronze", points: 10, icon: "🪙", target: 500 },
      { name: "Speed Runner", description: "Beat level in under 60 seconds", category: "challenges", rarity: "gold", points: 50, icon: "⚡", target: 1 },
      { name: "100% Completion", description: "Find all secrets and collectibles", category: "mastery", rarity: "platinum", points: 100, icon: "💯", target: 1 },
    ]
  },
  rpg: {
    name: "RPG Game",
    achievements: [
      { name: "Adventurer", description: "Reach level 10", category: "story", rarity: "bronze", points: 10, icon: "🗡️", target: 10 },
      { name: "Dragon Slayer", description: "Defeat the dragon boss", category: "combat", rarity: "gold", points: 50, icon: "🐉", target: 1 },
      { name: "Treasure Hunter", description: "Open 100 chests", category: "exploration", rarity: "silver", points: 25, icon: "📦", target: 100 },
      { name: "Master Craftsman", description: "Craft legendary equipment", category: "collection", rarity: "platinum", points: 100, icon: "⚒️", target: 1 },
      { name: "Secret Society", description: "Find the hidden guild", category: "secrets", rarity: "gold", points: 50, icon: "🔮", target: 1 },
    ]
  },
  puzzle: {
    name: "Puzzle Game",
    achievements: [
      { name: "Puzzle Novice", description: "Complete 10 puzzles", category: "story", rarity: "bronze", points: 10, icon: "🧩", target: 10 },
      { name: "3-Star Master", description: "Get 3 stars on 50 levels", category: "mastery", rarity: "gold", points: 50, icon: "⭐", target: 50 },
      { name: "Time Attack", description: "Complete puzzle in 30 seconds", category: "challenges", rarity: "silver", points: 25, icon: "⏱️", target: 1 },
      { name: "Perfect Game", description: "Complete without hints", category: "mastery", rarity: "platinum", points: 100, icon: "💎", target: 1 },
      { name: "Hint Free", description: "Complete 100 puzzles without hints", category: "challenges", rarity: "gold", points: 50, icon: "🧠", target: 100 },
    ]
  },
};

export function AchievementWidget({ widget }: AchievementWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops
  const config = (widget.config || {}) as AchievementConfig;

  // Use lazy state initialization to avoid effects
  const [achievements, setAchievements] = useState<Achievement[]>(
    () => config.achievements || []
  );
  const [sortBy, setSortBy] = useState<SortOption>(config.achievementSortBy || "points");
  const [showHidden] = useState(config.showHidden ?? true);
  const [showUnlockedOnly] = useState(config.showUnlockedOnly ?? false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | "all">("all");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showNotificationPreview, setShowNotificationPreview] = useState(false);
  const [previewAchievement, setPreviewAchievement] = useState<Achievement | null>(null);

  // Form state
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "🏆",
    points: 10,
    rarity: "bronze" as RarityTier,
    category: "story" as AchievementCategory,
    isHidden: false,
    unlockCondition: "",
    targetProgress: 1,
  });

  // Save to config
  const saveConfig = useCallback((newAchievements: Achievement[]) => {
    useWidgetStore.getState().updateWidget(widget.id, {
      config: {
        ...widget.config,
        achievements: newAchievements,
        achievementSortBy: sortBy,
        showHidden,
        showUnlockedOnly,
      } as AchievementConfig,
    });
  }, [widget.id, widget.config, sortBy, showHidden, showUnlockedOnly]);

  // Reset form - defined before functions that use it
  const resetForm = useCallback(() => {
    setFormData({
      name: "",
      description: "",
      icon: "🏆",
      points: 10,
      rarity: "bronze",
      category: "story",
      isHidden: false,
      unlockCondition: "",
      targetProgress: 1,
    });
  }, []);

  // Add achievement
  const addAchievement = useCallback(() => {
    const newAchievement: Achievement = {
      id: Date.now().toString(),
      name: formData.name,
      description: formData.description,
      icon: formData.icon,
      points: formData.points,
      rarity: formData.rarity,
      category: formData.category,
      isHidden: formData.isHidden,
      unlockCondition: formData.unlockCondition,
      currentProgress: 0,
      targetProgress: formData.targetProgress,
      isUnlocked: false,
    };

    const updated = [...achievements, newAchievement];
    setAchievements(updated);
    saveConfig(updated);
    setShowAddModal(false);
    resetForm();
    toast.success("Achievement added");
  }, [formData, achievements, saveConfig, resetForm]);

  // Edit achievement
  const updateAchievement = useCallback(() => {
    if (!editingAchievement) return;

    const updated = achievements.map(a =>
      a.id === editingAchievement.id
        ? { ...a, ...formData }
        : a
    );
    setAchievements(updated);
    saveConfig(updated);
    setShowEditModal(false);
    setEditingAchievement(null);
    resetForm();
    toast.success("Achievement updated");
  }, [editingAchievement, formData, achievements, saveConfig, resetForm]);

  // Delete achievement
  const deleteAchievement = useCallback((id: string) => {
    const updated = achievements.filter(a => a.id !== id);
    setAchievements(updated);
    saveConfig(updated);
    toast.success("Achievement deleted");
  }, [achievements, saveConfig]);

  // Toggle unlock
  const toggleUnlock = useCallback((id: string) => {
    const updated = achievements.map(a => {
      if (a.id === id) {
        const isUnlocking = !a.isUnlocked;
        const achievement = {
          ...a,
          isUnlocked: isUnlocking,
          currentProgress: isUnlocking ? a.targetProgress : 0,
          unlockedAt: isUnlocking ? new Date().toISOString() : undefined,
        };

        if (isUnlocking) {
          setPreviewAchievement(achievement);
          setShowNotificationPreview(true);
        }

        return achievement;
      }
      return a;
    });
    setAchievements(updated);
    saveConfig(updated);
  }, [achievements, saveConfig]);

  // Update progress
  const updateProgress = useCallback((id: string, progress: number) => {
    const updated = achievements.map(a => {
      if (a.id === id) {
        const newProgress = Math.min(progress, a.targetProgress);
        const shouldUnlock = newProgress >= a.targetProgress && !a.isUnlocked;

        const achievement = {
          ...a,
          currentProgress: newProgress,
          isUnlocked: shouldUnlock || a.isUnlocked,
          unlockedAt: shouldUnlock ? new Date().toISOString() : a.unlockedAt,
        };

        if (shouldUnlock) {
          setPreviewAchievement(achievement);
          setShowNotificationPreview(true);
        }

        return achievement;
      }
      return a;
    });
    setAchievements(updated);
    saveConfig(updated);
  }, [achievements, saveConfig]);

  // Open edit modal
  const openEditModal = useCallback((achievement: Achievement) => {
    setEditingAchievement(achievement);
    setFormData({
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      points: achievement.points,
      rarity: achievement.rarity,
      category: achievement.category,
      isHidden: achievement.isHidden,
      unlockCondition: achievement.unlockCondition,
      targetProgress: achievement.targetProgress,
    });
    setShowEditModal(true);
  }, []);

  // Load template
  const loadTemplate = useCallback((templateKey: keyof typeof PRESET_TEMPLATES) => {
    const template = PRESET_TEMPLATES[templateKey];
    const newAchievements: Achievement[] = template.achievements.map((a, idx) => ({
      id: `${Date.now()}-${idx}`,
      name: a.name,
      description: a.description,
      icon: a.icon,
      points: a.points,
      rarity: a.rarity as RarityTier,
      category: a.category as AchievementCategory,
      isHidden: false,
      unlockCondition: a.description,
      currentProgress: 0,
      targetProgress: a.target,
      isUnlocked: false,
    }));

    setAchievements(newAchievements);
    saveConfig(newAchievements);
    setShowTemplateModal(false);
    toast.success(`Loaded ${template.name} template`);
  }, [saveConfig]);

  // Export functions
  const exportJSON = useCallback(() => {
    const dataStr = JSON.stringify(achievements, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "achievements.json";
    link.click();
    toast.success("Exported as JSON");
  }, [achievements]);

  const exportJavaScript = useCallback(() => {
    const jsCode = `const achievements = ${JSON.stringify(achievements, null, 2)};

// Achievement system helper functions
function checkAchievement(achievementId, currentValue) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return false;

  return currentValue >= achievement.targetProgress;
}

function unlockAchievement(achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (achievement && !achievement.isUnlocked) {
    achievement.isUnlocked = true;
    achievement.unlockedAt = new Date().toISOString();
    achievement.currentProgress = achievement.targetProgress;
    return true;
  }
  return false;
}

function getAchievementProgress(achievementId) {
  const achievement = achievements.find(a => a.id === achievementId);
  if (!achievement) return 0;

  return (achievement.currentProgress / achievement.targetProgress) * 100;
}

export { achievements, checkAchievement, unlockAchievement, getAchievementProgress };
`;
    const dataBlob = new Blob([jsCode], { type: "text/javascript" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "achievements.js";
    link.click();
    toast.success("Exported as JavaScript");
  }, [achievements]);

  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(JSON.stringify(achievements, null, 2));
    toast.success("Copied to clipboard");
  }, [achievements]);

  // Filtered and sorted achievements
  const filteredAchievements = useMemo(() => {
    let filtered = achievements;

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    // Hidden filter
    if (!showHidden) {
      filtered = filtered.filter(a => !a.isHidden || a.isUnlocked);
    }

    // Unlocked filter
    if (showUnlockedOnly) {
      filtered = filtered.filter(a => a.isUnlocked);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "points":
          return b.points - a.points;
        case "rarity":
          return RARITY_CONFIG[b.rarity].points - RARITY_CONFIG[a.rarity].points;
        case "category":
          return a.category.localeCompare(b.category);
        case "completion":
          return (b.currentProgress / b.targetProgress) - (a.currentProgress / a.targetProgress);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [achievements, searchQuery, selectedCategory, showHidden, showUnlockedOnly, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.isUnlocked).length;
    const totalPoints = achievements.reduce((sum, a) => sum + a.points, 0);
    const earnedPoints = achievements.filter(a => a.isUnlocked).reduce((sum, a) => sum + a.points, 0);
    const completion = total > 0 ? (unlocked / total) * 100 : 0;

    const byCategory = achievements.reduce((acc, a) => {
      if (!acc[a.category]) {
        acc[a.category] = { total: 0, unlocked: 0 };
      }
      acc[a.category].total++;
      if (a.isUnlocked) acc[a.category].unlocked++;
      return acc;
    }, {} as Record<string, { total: number; unlocked: number }>);

    const byRarity = achievements.reduce((acc, a) => {
      if (!acc[a.rarity]) {
        acc[a.rarity] = { total: 0, unlocked: 0 };
      }
      acc[a.rarity].total++;
      if (a.isUnlocked) acc[a.rarity].unlocked++;
      return acc;
    }, {} as Record<string, { total: number; unlocked: number }>);

    return {
      total,
      unlocked,
      totalPoints,
      earnedPoints,
      completion,
      byCategory,
      byRarity,
    };
  }, [achievements]);

  return (
    <div className="@container size-full">
      <div className="flex h-full flex-col gap-3 p-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-yellow-500" />
            <div>
              <div className="text-sm font-medium">Achievements</div>
              <div className="text-xs text-muted-foreground">
                {stats.unlocked}/{stats.total} ({stats.completion.toFixed(0)}%)
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowStatsModal(true)}>
              <BarChart3 className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowTemplateModal(true)}>
              <Sparkles className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowAddModal(true)}>
              <Plus className="size-4" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress value={stats.completion} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{stats.earnedPoints} / {stats.totalPoints} G</span>
            <span>{stats.unlocked} / {stats.total}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[120px]">
            <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-8 text-xs"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-1/2 size-8 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="size-3" />
              </Button>
            )}
          </div>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as AchievementCategory | "all")}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="h-8 w-[100px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="points">Points</SelectItem>
              <SelectItem value="rarity">Rarity</SelectItem>
              <SelectItem value="category">Category</SelectItem>
              <SelectItem value="completion">Progress</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Achievement List */}
        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="space-y-2 pb-2">
            <AnimatePresence mode="popLayout">
              {filteredAchievements.map((achievement) => {
                const rarityConfig = RARITY_CONFIG[achievement.rarity];
                const categoryConfig = CATEGORY_CONFIG[achievement.category];
                const Icon = categoryConfig.icon;
                const progressPercent = (achievement.currentProgress / achievement.targetProgress) * 100;
                const canView = !achievement.isHidden || achievement.isUnlocked;

                return (
                  <motion.div
                    key={achievement.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "group relative rounded-lg border p-3 transition-all hover:shadow-md @container",
                      rarityConfig.bg,
                      rarityConfig.border,
                      achievement.isUnlocked && "ring-2 ring-yellow-500/20"
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Icon */}
                      <div className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-lg border text-2xl",
                        achievement.isUnlocked ? "bg-background/50" : "bg-background/20 opacity-60"
                      )}>
                        {canView ? achievement.icon : <Lock className="size-5 text-muted-foreground" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={cn(
                                "text-sm font-semibold truncate",
                                !canView && "blur-sm select-none"
                              )}>
                                {canView ? achievement.name : "Hidden Achievement"}
                              </h4>
                              {achievement.isUnlocked && <Check className="size-3.5 text-green-500" />}
                              {achievement.isHidden && <EyeOff className="size-3 text-muted-foreground" />}
                            </div>
                            <p className={cn(
                              "text-xs text-muted-foreground mt-0.5 line-clamp-2",
                              !canView && "blur-sm select-none"
                            )}>
                              {canView ? achievement.description : "Complete certain actions to reveal this achievement"}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => openEditModal(achievement)}
                            >
                              <Settings className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => deleteAchievement(achievement.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Meta info */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="outline" className={cn("gap-1", rarityConfig.text)}>
                            <Medal className="size-3" />
                            {rarityConfig.label}
                          </Badge>
                          <Badge variant="outline" className={cn("gap-1", categoryConfig.color)}>
                            <Icon className="size-3" />
                            {categoryConfig.label}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Coins className="size-3" />
                            {achievement.points}G
                          </Badge>
                          {achievement.targetProgress > 1 && canView && (
                            <Badge variant="outline" className="gap-1">
                              <Target className="size-3" />
                              {achievement.currentProgress}/{achievement.targetProgress}
                            </Badge>
                          )}
                        </div>

                        {/* Progress bar for tracked achievements */}
                        {achievement.targetProgress > 1 && canView && (
                          <div className="mt-2 space-y-1">
                            <Progress value={progressPercent} className="h-1.5" />
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>{progressPercent.toFixed(0)}% complete</span>
                              {!achievement.isUnlocked && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2 text-[10px]"
                                  onClick={() => updateProgress(achievement.id, achievement.currentProgress + 1)}
                                >
                                  +1
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Unlock button */}
                        {canView && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 h-7 w-full text-xs"
                            onClick={() => toggleUnlock(achievement.id)}
                          >
                            {achievement.isUnlocked ? (
                              <>
                                <Unlock className="size-3 mr-1" />
                                Unlocked
                              </>
                            ) : (
                              <>
                                <Lock className="size-3 mr-1" />
                                Locked
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredAchievements.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Trophy className="size-12 text-muted-foreground/20 mb-3" />
                <p className="text-sm text-muted-foreground">No achievements found</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowAddModal(true)}>
                  <Plus className="size-4 mr-1" />
                  Add Achievement
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exportJSON}>
            <FileJson className="size-3 mr-1" />
            JSON
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={exportJavaScript}>
            <FileCode className="size-3 mr-1" />
            JS
          </Button>
          <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={copyToClipboard}>
            <Copy className="size-3 mr-1" />
            Copy
          </Button>
        </div>
      </div>

      {/* Add/Edit Achievement Modal */}
      <Dialog open={showAddModal || showEditModal} onOpenChange={(open) => {
        if (!open) {
          setShowAddModal(false);
          setShowEditModal(false);
          setEditingAchievement(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>{editingAchievement ? "Edit" : "Add"} Achievement</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Icon</Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="size-12 text-2xl p-0"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  {formData.icon}
                </Button>
                {showEmojiPicker && (
                  <div className="flex-1 grid grid-cols-8 gap-1 p-2 border rounded-lg max-h-32 overflow-y-auto">
                    {EMOJI_PRESETS.map((emoji) => (
                      <button
                        key={emoji}
                        className="size-8 hover:bg-accent rounded transition-colors text-lg"
                        onClick={() => {
                          setFormData({ ...formData, icon: emoji });
                          setShowEmojiPicker(false);
                        }}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Achievement name"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="How to unlock this achievement"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Rarity</Label>
                <Select value={formData.rarity} onValueChange={(v) => setFormData({ ...formData, rarity: v as RarityTier })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(RARITY_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as AchievementCategory })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_CONFIG).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div className="space-y-2">
                <Label>Progress Target</Label>
                <Input
                  type="number"
                  value={formData.targetProgress}
                  onChange={(e) => setFormData({ ...formData, targetProgress: parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Unlock Condition</Label>
              <Input
                value={formData.unlockCondition}
                onChange={(e) => setFormData({ ...formData, unlockCondition: e.target.value })}
                placeholder="e.g., Complete level 10"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Hidden Achievement</Label>
              <Switch
                checked={formData.isHidden}
                onCheckedChange={(checked) => setFormData({ ...formData, isHidden: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddModal(false);
              setShowEditModal(false);
              setEditingAchievement(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={editingAchievement ? updateAchievement : addAchievement}>
              {editingAchievement ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Modal */}
      <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Load Template</DialogTitle>
            <DialogDescription>
              Choose a preset template to get started quickly
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {Object.entries(PRESET_TEMPLATES).map(([key, template]) => (
              <Button
                key={key}
                variant="outline"
                className="w-full justify-between h-auto p-4"
                onClick={() => loadTemplate(key as keyof typeof PRESET_TEMPLATES)}
              >
                <div className="text-left">
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {template.achievements.length} achievements
                  </div>
                </div>
                <ChevronRight className="size-4" />
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Modal */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Achievement Statistics</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{stats.unlocked}/{stats.total}</div>
                <div className="text-xs text-muted-foreground">Achievements</div>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <div className="text-2xl font-bold">{stats.earnedPoints}/{stats.totalPoints}</div>
                <div className="text-xs text-muted-foreground">Gamerscore</div>
              </div>
            </div>

            {/* By Rarity */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">By Rarity</h4>
              {Object.entries(stats.byRarity).map(([rarity, data]) => {
                const config = RARITY_CONFIG[rarity as RarityTier];
                return (
                  <div key={rarity} className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={config.text}>
                      {config.label}
                    </Badge>
                    <div className="flex-1">
                      <Progress value={(data.unlocked / data.total) * 100} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {data.unlocked}/{data.total}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* By Category */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold">By Category</h4>
              {Object.entries(stats.byCategory).map(([category, data]) => {
                const config = CATEGORY_CONFIG[category as AchievementCategory];
                const Icon = config.icon;
                return (
                  <div key={category} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-4", config.color)} />
                      <span className="text-xs">{config.label}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={(data.unlocked / data.total) * 100} className="h-2" />
                    </div>
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {data.unlocked}/{data.total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Achievement Unlocked Notification Preview */}
      <AnimatePresence>
        {showNotificationPreview && previewAchievement && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-96"
          >
            <div className="rounded-lg border-2 border-yellow-500/50 bg-background/95 backdrop-blur-sm p-4 shadow-2xl">
              <div className="flex items-start gap-3">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-yellow-500/20 text-3xl border-2 border-yellow-500/30">
                  {previewAchievement.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Trophy className="size-4 text-yellow-500" />
                    <span className="text-xs font-semibold text-yellow-500">ACHIEVEMENT UNLOCKED</span>
                  </div>
                  <h4 className="font-bold">{previewAchievement.name}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">{previewAchievement.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className={RARITY_CONFIG[previewAchievement.rarity].text}>
                      {RARITY_CONFIG[previewAchievement.rarity].label}
                    </Badge>
                    <Badge variant="outline">
                      <Coins className="size-3 mr-1" />
                      {previewAchievement.points}G
                    </Badge>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-3"
                onClick={() => setShowNotificationPreview(false)}
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
