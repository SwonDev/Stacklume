"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { FileText, Copy, Check, Trash2, Clock, MessageSquare, Type, AlignLeft } from "lucide-react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface WordCounterWidgetProps {
  widget: Widget;
}

interface WordCounterConfig {
  readingSpeed?: number; // words per minute
  speakingSpeed?: number; // words per minute
  savedText?: string;
}

interface TextStats {
  words: number;
  charactersWithSpaces: number;
  charactersWithoutSpaces: number;
  sentences: number;
  paragraphs: number;
  readingTime: number; // minutes
  speakingTime: number; // minutes
}

export function WordCounterWidget({ widget }: WordCounterWidgetProps) {
  const updateWidget = useWidgetStore((state) => state.updateWidget);
  const config = (widget.config as unknown as WordCounterConfig) || {};

  const [text, setText] = useState(config.savedText || "");
  const [readingSpeed, setReadingSpeed] = useState(config.readingSpeed || 200);
  const [speakingSpeed, setSpeakingSpeed] = useState(config.speakingSpeed || 150);
  const [copied, setCopied] = useState(false);

  // Calculate text statistics
  const calculateStats = (input: string): TextStats => {
    // Words: split by whitespace and filter empty strings
    const words = input.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = input.trim() === "" ? 0 : words.length;

    // Characters
    const charactersWithSpaces = input.length;
    const charactersWithoutSpaces = input.replace(/\s/g, "").length;

    // Sentences: count periods, exclamation marks, question marks
    const sentenceCount = (input.match(/[.!?]+/g) || []).length;

    // Paragraphs: split by double newlines
    const paragraphs = input.split(/\n\s*\n/).filter(para => para.trim().length > 0);
    const paragraphCount = input.trim() === "" ? 0 : paragraphs.length;

    // Reading and speaking time (in minutes)
    const readingTime = wordCount / readingSpeed;
    const speakingTime = wordCount / speakingSpeed;

    return {
      words: wordCount,
      charactersWithSpaces,
      charactersWithoutSpaces,
      sentences: sentenceCount,
      paragraphs: paragraphCount,
      readingTime,
      speakingTime,
    };
  };

  const stats = calculateStats(text);

  // Format time (minutes) to readable string
  const formatTime = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    }
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  // Save text to config when it changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updateWidget(widget.id, {
        config: {
          savedText: text,
          readingSpeed,
          speakingSpeed,
        },
      });
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timeoutId);
  }, [text, widget.id, updateWidget, readingSpeed, speakingSpeed]);

  // Save speed settings
  const handleReadingSpeedChange = (value: number) => {
    setReadingSpeed(value);
    // The useEffect will save the config with debounce
  };

  const handleSpeakingSpeedChange = (value: number) => {
    setSpeakingSpeed(value);
    // The useEffect will save the config with debounce
  };

  const handleClear = () => {
    setText("");
    // The useEffect will save the config with debounce
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy text:", error);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 @container">
      {/* Header with actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Word Counter</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            disabled={!text}
            className="h-8 px-2"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={!text}
            className="h-8 px-2"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Textarea */}
      <div className="flex-1 min-h-0">
        <Textarea
          placeholder="Type or paste your text here..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="h-full resize-none text-sm"
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 @sm:grid-cols-3 @md:grid-cols-4 gap-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Type className="h-3.5 w-3.5 text-blue-500" />
              <Label className="text-xs text-muted-foreground">Words</Label>
            </div>
            <p className="text-xl font-bold">{stats.words.toLocaleString()}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlignLeft className="h-3.5 w-3.5 text-purple-500" />
              <Label className="text-xs text-muted-foreground">Chars (with)</Label>
            </div>
            <p className="text-xl font-bold">{stats.charactersWithSpaces.toLocaleString()}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlignLeft className="h-3.5 w-3.5 text-pink-500" />
              <Label className="text-xs text-muted-foreground">Chars (no sp.)</Label>
            </div>
            <p className="text-xl font-bold">{stats.charactersWithoutSpaces.toLocaleString()}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-green-500" />
              <Label className="text-xs text-muted-foreground">Sentences</Label>
            </div>
            <p className="text-xl font-bold">{stats.sentences.toLocaleString()}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-3.5 w-3.5 text-orange-500" />
              <Label className="text-xs text-muted-foreground">Paragraphs</Label>
            </div>
            <p className="text-xl font-bold">{stats.paragraphs.toLocaleString()}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-3.5 w-3.5 text-cyan-500" />
              <Label className="text-xs text-muted-foreground">Reading</Label>
            </div>
            <p className="text-xl font-bold">{formatTime(stats.readingTime)}</p>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-indigo-500" />
              <Label className="text-xs text-muted-foreground">Speaking</Label>
            </div>
            <p className="text-xl font-bold">{formatTime(stats.speakingTime)}</p>
          </Card>
        </motion.div>
      </div>

      {/* Speed Settings */}
      <div className="grid grid-cols-1 @sm:grid-cols-2 gap-3 pt-2 border-t">
        <div className="space-y-1.5">
          <Label htmlFor="reading-speed" className="text-xs">
            Reading Speed (WPM)
          </Label>
          <Input
            id="reading-speed"
            type="number"
            min={50}
            max={500}
            value={readingSpeed}
            onChange={(e) => handleReadingSpeedChange(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="speaking-speed" className="text-xs">
            Speaking Speed (WPM)
          </Label>
          <Input
            id="speaking-speed"
            type="number"
            min={50}
            max={500}
            value={speakingSpeed}
            onChange={(e) => handleSpeakingSpeedChange(Number(e.target.value))}
            className="h-8 text-sm"
          />
        </div>
      </div>
    </div>
  );
}
