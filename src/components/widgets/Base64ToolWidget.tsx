"use client";

import { useState, useCallback, useEffect } from "react";
import type { Widget } from "@/types/widget";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Copy, ArrowUpDown, Binary, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Base64ToolWidgetProps {
  widget: Widget;
}

type Mode = "encode" | "decode";

export function Base64ToolWidget({}: Base64ToolWidgetProps) {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Encode text to Base64 with proper UTF-8 handling
  const encodeToBase64 = useCallback((text: string): string => {
    try {
      // Convert string to UTF-8 bytes, then to Base64
      const encoder = new TextEncoder();
      const data = encoder.encode(text);
      const base64 = btoa(String.fromCharCode(...data));
      return base64;
    } catch (_err) {
      throw new Error("Failed to encode text to Base64");
    }
  }, []);

  // Decode Base64 to text with proper UTF-8 handling
  const decodeFromBase64 = useCallback((base64: string): string => {
    try {
      // Remove whitespace and validate Base64 format
      const cleaned = base64.replace(/\s/g, "");

      // Validate Base64 characters
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned)) {
        throw new Error("Invalid Base64 format");
      }

      // Decode Base64 to bytes, then to UTF-8 string
      const binary = atob(cleaned);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const decoder = new TextDecoder();
      return decoder.decode(bytes);
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(err.message === "Invalid Base64 format"
          ? "Invalid Base64 format"
          : "Failed to decode Base64 string");
      }
      throw new Error("Failed to decode Base64 string");
    }
  }, []);

  // Process input based on current mode
  const processInput = useCallback((value: string) => {
    setError(null);

    if (!value.trim()) {
      setOutput("");
      return;
    }

    try {
      if (mode === "encode") {
        const encoded = encodeToBase64(value);
        setOutput(encoded);
      } else {
        const decoded = decodeFromBase64(value);
        setOutput(decoded);
      }
    } catch (_err) {
      const errorMessage = _err instanceof Error ? _err.message : "Processing failed";
      setError(errorMessage);
      setOutput("");
    }
  }, [mode, encodeToBase64, decodeFromBase64]);

  // Update output when input or mode changes
  useEffect(() => {
    processInput(input);
  }, [input, processInput]);

  // Toggle between encode and decode modes
  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const newMode = prev === "encode" ? "decode" : "encode";
      // Swap input and output when toggling mode
      setInput(output);
      setOutput(input);
      setError(null);
      return newMode;
    });
  }, [input, output]);

  // Copy output to clipboard
  const copyToClipboard = useCallback(async () => {
    if (!output) {
      toast.error("Nothing to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch (_err) {
      toast.error("Failed to copy to clipboard");
    }
  }, [output]);

  // Clear all fields
  const clearAll = useCallback(() => {
    setInput("");
    setOutput("");
    setError(null);
  }, []);

  return (
    <div className="@container flex h-full w-full flex-col gap-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Binary className="h-4 w-4 text-blue-500" />
          <h3 className="text-sm font-semibold">Base64 Tool</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMode}
            className="h-7 gap-1.5 text-xs"
            title="Toggle mode"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span className="hidden @sm:inline">
              {mode === "encode" ? "Encode" : "Decode"}
            </span>
          </Button>
        </div>
      </div>

      {/* Mode Indicator */}
      <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 p-2">
        <div className="flex flex-1 items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Mode:</span>
          <div className="flex gap-1">
            <div
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                mode === "encode"
                  ? "bg-blue-500 text-white"
                  : "bg-background text-muted-foreground"
              )}
            >
              Encode
            </div>
            <div
              className={cn(
                "rounded px-2 py-0.5 text-xs font-medium transition-colors",
                mode === "decode"
                  ? "bg-blue-500 text-white"
                  : "bg-background text-muted-foreground"
              )}
            >
              Decode
            </div>
          </div>
        </div>
      </div>

      {/* Input Section */}
      <div className="flex flex-1 flex-col gap-2">
        <label className="text-xs font-medium text-muted-foreground">
          {mode === "encode" ? "Text to encode" : "Base64 to decode"}
        </label>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode"
              ? "Enter text to encode..."
              : "Enter Base64 string to decode..."
          }
          className="min-h-[80px] flex-1 resize-none font-mono text-xs @md:text-sm"
        />
      </div>

      {/* Output Section */}
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {mode === "encode" ? "Base64 output" : "Decoded text"}
          </label>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="h-6 gap-1 px-2 text-xs"
              disabled={!input && !output}
              title="Clear all"
            >
              <Eraser className="h-3 w-3" />
              <span className="hidden @sm:inline">Clear</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-6 gap-1 px-2 text-xs"
              disabled={!output}
              title="Copy to clipboard"
            >
              <Copy className="h-3 w-3" />
              <span className="hidden @sm:inline">Copy</span>
            </Button>
          </div>
        </div>
        <Textarea
          value={output}
          readOnly
          placeholder={error || "Output will appear here..."}
          className={cn(
            "min-h-[80px] flex-1 resize-none font-mono text-xs @md:text-sm",
            error && "text-red-500 placeholder:text-red-500"
          )}
        />
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  );
}
