"use client";

import { useState, useCallback, useMemo } from "react";
import {
  GitCompare,
  Eraser,
  Copy,
  ArrowLeftRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DiffViewerWidgetProps {
  widget: Widget;
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumber: {
    old?: number;
    new?: number;
  };
}

interface LastDiff {
  original: string;
  modified: string;
}

function computeDiff(original: string, modified: string): DiffLine[] {
  const originalLines = original.split("\n");
  const modifiedLines = modified.split("\n");
  const result: DiffLine[] = [];

  // Simple line-by-line diff algorithm
  let oldLineNum = 1;
  let newLineNum = 1;

  const _maxLen = Math.max(originalLines.length, modifiedLines.length);

  // Simple LCS-based diff
  const _oldSet = new Set(originalLines);
  const _newSet = new Set(modifiedLines);

  let i = 0;
  let j = 0;

  while (i < originalLines.length || j < modifiedLines.length) {
    const oldLine = originalLines[i];
    const newLine = modifiedLines[j];

    if (i >= originalLines.length) {
      // All remaining lines are additions
      result.push({
        type: "added",
        content: modifiedLines[j],
        lineNumber: { new: newLineNum++ },
      });
      j++;
    } else if (j >= modifiedLines.length) {
      // All remaining lines are deletions
      result.push({
        type: "removed",
        content: originalLines[i],
        lineNumber: { old: oldLineNum++ },
      });
      i++;
    } else if (oldLine === newLine) {
      // Lines match
      result.push({
        type: "unchanged",
        content: oldLine,
        lineNumber: { old: oldLineNum++, new: newLineNum++ },
      });
      i++;
      j++;
    } else {
      // Lines differ - check if it's a modification, addition, or deletion
      const oldInNew = modifiedLines.slice(j).indexOf(oldLine);
      const newInOld = originalLines.slice(i).indexOf(newLine);

      if (oldInNew === -1 && newInOld === -1) {
        // Both lines are different - treat as remove + add
        result.push({
          type: "removed",
          content: oldLine,
          lineNumber: { old: oldLineNum++ },
        });
        result.push({
          type: "added",
          content: newLine,
          lineNumber: { new: newLineNum++ },
        });
        i++;
        j++;
      } else if (oldInNew === -1 || (newInOld !== -1 && newInOld < oldInNew)) {
        // Old line not in new, or new line appears sooner in old
        result.push({
          type: "removed",
          content: oldLine,
          lineNumber: { old: oldLineNum++ },
        });
        i++;
      } else {
        // New line not in old
        result.push({
          type: "added",
          content: newLine,
          lineNumber: { new: newLineNum++ },
        });
        j++;
      }
    }
  }

  return result;
}

export function DiffViewerWidget({ widget }: DiffViewerWidgetProps) {
  const lastDiff = (widget.config?.lastDiff as LastDiff) || {
    original: "",
    modified: "",
  };

  const [original, setOriginal] = useState(lastDiff.original);
  const [modified, setModified] = useState(lastDiff.modified);
  const [_viewMode, _setViewMode] = useState<"split" | "inline">("inline");

  const saveDiff = useCallback(
    (diff: LastDiff) => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          ...widget.config,
          lastDiff: diff,
        },
      });
    },
    [widget.id, widget.config]
  );

  const diffResult = useMemo(() => {
    if (!original.trim() && !modified.trim()) return [];
    return computeDiff(original, modified);
  }, [original, modified]);

  const stats = useMemo(() => {
    const added = diffResult.filter((l) => l.type === "added").length;
    const removed = diffResult.filter((l) => l.type === "removed").length;
    const unchanged = diffResult.filter((l) => l.type === "unchanged").length;
    return { added, removed, unchanged };
  }, [diffResult]);

  const clearAll = () => {
    setOriginal("");
    setModified("");
    saveDiff({ original: "", modified: "" });
  };

  const swapTexts = () => {
    const temp = original;
    setOriginal(modified);
    setModified(temp);
  };

  const copyDiff = async () => {
    const diffText = diffResult
      .map((line) => {
        const prefix =
          line.type === "added" ? "+ " : line.type === "removed" ? "- " : "  ";
        return prefix + line.content;
      })
      .join("\n");

    try {
      await navigator.clipboard.writeText(diffText);
      toast.success("Diff copiado");
    } catch {
      toast.error("Error al copiar");
    }
  };

  // Auto-save on change
  const handleOriginalChange = (value: string) => {
    setOriginal(value);
    saveDiff({ original: value, modified });
  };

  const handleModifiedChange = (value: string) => {
    setModified(value);
    saveDiff({ original, modified: value });
  };

  const getLineClass = (type: DiffLine["type"]) => {
    switch (type) {
      case "added":
        return "bg-green-500/20 text-green-700 dark:text-green-300";
      case "removed":
        return "bg-red-500/20 text-red-700 dark:text-red-300";
      default:
        return "text-muted-foreground";
    }
  };

  const getLinePrefix = (type: DiffLine["type"]) => {
    switch (type) {
      case "added":
        return "+";
      case "removed":
        return "-";
      default:
        return " ";
    }
  };

  return (
    <div className="@container h-full w-full">
      <div className="flex flex-col h-full p-3 @sm:p-4 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium">Comparador de Texto</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={swapTexts}
              title="Intercambiar"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={copyDiff}
              title="Copiar diff"
              disabled={diffResult.length === 0}
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={clearAll}
              title="Limpiar"
            >
              <Eraser className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        {diffResult.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-green-500/20 text-green-600 border-green-500/30">
              +{stats.added} agregadas
            </Badge>
            <Badge variant="outline" className="text-xs bg-red-500/20 text-red-600 border-red-500/30">
              -{stats.removed} eliminadas
            </Badge>
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {stats.unchanged} sin cambios
            </Badge>
          </div>
        )}

        {/* Tabs for input/output */}
        <Tabs defaultValue="input" className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="input" className="text-xs">
              Entrada
            </TabsTrigger>
            <TabsTrigger value="diff" className="text-xs flex items-center gap-1">
              <Eye className="w-3 h-3" />
              Diferencias
            </TabsTrigger>
          </TabsList>

          {/* Input tab */}
          <TabsContent value="input" className="flex-1 min-h-0 mt-2">
            <div className="flex flex-col @md:flex-row gap-2 h-full">
              <div className="flex-1 min-h-0 flex flex-col">
                <Label className="text-xs text-muted-foreground mb-1">
                  Original
                </Label>
                <Textarea
                  value={original}
                  onChange={(e) => handleOriginalChange(e.target.value)}
                  placeholder="Texto original..."
                  className="flex-1 min-h-[100px] text-xs font-mono resize-none"
                />
              </div>
              <div className="flex-1 min-h-0 flex flex-col">
                <Label className="text-xs text-muted-foreground mb-1">
                  Modificado
                </Label>
                <Textarea
                  value={modified}
                  onChange={(e) => handleModifiedChange(e.target.value)}
                  placeholder="Texto modificado..."
                  className="flex-1 min-h-[100px] text-xs font-mono resize-none"
                />
              </div>
            </div>
          </TabsContent>

          {/* Diff tab */}
          <TabsContent value="diff" className="flex-1 min-h-0 mt-2">
            <div className="h-full rounded-md border bg-muted/30 overflow-hidden">
              {diffResult.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                  Ingresa texto en ambos campos para ver las diferencias
                </div>
              ) : (
                <ScrollArea className="h-full">
                  <div className="font-mono text-xs">
                    {diffResult.map((line, index) => (
                      <div
                        key={index}
                        className={cn(
                          "flex px-2 py-0.5 border-b border-border/30 last:border-0",
                          getLineClass(line.type)
                        )}
                      >
                        {/* Line numbers */}
                        <div className="w-8 text-right pr-2 text-muted-foreground/50 select-none shrink-0">
                          {line.lineNumber.old || ""}
                        </div>
                        <div className="w-8 text-right pr-2 text-muted-foreground/50 select-none shrink-0">
                          {line.lineNumber.new || ""}
                        </div>
                        {/* Prefix */}
                        <div
                          className={cn(
                            "w-4 text-center shrink-0 font-bold",
                            line.type === "added" && "text-green-500",
                            line.type === "removed" && "text-red-500"
                          )}
                        >
                          {getLinePrefix(line.type)}
                        </div>
                        {/* Content */}
                        <div className="flex-1 whitespace-pre-wrap break-all pl-1">
                          {line.content || " "}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
