"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fingerprint, Copy, Check, RefreshCw, History, Trash2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWidgetStore } from "@/stores/widget-store";
import type { Widget } from "@/types/widget";

interface UUIDGeneratorWidgetProps {
  widget: Widget;
}

interface UUIDConfig {
  uppercase?: boolean;
  includeHyphens?: boolean;
  historySize?: number;
  defaultVersion?: "v4" | "v1";
}

interface GeneratedUUID {
  id: string;
  value: string;
  version: "v4" | "v1";
  timestamp: number;
}

// Generate UUID v4 using crypto API or fallback
function generateUUIDv4(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  // Fallback implementation
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Simulate UUID v1 (timestamp-based) - browser-compatible version
function generateUUIDv1(): string {
  const now = Date.now();
  const timeHex = now.toString(16).padStart(16, "0");

  // Rearrange timestamp components to match v1 format
  const timeLow = timeHex.slice(-8);
  const timeMid = timeHex.slice(-12, -8);
  const timeHi = "1" + timeHex.slice(-15, -12); // Version 1

  // Generate random clock sequence and node
  const clockSeq = Math.floor(Math.random() * 0x3fff) | 0x8000;
  const node = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 256).toString(16).padStart(2, "0")
  ).join("");

  return `${timeLow}-${timeMid}-${timeHi}-${clockSeq.toString(16).padStart(4, "0")}-${node}`;
}

// Format UUID based on options
function formatUUID(uuid: string, uppercase: boolean, includeHyphens: boolean): string {
  let formatted = uuid;

  if (!includeHyphens) {
    formatted = formatted.replace(/-/g, "");
  }

  if (uppercase) {
    formatted = formatted.toUpperCase();
  }

  return formatted;
}

export function UUIDGeneratorWidget({ widget }: UUIDGeneratorWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as UUIDConfig) || {};

  const {
    uppercase = false,
    includeHyphens = true,
    historySize = 10,
    defaultVersion = "v4"
  } = config;

  // Generate initial UUID using lazy state initializer - runs only once
  const [currentUUID, setCurrentUUID] = useState<string>(() => {
    const rawUUID = generateUUIDv4();
    return formatUUID(rawUUID, false, true); // Use defaults for initial
  });

  // Initialize history with the initial UUID using lazy state initializer
  const [history, setHistory] = useState<GeneratedUUID[]>(() => {
    const rawUUID = generateUUIDv4();
    const formatted = formatUUID(rawUUID, false, true);
    return [{
      id: crypto.randomUUID(),
      value: formatted,
      version: "v4" as const,
      timestamp: Date.now()
    }];
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bulkCount, setBulkCount] = useState<string>("5");
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<"v4" | "v1">(defaultVersion);

  // Generate a new UUID
  const generateNew = useCallback((version: "v4" | "v1" = selectedVersion) => {
    const rawUUID = version === "v4" ? generateUUIDv4() : generateUUIDv1();
    const formatted = formatUUID(rawUUID, uppercase, includeHyphens);

    const newUUID: GeneratedUUID = {
      id: crypto.randomUUID(),
      value: formatted,
      version,
      timestamp: Date.now()
    };

    setCurrentUUID(formatted);
    setHistory((prev) => [newUUID, ...prev.slice(0, historySize - 1)]);
  }, [uppercase, includeHyphens, historySize, selectedVersion]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }, []);

  // Generate bulk UUIDs
  const generateBulk = useCallback(() => {
    const count = Math.min(Math.max(parseInt(bulkCount) || 1, 1), 100);
    const bulkUUIDs: GeneratedUUID[] = [];

    for (let i = 0; i < count; i++) {
      const rawUUID = selectedVersion === "v4" ? generateUUIDv4() : generateUUIDv1();
      const formatted = formatUUID(rawUUID, uppercase, includeHyphens);

      bulkUUIDs.push({
        id: crypto.randomUUID(),
        value: formatted,
        version: selectedVersion,
        timestamp: Date.now() + i
      });
    }

    setHistory((prev) => [...bulkUUIDs, ...prev].slice(0, historySize));
    setCurrentUUID(bulkUUIDs[0].value);
    setShowBulkMode(false);
  }, [bulkCount, selectedVersion, uppercase, includeHyphens, historySize]);

  // Download history as text file
  const downloadHistory = useCallback(() => {
    const text = history.map((h) => h.value).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uuids-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [history]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Update config - build full config from current state
  const updateConfig = useCallback((updates: Partial<UUIDConfig>) => {
    updateWidget(widget.id, {
      config: {
        uppercase,
        includeHyphens,
        historySize,
        defaultVersion: selectedVersion,
        ...updates
      }
    });
  }, [widget.id, updateWidget, uppercase, includeHyphens, historySize, selectedVersion]);

  // Compute formatted UUID based on options - using useMemo instead of effect
  const formattedCurrentUUID = useMemo(() => {
    if (!currentUUID) return "";
    const withHyphens = currentUUID.length === 32 ?
      `${currentUUID.slice(0, 8)}-${currentUUID.slice(8, 12)}-${currentUUID.slice(12, 16)}-${currentUUID.slice(16, 20)}-${currentUUID.slice(20)}` :
      currentUUID;
    return formatUUID(withHyphens, uppercase, includeHyphens);
  }, [currentUUID, uppercase, includeHyphens]);

  return (
    <div className="h-full flex flex-col gap-3 @container">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Fingerprint className="w-4 h-4 text-primary" />
          <h3 className="font-semibold text-sm">UUID Generator</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => generateNew()}
          className="h-7 px-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Version Selector */}
      <div className="flex gap-2">
        <Button
          variant={selectedVersion === "v4" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectedVersion("v4");
            updateConfig({ defaultVersion: "v4" });
          }}
          className="flex-1 h-8"
        >
          UUID v4
        </Button>
        <Button
          variant={selectedVersion === "v1" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setSelectedVersion("v1");
            updateConfig({ defaultVersion: "v1" });
          }}
          className="flex-1 h-8"
        >
          UUID v1
        </Button>
      </div>

      {/* Current UUID Display */}
      <div className="relative">
        <Input
          value={formattedCurrentUUID}
          readOnly
          className="pr-10 font-mono text-xs @sm:text-sm"
          onClick={(e) => e.currentTarget.select()}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => copyToClipboard(formattedCurrentUUID, "current")}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
        >
          <AnimatePresence mode="wait">
            {copiedId === "current" ? (
              <motion.div
                key="check"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Check className="w-3.5 h-3.5 text-green-500" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <Copy className="w-3.5 h-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </div>

      {/* Options */}
      <div className="grid @sm:grid-cols-2 gap-3 py-2 border-y">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="uppercase" className="text-xs cursor-pointer">
            Uppercase
          </Label>
          <Switch
            id="uppercase"
            checked={uppercase}
            onCheckedChange={(checked) => updateConfig({ uppercase: checked })}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="hyphens" className="text-xs cursor-pointer">
            Hyphens
          </Label>
          <Switch
            id="hyphens"
            checked={includeHyphens}
            onCheckedChange={(checked) => updateConfig({ includeHyphens: checked })}
          />
        </div>
      </div>

      {/* Bulk Mode Toggle */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkMode(!showBulkMode)}
          className="flex-1 h-8"
        >
          {showBulkMode ? "Single Mode" : "Bulk Generate"}
        </Button>
      </div>

      {/* Bulk Generation */}
      <AnimatePresence>
        {showBulkMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                max="100"
                value={bulkCount}
                onChange={(e) => setBulkCount(e.target.value)}
                className="flex-1 h-9"
                placeholder="Count"
              />
              <Button
                onClick={generateBulk}
                size="sm"
                className="h-9"
              >
                Generate
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History Header */}
      {history.length > 0 && (
        <div className="flex items-center justify-between gap-2 mt-2">
          <div className="flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              History ({history.length})
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadHistory}
              className="h-6 px-2"
              title="Download history"
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearHistory}
              className="h-6 px-2"
              title="Clear history"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}

      {/* History List */}
      <ScrollArea className="flex-1 -mx-4 px-4">
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {history.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ delay: index * 0.02 }}
                className="group relative"
              >
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <span className="text-xs font-mono flex-1 truncate">
                    {item.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {item.version}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(item.value, item.id)}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <AnimatePresence mode="wait">
                      {copiedId === item.id ? (
                        <motion.div
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Check className="w-3 h-3 text-green-500" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                        >
                          <Copy className="w-3 h-3" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
