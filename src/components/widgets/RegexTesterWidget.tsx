"use client";

import { useState, useEffect, useMemo } from "react";
import { type Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Regex, CheckCircle, XCircle, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RegexTesterWidgetProps {
  widget: Widget;
}

interface Match {
  fullMatch: string;
  index: number;
  groups: string[];
}

// Helper to parse flags string to object
const parseFlagsString = (flagsStr?: string) => ({
  global: flagsStr?.includes('g') ?? true,
  ignoreCase: flagsStr?.includes('i') ?? false,
  multiline: flagsStr?.includes('m') ?? false,
  dotAll: flagsStr?.includes('s') ?? false,
});

// Helper to convert flags object to string
const flagsToString = (flags: { global: boolean; ignoreCase: boolean; multiline: boolean; dotAll: boolean }) =>
  (flags.global ? 'g' : '') +
  (flags.ignoreCase ? 'i' : '') +
  (flags.multiline ? 'm' : '') +
  (flags.dotAll ? 's' : '');

export function RegexTesterWidget({ widget }: RegexTesterWidgetProps) {
  // Note: Use getState() for updateWidget to prevent re-render loops

  const config = widget.config || {};
  const [pattern, setPattern] = useState((config.pattern as string) || "");
  const [flags, setFlags] = useState(() => parseFlagsString(config.flags as string | undefined));
  const [testString, setTestString] = useState((config.testString as string) || "");
  const [regexError, setRegexError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Compute regex and matches
  const { regex, matches, isValid, errorMessage } = useMemo(() => {
    if (!pattern) {
      return { regex: null, matches: [], isValid: true, errorMessage: null };
    }

    try {
      const flagString =
        (flags.global ? "g" : "") +
        (flags.ignoreCase ? "i" : "") +
        (flags.multiline ? "m" : "") +
        (flags.dotAll ? "s" : "");

      const compiledRegex = new RegExp(pattern, flagString);
      const foundMatches: Match[] = [];

      if (testString) {
        if (flags.global) {
          let match;
          while ((match = compiledRegex.exec(testString)) !== null) {
            foundMatches.push({
              fullMatch: match[0],
              index: match.index,
              groups: match.slice(1),
            });
            // Prevent infinite loop on zero-length matches
            if (match.index === compiledRegex.lastIndex) {
              compiledRegex.lastIndex++;
            }
          }
        } else {
          const match = compiledRegex.exec(testString);
          if (match) {
            foundMatches.push({
              fullMatch: match[0],
              index: match.index,
              groups: match.slice(1),
            });
          }
        }
      }

      return { regex: compiledRegex, matches: foundMatches, isValid: true, errorMessage: null };
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Invalid regex";
      return { regex: null, matches: [], isValid: false, errorMessage: errMsg };
    }
  }, [pattern, flags, testString]);

  // Update regex error state based on memoized result (avoids setState in useMemo)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setRegexError(errorMessage);
    });
    return () => cancelAnimationFrame(frame);
  }, [errorMessage]);

  // Persist config changes
  useEffect(() => {
    const saveConfig = () => {
      useWidgetStore.getState().updateWidget(widget.id, {
        config: {
          pattern,
          flags: flagsToString(flags),
          testString,
        },
      });
    };

    const timeoutId = setTimeout(saveConfig, 500);
    return () => clearTimeout(timeoutId);
     
  }, [pattern, flags, testString, widget.id]);

  const handleFlagChange = (flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const handleCopyRegex = async () => {
    const flagString =
      (flags.global ? "g" : "") +
      (flags.ignoreCase ? "i" : "") +
      (flags.multiline ? "m" : "") +
      (flags.dotAll ? "s" : "");

    const regexString = `/${pattern}/${flagString}`;

    try {
      await navigator.clipboard.writeText(regexString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy regex:", error);
    }
  };

  // Generate highlighted test string
  const highlightedString = useMemo(() => {
    if (!testString || matches.length === 0) {
      return testString;
    }

    const parts: { text: string; isMatch: boolean; key: string }[] = [];
    let lastIndex = 0;

    matches.forEach((match, matchIdx) => {
      // Add non-match text before this match
      if (match.index > lastIndex) {
        parts.push({
          text: testString.slice(lastIndex, match.index),
          isMatch: false,
          key: `text-${lastIndex}`,
        });
      }

      // Add the match
      parts.push({
        text: match.fullMatch,
        isMatch: true,
        key: `match-${matchIdx}`,
      });

      lastIndex = match.index + match.fullMatch.length;
    });

    // Add remaining text
    if (lastIndex < testString.length) {
      parts.push({
        text: testString.slice(lastIndex),
        isMatch: false,
        key: `text-${lastIndex}`,
      });
    }

    return parts;
  }, [testString, matches]);

  return (
    <div className="@container h-full flex flex-col gap-3 @xs:gap-4 p-3 @xs:p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Regex className="w-4 h-4 @xs:w-5 @xs:h-5 text-primary" />
        <h3 className="font-semibold text-sm @xs:text-base truncate">
          {widget.title || "Regex Tester"}
        </h3>
        {pattern && (
          <div className="ml-auto flex items-center gap-1.5">
            {isValid ? (
              <CheckCircle className="w-3.5 h-3.5 @xs:w-4 @xs:h-4 text-green-500" />
            ) : (
              <XCircle className="w-3.5 h-3.5 @xs:w-4 @xs:h-4 text-destructive" />
            )}
          </div>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-3 @xs:space-y-4 pr-3">
          {/* Pattern Input */}
          <div className="space-y-1.5 @xs:space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`pattern-${widget.id}`} className="text-xs @xs:text-sm">
                Regular Expression
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCopyRegex}
                disabled={!pattern}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
            <Input
              id={`pattern-${widget.id}`}
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              className={`font-mono text-xs @xs:text-sm ${
                pattern && !isValid
                  ? "border-destructive focus-visible:ring-destructive"
                  : pattern && isValid
                  ? "border-green-500 focus-visible:ring-green-500"
                  : ""
              }`}
            />

            {/* Error Message */}
            <AnimatePresence>
              {regexError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs text-destructive flex items-start gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{regexError}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Flags */}
          <div className="space-y-1.5 @xs:space-y-2">
            <Label className="text-xs @xs:text-sm">Flags</Label>
            <div className="grid grid-cols-2 gap-2 @sm:grid-cols-4">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`flag-g-${widget.id}`}
                  checked={flags.global}
                  onCheckedChange={() => handleFlagChange("global")}
                />
                <Label
                  htmlFor={`flag-g-${widget.id}`}
                  className="text-xs cursor-pointer font-mono"
                >
                  g (global)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`flag-i-${widget.id}`}
                  checked={flags.ignoreCase}
                  onCheckedChange={() => handleFlagChange("ignoreCase")}
                />
                <Label
                  htmlFor={`flag-i-${widget.id}`}
                  className="text-xs cursor-pointer font-mono"
                >
                  i (ignore case)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`flag-m-${widget.id}`}
                  checked={flags.multiline}
                  onCheckedChange={() => handleFlagChange("multiline")}
                />
                <Label
                  htmlFor={`flag-m-${widget.id}`}
                  className="text-xs cursor-pointer font-mono"
                >
                  m (multiline)
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`flag-s-${widget.id}`}
                  checked={flags.dotAll}
                  onCheckedChange={() => handleFlagChange("dotAll")}
                />
                <Label
                  htmlFor={`flag-s-${widget.id}`}
                  className="text-xs cursor-pointer font-mono"
                >
                  s (dotall)
                </Label>
              </div>
            </div>
          </div>

          {/* Test String */}
          <div className="space-y-1.5 @xs:space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`test-${widget.id}`} className="text-xs @xs:text-sm">
                Test String
              </Label>
              {matches.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {matches.length} {matches.length === 1 ? "match" : "matches"}
                </span>
              )}
            </div>
            <Textarea
              id={`test-${widget.id}`}
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter text to test..."
              className="font-mono text-xs @xs:text-sm min-h-[80px] @sm:min-h-[100px] resize-none"
            />
          </div>

          {/* Highlighted Output */}
          {testString && matches.length > 0 && (
            <div className="space-y-1.5 @xs:space-y-2">
              <Label className="text-xs @xs:text-sm">Highlighted Matches</Label>
              <div className="p-2 @xs:p-3 bg-muted rounded-md font-mono text-xs @xs:text-sm whitespace-pre-wrap break-words">
                {Array.isArray(highlightedString) ? (
                  highlightedString.map((part) =>
                    part.isMatch ? (
                      <motion.span
                        key={part.key}
                        initial={{ backgroundColor: "rgba(34, 197, 94, 0)" }}
                        animate={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
                        transition={{ duration: 0.3 }}
                        className="bg-green-500/20 text-green-700 dark:text-green-400 font-semibold rounded px-0.5"
                      >
                        {part.text}
                      </motion.span>
                    ) : (
                      <span key={part.key}>{part.text}</span>
                    )
                  )
                ) : (
                  highlightedString
                )}
              </div>
            </div>
          )}

          {/* Match Details */}
          {matches.length > 0 && (
            <div className="space-y-1.5 @xs:space-y-2">
              <Label className="text-xs @xs:text-sm">Match Details</Label>
              <div className="space-y-2">
                {matches.map((match, idx) => (
                  <motion.div
                    key={`match-detail-${idx}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="p-2 @xs:p-3 bg-muted rounded-md space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Match {idx + 1}</span>
                      <span className="text-xs text-muted-foreground">
                        Index: {match.index}
                      </span>
                    </div>
                    <div className="font-mono text-xs @xs:text-sm bg-background p-1.5 rounded border">
                      {match.fullMatch}
                    </div>
                    {match.groups.length > 0 && (
                      <div className="space-y-1 pt-1">
                        <span className="text-xs text-muted-foreground">Captured Groups:</span>
                        {match.groups.map((group, groupIdx) => (
                          <div
                            key={`group-${idx}-${groupIdx}`}
                            className="font-mono text-xs bg-background p-1.5 rounded border"
                          >
                            <span className="text-muted-foreground">Group {groupIdx + 1}:</span>{" "}
                            {group || "(empty)"}
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {testString && pattern && isValid && matches.length === 0 && (
            <div className="p-4 @xs:p-6 text-center text-muted-foreground">
              <XCircle className="w-8 h-8 @xs:w-10 @xs:h-10 mx-auto mb-2 opacity-50" />
              <p className="text-xs @xs:text-sm">No matches found</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
