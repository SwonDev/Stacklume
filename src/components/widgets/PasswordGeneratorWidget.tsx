"use client";

import { useState, useCallback, useMemo } from "react";
import type { Widget } from "@/types/widget";
import { useWidgetStore } from "@/stores/widget-store";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Copy, RefreshCw, KeyRound, Check, Eye, EyeOff, History } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordGeneratorWidgetProps {
  widget: Widget;
}

interface PasswordConfig {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

interface GeneratedPassword {
  value: string;
  strength: PasswordStrength;
  timestamp: number;
}

type PasswordStrength = "weak" | "medium" | "strong" | "very-strong";

const DEFAULT_CONFIG: PasswordConfig = {
  length: 16,
  uppercase: true,
  lowercase: true,
  numbers: true,
  symbols: true,
  excludeAmbiguous: false,
};

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const AMBIGUOUS_CHARS = "0O1lI";

export function PasswordGeneratorWidget({ widget }: PasswordGeneratorWidgetProps) {
  const { updateWidget } = useWidgetStore();

  const config: PasswordConfig = {
    ...DEFAULT_CONFIG,
    ...(widget.config as Partial<PasswordConfig>),
  };

  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<GeneratedPassword[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const updateConfig = useCallback(
    (updates: Partial<PasswordConfig>) => {
      const newConfig = { ...config, ...updates };
      updateWidget(widget.id, { config: newConfig });
    },
    [config, updateWidget, widget.id]
  );

  const calculateStrength = useCallback((pwd: string, _cfg: PasswordConfig): PasswordStrength => {
    let score = 0;

    // Length scoring
    if (pwd.length >= 12) score += 2;
    else if (pwd.length >= 8) score += 1;

    // Character variety scoring
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=[\]{}|;:,.<>?]/.test(pwd);

    const varietyCount = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
    score += varietyCount;

    // Length bonus
    if (pwd.length >= 16) score += 1;
    if (pwd.length >= 20) score += 1;

    // Determine strength
    if (score >= 7) return "very-strong";
    if (score >= 5) return "strong";
    if (score >= 3) return "medium";
    return "weak";
  }, []);

  const secureRandom = useCallback((): number => {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xffffffff + 1);
  }, []);

  const generatePassword = useCallback(() => {
    const { length, uppercase, lowercase, numbers, symbols, excludeAmbiguous } = config;

    // Validate at least one character type is selected
    if (!uppercase && !lowercase && !numbers && !symbols) {
      toast.error("Select at least one character type");
      return;
    }

    // Build character pool
    let chars = "";
    const requiredChars: string[] = [];

    if (uppercase) {
      let upperChars = CHAR_SETS.uppercase;
      if (excludeAmbiguous) {
        upperChars = upperChars.split("").filter(c => !AMBIGUOUS_CHARS.includes(c)).join("");
      }
      chars += upperChars;
      if (upperChars.length > 0) {
        requiredChars.push(upperChars[Math.floor(secureRandom() * upperChars.length)]);
      }
    }
    if (lowercase) {
      let lowerChars = CHAR_SETS.lowercase;
      if (excludeAmbiguous) {
        lowerChars = lowerChars.split("").filter(c => !AMBIGUOUS_CHARS.includes(c)).join("");
      }
      chars += lowerChars;
      if (lowerChars.length > 0) {
        requiredChars.push(lowerChars[Math.floor(secureRandom() * lowerChars.length)]);
      }
    }
    if (numbers) {
      let numChars = CHAR_SETS.numbers;
      if (excludeAmbiguous) {
        numChars = numChars.split("").filter(c => !AMBIGUOUS_CHARS.includes(c)).join("");
      }
      chars += numChars;
      if (numChars.length > 0) {
        requiredChars.push(numChars[Math.floor(secureRandom() * numChars.length)]);
      }
    }
    if (symbols) {
      chars += CHAR_SETS.symbols;
      requiredChars.push(CHAR_SETS.symbols[Math.floor(secureRandom() * CHAR_SETS.symbols.length)]);
    }

    if (chars.length === 0) {
      toast.error("No valid characters available");
      return;
    }

    // Generate password with required characters
    const passwordArray: string[] = [...requiredChars];

    for (let i = requiredChars.length; i < length; i++) {
      passwordArray.push(chars[Math.floor(secureRandom() * chars.length)]);
    }

    // Shuffle using Fisher-Yates algorithm
    for (let i = passwordArray.length - 1; i > 0; i--) {
      const j = Math.floor(secureRandom() * (i + 1));
      [passwordArray[i], passwordArray[j]] = [passwordArray[j], passwordArray[i]];
    }

    const generatedPassword = passwordArray.join("");
    const strength = calculateStrength(generatedPassword, config);

    setPassword(generatedPassword);
    setShowPassword(true);

    // Add to history (keep last 5)
    setHistory(prev => {
      const newHistory = [
        { value: generatedPassword, strength, timestamp: Date.now() },
        ...prev
      ].slice(0, 5);
      return newHistory;
    });

    toast.success("Password generated");
  }, [config, calculateStrength, secureRandom]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (_error) {
      toast.error("Failed to copy");
    }
  }, []);

  const strength = useMemo(() => {
    if (!password) return null;
    return calculateStrength(password, config);
  }, [password, config, calculateStrength]);

  const strengthConfig = useMemo(() => {
    const configs = {
      "weak": { label: "Weak", color: "bg-red-500", textColor: "text-red-500", width: "25%" },
      "medium": { label: "Medium", color: "bg-orange-500", textColor: "text-orange-500", width: "50%" },
      "strong": { label: "Strong", color: "bg-yellow-500", textColor: "text-yellow-500", width: "75%" },
      "very-strong": { label: "Very Strong", color: "bg-green-500", textColor: "text-green-500", width: "100%" },
    };
    return strength ? configs[strength] : null;
  }, [strength]);

  return (
    <div className="@container size-full">
      <div className="flex size-full flex-col gap-3 @xs:gap-4 p-3 @xs:p-4 @md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 @xs:size-5 text-primary" />
            <h3 className="text-sm @xs:text-base font-semibold">Password Generator</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 @xs:h-8 px-2 @xs:px-3"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="size-3 @xs:size-4" />
          </Button>
        </div>

        <div className="flex-1 flex flex-col gap-3 @xs:gap-4 min-h-0">
          {!showHistory ? (
            <>
              {/* Password Display */}
              <div className="space-y-2">
                <div className="relative">
                  <div className={cn(
                    "w-full min-h-[80px] @xs:min-h-[100px] @md:min-h-[120px] rounded-lg border bg-muted/50 p-3 @xs:p-4",
                    "break-all font-mono text-sm @xs:text-base @md:text-lg",
                    "flex items-center justify-center",
                    !password && "text-muted-foreground"
                  )}>
                    {password ? (
                      showPassword ? password : "•".repeat(password.length)
                    ) : (
                      "Generate a password"
                    )}
                  </div>

                  {password && (
                    <div className="absolute top-2 right-2 flex gap-1 @xs:gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 @xs:h-8 w-7 @xs:w-8 p-0"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="size-3 @xs:size-4" />
                        ) : (
                          <Eye className="size-3 @xs:size-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 @xs:h-8 w-7 @xs:w-8 p-0"
                        onClick={() => copyToClipboard(password)}
                      >
                        {copied ? (
                          <Check className="size-3 @xs:size-4 text-green-500" />
                        ) : (
                          <Copy className="size-3 @xs:size-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Strength Indicator */}
                {password && strengthConfig && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs @xs:text-sm">
                      <span className="text-muted-foreground">Strength</span>
                      <span className={cn("font-medium", strengthConfig.textColor)}>
                        {strengthConfig.label}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn("h-full transition-all duration-300", strengthConfig.color)}
                        style={{ width: strengthConfig.width }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3 @xs:space-y-4 flex-1 overflow-y-auto">
                {/* Length Slider */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs @xs:text-sm">Length</Label>
                    <span className="text-xs @xs:text-sm font-medium tabular-nums">
                      {config.length}
                    </span>
                  </div>
                  <Slider
                    value={[config.length]}
                    onValueChange={([value]) => updateConfig({ length: value })}
                    min={8}
                    max={64}
                    step={1}
                    className="w-full"
                  />
                </div>

                {/* Character Type Toggles */}
                <div className="grid grid-cols-1 @sm:grid-cols-2 gap-2 @xs:gap-3">
                  <div className="flex items-center justify-between rounded-lg border p-2 @xs:p-3">
                    <Label htmlFor="uppercase" className="text-xs @xs:text-sm cursor-pointer">
                      Uppercase (A-Z)
                    </Label>
                    <Switch
                      id="uppercase"
                      checked={config.uppercase}
                      onCheckedChange={(checked) => updateConfig({ uppercase: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-2 @xs:p-3">
                    <Label htmlFor="lowercase" className="text-xs @xs:text-sm cursor-pointer">
                      Lowercase (a-z)
                    </Label>
                    <Switch
                      id="lowercase"
                      checked={config.lowercase}
                      onCheckedChange={(checked) => updateConfig({ lowercase: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-2 @xs:p-3">
                    <Label htmlFor="numbers" className="text-xs @xs:text-sm cursor-pointer">
                      Numbers (0-9)
                    </Label>
                    <Switch
                      id="numbers"
                      checked={config.numbers}
                      onCheckedChange={(checked) => updateConfig({ numbers: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-2 @xs:p-3">
                    <Label htmlFor="symbols" className="text-xs @xs:text-sm cursor-pointer">
                      Symbols (!@#$)
                    </Label>
                    <Switch
                      id="symbols"
                      checked={config.symbols}
                      onCheckedChange={(checked) => updateConfig({ symbols: checked })}
                    />
                  </div>
                </div>

                {/* Exclude Ambiguous */}
                <div className="flex items-center justify-between rounded-lg border p-2 @xs:p-3">
                  <div className="space-y-0.5">
                    <Label htmlFor="excludeAmbiguous" className="text-xs @xs:text-sm cursor-pointer">
                      Exclude Ambiguous
                    </Label>
                    <p className="text-[10px] @xs:text-xs text-muted-foreground">
                      Exclude: 0, O, 1, l, I
                    </p>
                  </div>
                  <Switch
                    id="excludeAmbiguous"
                    checked={config.excludeAmbiguous}
                    onCheckedChange={(checked) => updateConfig({ excludeAmbiguous: checked })}
                  />
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generatePassword}
                className="w-full h-9 @xs:h-10 @md:h-11"
                size="lg"
              >
                <RefreshCw className="size-3 @xs:size-4 mr-2" />
                Generate Password
              </Button>
            </>
          ) : (
            /* History View */
            <div className="flex-1 space-y-2 overflow-y-auto">
              <h4 className="text-xs @xs:text-sm font-medium text-muted-foreground mb-3">
                Recent Passwords
              </h4>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <History className="size-8 @xs:size-10 text-muted-foreground/50 mb-2" />
                  <p className="text-xs @xs:text-sm text-muted-foreground">
                    No passwords generated yet
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((item, _index) => {
                    const itemStrength = {
                      "weak": { color: "border-red-500/50" },
                      "medium": { color: "border-orange-500/50" },
                      "strong": { color: "border-yellow-500/50" },
                      "very-strong": { color: "border-green-500/50" },
                    }[item.strength];

                    return (
                      <div
                        key={item.timestamp}
                        className={cn(
                          "group relative rounded-lg border p-2 @xs:p-3 bg-muted/30 hover:bg-muted/50 transition-colors",
                          itemStrength.color
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-mono text-[10px] @xs:text-xs break-all">
                              {item.value}
                            </div>
                            <div className="text-[9px] @xs:text-[10px] text-muted-foreground mt-1">
                              {new Date(item.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 @xs:h-7 w-6 @xs:w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(item.value)}
                          >
                            <Copy className="size-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
