"use client";

import { useState, useEffect } from "react";
import { Binary, Copy, Check, Calculator } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface NumberConverterWidgetProps {
  widget: Widget;
}

type NumberBase = "binary" | "octal" | "decimal" | "hex";

interface ConversionResult {
  binary: string;
  octal: string;
  decimal: string;
  hex: string;
  valid: boolean;
  error?: string;
}

interface CopiedState {
  [key: string]: boolean;
}

export function NumberConverterWidget({ widget }: NumberConverterWidgetProps) {
  const { updateWidget } = useWidgetStore();

  // State from widget config or defaults
  const [inputValue, setInputValue] = useState<string>(
    (widget.config?.inputValue as string) || ""
  );
  const [inputBase, setInputBase] = useState<NumberBase>(
    (widget.config?.inputBase as NumberBase) || "decimal"
  );
  const [results, setResults] = useState<ConversionResult>({
    binary: "",
    octal: "",
    decimal: "",
    hex: "",
    valid: false,
  });
  const [copied, setCopied] = useState<CopiedState>({});

  // Convert number between bases
  const convertNumber = (value: string, fromBase: NumberBase): ConversionResult => {
    if (!value.trim()) {
      return {
        binary: "",
        octal: "",
        decimal: "",
        hex: "",
        valid: false,
      };
    }

    try {
      let decimalValue: number;

      // Parse input based on base
      switch (fromBase) {
        case "binary":
          if (!/^[01]+$/.test(value)) {
            return {
              binary: "",
              octal: "",
              decimal: "",
              hex: "",
              valid: false,
              error: "Invalid binary number (only 0 and 1 allowed)",
            };
          }
          decimalValue = parseInt(value, 2);
          break;
        case "octal":
          if (!/^[0-7]+$/.test(value)) {
            return {
              binary: "",
              octal: "",
              decimal: "",
              hex: "",
              valid: false,
              error: "Invalid octal number (only 0-7 allowed)",
            };
          }
          decimalValue = parseInt(value, 8);
          break;
        case "decimal":
          if (!/^\d+$/.test(value)) {
            return {
              binary: "",
              octal: "",
              decimal: "",
              hex: "",
              valid: false,
              error: "Invalid decimal number (only 0-9 allowed)",
            };
          }
          decimalValue = parseInt(value, 10);
          break;
        case "hex":
          if (!/^[0-9A-Fa-f]+$/.test(value)) {
            return {
              binary: "",
              octal: "",
              decimal: "",
              hex: "",
              valid: false,
              error: "Invalid hex number (only 0-9, A-F allowed)",
            };
          }
          decimalValue = parseInt(value, 16);
          break;
        default:
          throw new Error("Unknown base");
      }

      // Check for overflow or invalid conversion
      if (!Number.isFinite(decimalValue) || Number.isNaN(decimalValue)) {
        return {
          binary: "",
          octal: "",
          decimal: "",
          hex: "",
          valid: false,
          error: "Number is too large or invalid",
        };
      }

      // Convert to all bases
      return {
        binary: decimalValue.toString(2),
        octal: decimalValue.toString(8),
        decimal: decimalValue.toString(10),
        hex: decimalValue.toString(16).toUpperCase(),
        valid: true,
      };
    } catch (_error) {
      return {
        binary: "",
        octal: "",
        decimal: "",
        hex: "",
        valid: false,
        error: "Conversion error",
      };
    }
  };

  // Update conversions when input changes
  useEffect(() => {
    const result = convertNumber(inputValue, inputBase);
    setResults(result);
  }, [inputValue, inputBase]);

  // Persist state to widget config
  const persistConfig = (updates: Partial<typeof widget.config>) => {
    updateWidget(widget.id, {
      config: {
        ...widget.config,
        ...updates,
      },
    });
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    persistConfig({ inputValue: value });
  };

  const handleBaseChange = (base: NumberBase) => {
    setInputBase(base);
    persistConfig({ inputBase: base });
  };

  const handleCopy = async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied({ ...copied, [key]: true });
      setTimeout(() => {
        setCopied((prev) => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const conversionItems = [
    {
      key: "binary",
      label: "Binary",
      value: results.binary,
      prefix: "0b",
      color: "text-blue-500",
    },
    {
      key: "octal",
      label: "Octal",
      value: results.octal,
      prefix: "0o",
      color: "text-green-500",
    },
    {
      key: "decimal",
      label: "Decimal",
      value: results.decimal,
      prefix: "",
      color: "text-purple-500",
    },
    {
      key: "hex",
      label: "Hexadecimal",
      value: results.hex,
      prefix: "0x",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="@container h-full w-full overflow-hidden">
      <div className="flex h-full flex-col gap-4 p-4 @xs:p-5 @sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Calculator className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold truncate">Number Converter</h3>
            <p className="text-xs text-muted-foreground truncate">
              Convert between number bases
            </p>
          </div>
        </div>

        {/* Input Section */}
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`input-${widget.id}`} className="text-xs">
              Input Number
            </Label>
            <div className="flex gap-2">
              <Input
                id={`input-${widget.id}`}
                type="text"
                value={inputValue}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Enter a number..."
                className="flex-1 font-mono text-sm"
                autoComplete="off"
              />
              <Select value={inputBase} onValueChange={handleBaseChange}>
                <SelectTrigger className="w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binary">Binary</SelectItem>
                  <SelectItem value="octal">Octal</SelectItem>
                  <SelectItem value="decimal">Decimal</SelectItem>
                  <SelectItem value="hex">Hex</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {results.error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-xs text-destructive"
              >
                {results.error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results Section */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-2">
            {conversionItems.map((item) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  "group relative rounded-lg border bg-card p-3 transition-colors",
                  results.valid && "hover:bg-accent/50"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <Binary className={cn("h-3 w-3", item.color)} />
                      <span className="text-xs font-medium text-muted-foreground">
                        {item.label}
                      </span>
                    </div>
                    <div className="font-mono text-sm break-all">
                      {results.valid ? (
                        <>
                          <span className="text-muted-foreground">
                            {item.prefix}
                          </span>
                          <span className={item.color}>{item.value}</span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </div>
                  {results.valid && item.value && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() =>
                        handleCopy(`${item.prefix}${item.value}`, item.key)
                      }
                      disabled={copied[item.key]}
                    >
                      <AnimatePresence mode="wait">
                        {copied[item.key] ? (
                          <motion.div
                            key="check"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Check className="h-3 w-3 text-green-500" />
                          </motion.div>
                        ) : (
                          <motion.div
                            key="copy"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                          >
                            <Copy className="h-3 w-3" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Info Footer */}
        {results.valid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground text-center pt-2 border-t"
          >
            Max safe integer: {Number.MAX_SAFE_INTEGER.toLocaleString()}
          </motion.div>
        )}
      </div>
    </div>
  );
}
