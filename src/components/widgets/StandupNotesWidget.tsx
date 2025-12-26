"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StandupItem {
  id: string;
  text: string;
  timestamp: number;
}

interface StandupEntry {
  date: string;
  yesterday: StandupItem[];
  today: StandupItem[];
  blockers: StandupItem[];
  teamMember?: string;
}

interface StandupNotesConfig {
  standups: StandupEntry[];
  teamMembers: string[];
  enableTeamMode: boolean;
}

interface StandupNotesWidgetProps {
  widget: Widget;
}

const SECTION_COLORS = {
  yesterday: {
    bg: "bg-green-500/10",
    border: "border-green-500/30",
    text: "text-green-700 dark:text-green-400",
    hover: "hover:bg-green-500/20",
  },
  today: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    text: "text-blue-700 dark:text-blue-400",
    hover: "hover:bg-blue-500/20",
  },
  blockers: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-700 dark:text-red-400",
    hover: "hover:bg-red-500/20",
  },
};

export function StandupNotesWidget({ widget }: StandupNotesWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as StandupNotesConfig) || {
    standups: [],
    teamMembers: [],
    enableTeamMode: false,
  };

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>("me");
  const [copied, setCopied] = useState(false);

  const [yesterdayInput, setYesterdayInput] = useState("");
  const [todayInput, setTodayInput] = useState("");
  const [blockersInput, setBlockersInput] = useState("");

  const dateKey = selectedDate.toISOString().split("T")[0];

  // Get current standup entry
  const currentStandup = config.standups.find(
    (s) =>
      s.date === dateKey &&
      (config.enableTeamMode ? s.teamMember === selectedMember : true)
  );

  // Auto-create today's standup if viewing today and doesn't exist
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    if (dateKey === today && !currentStandup) {
      const newStandup: StandupEntry = {
        date: dateKey,
        yesterday: [],
        today: [],
        blockers: [],
        ...(config.enableTeamMode && { teamMember: selectedMember }),
      };
      updateWidget(widget.id, {
        config: {
          ...config,
          standups: [...config.standups, newStandup],
        },
      });
    }
  }, [dateKey, selectedMember, config.enableTeamMode]);

  const updateStandup = (updates: Partial<StandupEntry>) => {
    const standupIndex = config.standups.findIndex(
      (s) =>
        s.date === dateKey &&
        (config.enableTeamMode ? s.teamMember === selectedMember : true)
    );

    let updatedStandups: StandupEntry[];

    if (standupIndex >= 0) {
      updatedStandups = [...config.standups];
      updatedStandups[standupIndex] = {
        ...updatedStandups[standupIndex],
        ...updates,
      };
    } else {
      const newStandup: StandupEntry = {
        date: dateKey,
        yesterday: [],
        today: [],
        blockers: [],
        ...(config.enableTeamMode && { teamMember: selectedMember }),
        ...updates,
      };
      updatedStandups = [...config.standups, newStandup];
    }

    updateWidget(widget.id, {
      config: {
        ...config,
        standups: updatedStandups,
      },
    });
  };

  const addItem = (section: "yesterday" | "today" | "blockers", text: string) => {
    if (!text.trim()) return;

    const newItem: StandupItem = {
      id: `${Date.now()}-${Math.random()}`,
      text: text.trim(),
      timestamp: Date.now(),
    };

    const currentItems = currentStandup?.[section] || [];
    updateStandup({
      [section]: [...currentItems, newItem],
    });

    // Clear input
    if (section === "yesterday") setYesterdayInput("");
    if (section === "today") setTodayInput("");
    if (section === "blockers") setBlockersInput("");
  };

  const removeItem = (section: "yesterday" | "today" | "blockers", itemId: string) => {
    const currentItems = currentStandup?.[section] || [];
    updateStandup({
      [section]: currentItems.filter((item) => item.id !== itemId),
    });
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setSelectedDate(newDate);
  };

  const copyStandup = () => {
    if (!currentStandup) return;

    const formatSection = (title: string, items: StandupItem[]) => {
      if (items.length === 0) return `${title}:\n  - None`;
      return `${title}:\n${items.map((item) => `  - ${item.text}`).join("\n")}`;
    };

    const text = [
      `Standup - ${selectedDate.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`,
      config.enableTeamMode && selectedMember ? `Team Member: ${selectedMember}` : "",
      "",
      formatSection("Yesterday", currentStandup.yesterday),
      "",
      formatSection("Today", currentStandup.today),
      "",
      formatSection("Blockers", currentStandup.blockers),
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isToday = dateKey === new Date().toISOString().split("T")[0];

  return (
    <div className="@container flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-border/40 p-3 @sm:p-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateDate("prev")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="relative">
            <Input
              type="date"
              value={dateKey}
              onChange={(e) => {
                const newDate = new Date(e.target.value + "T12:00:00");
                if (!isNaN(newDate.getTime())) {
                  setSelectedDate(newDate);
                }
              }}
              className={cn(
                "h-8 w-[120px] text-xs @sm:w-[140px] @sm:text-sm",
                !isToday && "font-medium"
              )}
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => navigateDate("next")}
            disabled={isToday}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {config.enableTeamMode && config.teamMembers.length > 0 && (
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="h-8 w-[100px] text-xs @sm:w-[120px] @sm:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="me">Me</SelectItem>
                {config.teamMembers.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={copyStandup}
            disabled={!currentStandup}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Standup Sections */}
      <div className="flex-1 space-y-3 overflow-y-auto p-3 @sm:space-y-4 @sm:p-4">
        {/* Yesterday Section */}
        <StandupSection
          title="Yesterday"
          color="yesterday"
          items={currentStandup?.yesterday || []}
          inputValue={yesterdayInput}
          onInputChange={setYesterdayInput}
          onAddItem={(text) => addItem("yesterday", text)}
          onRemoveItem={(id) => removeItem("yesterday", id)}
        />

        {/* Today Section */}
        <StandupSection
          title="Today"
          color="today"
          items={currentStandup?.today || []}
          inputValue={todayInput}
          onInputChange={setTodayInput}
          onAddItem={(text) => addItem("today", text)}
          onRemoveItem={(id) => removeItem("today", id)}
        />

        {/* Blockers Section */}
        <StandupSection
          title="Blockers"
          color="blockers"
          items={currentStandup?.blockers || []}
          inputValue={blockersInput}
          onInputChange={setBlockersInput}
          onAddItem={(text) => addItem("blockers", text)}
          onRemoveItem={(id) => removeItem("blockers", id)}
        />
      </div>

      {/* Stats Footer */}
      {currentStandup && (
        <div className="border-t border-border/40 p-2 text-center text-xs text-muted-foreground">
          {currentStandup.yesterday.length + currentStandup.today.length + currentStandup.blockers.length} items total
        </div>
      )}
    </div>
  );
}

interface StandupSectionProps {
  title: string;
  color: "yesterday" | "today" | "blockers";
  items: StandupItem[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onAddItem: (text: string) => void;
  onRemoveItem: (id: string) => void;
}

function StandupSection({
  title,
  color,
  items,
  inputValue,
  onInputChange,
  onAddItem,
  onRemoveItem,
}: StandupSectionProps) {
  const colors = SECTION_COLORS[color];

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        colors.bg,
        colors.border
      )}
    >
      <h3 className={cn("mb-2 text-sm font-semibold @sm:text-base", colors.text)}>
        {title}
      </h3>

      {/* Items List */}
      <div className="mb-2 space-y-1.5">
        <AnimatePresence mode="popLayout">
          {items.length === 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-muted-foreground italic"
            >
              No items yet
            </motion.p>
          )}
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="group flex items-start gap-2 rounded-md p-2 text-sm transition-colors hover:bg-background/50"
            >
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-current opacity-50" />
              <span className="flex-1 break-words leading-relaxed">{item.text}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => onRemoveItem(item.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Item Input */}
      <div className="flex gap-2">
        <Input
          placeholder={`Add to ${title.toLowerCase()}...`}
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAddItem(inputValue);
            }
          }}
          className="h-8 text-xs @sm:text-sm"
        />
        <Button
          size="icon"
          variant="ghost"
          className={cn("h-8 w-8 flex-shrink-0", colors.hover)}
          onClick={() => onAddItem(inputValue)}
          disabled={!inputValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
