"use client";

import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  GitBranch,
  Copy,
  Star,
  Search,
  ChevronDown,
  ChevronRight,
  Terminal,
  Check,
  RotateCcw,
  Archive,
  History,
  GitMerge,
  GitPullRequest,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface GitCommandsWidgetProps {
  widget: Widget;
}

interface GitCommand {
  id: string;
  command: string;
  description: string;
  category: string;
  flags?: { flag: string; description: string }[];
  examples?: string[];
  isFavorite?: boolean;
  isCustom?: boolean;
}

const DEFAULT_COMMANDS: GitCommand[] = [
  // Basics
  {
    id: "init",
    command: "git init",
    description: "Initialize a new Git repository",
    category: "basics",
    examples: ["git init", "git init my-project"],
  },
  {
    id: "clone",
    command: "git clone <url>",
    description: "Clone a repository into a new directory",
    category: "basics",
    flags: [
      { flag: "--depth <n>", description: "Create a shallow clone with n commits" },
      { flag: "--branch <name>", description: "Clone a specific branch" },
    ],
    examples: [
      "git clone https://github.com/user/repo.git",
      "git clone --depth 1 https://github.com/user/repo.git",
    ],
  },
  {
    id: "status",
    command: "git status",
    description: "Show the working tree status",
    category: "basics",
    flags: [
      { flag: "-s", description: "Short format" },
      { flag: "-b", description: "Show branch info" },
    ],
    examples: ["git status", "git status -s"],
  },
  {
    id: "add",
    command: "git add <file>",
    description: "Add file contents to the index",
    category: "basics",
    flags: [
      { flag: ".", description: "Add all changes" },
      { flag: "-p", description: "Interactive patch mode" },
      { flag: "-A", description: "Add all changes including deletions" },
    ],
    examples: ["git add .", "git add src/", "git add -p"],
  },
  {
    id: "commit",
    command: "git commit -m '<message>'",
    description: "Record changes to the repository",
    category: "basics",
    flags: [
      { flag: "-m", description: "Commit message" },
      { flag: "-a", description: "Automatically stage modified files" },
      { flag: "--amend", description: "Amend the previous commit" },
    ],
    examples: [
      'git commit -m "Add new feature"',
      "git commit -am 'Fix bug'",
      "git commit --amend",
    ],
  },

  // Branching
  {
    id: "branch",
    command: "git branch",
    description: "List, create, or delete branches",
    category: "branching",
    flags: [
      { flag: "-a", description: "List all branches" },
      { flag: "-d <name>", description: "Delete branch" },
      { flag: "-m <old> <new>", description: "Rename branch" },
    ],
    examples: [
      "git branch",
      "git branch feature-x",
      "git branch -d old-branch",
    ],
  },
  {
    id: "checkout",
    command: "git checkout <branch>",
    description: "Switch branches or restore files",
    category: "branching",
    flags: [
      { flag: "-b <name>", description: "Create and switch to new branch" },
      { flag: "--", description: "Restore file from HEAD" },
    ],
    examples: [
      "git checkout main",
      "git checkout -b feature-x",
      "git checkout -- file.txt",
    ],
  },
  {
    id: "switch",
    command: "git switch <branch>",
    description: "Switch branches (modern alternative to checkout)",
    category: "branching",
    flags: [
      { flag: "-c <name>", description: "Create and switch to new branch" },
    ],
    examples: ["git switch main", "git switch -c feature-x"],
  },
  {
    id: "merge",
    command: "git merge <branch>",
    description: "Join two or more development histories",
    category: "branching",
    flags: [
      { flag: "--no-ff", description: "Create merge commit even if fast-forward" },
      { flag: "--squash", description: "Squash commits into one" },
    ],
    examples: ["git merge feature-x", "git merge --no-ff develop"],
  },
  {
    id: "rebase",
    command: "git rebase <branch>",
    description: "Reapply commits on top of another base",
    category: "branching",
    flags: [
      { flag: "-i", description: "Interactive rebase" },
      { flag: "--continue", description: "Continue after resolving conflicts" },
      { flag: "--abort", description: "Abort rebase" },
    ],
    examples: ["git rebase main", "git rebase -i HEAD~3"],
  },

  // Remote
  {
    id: "remote",
    command: "git remote",
    description: "Manage set of tracked repositories",
    category: "remote",
    flags: [
      { flag: "-v", description: "Show URLs" },
      { flag: "add <name> <url>", description: "Add remote" },
      { flag: "remove <name>", description: "Remove remote" },
    ],
    examples: [
      "git remote -v",
      "git remote add origin https://github.com/user/repo.git",
    ],
  },
  {
    id: "fetch",
    command: "git fetch",
    description: "Download objects and refs from remote",
    category: "remote",
    flags: [
      { flag: "--all", description: "Fetch all remotes" },
      { flag: "--prune", description: "Remove deleted branches" },
    ],
    examples: ["git fetch", "git fetch --all --prune"],
  },
  {
    id: "pull",
    command: "git pull",
    description: "Fetch and integrate with local branch",
    category: "remote",
    flags: [
      { flag: "--rebase", description: "Rebase instead of merge" },
      { flag: "--no-rebase", description: "Merge (default)" },
    ],
    examples: ["git pull", "git pull --rebase origin main"],
  },
  {
    id: "push",
    command: "git push",
    description: "Update remote refs along with associated objects",
    category: "remote",
    flags: [
      { flag: "-u <remote> <branch>", description: "Set upstream" },
      { flag: "--force", description: "Force push (dangerous!)" },
      { flag: "--force-with-lease", description: "Safer force push" },
    ],
    examples: [
      "git push",
      "git push -u origin main",
      "git push --force-with-lease",
    ],
  },

  // History
  {
    id: "log",
    command: "git log",
    description: "Show commit logs",
    category: "history",
    flags: [
      { flag: "--oneline", description: "Compact one-line format" },
      { flag: "--graph", description: "Show branch graph" },
      { flag: "-n <num>", description: "Limit to n commits" },
      { flag: "--author=<name>", description: "Filter by author" },
    ],
    examples: [
      "git log --oneline --graph",
      "git log -n 10",
      "git log --author='John'",
    ],
  },
  {
    id: "diff",
    command: "git diff",
    description: "Show changes between commits, working tree, etc.",
    category: "history",
    flags: [
      { flag: "--staged", description: "Show staged changes" },
      { flag: "<commit>", description: "Compare with commit" },
    ],
    examples: ["git diff", "git diff --staged", "git diff HEAD~1"],
  },
  {
    id: "show",
    command: "git show <commit>",
    description: "Show various types of objects",
    category: "history",
    examples: ["git show HEAD", "git show abc123"],
  },
  {
    id: "blame",
    command: "git blame <file>",
    description: "Show who last modified each line",
    category: "history",
    flags: [
      { flag: "-L <start>,<end>", description: "Show specific lines" },
    ],
    examples: ["git blame README.md", "git blame -L 10,20 src/app.ts"],
  },

  // Undo
  {
    id: "reset",
    command: "git reset",
    description: "Reset current HEAD to specified state",
    category: "undo",
    flags: [
      { flag: "--soft <commit>", description: "Keep changes staged" },
      { flag: "--mixed <commit>", description: "Keep changes unstaged (default)" },
      { flag: "--hard <commit>", description: "Discard all changes" },
    ],
    examples: [
      "git reset HEAD~1",
      "git reset --soft HEAD~1",
      "git reset --hard origin/main",
    ],
  },
  {
    id: "revert",
    command: "git revert <commit>",
    description: "Create new commit that undoes changes",
    category: "undo",
    flags: [
      { flag: "--no-commit", description: "Don't auto-commit" },
    ],
    examples: ["git revert HEAD", "git revert abc123"],
  },
  {
    id: "restore",
    command: "git restore <file>",
    description: "Restore working tree files",
    category: "undo",
    flags: [
      { flag: "--staged", description: "Unstage file" },
      { flag: "--source=<commit>", description: "Restore from commit" },
    ],
    examples: [
      "git restore file.txt",
      "git restore --staged file.txt",
    ],
  },
  {
    id: "clean",
    command: "git clean",
    description: "Remove untracked files",
    category: "undo",
    flags: [
      { flag: "-n", description: "Dry run (show what would be deleted)" },
      { flag: "-f", description: "Force deletion" },
      { flag: "-d", description: "Remove directories" },
    ],
    examples: ["git clean -n", "git clean -fd"],
  },

  // Stash
  {
    id: "stash",
    command: "git stash",
    description: "Stash changes in a dirty working directory",
    category: "stash",
    flags: [
      { flag: "push -m '<msg>'", description: "Stash with message" },
      { flag: "-u", description: "Include untracked files" },
    ],
    examples: ["git stash", "git stash push -m 'WIP: feature'"],
  },
  {
    id: "stash-pop",
    command: "git stash pop",
    description: "Apply stashed changes and remove from stash",
    category: "stash",
    examples: ["git stash pop", "git stash pop stash@{1}"],
  },
  {
    id: "stash-list",
    command: "git stash list",
    description: "List all stashed changes",
    category: "stash",
    examples: ["git stash list"],
  },
  {
    id: "stash-drop",
    command: "git stash drop",
    description: "Remove a stash entry",
    category: "stash",
    examples: ["git stash drop", "git stash drop stash@{1}"],
  },

  // Advanced
  {
    id: "cherry-pick",
    command: "git cherry-pick <commit>",
    description: "Apply changes from specific commits",
    category: "advanced",
    flags: [
      { flag: "--no-commit", description: "Don't auto-commit" },
    ],
    examples: ["git cherry-pick abc123", "git cherry-pick abc123..def456"],
  },
  {
    id: "bisect",
    command: "git bisect",
    description: "Binary search to find bug-introducing commit",
    category: "advanced",
    flags: [
      { flag: "start", description: "Start bisecting" },
      { flag: "good <commit>", description: "Mark commit as good" },
      { flag: "bad <commit>", description: "Mark commit as bad" },
      { flag: "reset", description: "End bisecting" },
    ],
    examples: [
      "git bisect start",
      "git bisect bad HEAD",
      "git bisect good abc123",
    ],
  },
  {
    id: "reflog",
    command: "git reflog",
    description: "Show reference logs (including deleted commits)",
    category: "advanced",
    examples: ["git reflog", "git reflog show HEAD@{5}"],
  },
  {
    id: "tag",
    command: "git tag <name>",
    description: "Create, list, or delete tags",
    category: "advanced",
    flags: [
      { flag: "-a <name>", description: "Create annotated tag" },
      { flag: "-d <name>", description: "Delete tag" },
      { flag: "-l", description: "List tags" },
    ],
    examples: [
      "git tag v1.0.0",
      "git tag -a v1.0.0 -m 'Release 1.0'",
    ],
  },
];

const CATEGORIES = [
  { id: "all", label: "All", icon: Terminal },
  { id: "basics", label: "Basics", icon: GitBranch },
  { id: "branching", label: "Branching", icon: GitMerge },
  { id: "remote", label: "Remote", icon: GitPullRequest },
  { id: "history", label: "History", icon: History },
  { id: "undo", label: "Undo", icon: RotateCcw },
  { id: "stash", label: "Stash", icon: Archive },
  { id: "advanced", label: "Advanced", icon: Star },
];

export function GitCommandsWidget({ widget }: GitCommandsWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);

  const [commands, setCommands] = useState<GitCommand[]>(
    (widget.config?.commands as unknown as GitCommand[]) || DEFAULT_COMMANDS
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCommand, setExpandedCommand] = useState<string | null>(null);
  const [showDescriptions, setShowDescriptions] = useState(
    widget.config?.showDescriptions ?? true
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [recentCommands, setRecentCommands] = useState<string[]>(
    widget.config?.recentCommands || []
  );

  // Filter and sort commands
  const filteredCommands = useMemo(() => {
    let filtered = commands;

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((cmd) => cmd.category === selectedCategory);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (cmd) =>
          cmd.command.toLowerCase().includes(query) ||
          cmd.description.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then recent, then alphabetical
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;

      const aRecent = recentCommands.includes(a.id);
      const bRecent = recentCommands.includes(b.id);
      if (aRecent && !bRecent) return -1;
      if (!aRecent && bRecent) return 1;

      return a.command.localeCompare(b.command);
    });
  }, [commands, selectedCategory, searchQuery, recentCommands]);

  const favoriteCommands = useMemo(
    () => commands.filter((cmd) => cmd.isFavorite),
    [commands]
  );

  const handleCopyCommand = (command: GitCommand) => {
    navigator.clipboard.writeText(command.command);
    setCopiedId(command.id);
    setTimeout(() => setCopiedId(null), 2000);

    // Add to recent commands
    const updated = [
      command.id,
      ...recentCommands.filter((id) => id !== command.id),
    ].slice(0, 5);
    setRecentCommands(updated);
    updateWidget(widget.id, {
      config: { ...widget.config, recentCommands: updated },
    });
  };

  const handleToggleFavorite = (commandId: string) => {
    const updated = commands.map((cmd) =>
      cmd.id === commandId ? { ...cmd, isFavorite: !cmd.isFavorite } : cmd
    );
    setCommands(updated);
    updateWidget(widget.id, { config: { ...widget.config, commands: updated } });
  };

  const handleToggleExpand = (commandId: string) => {
    setExpandedCommand(expandedCommand === commandId ? null : commandId);
  };

  const handleToggleDescriptions = () => {
    const newValue = !showDescriptions;
    setShowDescriptions(newValue);
    updateWidget(widget.id, {
      config: { ...widget.config, showDescriptions: newValue },
    });
  };

  return (
    <div className="@container h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-none border-b p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Git Commands</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleDescriptions}
            className="h-7 px-2"
          >
            {showDescriptions ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search commands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>

        {/* Category Tabs */}
        <ScrollArea className="w-full">
          <div className="flex gap-1 pb-2">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="h-7 px-2.5 text-xs whitespace-nowrap"
                >
                  <Icon className="h-3 w-3 mr-1.5" />
                  {category.label}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Commands List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {/* Favorites Section */}
          {favoriteCommands.length > 0 && selectedCategory === "all" && !searchQuery && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                <span className="text-xs font-medium text-muted-foreground">
                  Favorites
                </span>
              </div>
              <div className="space-y-1.5">
                {favoriteCommands.map((command) => (
                  <CommandItem
                    key={command.id}
                    command={command}
                    isExpanded={expandedCommand === command.id}
                    showDescription={showDescriptions}
                    isCopied={copiedId === command.id}
                    onCopy={handleCopyCommand}
                    onToggleFavorite={handleToggleFavorite}
                    onToggleExpand={handleToggleExpand}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Commands */}
          <AnimatePresence mode="popLayout">
            {filteredCommands.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8 text-sm text-muted-foreground"
              >
                No commands found
              </motion.div>
            ) : (
              filteredCommands.map((command) => (
                <CommandItem
                  key={command.id}
                  command={command}
                  isExpanded={expandedCommand === command.id}
                  showDescription={showDescriptions}
                  isCopied={copiedId === command.id}
                  onCopy={handleCopyCommand}
                  onToggleFavorite={handleToggleFavorite}
                  onToggleExpand={handleToggleExpand}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}

interface CommandItemProps {
  command: GitCommand;
  isExpanded: boolean;
  showDescription: boolean;
  isCopied: boolean;
  onCopy: (command: GitCommand) => void;
  onToggleFavorite: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

function CommandItem({
  command,
  isExpanded,
  showDescription,
  isCopied,
  onCopy,
  onToggleFavorite,
  onToggleExpand,
}: CommandItemProps) {
  const hasDetails = (command.flags && command.flags.length > 0) ||
                     (command.examples && command.examples.length > 0);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "rounded-lg border bg-card transition-colors",
        isExpanded && "ring-2 ring-primary/20"
      )}
    >
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Expand button (if has details) */}
          {hasDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleExpand(command.id)}
              className="h-5 w-5 p-0 shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </Button>
          )}

          {/* Command content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-2 mb-1">
              <code className="flex-1 text-xs font-mono bg-muted px-2 py-1 rounded break-all">
                {command.command}
              </code>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleFavorite(command.id)}
                  className="h-6 w-6 p-0"
                >
                  <Star
                    className={cn(
                      "h-3 w-3",
                      command.isFavorite && "fill-yellow-500 text-yellow-500"
                    )}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCopy(command)}
                  className="h-6 w-6 p-0"
                >
                  {isCopied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            {/* Description */}
            {showDescription && (
              <p className="text-xs text-muted-foreground">
                {command.description}
              </p>
            )}

            {/* Custom badge */}
            {command.isCustom && (
              <Badge variant="secondary" className="mt-2 text-xs">
                Custom
              </Badge>
            )}
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && hasDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pl-7 space-y-3 border-t pt-3">
                {/* Flags */}
                {command.flags && command.flags.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2">Common Flags:</h4>
                    <div className="space-y-1.5">
                      {command.flags.map((flag, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {flag.flag}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {flag.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Examples */}
                {command.examples && command.examples.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold mb-2">Examples:</h4>
                    <div className="space-y-1.5">
                      {command.examples.map((example, idx) => (
                        <code
                          key={idx}
                          className="block text-xs font-mono bg-muted px-2 py-1 rounded break-all"
                        >
                          {example}
                        </code>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
